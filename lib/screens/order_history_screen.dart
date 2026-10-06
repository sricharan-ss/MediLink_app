import 'package:flutter/material.dart';

import '../core/app_colors.dart';
import '../services/patient_api_service.dart';
import 'order_medicines_screen.dart';
import 'order_tracking_screen.dart';

class OrderHistoryScreen extends StatefulWidget {
  const OrderHistoryScreen({super.key});

  @override
  State<OrderHistoryScreen> createState() => _OrderHistoryScreenState();
}

class _OrderHistoryScreenState extends State<OrderHistoryScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  List<Map<String, dynamic>> _orders = const [];

  @override
  void initState() {
    super.initState();
    _loadOrders();
  }

  Future<void> _loadOrders() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      final orders = await PatientApiService.getMedicationOrders(limit: 50);
      if (!mounted) return;
      setState(() {
        _orders = orders;
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

  List<Map<String, dynamic>> _mapList(dynamic value) {
    if (value is! List) return const [];
    return value
        .whereType<Map>()
        .map((entry) => entry.map((k, v) => MapEntry(k.toString(), v)))
        .toList();
  }

  String _text(dynamic value, [String fallback = '']) {
    if (value == null) return fallback;
    final text = value.toString().trim();
    return text.isEmpty ? fallback : text;
  }

  double _toDouble(dynamic value, [double fallback = 0]) {
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '') ?? fallback;
  }

  Map<String, int> _reorderCart(List<Map<String, dynamic>> items) {
    final cart = <String, int>{};
    for (final item in items) {
      final id = _text(
        item['medicineId'],
        _text(item['prescriptionMedicineId']),
      );
      if (id.isEmpty) continue;
      cart[id] = (cart[id] ?? 0) + (int.tryParse(_text(item['quantity'])) ?? 1);
    }
    return cart;
  }

  Color _statusBackground(String status) {
    if (status == 'DELIVERED') return const Color(0xFFD5F2DE);
    if (status == 'CANCELLED') return const Color(0xFFFFE0E0);
    if (status == 'DISPATCHED') return const Color(0xFFE3F2FD);
    return const Color(0xFFF7E4BE);
  }

  Color _statusTextColor(String status) {
    if (status == 'DELIVERED') return const Color(0xFF2E7D32);
    if (status == 'CANCELLED') return const Color(0xFFC62828);
    if (status == 'DISPATCHED') return const Color(0xFF1565C0);
    return AppColors.accent;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.warmWhite,
      appBar: AppBar(
        title: const Text(
          'Order History',
          style: TextStyle(
            color: AppColors.cream,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        backgroundColor: AppColors.brownDeep,
        iconTheme: const IconThemeData(color: AppColors.cream),
        elevation: 0,
        centerTitle: true,
      ),
      body: RefreshIndicator(
        onRefresh: _loadOrders,
        child: _isLoading
            ? const Center(
                child: CircularProgressIndicator(color: AppColors.accent),
              )
            : _errorMessage != null
                ? ListView(
                    children: [
                      const SizedBox(height: 120),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 24),
                        child: Column(
                          children: [
                            Text(
                              _errorMessage!,
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                color: AppColors.brownMid,
                                fontSize: 13,
                              ),
                            ),
                            const SizedBox(height: 12),
                            ElevatedButton(
                              onPressed: _loadOrders,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.brownDeep,
                                foregroundColor: AppColors.cream,
                              ),
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      ),
                    ],
                  )
                : _orders.isEmpty
                    ? ListView(
                        children: const [
                          SizedBox(height: 120),
                          Center(
                            child: Text(
                              'No orders found yet.',
                              style: TextStyle(
                                color: AppColors.brownMid,
                                fontSize: 13,
                              ),
                            ),
                          ),
                        ],
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _orders.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final order = _orders[index];
                          final items = _mapList(order['items']);
                          final status =
                              _text(order['status'], 'PLACED').toUpperCase();
                          final statusBg = _statusBackground(status);
                          final statusText = _statusTextColor(status);

                          return Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: AppColors.cream,
                              border: Border.all(color: AppColors.surface),
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        _text(order['id']),
                                        style: const TextStyle(
                                          color: AppColors.brownLight,
                                          fontSize: 12,
                                          fontWeight: FontWeight.w500,
                                        ),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 10, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: statusBg,
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Text(
                                        status,
                                        style: TextStyle(
                                          color: statusText,
                                          fontSize: 11,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                if (items.isEmpty)
                                  const Text(
                                    'No items',
                                    style: TextStyle(
                                      color: AppColors.brownDeep,
                                      fontSize: 14,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ...items.map(
                                  (item) => Padding(
                                    padding: const EdgeInsets.only(bottom: 4),
                                    child: Text(
                                      '${_text(item['name'], 'Medicine')} x${_text(item['quantity'], '1')}',
                                      style: const TextStyle(
                                        color: AppColors.brownDeep,
                                        fontSize: 14,
                                        fontWeight: FontWeight.w500,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        _formatDate(_text(
                                          order['createdAt'],
                                          _text(order['orderedAt']),
                                        )),
                                        style: const TextStyle(
                                          color: AppColors.brownMid,
                                          fontSize: 12,
                                        ),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      'Rs. ${_toDouble(order['totalAmount']).toStringAsFixed(2)}',
                                      style: const TextStyle(
                                        color: AppColors.brownDeep,
                                        fontSize: 14,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Row(
                                  children: [
                                    Expanded(
                                      child: OutlinedButton.icon(
                                        onPressed: items.isEmpty
                                            ? null
                                            : () async {
                                                await Navigator.push(
                                                  context,
                                                  MaterialPageRoute(
                                                    builder: (_) =>
                                                        OrderMedicinesScreen(
                                                      initialCart:
                                                          _reorderCart(items),
                                                      initialOrderId:
                                                          _text(order['id']),
                                                    ),
                                                  ),
                                                );
                                                if (mounted) _loadOrders();
                                              },
                                        icon: const Icon(
                                            Icons.shopping_bag_outlined,
                                            size: 16),
                                        label: const Text('Order Again'),
                                        style: OutlinedButton.styleFrom(
                                          foregroundColor: AppColors.brownDeep,
                                          side: const BorderSide(
                                              color: AppColors.brownDeep),
                                          shape: RoundedRectangleBorder(
                                            borderRadius:
                                                BorderRadius.circular(12),
                                          ),
                                          padding: const EdgeInsets.symmetric(
                                              vertical: 12),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: ElevatedButton.icon(
                                        onPressed: () async {
                                          await Navigator.push(
                                            context,
                                            MaterialPageRoute(
                                              builder: (_) =>
                                                  OrderTrackingScreen(
                                                orderId: _text(order['id']),
                                              ),
                                            ),
                                          );
                                          if (mounted) _loadOrders();
                                        },
                                        icon: const Icon(
                                            Icons.local_shipping_outlined,
                                            size: 16),
                                        label: const Text('Track Order'),
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: AppColors.brownDeep,
                                          foregroundColor: AppColors.cream,
                                          elevation: 0,
                                          shape: RoundedRectangleBorder(
                                            borderRadius:
                                                BorderRadius.circular(12),
                                          ),
                                          padding: const EdgeInsets.symmetric(
                                              vertical: 12),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          );
                        },
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
        'Dec',
      ];
      return '${months[date.month - 1]} ${date.day}, ${date.year}';
    } catch (_) {
      return isoString;
    }
  }
}
