import 'package:flutter_test/flutter_test.dart';
import 'package:patient/services/doctor_api_service.dart';

void main() {
  group('Doctor Appointment & Consultation Model Tests', () {
    test('DoctorAppointmentItem parses complete encounter JSON accurately', () {
      final json = {
        'encounterId': 'enc-1234',
        'scheduledTime': '2026-10-15T10:30:00.000Z',
        'duration': 30,
        'tokenNo': 5,
        'status': 'IN_PROGRESS',
        'visitType': 'OPD',
        'reason': 'Chest pain',
        'chiefComplaint': 'Sharp chest pain since yesterday',
        'diagnosis': 'Angina',
        'outcome': 'Rest and nitrates',
        'followUpDate': '2026-10-22T10:30:00.000Z',
        'actualStartTime': '2026-10-15T10:35:00.000Z',
        'actualEndTime': null,
        'patient': {
          'patientId': 'pat-999',
          'age': 45,
          'gender': 'male',
          'bloodGroup': 'O_POSITIVE',
          'emergencyContact': '+919876543210',
          'chronicConditions': ['Hypertension', 'Diabetes'],
          'allergies': ['Penicillin'],
          'user': {
            'firstName': 'John',
            'lastName': 'Doe',
            'phoneNumber': '+919876543211',
            'email': 'john.doe@example.com'
          }
        },
        'hospital': {
          'hospitalId': 'hosp-1',
          'name': 'MediCare Multispeciality Hospital',
          'address': '123 Health Ave'
        },
        'prescriptions': [
          {
            'prescriptionId': 'presc-001',
            'encounterId': 'enc-1234',
            'nextVisit': '2026-10-22T10:30:00.000Z',
            'medicines': [
              {
                'prescriptionMedicineId': 'pm-01',
                'medicineId': 'med-01',
                'dosage': '500mg',
                'frequency': 'Twice daily',
                'durationDays': 7,
                'medicine': {
                  'name': 'Amoxicillin'
                }
              }
            ]
          }
        ]
      };

      final item = DoctorAppointmentItem.fromJson(json);

      expect(item.encounterId, 'enc-1234');
      expect(item.patientName, 'John Doe');
      expect(item.tokenNo, 5);
      expect(item.status, 'IN_PROGRESS');
      expect(item.visitType, 'OPD');
      expect(item.chiefComplaint, 'Sharp chest pain since yesterday');
      expect(item.diagnosis, 'Angina');
      expect(item.patientAge, '45');
      expect(item.patientBloodGroup, 'O_POSITIVE');
      expect(item.chronicConditions, contains('Hypertension'));
      expect(item.allergies, contains('Penicillin'));
      expect(item.hospitalName, 'MediCare Multispeciality Hospital');
      expect(item.prescriptions.length, 1);
      expect(item.prescriptions.first.medicines.first.medicineName, 'Amoxicillin');
      expect(item.prescriptions.first.medicines.first.durationDays, 7);
    });

    test('MedicineCatalogItem parses medicine catalog entry accurately', () {
      final json = {
        'medicineId': 'med-100',
        'name': 'Augmentin 625 Duo Tablet',
        'type': 'allopathy',
        'manufacturer': 'GSK',
        'saltComposition': 'Amoxycillin (500mg) + Clavulanic Acid (125mg)'
      };

      final med = MedicineCatalogItem.fromJson(json);

      expect(med.medicineId, 'med-100');
      expect(med.name, 'Augmentin 625 Duo Tablet');
      expect(med.type, 'allopathy');
      expect(med.manufacturer, 'GSK');
      expect(med.saltComposition, contains('Amoxycillin'));
    });

    test('PrescriptionMedicineItem serializes toJson properly for creation payload', () {
      const pm = PrescriptionMedicineItem(
        medicineId: 'med-50',
        medicineName: 'Paracetamol',
        dosage: '650mg',
        frequency: 'Thrice daily',
        durationDays: 3,
      );

      final payload = pm.toJson();

      expect(payload['medicineId'], 'med-50');
      expect(payload['dosage'], '650mg');
      expect(payload['frequency'], 'Thrice daily');
      expect(payload['durationDays'], 3);
    });
  });
}
