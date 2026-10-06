import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../core/app_colors.dart';
import '../core/session_store.dart';
import '../services/auth_service.dart';
import '../widgets/auth_header.dart';

class OTPVerificationScreen extends StatefulWidget {
  const OTPVerificationScreen({super.key});

  @override
  State<OTPVerificationScreen> createState() => _OTPVerificationScreenState();
}

class _OTPVerificationScreenState extends State<OTPVerificationScreen> {
  final List<TextEditingController> _controllers =
      List.generate(6, (index) => TextEditingController());
  final List<FocusNode> _focusNodes =
      List.generate(6, (index) => FocusNode());
  String _phoneNumber = "";
  bool _isValid = false;
  bool _isLoading = false;
  String? _statusMessage;
  bool _statusIsError = true;
  bool _isLogin = false;

  @override
  void initState() {
    super.initState();
    for (var controller in _controllers) {
      controller.addListener(_checkValidity);
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _phoneNumber = SessionStore.phoneNumber.replaceFirst('+91', '').trim();
    _isLogin = SessionStore.currentAuthFlow == AuthFlow.login;
    final devOtp = SessionStore.devOtp;
    if (devOtp != null && devOtp.isNotEmpty && _statusMessage == null) {
      _statusMessage = 'Development OTP: $devOtp';
      _statusIsError = false;
    }
  }

  void _checkValidity() {
    final otp = _controllers.map((c) => c.text).join();
    final isValidValue = otp.length == 6;
    if (_isValid != isValidValue) {
      setState(() {
        _isValid = isValidValue;
      });
    }
  }

  @override
  void dispose() {
    for (var controller in _controllers) {
      controller.removeListener(_checkValidity);
      controller.dispose();
    }
    for (var node in _focusNodes) {
      node.dispose();
    }
    super.dispose();
  }

  void _onOTPChanged(String value, int index) {
    if (value.length == 1) {
      if (index < 5) {
        _focusNodes[index + 1].requestFocus();
      } else {
        _focusNodes[index].unfocus();
      }
    } else if (value.isEmpty) {
      if (index > 0) {
        _focusNodes[index - 1].requestFocus();
      }
    }
  }

  Future<void> _verifyOTP() async {
    if (!_isValid) {
      setState(() {
        _statusMessage = 'Enter the 6-digit code sent to your phone';
        _statusIsError = true;
      });
      return;
    }

    final otp = _controllers.map((c) => c.text).join();

    setState(() {
      _isLoading = true;
      _statusMessage = null;
    });

    final result = await AuthService.verifyOtp(otp: otp);

    if (!mounted) {
      return;
    }

    if (result.success) {
      if (_isLogin) {
        Navigator.pushNamedAndRemoveUntil(context, '/main-app', (route) => false);
      } else {
        Navigator.pushNamed(context, '/profile-setup');
      }
      return;
    }

    setState(() {
      _statusMessage = result.message;
      _statusIsError = true;
      _isLoading = false;
    });
  }

  Future<void> _resendOtp() async {
    setState(() {
      _isLoading = true;
      _statusMessage = null;
    });

    final result = await AuthService.resendOtp();

    if (!mounted) {
      return;
    }

    setState(() {
      _isLoading = false;
      _statusMessage = result.message;
      _statusIsError = !result.success;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SingleChildScrollView(
        child: Column(
          children: [
            const AuthHeader(
              title: 'Enter OTP',
              subtitle: 'We sent a code to your phone',
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 40),
              child: Column(
                children: [
                  const Text(
                    'OTP Verification',
                    style: TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    'Enter the code sent to\n+91-$_phoneNumber',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 15,
                      height: 1.4,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 32),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: List.generate(
                      6,
                      (index) => SizedBox(
                        width: 48,
                        height: 56,
                        child: TextField(
                          controller: _controllers[index],
                          focusNode: _focusNodes[index],
                          textAlign: TextAlign.center,
                          keyboardType: TextInputType.number,
                          maxLength: 1,
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                          onChanged: (value) => _onOTPChanged(value, index),
                          inputFormatters: [
                            FilteringTextInputFormatter.digitsOnly,
                          ],
                          decoration: InputDecoration(
                            counterText: "",
                            filled: true,
                            fillColor: AppColors.white,
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(
                                color: AppColors.paleGreen,
                                width: 1.4,
                              ),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(
                                color: AppColors.primary,
                                width: 2,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    '02:32',
                    style: TextStyle(
                      color: AppColors.secondary,
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 16),
                  if (_statusMessage != null) ...[
                    Text(
                      _statusMessage!,
                      style: TextStyle(
                        color: _statusIsError ? AppColors.error : AppColors.success,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 12),
                  ],
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text(
                        "I didn't receive any code.",
                        style: TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(width: 6),
                      GestureDetector(
                        onTap: _isLoading ? null : _resendOtp,
                        child: Text(
                          'RESEND',
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            color: _isLoading
                                ? AppColors.textSecondary.withOpacity(0.5)
                                : AppColors.primary,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 40),
                  SizedBox(
                    width: double.infinity,
                    height: 54,
                    child: ElevatedButton(
                      onPressed: _isValid && !_isLoading ? _verifyOTP : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor:
                            _isValid ? AppColors.primary : AppColors.primary.withOpacity(0.4),
                        disabledBackgroundColor: AppColors.primary.withOpacity(0.4),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                        elevation: (_isValid && !_isLoading) ? 2 : 0,
                      ),
                      child: _isLoading
                          ? const CircularProgressIndicator(
                              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                            )
                          : const Text(
                              'Submit',
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
