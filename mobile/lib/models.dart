import 'theme.dart';

class CourseSummary {
  final String id;
  final String slug;
  final String title;
  final String summary;
  final String level;
  final int lessons;
  final int students;
  final String durationLabel;
  final String? thumbnailUrl;
  final String category;
  final String categorySlug;
  final dynamic accent;
  final String? instructor;

  CourseSummary({
    required this.id,
    required this.slug,
    required this.title,
    required this.summary,
    required this.level,
    required this.lessons,
    required this.students,
    required this.durationLabel,
    required this.thumbnailUrl,
    required this.category,
    required this.categorySlug,
    required this.accent,
    required this.instructor,
  });

  factory CourseSummary.fromJson(Map<String, dynamic> json) => CourseSummary(
        id: json['id'] as String,
        slug: json['slug'] as String,
        title: json['title'] as String,
        summary: (json['summary'] ?? '') as String,
        level: (json['level'] ?? 'BEGINNER') as String,
        lessons: (json['lessons'] ?? 0) as int,
        students: (json['students'] ?? 0) as int,
        durationLabel: (json['durationLabel'] ?? '') as String,
        thumbnailUrl: json['thumbnailUrl'] as String?,
        category: (json['category']?['name'] ?? 'Programme') as String,
        categorySlug: (json['category']?['slug'] ?? '') as String,
        accent: parseHex(json['category']?['accent'] as String?),
        instructor: json['instructor']?['name'] as String?,
      );
}

class LessonInfo {
  final String id;
  final String title;
  final String type;
  final int durationSeconds;
  final bool isPreview;
  final bool locked;
  final bool completed;
  final String? content;
  final String? videoAssetId;
  final String? pdfAssetId;
  final String? videoUrl;

  LessonInfo({
    required this.id,
    required this.title,
    required this.type,
    required this.durationSeconds,
    required this.isPreview,
    required this.locked,
    required this.completed,
    this.content,
    this.videoAssetId,
    this.pdfAssetId,
    this.videoUrl,
  });

  factory LessonInfo.fromJson(Map<String, dynamic> json) => LessonInfo(
        id: json['id'] as String,
        title: json['title'] as String,
        type: (json['type'] ?? 'VIDEO') as String,
        durationSeconds: (json['durationSeconds'] ?? 0) as int,
        isPreview: (json['isPreview'] ?? false) as bool,
        locked: (json['locked'] ?? false) as bool,
        completed: (json['completed'] ?? false) as bool,
        content: json['content'] as String?,
        videoAssetId: json['videoAssetId'] as String?,
        pdfAssetId: json['pdfAssetId'] as String?,
        videoUrl: json['videoUrl'] as String?,
      );

  String get durationLabel {
    if (durationSeconds <= 0) return '';
    final minutes = (durationSeconds / 60).round();
    return minutes < 1 ? '<1 min' : '$minutes min';
  }
}

class ModuleInfo {
  final String id;
  final String title;
  final int position;
  final bool locked;
  final bool quizPassed;
  final bool quizRequired;
  final List<LessonInfo> lessons;

  ModuleInfo({required this.id, required this.title, required this.position, required this.locked, required this.quizPassed, required this.quizRequired, required this.lessons});

  factory ModuleInfo.fromJson(Map<String, dynamic> json) => ModuleInfo(
        id: json['id'] as String,
        title: json['title'] as String,
        position: (json['position'] ?? 0) as int,
        locked: (json['locked'] ?? false) as bool,
        quizPassed: (json['quizPassed'] ?? false) as bool,
        quizRequired: (json['quizRequired'] ?? false) as bool,
        lessons: ((json['lessons'] ?? []) as List)
            .map((e) => LessonInfo.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class QuizInfo {
  final String id;
  final String title;
  final String type;
  final int passMark;
  final int timeLimitMinutes;
  final int questions;

  QuizInfo({
    required this.id,
    required this.title,
    required this.type,
    required this.passMark,
    required this.timeLimitMinutes,
    required this.questions,
  });

  factory QuizInfo.fromJson(Map<String, dynamic> json) => QuizInfo(
        id: json['id'] as String,
        title: json['title'] as String,
        type: (json['type'] ?? 'QUIZ') as String,
        passMark: (json['passMark'] ?? 60) as int,
        timeLimitMinutes: (json['timeLimitMinutes'] ?? 0) as int,
        questions: (json['questions'] ?? 0) as int,
      );
}

class CourseDetail {
  final String id;
  final String slug;
  final String title;
  final String summary;
  final String description;
  final List<String> outcomes;
  final List<String> requirements;
  final String level;
  final String category;
  final dynamic accent;
  final String? instructorName;
  final String? instructorHeadline;
  final int lessons;
  final int students;
  final bool certificateEnabled;
  final bool examRequired;
  final List<ModuleInfo> modules;
  final List<QuizInfo> quizzes;
  final bool enrolled;
  final bool staff;
  final int progress;
  final int completedLessons;
  final int totalLessons;
  final String? certificateSerial;

  CourseDetail({
    required this.id,
    required this.slug,
    required this.title,
    required this.summary,
    required this.description,
    required this.outcomes,
    required this.requirements,
    required this.level,
    required this.category,
    required this.accent,
    required this.instructorName,
    required this.instructorHeadline,
    required this.lessons,
    required this.students,
    required this.certificateEnabled,
    required this.examRequired,
    required this.modules,
    required this.quizzes,
    required this.enrolled,
    required this.staff,
    required this.progress,
    required this.completedLessons,
    required this.totalLessons,
    required this.certificateSerial,
  });

  factory CourseDetail.fromJson(Map<String, dynamic> json) {
    final access = (json['access'] ?? {}) as Map<String, dynamic>;
    final course = (json['course'] ?? json) as Map<String, dynamic>;
    return CourseDetail(
      id: course['id'] as String,
      slug: course['slug'] as String,
      title: course['title'] as String,
      summary: (course['summary'] ?? '') as String,
      description: (course['description'] ?? '') as String,
      outcomes: ((course['outcomes'] ?? []) as List).map((e) => e.toString()).toList(),
      requirements: ((course['requirements'] ?? []) as List).map((e) => e.toString()).toList(),
      level: (course['level'] ?? 'BEGINNER') as String,
      category: (course['category']?['name'] ?? 'Programme') as String,
      accent: parseHex(course['category']?['accent'] as String?),
      instructorName: course['instructor']?['name'] as String?,
      instructorHeadline: course['instructor']?['headline'] as String?,
      lessons: (course['lessons'] ?? 0) as int,
      students: (course['students'] ?? 0) as int,
      certificateEnabled: (course['certificateEnabled'] ?? true) as bool,
      examRequired: (course['examRequired'] ?? true) as bool,
      modules: ((course['modules'] ?? []) as List)
          .map((e) => ModuleInfo.fromJson(e as Map<String, dynamic>))
          .toList(),
      quizzes: ((course['quizzes'] ?? []) as List)
          .map((e) => QuizInfo.fromJson(e as Map<String, dynamic>))
          .toList(),
      enrolled: (access['enrolled'] ?? false) as bool,
      staff: (access['staff'] ?? false) as bool,
      progress: (access['progress'] ?? 0) as int,
      completedLessons: (access['completedLessons'] ?? 0) as int,
      totalLessons: (access['totalLessons'] ?? 0) as int,
      certificateSerial: access['certificateSerial'] as String?,
    );
  }

  List<LessonInfo> get allLessons => modules.expand((m) => m.lessons).toList();
}

class EnrollmentInfo {
  final String id;
  final String courseId;
  final String title;
  final String slug;
  final String summary;
  final String category;
  final dynamic accent;
  final int percent;
  final int completedLessons;
  final int totalLessons;
  final String status;
  final String? certificateSerial;
  final String? nextLessonId;
  final String? nextLessonTitle;

  EnrollmentInfo({
    required this.id,
    required this.courseId,
    required this.title,
    required this.slug,
    required this.summary,
    required this.category,
    required this.accent,
    required this.percent,
    required this.completedLessons,
    required this.totalLessons,
    required this.status,
    required this.certificateSerial,
    required this.nextLessonId,
    required this.nextLessonTitle,
  });

  factory EnrollmentInfo.fromJson(Map<String, dynamic> json) {
    final course = json['course'] as Map<String, dynamic>;
    final next = json['nextLesson'] as Map<String, dynamic>?;
    return EnrollmentInfo(
      id: json['id'] as String,
      courseId: json['courseId'] as String,
      title: course['title'] as String,
      slug: course['slug'] as String,
      summary: (course['summary'] ?? '') as String,
      category: (course['category'] ?? 'Programme') as String,
      accent: parseHex(course['accent'] as String?),
      percent: (json['percent'] ?? 0) as int,
      completedLessons: (json['completedLessons'] ?? 0) as int,
      totalLessons: (json['totalLessons'] ?? 0) as int,
      status: (json['status'] ?? 'ACTIVE') as String,
      certificateSerial: json['certificateSerial'] as String?,
      nextLessonId: next?['id'] as String?,
      nextLessonTitle: next?['title'] as String?,
    );
  }
}

class CertificateInfo {
  final String id;
  final String serial;
  final String courseTitle;
  final DateTime issuedAt;

  CertificateInfo({
    required this.id,
    required this.serial,
    required this.courseTitle,
    required this.issuedAt,
  });

  factory CertificateInfo.fromJson(Map<String, dynamic> json) => CertificateInfo(
        id: json['id'] as String,
        serial: json['serial'] as String,
        courseTitle: (json['courseTitle'] ?? '') as String,
        issuedAt: DateTime.tryParse(json['issuedAt']?.toString() ?? '') ?? DateTime.now(),
      );
}

class OrderInfo {
  final String id;
  final String reference;
  final String courseTitle;
  final int amountKobo;
  final String status;
  final DateTime? paidAt;
  final DateTime createdAt;

  OrderInfo({
    required this.id,
    required this.reference,
    required this.courseTitle,
    required this.amountKobo,
    required this.status,
    required this.paidAt,
    required this.createdAt,
  });

  factory OrderInfo.fromJson(Map<String, dynamic> json) => OrderInfo(
        id: json['id'] as String,
        reference: json['reference'] as String,
        courseTitle: (json['courseTitle'] ?? '') as String,
        amountKobo: (json['amountKobo'] ?? 0) as int,
        status: (json['status'] ?? 'PENDING') as String,
        paidAt: DateTime.tryParse(json['paidAt']?.toString() ?? ''),
        createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
      );
}

class NotificationInfo {
  final String id;
  final String title;
  final String body;
  final String type;
  final String? link;
  final DateTime? readAt;
  final DateTime createdAt;

  NotificationInfo({
    required this.id,
    required this.title,
    required this.body,
    required this.type,
    required this.link,
    required this.readAt,
    required this.createdAt,
  });

  factory NotificationInfo.fromJson(Map<String, dynamic> json) => NotificationInfo(
        id: json['id'] as String,
        title: json['title'] as String,
        body: (json['body'] ?? '') as String,
        type: (json['type'] ?? 'SYSTEM') as String,
        link: json['link'] as String?,
        readAt: DateTime.tryParse(json['readAt']?.toString() ?? ''),
        createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
      );
}

class QuizQuestion {
  final String id;
  final String prompt;
  final List<String> options;
  final int points;

  QuizQuestion({required this.id, required this.prompt, required this.options, required this.points});

  factory QuizQuestion.fromJson(Map<String, dynamic> json) => QuizQuestion(
        id: json['id'] as String,
        prompt: json['prompt'] as String,
        options: (json['options'] as List).map((e) => e.toString()).toList(),
        points: (json['points'] ?? 1) as int,
      );
}
