import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../theme.dart';
import '../widgets.dart';

class SplashScreen extends StatefulWidget {
  final void Function(BuildContext context) onFinished;
  const SplashScreen({super.key, required this.onFinished});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 2200))..forward();
  bool _navigated = false;

  @override
  void initState() {
    super.initState();
    _schedule();
  }

  Future<void> _schedule() async {
    await Future<void>.delayed(const Duration(milliseconds: 2600));
    if (!mounted || _navigated) return;
    _navigated = true;
    widget.onFinished(context);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reduceMotion = MediaQuery.of(context).disableAnimations;
    return Scaffold(
      backgroundColor: BsColors.ink,
      body: ScreenBackground(
        child: Center(
          child: AnimatedBuilder(
            animation: _controller,
            builder: (context, _) {
              final value = reduceMotion ? 1.0 : _controller.value;
              final ring = Curves.easeOutCubic.transform((value / 0.55).clamp(0.0, 1.0));
              final logo = ((value - 0.25) / 0.4).clamp(0.0, 1.0);
              final copy = ((value - 0.55) / 0.35).clamp(0.0, 1.0);
              return Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    width: 180,
                    height: 180,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        Opacity(
                          opacity: ring,
                          child: Transform.scale(
                            scale: 0.8 + ring * 0.2,
                            child: CustomPaint(
                              size: const Size(180, 180),
                              painter: _SplashRingPainter(rotation: reduceMotion ? 0 : value * math.pi * 3),
                            ),
                          ),
                        ),
                        Opacity(
                          opacity: logo,
                          child: Transform.scale(
                            scale: 0.85 + logo * 0.15,
                            child: const BrandMark(size: 86),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 34),
                  Opacity(
                    opacity: copy,
                    child: Transform.translate(
                      offset: Offset(0, 12 * (1 - copy)),
                      child: Column(
                        children: [
                          ShaderMask(
                            shaderCallback: (bounds) => const LinearGradient(
                              colors: [Colors.white, Color(0xFFC9C2FF), BsColors.cyan],
                            ).createShader(bounds),
                            child: const Text(
                              'BRAVE SKILL',
                              style: TextStyle(
                                fontSize: 26,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 5,
                                color: Colors.white,
                              ),
                            ),
                          ),
                          const SizedBox(height: 10),
                          const Text(
                            'SKILL ACQUISITION ACADEMY',
                            style: TextStyle(fontSize: 8, letterSpacing: 4.2, color: BsColors.muted),
                          ),
                          const SizedBox(height: 26),
                          const Text(
                            'LEARN.  PRACTICE.  BUILD.',
                            style: TextStyle(fontSize: 9.5, letterSpacing: 3, color: Color(0xFFC9C2FF)),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class _SplashRingPainter extends CustomPainter {
  final double rotation;
  _SplashRingPainter({required this.rotation});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 4;

    final base = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1
      ..color = BsColors.purple.withValues(alpha: 0.35);
    canvas.drawCircle(center, radius, base);

    final cyan = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round
      ..shader = const SweepGradient(
        colors: [BsColors.cyan, Colors.transparent],
        stops: [0.0, 0.35],
        transform: GradientRotation(0),
      ).createShader(Rect.fromCircle(center: center, radius: radius));
    canvas.save();
    canvas.translate(center.dx, center.dy);
    canvas.rotate(rotation);
    canvas.translate(-center.dx, -center.dy);
    canvas.drawArc(Rect.fromCircle(center: center, radius: radius), 0, math.pi * 0.7, false, cyan);
    canvas.restore();

    final purple = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round
      ..shader = const SweepGradient(
        colors: [Colors.transparent, BsColors.purple],
        stops: [0.55, 1.0],
      ).createShader(Rect.fromCircle(center: center, radius: radius));
    canvas.save();
    canvas.translate(center.dx, center.dy);
    canvas.rotate(-rotation * 0.7);
    canvas.translate(-center.dx, -center.dy);
    canvas.drawArc(Rect.fromCircle(center: center, radius: radius), math.pi * 0.5, math.pi * 0.65, false, purple);
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _SplashRingPainter oldDelegate) => oldDelegate.rotation != rotation;
}
