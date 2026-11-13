import 'package:flutter/material.dart';

class BsColors {
  static const ink = Color(0xFF050509);
  static const ink2 = Color(0xFF0A0B13);
  static const panel = Color(0xFF101321);
  static const panel2 = Color(0xFF141829);
  static const purple = Color(0xFF873BFF);
  static const blue = Color(0xFF1677FF);
  static const cyan = Color(0xFF20D9E8);
  static const emerald = Color(0xFF10C99A);
  static const muted = Color(0xFF94A3B8);
  static const dim = Color(0xFF64748B);
  static const line = Color(0x14FFFFFF);
  static const lineStrong = Color(0x24FFFFFF);
  static const success = Color(0xFF34D399);
  static const danger = Color(0xFFFB7185);
  static const warning = Color(0xFFFBBF24);
}

ThemeData buildTheme() {
  final base = ThemeData.dark(useMaterial3: true);
  const scheme = ColorScheme.dark(
    primary: BsColors.purple,
    secondary: BsColors.cyan,
    surface: BsColors.ink,
    error: BsColors.danger,
  );

  return base.copyWith(
    colorScheme: scheme,
    scaffoldBackgroundColor: BsColors.ink,
    canvasColor: BsColors.ink,
    splashFactory: InkSparkle.splashFactory,
    textTheme: base.textTheme.apply(
      bodyColor: const Color(0xFFE8EEF9),
      displayColor: Colors.white,
      fontFamily: 'Inter',
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: BsColors.ink,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(fontFamily: 'Inter', fontSize: 17, fontWeight: FontWeight.w600, color: Colors.white),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: const Color(0xFF0A0C16),
      hintStyle: const TextStyle(color: Color(0xFF5F6B7E), fontSize: 13),
      labelStyle: const TextStyle(color: BsColors.muted, fontSize: 12),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BsColors.line)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BsColors.line)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BsColors.purple, width: 1.2)),
      errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BsColors.danger)),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: BsColors.purple,
        foregroundColor: Colors.white,
        minimumSize: const Size(0, 48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.w600, fontSize: 14),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(foregroundColor: const Color(0xFFC9B8FF)),
    ),
    dividerTheme: const DividerThemeData(color: BsColors.line, thickness: 1),
  );
}

const brandGradient = LinearGradient(
  colors: [BsColors.purple, Color(0xFF6D5CFF), BsColors.blue],
  begin: Alignment.centerLeft,
  end: Alignment.centerRight,
);

const cyanGradient = LinearGradient(
  colors: [BsColors.cyan, BsColors.emerald],
  begin: Alignment.centerLeft,
  end: Alignment.centerRight,
);

Color parseHex(String? hex, {Color fallback = BsColors.purple}) {
  if (hex == null || hex.isEmpty) return fallback;
  final cleaned = hex.replaceAll('#', '');
  final value = int.tryParse(cleaned.length == 6 ? 'FF$cleaned' : cleaned, radix: 16);
  return value == null ? fallback : Color(value);
}
