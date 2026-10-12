import 'package:flutter/material.dart';

import '../core/app_colors.dart';
import '../services/patient_api_service.dart';

class NotificationCenterScreen extends StatefulWidget {
  const NotificationCenterScreen({super.key});

  @override
  State<NotificationCenterScreen> createState() =>
      _NotificationCenterScreenState();
}

class _NotificationCenterScreenState extends State<NotificationCenterScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  List<Map<String, dynamic>> _notifications = const [];

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      final notifications = await PatientApiService.getNotifications();
      if (!mounted) return;
      setState(() {
        _notifications = notifications;
        _isLoading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _errorMessage = PatientApiService.friendlyError(error);
        _isLoading = false;
      });
    }
  }

  Future<void> _markRead(Map<String, dynamic> notification) async {
    final id = _text(notification['notificationId'] ?? notification['id']);
    if (id.isEmpty || notification['isRead'] == true) return;
    try {
      await PatientApiService.markNotificationRead(id);
      if (!mounted) return;
      setState(() {
        _notifications = _notifications.map((n) {
          final nid = _text(n['notificationId'] ?? n['id']);
          if (nid == id) {
            return {...n, 'isRead': true};
          }
          return n;
        }).toList();
      });
    } catch (_) {
      await _loadNotifications();
    }
  }

  Future<void> _markAllAsRead() async {
    final unread = _notifications.where((n) => n['isRead'] != true).toList();
    if (unread.isEmpty) return;
    setState(() {
      _notifications =
          _notifications.map((n) => {...n, 'isRead': true}).toList();
    });
    try {
      for (final n in unread) {
        final id = _text(n['notificationId'] ?? n['id']);
        if (id.isNotEmpty) {
          await PatientApiService.markNotificationRead(id);
        }
      }
    } catch (_) {
      await _loadNotifications();
    }
  }

  IconData _iconForType(String? type) {
    switch (type?.toUpperCase()) {
      case 'APPOINTMENT':
        return Icons.calendar_today_rounded;
      case 'PRESCRIPTION':
        return Icons.medication_rounded;
      case 'LAB':
        return Icons.science_rounded;
      case 'PAYMENT':
        return Icons.receipt_long_rounded;
      default:
        return Icons.notifications_active_rounded;
    }
  }

  String _formatDate(dynamic value) {
    if (value == null) return '';
    final dt = DateTime.tryParse(value.toString())?.toLocal();
    if (dt == null) return '';
    final now = DateTime.now();
    final diff = now.difference(dt);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inHours < 1) return '${diff.inMinutes}m ago';
    if (diff.inDays < 1) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${dt.day}/${dt.month}/${dt.year}';
  }

  @override
  Widget build(BuildContext context) {
    final unreadCount = _notifications.where((n) => n['isRead'] != true).length;

    return Scaffold(
      backgroundColor: AppColors.warmWhite,
      appBar: AppBar(
        title: Text(
          unreadCount > 0 ? 'Notifications ($unreadCount)' : 'Notifications',
        ),
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.cream,
        actions: [
          if (unreadCount > 0)
            TextButton(
              onPressed: _markAllAsRead,
              child: const Text(
                'Mark all read',
                style: TextStyle(color: AppColors.cream, fontSize: 13),
              ),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadNotifications,
        child: _isLoading
            ? const Center(
                child: CircularProgressIndicator(color: AppColors.accent))
            : _errorMessage != null
                ? ListView(
                    padding: const EdgeInsets.all(24),
                    children: [
                      const SizedBox(height: 80),
                      const Icon(Icons.error_outline_rounded,
                          size: 48, color: AppColors.textSecondary),
                      const SizedBox(height: 12),
                      Text(
                        _errorMessage!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                            color: AppColors.textSecondary, fontSize: 13),
                      ),
                      const SizedBox(height: 16),
                      Center(
                        child: ElevatedButton(
                          onPressed: _loadNotifications,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.accent,
                            foregroundColor: Colors.white,
                          ),
                          child: const Text('Retry'),
                        ),
                      ),
                    ],
                  )
                : _notifications.isEmpty
                    ? ListView(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 24, vertical: 100),
                        children: const [
                          Icon(Icons.notifications_none_rounded,
                              size: 48, color: AppColors.textSecondary),
                          SizedBox(height: 12),
                          Text(
                            'No notifications yet.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: AppColors.textPrimary,
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          SizedBox(height: 6),
                          Text(
                            'You will receive notifications here about your appointments, prescriptions, and lab reports.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                                color: AppColors.textSecondary, fontSize: 13),
                          ),
                        ],
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _notifications.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (context, index) {
                          final notification = _notifications[index];
                          final isRead = notification['isRead'] == true;
                          final type = notification['type']?.toString();
                          final dateStr =
                              _formatDate(notification['createdAt']);

                          return InkWell(
                            onTap: () => _markRead(notification),
                            borderRadius: BorderRadius.circular(14),
                            child: Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: isRead ? Colors.white : AppColors.cream,
                                border: Border.all(
                                  color: isRead
                                      ? AppColors.surface
                                      : AppColors.accent.withValues(alpha: 0.5),
                                ),
                                borderRadius: BorderRadius.circular(14),
                                boxShadow: [
                                  if (!isRead)
                                    BoxShadow(
                                      color: AppColors.accent
                                          .withValues(alpha: 0.08),
                                      blurRadius: 8,
                                      offset: const Offset(0, 2),
                                    ),
                                ],
                              ),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(8),
                                    decoration: BoxDecoration(
                                      color: isRead
                                          ? AppColors.surface
                                              .withValues(alpha: 0.5)
                                          : AppColors.accent
                                              .withValues(alpha: 0.15),
                                      shape: BoxShape.circle,
                                    ),
                                    child: Icon(
                                      _iconForType(type),
                                      color: isRead
                                          ? AppColors.textSecondary
                                          : AppColors.accent,
                                      size: 18,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Expanded(
                                              child: Text(
                                                _text(notification['title'],
                                                    'Notification'),
                                                style: TextStyle(
                                                  color: AppColors.textPrimary,
                                                  fontSize: 14,
                                                  fontWeight: isRead
                                                      ? FontWeight.w600
                                                      : FontWeight.w800,
                                                ),
                                              ),
                                            ),
                                            if (dateStr.isNotEmpty)
                                              Text(
                                                dateStr,
                                                style: const TextStyle(
                                                  color:
                                                      AppColors.textSecondary,
                                                  fontSize: 11,
                                                ),
                                              ),
                                          ],
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          _text(notification['message']),
                                          style: const TextStyle(
                                            color: AppColors.textSecondary,
                                            fontSize: 13,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  if (!isRead) ...[
                                    const SizedBox(width: 8),
                                    Container(
                                      width: 8,
                                      height: 8,
                                      decoration: const BoxDecoration(
                                        color: AppColors.accent,
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          );
                        },
                      ),
      ),
    );
  }

  String _text(dynamic value, [String fallback = '']) {
    if (value == null) return fallback;
    final text = value.toString().trim();
    return text.isEmpty ? fallback : text;
  }
}
