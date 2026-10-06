import 'package:flutter/material.dart';

class AppColors {
  const AppColors._();

  // MediLink Core Palette
  static const primary = Color(0xFF2C6975); // Deep Teal
  static const secondary = Color(0xFF68B2A0); // Soft Teal
  static const sage = Color(0xFFCDE0C9); // Sage
  static const paleGreen = Color(0xFFE0ECDE); // Pale Green
  static const white = Color(0xFFFFFFFF);

  // Semantic Colors
  static const background = Color(0xFFFFFFFF);
  static const surface = Color(0xFFE0ECDE);
  static const surfaceSage = Color(0xFFCDE0C9);
  static const textPrimary = Color(0xFF263238);
  static const textSecondary = Color(0xFF607D80);
  static const error = Color(0xFFD9534F);
  static const success = Color(0xFF3F8F6B);

  // Backward-compatibility aliases mapped cleanly to MediLink palette
  static const brownDeep = primary; // #2C6975
  static const brownMid = secondary; // #68B2A0
  static const brownLight = textSecondary; // #607D80
  static const accent = secondary; // #68B2A0
  static const cream = paleGreen; // #E0ECDE
  static const warmWhite = white; // #FFFFFF
  static const errorRed = error; // #D9534F
}
