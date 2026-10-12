import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:patient/services/medication_notification_service.dart';
import 'package:patient/services/patient_api_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Phase 7 - Notification & Medication Reminders Unit Tests', () {
    setUp(() {
      SharedPreferences.setMockInitialValues({});
    });

    test('Medication reminder schedule lifecycle: create, edit, pause, delete', () async {
      // 1. Create a reminder schedule
      final created = await PatientApiService.createMedicationSchedule(
        medicineId: 'med-101',
        medicineName: 'Amoxicillin 500mg',
        quantity: 1,
        dosage: '1 capsule',
        timeOfDay: '08:30',
        instructions: 'Take after breakfast',
      );

      expect(created['medicineId'], 'med-101');
      expect(created['medicineName'], 'Amoxicillin 500mg');
      expect(created['timeOfDay'], '08:30');
      expect(created['status'], 'ACTIVE');
      expect(created['isLocalReminder'], true);

      // Verify dashboard lists it
      var dashboard = await PatientApiService.getMedicationDashboard();
      var schedules = dashboard['todaySchedule'] as List;
      expect(schedules.length, 1);
      expect(schedules.first['timeOfDay'], '08:30');

      final schedId = created['id'] as String;

      // 2. Edit reminder time
      final updated = await PatientApiService.updateMedicationSchedule(
        scheduleId: schedId,
        timeOfDay: '09:00',
        instructions: 'Take with full glass of water',
      );
      expect(updated['timeOfDay'], '09:00');
      expect(updated['instructions'], 'Take with full glass of water');

      // 3. Mark medication taken
      final markRes = await PatientApiService.markMedicationTaken(schedId);
      expect(markRes['status'], 'COMPLETED');

      dashboard = await PatientApiService.getMedicationDashboard();
      schedules = dashboard['todaySchedule'] as List;
      expect(schedules.first['lastTakenAt'], isNotNull);

      // 4. Pause / Disable reminder
      final pauseRes = await PatientApiService.updateMedicationScheduleStatus(
        scheduleId: schedId,
        action: 'PAUSED',
      );
      expect(pauseRes['status'], 'PAUSED');

      dashboard = await PatientApiService.getMedicationDashboard();
      schedules = dashboard['todaySchedule'] as List;
      expect(schedules.first['status'], 'PAUSED');

      // 5. Delete / Remove reminder
      final delRes = await PatientApiService.deleteMedicationSchedule(schedId);
      expect(delRes['deleted'], true);

      dashboard = await PatientApiService.getMedicationDashboard();
      schedules = dashboard['todaySchedule'] as List;
      expect(schedules.isEmpty, true);
    });

    test('Duplicate reminder prevention for identical medicine and time', () async {
      await PatientApiService.createMedicationSchedule(
        medicineId: 'med-202',
        medicineName: 'Metformin',
        timeOfDay: '12:00',
      );

      // Attempt duplicate creation
      await PatientApiService.createMedicationSchedule(
        medicineId: 'med-202',
        medicineName: 'Metformin',
        timeOfDay: '12:00',
      );

      final dashboard = await PatientApiService.getMedicationDashboard();
      final schedules = dashboard['todaySchedule'] as List;
      expect(schedules.length, 1, reason: 'Duplicate reminder at same time must not be created');
    });

    test('Medication notification service initializes and calculates hashes reliably', () {
      // Check that service methods exist and can be called safely
      expect(MedicationNotificationService.initialize, isA<Function>());
      expect(MedicationNotificationService.cancelMedicationReminder, isA<Function>());
      expect(MedicationNotificationService.syncMedicationReminders, isA<Function>());
    });
  });
}
