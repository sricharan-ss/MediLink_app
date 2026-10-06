import 'package:flutter/material.dart';

import '../core/app_colors.dart';
import '../services/patient_api_service.dart';

class OrderTrackingScreen extends StatefulWidget {
  const OrderTrackingScreen({super.key, required this.orderId});

  final String orderId;

  @override
  State<OrderTrackingScreen> createState() => _OrderTrackingScreenState();
}

class _OrderTrackingScreenState extends State<OrderTrackingScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  Map<String, dynamic> _order = const {};

  @override
  void initState() {
    super.initState();
    _loadOrder();
  }

  Future<void> _loadOrder() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final order =
          await PatientApiService.getMedicationOrderById(widget.orderId);
      if (!mounted) return;
      setState(() {
        _order = order;
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

  Future<void> _cancelOrder() async {
    try {
      await PatientApiService.cancelMedicationOrder(widget.orderId);
      await _loadOrder();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Order cancelled'),
          backgroundColor: AppColors.primary,
        ),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(PatientApiService.friendlyError(error)),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  List<Map<String, dynamic>> _buildSteps(String status) {
    final isPaid = status == 'PAID';
    if (status == 'CANCELLED') {
      return [
        {'label': 'Invoice Created', 'completed': true, 'active': false},
        {'label': 'Cancelled', 'completed': false, 'active': true},
      ];
    }

    return [
      {
        'label': 'Invoice Created',
        'completed': true,
        'active': !isPaid,
      },
      {
        'label': 'Payment Verified',
        'completed': isPaid,
        'active': isPaid,
      },
    ];
  }

  String _text(dynamic value, [String fallback = '']) {
    if (value == null) return fallback;
    final text = value.toString().trim();
    return text.isEmpty ? fallback : text;
  }

  List<Map<String, dynamic>> _mapList(dynamic value) {
    if (value is! List) return const [];
    return value
        .whereType<Map>()
        .map((entry) => entry.map((k, v) => MapEntry(k.toString(), v)))
        .toList();
  }

  String _pretty(String value) {
    if (value == 'PAID') return 'Paid & Confirmed';
    if (value == 'PENDING') return 'Payment Pending';
    if (value == 'CANCELLED') return 'Cancelled';
    return value
        .toLowerCase()
        .split('_')
        .map((part) =>
            part.isEmpty ? part : '${part[0].toUpperCase()}${part.substring(1)}')
        .join(' ');
  }

  Color _statusColor(String status) {
    if (status == 'PAID') return AppColors.success;
    if (status == 'CANCELLED') return AppColors.error;
    return AppColors.primary;
  }

  @override
  Widget build(BuildContext context) {
    final status = _text(_order['status'], 'PENDING').toUpperCase();
    final steps = _buildSteps(status);
    final items = _mapList(_order['items']);
    final canCancel = ['PENDING', 'DRAFT'].contains(status);
    final statusColor = _statusColor(status);

    return Scaffold(
      backgroundColor: AppColors.white,
      appBar: AppBar(
        title: Text(
          'Track Order #${widget.orderId}',
          style: const TextStyle(
            color: AppColors.paleGreen,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        backgroundColor: AppColors.primary,
        iconTheme: const IconThemeData(color: AppColors.paleGreen),
        elevation: 0,
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            )
          : _errorMessage != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Text(
                      _errorMessage!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                          color: AppColors.textSecondary, fontSize: 13),
                    ),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadOrder,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppColors.white,
                            border: Border.all(color: AppColors.surfaceSage),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Status: ${_pretty(status)}',
                                style: TextStyle(
                                  color: statusColor,
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                'Generated: ${_formatDate(_text(_order['createdAt'], _text(_order['orderedAt'])))}',
                                style: const TextStyle(
                                  color: AppColors.textSecondary,
                                  fontSize: 12,
                                ),
                              ),
                              if (status == 'CANCELLED') ...[
                                const SizedBox(height: 8),
                                const Text(
                                  'This invoice order has been cancelled.',
                                  style: TextStyle(
                                    color: AppColors.error,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ],
                              if (canCancel) ...[
                                const SizedBox(height: 12),
                                SizedBox(
                                  width: double.infinity,
                                  child: OutlinedButton.icon(
                                    onPressed: _cancelOrder,
                                    icon: const Icon(Icons.cancel_outlined,
                                        size: 16),
                                    label: const Text('Cancel Order'),
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: AppColors.error,
                                      side: const BorderSide(
                                          color: AppColors.error),
                                      shape: RoundedRectangleBorder(
                                          borderRadius:
                                              BorderRadius.circular(10)),
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                        const SizedBox(height: 24),
                        const Text(
                          'Invoice Status Flow',
                          style: TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 16),
                        ...steps.asMap().entries.map((entry) {
                          final idx = entry.key;
                          final step = entry.value;
                          final isCompleted = step['completed'] as bool;
                          final isActive = step['active'] as bool;
                          final isLast = idx == steps.length - 1;
                          final stepColor = status == 'CANCELLED' && isActive
                              ? AppColors.error
                              : AppColors.primary;

                          return IntrinsicHeight(
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Column(
                                  children: [
                                    Container(
                                      width: 32,
                                      height: 32,
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        color: isCompleted
                                            ? stepColor
                                            : (isActive
                                                ? stepColor.withOpacity(0.2)
                                                : AppColors.surfaceSage),
                                        border: isActive
                                            ? Border.all(
                                                color: stepColor, width: 2)
                                            : null,
                                      ),
                                      child: isCompleted
                                          ? const Icon(Icons.check,
                                              size: 16, color: Colors.white)
                                          : Center(
                                              child: Container(
                                                width: 8,
                                                height: 8,
                                                decoration: BoxDecoration(
                                                  shape: BoxShape.circle,
                                                  color: isActive
                                                      ? stepColor
                                                      : AppColors.textSecondary,
                                                ),
                                              ),
                                            ),
                                    ),
                                    if (!isLast)
                                      Expanded(
                                        child: Container(
                                          width: 2,
                                          color: isCompleted
                                              ? stepColor
                                              : AppColors.surfaceSage,
                                        ),
                                      ),
                                  ],
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Padding(
                                    padding: EdgeInsets.only(
                                        bottom: isLast ? 0 : 24),
                                    child: Text(
                                      _text(step['label']),
                                      style: TextStyle(
                                        color: isCompleted || isActive
                                            ? AppColors.textPrimary
                                            : AppColors.textSecondary,
                                        fontSize: 14,
                                        fontWeight: isActive
                                            ? FontWeight.w600
                                            : FontWeight.w500,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          );
                        }),
                        const SizedBox(height: 24),
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppColors.white,
                            border: Border.all(color: AppColors.surfaceSage),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Order Items',
                                style: TextStyle(
                                  color: AppColors.textPrimary,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(height: 10),
                              if (items.isEmpty)
                                const Text(
                                  'No items',
                                  style: TextStyle(
                                      color: AppColors.textSecondary,
                                      fontSize: 13),
                                ),
                              ...items.map((item) {
                                return Padding(
                                  padding: const EdgeInsets.only(bottom: 8),
                                  child: Text(
                                    '${_text(item['name'], 'Medicine')} x${_text(item['quantity'], '1')}',
                                    style: const TextStyle(
                                      color: AppColors.textPrimary,
                                      fontSize: 13,
                                    ),
                                  ),
                                );
                              }),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
    );
  }

  String _formatDate(String isoString) {
    try {
      final date = DateTime.parse(isoString);
      const months = [
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
      return '${months[date.month - 1]} ${date.day}, ${date.year}';
    } catch (_) {
      return isoString;
    }
  }
}
