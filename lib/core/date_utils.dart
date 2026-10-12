class MediDateUtils {
  const MediDateUtils._();

  static const _months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec'
  ];

  static const _weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  static const _fullWeekdays = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday'
  ];

  static String formatShort(DateTime dt) {
    final w = _weekdays[dt.weekday - 1];
    final m = _months[dt.month - 1];
    final hour = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
    final ampm = dt.hour >= 12 ? 'PM' : 'AM';
    final minute = dt.minute.toString().padLeft(2, '0');
    return '$w, $m ${dt.day} • $hour:$minute $ampm';
  }

  static String formatFull(DateTime dt) {
    final w = _fullWeekdays[dt.weekday - 1];
    final m = _months[dt.month - 1];
    final hour = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
    final ampm = dt.hour >= 12 ? 'PM' : 'AM';
    final minute = dt.minute.toString().padLeft(2, '0');
    return '$w, $m ${dt.day}, ${dt.year} • $hour:$minute $ampm';
  }

  static String formatDateOnly(DateTime dt) {
    final w = _weekdays[dt.weekday - 1];
    final m = _months[dt.month - 1];
    return '$w, $m ${dt.day}, ${dt.year}';
  }

  static String formatTimeOnly(DateTime dt) {
    final hour = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
    final ampm = dt.hour >= 12 ? 'PM' : 'AM';
    final minute = dt.minute.toString().padLeft(2, '0');
    return '$hour:$minute $ampm';
  }

  static String formatMonthDay(DateTime dt) {
    final m = _months[dt.month - 1];
    return '$m ${dt.day}';
  }
}
