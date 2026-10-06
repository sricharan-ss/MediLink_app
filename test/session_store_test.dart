import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:patient/core/session_store.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    await SessionStore.logout();
  });

  test('SessionStore fresh start has no logged in session', () async {
    final restored = await SessionStore.restoreSession();
    expect(restored, isFalse);
    expect(SessionStore.isLoggedIn, isFalse);
    expect(SessionStore.accessToken, isNull);
  });

  test('Fresh SessionStore has no favorites', () {
    expect(SessionStore.favoriteDoctorIds, isEmpty);
    expect(SessionStore.isDoctorFavorite('doc-101'), isFalse);
  });

  test('Adding a favorite works', () {
    final added = SessionStore.toggleFavoriteDoctorLocal('doc-101');
    expect(added, isTrue);
    expect(SessionStore.favoriteDoctorIds, contains('doc-101'));
    expect(SessionStore.isDoctorFavorite('doc-101'), isTrue);
  });

  test('Adding the same doctor twice does not duplicate the ID', () {
    // Adding doctor
    final added = SessionStore.toggleFavoriteDoctorLocal('doc-101');
    expect(added, isTrue);
    expect(SessionStore.favoriteDoctorIds.length, 1);

    // Simulate direct load / duplicate prevention
    SessionStore.registerUser('+919876543210', {
      'favoriteDoctorIds': ['doc-101', 'doc-101', 'doc-102'],
    });
    expect(SessionStore.favoriteDoctorIds.length, 2);
    expect(SessionStore.favoriteDoctorIds, ['doc-101', 'doc-102']);
  });

  test('Removing a favorite works', () {
    SessionStore.toggleFavoriteDoctorLocal('doc-101');
    expect(SessionStore.isDoctorFavorite('doc-101'), isTrue);

    final removed = SessionStore.toggleFavoriteDoctorLocal('doc-101');
    expect(removed, isFalse);
    expect(SessionStore.favoriteDoctorIds, isNot(contains('doc-101')));
    expect(SessionStore.isDoctorFavorite('doc-101'), isFalse);
  });

  test('Favorites persist through SharedPreferences and restore correctly', () async {
    SessionStore.accessToken = 'test-token';
    SessionStore.toggleFavoriteDoctorLocal('doc-alpha');
    SessionStore.toggleFavoriteDoctorLocal('doc-beta');
    await SessionStore.persistSession();

    // Clear in-memory state
    SessionStore.favoriteDoctorIds = [];
    expect(SessionStore.isDoctorFavorite('doc-alpha'), isFalse);

    // Restore
    final restored = await SessionStore.restoreSession();
    expect(restored, isTrue);
    expect(SessionStore.favoriteDoctorIds, containsAll(['doc-alpha', 'doc-beta']));
    expect(SessionStore.isDoctorFavorite('doc-alpha'), isTrue);
    expect(SessionStore.isDoctorFavorite('doc-beta'), isTrue);
  });

  test('Logout clears session and favorite state according to session design', () async {
    SessionStore.accessToken = 'test-jwt-token-123';
    SessionStore.patientId = 'patient-uuid-456';
    SessionStore.toggleFavoriteDoctorLocal('doc-gamma');
    await SessionStore.persistSession();

    expect(SessionStore.isLoggedIn, isTrue);
    expect(SessionStore.isDoctorFavorite('doc-gamma'), isTrue);

    await SessionStore.logout();

    expect(SessionStore.isLoggedIn, isFalse);
    expect(SessionStore.accessToken, isNull);
    expect(SessionStore.patientId, isNull);
    expect(SessionStore.favoriteDoctorIds, isEmpty);
    expect(SessionStore.isDoctorFavorite('doc-gamma'), isFalse);

    // Try to restore after logout
    final restoredAgain = await SessionStore.restoreSession();
    expect(restoredAgain, isFalse);
    expect(SessionStore.favoriteDoctorIds, isEmpty);
  });

  test('SessionStore persists and restores general session accurately', () async {
    SessionStore.accessToken = 'test-jwt-token-123';
    SessionStore.patientId = 'patient-uuid-456';
    SessionStore.phoneNumber = '+919876543210';
    SessionStore.firstName = 'John';
    SessionStore.lastName = 'Doe';
    SessionStore.email = 'john@medilink.app';
    SessionStore.gender = 'Male';
    SessionStore.bloodGroup = 'O+';
    SessionStore.chronicConditions = ['Asthma'];

    await SessionStore.persistSession();

    // Clear in-memory state to simulate app kill
    SessionStore.accessToken = null;
    SessionStore.patientId = null;
    SessionStore.firstName = '';
    SessionStore.lastName = '';
    SessionStore.email = '';
    expect(SessionStore.isLoggedIn, isFalse);

    // Restore from persistent storage
    final restored = await SessionStore.restoreSession();
    expect(restored, isTrue);
    expect(SessionStore.isLoggedIn, isTrue);
    expect(SessionStore.accessToken, 'test-jwt-token-123');
    expect(SessionStore.patientId, 'patient-uuid-456');
    expect(SessionStore.fullName, 'John Doe');
    expect(SessionStore.email, 'john@medilink.app');
    expect(SessionStore.bloodGroup, 'O+');
    expect(SessionStore.chronicConditions, contains('Asthma'));
  });
}
