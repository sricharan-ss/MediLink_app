import 'package:flutter_test/flutter_test.dart';
import 'package:patient/services/patient_api_service.dart';

void main() {
  group('PatientSummary Model Tests', () {
    test('parses full json payload accurately', () {
      final json = {
        'summaryId': 'sum-123',
        'patientId': 'pat-456',
        'encounterId': 'enc-789',
        'keyFindings': 'Patient has mild hypertension',
        'recommendations': 'Low sodium diet, follow up in 2 weeks',
        'medicalHistory': 'Seasonal allergies',
        'labHistory': 'Blood pressure 135/85',
        'riskFactors': 'Family history of CVD',
        'generatedBy': 'Dr. Sarah Connor',
        'generatedAt': '2026-05-10T10:30:00.000Z',
      };

      final summary = PatientSummary.fromJson(json);

      expect(summary.id, 'sum-123');
      expect(summary.patientId, 'pat-456');
      expect(summary.encounterId, 'enc-789');
      expect(summary.keyFindings, 'Patient has mild hypertension');
      expect(summary.recommendations, 'Low sodium diet, follow up in 2 weeks');
      expect(summary.medicalHistory, 'Seasonal allergies');
      expect(summary.labHistory, 'Blood pressure 135/85');
      expect(summary.riskFactors, 'Family history of CVD');
      expect(summary.generatedBy, 'Dr. Sarah Connor');
      expect(summary.generatedAt, isNotNull);
    });

    test('handles missing and fallback fields gracefully', () {
      final json = {'id': 'sum-simple'};
      final summary = PatientSummary.fromJson(json);

      expect(summary.id, 'sum-simple');
      expect(summary.patientId, isNull);
      expect(summary.encounterId, isNull);
      expect(summary.keyFindings, isNull);
      expect(summary.recommendations, isNull);
      expect(summary.generatedAt, isNull);
    });
  });

  group('PatientPayment Model Tests', () {
    test('parses full payment json accurately', () {
      final json = {
        'paymentId': 'pay-001',
        'invoiceId': 'inv-002',
        'amount': 750.50,
        'currency': 'INR',
        'orderId': 'ord-1234',
        'transactionId': 'txn-5678',
        'mode': 'UPI',
        'status': 'PAID',
        'paidAt': '2026-06-01T14:20:00.000Z',
        'invoice': {
          'title': 'Medicine Order #1234',
        },
      };

      final payment = PatientPayment.fromJson(json);

      expect(payment.id, 'pay-001');
      expect(payment.invoiceId, 'inv-002');
      expect(payment.amount, 750.50);
      expect(payment.currency, 'INR');
      expect(payment.orderId, 'ord-1234');
      expect(payment.transactionId, 'txn-5678');
      expect(payment.mode, 'UPI');
      expect(payment.status, 'PAID');
      expect(payment.paidAt, isNotNull);
      expect(payment.invoiceTitle, 'Medicine Order #1234');
    });

    test('handles fallback and nested invoice data gracefully', () {
      final json = {
        'id': 'pay-simple',
        'invoice': {
          'invoiceId': 'inv-nested',
          'amount': 250,
          'status': 'PENDING',
          'description': 'Consultation fee',
        },
        'paymentMethod': 'card',
      };

      final payment = PatientPayment.fromJson(json);

      expect(payment.id, 'pay-simple');
      expect(payment.invoiceId, 'inv-nested');
      expect(payment.amount, 250.0);
      expect(payment.status, 'PENDING');
      expect(payment.mode, 'CARD');
      expect(payment.invoiceTitle, 'Consultation fee');
    });
  });

  group('PatientRecords Model Tests', () {
    test('aggregates appointments, prescriptions, summaries, labReports, and vault', () {
      final json = {
        'appointments': [],
        'prescriptions': [
          {'prescriptionId': 'p-1', 'medicines': []}
        ],
        'summaries': [
          {'summaryId': 's-1', 'keyFindings': 'Clear'}
        ],
        'labReports': [
          {
            'resultId': 'lab-1',
            'resultValue': '7200',
            'isAbnormal': false,
            'labTest': {'testName': 'CBC', 'unit': 'cells/mcL'},
          }
        ],
        'vault': [
          {
            'id': 'v-1',
            'fileName': 'xray.pdf',
            'fileUrl': 'https://res.cloudinary.com/test/xray.pdf',
          }
        ],
        'medications': [],
      };

      final records = PatientRecords.fromJson(json);

      expect(records.appointments, isEmpty);
      expect(records.prescriptions.length, 1);
      expect(records.summaries.length, 1);
      expect(records.summaries.first.id, 's-1');
      expect(records.summaries.first.keyFindings, 'Clear');
      expect(records.labReports.length, 1);
      expect(records.labReports.first['resultValue'], '7200');
      expect(records.vault.length, 1);
      expect(records.vault.first['fileName'], 'xray.pdf');
    });
  });

  group('PatientApiService friendlyError Tests', () {
    test('formats network errors cleanly', () {
      final err = Exception('SocketException: connection refused');
      expect(
        PatientApiService.friendlyError(err),
        'Unable to reach MediLink right now. Check your connection and try again.',
      );
    });

    test('formats auth errors cleanly', () {
      final err = const PatientApiException('Unauthorized access');
      expect(
        PatientApiService.friendlyError(err),
        'Your session has expired. Please log in again.',
      );
    });
  });
}

