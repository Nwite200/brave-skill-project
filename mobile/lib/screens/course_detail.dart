import 'package:flutter/material.dart';

import '../api.dart';
import '../models.dart';
import '../theme.dart';
import '../widgets.dart';
import 'player.dart';
import 'quiz.dart';

class CourseDetailScreen extends StatefulWidget {
  final String slug;
  const CourseDetailScreen({super.key, required this.slug});

  @override
  State<CourseDetailScreen> createState() => _CourseDetailScreenState();
}

class _CourseDetailScreenState extends State<CourseDetailScreen> {
  CourseDetail? _course;
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
      final course = await Api.instance.course(widget.slug);
      if (mounted) setState(() => _course = course);
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _openLesson(LessonInfo lesson) {
    if (lesson.locked) {
      showSnack(context, 'Enrol in this programme to unlock the lesson.', error: true);
      return;
    }
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => PlayerScreen(slug: widget.slug, lessonId: lesson.id),
    )).then((_) => _load());
  }

  @override
  Widget build(BuildContext context) {
    final course = _course;
    return Scaffold(
      backgroundColor: BsColors.ink,
      body: ScreenBackground(
        child: SafeArea(
          bottom: false,
          child: _loading
              ? const LoadingView()
              : _error != null
                  ? ErrorView(message: _error!, onRetry: _load)
                  : course == null
                      ? const SizedBox.shrink()
                      : RefreshIndicator(
                          color: BsColors.cyan,
                          backgroundColor: BsColors.panel,
                          onRefresh: _load,
                          child: CustomScrollView(
                            slivers: [
                              SliverToBoxAdapter(child: _header(course)),
                              SliverPadding(
                                padding: const EdgeInsets.fromLTRB(20, 20, 20, 40),
                                sliver: SliverList(
                                  delegate: SliverChildListDelegate([
                                    _accessCard(course),
                                    const SizedBox(height: 24),
                                    if (course.description.isNotEmpty) ...[
                                      const Text('About this programme', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white)),
                                      const SizedBox(height: 10),
                                      Text(
                                        course.description,
                                        style: const TextStyle(fontSize: 12.5, height: 1.8, color: BsColors.muted),
                                      ),
                                      const SizedBox(height: 22),
                                    ],
                                    if (course.outcomes.isNotEmpty) ...[
                                      const Text('What you will be able to do', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white)),
                                      const SizedBox(height: 10),
                                      ...course.outcomes.map((outcome) => Padding(
                                            padding: const EdgeInsets.only(bottom: 8),
                                            child: Row(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                const Padding(
                                                  padding: EdgeInsets.only(top: 2),
                                                  child: Icon(Icons.check_circle_outline, size: 15, color: BsColors.emerald),
                                                ),
                                                const SizedBox(width: 9),
                                                Expanded(child: Text(outcome, style: const TextStyle(fontSize: 12, height: 1.6, color: BsColors.muted))),
                                              ],
                                            ),
                                          )),
                                      const SizedBox(height: 18),
                                    ],
                                    if (course.requirements.isNotEmpty) ...[
                                      const Text('Requirements', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white)),
                                      const SizedBox(height: 8),
                                      ...course.requirements.map((item) => Padding(
                                            padding: const EdgeInsets.only(bottom: 6),
                                            child: Row(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Container(
                                                  margin: const EdgeInsets.only(top: 6),
                                                  width: 4,
                                                  height: 4,
                                                  decoration: const BoxDecoration(color: BsColors.purple, shape: BoxShape.circle),
                                                ),
                                                const SizedBox(width: 9),
                                                Expanded(child: Text(item, style: const TextStyle(fontSize: 11.5, height: 1.6, color: BsColors.muted))),
                                              ],
                                            ),
                                          )),
                                      const SizedBox(height: 18),
                                    ],
                                    Row(
                                      children: [
                                        const Text('Curriculum', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white)),
                                        const Spacer(),
                                        Text('${course.modules.length} modules · ${course.totalLessons} lessons', style: const TextStyle(fontSize: 9.5, color: BsColors.dim)),
                                      ],
                                    ),
                                    const SizedBox(height: 10),
                                    ...course.modules.asMap().entries.map((entry) {
                                      final module = entry.value;
                                      return _moduleTile(entry.key, module, course.enrolled || course.staff);
                                    }),
                                    if (course.quizzes.isNotEmpty) ...[
                                      const SizedBox(height: 20),
                                      const Text('Assessments', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white)),
                                      const SizedBox(height: 10),
                                      ...course.quizzes.map((quiz) => BsCard(
                                            padding: const EdgeInsets.all(13),
                                            child: Row(
                                              children: [
                                                Container(
                                                  width: 34,
                                                  height: 34,
                                                  decoration: BoxDecoration(
                                                    color: (quiz.type == 'EXAM' ? BsColors.purple : BsColors.cyan).withValues(alpha: 0.12),
                                                    borderRadius: BorderRadius.circular(10),
                                                  ),
                                                  child: Icon(
                                                    quiz.type == 'EXAM' ? Icons.workspace_premium_outlined : Icons.quiz_outlined,
                                                    size: 16,
                                                    color: quiz.type == 'EXAM' ? BsColors.purple : BsColors.cyan,
                                                  ),
                                                ),
                                                const SizedBox(width: 11),
                                                Expanded(
                                                  child: Column(
                                                    crossAxisAlignment: CrossAxisAlignment.start,
                                                    children: [
                                                      Text(quiz.title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Colors.white)),
                                                      Text(
                                                        '${quiz.type == 'EXAM' ? 'Final assessment' : 'Quiz'} · ${quiz.questions} questions · pass ${quiz.passMark}%',
                                                        style: const TextStyle(fontSize: 9.5, color: BsColors.muted),
                                                      ),
                                                    ],
                                                  ),
                                                ),
                                                IconButton(
                                                  onPressed: course.enrolled || course.staff
                                                      ? () => Navigator.of(context).push(MaterialPageRoute(
                                                            builder: (_) => QuizScreen(quizId: quiz.id, title: quiz.title, courseSlug: course.slug),
                                                          ))
                                                      : null,
                                                  icon: Icon(
                                                    course.enrolled ? Icons.arrow_forward_ios : Icons.lock_outline,
                                                    size: 13,
                                                    color: BsColors.muted,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          )),
                                    ],
                                    const SizedBox(height: 22),
                                    const Text('Instructor', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white)),
                                    const SizedBox(height: 10),
                                    BsCard(
                                      child: Row(
                                        children: [
                                          CircleAvatar(
                                            radius: 22,
                                            backgroundColor: BsColors.purple.withValues(alpha: 0.18),
                                            child: Text(
                                              (course.instructorName ?? 'B').substring(0, 1),
                                              style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFFC9B8FF)),
                                            ),
                                          ),
                                          const SizedBox(width: 12),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(course.instructorName ?? 'Brave Skill Faculty', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white)),
                                                Text(course.instructorHeadline ?? 'Working professional', style: const TextStyle(fontSize: 10.5, color: BsColors.muted)),
                                              ],
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ]),
                                ),
                              ),
                            ],
                          ),
                        ),
        ),
      ),
    );
  }

  Widget _header(CourseDetail course) {
    final accent = course.accent as Color;
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.arrow_back, size: 20),
                style: IconButton.styleFrom(backgroundColor: Colors.white.withValues(alpha: 0.05)),
              ),
              const Spacer(),
              Pill(label: course.level, color: accent),
            ],
          ),
          const SizedBox(height: 14),
          Container(
            height: 150,
            width: double.infinity,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              gradient: LinearGradient(
                colors: [accent.withValues(alpha: 0.5), const Color(0xFF0A0C15)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: Stack(
              children: [
                Positioned(
                  right: -20,
                  top: -20,
                  child: Container(
                    width: 160,
                    height: 160,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(course.category.toUpperCase(), style: const TextStyle(fontSize: 9.5, letterSpacing: 1.6, color: Colors.white70)),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            course.title,
                            style: const TextStyle(fontSize: 20, height: 1.2, fontWeight: FontWeight.w700, color: Colors.white),
                          ),
                          const SizedBox(height: 6),
                          Text(course.summary, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 10.5, color: Colors.white70)),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(Icons.play_circle_outline, size: 13, color: BsColors.dim),
              const SizedBox(width: 4),
              Text('${course.totalLessons} lessons', style: const TextStyle(fontSize: 10, color: BsColors.dim)),
              const SizedBox(width: 14),
              const Icon(Icons.people_outline, size: 13, color: BsColors.dim),
              const SizedBox(width: 4),
              Text('${course.students} enrolled', style: const TextStyle(fontSize: 10, color: BsColors.dim)),
              if (course.certificateEnabled) ...[
                const SizedBox(width: 14),
                const Icon(Icons.workspace_premium_outlined, size: 13, color: BsColors.emerald),
                const SizedBox(width: 4),
                const Text('Certificate', style: TextStyle(fontSize: 10, color: BsColors.emerald)),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _accessCard(CourseDetail course) {
    if (course.enrolled || course.staff) {
      final next = course.allLessons.where((l) => !l.completed && !l.locked).toList();
      return BsCard(
        padding: const EdgeInsets.all(16),
        gradient: const LinearGradient(colors: [Color(0xFF151027), Color(0xFF0B0D18)]),
        border: Border.all(color: BsColors.purple.withValues(alpha: 0.3)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Pill(label: 'ENROLLED', color: BsColors.emerald),
                const Spacer(),
                Text('${course.progress}% complete', style: const TextStyle(fontSize: 10.5, color: BsColors.cyan)),
              ],
            ),
            const SizedBox(height: 10),
            ProgressLine(percent: course.progress),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: Text(
                    course.progress >= 100
                        ? 'Programme complete. Download your certificate from the Certificates tab.'
                        : '${course.completedLessons} of ${course.totalLessons} lessons complete.',
                    style: const TextStyle(fontSize: 10.5, color: BsColors.muted),
                  ),
                ),
                const SizedBox(width: 10),
                SizedBox(
                  height: 38,
                  child: FilledButton.icon(
                    onPressed: next.isEmpty ? null : () => _openLesson(next.first),
                    style: FilledButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: BsColors.ink,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      textStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                      minimumSize: const Size(0, 38),
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                    ),
                    icon: const Icon(Icons.play_arrow_rounded, size: 15),
                    label: Text(next.isEmpty ? 'Completed' : 'Continue'),
                  ),
                ),
              ],
            ),
          ],
        ),
      );
    }

    return BsCard(
      padding: const EdgeInsets.all(16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(color: BsColors.cyan.withValues(alpha: 0.10), borderRadius: BorderRadius.circular(10)),
            child: const Icon(Icons.lock_outline, size: 16, color: BsColors.cyan),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Academy enrolment required', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: Colors.white)),
                SizedBox(height: 4),
                Text(
                  'This programme is purchased through the academy. Sign in with the same account you used for enrolment and it will appear in your learning tab automatically.',
                  style: TextStyle(fontSize: 10.5, height: 1.6, color: BsColors.muted),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _moduleTile(int index, ModuleInfo module, bool enrolled) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: BsColors.panel,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: BsColors.line),
      ),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          initiallyExpanded: index == 0,
          tilePadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
          childrenPadding: const EdgeInsets.fromLTRB(10, 0, 10, 8),
          iconColor: BsColors.muted,
          collapsedIconColor: BsColors.dim,
          title: Row(
            children: [
              Text(
                '${index + 1}'.padLeft(2, '0'),
                style: const TextStyle(fontSize: 10, color: BsColors.dim, fontWeight: FontWeight.w600),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Row(children: [
                  Expanded(child: Text(module.title, style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w500, color: module.locked ? BsColors.dim : Colors.white))),
                  if (module.locked) const Icon(Icons.lock_outline, size: 13, color: BsColors.dim),
                  if (module.quizPassed && !module.locked) const Icon(Icons.check_circle, size: 13, color: BsColors.emerald),
                ]),
              ),
            ],
          ),
          subtitle: Padding(
            padding: const EdgeInsets.only(left: 26, top: 2),
            child: Text('${module.lessons.length} lessons', style: const TextStyle(fontSize: 9.5, color: BsColors.dim)),
          ),
          children: module.lessons.map((lesson) {
            return InkWell(
              borderRadius: BorderRadius.circular(10),
              onTap: () => _openLesson(lesson),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 9),
                child: Row(
                  children: [
                    Icon(
                      lesson.completed
                          ? Icons.check_circle
                          : lesson.type == 'PDF'
                              ? Icons.picture_as_pdf_outlined
                              : lesson.locked
                                  ? Icons.lock_outline
                                  : Icons.play_circle_outline,
                      size: 15,
                      color: lesson.completed
                          ? BsColors.emerald
                          : lesson.locked
                              ? BsColors.dim
                              : lesson.type == 'PDF'
                                  ? BsColors.cyan
                                  : BsColors.muted,
                    ),
                    const SizedBox(width: 9),
                    Expanded(
                      child: Text(
                        lesson.title,
                        style: TextStyle(fontSize: 11.5, color: lesson.locked ? BsColors.dim : const Color(0xFFD6DFEC)),
                      ),
                    ),
                    if (lesson.isPreview && !lesson.locked)
                      Container(
                        margin: const EdgeInsets.only(right: 6),
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                        decoration: BoxDecoration(
                          color: BsColors.cyan.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text('PREVIEW', style: TextStyle(fontSize: 6.5, letterSpacing: 0.6, color: BsColors.cyan, fontWeight: FontWeight.w600)),
                      ),
                    Text(lesson.durationLabel, style: const TextStyle(fontSize: 9, color: BsColors.dim)),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }
}
