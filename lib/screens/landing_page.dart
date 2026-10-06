import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../core/app_colors.dart';

class LandingPage extends StatelessWidget {
  const LandingPage({super.key});

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light.copyWith(
        statusBarColor: Colors.transparent,
      ),
      child: Scaffold(
        body: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [AppColors.primary, AppColors.secondary],
            ),
          ),
          child: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  const SizedBox(height: 16),
                  Image.asset(
                    'assets/images/medilink_logo.png',
                    height: 130,
                    fit: BoxFit.contain,
                  ),
                  const SizedBox(height: 20),
                  const FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      'MediLink',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: AppColors.white,
                        fontSize: 48,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.6,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Smart Healthcare Patient Management System',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: AppColors.paleGreen,
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 28),
                  const _FeatureIconsCluster(),
                  const SizedBox(height: 36),
                  SizedBox(
                    width: double.infinity,
                    height: 54,
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.pushNamed(context, '/phone-input');
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.white,
                        foregroundColor: AppColors.primary,
                        elevation: 2,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(28),
                        ),
                      ),
                      child: const Text(
                        'Get Started',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text(
                        'Already have an account? ',
                        style: TextStyle(
                          color: AppColors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      GestureDetector(
                        onTap: () {
                          Navigator.pushNamed(context, '/login-phone-input');
                        },
                        child: const Text(
                          'Login',
                          style: TextStyle(
                            color: AppColors.white,
                            fontSize: 16,
                            decoration: TextDecoration.underline,
                            decorationColor: AppColors.white,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _FeatureIconsCluster extends StatefulWidget {
  const _FeatureIconsCluster();

  @override
  State<_FeatureIconsCluster> createState() => _FeatureIconsClusterState();
}

class _FeatureIconsClusterState extends State<_FeatureIconsCluster> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  static const _phases = [0.0, 1.7, 3.4, 5.1];
  static const _phaseOffsets = [0.8, 2.1, 1.2, 2.7];

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 10),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Offset _floatingOffset(double t, int i) {
    final dx = math.sin(t + _phases[i]) * 6;
    final dy = math.cos((t * 0.9) + _phaseOffsets[i]) * 5;
    return Offset(dx, dy);
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        final t = _controller.value * 2 * math.pi;
        return SizedBox(
          height: 165,
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              Positioned(
                left: 30,
                top: 0,
                child: Transform.translate(
                  offset: _floatingOffset(t, 0),
                  child: const _IconBadge(
                    icon: Icons.health_and_safety_outlined,
                    color: AppColors.white,
                    size: 56,
                  ),
                ),
              ),
              Positioned(
                right: 32,
                top: 2,
                child: Transform.translate(
                  offset: _floatingOffset(t, 1),
                  child: Transform.rotate(
                    angle: math.pi / 12,
                    child: const _IconBadge(
                      icon: Icons.medical_services_outlined,
                      color: AppColors.paleGreen,
                      size: 54,
                    ),
                  ),
                ),
              ),
              Positioned(
                left: 16,
                bottom: 3,
                child: Transform.translate(
                  offset: _floatingOffset(t, 2),
                  child: const _IconBadge(
                    icon: Icons.notification_important_outlined,
                    color: AppColors.sage,
                    size: 47,
                  ),
                ),
              ),
              Positioned(
                right: 38,
                bottom: 0,
                child: Transform.translate(
                  offset: _floatingOffset(t, 3),
                  child: Transform.rotate(
                    angle: -math.pi / 13,
                    child: const _IconBadge(
                      icon: Icons.monitor_heart_outlined,
                      color: AppColors.paleGreen,
                      size: 48,
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _IconBadge extends StatelessWidget {
  const _IconBadge({
    required this.icon,
    required this.color,
    required this.size,
  });

  final IconData icon;
  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Icon(icon, color: color, size: size);
  }
}
