import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'models.dart';

class ApiException implements Exception {
  final String message;
  final int status;
  ApiException(this.message, this.status);

  @override
  String toString() => message;
}

class SessionUser {
  final String id;
  final String name;
  final String email;
  final String role;
  final String? phone;

  SessionUser({required this.id, required this.name, required this.email, required this.role, this.phone});

  factory SessionUser.fromJson(Map<String, dynamic> json) => SessionUser(
        id: json['id'] as String,
        name: json['name'] as String,
        email: json['email'] as String,
        role: (json['role'] ?? 'STUDENT') as String,
        phone: json['phone'] as String?,
      );
}

class Api {
  Api._();
  static final Api instance = Api._();

  static const String baseUrl = String.fromEnvironment(
    'API_BASE',
    defaultValue: 'https://academy.emyphilltech.com.ng',
  );

  static const _cookieKey = 'bs_session_cookie';
  static const _userKey = 'bs_session_user';

  String? _cookie;
  SessionUser? user;

  bool get isSignedIn => _cookie != null && user != null;
  String? get cookie => _cookie;
  Map<String, String> get mediaHeaders => _cookie == null ? {} : {'Cookie': _cookie!};

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    _cookie = prefs.getString(_cookieKey);
    final raw = prefs.getString(_userKey);
    if (raw != null) {
      try {
        user = SessionUser.fromJson(jsonDecode(raw) as Map<String, dynamic>);
      } catch (_) {
        user = null;
      }
    }
    if (_cookie != null) {
      try {
        final response = await get('/me');
        user = SessionUser.fromJson(response['user'] as Map<String, dynamic>);
        await _persist();
      } on ApiException catch (error) {
        if (error.status == 401) {
          await signOutLocally();
        }
      } catch (_) {
        // Offline: keep cached identity so the app can still open.
      }
    }
  }

  Uri _uri(String path) {
    final normalized = path.startsWith('/') ? path : '/$path';
    return Uri.parse('$baseUrl/api$normalized');
  }

  Map<String, String> _headers({bool json = true}) => {
        if (json) 'Content-Type': 'application/json',
        'Accept': 'application/json',
        if (_cookie != null) 'Cookie': _cookie!,
      };

  Future<Map<String, dynamic>> _send(String method, String path, {Object? body, Duration? timeout}) async {
    late http.Response response;
    try {
      final request = http.Request(method, _uri(path));
      request.headers.addAll(_headers());
      if (body != null) request.body = jsonEncode(body);
      final streamed = await request.send().timeout(timeout ?? const Duration(seconds: 30));
      response = await http.Response.fromStream(streamed);
    } on SocketException {
      throw ApiException('No internet connection. Check your network and try again.', 0);
    } on TimeoutException {
      throw ApiException('The connection took too long. Please try again.', 0);
    }

    final setCookie = response.headers['set-cookie'];
    if (setCookie != null) {
      final match = RegExp(r'bs_session=([^;]+)').firstMatch(setCookie);
      if (match != null) {
        _cookie = 'bs_session=${match.group(1)}';
        unawaited(_persist());
      }
    }

    Map<String, dynamic> payload;
    try {
      payload = jsonDecode(utf8.decode(response.bodyBytes)) as Map<String, dynamic>;
    } catch (_) {
      throw ApiException('Unexpected server response (${response.statusCode}).', response.statusCode);
    }

    if (response.statusCode >= 400) {
      throw ApiException((payload['error'] ?? 'Request failed.') as String, response.statusCode);
    }
    return payload;
  }

  Future<Map<String, dynamic>> get(String path) => _send('GET', path);
  Future<Map<String, dynamic>> post(String path, [Object? body]) => _send('POST', path, body: body);
  Future<Map<String, dynamic>> patch(String path, [Object? body]) => _send('PATCH', path, body: body);

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    if (_cookie != null) {
      await prefs.setString(_cookieKey, _cookie!);
    }
    if (user != null) {
      await prefs.setString(_userKey, jsonEncode({
      'id': user!.id,
      'name': user!.name,
      'email': user!.email,
      'role': user!.role,
        'phone': user!.phone,
      }));
    }
  }

  Future<void> signOutLocally() async {
    _cookie = null;
    user = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_cookieKey);
    await prefs.remove(_userKey);
  }

  Future<void> login(String email, String password) async {
    final response = await post('/auth/login', {'email': email.trim(), 'password': password});
    if (response['role'] != 'STUDENT') {
      await signOutLocally();
      throw ApiException('This app is for students. Use the website for staff access.', 403);
    }
    final me = await get('/me');
    user = SessionUser.fromJson(me['user'] as Map<String, dynamic>);
    await _persist();
  }

  Future<void> register({required String name, required String email, required String phone, required String password}) async {
    await post('/auth/register', {
      'name': name.trim(),
      'email': email.trim(),
      'phone': phone.trim(),
      'password': password,
      'acceptTerms': true,
    });
    final me = await get('/me');
    user = SessionUser.fromJson(me['user'] as Map<String, dynamic>);
    await _persist();
  }

  Future<void> logout() async {
    try {
      await post('/auth/logout');
    } catch (_) {
      // Best effort; local state is cleared regardless.
    }
    await signOutLocally();
  }

  Future<List<CourseSummary>> courses({String? query, String? category}) async {
    final params = <String, String>{};
    if (query != null && query.trim().isNotEmpty) params['q'] = query.trim();
    if (category != null && category.isNotEmpty) params['category'] = category;
    final suffix = params.isEmpty ? '' : '?${Uri(queryParameters: params).query}';
    final response = await get('/courses$suffix');
    return (response['courses'] as List)
        .map((e) => CourseSummary.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<CourseDetail> course(String slug) async {
    final response = await get('/courses/$slug');
    return CourseDetail.fromJson(response);
  }

  Future<List<EnrollmentInfo>> enrollments() async {
    final response = await get('/me/enrollments');
    return (response['enrollments'] as List)
        .map((e) => EnrollmentInfo.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<Map<String, dynamic>> activity() => get('/me/activity');

  Future<void> markComplete(String lessonId, {bool completed = true}) async {
    await post('/progress', {'lessonId': lessonId, 'completed': completed});
  }

  Future<void> saveWatched(String lessonId, int seconds) async {
    try {
      await post('/progress', {'lessonId': lessonId, 'watchedSeconds': seconds});
    } catch (_) {
      // Non-critical; the next tick retries.
    }
  }

  Future<Map<String, dynamic>> startQuiz(String quizId) => post('/quizzes/$quizId/start');

  Future<Map<String, dynamic>> submitQuiz(String attemptId, List<int> answers) =>
      post('/attempts/$attemptId/submit', {'answers': answers});

  Future<void> markNotificationsRead({String? id}) async {
    await post('/me/notifications', id == null ? {'all': true} : {'id': id});
  }

  Future<void> updateProfile({required String name, String? phone, String? headline}) async {
    await patch('/me', {'name': name, 'phone': phone ?? '', 'headline': headline ?? '', 'bio': ''});
    final me = await get('/me');
    user = SessionUser.fromJson(me['user'] as Map<String, dynamic>);
    await _persist();
  }

  Future<void> changePassword(String currentPassword, String newPassword) async {
    await post('/me/password', {'currentPassword': currentPassword, 'newPassword': newPassword});
  }

  Future<Map<String, dynamic>> agentBootstrap() => get('/agent/bootstrap');

  Future<Map<String, dynamic>> agentChat({required String message, String? conversationId}) =>
      post('/agent/chat', {
        'message': message,
        'conversationId': conversationId,
        'channel': 'ANDROID',
      });

  String mediaUrl(String assetId) => '$baseUrl/api/media/$assetId';
  String certificateUrl(String serial) => '$baseUrl/api/certificates/$serial/pdf';

  /// Downloads a protected file with the session cookie and returns its path.
  Future<File> download(String path, String filename) async {
    final uri = path.startsWith('http') ? Uri.parse(path) : _uri(path);
    final response = await http.get(uri, headers: {
      'Cookie': _cookie ?? '',
    });
    if (response.statusCode >= 400) {
      throw ApiException('The file could not be downloaded (${response.statusCode}).', response.statusCode);
    }
    final dir = await getTemporaryDirectory();
    final safeName = filename.replaceAll(RegExp(r'[^A-Za-z0-9._-]'), '-');
    final file = File('${dir.path}/$safeName');
    await file.writeAsBytes(response.bodyBytes);
    return file;
  }

  @visibleForTesting
  void debugSetSession(String cookie, SessionUser sessionUser) {
    _cookie = cookie;
    user = sessionUser;
  }
}
