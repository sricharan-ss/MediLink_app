import 'dart:math';

import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest.dart' as tz;
import 'package:timezone/timezone.dart' as tz;

class MedicationNotificationService {
  MedicationNotificationService._();

  static final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();
  static bool _initialized = false;

  static const AndroidNotificationChannel _channel = AndroidNotificationChannel(
    'medication_reminders',
    'Medication reminders',
    description: 'Reminders for medicines that have not been marked as taken.',
    importance: Importance.high,
  );

  static Future<void> initialize() async {
    if (_initialized) return;

    tz.initializeTimeZones();
    tz.setLocalLocation(tz.getLocation('Asia/Kolkata'));

    const androidSettings =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    await _plugin.initialize(
      const InitializationSettings(
        android: androidSettings,
        iOS: iosSettings,
        macOS: iosSettings,
      ),
    );

    await _plugin
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(_channel);

    await _plugin
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.requestNotificationsPermission();

    _initialized = true;
  }

  static Future<void> syncMedicationReminders(
    List<Map<String, dynamic>> schedules,
  ) async {
    await initialize();
    await cancelMedicationReminders(schedules);

    for (final schedule in schedules) {
      final status = _text(schedule['status'], 'ACTIVE').toUpperCase();
      if (status != 'ACTIVE') continue;

      final id = _text(schedule['id']);
      final timeOfDay = _text(schedule['timeOfDay']);
      if (id.isEmpty || timeOfDay.isEmpty) continue;

      final due = _nextDueTime(
        timeOfDay,
        forceTomorrow: _isTakenToday(schedule),
      );
      await _plugin.zonedSchedule(
        _notificationId(id),
        'Medicine reminder',
        '${_text(schedule['medicineName'], 'Medicine')} is due. Mark it as taken after you take it.',
        due,
        NotificationDetails(
          android: AndroidNotificationDetails(
            _channel.id,
            _channel.name,
            channelDescription: _channel.description,
            importance: Importance.high,
            priority: Priority.high,
          ),
          iOS: const DarwinNotificationDetails(),
          macOS: const DarwinNotificationDetails(),
        ),
        androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
        uiLocalNotificationDateInterpretation:
            UILocalNotificationDateInterpretation.absoluteTime,
      );
    }
  }

  static Future<void> scheduleNextDayReminder(
    Map<String, dynamic> schedule,
  ) async {
    await initialize();
    final id = _text(schedule['id']);
    final timeOfDay = _text(schedule['timeOfDay']);
    if (id.isEmpty || timeOfDay.isEmpty) return;

    await _plugin.cancel(_notificationId(id));
    await _plugin.zonedSchedule(
      _notificationId(id),
      'Medicine reminder',
      '${_text(schedule['medicineName'], 'Medicine')} is due. Mark it as taken after you take it.',
      _nextDueTime(timeOfDay, forceTomorrow: true),
      NotificationDetails(
        android: AndroidNotificationDetails(
          _channel.id,
          _channel.name,
          channelDescription: _channel.description,
          importance: Importance.high,
          priority: Priority.high,
        ),
        iOS: const DarwinNotificationDetails(),
        macOS: const DarwinNotificationDetails(),
      ),
      androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
      uiLocalNotificationDateInterpretation:
          UILocalNotificationDateInterpretation.absoluteTime,
    );
  }

  static Future<void> cancelMedicationReminder(String scheduleId) async {
    await initialize();
    if (scheduleId.trim().isEmpty) return;
    await _plugin.cancel(_notificationId(scheduleId));
  }

  static Future<void> cancelMedicationReminders(
    List<Map<String, dynamic>> schedules,
  ) async {
    await initialize();
    for (final schedule in schedules) {
      final id = _text(schedule['id']);
      if (id.isNotEmpty) await _plugin.cancel(_notificationId(id));
    }
  }

  static tz.TZDateTime _nextDueTime(
    String hhmm, {
    bool forceTomorrow = false,
  }) {
    final now = tz.TZDateTime.now(tz.local);
    final parts = hhmm.split(':');
    final hour = int.tryParse(parts.isNotEmpty ? parts[0] : '') ?? 9;
    final minute = int.tryParse(parts.length > 1 ? parts[1] : '') ?? 0;
    var due = tz.TZDateTime(
      tz.local,
      now.year,
      now.month,
      now.day,
      hour.clamp(0, 23),
      minute.clamp(0, 59),
    );
    if (forceTomorrow || !due.isAfter(now)) {
      due = due.add(const Duration(days: 1));
    }
    return due;
  }

  static bool _isTakenToday(Map<String, dynamic> schedule) {
    final lastTakenAt = DateTime.tryParse(_text(schedule['lastTakenAt']));
    if (lastTakenAt == null) return false;
    final now = DateTime.now();
    final local = lastTakenAt.toLocal();
    return local.year == now.year &&
        local.month == now.month &&
        local.day == now.day;
  }

  static int _notificationId(String value) {
    var hash = 0;
    for (final unit in value.codeUnits) {
      hash = 0x1fffffff & (hash + unit);
      hash = 0x1fffffff & (hash + ((0x0007ffff & hash) << 10));
      hash ^= hash >> 6;
    }
    hash = 0x1fffffff & (hash + ((0x03ffffff & hash) << 3));
    hash ^= hash >> 11;
    hash = 0x1fffffff & (hash + ((0x00003fff & hash) << 15));
    return max(1, hash);
  }

  static String _text(dynamic value, [String fallback = '']) {
    if (value == null) return fallback;
    final text = value.toString().trim();
    return text.isEmpty ? fallback : text;
  }
}
