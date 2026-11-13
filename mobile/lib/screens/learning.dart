import 'package:flutter/material.dart';

import '../api.dart';
import '../models.dart';
import '../theme.dart';
import '../widgets.dart';
import 'player.dart';

class LearningScreen extends StatefulWidget {
  const LearningScreen({super.key});

  @override
  State<LearningScreen> createState() => _LearningScreenState();
}

class _LearningScreenState extends State<LearningScreen> {
  List<EnrollmentInfo> _items = [];
  bool _loading = true;
  String? _error;

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
      final items = await Api.instance.enrollments();
      if (mounted) setState(() => _items = items);
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _open(EnrollmentInfo enrollment) async {
    final result = await Navigator.of(context).push<String>(MaterialPageRoute(
      builder: (_) => PlayerScreen(slug: enrollment.slug, lessonId: enrollment.nextLessonId),
    ));
    if (!mounted) return;
    _load();
    if (result == 'completed') showSnack(context, 'Lesson completed. Progress saved.');
  }

  @override
  Widget build(BuildContext context) {
    final active = _items.where((e) => e.status != 'REVOKED').toList();
    final completed = active.where((e) => e.percent >= 100).toList();
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
              const Text('My learning', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, letterSpacing: -0.8, color: Colors.white)),
              const SizedBox(height: 6),
              Text(
                '${active.length} programmes · ${completed.length} completed',
                style: const TextStyle(fontSize: 11.5, color: BsColors.muted),
              ),
              const SizedBox(height: 22),
              if (_loading)
                const Padding(padding: EdgeInsets.symmetric(vertical: 60), child: LoadingView())
              else if (_error != null)
                ErrorView(message: _error!, onRetry: _load)
              else if (active.isEmpty)
                EmptyView(
                  icon: Icons.school_outlined,
                  title: 'No active programmes',
                  body: 'Courses purchased through the academy appear here automatically when you sign in with the same account.',
                  action: const Text(
                    'Open the Discover tab to browse the catalogue.',
                    style: TextStyle(fontSize: 10.5, color: BsColors.dim),
                  ),
                )
              else
                ...active.map((enrollment) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _EnrollmentCard(enrollment: enrollment, onTap: () => _open(enrollment)),
                    )),
            ],
          ),
        ),
      ),
    );
  }
}

class _EnrollmentCard extends StatelessWidget {
  final EnrollmentInfo enrollment;
  final VoidCallback onTap;
  const _EnrollmentCard({required this.enrollment, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final accent = enrollment.accent as Color;
    final done = enrollment.percent >= 100;
    return BsCard(
      padding: const EdgeInsets.all(14),
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  gradient: LinearGradient(colors: [accent.withValues(alpha: 0.5), const Color(0xFF0A0C15)]),
                ),
                child: Icon(done ? Icons.workspace_premium : Icons.play_circle_outline, size: 19, color: Colors.white.withValues(alpha: 0.85)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(enrollment.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, height: 1.3, color: Colors.white)),
                    const SizedBox(height: 3),
                    Text(enrollment.category, style: const TextStyle(fontSize: 9.5, color: BsColors.dim)),
                  ],
                ),
              ),
              Pill(label: done ? 'COMPLETED' : 'IN PROGRESS', color: done ? BsColors.emerald : accent),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(child: ProgressLine(percent: enrollment.percent)),
              const SizedBox(width: 10),
              Text('${enrollment.percent}%', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Colors.white)),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Text(
                '${enrollment.completedLessons} of ${enrollment.totalLessons} lessons',
                style: const TextStyle(fontSize: 9.5, color: BsColors.dim),
              ),
              const Spacer(),
              Text(
                done ? 'Review course' : (enrollment.nextLessonTitle ?? 'Continue'),
                style: const TextStyle(fontSize: 9.5, color: Color(0xFFC9B8FF)),
              ),
              const SizedBox(width: 4),
              const Icon(Icons.chevron_right, size: 14, color: BsColors.muted),
            ],
          ),
        ],
      ),
    );
  }
}
