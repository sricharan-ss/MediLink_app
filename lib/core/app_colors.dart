import 'package:flutter/material.dart';

class AppColors {
  const AppColors._();

  // MediLink Core Official Palette
  static const primary = Color(0xFF2C6975); // Deep Teal (Primary brand)
  static const secondary = Color(0xFF68B2A0); // Soft Teal (Secondary brand)
  static const sage = Color(0xFFCDE0C9); // Sage (Soft accent)
  static const paleGreen = Color(0xFFE0ECDE); // Pale Green (Light surface/bg)
  static const white = Color(0xFFFFFFFF); // White (Main surface)

  // Typography Colors
  static const textPrimary = Color(0xFF263238); // Dark Slate
  static const textSecondary = Color(0xFF607D80); // Muted Slate
  static const textLight = Color(0xFFFFFFFF); // White text

  // Surfaces & Borders
  static const background = Color(0xFFFFFFFF); // Default scaffold background
  static const scaffoldBackground = Color(0xFFFBFDFB); // Subtle clean canvas
  static const cardBackground = Color(0xFFFFFFFF); // Main card surface
  static const surface = Color(0xFFE0ECDE); // Pale Green surface
  static const surfaceSage = Color(0xFFCDE0C9); // Sage surface
  static const border = Color(0xFFE0ECDE); // Border color
  static const divider = Color(0xFFE0ECDE); // Divider line

  // Status Indicators
  static const error = Color(0xFFD9534F); // Meaningful Red
  static const success = Color(0xFF3F8F6B); // Meaningful Green
  static const warning = Color(0xFFE67E22); // Meaningful Amber/Orange

  // Semantic UI Helpers
  static const iconPrimary = primary;
  static const iconSecondary = secondary;
  static const iconMuted = textSecondary;
  static const chipBackground = paleGreen;
  static const chipSelected = secondary;

  // Backward-compatibility aliases strictly mapped to official MediLink colors
  static const brownDeep = primary; // Maps to Deep Teal #2C6975
  static const brownMid = secondary; // Maps to Soft Teal #68B2A0
  static const brownLight = textSecondary; // Maps to Muted Slate #607D80
  static const accent = secondary; // Maps to Soft Teal #68B2A0
  static const cream = paleGreen; // Maps to Pale Green #E0ECDE
  static const warmWhite = white; // Maps to White #FFFFFF
  static const errorRed = error; // Maps to #D9534F
}
