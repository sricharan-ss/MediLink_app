import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'core/app_theme.dart';
import 'core/session_store.dart';
import 'services/medication_notification_service.dart';
import 'screens/landing_page.dart';
import 'screens/phone_input_screen.dart';
import 'screens/login_phone_input_screen.dart';
import 'screens/otp_verification_screen.dart';
import 'screens/profile_setup_screen.dart';
import 'screens/main_app_screen.dart';
import 'screens/settings_screen.dart';
import 'screens/appearance_screen.dart';
import 'screens/faq_screen.dart';
import 'screens/hospital_list_screen.dart';
import 'screens/doctor_list_screen.dart';
import 'screens/search_results_screen.dart';
import 'screens/notification_center_screen.dart';

final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  await MedicationNotificationService.initialize();
  await SessionStore.restoreSession();
  runApp(const MediLinkApp());
}

class MediLinkApp extends StatelessWidget {
  const MediLinkApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: navigatorKey,
      debugShowCheckedModeBanner: false,
      title: 'MediLink',
      theme: AppTheme.lightTheme,
      builder: (context, child) {
        final mediaQuery = MediaQuery.of(context);
        final currentScale = mediaQuery.textScaler.scale(1.0);
        final clampedScale = currentScale.clamp(0.9, 1.0).toDouble();
        return MediaQuery(
          data: mediaQuery.copyWith(
            textScaler: TextScaler.linear(clampedScale),
          ),
          child: child ?? const SizedBox.shrink(),
        );
      },
      initialRoute: SessionStore.isLoggedIn ? '/main-app' : '/',
      onGenerateRoute: (settings) {
        switch (settings.name) {
          case '/':
            return MaterialPageRoute(builder: (_) => const LandingPage());
          case '/phone-input':
            return MaterialPageRoute(builder: (_) => const PhoneInputScreen());
          case '/login-phone-input':
            return MaterialPageRoute(
              builder: (_) => const LoginPhoneInputScreen(),
            );
          case '/otp-verification':
            return MaterialPageRoute(
              builder: (_) => const OTPVerificationScreen(),
            );
          case '/profile-setup':
            return MaterialPageRoute(
              builder: (_) => const ProfileSetupScreen(),
            );
          case '/main-app':
            return MaterialPageRoute(builder: (_) => const MainAppScreen());
          case '/settings':
            return MaterialPageRoute(builder: (_) => const SettingsScreen());
          case '/appearance':
            return MaterialPageRoute(builder: (_) => const AppearanceScreen());
          case '/faqs':
            return MaterialPageRoute(builder: (_) => const FAQScreen());
          case '/hospital-list':
            final args = settings.arguments as Map<String, dynamic>?;
            final nearbyOnly = args?['nearbyOnly'] as bool? ?? false;
            return MaterialPageRoute(
              builder: (_) => HospitalListScreen(nearbyOnly: nearbyOnly),
            );
          case '/doctor-list':
            final args = settings.arguments as Map<String, dynamic>?;
            final searchQuery = args?['searchQuery'] as String?;
            final hospitalId = args?['hospitalId'] as String?;
            return MaterialPageRoute(
              builder: (_) => DoctorListScreen(
                initialSearchQuery: searchQuery,
                hospitalId: hospitalId,
              ),
            );
          case '/search-results':
            return MaterialPageRoute(
              builder: (_) => const SearchResultsScreen(),
            );
          case '/notifications':
            return MaterialPageRoute(
              builder: (_) => const NotificationCenterScreen(),
            );
          default:
            return MaterialPageRoute(builder: (_) => const LandingPage());
        }
      },
    );
  }
}
