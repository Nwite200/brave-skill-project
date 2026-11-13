import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api.dart';
import '../theme.dart';
import '../widgets.dart';
import 'login.dart';
import 'notifications.dart';
import 'payments.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _signingOut = false;

  Future<void> _signOut() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: BsColors.panel,
        title: const Text('Sign out?', style: TextStyle(fontSize: 16)),
        content: const Text('You can sign back in at any time with the same account.', style: TextStyle(fontSize: 12, color: BsColors.muted)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Sign out', style: TextStyle(color: BsColors.danger))),
        ],
      ),
    );
    if (confirmed != true) return;
    setState(() => _signingOut = true);
    await Api.instance.logout();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const LoginScreen()), (route) => false);
  }

  Future<void> _launch(String url) async {
    final uri = Uri.parse(url);
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication) && mounted) {
      showSnack(context, 'Could not open the link on this device.', error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = Api.instance.user;
    return ScreenBackground(
      child: SafeArea(
        bottom: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 34),
          children: [
            const Text('Profile', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, letterSpacing: -0.8, color: Colors.white)),
            const SizedBox(height: 18),
            BsCard(
              padding: const EdgeInsets.all(18),
              gradient: const LinearGradient(colors: [Color(0xFF161027), Color(0xFF0B0D16)]),
              border: Border.all(color: BsColors.purple.withValues(alpha: 0.25)),
              child: Row(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: const BoxDecoration(gradient: brandGradient, shape: BoxShape.circle),
                    alignment: Alignment.center,
                    child: Text(
                      (user?.name.isNotEmpty ?? false) ? user!.name.substring(0, 1).toUpperCase() : 'B',
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(user?.name ?? 'Student', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.white)),
                        const SizedBox(height: 2),
                        Text(user?.email ?? '', style: const TextStyle(fontSize: 10.5, color: BsColors.muted)),
                        const SizedBox(height: 6),
                        const Pill(label: 'STUDENT', color: BsColors.cyan),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () async {
                      await Navigator.of(context).push(MaterialPageRoute(builder: (_) => const EditProfileScreen()));
                      setState(() {});
                    },
                    icon: const Icon(Icons.edit_outlined, size: 17, color: BsColors.muted),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 22),
            const _GroupLabel('Learning'),
            _menuTile(Icons.notifications_none, 'Notifications', 'Course, payment and certificate updates', () {
              Navigator.of(context).push(MaterialPageRoute(builder: (_) => const NotificationsScreen()));
            }),
            _menuTile(Icons.receipt_long_outlined, 'Payment history', 'Orders, references and receipts', () {
              Navigator.of(context).push(MaterialPageRoute(builder: (_) => const PaymentsScreen()));
            }),
            const SizedBox(height: 16),
            const _GroupLabel('Account'),
            _menuTile(Icons.lock_outline, 'Change password', 'Keep your account secure', () {
              Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ChangePasswordScreen()));
            }),
            _menuTile(Icons.mail_outline, 'Support', 'Email the academy team', () {
              _launch('mailto:support@academy.emyphilltech.com.ng?subject=Brave%20Skill%20app%20support');
            }),
            _menuTile(Icons.privacy_tip_outlined, 'Privacy policy', 'How we handle your data', () {
              _launch('https://academy.emyphilltech.com.ng/privacy');
            }),
            _menuTile(Icons.description_outlined, 'Terms & conditions', 'Academy terms of use', () {
              _launch('https://academy.emyphilltech.com.ng/terms');
            }),
            const SizedBox(height: 16),
            const _GroupLabel('App'),
            BsCard(
              padding: const EdgeInsets.all(14),
              child: Column(
                children: [
                  const Row(
                    children: [
                      Icon(Icons.smartphone, size: 16, color: BsColors.cyan),
                      SizedBox(width: 8),
                      Text('Brave Skill Academy', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white)),
                      Spacer(),
                      Text('v1.0.0', style: TextStyle(fontSize: 10, color: BsColors.dim)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      const Icon(Icons.verified_outlined, size: 14, color: BsColors.emerald),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Learn. Practice. Build. — ${Api.baseUrl}',
                          style: const TextStyle(fontSize: 9, color: BsColors.dim),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              height: 46,
              child: OutlinedButton.icon(
                onPressed: _signingOut ? null : _signOut,
                style: OutlinedButton.styleFrom(
                  side: BorderSide(color: BsColors.danger.withValues(alpha: 0.35)),
                  foregroundColor: BsColors.danger,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                icon: _signingOut
                    ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: BsColors.danger))
                    : const Icon(Icons.logout_rounded, size: 16),
                label: const Text('Sign out', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
              ),
            ),
            const SizedBox(height: 22),
            const Text(
              '© Emyphill-Tech Global Solutions Limited',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 9, color: Color(0xFF455063)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _menuTile(IconData icon, String title, String subtitle, VoidCallback onTap) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: BsCard(
        padding: const EdgeInsets.all(13),
        onTap: onTap,
        child: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.04), borderRadius: BorderRadius.circular(9)),
              child: Icon(icon, size: 15, color: BsColors.muted),
            ),
            const SizedBox(width: 11),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w500, color: Colors.white)),
                  Text(subtitle, style: const TextStyle(fontSize: 9.5, color: BsColors.dim)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, size: 16, color: BsColors.dim),
          ],
        ),
      ),
    );
  }
}

class _GroupLabel extends StatelessWidget {
  final String label;
  const _GroupLabel(this.label);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, left: 2),
      child: Text(label.toUpperCase(), style: const TextStyle(fontSize: 8.5, letterSpacing: 1.6, color: BsColors.dim, fontWeight: FontWeight.w600)),
    );
  }
}

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  late final TextEditingController _name = TextEditingController(text: Api.instance.user?.name ?? '');
  late final TextEditingController _phone = TextEditingController(text: Api.instance.user?.phone ?? '');
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_name.text.trim().length < 2) return setState(() => _error = 'Enter your full name.');
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await Api.instance.updateProfile(name: _name.text, phone: _phone.text);
      if (mounted) {
        showSnack(context, 'Profile updated.');
        Navigator.pop(context);
      }
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: BsColors.ink,
      appBar: AppBar(title: const Text('Edit profile')),
      body: ScreenBackground(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            if (_error != null) ...[
              Text(_error!, style: const TextStyle(fontSize: 11.5, color: BsColors.danger)),
              const SizedBox(height: 12),
            ],
            const Text('Full name', style: TextStyle(fontSize: 11.5, color: BsColors.muted)),
            const SizedBox(height: 7),
            TextField(controller: _name, style: const TextStyle(fontSize: 13.5)),
            const SizedBox(height: 16),
            const Text('Email address', style: TextStyle(fontSize: 11.5, color: BsColors.muted)),
            const SizedBox(height: 7),
            TextField(controller: TextEditingController(text: Api.instance.user?.email ?? ''), enabled: false, style: const TextStyle(fontSize: 13.5)),
            const SizedBox(height: 16),
            const Text('Phone', style: TextStyle(fontSize: 11.5, color: BsColors.muted)),
            const SizedBox(height: 7),
            TextField(controller: _phone, keyboardType: TextInputType.phone, style: const TextStyle(fontSize: 13.5)),
            const SizedBox(height: 24),
            PrimaryButton(label: 'Save changes', loading: _busy, onPressed: _save),
          ],
        ),
      ),
    );
  }
}

class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({super.key});

  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final _current = TextEditingController();
  final _next = TextEditingController();
  final _confirm = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _current.dispose();
    _next.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_next.text.length < 8) return setState(() => _error = 'New password must be at least 8 characters.');
    if (_next.text != _confirm.text) return setState(() => _error = 'New passwords do not match.');
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await Api.instance.changePassword(_current.text, _next.text);
      if (mounted) {
        showSnack(context, 'Password updated.');
        Navigator.pop(context);
      }
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: BsColors.ink,
      appBar: AppBar(title: const Text('Change password')),
      body: ScreenBackground(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const Text('Choose a strong password you do not use elsewhere.', style: TextStyle(fontSize: 11.5, color: BsColors.muted)),
            const SizedBox(height: 16),
            if (_error != null) ...[
              Text(_error!, style: const TextStyle(fontSize: 11.5, color: BsColors.danger)),
              const SizedBox(height: 12),
            ],
            const Text('Current password', style: TextStyle(fontSize: 11.5, color: BsColors.muted)),
            const SizedBox(height: 7),
            TextField(controller: _current, obscureText: true, style: const TextStyle(fontSize: 13.5)),
            const SizedBox(height: 16),
            const Text('New password', style: TextStyle(fontSize: 11.5, color: BsColors.muted)),
            const SizedBox(height: 7),
            TextField(controller: _next, obscureText: true, style: const TextStyle(fontSize: 13.5)),
            const SizedBox(height: 16),
            const Text('Confirm new password', style: TextStyle(fontSize: 11.5, color: BsColors.muted)),
            const SizedBox(height: 7),
            TextField(controller: _confirm, obscureText: true, style: const TextStyle(fontSize: 13.5)),
            const SizedBox(height: 24),
            PrimaryButton(label: 'Update password', loading: _busy, onPressed: _save),
          ],
        ),
      ),
    );
  }
}
