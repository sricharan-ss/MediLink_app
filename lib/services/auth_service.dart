import 'dart:convert';
import 'package:http/http.dart' as http;

import '../core/backend_config.dart';
import '../core/session_store.dart';

class AuthService {
  static String get _effectiveBaseUrl => BackendConfig.baseUrl;

  static Uri _uri(String path) => Uri.parse('$_effectiveBaseUrl$path');

  static Future<SignupInitResult> signupInitiate({
    required String phoneNumber,
    required String firstName,
    required String lastName,
  }) async {
    SessionStore.currentAuthFlow = AuthFlow.signup;
    SessionStore.phoneNumber = phoneNumber;
    SessionStore.firstName = firstName;
    SessionStore.lastName = lastName;

    final response = await _postWithFallback(
      paths: const ['/api/auth/user'],
      payload: {
        'phoneNumber': phoneNumber,
        'firstName': firstName,
        'lastName': lastName,
      },
    );

    if (response.networkError != null) {
      return SignupInitResult.failure(response.networkError!);
    }

    if (response.statusCode == 200 || response.statusCode == 201) {
      final verificationToken = _readString(response.decoded, 'token');
      if (verificationToken != null && verificationToken.isNotEmpty) {
        SessionStore.verificationToken = verificationToken;
        SessionStore.devOtp = _readString(response.decoded, 'devOtp');
        final backendMessage =
            _readString(response.decoded, 'message') ??
            'OTP sent to your phone.';
        return SignupInitResult.success(
          message: _withDevOtp(backendMessage),
          verificationToken: verificationToken,
        );
      }
      return SignupInitResult.failure('No verification token received');
    }

    return SignupInitResult.failure(
      _readString(response.decoded, 'message') ?? 'Unable to create account',
    );
  }

  static Future<LoginInitResult> loginInitiate({
    required String phoneNumber,
  }) async {
    SessionStore.currentAuthFlow = AuthFlow.login;
    SessionStore.phoneNumber = phoneNumber;

    final response = await _postWithFallback(
      paths: const ['/api/auth/login/phone', '/api/auth/user'],
      payload: {'phoneNumber': phoneNumber},
    );

    if (response.networkError != null) {
      return LoginInitResult.failure(response.networkError!);
    }

    if (response.statusCode == 200 || response.statusCode == 201) {
      final verificationToken = _readString(response.decoded, 'token');
      if (verificationToken != null && verificationToken.isNotEmpty) {
        SessionStore.verificationToken = verificationToken;
        SessionStore.devOtp = _readString(response.decoded, 'devOtp');
        return LoginInitResult.success(
          message: _withDevOtp(
            _readString(response.decoded, 'message') ??
                'OTP sent to your phone.',
          ),
          verificationToken: verificationToken,
        );
      }
      return LoginInitResult.failure('No verification token received');
    }

    return LoginInitResult.failure(
      _readString(response.decoded, 'message') ?? 'Unable to log in',
    );
  }

  static Future<AuthResult> verifyOtp({required String otp}) async {
    final token = SessionStore.verificationToken;
    if (token == null || token.isEmpty) {
      return AuthResult.failure('No verification token. Please try again.');
    }

    final candidatePaths = SessionStore.currentAuthFlow == AuthFlow.signup
        ? const [
            '/api/auth/verify-otp',
            '/api/auth/verify-otp-temp',
            '/api/auth/login/phone/verify',
          ]
        : const ['/api/auth/login/phone/verify', '/api/auth/verify-otp'];

    final response = await _postWithFallback(
      paths: candidatePaths,
      payload: {'otp': otp},
      bearerToken: token,
      retryOnNotFound: true,
    );

    if (response.networkError != null) {
      return AuthResult.failure(response.networkError!);
    }

    if (response.statusCode == 200) {
      final accessToken = _readString(response.decoded, 'accessToken');
      if (accessToken != null && accessToken.isNotEmpty) {
        SessionStore.accessToken = accessToken;
        await _loadCurrentUserProfile(accessToken);
        await SessionStore.persistSession();
        SessionStore.verificationToken = null;
        return AuthResult.success(
          message:
              _readString(response.decoded, 'message') ??
              'Authentication successful',
        );
      }
      return AuthResult.failure('No access token received');
    }

    if (response.statusCode == 404) {
      return AuthResult.failure(
        'OTP verification route is not available in backend. Please verify auth routes in backend.',
      );
    }

    final message =
        _readString(response.decoded, 'message') ?? 'OTP verification failed';
    if (SessionStore.currentAuthFlow == AuthFlow.signup &&
        message.toLowerCase().contains('token corrupted')) {
      return AuthResult.failure(
        'Signup OTP verification is not enabled in backend routes. Please ask backend to add /api/auth/verify-otp.',
      );
    }

    return AuthResult.failure(message);
  }

  static Future<AuthResult> resendOtp() async {
    if (SessionStore.phoneNumber.trim().isEmpty) {
      return AuthResult.failure('Phone number is missing. Please start again.');
    }

    if (SessionStore.currentAuthFlow == AuthFlow.login) {
      final loginResult = await loginInitiate(
        phoneNumber: SessionStore.phoneNumber,
      );
      if (loginResult.success) {
        return AuthResult.success(message: loginResult.message);
      }
      return AuthResult.failure(loginResult.message);
    }

    final firstName = SessionStore.firstName.trim();
    final lastName = SessionStore.lastName.trim();
    if (firstName.isEmpty || lastName.isEmpty) {
      return AuthResult.failure(
        'Name details are missing. Please restart signup.',
      );
    }

    final signupResult = await signupInitiate(
      phoneNumber: SessionStore.phoneNumber,
      firstName: firstName,
      lastName: lastName,
    );
    if (signupResult.success) {
      return AuthResult.success(message: signupResult.message);
    }
    return AuthResult.failure(signupResult.message);
  }

  static Future<AuthResult> upsertMyPatientProfile({
    required int age,
    required String gender,
    String? email,
    String? emergencyContact,
    String? bloodGroup,
    List<String>? chronicConditions,
    List<String>? favoriteDoctorIds,
  }) async {
    final accessToken = SessionStore.accessToken;
    if (accessToken == null || accessToken.isEmpty) {
      return AuthResult.failure('Not authenticated. Please login again.');
    }

    final effectiveFavs = favoriteDoctorIds ?? SessionStore.favoriteDoctorIds;

    final response = await _put('/api/patients/me/profile', {
      'age': age,
      'gender': gender,
      if (email != null && email.trim().isNotEmpty) 'email': email.trim(),
      if (emergencyContact != null && emergencyContact.trim().isNotEmpty)
        'emergencyContact': emergencyContact.trim(),
      if (bloodGroup != null && bloodGroup.isNotEmpty) 'bloodGroup': bloodGroup,
      if (chronicConditions != null) 'chronicConditions': chronicConditions,
      'favoriteDoctorIds': effectiveFavs,
    }, bearerToken: accessToken);

    if (response.networkError != null) {
      return AuthResult.failure(response.networkError!);
    }

    if (response.statusCode == 200 || response.statusCode == 201) {
      final data = response.decoded['data'];
      if (data is Map<String, dynamic>) {
        SessionStore.registerUser(SessionStore.phoneNumber, data);
      }
      await _loadCurrentUserProfile(accessToken);
      await SessionStore.persistSession();
      return AuthResult.success(
        message:
            _readString(response.decoded, 'message') ??
            'Patient profile saved successfully',
      );
    }

    return AuthResult.failure(
      _readString(response.decoded, 'message') ??
          'Unable to save patient profile',
    );
  }

  static Future<_BackendResponse> _postWithFallback({
    required List<String> paths,
    required Map<String, dynamic> payload,
    String? bearerToken,
    bool retryOnNotFound = false,
  }) async {
    for (var index = 0; index < paths.length; index++) {
      final path = paths[index];
      final response = await _post(path, payload, bearerToken: bearerToken);
      if (!retryOnNotFound ||
          response.statusCode != 404 ||
          index == paths.length - 1) {
        return response;
      }
    }

    return const _BackendResponse(
      statusCode: 500,
      decoded: <String, dynamic>{},
      networkError: 'Unable to process request.',
    );
  }

  static Future<_BackendResponse> _post(
    String path,
    Map<String, dynamic> payload, {
    String? bearerToken,
  }) async {
    try {
      final headers = {'Content-Type': 'application/json'};
      if (bearerToken != null && bearerToken.isNotEmpty) {
        headers['Authorization'] = 'Bearer $bearerToken';
      }

      final response = await http.post(
        _uri(path),
        headers: headers,
        body: jsonEncode(payload),
      );

      final decoded = _decodeMap(response.body);
      return _BackendResponse(
        statusCode: response.statusCode,
        decoded: decoded,
      );
    } catch (e) {
      final errorStr = e.toString().toLowerCase();
      final isNetworkError =
          errorStr.contains('socketexception') ||
          errorStr.contains('failed host lookup') ||
          errorStr.contains('clientexception') ||
          errorStr.contains('connection refused') ||
          errorStr.contains('xmlhttprequest error');

      if (isNetworkError) {
        return _BackendResponse(
          statusCode: 0,
          decoded: const <String, dynamic>{},
          networkError:
              'Unable to reach backend at $_effectiveBaseUrl. Make sure the server is running.',
        );
      }
      return _BackendResponse(
        statusCode: 0,
        decoded: const <String, dynamic>{},
        networkError: 'Unexpected error while calling backend: $e',
      );
    }
  }

  static Future<_BackendResponse> _put(
    String path,
    Map<String, dynamic> payload, {
    String? bearerToken,
  }) async {
    try {
      final headers = {'Content-Type': 'application/json'};
      if (bearerToken != null && bearerToken.isNotEmpty) {
        headers['Authorization'] = 'Bearer $bearerToken';
      }

      final response = await http.put(
        _uri(path),
        headers: headers,
        body: jsonEncode(payload),
      );

      final decoded = _decodeMap(response.body);
      return _BackendResponse(
        statusCode: response.statusCode,
        decoded: decoded,
      );
    } catch (e) {
      final errorStr = e.toString().toLowerCase();
      final isNetworkError =
          errorStr.contains('socketexception') ||
          errorStr.contains('failed host lookup') ||
          errorStr.contains('clientexception') ||
          errorStr.contains('connection refused') ||
          errorStr.contains('xmlhttprequest error');

      if (isNetworkError) {
        return _BackendResponse(
          statusCode: 0,
          decoded: const <String, dynamic>{},
          networkError:
              'Unable to reach backend at $_effectiveBaseUrl. Make sure the server is running.',
        );
      }
      return _BackendResponse(
        statusCode: 0,
        decoded: const <String, dynamic>{},
        networkError: 'Unexpected error while calling backend: $e',
      );
    }
  }

  static Future<void> _loadCurrentUserProfile(String accessToken) async {
    final response = await _get('/api/users/myinfo', bearerToken: accessToken);

    if (response.statusCode != 200) {
      return;
    }

    final data = response.decoded['data'];
    if (data is! Map<String, dynamic>) {
      return;
    }

    final firstName = _readString(data, 'firstName');
    final lastName = _readString(data, 'lastName');
    final phoneNumber = _readString(data, 'phoneNumber');
    final email = _readString(data, 'email');
    final emergencyContact = _readString(data, 'emergencyContact');

    if (firstName != null && firstName.trim().isNotEmpty) {
      SessionStore.firstName = firstName.trim();
    }
    if (lastName != null && lastName.trim().isNotEmpty) {
      SessionStore.lastName = lastName.trim();
    }
    if (phoneNumber != null && phoneNumber.trim().isNotEmpty) {
      SessionStore.phoneNumber = phoneNumber.trim();
    }
    if (email != null && email.trim().isNotEmpty) {
      SessionStore.email = email.trim();
    }
    if (emergencyContact != null && emergencyContact.trim().isNotEmpty) {
      SessionStore.emergencyContact = emergencyContact.trim();
    }

    SessionStore.registerUser(SessionStore.phoneNumber, data);

    final patient = data['patient'];
    if (patient is Map<String, dynamic>) {
      final age = _readString(patient, 'age');
      final gender = _readString(patient, 'gender');
      final bloodGroup = _readString(patient, 'bloodGroup');
      final chronicConditions = patient['chronicConditions'];
      final dob = _readString(patient, 'dob');

      if (age != null && age.trim().isNotEmpty) {
        SessionStore.age = age.trim();
      } else if (dob != null && dob.trim().isNotEmpty) {
        final parsedDob = DateTime.tryParse(dob);
        if (parsedDob != null) {
          final now = DateTime.now();
          var calculatedAge = now.year - parsedDob.year;
          if (now.month < parsedDob.month ||
              (now.month == parsedDob.month && now.day < parsedDob.day)) {
            calculatedAge--;
          }
          SessionStore.age = calculatedAge.toString();
        }
      }
      if (gender != null && gender.trim().isNotEmpty) {
        SessionStore.gender = gender.trim();
      }
      if (bloodGroup != null && bloodGroup.trim().isNotEmpty) {
        SessionStore.bloodGroup = bloodGroup.trim();
      }
      if (chronicConditions is List) {
        SessionStore.chronicConditions = chronicConditions
            .whereType<String>()
            .map((item) => item.trim())
            .where((item) => item.isNotEmpty)
            .toList();
      }
      final patientId = _readString(patient, 'patientId');
      if (patientId != null && patientId.trim().isNotEmpty) {
        SessionStore.patientId = patientId.trim();
      }
      final favs = patient['favoriteDoctorIds'] ?? patient['favouriteDoctorIds'];
      if (favs is List) {
        SessionStore.favoriteDoctorIds = favs
            .whereType<String>()
            .map((item) => item.trim())
            .where((item) => item.isNotEmpty)
            .toSet()
            .toList();
      }
    }
  }

  static Future<_BackendResponse> _get(
    String path, {
    String? bearerToken,
  }) async {
    try {
      final headers = <String, String>{};
      if (bearerToken != null && bearerToken.isNotEmpty) {
        headers['Authorization'] = 'Bearer $bearerToken';
      }

      final response = await http.get(_uri(path), headers: headers);

      final decoded = _decodeMap(response.body);
      return _BackendResponse(
        statusCode: response.statusCode,
        decoded: decoded,
      );
    } catch (e) {
      return _BackendResponse(
        statusCode: 0,
        decoded: const <String, dynamic>{},
        networkError: 'Unexpected error while calling backend: $e',
      );
    }
  }

  static Map<String, dynamic> _decodeMap(String body) {
    if (body.isEmpty) {
      return <String, dynamic>{};
    }
    final parsed = jsonDecode(body);
    if (parsed is Map<String, dynamic>) {
      return parsed;
    }
    return <String, dynamic>{};
  }

  static String? _readString(Map<String, dynamic> decoded, String key) {
    final value = decoded[key];
    if (value == null) {
      return null;
    }
    if (value is String) {
      return value;
    }
    return value.toString();
  }

  static String _withDevOtp(String message) {
    final devOtp = SessionStore.devOtp;
    if (devOtp == null || devOtp.isEmpty) {
      return message;
    }
    return '$message Development OTP: $devOtp';
  }

  static Future<bool> refreshToken() async {
    return SessionStore.accessToken != null;
  }

  static Future<void> logout() async {
    await SessionStore.logout();
  }
}

class _BackendResponse {
  final int statusCode;
  final Map<String, dynamic> decoded;
  final String? networkError;

  const _BackendResponse({
    required this.statusCode,
    required this.decoded,
    this.networkError,
  });
}

class AuthResult {
  final bool success;
  final String message;

  AuthResult._({required this.success, required this.message});

  factory AuthResult.success({required String message}) {
    return AuthResult._(success: true, message: message);
  }

  factory AuthResult.failure(String message) {
    return AuthResult._(success: false, message: message);
  }
}

class SignupInitResult {
  final bool success;
  final String message;
  final String? verificationToken;

  SignupInitResult._({
    required this.success,
    required this.message,
    this.verificationToken,
  });

  factory SignupInitResult.success({
    required String message,
    required String verificationToken,
  }) {
    return SignupInitResult._(
      success: true,
      message: message,
      verificationToken: verificationToken,
    );
  }

  factory SignupInitResult.failure(String message) {
    return SignupInitResult._(success: false, message: message);
  }
}

class LoginInitResult {
  final bool success;
  final String message;
  final String? verificationToken;

  LoginInitResult._({
    required this.success,
    required this.message,
    this.verificationToken,
  });

  factory LoginInitResult.success({
    required String message,
    required String verificationToken,
  }) {
    return LoginInitResult._(
      success: true,
      message: message,
      verificationToken: verificationToken,
    );
  }

  factory LoginInitResult.failure(String message) {
    return LoginInitResult._(success: false, message: message);
  }
}
