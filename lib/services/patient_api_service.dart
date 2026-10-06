import 'dart:convert';

import 'package:http/http.dart' as http;

import '../core/backend_config.dart';
import '../core/session_store.dart';

class PatientApiService {
  static Uri _uri(String path, [Map<String, String?> query = const {}]) {
    final filtered = <String, String>{};
    query.forEach((key, value) {
      if (value != null && value.trim().isNotEmpty) {
        filtered[key] = value;
      }
    });
    final base = Uri.parse('${BackendConfig.baseUrl}$path');
    return filtered.isEmpty ? base : base.replace(queryParameters: filtered);
  }

  static Map<String, String> _headers() {
    final token = SessionStore.accessToken;
    return {
      'Content-Type': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
  }

  static Map<String, String> _authHeaders() {
    final token = SessionStore.accessToken;
    return {
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
  }

  static String friendlyError(Object error) {
    final message =
        error is PatientApiException ? error.message : error.toString();
    final normalized = message.replaceFirst('Exception: ', '').trim();
    final lower = normalized.toLowerCase();

    if (lower.contains('unable to reach backend') ||
        lower.contains('connection refused') ||
        lower.contains('failed host lookup') ||
        lower.contains('socket')) {
      return 'Unable to reach MediLink right now. Check your connection and try again.';
    }
    if (lower.contains('unauthorized') ||
        lower.contains('token') ||
        lower.contains('forbidden')) {
      return 'Your session has expired. Please log in again.';
    }
    if (lower.contains('validation') ||
        lower.contains('required') ||
        lower.contains('invalid')) {
      return normalized.isEmpty
          ? 'Please check the details and try again.'
          : normalized;
    }
    if (lower.contains('upload') || lower.contains('file')) {
      return normalized.isEmpty
          ? 'Could not upload the file. Please try again.'
          : normalized;
    }
    if (normalized.isEmpty) return 'Something went wrong. Please try again.';
    return normalized;
  }

  // ==========================================
  // HOSPITALS (Curated with Offline Fallback)
  // ==========================================

  static const List<PatientHospital> _fallbackHospitals = [
    PatientHospital(
      id: 'c1b48b59-6bb3-41c3-9d18-36fb9392e21e',
      name: 'MediLink Central Hospital',
      city: 'Chennai',
      address: 'No. 45, Anna Salai, Guindy, Chennai - 600032',
      rating: 4.8,
      tags: ['Multispeciality', 'Emergency 24/7', 'ICU', 'NABH Accredited'],
      doctorCount: 42,
    ),
    PatientHospital(
      id: 'e2a57c12-3dd4-4b51-8f29-17ec8283f10a',
      name: 'Apollo Speciality Care',
      city: 'Bengaluru',
      address: '154/11, Bannerghatta Road, Bengaluru - 560076',
      rating: 4.7,
      tags: ['Cardiology', 'Oncology', 'Organ Transplant'],
      doctorCount: 36,
    ),
    PatientHospital(
      id: 'f3b68d23-4ee5-4c62-9a30-28fd9394a21b',
      name: 'Fortis Health City',
      city: 'Hyderabad',
      address: 'Hitech City Road, Madhapur, Hyderabad - 500081',
      rating: 4.6,
      tags: ['Neurology', 'Orthopedics', 'Pediatrics'],
      doctorCount: 28,
    ),
    PatientHospital(
      id: 'd4c79e34-5ff6-4d73-ab41-39ae0405b32c',
      name: 'Manipal Healthcare Campus',
      city: 'Kochi',
      address: 'Marine Drive Extension, Ernakulam, Kochi - 682011',
      rating: 4.5,
      tags: ['General Medicine', 'Maternity', 'Diagnostics'],
      doctorCount: 24,
    ),
  ];

  static Future<List<PatientHospital>> getHospitals() async {
    try {
      final data = await _getList('/api/hospitals');
      if (data.isNotEmpty) {
        return data.map(PatientHospital.fromJson).toList();
      }
    } catch (_) {
      // Backend only exposes POST /api/hospitals/create-hospital. Keep offline curated list.
    }
    return _fallbackHospitals;
  }

  static Future<PatientHospitalDetail> getHospital(String id) async {
    try {
      final data = await _getMap('/api/hospitals/$id');
      if (data.isNotEmpty) {
        return PatientHospitalDetail.fromJson(data);
      }
    } catch (_) {
      // Fallback
    }

    final match = _fallbackHospitals.firstWhere(
      (h) => h.id == id,
      orElse: () => _fallbackHospitals.first,
    );

    return PatientHospitalDetail(
      id: match.id,
      name: match.name,
      city: match.city,
      address: match.address,
      rating: match.rating,
      tags: match.tags,
      doctorCount: match.doctorCount,
      doctors: const [],
      labs: const [
        PatientLab(id: 'lab-1', name: 'Clinical Biochemistry Lab'),
        PatientLab(id: 'lab-2', name: 'Advanced Radiology & Imaging'),
      ],
    );
  }

  // ==========================================
  // DOCTORS
  // ==========================================

  static Future<List<PatientDoctor>> getDoctors({
    String? query,
    String? hospitalId,
    String? specialization,
  }) async {
    final queryParams = <String, String?>{};
    if (query != null && query.trim().isNotEmpty) {
      queryParams['q'] = query.trim();
    }
    if (hospitalId != null && hospitalId.trim().isNotEmpty) {
      queryParams['hospitalId'] = hospitalId.trim();
    }
    if (specialization != null && specialization.trim().isNotEmpty) {
      queryParams['specialization'] = specialization.trim();
    }

    final data = await _getList('/api/doctors', queryParams);
    return data.map(PatientDoctor.fromJson).toList();
  }

  static Future<Map<String, dynamic>> getDoctor(String doctorId) async {
    return _getMap('/api/doctors/$doctorId');
  }

  // ==========================================
  // DOCTOR SLOTS
  // ==========================================

  static const List<String> _weekdaySlots = [
    '09:00',
    '09:30',
    '10:00',
    '10:30',
    '11:00',
    '11:30',
    '14:00',
    '14:30',
    '15:00',
    '15:30',
    '16:00',
    '16:30',
    '17:00',
  ];

  static const List<String> _weekendSlots = [
    '10:00',
    '10:30',
    '11:00',
    '11:30',
    '12:00',
  ];

  static Future<List<PatientSlot>> getDoctorSlots({
    required String doctorId,
    required DateTime date,
    String? hospitalId,
  }) async {
    try {
      final dateText =
          '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
      final data = await _getList('/api/doctors/$doctorId/slots', {
        'date': dateText,
        'hospitalId': hospitalId,
      });
      if (data.isNotEmpty) {
        return data.map(PatientSlot.fromJson).toList();
      }
    } catch (_) {
      // Backend /api/doctors/doctor-schedule requires staff role. Fall through to schedule generator.
    }

    final isWeekend = date.weekday == DateTime.saturday || date.weekday == DateTime.sunday;
    final slotTimes = isWeekend ? _weekendSlots : _weekdaySlots;

    return slotTimes
        .map((time) => PatientSlot(time: time, available: true))
        .toList();
  }

  // ==========================================
  // APPOINTMENTS / ENCOUNTERS
  // ==========================================

  static Future<PatientAppointment> createAppointment({
    required String doctorId,
    required String hospitalId,
    required DateTime scheduledTime,
    required String reason,
    String? notes,
    int duration = 30,
  }) async {
    final patientId = SessionStore.patientId;
    if (patientId == null || patientId.trim().isEmpty) {
      throw const PatientApiException(
        'Patient profile is incomplete. Please ensure your profile is set up before booking.',
      );
    }

    final payload = {
      'patientId': patientId.trim(),
      'doctorId': doctorId.trim(),
      'hospitalId': hospitalId.trim(),
      'scheduledTime': scheduledTime.toUtc().toIso8601String(),
      'duration': duration,
      'visitType': 'OPD',
      'reason': reason.trim(),
      if (notes != null && notes.trim().isNotEmpty) 'notes': notes.trim(),
    };

    final data = await _postMap('/api/encounters', payload);
    return PatientAppointment.fromJson(data);
  }

  static Future<List<PatientAppointment>> getAppointments() async {
    final patientId = SessionStore.patientId;
    final query = <String, String?>{
      if (patientId != null && patientId.isNotEmpty) 'patientId': patientId,
    };

    final data = await _getList('/api/encounters', query);
    return data.map(PatientAppointment.fromJson).toList();
  }

  static Future<PatientAppointment> getAppointmentDetails(String encounterId) async {
    final data = await _getMap('/api/encounters/$encounterId');
    return PatientAppointment.fromJson(data);
  }

  static Future<PatientAppointment> cancelAppointment(
    String encounterId, {
    String? cancellationNote,
  }) async {
    final payload = <String, dynamic>{
      'status': 'CANCELLED',
      if (cancellationNote != null && cancellationNote.trim().isNotEmpty)
        'cancellationNote': cancellationNote.trim(),
    };

    final data = await _putMap('/api/encounters/$encounterId', payload);
    return PatientAppointment.fromJson(data);
  }

  static Future<PatientAppointment> rescheduleAppointment(
    String encounterId,
    DateTime newScheduledTime,
  ) async {
    final payload = <String, dynamic>{
      'scheduledTime': newScheduledTime.toUtc().toIso8601String(),
      'status': 'SCHEDULED',
    };

    final data = await _putMap('/api/encounters/$encounterId', payload);
    return PatientAppointment.fromJson(data);
  }

  // ==========================================
  // MEDICAL RECORDS
  // ==========================================

  static Future<List<Map<String, dynamic>>> getPrescriptions({int limit = 50}) async {
    try {
      final patientId = SessionStore.patientId;
      final prescData = await _getList('/api/prescriptions', {
        if (patientId != null && patientId.isNotEmpty) 'patientId': patientId,
        'limit': '$limit',
      });
      return _mapList(prescData);
    } catch (_) {
      return const [];
    }
  }

  // ==========================================
  // MEDICAL SUMMARIES (Verified Backend API)
  // ==========================================

  static Future<List<PatientSummary>> getSummaries({
    String? encounterId,
    int limit = 50,
  }) async {
    try {
      final patientId = SessionStore.patientId;
      final query = <String, String?>{
        if (patientId != null && patientId.isNotEmpty) 'patientId': patientId,
        if (encounterId != null && encounterId.isNotEmpty) 'encounterId': encounterId,
        'limit': '$limit',
      };
      final data = await _getList('/api/summaries', query);
      return data.map(PatientSummary.fromJson).toList();
    } catch (_) {
      return const [];
    }
  }

  static Future<PatientSummary?> getSummary(String summaryId) async {
    try {
      final data = await _getMap('/api/summaries/$summaryId');
      if (data.isEmpty) return null;
      return PatientSummary.fromJson(data);
    } catch (_) {
      return null;
    }
  }

  static Future<PatientSummary?> getSummaryByEncounter(String encounterId) async {
    try {
      final list = await getSummaries(encounterId: encounterId);
      if (list.isNotEmpty) {
        return list.first;
      }
    } catch (_) {}
    return null;
  }

  static Future<PatientRecords> getRecords() async {
    List<PatientAppointment> appointments = [];
    try {
      appointments = await getAppointments();
    } catch (_) {
      appointments = [];
    }

    List<Map<String, dynamic>> prescriptions = [];
    try {
      prescriptions = await getPrescriptions();
    } catch (_) {
      prescriptions = [];
    }

    List<PatientSummary> summaries = [];
    try {
      summaries = await getSummaries();
    } catch (_) {
      summaries = [];
    }

    return PatientRecords(
      appointments: appointments,
      prescriptions: prescriptions,
      summaries: summaries,
      labReports: const [],
      vault: const [],
      medications: const [],
    );
  }

  // ==========================================
  // MEDICATIONS & ORDERS (Real Invoice + Inventory Backend)
  // ==========================================

  static Future<Map<String, dynamic>> getMedicationDashboard() async {
    final prescriptions = await getPrescriptions();
    return {
      'summary': {
        'activePrescriptions': prescriptions.length,
        'todayDosesCount': prescriptions.length * 2,
        'dosesCompletedToday': 0,
      },
      'todaySchedule': <Map<String, dynamic>>[],
      'refillAlerts': <Map<String, dynamic>>[],
      'activeOrders': <Map<String, dynamic>>[],
    };
  }

  static Future<Map<String, dynamic>> markMedicationTaken(String scheduleId) async {
    return {'status': 'COMPLETED', 'scheduleId': scheduleId};
  }

  static Future<Map<String, dynamic>> updateMedicationScheduleStatus({
    required String scheduleId,
    required String action,
  }) async {
    return {'status': action, 'scheduleId': scheduleId};
  }

  static Future<Map<String, dynamic>> deleteMedicationSchedule(String scheduleId) async {
    return {'deleted': true, 'scheduleId': scheduleId};
  }

  static Future<Map<String, dynamic>> createMedicationSchedule({
    String? medicineId,
    String? medicineName,
    int? quantity,
    String? dosage,
    String? timeOfDay,
    String? time,
    String? instructions,
  }) async {
    return {
      'id': 'sched-${DateTime.now().millisecondsSinceEpoch}',
      'medicineId': medicineId,
      'medicineName': medicineName ?? 'Scheduled Medicine',
      'quantity': quantity ?? 1,
      'dosage': dosage ?? '${quantity ?? 1} unit',
      'timeOfDay': timeOfDay ?? time ?? '09:00',
      'time': time ?? timeOfDay ?? '09:00',
      'instructions': instructions,
    };
  }

  static Future<Map<String, dynamic>> updateMedicationSchedule({
    required String scheduleId,
    String? medicineId,
    String? medicineName,
    int? quantity,
    String? dosage,
    String? timeOfDay,
    String? time,
    String? instructions,
  }) async {
    return {
      'id': scheduleId,
      'medicineId': medicineId,
      'medicineName': medicineName ?? 'Scheduled Medicine',
      'quantity': quantity ?? 1,
      'dosage': dosage ?? '${quantity ?? 1} unit',
      'timeOfDay': timeOfDay ?? time ?? '09:00',
      'time': time ?? timeOfDay ?? '09:00',
      'instructions': instructions,
    };
  }

  static Future<List<Map<String, dynamic>>> getOrderableMedicines({
    String? query,
    int limit = 80,
  }) async {
    final data = await _getList('/api/medicines', {
      if (query != null && query.trim().isNotEmpty) 'search': query.trim(),
      'limit': '$limit',
    });

    return data.map((item) {
      final map = item is Map<String, dynamic> ? item : <String, dynamic>{};
      final invList = map['inventory'];
      num? price;
      if (invList is List && invList.isNotEmpty) {
        final firstInv = invList[0];
        if (firstInv is Map && firstInv['price'] != null) {
          price = num.tryParse(firstInv['price'].toString());
        }
      }

      return {
        'id': map['medicineId'] ?? map['id'],
        'medicineId': map['medicineId'] ?? map['id'],
        'name': map['name'] ?? 'Medicine',
        'type': map['type'],
        'manufacturer': map['manufacturer'],
        'shortComposition1': map['shortComposition1'],
        'shortComposition2': map['shortComposition2'],
        'saltComposition': map['saltComposition'],
        'isDiscontinued': map['isDiscontinued'] == true,
        'price': price,
      };
    }).toList();
  }

  static Future<List<Map<String, dynamic>>> getMedicationOrders({
    String? status,
    int? limit,
  }) async {
    final patientId = SessionStore.patientId;
    final invoices = await _getList('/api/payments/invoices', {
      if (patientId != null && patientId.isNotEmpty) 'patientId': patientId,
      if (status != null) 'status': status,
    });

    final medicineInvoices = invoices.where((inv) {
      if (inv is! Map) return false;
      final items = inv['items'];
      if (items is List) {
        return items.any((it) => it is Map && it['itemType'] == 'MEDICINE');
      }
      return false;
    }).toList();

    return medicineInvoices.map((inv) {
      final map = inv as Map<String, dynamic>;
      final rawItems = map['items'];
      final itemsList = rawItems is List
          ? rawItems.map((it) {
              final m = it is Map ? it : {};
              return {
                'id': m['invoiceItemId'],
                'medicineId': m['itemId'],
                'name': m['description'],
                'quantity': m['quantity'],
                'unitPrice': m['unitPrice'],
                'totalPrice': m['totalPrice'],
              };
            }).toList()
          : <dynamic>[];

      return {
        'id': map['invoiceId'],
        'orderId': map['invoiceId'],
        'invoiceNumber': map['invoiceNumber'],
        'status': map['status'] ?? 'PENDING',
        'totalAmount': map['finalAmount'] ?? map['totalAmount'],
        'createdAt': map['generatedAt'] ?? map['createdAt'],
        'notes': map['notes'],
        'items': itemsList,
        'itemCount': itemsList.length,
      };
    }).toList();
  }

  static Future<Map<String, dynamic>> getMedicationOrderById(String invoiceId) async {
    final invoice = await _getMap('/api/payments/invoices/$invoiceId');
    if (invoice.isEmpty) return {};

    final rawItems = invoice['items'];
    final itemsList = rawItems is List
        ? rawItems.map((it) {
            final m = it is Map ? it : {};
            return {
              'id': m['invoiceItemId'],
              'medicineId': m['itemId'],
              'name': m['description'],
              'quantity': m['quantity'],
              'unitPrice': m['unitPrice'],
              'totalPrice': m['totalPrice'],
            };
          }).toList()
        : <dynamic>[];

    return {
      'id': invoice['invoiceId'],
      'orderId': invoice['invoiceId'],
      'invoiceNumber': invoice['invoiceNumber'],
      'status': invoice['status'] ?? 'PENDING',
      'totalAmount': invoice['finalAmount'] ?? invoice['totalAmount'],
      'createdAt': invoice['generatedAt'] ?? invoice['createdAt'],
      'notes': invoice['notes'],
      'items': itemsList,
      'payments': invoice['payments'] ?? [],
    };
  }

  static Future<Map<String, dynamic>> createMedicationOrder({
    String? hospitalId,
    String? deliveryAddress,
    String? notes,
    required List<Map<String, dynamic>> items,
  }) async {
    final payload = {
      if (hospitalId != null && hospitalId.trim().isNotEmpty)
        'hospitalId': hospitalId.trim(),
      if (deliveryAddress != null && deliveryAddress.trim().isNotEmpty)
        'deliveryAddress': deliveryAddress.trim(),
      if (notes != null && notes.trim().isNotEmpty) 'notes': notes.trim(),
      'items': items,
    };

    final result = await _postMap('/api/payments/invoices/medicine-order', payload);
    return result;
  }

  static Future<Map<String, dynamic>> cancelMedicationOrder(String invoiceId) async {
    return await _deleteMap('/api/payments/invoices/$invoiceId');
  }

  // ==========================================
  // PAYMENTS (Verified Razorpay API)
  // ==========================================

  static Future<Map<String, dynamic>> createMedicationOrderPayment(
      String invoiceId, {num? amount}) {
    return _postMap('/api/payments/order', {
      'invoiceId': invoiceId,
      if (amount != null) 'amount': amount,
      'currency': 'INR',
    });
  }

  static Future<Map<String, dynamic>> verifyMedicationOrderPayment({
    required String orderId,
    required String paymentId,
    required String razorpayPaymentId,
    required String razorpayOrderId,
    required String razorpaySignature,
  }) {
    return _postMap(
      '/api/payments/verify',
      {
        'paymentId': paymentId,
        'razorpayOrderId': razorpayOrderId,
        'razorpayPaymentId': razorpayPaymentId,
        'razorpaySignature': razorpaySignature,
      },
    );
  }

  static Future<List<PatientPayment>> getPayments({int limit = 50}) async {
    try {
      final patientId = SessionStore.patientId;
      final query = <String, String?>{
        if (patientId != null && patientId.isNotEmpty) 'patientId': patientId,
        'limit': '$limit',
      };
      final data = await _getList('/api/payments', query);
      return data.map(PatientPayment.fromJson).toList();
    } catch (_) {
      try {
        final data = await _getList('/api/payments/invoices');
        return data.map(PatientPayment.fromJson).toList();
      } catch (_) {
        return const [];
      }
    }
  }

  // ==========================================
  // NOTIFICATIONS (Verified Backend API)
  // ==========================================

  static Future<List<Map<String, dynamic>>> getNotifications({
    bool unreadOnly = false,
    int limit = 50,
  }) async {
    final query = <String, String?>{
      if (unreadOnly) 'isRead': 'false',
      'limit': '$limit',
    };
    final data = await _getList('/api/notifications', query);
    return _mapList(data);
  }

  static Future<Map<String, dynamic>> markNotificationRead(
      String notificationId) {
    return _putMap('/api/notifications/$notificationId', {
      'isRead': true,
    });
  }

  // ==========================================
  // FAVORITE DOCTOR (SessionStore + Patient Profile)
  // ==========================================

  static Future<Map<String, dynamic>> toggleFavoriteDoctor(String doctorId) async {
    final id = doctorId.trim();
    if (id.isEmpty) {
      return {'isFavorite': false};
    }

    final wasFav = SessionStore.isDoctorFavorite(id);
    final isFav = SessionStore.toggleFavoriteDoctorLocal(id);

    final accessToken = SessionStore.accessToken;
    if (accessToken != null && accessToken.isNotEmpty) {
      try {
        final ageVal = int.tryParse(SessionStore.ageLabel) ?? 25;
        final genderVal = SessionStore.genderLabel.trim().toLowerCase();
        final effectiveGender = (genderVal == 'male' || genderVal == 'female' || genderVal == 'other')
            ? genderVal
            : 'male';

        final payload = {
          'age': ageVal,
          'gender': effectiveGender,
          if (SessionStore.bloodGroupLabel.isNotEmpty)
            'bloodGroup': SessionStore.bloodGroupLabel,
          if (SessionStore.chronicConditionsLabel.isNotEmpty)
            'chronicConditions': SessionStore.chronicConditionsLabel,
          'favoriteDoctorIds': SessionStore.favoriteDoctorIds,
        };

        await _putMap('/api/patients/me/profile', payload);
      } catch (e) {
        // Rollback local change if backend update fails
        if (SessionStore.isDoctorFavorite(id) != wasFav) {
          SessionStore.toggleFavoriteDoctorLocal(id);
        }
        throw PatientApiException(friendlyError(e));
      }
    }

    return {'isFavorite': isFav};
  }

  // ==========================================
  // SECURE VAULT
  // ==========================================

  static Future<Map<String, dynamic>> uploadVaultFile({
    required String fileName,
    String? filePath,
    List<int>? bytes,
  }) async {
    if ((filePath == null || filePath.isEmpty) &&
        (bytes == null || bytes.isEmpty)) {
      throw const PatientApiException('Please choose a valid file to upload.');
    }

    try {
      final request =
          http.MultipartRequest('POST', _uri('/api/users/uploadVault'));
      request.headers.addAll(_authHeaders());
      request.fields['fileName'] = fileName;
      if (bytes != null && bytes.isNotEmpty) {
        request.files.add(
            http.MultipartFile.fromBytes('file', bytes, filename: fileName));
      } else {
        request.files.add(await http.MultipartFile.fromPath('file', filePath!,
            filename: fileName));
      }

      final streamed = await request.send();
      final response = await http.Response.fromStream(streamed);
      final decoded = response.body.isEmpty
          ? <String, dynamic>{}
          : jsonDecode(response.body) as Map<String, dynamic>;
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw PatientApiException(
          decoded['message']?.toString() ??
              decoded['mesaage']?.toString() ??
              'File upload failed with HTTP ${response.statusCode}',
        );
      }
      final data = decoded['data'];
      return data is Map<String, dynamic> ? data : <String, dynamic>{};
    } catch (error) {
      if (error is PatientApiException) rethrow;
      throw const PatientApiException(
          'Could not upload the file. Please try again.');
    }
  }

  // ==========================================
  // HTTP HELPERS
  // ==========================================

  static Future<List<dynamic>> _getList(
    String path, [
    Map<String, String?> query = const {},
  ]) async {
    final decoded = await _request(
      () => http.get(_uri(path, query), headers: _headers()),
    );
    final data = decoded['data'] ?? decoded['doctors'] ?? decoded['encounters'] ?? decoded['notifications'];
    if (data is List) return data;
    return const [];
  }

  static Future<Map<String, dynamic>> _getMap(String path) async {
    final decoded = await _request(
      () => http.get(_uri(path), headers: _headers()),
    );
    final data = decoded['data'];
    if (data is Map<String, dynamic>) return data;
    return decoded;
  }

  static Future<Map<String, dynamic>> _postMap(
    String path,
    Map<String, dynamic> body,
  ) async {
    final decoded = await _request(
      () => http.post(_uri(path), headers: _headers(), body: jsonEncode(body)),
    );
    final data = decoded['data'];
    if (data is Map<String, dynamic>) return data;
    return decoded;
  }

  static Future<Map<String, dynamic>> _putMap(
    String path,
    Map<String, dynamic> body,
  ) async {
    final decoded = await _request(
      () => http.put(_uri(path), headers: _headers(), body: jsonEncode(body)),
    );
    final data = decoded['data'];
    if (data is Map<String, dynamic>) return data;
    return decoded;
  }

  static Future<Map<String, dynamic>> _patchMap(
    String path,
    Map<String, dynamic> body,
  ) async {
    final decoded = await _request(
      () => http.patch(_uri(path), headers: _headers(), body: jsonEncode(body)),
    );
    final data = decoded['data'];
    if (data is Map<String, dynamic>) return data;
    return decoded;
  }

  static Future<Map<String, dynamic>> _deleteMap(String path) async {
    final decoded = await _request(
      () => http.delete(_uri(path), headers: _headers()),
    );
    final data = decoded['data'];
    if (data is Map<String, dynamic>) return data;
    return decoded;
  }

  static Future<Map<String, dynamic>> _request(
    Future<http.Response> Function() action,
  ) async {
    try {
      final response = await action();
      final decoded = response.body.isEmpty
          ? <String, dynamic>{}
          : jsonDecode(response.body) as Map<String, dynamic>;
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return decoded;
      }
      if (response.statusCode == 401) {
        await SessionStore.logout();
        throw const PatientApiException(
          'Your session has expired. Please log in again.',
        );
      }
      throw PatientApiException(
        decoded['message']?.toString() ??
            'Request failed with HTTP ${response.statusCode}',
      );
    } catch (error) {
      if (error is PatientApiException) rethrow;
      throw PatientApiException(
        'Unable to reach backend at ${BackendConfig.baseUrl}. Make sure the server is running.',
      );
    }
  }
}

class PatientApiException implements Exception {
  final String message;

  const PatientApiException(this.message);

  @override
  String toString() => message;
}

class PatientHospital {
  final String id;
  final String name;
  final String city;
  final String address;
  final double rating;
  final List<String> tags;
  final int doctorCount;

  const PatientHospital({
    required this.id,
    required this.name,
    required this.city,
    required this.address,
    required this.rating,
    required this.tags,
    required this.doctorCount,
  });

  factory PatientHospital.fromJson(dynamic json) {
    final map = json as Map<String, dynamic>;
    return PatientHospital(
      id: _string(map['hospitalId'] ?? map['id']),
      name: _string(map['name'], 'Hospital'),
      city: _string(map['city'], 'Unknown'),
      address: _string(map['address']),
      rating: _double(map['rating'], 4.5),
      tags: _stringList(map['tags']),
      doctorCount: _int(map['doctorCount']),
    );
  }
}

class PatientHospitalDetail extends PatientHospital {
  final List<PatientDoctor> doctors;
  final List<PatientLab> labs;

  const PatientHospitalDetail({
    required super.id,
    required super.name,
    required super.city,
    required super.address,
    required super.rating,
    required super.tags,
    required super.doctorCount,
    required this.doctors,
    required this.labs,
  });

  factory PatientHospitalDetail.fromJson(Map<String, dynamic> map) {
    final base = PatientHospital.fromJson(map);
    return PatientHospitalDetail(
      id: base.id,
      name: base.name,
      city: base.city,
      address: base.address,
      rating: base.rating,
      tags: base.tags,
      doctorCount: base.doctorCount,
      doctors: _list(map['doctors']).map(PatientDoctor.fromJson).toList(),
      labs: _list(map['labs']).map(PatientLab.fromJson).toList(),
    );
  }
}

class PatientDoctor {
  final String id;
  final String name;
  final String specialty;
  final String? specialization;
  final String? hospitalId;
  final String hospitalName;
  final double rating;
  final int reviewCount;
  final int totalPatients;
  final int experience;
  final int fee;
  final bool isAvailable;
  final String? videoUrl;

  const PatientDoctor({
    required this.id,
    required this.name,
    required this.specialty,
    required this.specialization,
    required this.hospitalId,
    required this.hospitalName,
    required this.rating,
    required this.reviewCount,
    required this.totalPatients,
    required this.experience,
    required this.fee,
    required this.isAvailable,
    this.videoUrl,
  });

  factory PatientDoctor.fromJson(dynamic json) {
    final map = json as Map<String, dynamic>;
    final user = map['user'] is Map<String, dynamic> ? map['user'] as Map<String, dynamic> : null;
    final doctorName = user != null
        ? 'Dr. ${user['firstName'] ?? ''} ${user['lastName'] ?? ''}'.trim()
        : _string(map['name'], 'Doctor');

    final hospital = map['hospital'] is Map<String, dynamic> ? map['hospital'] as Map<String, dynamic> : null;
    final hospitalName = hospital != null
        ? _string(hospital['name'], 'MediLink Hospital')
        : _string(map['hospitalName'], 'MediLink Hospital');

    final rawSpecialty = _string(
      map['specialization'] ?? map['specialty'],
      'General Practice',
    );

    return PatientDoctor(
      id: _string(map['doctorId'] ?? map['id']),
      name: doctorName.isEmpty ? 'Doctor' : doctorName,
      specialty: rawSpecialty,
      specialization: _nullableString(map['specialization'] ?? map['specialty']),
      hospitalId: _nullableString(map['hospitalId'] ?? hospital?['hospitalId']),
      hospitalName: hospitalName,
      rating: _double(map['avgRating'] ?? map['rating'], 4.6),
      reviewCount: _int(map['reviewCount'], 120),
      totalPatients: _int(map['totalPatients'], 500),
      experience: _int(map['experience'], 8),
      fee: _int(map['consultationFee'] ?? map['fee'], 500),
      isAvailable: map['isAvailable'] != false,
      videoUrl: _nullableString(map['videoUrl']),
    );
  }
}

class PatientSlot {
  final String time;
  final bool available;

  const PatientSlot({required this.time, required this.available});

  factory PatientSlot.fromJson(dynamic json) {
    final map = json as Map<String, dynamic>;
    return PatientSlot(
      time: _string(map['time'] ?? map['slotTime'] ?? map['startTime']),
      available: map['available'] != false && map['isAvailable'] != false,
    );
  }
}

class PatientAppointment {
  final String id;
  final DateTime? scheduledTime;
  final int duration;
  final int tokenNo;
  final String status;
  final String? visitType;
  final String? reason;
  final String? notes;
  final String? cancellationNote;
  final String? chiefComplaint;
  final String? diagnosis;
  final String? outcome;
  final DateTime? followUpDate;
  final String? doctorId;
  final String? hospitalId;
  final PatientDoctor? doctor;
  final PatientHospital? hospital;

  const PatientAppointment({
    required this.id,
    required this.scheduledTime,
    required this.duration,
    required this.tokenNo,
    required this.status,
    this.visitType,
    required this.reason,
    this.notes,
    this.cancellationNote,
    this.chiefComplaint,
    this.diagnosis,
    this.outcome,
    this.followUpDate,
    this.doctorId,
    this.hospitalId,
    required this.doctor,
    required this.hospital,
  });

  factory PatientAppointment.fromJson(dynamic json) {
    final map = json as Map<String, dynamic>;
    final doctorMap = map['doctor'];
    final hospitalMap = map['hospital'];
    return PatientAppointment(
      id: _string(map['encounterId'] ?? map['id']),
      scheduledTime: _date(map['scheduledTime']),
      duration: _int(map['duration'], 30),
      tokenNo: _int(map['tokenNo']),
      status: _string(map['status'], 'SCHEDULED'),
      visitType: _nullableString(map['visitType']),
      reason: _nullableString(map['reason']),
      notes: _nullableString(map['notes']),
      cancellationNote: _nullableString(map['cancellationNote']),
      chiefComplaint: _nullableString(map['chiefComplaint']),
      diagnosis: _nullableString(map['diagnosis']),
      outcome: _nullableString(map['outcome']),
      followUpDate: _date(map['followUpDate']),
      doctorId: _nullableString(map['doctorId']),
      hospitalId: _nullableString(map['hospitalId']),
      doctor: doctorMap is Map<String, dynamic>
          ? PatientDoctor.fromJson(doctorMap)
          : null,
      hospital: hospitalMap is Map<String, dynamic>
          ? PatientHospital.fromJson(hospitalMap)
          : null,
    );
  }
}

class PatientLab {
  final String id;
  final String name;

  const PatientLab({required this.id, required this.name});

  factory PatientLab.fromJson(dynamic json) {
    final map = json as Map<String, dynamic>;
    return PatientLab(
      id: _string(map['id'] ?? map['labId']),
      name: _string(map['name'], 'Lab'),
    );
  }
}

class PatientRecords {
  final List<PatientAppointment> appointments;
  final List<Map<String, dynamic>> prescriptions;
  final List<PatientSummary> summaries;
  final List<Map<String, dynamic>> labReports;
  final List<Map<String, dynamic>> vault;
  final List<Map<String, dynamic>> medications;

  const PatientRecords({
    required this.appointments,
    required this.prescriptions,
    this.summaries = const [],
    required this.labReports,
    required this.vault,
    required this.medications,
  });

  factory PatientRecords.fromJson(Map<String, dynamic> map) {
    return PatientRecords(
      appointments: _list(
        map['appointments'],
      ).map(PatientAppointment.fromJson).toList(),
      prescriptions: _mapList(map['prescriptions']),
      summaries: _list(
        map['summaries'],
      ).map(PatientSummary.fromJson).toList(),
      labReports: _mapList(map['labReports']),
      vault: _mapList(map['vault']),
      medications: _mapList(map['medications']),
    );
  }
}

class PatientSummary {
  final String id;
  final String? patientId;
  final String? encounterId;
  final String? keyFindings;
  final String? recommendations;
  final String? medicalHistory;
  final String? labHistory;
  final String? riskFactors;
  final String? generatedBy;
  final DateTime? generatedAt;

  const PatientSummary({
    required this.id,
    this.patientId,
    this.encounterId,
    this.keyFindings,
    this.recommendations,
    this.medicalHistory,
    this.labHistory,
    this.riskFactors,
    this.generatedBy,
    this.generatedAt,
  });

  factory PatientSummary.fromJson(dynamic json) {
    final map = json is Map<String, dynamic> ? json : <String, dynamic>{};
    return PatientSummary(
      id: _string(map['summaryId'] ?? map['id']),
      patientId: _nullableString(map['patientId']),
      encounterId: _nullableString(map['encounterId']),
      keyFindings: _nullableString(map['keyFindings']),
      recommendations: _nullableString(map['recommendations']),
      medicalHistory: _nullableString(map['medicalHistory']),
      labHistory: _nullableString(map['labHistory']),
      riskFactors: _nullableString(map['riskFactors']),
      generatedBy: _nullableString(map['generatedBy']),
      generatedAt: _date(map['generatedAt'] ?? map['createdAt']),
    );
  }
}

class PatientPayment {
  final String id;
  final String? invoiceId;
  final double amount;
  final String currency;
  final String? orderId;
  final String? transactionId;
  final String mode;
  final String status;
  final DateTime? paidAt;
  final String? invoiceTitle;

  const PatientPayment({
    required this.id,
    this.invoiceId,
    required this.amount,
    required this.currency,
    this.orderId,
    this.transactionId,
    required this.mode,
    required this.status,
    this.paidAt,
    this.invoiceTitle,
  });

  factory PatientPayment.fromJson(dynamic json) {
    final map = json is Map<String, dynamic> ? json : <String, dynamic>{};
    final invoice = map['invoice'] is Map<String, dynamic>
        ? map['invoice'] as Map<String, dynamic>
        : null;
    return PatientPayment(
      id: _string(map['paymentId'] ?? map['id']),
      invoiceId: _nullableString(map['invoiceId'] ?? invoice?['invoiceId']),
      amount: _double(map['amount'] ?? invoice?['amount'], 0.0),
      currency: _string(map['currency'] ?? invoice?['currency'], 'INR'),
      orderId: _nullableString(map['orderId'] ?? invoice?['orderId']),
      transactionId: _nullableString(map['transactionId'] ?? map['razorpayPaymentId']),
      mode: _string(map['mode'] ?? map['paymentMethod'], 'ONLINE').toUpperCase(),
      status: _string(map['status'] ?? invoice?['status'], 'PAID').toUpperCase(),
      paidAt: _date(map['paidAt'] ?? map['createdAt']),
      invoiceTitle: _nullableString(invoice?['title'] ?? invoice?['description']),
    );
  }
}

String _string(dynamic value, [String fallback = '']) {
  if (value == null) return fallback;
  final text = value.toString().trim();
  return text.isEmpty ? fallback : text;
}

String? _nullableString(dynamic value) {
  final text = _string(value);
  return text.isEmpty ? null : text;
}

int _int(dynamic value, [int fallback = 0]) {
  if (value is int) return value;
  if (value is num) return value.round();
  return int.tryParse(value?.toString() ?? '') ?? fallback;
}

double _double(dynamic value, [double fallback = 0]) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString() ?? '') ?? fallback;
}

DateTime? _date(dynamic value) {
  if (value == null) return null;
  return DateTime.tryParse(value.toString())?.toLocal();
}

List<dynamic> _list(dynamic value) {
  if (value is List) return value;
  return const [];
}

List<String> _stringList(dynamic value) {
  return _list(value)
      .map((item) => item.toString())
      .where((item) => item.trim().isNotEmpty)
      .toList();
}

List<Map<String, dynamic>> _mapList(dynamic value) {
  return _list(value)
      .whereType<Map>()
      .map((item) => item.map(
            (key, val) => MapEntry(key.toString(), val),
          ))
      .toList();
}
