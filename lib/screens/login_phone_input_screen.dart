import 'package:flutter/material.dart';

import '../core/app_colors.dart';
import '../core/session_store.dart';
import '../services/auth_service.dart';
import '../widgets/auth_header.dart';

class LoginPhoneInputScreen extends StatefulWidget {
  const LoginPhoneInputScreen({super.key});

  @override
  State<LoginPhoneInputScreen> createState() => _LoginPhoneInputScreenState();
}

class _LoginPhoneInputScreenState extends State<LoginPhoneInputScreen> {
  final TextEditingController _phoneController = TextEditingController();
  String? _errorMessage;
  bool _isValid = false;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _phoneController.addListener(_checkValidity);
    SessionStore.currentAuthFlow = AuthFlow.login;
  }

  void _checkValidity() {
    final phoneText = _phoneController.text.trim();
    final phoneValid = phoneText.length == 10 && RegExp(r'^[0-9]+$').hasMatch(phoneText);
    if (_isValid != phoneValid) {
      setState(() {
        _isValid = phoneValid;
      });
    }
  }

  Future<void> _sendLoginOtp() async {
    if (!_isValid) {
      setState(() {
        _errorMessage = 'Please enter a valid 10-digit mobile number.';
      });
      return;
    }

    final phoneNumber = '+91${_phoneController.text.trim()}';
    SessionStore.clearAuthAttempt();
    SessionStore.currentAuthFlow = AuthFlow.login;

    setState(() {
      _errorMessage = null;
      _isLoading = true;
    });

    try {
      final result = await AuthService.loginInitiate(phoneNumber: phoneNumber);
      if (result.success && mounted) {
        Navigator.pushNamed(context, '/otp-verification');
      } else {
        setState(() {
          _errorMessage = result.message;
          _isLoading = false;
        });
      }
    } catch (_) {
      setState(() {
        _errorMessage = 'Failed to send OTP. Please try again.';
        _isLoading = false;
      });
    }
  }

  @override
  void dispose() {
    _phoneController.removeListener(_checkValidity);
    _phoneController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SingleChildScrollView(
        child: Column(
          children: [
            const AuthHeader(
              title: 'Login with OTP',
              subtitle: 'Enter your registered phone number',
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Phone Number',
                    style: TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _phoneController,
                    keyboardType: TextInputType.phone,
                    maxLength: 10,
                    decoration: InputDecoration(
                      hintText: '+91-9790939361',
                      hintStyle: const TextStyle(color: AppColors.textSecondary),
                      counterText: "",
                      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
                      filled: true,
                      fillColor: AppColors.white,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: AppColors.paleGreen),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: AppColors.paleGreen, width: 1.2),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: AppColors.primary, width: 2),
                      ),
                      errorText: _errorMessage,
                    ),
                  ),
                  if (_errorMessage != null) ...[
                    const SizedBox(height: 12),
                    Text(
                      _errorMessage!,
                      style: const TextStyle(color: AppColors.error, fontSize: 14),
                    ),
                  ],
                  const SizedBox(height: 28),
                  SizedBox(
                    width: double.infinity,
                    height: 54,
                    child: ElevatedButton(
                      onPressed: _isValid && !_isLoading ? _sendLoginOtp : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _isValid
                            ? AppColors.primary
                            : AppColors.primary.withOpacity(0.4),
                        disabledBackgroundColor: AppColors.primary.withOpacity(0.4),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                        elevation: _isValid ? 2 : 0,
                      ),
                      child: _isLoading
                          ? const CircularProgressIndicator(
                              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                            )
                          : const Text(
                              'Login with OTP',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 18,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
