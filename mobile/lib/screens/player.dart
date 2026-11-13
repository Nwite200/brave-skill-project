import 'dart:async';

import 'package:flutter/material.dart';
import 'package:open_filex/open_filex.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:video_player/video_player.dart';

import '../api.dart';
import '../models.dart';
import '../theme.dart';
import '../widgets.dart';
import 'quiz.dart';

class PlayerScreen extends StatefulWidget {
  final String slug;
  final String? lessonId;
  const PlayerScreen({super.key, required this.slug, this.lessonId});

  @override
  State<PlayerScreen> createState() => _PlayerScreenState();
}

class _PlayerScreenState extends State<PlayerScreen> {
  CourseDetail? _course;
  LessonInfo? _lesson;
  VideoPlayerController? _video;
  Timer? _progressTimer;
  bool _loading = true;
  bool _busy = false;
  bool _downloading = false;
  int _lastReported = 0;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _progressTimer?.cancel();
    _video?.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final course = await Api.instance.course(widget.slug);
      final lessons = course.allLessons;
      if (lessons.isEmpty) throw ApiException('This course has no lessons yet.', 0);
      LessonInfo? selected;
      if (widget.lessonId != null) {
        for (final lesson in lessons) {
          if (lesson.id == widget.lessonId) {
            selected = lesson;
            break;
          }
        }
      }
      selected ??= lessons.where((l) => !l.completed && !l.locked).isNotEmpty
          ? lessons.firstWhere((l) => !l.completed && !l.locked)
          : (lessons.where((l) => !l.locked).isNotEmpty ? lessons.firstWhere((l) => !l.locked) : lessons.first);
      if (!mounted) return;
      setState(() {
        _course = course;
        _lesson = selected;
        _loading = false;
      });
      await _prepareMedia(selected);
    } on ApiException catch (error) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = error.message;
        });
      }
    }
  }

  Future<void> _prepareMedia(LessonInfo lesson) async {
    _progressTimer?.cancel();
    await _video?.dispose();
    _video = null;
    if (lesson.type == 'VIDEO' && lesson.videoAssetId != null && !lesson.locked) {
      final controller = VideoPlayerController.networkUrl(
        Uri.parse('${Api.instance.mediaUrl(lesson.videoAssetId!)}?lessonId=${lesson.id}'),
        httpHeaders: Api.instance.mediaHeaders,
      );
      try {
        await controller.initialize();
        await controller.play();
        controller.addListener(_onVideoTick);
        if (!mounted) {
          await controller.dispose();
          return;
        }
        setState(() => _video = controller);
        _progressTimer = Timer.periodic(const Duration(seconds: 20), (_) {
          final position = controller.value.position.inSeconds;
          if (position > _lastReported + 10) {
            _lastReported = position;
            Api.instance.saveWatched(lesson.id, position);
          }
        });
      } catch (_) {
        await controller.dispose();
        if (mounted) showSnack(context, 'The video could not be loaded. Check your connection.', error: true);
      }
    }
  }

  void _onVideoTick() {
    final controller = _video;
    if (controller == null) return;
    if (controller.value.isInitialized && controller.value.position >= controller.value.duration && controller.value.duration.inSeconds > 0) {
      if (!(_lesson?.completed ?? false)) {
        _markComplete(silent: true);
      }
    }
  }

  Future<void> _markComplete({bool silent = false}) async {
    final lesson = _lesson;
    if (lesson == null || _busy) return;
    setState(() => _busy = true);
    try {
      final next = !lesson.completed;
      await Api.instance.markComplete(lesson.id, completed: next);
      final updated = LessonInfo(
        id: lesson.id,
        title: lesson.title,
        type: lesson.type,
        durationSeconds: lesson.durationSeconds,
        isPreview: lesson.isPreview,
        locked: lesson.locked,
        completed: next,
        content: lesson.content,
        videoAssetId: lesson.videoAssetId,
        pdfAssetId: lesson.pdfAssetId,
        videoUrl: lesson.videoUrl,
      );
      if (!mounted) return;
      setState(() {
        _lesson = updated;
        if (_course != null) {
          final lessons = _course!.allLessons.map((l) => l.id == lesson.id ? updated : l).toList();
          final completed = lessons.where((l) => l.completed).length;
          _course = CourseDetail(
            id: _course!.id,
            slug: _course!.slug,
            title: _course!.title,
            summary: _course!.summary,
            description: _course!.description,
            outcomes: _course!.outcomes,
            requirements: _course!.requirements,
            level: _course!.level,
            category: _course!.category,
            accent: _course!.accent,
            instructorName: _course!.instructorName,
            instructorHeadline: _course!.instructorHeadline,
            lessons: _course!.lessons,
            students: _course!.students,
            certificateEnabled: _course!.certificateEnabled,
            examRequired: _course!.examRequired,
            modules: _course!.modules,
            quizzes: _course!.quizzes,
            enrolled: _course!.enrolled,
            staff: _course!.staff,
            progress: lessons.isEmpty ? 0 : ((completed / lessons.length) * 100).round(),
            completedLessons: completed,
            totalLessons: lessons.length,
            certificateSerial: _course!.certificateSerial,
          );
        }
      });
      if (!silent) showSnack(context, next ? 'Lesson marked complete.' : 'Lesson marked incomplete.');
    } on ApiException catch (error) {
      if (mounted) showSnack(context, error.message, error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _openPdf(LessonInfo lesson) async {
    if (lesson.pdfAssetId == null) {
      showSnack(context, 'No PDF is attached to this lesson.', error: true);
      return;
    }
    setState(() => _downloading = true);
    try {
      final file = await Api.instance.download(
        '/media/${lesson.pdfAssetId}?lessonId=${lesson.id}',
        '${lesson.title}-brave-skill.pdf',
      );
      await OpenFilex.open(file.path);
    } on ApiException catch (error) {
      if (mounted) showSnack(context, error.message, error: true);
    } finally {
      if (mounted) setState(() => _downloading = false);
    }
  }

  Future<void> _openExternalVideo() async {
    final url = _lesson?.videoUrl;
    if (url == null || url.isEmpty) return;
    final uri = Uri.tryParse(url);
    if (uri != null) await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  void _switchLesson(LessonInfo lesson) {
    if (lesson.locked) {
      showSnack(context, 'Enrol in this programme to unlock this lesson.', error: true);
      return;
    }
    setState(() => _lesson = lesson);
    _prepareMedia(lesson);
  }

  @override
  Widget build(BuildContext context) {
    final course = _course;
    final lesson = _lesson;
    return Scaffold(
      backgroundColor: BsColors.ink,
      appBar: AppBar(
        leading: IconButton(icon: const Icon(Icons.arrow_back, size: 20), onPressed: () => Navigator.pop(context, 'completed')),
        title: Text(course?.title ?? 'Lesson', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600)),
        actions: [
          IconButton(
            onPressed: course == null ? null : () => _showCurriculum(course),
            icon: const Icon(Icons.list_alt_rounded, size: 20),
            tooltip: 'Curriculum',
          ),
        ],
      ),
      body: _loading
          ? const LoadingView()
          : _error != null
              ? ErrorView(message: _error!, onRetry: _load)
              : course == null || lesson == null
                  ? const SizedBox.shrink()
                  : ScreenBackground(
                      child: ListView(
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
                        children: [
                          ProgressLine(percent: course.progress, height: 4),
                          const SizedBox(height: 14),
                          _media(lesson),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              Pill(label: lesson.type, color: BsColors.cyan),
                              const SizedBox(width: 8),
                              Text(lesson.durationLabel, style: const TextStyle(fontSize: 10, color: BsColors.dim)),
                              const Spacer(),
                              if (lesson.completed) const Pill(label: 'COMPLETED', color: BsColors.emerald),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Text(lesson.title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, height: 1.3, letterSpacing: -0.4, color: Colors.white)),
                          if (lesson.content != null && lesson.type == 'TEXT') ...[
                            const SizedBox(height: 16),
                            BsCard(
                              child: Text(lesson.content!, style: const TextStyle(fontSize: 12.5, height: 1.8, color: BsColors.muted)),
                            ),
                          ],
                          const SizedBox(height: 18),
                          PrimaryButton(
                            label: lesson.completed ? 'Mark as incomplete' : 'Mark lesson complete',
                            icon: lesson.completed ? Icons.undo_rounded : Icons.check_rounded,
                            loading: _busy,
                            onPressed: () => _markComplete(),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: GhostButton(
                                  label: 'Previous',
                                  icon: Icons.chevron_left,
                                  onPressed: _previous(lesson) == null ? null : () => _switchLesson(_previous(lesson)!),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: GhostButton(
                                  label: 'Next lesson',
                                  icon: Icons.chevron_right,
                                  onPressed: _next(lesson) == null ? null : () => _switchLesson(_next(lesson)!),
                                ),
                              ),
                            ],
                          ),
                          if (course.quizzes.isNotEmpty && course.enrolled) ...[
                            const SizedBox(height: 26),
                            const Text('Assessments', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.white)),
                            const SizedBox(height: 8),
                            ...course.quizzes.map((quiz) => Padding(
                                  padding: const EdgeInsets.only(bottom: 8),
                                  child: BsCard(
                                    padding: const EdgeInsets.all(12),
                                    onTap: () async {
                                      await Navigator.of(context).push(MaterialPageRoute(
                                        builder: (_) => QuizScreen(quizId: quiz.id, title: quiz.title, courseSlug: course.slug),
                                      ));
                                    },
                                    child: Row(
                                      children: [
                                        Icon(
                                          quiz.type == 'EXAM' ? Icons.workspace_premium_outlined : Icons.quiz_outlined,
                                          size: 16,
                                          color: quiz.type == 'EXAM' ? BsColors.purple : BsColors.cyan,
                                        ),
                                        const SizedBox(width: 10),
                                        Expanded(
                                          child: Text(quiz.title, style: const TextStyle(fontSize: 11.5, color: Colors.white)),
                                        ),
                                        const Icon(Icons.chevron_right, size: 15, color: BsColors.muted),
                                      ],
                                    ),
                                  ),
                                )),
                          ],
                        ],
                      ),
                    ),
    );
  }

  LessonInfo? _previous(LessonInfo lesson) {
    final lessons = _course?.allLessons ?? [];
    final index = lessons.indexWhere((l) => l.id == lesson.id);
    if (index <= 0) return null;
    return lessons[index - 1];
  }

  LessonInfo? _next(LessonInfo lesson) {
    final lessons = _course?.allLessons ?? [];
    final index = lessons.indexWhere((l) => l.id == lesson.id);
    if (index < 0 || index >= lessons.length - 1) return null;
    return lessons[index + 1];
  }

  Widget _media(LessonInfo lesson) {
    if (lesson.type == 'VIDEO') {
      final controller = _video;
      if (controller != null && controller.value.isInitialized) {
        return ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: Container(
            color: Colors.black,
            child: AspectRatio(
              aspectRatio: controller.value.aspectRatio,
              child: Stack(
                alignment: Alignment.bottomCenter,
                children: [
                  VideoPlayer(controller),
                  _VideoControls(controller: controller),
                ],
              ),
            ),
          ),
        );
      }
      if (lesson.videoUrl != null && lesson.videoUrl!.isNotEmpty) {
        return BsCard(
          child: Column(
            children: [
              const Icon(Icons.ondemand_video_outlined, size: 30, color: BsColors.purple),
              const SizedBox(height: 10),
              const Text('This lesson uses a hosted video.', style: TextStyle(fontSize: 12, color: Colors.white)),
              const SizedBox(height: 10),
              GhostButton(label: 'Open video', icon: Icons.open_in_new, onPressed: _openExternalVideo),
            ],
          ),
        );
      }
      return const BsCard(
        child: SizedBox(
          height: 180,
          child: EmptyView(title: 'Video unavailable', body: 'This lesson has no video attached yet.', icon: Icons.videocam_off_outlined),
        ),
      );
    }

    if (lesson.type == 'PDF') {
      return BsCard(
        child: Column(
          children: [
            Container(
              height: 120,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                gradient: LinearGradient(colors: [BsColors.cyan.withValues(alpha: 0.18), BsColors.panel]),
              ),
              child: const Center(child: Icon(Icons.picture_as_pdf_outlined, size: 40, color: BsColors.cyan)),
            ),
            const SizedBox(height: 14),
            const Text('PDF field guide', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white)),
            const SizedBox(height: 4),
            const Text('Download and open with your device PDF viewer.', style: TextStyle(fontSize: 10.5, color: BsColors.muted)),
            const SizedBox(height: 12),
            GhostButton(
              label: _downloading ? 'Preparing…' : 'Open PDF',
              icon: Icons.download_rounded,
              onPressed: _downloading ? null : () => _openPdf(lesson),
            ),
          ],
        ),
      );
    }

    return const SizedBox.shrink();
  }

  void _showCurriculum(CourseDetail course) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: BsColors.ink2,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.7,
        maxChildSize: 0.92,
        builder: (context, scrollController) => ListView(
          controller: scrollController,
          padding: const EdgeInsets.fromLTRB(18, 16, 18, 30),
          children: [
            Center(
              child: Container(width: 40, height: 4, decoration: BoxDecoration(color: BsColors.lineStrong, borderRadius: BorderRadius.circular(99))),
            ),
            const SizedBox(height: 18),
            const Text('Course content', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white)),
            const SizedBox(height: 12),
            ...course.modules.asMap().entries.map((entry) {
              final module = entry.value;
              return Padding(
                padding: const EdgeInsets.only(bottom: 14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${entry.key + 1}. ${module.title}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: BsColors.muted)),
                    const SizedBox(height: 6),
                    ...module.lessons.map((lesson) => InkWell(
                          onTap: () {
                            Navigator.pop(context);
                            _switchLesson(lesson);
                          },
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                            child: Row(
                              children: [
                                Icon(
                                  lesson.id == _lesson?.id
                                      ? Icons.play_circle
                                      : lesson.completed
                                          ? Icons.check_circle
                                          : lesson.locked
                                              ? Icons.lock_outline
                                              : Icons.circle_outlined,
                                  size: 15,
                                  color: lesson.id == _lesson?.id
                                      ? BsColors.cyan
                                      : lesson.completed
                                          ? BsColors.emerald
                                          : BsColors.dim,
                                ),
                                const SizedBox(width: 9),
                                Expanded(
                                  child: Text(
                                    lesson.title,
                                    style: TextStyle(fontSize: 11.5, color: lesson.locked ? BsColors.dim : const Color(0xFFD6DFEC)),
                                  ),
                                ),
                                Text(lesson.durationLabel, style: const TextStyle(fontSize: 9, color: BsColors.dim)),
                              ],
                            ),
                          ),
                        )),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}

class _VideoControls extends StatelessWidget {
  final VideoPlayerController controller;
  const _VideoControls({required this.controller});

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        return Container(
          padding: const EdgeInsets.fromLTRB(8, 20, 8, 6),
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Colors.transparent, Color(0xCC000000)],
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
            ),
          ),
          child: Row(
            children: [
              IconButton(
                onPressed: () => controller.value.isPlaying ? controller.pause() : controller.play(),
                icon: Icon(controller.value.isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded, color: Colors.white, size: 24),
              ),
              Expanded(
                child: VideoProgressIndicator(controller, allowScrubbing: true, colors: const VideoProgressColors(playedColor: BsColors.cyan, bufferedColor: Colors.white24, backgroundColor: Colors.white12)),
              ),
              const SizedBox(width: 10),
              Text(
                '${_clock(controller.value.position)} / ${_clock(controller.value.duration)}',
                style: const TextStyle(fontSize: 9, color: Colors.white70),
              ),
            ],
          ),
        );
      },
    );
  }

  String _clock(Duration duration) {
    final minutes = duration.inMinutes.remainder(60).toString().padLeft(2, '0');
    final seconds = duration.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }
}
