import 'dart:async';

import 'package:flutter/material.dart';

import '../api.dart';
import '../models.dart';
import '../theme.dart';
import '../widgets.dart';

class QuizScreen extends StatefulWidget {
  final String quizId;
  final String title;
  final String courseSlug;
  const QuizScreen({super.key, required this.quizId, required this.title, required this.courseSlug});

  @override
  State<QuizScreen> createState() => _QuizScreenState();
}

class _QuizScreenState extends State<QuizScreen> {
  Map<String, dynamic>? _meta;
  List<QuizQuestion> _questions = [];
  List<int> _answers = [];
  int _index = 0;
  bool _loading = false;
  bool _busy = false;
  bool _active = false;
  String? _attemptId;
  String? _error;
  Timer? _timer;
  int? _secondsLeft;
  Map<String, dynamic>? _result;

  @override
  void initState() {
    super.initState();
    _loadMeta();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _loadMeta() async {
    try {
      final response = await Api.instance.get('/quizzes/${widget.quizId}');
      if (mounted) setState(() => _meta = response);
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    }
  }

  Future<void> _start() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final response = await Api.instance.startQuiz(widget.quizId);
      final questions = (response['questions'] as List).map((e) => QuizQuestion.fromJson(e as Map<String, dynamic>)).toList();
      final attempt = response['attempt'] as Map<String, dynamic>;
      final quiz = response['quiz'] as Map<String, dynamic>;
      final limit = (quiz['timeLimitMinutes'] ?? 0) as int;
      if (!mounted) return;
      setState(() {
        _questions = questions;
        _answers = List<int>.filled(questions.length, -1);
        _attemptId = attempt['id'] as String;
        _active = true;
        _index = 0;
        _secondsLeft = limit > 0 ? limit * 60 : null;
      });
      if (limit > 0) {
        _timer?.cancel();
        _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
          if (!mounted) return;
          if ((_secondsLeft ?? 0) <= 1) {
            timer.cancel();
            _submit(auto: true);
          } else {
            setState(() => _secondsLeft = (_secondsLeft ?? 1) - 1);
          }
        });
      }
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submit({bool auto = false}) async {
    if (_busy || _attemptId == null) return;
    setState(() => _busy = true);
    try {
      final response = await Api.instance.submitQuiz(_attemptId!, _answers);
      _timer?.cancel();
      if (!mounted) return;
      setState(() {
        _result = response;
        _active = false;
      });
    } on ApiException catch (error) {
      if (mounted) showSnack(context, error.message, error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _confirmSubmit() {
    final answered = _answers.where((a) => a >= 0).length;
    showModalBottomSheet(
      context: context,
      backgroundColor: BsColors.panel,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => Padding(
        padding: const EdgeInsets.fromLTRB(24, 22, 24, 30),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Submit your answers?', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white)),
            const SizedBox(height: 6),
            Text(
              'You answered $answered of ${_questions.length} questions. Answers cannot be changed after submission.',
              style: const TextStyle(fontSize: 11.5, height: 1.6, color: BsColors.muted),
            ),
            const SizedBox(height: 20),
            PrimaryButton(label: 'Submit now', loading: _busy, onPressed: () {
              Navigator.pop(context);
              _submit();
            }),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: BsColors.ink,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, size: 20),
          onPressed: () => Navigator.pop(context, _result != null ? _result!['passed'] == true : false),
        ),
        title: Text(widget.title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
        actions: [
          if (_secondsLeft != null)
            Center(
              child: Container(
                margin: const EdgeInsets.only(right: 14),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: (_secondsLeft! < 60 ? BsColors.danger : BsColors.muted).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(99),
                  border: Border.all(color: (_secondsLeft! < 60 ? BsColors.danger : BsColors.lineStrong).withValues(alpha: 0.4)),
                ),
                child: Text(
                  '${(_secondsLeft! ~/ 60).toString().padLeft(2, '0')}:${(_secondsLeft! % 60).toString().padLeft(2, '0')}',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: _secondsLeft! < 60 ? BsColors.danger : Colors.white),
                ),
              ),
            ),
        ],
      ),
      body: ScreenBackground(child: _body()),
    );
  }

  Widget _body() {
    if (_result != null) return _resultView();
    if (_active) return _questionView();
    return _introView();
  }

  Widget _introView() {
    final quiz = _meta?['quiz'] as Map<String, dynamic>?;
    final attempts = (_meta?['attempts'] as List?) ?? [];
    final lessonsComplete = (_meta?['lessonsComplete'] ?? false) as bool;
    final isExam = (quiz?['type'] ?? 'QUIZ') == 'EXAM';
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 30),
      children: [
        Row(children: [Pill(label: isExam ? 'FINAL ASSESSMENT' : 'QUIZ', color: isExam ? BsColors.purple : BsColors.cyan)]),
        const SizedBox(height: 16),
        Text(
          quiz?['title'] as String? ?? widget.title,
          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700, letterSpacing: -0.6, color: Colors.white),
        ),
        const SizedBox(height: 8),
        Text(
          (quiz?['description'] as String?) ?? 'Complete the questions and submit for instant grading.',
          style: const TextStyle(fontSize: 12, height: 1.7, color: BsColors.muted),
        ),
        const SizedBox(height: 20),
        if (quiz != null)
          Row(
            children: [
              _metric('Questions', '${quiz['questions']}'),
              const SizedBox(width: 10),
              _metric('Pass mark', '${quiz['passMark']}%'),
              const SizedBox(width: 10),
              _metric('Time limit', (quiz['timeLimitMinutes'] as int) > 0 ? '${quiz['timeLimitMinutes']} min' : 'None'),
            ],
          ),
        const SizedBox(height: 20),
        if (_error != null)
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: BsColors.danger.withValues(alpha: 0.10),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: BsColors.danger.withValues(alpha: 0.25)),
            ),
            child: Text(_error!, style: const TextStyle(fontSize: 11.5, color: Color(0xFFFFC9D2))),
          ),
        if (isExam && !lessonsComplete)
          BsCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Complete all lessons first', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: BsColors.warning)),
                const SizedBox(height: 6),
                const Text(
                  'The final assessment unlocks once every lesson in the programme is marked complete.',
                  style: TextStyle(fontSize: 11, height: 1.6, color: BsColors.muted),
                ),
                const SizedBox(height: 10),
                GhostButton(label: 'Back to course', onPressed: () => Navigator.pop(context)),
              ],
            ),
          )
        else ...[
          if (attempts.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(
                'Previous attempts: ${attempts.length}',
                style: const TextStyle(fontSize: 10.5, color: BsColors.dim),
              ),
            ),
          PrimaryButton(label: 'Start assessment', icon: Icons.arrow_forward, loading: _loading, onPressed: _start),
          const SizedBox(height: 10),
          const Text(
            'Answers are graded on the server. Your certificate is issued automatically when you pass.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 9.5, height: 1.5, color: BsColors.dim),
          ),
        ],
      ],
    );
  }

  Widget _metric(String label, String value) {
    return Expanded(
      child: BsCard(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontSize: 8.5, letterSpacing: 0.8, color: BsColors.dim)),
            const SizedBox(height: 4),
            Text(value, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.white)),
          ],
        ),
      ),
    );
  }

  Widget _questionView() {
    final question = _questions[_index];
    final answered = _answers.where((a) => a >= 0).length;
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 0),
          child: Column(
            children: [
              Row(
                children: [
                  Text('Question ${_index + 1} of ${_questions.length}', style: const TextStyle(fontSize: 10.5, color: BsColors.muted)),
                  const Spacer(),
                  Text('$answered answered', style: const TextStyle(fontSize: 10.5, color: BsColors.cyan)),
                ],
              ),
              const SizedBox(height: 8),
              ProgressLine(percent: ((_index + 1) / _questions.length * 100).round(), height: 3),
            ],
          ),
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 20),
            children: [
              Text(question.prompt, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500, height: 1.5, color: Colors.white)),
              const SizedBox(height: 18),
              ...question.options.asMap().entries.map((entry) {
                final selected = _answers[_index] == entry.key;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 9),
                  child: GestureDetector(
                    onTap: () => setState(() => _answers[_index] = entry.key),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 160),
                      padding: const EdgeInsets.all(13),
                      decoration: BoxDecoration(
                        color: selected ? BsColors.purple.withValues(alpha: 0.13) : Colors.white.withValues(alpha: 0.02),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: selected ? BsColors.purple.withValues(alpha: 0.65) : BsColors.line),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 24,
                            height: 24,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: selected ? BsColors.purple : Colors.transparent,
                              border: Border.all(color: selected ? BsColors.purple : BsColors.lineStrong),
                            ),
                            child: Text(
                              String.fromCharCode(65 + entry.key),
                              style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w600, color: selected ? Colors.white : BsColors.muted),
                            ),
                          ),
                          const SizedBox(width: 11),
                          Expanded(
                            child: Text(
                              entry.value,
                              style: TextStyle(fontSize: 12, height: 1.5, color: selected ? Colors.white : const Color(0xFFC3CEDF)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }),
            ],
          ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 18),
            child: Row(
              children: [
                IconButton(
                  onPressed: _index == 0 ? null : () => setState(() => _index--),
                  icon: const Icon(Icons.chevron_left),
                  style: IconButton.styleFrom(backgroundColor: Colors.white.withValues(alpha: 0.04)),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _index < _questions.length - 1
                      ? GhostButton(label: 'Next', icon: Icons.chevron_right, onPressed: () => setState(() => _index++))
                      : PrimaryButton(label: 'Review & submit', icon: Icons.check, loading: _busy, onPressed: _confirmSubmit),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _resultView() {
    final result = _result!;
    final passed = result['passed'] == true;
    final percent = (result['percent'] ?? 0) as int;
    final serial = result['certificateSerial'] as String?;
    final note = result['certificateNote'] as String?;
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 26, 20, 30),
      children: [
        Center(
          child: Container(
            width: 78,
            height: 78,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: (passed ? BsColors.emerald : BsColors.danger).withValues(alpha: 0.12),
              border: Border.all(color: (passed ? BsColors.emerald : BsColors.danger).withValues(alpha: 0.35)),
            ),
            child: Icon(passed ? Icons.check_rounded : Icons.close_rounded, size: 34, color: passed ? BsColors.emerald : BsColors.danger),
          ),
        ),
        const SizedBox(height: 16),
        Text(
          result['expired'] == true ? 'Time expired' : passed ? 'Assessment passed' : 'Not passed this time',
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, letterSpacing: -0.5, color: Colors.white),
        ),
        const SizedBox(height: 6),
        Text(widget.title, textAlign: TextAlign.center, style: const TextStyle(fontSize: 11, color: BsColors.muted)),
        const SizedBox(height: 20),
        Center(
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('$percent%', style: const TextStyle(fontSize: 38, fontWeight: FontWeight.w700, color: Colors.white)),
              const SizedBox(width: 10),
              Text('pass mark ${result['passMark']}%', style: const TextStyle(fontSize: 10, color: BsColors.dim)),
            ],
          ),
        ),
        const SizedBox(height: 18),
        if (serial != null)
          BsCard(
            border: Border.all(color: BsColors.emerald.withValues(alpha: 0.3)),
            child: Column(
              children: [
                const Row(
                  children: [
                    Icon(Icons.workspace_premium, size: 18, color: BsColors.emerald),
                    SizedBox(width: 8),
                    Text('Certificate issued', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: Colors.white)),
                  ],
                ),
                const SizedBox(height: 6),
                Align(alignment: Alignment.centerLeft, child: Text(serial, style: const TextStyle(fontSize: 10.5, letterSpacing: 0.8, color: BsColors.muted))),
                const SizedBox(height: 4),
                const Align(
                  alignment: Alignment.centerLeft,
                  child: Text('Download it from the Certificates tab.', style: TextStyle(fontSize: 10, color: BsColors.dim)),
                ),
              ],
            ),
          ),
        if (note != null)
          Container(
            margin: const EdgeInsets.only(top: 4),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: BsColors.warning.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(12)),
            child: Text(note, style: const TextStyle(fontSize: 11, color: BsColors.warning, height: 1.5)),
          ),
        const SizedBox(height: 20),
        PrimaryButton(label: 'Back to course', icon: Icons.arrow_back, onPressed: () => Navigator.pop(context, passed)),
        const SizedBox(height: 10),
        GhostButton(label: 'Close', onPressed: () => Navigator.pop(context, passed)),
      ],
    );
  }
}
