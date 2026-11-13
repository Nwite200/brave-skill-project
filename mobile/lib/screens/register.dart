import 'package:flutter/material.dart';

import '../api.dart';
import '../theme.dart';
import '../widgets.dart';
import 'shell.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  bool _accepted = false;
  bool _busy = false;
  bool _obscure = true;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _phone.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    if (_name.text.trim().length < 2) return setState(() => _error = 'Enter your full name.');
    if (!_email.text.contains('@')) return setState(() => _error = 'Enter a valid email address.');
    if (_password.text.length < 8 || !_password.text.contains(RegExp(r'[A-Za-z]')) || !_password.text.contains(RegExp(r'[0-9]'))) {
      return setState(() => _error = 'Use at least 8 characters with a letter and a number.');
    }
    if (_password.text != _confirm.text) return setState(() => _error = 'Passwords do not match.');
    if (!_accepted) return setState(() => _error = 'Accept the terms and privacy policy to continue.');

    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await Api.instance.register(
        name: _name.text,
        email: _email.text,
        phone: _phone.text,
        password: _password.text,
      );
      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const ShellScreen()), (route) => false);
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Widget _field(String label, TextEditingController controller, {String? hint, TextInputType? type, bool obscure = false, Widget? suffix}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 11.5, color: BsColors.muted)),
        const SizedBox(height: 7),
        TextField(
          controller: controller,
          keyboardType: type,
          obscureText: obscure,
          style: const TextStyle(fontSize: 13.5),
          decoration: InputDecoration(hintText: hint, suffixIcon: suffix),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: BsColors.ink,
      appBar: AppBar(
        leading: IconButton(icon: const Icon(Icons.arrow_back, size: 20), onPressed: () => Navigator.pop(context)),
        title: const Text('Create account'),
      ),
      body: ScreenBackground(
        child: SafeArea(
          top: false,
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 10, 24, 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Start learning in minutes', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w700, letterSpacing: -0.8, color: Colors.white)),
                const SizedBox(height: 8),
                const Text('One account for web and Android. You only pay when you enrol in a paid course.', style: TextStyle(fontSize: 12, height: 1.6, color: BsColors.muted)),
                const SizedBox(height: 24),
                if (_error != null) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: BsColors.danger.withValues(alpha: 0.10),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: BsColors.danger.withValues(alpha: 0.25)),
                    ),
                    child: Text(_error!, style: const TextStyle(fontSize: 11.5, color: Color(0xFFFFC9D2))),
                  ),
                  const SizedBox(height: 16),
                ],
                _field('Full name', _name, hint: 'Adaeze Okafor'),
                const SizedBox(height: 16),
                _field('Email address', _email, hint: 'you@example.com', type: TextInputType.emailAddress),
                const SizedBox(height: 16),
                _field('Phone (optional)', _phone, hint: '+234 800 000 0000', type: TextInputType.phone),
                const SizedBox(height: 16),
                _field(
                  'Password',
                  _password,
                  hint: 'At least 8 characters',
                  obscure: _obscure,
                  suffix: IconButton(
                    icon: Icon(_obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 18, color: BsColors.dim),
                    onPressed: () => setState(() => _obscure = !_obscure),
                  ),
                ),
                const SizedBox(height: 16),
                _field('Confirm password', _confirm, hint: 'Repeat your password', obscure: true),
                const SizedBox(height: 18),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Checkbox(
                      value: _accepted,
                      onChanged: (value) => setState(() => _accepted = value ?? false),
                      activeColor: BsColors.purple,
                      side: const BorderSide(color: BsColors.lineStrong),
                    ),
                    const Expanded(
                      child: Padding(
                        padding: EdgeInsets.only(top: 12),
                        child: Text(
                          'I agree to the Terms & Conditions and Privacy Policy of Emyphill-Tech Global Solutions Limited.',
                          style: TextStyle(fontSize: 11, height: 1.5, color: BsColors.muted),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                PrimaryButton(label: 'Create account', loading: _busy, icon: Icons.arrow_forward, onPressed: _submit),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
