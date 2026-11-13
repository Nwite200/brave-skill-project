import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:local_auth/local_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Optional fingerprint / face unlock for the app.
///
/// When enabled, the app asks for the device biometric (or the device
/// PIN/pattern as a fallback) on launch and after it has been in the
/// background for [relockAfter].
class BiometricLock extends ChangeNotifier {
  BiometricLock._();
  static final BiometricLock instance = BiometricLock._();

  static const _enabledKey = 'bs_biometric_enabled';
  static const _promptedKey = 'bs_biometric_prompted';

  /// How long the app can stay in the background before it re-locks.
  static const relockAfter = Duration(seconds: 30);

  final LocalAuthentication _auth = LocalAuthentication();

  bool _enabled = false;
  bool _locked = false;
  bool _authenticating = false;

  bool get enabled => _enabled;
  bool get locked => _locked;

  /// Call once at startup, before `runApp`.
  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    _enabled = prefs.getBool(_enabledKey) ?? false;
    _locked = _enabled; // Cold start always begins locked.
  }

  /// True when the device has biometric hardware with at least one enrolled
  /// fingerprint or face.
  Future<bool> isAvailable() async {
    try {
      if (!await _auth.isDeviceSupported()) return false;
      if (!await _auth.canCheckBiometrics) return false;
      final types = await _auth.getAvailableBiometrics();
      return types.isNotEmpty;
    } on PlatformException {
      return false;
    }
  }

  Future<bool> _authenticate(String reason) async {
    if (_authenticating) return false;
    _authenticating = true;
    try {
      return await _auth.authenticate(
        localizedReason: reason,
        options: const AuthenticationOptions(
          // Allow the device PIN/pattern so a worn fingerprint sensor never
          // locks the student out of their own courses.
          biometricOnly: false,
          stickyAuth: true,
        ),
      );
    } on PlatformException {
      return false;
    } finally {
      _authenticating = false;
    }
  }

  /// Turns the lock on after the user proves they can pass it.
  Future<bool> enable() async {
    if (!await isAvailable()) return false;
    final ok = await _authenticate('Confirm to turn on fingerprint unlock');
    if (!ok) return false;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_enabledKey, true);
    _enabled = true;
    _locked = false;
    notifyListeners();
    return true;
  }

  /// Turns the lock off. [requireAuth] is false when signing out.
  Future<bool> disable({bool requireAuth = true}) async {
    if (requireAuth && _enabled) {
      final ok = await _authenticate('Confirm to turn off fingerprint unlock');
      if (!ok) return false;
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_enabledKey, false);
    _enabled = false;
    _locked = false;
    notifyListeners();
    return true;
  }

  /// Prompts for the biometric and unlocks the app on success.
  Future<bool> unlock() async {
    if (!_enabled) return true;
    final ok = await _authenticate('Unlock Brave Skill Academy');
    if (ok) {
      _locked = false;
      notifyListeners();
    }
    return ok;
  }

  void lock() {
    if (_enabled && !_locked) {
      _locked = true;
      notifyListeners();
    }
  }

  /// Whether to show the one-time "turn on fingerprint unlock?" offer.
  Future<bool> shouldOffer() async {
    if (_enabled) return false;
    final prefs = await SharedPreferences.getInstance();
    if (prefs.getBool(_promptedKey) ?? false) return false;
    return isAvailable();
  }

  Future<void> markOffered() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_promptedKey, true);
  }
}
