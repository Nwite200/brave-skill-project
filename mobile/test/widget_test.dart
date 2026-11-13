import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:brave_skill/theme.dart';
import 'package:brave_skill/widgets.dart';

void main() {
  test('brand colours are defined', () {
    expect(BsColors.ink, const Color(0xFF050509));
    expect(BsColors.purple, const Color(0xFF873BFF));
  });

  test('naira formatting uses the naira symbol', () {
    expect(naira(8500000), contains('₦'));
  });

  testWidgets('wordmark renders without overflow', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: Scaffold(body: Center(child: Wordmark()))));
    expect(find.text('BRAVE SKILL'), findsOneWidget);
  });
}
