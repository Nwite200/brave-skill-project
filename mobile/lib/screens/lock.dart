import 'package:flutter/material.dart';

import '../api.dart';
import '../biometric.dart';
import '../theme.dart';
import '../widgets.dart';
import 'login.dart';

/// Wraps the whole app. When biometric unlock is on and the user is signed in,
/// it covers the app with [LockScreen] until the device biometric succeeds.
class AppLockGate extends StatefulWidget {
  final GlobalKey<NavigatorState> navigatorKey;
  final Widget child;
  const AppLockGate({super.key, required this.navigatorKey, required this.child});

  @override
  State<AppLockGate> createState() => _AppLockGateState();
}

class _AppLockGateState extends State<AppLockGate> with WidgetsBindingObserver {
  DateTime? _backgroundedAt;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    BiometricLock.instance.addListener(_onChanged);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    BiometricLock.instance.removeListener(_onChanged);
    super.dispose();
  }

  void _onChanged() {
    if (mounted) setState(() {});
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused) {
      _backgroundedAt = DateTime.now();
    } else if (state == AppLifecycleState.resumed) {
      final since = _backgroundedAt;
      _backgroundedAt = null;
      if (since != null && DateTime.now().difference(since) >= BiometricLock.relockAfter) {
        BiometricLock.instance.lock();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final lock = BiometricLock.instance;
    final showLock = lock.enabled && lock.locked && Api.instance.isSignedIn;
    return Stack(
      children: [
        ExcludeSemantics(excluding: showLock, child: widget.child),
        if (showLock) Positioned.fill(child: LockScreen(navigatorKey: widget.navigatorKey)),
      ],
    );
  }
}

class LockScreen extends StatefulWidget {
  final GlobalKey<NavigatorState> navigatorKey;
  const LockScreen({super.key, required this.navigatorKey});

  @override
  State<LockScreen> createState() => _LockScreenState();
}

class _LockScreenState extends State<LockScreen> {
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _unlock());
  }

  Future<void> _unlock() async {
    final ok = await BiometricLock.instance.unlock();
    if (!ok && mounted) setState(() => _failed = true);
  }

  Future<void> _usePassword() async {
    await Api.instance.logout(); // Also clears the biometric setting.
    widget.navigatorKey.currentState?.pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final name = Api.instance.user?.name.split(' ').first;
    return Scaffold(
      backgroundColor: BsColors.ink,
      body: ScreenBackground(
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 28),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const BrandMark(size: 72),
                const SizedBox(height: 28),
                Text(
                  (name == null || name.isEmpty) ? 'Welcome back' : 'Welcome back, $name',
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, letterSpacing: -0.6, color: Colors.white),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Use your fingerprint to unlock your courses.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 12.5, height: 1.6, color: BsColors.muted),
                ),
                const SizedBox(height: 32),
                Container(
                  width: 76,
                  height: 76,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: BsColors.purple.withValues(alpha: 0.12),
                    border: Border.all(color: BsColors.purple.withValues(alpha: 0.35)),
                  ),
                  child: const Icon(Icons.fingerprint, size: 40, color: BsColors.cyan),
                ),
                const SizedBox(height: 28),
                if (_failed) ...[
                  PrimaryButton(
                    label: 'Try again',
                    icon: Icons.fingerprint,
                    onPressed: () {
                      setState(() => _failed = false);
                      _unlock();
                    },
                  ),
                  const SizedBox(height: 8),
                ],
                TextButton(
                  onPressed: _usePassword,
                  child: const Text('Sign in with password instead', style: TextStyle(fontSize: 11.5, color: BsColors.muted)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
