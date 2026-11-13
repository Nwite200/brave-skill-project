import 'package:flutter/material.dart';

import '../api.dart';
import '../biometric.dart';
import '../theme.dart';
import '../widgets.dart';
import 'register.dart';
import 'shell.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  bool _obscure = true;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    if (_email.text.trim().isEmpty || _password.text.isEmpty) {
      setState(() => _error = 'Enter your email and password.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await Api.instance.login(_email.text, _password.text);
      if (!mounted) return;
      await _offerBiometric();
      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const ShellScreen()), (route) => false);
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  /// One-time offer to turn on fingerprint unlock after the first sign-in.
  Future<void> _offerBiometric() async {
    final lock = BiometricLock.instance;
    if (!await lock.shouldOffer()) return;
    await lock.markOffered();
    if (!mounted) return;
    final accept = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: BsColors.panel,
        title: const Text('Use fingerprint unlock?', style: TextStyle(fontSize: 16)),
        content: const Text(
          'Open the app with your fingerprint instead of typing your password each time. You can change this later in Profile.',
          style: TextStyle(fontSize: 12, height: 1.5, color: BsColors.muted),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Not now')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Turn on')),
        ],
      ),
    );
    if (accept == true) await lock.enable();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: BsColors.ink,
      body: ScreenBackground(
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 36, 24, 28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Wordmark(size: 42),
                const SizedBox(height: 44),
                const Text(
                  'Welcome back',
                  style: TextStyle(fontSize: 30, fontWeight: FontWeight.w700, letterSpacing: -1, color: Colors.white),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Sign in to continue your learning. Use the same account you created on the academy website.',
                  style: TextStyle(fontSize: 12.5, height: 1.6, color: BsColors.muted),
                ),
                const SizedBox(height: 28),
                if (_error != null) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: BsColors.danger.withValues(alpha: 0.10),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: BsColors.danger.withValues(alpha: 0.25)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.error_outline, size: 15, color: BsColors.danger),
                        const SizedBox(width: 8),
                        Expanded(child: Text(_error!, style: const TextStyle(fontSize: 11.5, color: Color(0xFFFFC9D2)))),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
                const Text('Email address', style: TextStyle(fontSize: 11.5, color: BsColors.muted)),
                const SizedBox(height: 7),
                TextField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  autofillHints: const [AutofillHints.email],
                  textInputAction: TextInputAction.next,
                  style: const TextStyle(fontSize: 13.5),
                  decoration: const InputDecoration(hintText: 'you@example.com'),
                ),
                const SizedBox(height: 16),
                const Text('Password', style: TextStyle(fontSize: 11.5, color: BsColors.muted)),
                const SizedBox(height: 7),
                TextField(
                  controller: _password,
                  obscureText: _obscure,
                  textInputAction: TextInputAction.done,
                  onSubmitted: (_) => _submit(),
                  style: const TextStyle(fontSize: 13.5),
                  decoration: InputDecoration(
                    hintText: 'Your password',
                    suffixIcon: IconButton(
                      icon: Icon(_obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 18, color: BsColors.dim),
                      onPressed: () => setState(() => _obscure = !_obscure),
                    ),
                  ),
                ),
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: () => _showForgot(context),
                    child: const Text('Forgot password?', style: TextStyle(fontSize: 11, color: BsColors.muted)),
                  ),
                ),
                const SizedBox(height: 4),
                PrimaryButton(label: 'Sign in', loading: _busy, icon: Icons.arrow_forward, onPressed: _submit),
                const SizedBox(height: 22),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text('New to Brave Skill? ', style: TextStyle(fontSize: 12, color: BsColors.muted)),
                    GestureDetector(
                      onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const RegisterScreen())),
                      child: const Text('Create an account', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFFC9B8FF))),
                    ),
                  ],
                ),
                const SizedBox(height: 42),
                Center(
                  child: Column(
                    children: [
                      const Text('LEARN.  PRACTICE.  BUILD.', style: TextStyle(fontSize: 8.5, letterSpacing: 3, color: BsColors.dim)),
                      const SizedBox(height: 6),
                      Text('© ${DateTime.now().year} Emyphill-Tech Global Solutions Limited', style: const TextStyle(fontSize: 8.5, color: Color(0xFF455063))),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showForgot(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: BsColors.panel,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => Padding(
        padding: const EdgeInsets.fromLTRB(24, 20, 24, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Reset your password', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white)),
            const SizedBox(height: 8),
            const Text(
              'Enter your email on the login screen and request a reset on the academy website. The link is emailed to you and stays valid for 60 minutes.',
              style: TextStyle(fontSize: 12, height: 1.6, color: BsColors.muted),
            ),
            const SizedBox(height: 18),
            GhostButton(label: 'Close', onPressed: () => Navigator.pop(context)),
          ],
        ),
      ),
    );
  }
}
