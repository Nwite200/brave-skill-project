import 'package:flutter/material.dart';
import 'package:open_filex/open_filex.dart';

import '../api.dart';
import '../models.dart';
import '../theme.dart';
import '../widgets.dart';

class CertificatesScreen extends StatefulWidget {
  const CertificatesScreen({super.key});

  @override
  State<CertificatesScreen> createState() => _CertificatesScreenState();
}

class _CertificatesScreenState extends State<CertificatesScreen> {
  List<CertificateInfo> _items = [];
  bool _loading = true;
  String? _error;
  String? _downloading;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final activity = await Api.instance.activity();
      final items = (activity['certificates'] as List).map((e) => CertificateInfo.fromJson(e as Map<String, dynamic>)).toList();
      if (mounted) setState(() => _items = items);
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _download(CertificateInfo certificate) async {
    setState(() => _downloading = certificate.id);
    try {
      final file = await Api.instance.download(
        Api.instance.certificateUrl(certificate.serial),
        'Brave-Skill-Certificate-${certificate.serial}.pdf',
      );
      await OpenFilex.open(file.path);
    } on ApiException catch (error) {
      if (mounted) showSnack(context, error.message, error: true);
    } finally {
      if (mounted) setState(() => _downloading = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ScreenBackground(
      child: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          color: BsColors.cyan,
          backgroundColor: BsColors.panel,
          onRefresh: _load,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 30),
            children: [
              const Text('Certificates', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, letterSpacing: -0.8, color: Colors.white)),
              const SizedBox(height: 6),
              const Text('Verifiable credentials issued by the academy.', style: TextStyle(fontSize: 11.5, color: BsColors.muted)),
              const SizedBox(height: 22),
              if (_loading)
                const Padding(padding: EdgeInsets.symmetric(vertical: 60), child: LoadingView())
              else if (_error != null)
                ErrorView(message: _error!, onRetry: _load)
              else if (_items.isEmpty)
                const EmptyView(
                  icon: Icons.workspace_premium_outlined,
                  title: 'No certificate yet',
                  body: 'Complete every lesson and pass the final assessment to receive a serial-numbered certificate.',
                )
              else
                ..._items.map((certificate) => Padding(
                      padding: const EdgeInsets.only(bottom: 14),
                      child: Column(
                        children: [
                          _certificateCard(certificate),
                          const SizedBox(height: 8),
                          SizedBox(
                            width: double.infinity,
                            height: 42,
                            child: FilledButton.icon(
                              onPressed: _downloading == certificate.id ? null : () => _download(certificate),
                              style: FilledButton.styleFrom(
                                backgroundColor: Colors.white,
                                foregroundColor: BsColors.ink,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                              ),
                              icon: _downloading == certificate.id
                                  ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: BsColors.ink))
                                  : const Icon(Icons.download_rounded, size: 16),
                              label: Text(_downloading == certificate.id ? 'Preparing…' : 'Download certificate PDF'),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Verify at academy.emyphilltech.com.ng/verify',
                            style: TextStyle(fontSize: 9, color: BsColors.dim.withValues(alpha: 0.9)),
                          ),
                        ],
                      ),
                    )),
              const SizedBox(height: 8),
              BsCard(
                border: Border.all(color: BsColors.emerald.withValues(alpha: 0.2)),
                child: const Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.verified_user_outlined, size: 15, color: BsColors.emerald),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Every certificate is bound to your record with a unique serial and integrity hash. Clients and employers can confirm it on the public verification page.',
                        style: TextStyle(fontSize: 10, height: 1.6, color: BsColors.muted),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _certificateCard(CertificateInfo certificate) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        gradient: const LinearGradient(
          colors: [Color(0xFF161027), Color(0xFF0B0D16), Color(0xFF08120F)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        border: Border.all(color: BsColors.purple.withValues(alpha: 0.32)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              const BrandMark(size: 26),
              const SizedBox(width: 8),
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('BRAVE SKILL', style: TextStyle(fontSize: 7.5, fontWeight: FontWeight.w700, letterSpacing: 1.4, color: Colors.white)),
                  Text('SKILL ACQUISITION ACADEMY', style: TextStyle(fontSize: 4.5, letterSpacing: 1.4, color: BsColors.cyan)),
                ],
              ),
              const Spacer(),
              Pill(label: 'VERIFIED', color: BsColors.emerald),
            ],
          ),
          const SizedBox(height: 20),
          const Text('CERTIFICATE OF COMPLETION', style: TextStyle(fontSize: 7, letterSpacing: 2.6, color: BsColors.cyan)),
          const SizedBox(height: 8),
          Text(
            Api.instance.user?.name ?? '',
            style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w700, color: Colors.white),
          ),
          const SizedBox(height: 4),
          Container(width: 90, height: 1, color: BsColors.purple.withValues(alpha: 0.6)),
          const SizedBox(height: 8),
          Text(
            certificate.courseTitle,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 10.5, color: Color(0xFFD9D1FF)),
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('ISSUED', style: TextStyle(fontSize: 5.5, letterSpacing: 1, color: BsColors.dim)),
                  Text(shortDate(certificate.issuedAt), style: const TextStyle(fontSize: 7.5, color: Colors.white)),
                ],
              ),
              const Spacer(),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  const Text('SERIAL', style: TextStyle(fontSize: 5.5, letterSpacing: 1, color: BsColors.dim)),
                  Text(certificate.serial, style: const TextStyle(fontSize: 7.5, color: Colors.white, letterSpacing: 0.4)),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}
