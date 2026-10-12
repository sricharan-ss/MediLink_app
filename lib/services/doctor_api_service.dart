import 'dart:convert';
import 'package:http/http.dart' as http;
import '../core/backend_config.dart';
import '../core/session_store.dart';

class DoctorApiException implements Exception {
  final String message;
  final int? statusCode;

  const DoctorApiException(this.message, [this.statusCode]);

  @override
  String toString() => message;
}

class MedicineCatalogItem {
  final String medicineId;
  final String name;
  final String? type;
  final String? manufacturer;
  final String? saltComposition;

  const MedicineCatalogItem({
    required this.medicineId,
    required this.name,
    this.type,
    this.manufacturer,
    this.saltComposition,
  });

  factory MedicineCatalogItem.fromJson(Map<String, dynamic> json) {
    return MedicineCatalogItem(
      medicineId: (json['medicineId'] ?? json['id'] ?? '').toString(),
      name: (json['name'] ?? 'Unknown Medicine').toString(),
      type: json['type']?.toString(),
      manufacturer: json['manufacturer']?.toString(),
      saltComposition: json['saltComposition']?.toString(),
    );
  }
}

class PrescriptionMedicineItem {
  final String? prescriptionMedicineId;
  final String medicineId;
  final String medicineName;
  final String dosage;
  final String frequency;
  final int durationDays;

  const PrescriptionMedicineItem({
    this.prescriptionMedicineId,
    required this.medicineId,
    required this.medicineName,
    required this.dosage,
    required this.frequency,
    required this.durationDays,
  });

  factory PrescriptionMedicineItem.fromJson(Map<String, dynamic> json) {
    final med = json['medicine'];
    final medName = med is Map<String, dynamic>
        ? (med['name'] ?? 'Medicine').toString()
        : 'Medicine';

    return PrescriptionMedicineItem(
      prescriptionMedicineId: json['prescriptionMedicineId']?.toString(),
      medicineId: (json['medicineId'] ?? '').toString(),
      medicineName: medName,
      dosage: (json['dosage'] ?? '').toString(),
      frequency: (json['frequency'] ?? '').toString(),
      durationDays: (json['durationDays'] is int)
          ? json['durationDays'] as int
          : int.tryParse(json['durationDays']?.toString() ?? '1') ?? 1,
    );
  }

  Map<String, dynamic> toJson() => {
        'medicineId': medicineId,
        'dosage': dosage,
        'frequency': frequency,
        'durationDays': durationDays,
      };
}

class DoctorPrescriptionRecord {
  final String prescriptionId;
  final String encounterId;
  final DateTime? nextVisit;
  final DateTime? generatedAt;
  final List<PrescriptionMedicineItem> medicines;

  const DoctorPrescriptionRecord({
    required this.prescriptionId,
    required this.encounterId,
    this.nextVisit,
    this.generatedAt,
    this.medicines = const [],
  });

  factory DoctorPrescriptionRecord.fromJson(Map<String, dynamic> json) {
    final medsList = json['medicines'];
    final meds = <PrescriptionMedicineItem>[];
    if (medsList is List) {
      for (final item in medsList) {
        if (item is Map<String, dynamic>) {
          meds.add(PrescriptionMedicineItem.fromJson(item));
        }
      }
    }

    return DoctorPrescriptionRecord(
      prescriptionId: (json['prescriptionId'] ?? '').toString(),
      encounterId: (json['encounterId'] ?? '').toString(),
      nextVisit: json['nextVisit'] != null
          ? DateTime.tryParse(json['nextVisit'].toString())?.toLocal()
          : null,
      generatedAt: json['generatedAt'] != null
          ? DateTime.tryParse(json['generatedAt'].toString())?.toLocal()
          : null,
      medicines: meds,
    );
  }
}

class DoctorAppointmentItem {
  final String encounterId;
  final DateTime? scheduledTime;
  final int duration;
  final int tokenNo;
  final String status;
  final String? visitType;
  final String? reason;
  final String? notes;
  final String? chiefComplaint;
  final String? diagnosis;
  final String? outcome;
  final DateTime? followUpDate;
  final DateTime? actualStartTime;
  final DateTime? actualEndTime;

  // Patient Fields
  final String patientId;
  final String patientName;
  final String? patientPhone;
  final String? patientEmail;
  final String? patientAge;
  final String? patientGender;
  final String? patientBloodGroup;
  final String? patientEmergencyContact;
  final List<String> chronicConditions;
  final List<String> allergies;

  // Hospital
  final String hospitalId;
  final String hospitalName;
  final String? hospitalAddress;

  // Prescriptions
  final List<DoctorPrescriptionRecord> prescriptions;

  const DoctorAppointmentItem({
    required this.encounterId,
    this.scheduledTime,
    required this.duration,
    required this.tokenNo,
    required this.status,
    this.visitType,
    this.reason,
    this.notes,
    this.chiefComplaint,
    this.diagnosis,
    this.outcome,
    this.followUpDate,
    this.actualStartTime,
    this.actualEndTime,
    required this.patientId,
    required this.patientName,
    this.patientPhone,
    this.patientEmail,
    this.patientAge,
    this.patientGender,
    this.patientBloodGroup,
    this.patientEmergencyContact,
    this.chronicConditions = const [],
    this.allergies = const [],
    required this.hospitalId,
    required this.hospitalName,
    this.hospitalAddress,
    this.prescriptions = const [],
  });

  factory DoctorAppointmentItem.fromJson(Map<String, dynamic> json) {
    final patientMap = json['patient'] is Map<String, dynamic>
        ? json['patient'] as Map<String, dynamic>
        : const <String, dynamic>{};
    final userMap = patientMap['user'] is Map<String, dynamic>
        ? patientMap['user'] as Map<String, dynamic>
        : const <String, dynamic>{};
    final hospitalMap = json['hospital'] is Map<String, dynamic>
        ? json['hospital'] as Map<String, dynamic>
        : const <String, dynamic>{};

    final firstName = (userMap['firstName'] ?? '').toString().trim();
    final lastName = (userMap['lastName'] ?? '').toString().trim();
    final patientName = '$firstName $lastName'.trim().isEmpty
        ? 'Patient'
        : '$firstName $lastName'.trim();

    final conditionsList = patientMap['chronicConditions'];
    final conditions = <String>[];
    if (conditionsList is List) {
      for (final item in conditionsList) {
        if (item != null && item.toString().trim().isNotEmpty) {
          conditions.add(item.toString().trim());
        }
      }
    }

    final allergiesList = patientMap['allergies'];
    final allergies = <String>[];
    if (allergiesList is List) {
      for (final item in allergiesList) {
        if (item != null && item.toString().trim().isNotEmpty) {
          allergies.add(item.toString().trim());
        }
      }
    }

    final rawAge = patientMap['age']?.toString();
    final rawDob = patientMap['dob']?.toString();
    String? resolvedAge = rawAge;
    if ((resolvedAge == null || resolvedAge.isEmpty) && rawDob != null) {
      final parsed = DateTime.tryParse(rawDob);
      if (parsed != null) {
        final now = DateTime.now();
        var calculated = now.year - parsed.year;
        if (now.month < parsed.month ||
            (now.month == parsed.month && now.day < parsed.day)) {
          calculated--;
        }
        resolvedAge = calculated.toString();
      }
    }

    final prescsList = json['prescriptions'];
    final prescs = <DoctorPrescriptionRecord>[];
    if (prescsList is List) {
      for (final item in prescsList) {
        if (item is Map<String, dynamic>) {
          prescs.add(DoctorPrescriptionRecord.fromJson(item));
        }
      }
    }

    return DoctorAppointmentItem(
      encounterId: (json['encounterId'] ?? json['id'] ?? '').toString(),
      scheduledTime: json['scheduledTime'] != null
          ? DateTime.tryParse(json['scheduledTime'].toString())?.toLocal()
          : null,
      duration: (json['duration'] is int)
          ? json['duration'] as int
          : int.tryParse(json['duration']?.toString() ?? '30') ?? 30,
      tokenNo: (json['tokenNo'] is int)
          ? json['tokenNo'] as int
          : int.tryParse(json['tokenNo']?.toString() ?? '0') ?? 0,
      status: (json['status'] ?? 'SCHEDULED').toString().toUpperCase(),
      visitType: json['visitType']?.toString(),
      reason: json['reason']?.toString(),
      notes: json['notes']?.toString(),
      chiefComplaint: json['chiefComplaint']?.toString(),
      diagnosis: json['diagnosis']?.toString(),
      outcome: json['outcome']?.toString(),
      followUpDate: json['followUpDate'] != null
          ? DateTime.tryParse(json['followUpDate'].toString())?.toLocal()
          : null,
      actualStartTime: json['actualStartTime'] != null
          ? DateTime.tryParse(json['actualStartTime'].toString())?.toLocal()
          : null,
      actualEndTime: json['actualEndTime'] != null
          ? DateTime.tryParse(json['actualEndTime'].toString())?.toLocal()
          : null,
      patientId:
          (json['patientId'] ?? patientMap['patientId'] ?? '').toString(),
      patientName: patientName,
      patientPhone: userMap['phoneNumber']?.toString(),
      patientEmail: userMap['email']?.toString(),
      patientAge: resolvedAge,
      patientGender: patientMap['gender']?.toString(),
      patientBloodGroup: patientMap['bloodGroup']?.toString(),
      patientEmergencyContact: patientMap['emergencyContact']?.toString(),
      chronicConditions: conditions,
      allergies: allergies,
      hospitalId:
          (json['hospitalId'] ?? hospitalMap['hospitalId'] ?? '').toString(),
      hospitalName: (hospitalMap['name'] ?? 'MediCare Hospital').toString(),
      hospitalAddress: hospitalMap['address']?.toString(),
      prescriptions: prescs,
    );
  }
}

class DoctorApiService {
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

  static dynamic _handleResponse(http.Response response) {
    dynamic decoded;
    try {
      decoded = jsonDecode(response.body);
    } catch (_) {
      decoded = null;
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return decoded;
    }

    final message = (decoded is Map<String, dynamic>
            ? decoded['message'] ?? decoded['error']
            : null) ??
        'Request failed with status ${response.statusCode}';
    throw DoctorApiException(message.toString(), response.statusCode);
  }

  /// Get appointments for the authenticated doctor, optionally filtered by statusCategory
  static Future<List<DoctorAppointmentItem>> getDoctorAppointments({
    String? statusCategory,
    String? status,
  }) async {
    final uri = _uri('/api/encounters', {
      if (statusCategory != null) 'statusCategory': statusCategory,
      if (status != null) 'status': status,
    });

    final response = await http.get(uri, headers: _headers());
    final data = _handleResponse(response);

    final list = <DoctorAppointmentItem>[];
    if (data is List) {
      for (final item in data) {
        if (item is Map<String, dynamic>) {
          list.add(DoctorAppointmentItem.fromJson(item));
        }
      }
    }
    return list;
  }

  /// Get single appointment details
  static Future<DoctorAppointmentItem> getAppointmentDetails(
      String encounterId) async {
    final uri = _uri('/api/encounters/$encounterId');
    final response = await http.get(uri, headers: _headers());
    final data = _handleResponse(response);

    if (data is Map<String, dynamic>) {
      return DoctorAppointmentItem.fromJson(data);
    }
    throw const DoctorApiException('Invalid encounter response format');
  }

  /// Start consultation: status -> IN_PROGRESS
  static Future<DoctorAppointmentItem> startConsultation(
      String encounterId) async {
    final uri = _uri('/api/encounters/$encounterId');
    final response = await http.put(
      uri,
      headers: _headers(),
      body: jsonEncode({'status': 'IN_PROGRESS'}),
    );
    final data = _handleResponse(response);
    return DoctorAppointmentItem.fromJson(data as Map<String, dynamic>);
  }

  /// Update consultation clinical details (notes, diagnosis, outcome, followUpDate)
  static Future<DoctorAppointmentItem> updateConsultation(
    String encounterId, {
    String? diagnosis,
    String? notes,
    String? outcome,
    DateTime? followUpDate,
  }) async {
    final uri = _uri('/api/encounters/$encounterId');
    final payload = <String, dynamic>{};
    if (diagnosis != null) payload['diagnosis'] = diagnosis;
    if (notes != null) payload['notes'] = notes;
    if (outcome != null) payload['outcome'] = outcome;
    if (followUpDate != null) {
      payload['followUpDate'] = followUpDate.toUtc().toIso8601String();
    }

    final response = await http.put(
      uri,
      headers: _headers(),
      body: jsonEncode(payload),
    );
    final data = _handleResponse(response);
    return DoctorAppointmentItem.fromJson(data as Map<String, dynamic>);
  }

  /// Complete consultation: status -> COMPLETED
  static Future<DoctorAppointmentItem> completeConsultation(
    String encounterId, {
    String? diagnosis,
    String? notes,
    String? outcome,
    DateTime? followUpDate,
  }) async {
    final uri = _uri('/api/encounters/$encounterId');
    final payload = <String, dynamic>{
      'status': 'COMPLETED',
    };
    if (diagnosis != null) payload['diagnosis'] = diagnosis;
    if (notes != null) payload['notes'] = notes;
    if (outcome != null) payload['outcome'] = outcome;
    if (followUpDate != null) {
      payload['followUpDate'] = followUpDate.toUtc().toIso8601String();
    }

    final response = await http.put(
      uri,
      headers: _headers(),
      body: jsonEncode(payload),
    );
    final data = _handleResponse(response);
    return DoctorAppointmentItem.fromJson(data as Map<String, dynamic>);
  }

  /// Search medicines from catalog
  static Future<List<MedicineCatalogItem>> searchMedicines(
      {String? query}) async {
    final uri = _uri('/api/medicines', {
      if (query != null && query.trim().isNotEmpty) 'search': query.trim(),
    });
    final response = await http.get(uri, headers: _headers());
    final data = _handleResponse(response);

    final list = <MedicineCatalogItem>[];
    if (data is List) {
      for (final item in data) {
        if (item is Map<String, dynamic>) {
          list.add(MedicineCatalogItem.fromJson(item));
        }
      }
    }
    return list;
  }

  /// Create a prescription for an encounter
  static Future<DoctorPrescriptionRecord> createPrescription({
    required String encounterId,
    String? diagnosisText,
    String? symptoms,
    String? allergiesNoted,
    String? severity,
    DateTime? nextVisit,
    List<PrescriptionMedicineItem> medicines = const [],
  }) async {
    final uri = _uri('/api/prescriptions');
    final payload = <String, dynamic>{
      'encounterId': encounterId,
      if (diagnosisText != null && diagnosisText.isNotEmpty)
        'diagnosisText': diagnosisText,
      if (symptoms != null && symptoms.isNotEmpty) 'symptoms': symptoms,
      if (allergiesNoted != null && allergiesNoted.isNotEmpty)
        'allergiesNoted': allergiesNoted,
      if (severity != null) 'severity': severity,
      if (nextVisit != null) 'nextVisit': nextVisit.toUtc().toIso8601String(),
      'medicines': medicines.map((m) => m.toJson()).toList(),
    };

    final response = await http.post(
      uri,
      headers: _headers(),
      body: jsonEncode(payload),
    );
    final data = _handleResponse(response);
    return DoctorPrescriptionRecord.fromJson(data as Map<String, dynamic>);
  }
}
