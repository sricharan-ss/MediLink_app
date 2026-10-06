import 'package:shared_preferences/shared_preferences.dart';

enum AuthFlow {
  signup,
  login,
}

class SessionStore {
  const SessionStore._();

  static const String _keyAccessToken = 'medilink_access_token';
  static const String _keyPatientId = 'medilink_patient_id';
  static const String _keyPhoneNumber = 'medilink_phone_number';
  static const String _keyFirstName = 'medilink_first_name';
  static const String _keyLastName = 'medilink_last_name';
  static const String _keyEmail = 'medilink_email';
  static const String _keyEmergencyContact = 'medilink_emergency_contact';
  static const String _keyAge = 'medilink_age';
  static const String _keyGender = 'medilink_gender';
  static const String _keyBloodGroup = 'medilink_blood_group';
  static const String _keyChronicConditions = 'medilink_chronic_conditions';
  static const String _keyFavoriteDoctorIds = 'medilink_favorite_doctor_ids';

  static String phoneNumber = '+910000000000';
  static String firstName = '';
  static String lastName = '';
  static String email = '';
  static String emergencyContact = '';
  static String? age;
  static String gender = '';
  static String bloodGroup = '';
  static List<String> chronicConditions = <String>[];
  static List<String> favoriteDoctorIds = <String>[];
  static String? patientId;
  static String? verificationToken;
  static String? devOtp;
  static String? accessToken;
  static AuthFlow currentAuthFlow = AuthFlow.signup;

  static final Set<String> registeredPhones = <String>{};
  static final Map<String, Map<String, dynamic>> registeredUsers = <String, Map<String, dynamic>>{};

  static bool isPhoneRegistered(String phone) => registeredPhones.contains(phone);

  static void reservePhone(String phone) {
    registeredPhones.add(phone);
  }

  static bool isDoctorFavorite(String doctorId) {
    return favoriteDoctorIds.contains(doctorId.trim());
  }

  static bool toggleFavoriteDoctorLocal(String doctorId) {
    final id = doctorId.trim();
    if (id.isEmpty) return false;
    final exists = favoriteDoctorIds.contains(id);
    if (exists) {
      favoriteDoctorIds.removeWhere((item) => item == id);
    } else {
      if (!favoriteDoctorIds.contains(id)) {
        favoriteDoctorIds.add(id);
      }
    }
    persistSession();
    return !exists;
  }

  static void registerUser(String phone, Map<String, dynamic> userData) {
    registeredPhones.add(phone);
    registeredUsers[phone] = userData;

    final first = _readString(userData['firstName']);
    final last = _readString(userData['lastName']);
    final directEmail = _readString(userData['email']);
    final directEmergencyContact = _readString(userData['emergencyContact']);
    final directAge = _readString(userData['age']);
    final directGender = _readString(userData['gender']);
    final directBloodGroup = _readString(userData['bloodGroup']);
    final directPatientId = _readString(userData['patientId']);
    final directConditions = _readStringList(userData['chronicConditions']);
    final directFavorites = _readStringList(userData['favoriteDoctorIds']);

    if (first.isNotEmpty) {
      firstName = first;
    }
    if (last.isNotEmpty) {
      lastName = last;
    }
    if (directEmail.isNotEmpty) {
      email = directEmail;
    }
    if (directEmergencyContact.isNotEmpty) {
      emergencyContact = directEmergencyContact;
    }
    if (directAge.isNotEmpty) {
      age = directAge;
    }
    if (directGender.isNotEmpty) {
      gender = directGender;
    }
    if (directBloodGroup.isNotEmpty) {
      bloodGroup = directBloodGroup;
    }
    if (directPatientId.isNotEmpty) {
      patientId = directPatientId;
    }
    if (directConditions.isNotEmpty) {
      chronicConditions = directConditions;
    }
    if (directFavorites.isNotEmpty) {
      favoriteDoctorIds = directFavorites.toSet().toList();
    }
  }

  static bool get isLoggedIn => accessToken != null && accessToken!.isNotEmpty;

  static String get fullName {
    final direct = '$firstName $lastName'.trim();
    if (direct.isNotEmpty) {
      return direct;
    }
    final userData = registeredUsers[phoneNumber];
    final fallbackFirst = _readString(userData?['firstName']);
    final fallbackLast = _readString(userData?['lastName']);
    final fallback = '$fallbackFirst $fallbackLast'.trim();
    if (fallback.isNotEmpty) {
      return fallback;
    }
    return 'User';
  }

  static String get profileInitial {
    final name = fullName.trim();
    if (name.isEmpty || name.toLowerCase() == 'user') {
      return 'U';
    }
    return name[0].toUpperCase();
  }

  static String get ageLabel {
    final storedAge = age?.trim() ?? '';
    if (storedAge.isNotEmpty) {
      return storedAge;
    }
    final userData = registeredUsers[phoneNumber];
    return _readString(userData?['age']);
  }

  static String get genderLabel {
    final storedGender = gender.trim();
    if (storedGender.isNotEmpty) {
      return storedGender;
    }
    final userData = registeredUsers[phoneNumber];
    return _readString(userData?['gender']);
  }

  static String get bloodGroupLabel {
    final storedBloodGroup = bloodGroup.trim();
    if (storedBloodGroup.isNotEmpty) {
      return storedBloodGroup;
    }
    final userData = registeredUsers[phoneNumber];
    return _readString(userData?['bloodGroup']);
  }

  static List<String> get chronicConditionsLabel {
    if (chronicConditions.isNotEmpty) {
      return List<String>.from(chronicConditions);
    }
    final userData = registeredUsers[phoneNumber];
    final values = userData?['chronicConditions'];
    if (values is List) {
      return values.whereType<String>().where((value) => value.trim().isNotEmpty).toList();
    }
    return <String>[];
  }

  static String _readString(dynamic value) {
    if (value is String) {
      return value.trim();
    }
    return '';
  }

  static List<String> _readStringList(dynamic value) {
    if (value is List) {
      return value.whereType<String>().map((item) => item.trim()).where((item) => item.isNotEmpty).toList();
    }
    return <String>[];
  }

  static void clearAuthAttempt() {
    verificationToken = null;
    devOtp = null;
    currentAuthFlow = AuthFlow.signup;
  }

  static Future<bool> restoreSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString(_keyAccessToken);
      if (token != null && token.trim().isNotEmpty) {
        accessToken = token.trim();
        patientId = prefs.getString(_keyPatientId);
        phoneNumber = prefs.getString(_keyPhoneNumber) ?? '+910000000000';
        firstName = prefs.getString(_keyFirstName) ?? '';
        lastName = prefs.getString(_keyLastName) ?? '';
        email = prefs.getString(_keyEmail) ?? '';
        emergencyContact = prefs.getString(_keyEmergencyContact) ?? '';
        age = prefs.getString(_keyAge);
        gender = prefs.getString(_keyGender) ?? '';
        bloodGroup = prefs.getString(_keyBloodGroup) ?? '';
        chronicConditions =
            prefs.getStringList(_keyChronicConditions) ?? <String>[];
        favoriteDoctorIds =
            prefs.getStringList(_keyFavoriteDoctorIds) ?? <String>[];
        return true;
      }
    } catch (_) {}
    return false;
  }

  static Future<void> persistSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (accessToken != null && accessToken!.isNotEmpty) {
        await prefs.setString(_keyAccessToken, accessToken!);
      }
      if (patientId != null && patientId!.isNotEmpty) {
        await prefs.setString(_keyPatientId, patientId!);
      }
      await prefs.setString(_keyPhoneNumber, phoneNumber);
      await prefs.setString(_keyFirstName, firstName);
      await prefs.setString(_keyLastName, lastName);
      await prefs.setString(_keyEmail, email);
      await prefs.setString(_keyEmergencyContact, emergencyContact);
      if (age != null && age!.isNotEmpty) {
        await prefs.setString(_keyAge, age!);
      } else {
        await prefs.remove(_keyAge);
      }
      await prefs.setString(_keyGender, gender);
      await prefs.setString(_keyBloodGroup, bloodGroup);
      await prefs.setStringList(_keyChronicConditions, chronicConditions);
      await prefs.setStringList(_keyFavoriteDoctorIds, favoriteDoctorIds);
    } catch (_) {}
  }

  static Future<void> logout() async {
    accessToken = null;
    phoneNumber = '+910000000000';
    firstName = '';
    lastName = '';
    email = '';
    emergencyContact = '';
    age = null;
    gender = '';
    bloodGroup = '';
    chronicConditions = <String>[];
    favoriteDoctorIds = <String>[];
    patientId = null;
    clearAuthAttempt();

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_keyAccessToken);
      await prefs.remove(_keyPatientId);
      await prefs.remove(_keyPhoneNumber);
      await prefs.remove(_keyFirstName);
      await prefs.remove(_keyLastName);
      await prefs.remove(_keyEmail);
      await prefs.remove(_keyEmergencyContact);
      await prefs.remove(_keyAge);
      await prefs.remove(_keyGender);
      await prefs.remove(_keyBloodGroup);
      await prefs.remove(_keyChronicConditions);
      await prefs.remove(_keyFavoriteDoctorIds);
    } catch (_) {}
  }
}
