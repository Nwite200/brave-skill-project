import 'package:flutter/material.dart';

import '../api.dart';
import '../models.dart';
import '../theme.dart';
import '../widgets.dart';
import 'course_detail.dart';
import 'notifications.dart';
import 'player.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _search = TextEditingController();
  List<CourseSummary> _courses = [];
  List<EnrollmentInfo> _enrollments = [];
  bool _loading = true;
  String? _error;
  String _category = 'All';

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        Api.instance.courses(query: _search.text),
        Api.instance.enrollments(),
      ]);
      if (!mounted) return;
      setState(() {
        _courses = results[0] as List<CourseSummary>;
        _enrollments = results[1] as List<EnrollmentInfo>;
      });
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openContinue(EnrollmentInfo enrollment) async {
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => PlayerScreen(slug: enrollment.slug, lessonId: enrollment.nextLessonId),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final user = Api.instance.user;
    final categories = <String>{'All', ..._courses.map((c) => c.category)}.toList();
    final filtered = _category == 'All' ? _courses : _courses.where((c) => c.category == _category).toList();
    final focus = _enrollments.where((e) => e.status == 'ACTIVE' && e.percent > 0).toList()
      ..sort((a, b) => b.percent.compareTo(a.percent));
    final continueItem = focus.isNotEmpty ? focus.first : (_enrollments.isNotEmpty ? _enrollments.first : null);

    return ScreenBackground(
      child: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          color: BsColors.cyan,
          backgroundColor: BsColors.panel,
          onRefresh: _load,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
            children: [
              Row(
                children: [
                  const Wordmark(size: 34),
                  const Spacer(),
                  IconButton(
                    onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const NotificationsScreen())),
                    icon: const Icon(Icons.notifications_none_rounded, color: BsColors.muted),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              Text(
                'Welcome back, ${user?.name.split(' ').first ?? 'learner'}.',
                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700, letterSpacing: -0.8, color: Colors.white),
              ),
              const SizedBox(height: 6),
              const Text(
                'Practical skills. Real opportunities.',
                style: TextStyle(fontSize: 12, color: BsColors.muted),
              ),
              const SizedBox(height: 22),
              if (continueItem != null) ...[
                _ContinueCard(enrollment: continueItem, onTap: () => _openContinue(continueItem)),
                const SizedBox(height: 22),
              ],
              TextField(
                controller: _search,
                textInputAction: TextInputAction.search,
                onSubmitted: (_) => _load(),
                style: const TextStyle(fontSize: 13),
                decoration: InputDecoration(
                  hintText: 'Search programmes and skills',
                  prefixIcon: const Icon(Icons.search, size: 18, color: BsColors.dim),
                  suffixIcon: _search.text.isEmpty
                      ? null
                      : IconButton(
                          icon: const Icon(Icons.close, size: 16, color: BsColors.dim),
                          onPressed: () {
                            _search.clear();
                            _load();
                          },
                        ),
                ),
              ),
              const SizedBox(height: 18),
              SizedBox(
                height: 32,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: categories.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (context, index) {
                    final category = categories[index];
                    final selected = category == _category;
                    return GestureDetector(
                      onTap: () => setState(() => _category = category),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 13),
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: selected ? BsColors.purple.withValues(alpha: 0.18) : Colors.white.withValues(alpha: 0.03),
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(color: selected ? BsColors.purple.withValues(alpha: 0.5) : BsColors.line),
                        ),
                        child: Text(
                          category,
                          style: TextStyle(fontSize: 10.5, color: selected ? Colors.white : BsColors.muted, fontWeight: FontWeight.w500),
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 22),
              Row(
                children: [
                  const Text('Programmes', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white)),
                  const Spacer(),
                  Text('${filtered.length} available', style: const TextStyle(fontSize: 10, color: BsColors.dim)),
                ],
              ),
              const SizedBox(height: 12),
              if (_loading)
                const Padding(padding: EdgeInsets.symmetric(vertical: 40), child: LoadingView())
              else if (_error != null)
                ErrorView(message: _error!, onRetry: _load)
              else if (filtered.isEmpty)
                const EmptyView(icon: Icons.search_off, title: 'No programmes found', body: 'Try a different search or category.')
              else
                ...filtered.map((course) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: CourseListCard(
                        course: course,
                        onTap: () => Navigator.of(context).push(MaterialPageRoute(
                          builder: (_) => CourseDetailScreen(slug: course.slug),
                        )),
                      ),
                    )),
            ],
          ),
        ),
      ),
    );
  }
}

class _ContinueCard extends StatelessWidget {
  final EnrollmentInfo enrollment;
  final VoidCallback onTap;
  const _ContinueCard({required this.enrollment, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final accent = enrollment.accent as Color;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: const LinearGradient(
          colors: [Color(0xFF1A1130), Color(0xFF0B0D18)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        border: Border.all(color: BsColors.purple.withValues(alpha: 0.28)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Pill(label: 'CONTINUE LEARNING', color: accent),
              const Spacer(),
              Text('${enrollment.percent}%', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: BsColors.cyan)),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            enrollment.title,
            style: const TextStyle(fontSize: 15.5, fontWeight: FontWeight.w600, height: 1.3, color: Colors.white),
          ),
          const SizedBox(height: 4),
          Text(
            enrollment.nextLessonTitle ?? 'All lessons complete',
            style: const TextStyle(fontSize: 11, color: BsColors.muted),
          ),
          const SizedBox(height: 14),
          ProgressLine(percent: enrollment.percent),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: SizedBox(
                  height: 38,
                  child: FilledButton.icon(
                    onPressed: onTap,
                    style: FilledButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: BsColors.ink,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      textStyle: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600),
                    ),
                    icon: const Icon(Icons.play_arrow_rounded, size: 16),
                    label: const Text('Resume'),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Text(
                '${enrollment.completedLessons}/${enrollment.totalLessons} lessons',
                style: const TextStyle(fontSize: 10, color: BsColors.dim),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
