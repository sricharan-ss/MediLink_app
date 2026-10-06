import 'dart:async';

import 'package:flutter/material.dart';

import '../core/app_colors.dart';
import '../core/session_store.dart';
import '../services/patient_api_service.dart';
import '../services/razorpay_checkout_service.dart';

class OrderMedicinesScreen extends StatefulWidget {
  const OrderMedicinesScreen({
    super.key,
    this.initialCart,
    this.initialOrderId,
  });

  final Map<String, int>? initialCart;
  final String? initialOrderId;

  @override
  State<OrderMedicinesScreen> createState() => _OrderMedicinesScreenState();
}

class _OrderMedicinesScreenState extends State<OrderMedicinesScreen> {
  final TextEditingController _searchController = TextEditingController();
  final TextEditingController _deliveryAddressController =
      TextEditingController();
  final Map<String, int> _cart = {};
  Timer? _searchDebounce;
  List<Map<String, dynamic>> _medicines = const [];
  String _searchQuery = '';
  String? _paymentMethod = 'RAZORPAY';
  bool _isLoading = true;
  bool _isSubmitting = false;
  String? _errorMessage;
  late final RazorpayCheckoutService _razorpay;
  String? _pendingMedicationOrderId;
  String? _pendingPaymentId;

  @override
  void initState() {
    super.initState();
    _razorpay = RazorpayCheckoutService(
      onSuccess: _handlePaymentSuccess,
      onError: _handlePaymentError,
      onExternalWallet: _handleExternalWallet,
    );
    if (widget.initialCart != null) {
      _cart.addAll(widget.initialCart!);
    }
    _loadMedicines();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || widget.initialOrderId == null || _cartItemCount == 0) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Reorder loaded from ${widget.initialOrderId}'),
          backgroundColor: AppColors.primary,
          behavior: SnackBarBehavior.floating,
        ),
      );
    });
  }

  Future<void> _loadMedicines({String? query}) async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final medicines = await PatientApiService.getOrderableMedicines(
        query: query,
        limit: 80,
      );
      if (!mounted) return;
      setState(() {
        _medicines = medicines;
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

  @override
  void dispose() {
    _searchDebounce?.cancel();
    _searchController.dispose();
    _deliveryAddressController.dispose();
    _razorpay.dispose();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    setState(() => _searchQuery = value);
    _searchDebounce?.cancel();
    _searchDebounce = Timer(const Duration(milliseconds: 350), () {
      if (!mounted) return;
      _loadMedicines(query: value.trim().isEmpty ? null : value.trim());
    });
  }

  void _updateQuantity(String id, int change) {
    setState(() {
      final current = _cart[id] ?? 0;
      final next = current + change;
      if (next <= 0) {
        _cart.remove(id);
      } else {
        _cart[id] = next;
      }
    });
  }

  List<Map<String, dynamic>> get _filteredItems {
    final query = _searchQuery.trim().toLowerCase();
    if (query.isEmpty) {
      return _medicines;
    }
    return _medicines.where((item) {
      final label = '${item['name']} ${item['dosage'] ?? ''}'.toLowerCase();
      return label.contains(query);
    }).toList();
  }

  double get _cartTotal {
    var total = 0.0;
    _cart.forEach((id, qty) {
      final matching = _medicines.where((item) => _text(item['id']) == id);
      if (matching.isNotEmpty) {
        total += _toDouble(matching.first['price']) * qty;
      }
    });
    return total;
  }

  int get _cartItemCount {
    var count = 0;
    for (final qty in _cart.values) {
      count += qty;
    }
    return count;
  }

  bool get _canPlaceOrder {
    return _cart.isNotEmpty &&
        !_isSubmitting &&
        _deliveryAddressController.text.trim().isNotEmpty &&
        _paymentMethod != null;
  }

  Future<void> _placeOrder() async {
    if (!_canPlaceOrder) return;
    setState(() => _isSubmitting = true);

    try {
      final items = _cart.entries.map((entry) {
        final med = _medicines.firstWhere(
          (item) => _text(item['id']) == entry.key,
          orElse: () => const <String, dynamic>{},
        );
        return {
          'medicineId': _text(med['medicineId'], entry.key),
          'quantity': entry.value,
        };
      }).toList();

      final first = _medicines.firstWhere(
        (item) => _cart.containsKey(_text(item['id'])),
        orElse: () => const <String, dynamic>{},
      );

      final invoice = await PatientApiService.createMedicationOrder(
        hospitalId: _text(first['hospitalId']),
        deliveryAddress: _deliveryAddressController.text.trim(),
        items: items,
      );

      final invoiceId = _text(invoice['invoiceId'], _text(invoice['id']));
      if (invoiceId.isEmpty) {
        throw const PatientApiException('Could not create medicine invoice.');
      }

      final num finalAmount =
          invoice['finalAmount'] ?? invoice['totalAmount'] ?? _cartTotal;

      final paymentData = await PatientApiService.createMedicationOrderPayment(
          invoiceId,
          amount: finalAmount);
      final razorpayOrder = _toMap(paymentData['order']);
      final keyId = _text(paymentData['keyId']);
      final paymentId = _text(paymentData['paymentId']);
      final razorpayOrderId = _text(razorpayOrder['id']);
      final amount = _toInt(razorpayOrder['amount']);

      if (keyId.isEmpty ||
          paymentId.isEmpty ||
          razorpayOrderId.isEmpty ||
          amount <= 0) {
        throw const PatientApiException('Could not start Razorpay checkout.');
      }

      _pendingMedicationOrderId = invoiceId;
      _pendingPaymentId = paymentId;
      _openRazorpayCheckout(
        keyId: keyId,
        razorpayOrderId: razorpayOrderId,
        amount: amount,
      );
    } catch (error) {
      if (!mounted) return;
      setState(() => _isSubmitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(PatientApiService.friendlyError(error)),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  void _openRazorpayCheckout({
    required String keyId,
    required String razorpayOrderId,
    required int amount,
  }) {
    final options = {
      'key': keyId,
      'amount': amount,
      'currency': 'INR',
      'name': 'MediLink',
      'description': 'Medicine order invoice',
      'order_id': razorpayOrderId,
      'prefill': {
        'contact': SessionStore.phoneNumber,
        'email': SessionStore.email,
        'name': SessionStore.fullName,
      },
      'theme': {'color': '#2C6975'},
    };

    try {
      _razorpay.open(options);
    } catch (error) {
      if (!mounted) return;
      setState(() => _isSubmitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Could not open Razorpay checkout: $error'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  Future<void> _handlePaymentSuccess({
    required String paymentId,
    required String razorpayOrderId,
    required String signature,
  }) async {
    final invoiceId = _pendingMedicationOrderId;
    final appPaymentId = _pendingPaymentId;
    final razorpayPaymentId = paymentId;

    if (invoiceId == null ||
        appPaymentId == null ||
        razorpayPaymentId.isEmpty ||
        razorpayOrderId.isEmpty ||
        signature.isEmpty) {
      if (!mounted) return;
      setState(() => _isSubmitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Payment details were incomplete.'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    try {
      await PatientApiService.verifyMedicationOrderPayment(
        orderId: invoiceId,
        paymentId: appPaymentId,
        razorpayPaymentId: razorpayPaymentId,
        razorpayOrderId: razorpayOrderId,
        razorpaySignature: signature,
      );

      if (!mounted) return;

      final purchasedItems = _cart.entries.map((entry) {
        final med = _medicines.firstWhere(
          (m) => _text(m['id']) == entry.key,
          orElse: () => {'name': 'Medicine', 'price': 0},
        );
        return {
          'name': _text(med['name']),
          'quantity': entry.value,
          'price': _toDouble(med['price']),
        };
      }).toList();
      final totalPaid = _cartTotal;

      setState(() {
        _cart.clear();
        _isSubmitting = false;
        _pendingMedicationOrderId = null;
        _pendingPaymentId = null;
      });

      await showDialog<void>(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          backgroundColor: AppColors.white,
          title: const Row(
            children: [
              Icon(Icons.check_circle, color: AppColors.success, size: 28),
              SizedBox(width: 8),
              Text(
                'Order Confirmed',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Invoice: $invoiceId',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Amount Paid: Rs. ${totalPaid.toStringAsFixed(2)}',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(height: 12),
                const Divider(),
                const Text(
                  'Purchased Items:',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 6),
                ...purchasedItems.map((item) => Padding(
                      padding: const EdgeInsets.symmetric(vertical: 2),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              '${item['name']} x${item['quantity']}',
                              style: const TextStyle(
                                  fontSize: 13, color: AppColors.textPrimary),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          Text(
                            'Rs. ${((item['price'] as double) * (item['quantity'] as int)).toStringAsFixed(2)}',
                            style: const TextStyle(
                                fontSize: 13, color: AppColors.textSecondary),
                          ),
                        ],
                      ),
                    )),
                const SizedBox(height: 8),
                const Divider(),
                const Text(
                  'Payment Status: COMPLETED',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: AppColors.success,
                  ),
                ),
              ],
            ),
          ),
          actions: [
            ElevatedButton(
              onPressed: () {
                Navigator.pop(ctx);
                Navigator.pop(context);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: AppColors.white,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text('View Orders'),
            ),
          ],
        ),
      );
    } catch (error) {
      if (!mounted) return;
      setState(() => _isSubmitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(PatientApiService.friendlyError(error)),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  void _handlePaymentError(String message) {
    if (!mounted) return;
    setState(() => _isSubmitting = false);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppColors.error,
      ),
    );
  }

  void _handleExternalWallet(String walletName) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('External wallet: $walletName')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final hasItems = _cartItemCount > 0;
    final items = _filteredItems;
    final canPlaceOrder = _canPlaceOrder;

    return Scaffold(
      backgroundColor: AppColors.white,
      appBar: AppBar(
        title: const Text(
          'Order Medicines',
          style: TextStyle(
            color: AppColors.paleGreen,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        backgroundColor: AppColors.primary,
        iconTheme: const IconThemeData(color: AppColors.paleGreen),
        elevation: 0,
      ),
      body: SafeArea(
        top: false,
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 20, 16, 20),
                children: [
                  TextField(
                    controller: _searchController,
                    onChanged: _onSearchChanged,
                    decoration: InputDecoration(
                      hintText: 'Search medicines...',
                      hintStyle: TextStyle(
                          color: AppColors.textSecondary.withOpacity(0.6)),
                      prefixIcon: const Icon(Icons.search,
                          color: AppColors.textSecondary),
                      filled: true,
                      fillColor: AppColors.paleGreen.withOpacity(0.3),
                      contentPadding: const EdgeInsets.symmetric(vertical: 14),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: AppColors.surfaceSage),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: AppColors.surfaceSage),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: AppColors.primary),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    'Available Medicines',
                    style: TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (_isLoading)
                    const Padding(
                      padding: EdgeInsets.only(top: 40),
                      child: Center(
                          child: CircularProgressIndicator(
                              color: AppColors.primary)),
                    )
                  else if (_errorMessage != null)
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.paleGreen.withOpacity(0.2),
                        border: Border.all(color: AppColors.surfaceSage),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Text(
                        _errorMessage!,
                        style: const TextStyle(
                            color: AppColors.textSecondary, fontSize: 13),
                      ),
                    )
                  else if (items.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.paleGreen.withOpacity(0.2),
                        border: Border.all(color: AppColors.surfaceSage),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: const Text(
                        'No medicines match your search.',
                        style: TextStyle(
                            color: AppColors.textSecondary, fontSize: 13),
                      ),
                    ),
                  ...items.map((item) {
                    final id = _text(item['id']);
                    final qty = _cart[id] ?? 0;
                    final isDiscontinued = item['isDiscontinued'] == true;
                    final price = _toDouble(item['price']);

                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.white,
                        border: Border.all(color: AppColors.surfaceSage),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Text(
                                  '${item['name'] ?? ''}',
                                  style: const TextStyle(
                                    color: AppColors.textPrimary,
                                    fontSize: 15,
                                    fontWeight: FontWeight.w600,
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              if (isDiscontinued)
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: AppColors.error.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: const Text(
                                    'Discontinued',
                                    style: TextStyle(
                                        color: AppColors.error,
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600),
                                  ),
                                ),
                            ],
                          ),
                          if (_text(item['type']).isNotEmpty) ...[
                            const SizedBox(height: 2),
                            Text(
                              _text(item['type']),
                              style: const TextStyle(
                                color: AppColors.textSecondary,
                                fontSize: 12,
                              ),
                            ),
                          ],
                          if (_text(item['manufacturer']).isNotEmpty) ...[
                            const SizedBox(height: 2),
                            Text(
                              'Mfg: ${_text(item['manufacturer'])}',
                              style: const TextStyle(
                                color: AppColors.textSecondary,
                                fontSize: 12,
                              ),
                            ),
                          ],
                          const SizedBox(height: 6),
                          Text(
                            price > 0
                                ? 'Rs. ${price.toStringAsFixed(2)}'
                                : 'Price unavailable',
                            style: TextStyle(
                              color: price > 0
                                  ? AppColors.primary
                                  : AppColors.textSecondary,
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 12),
                          if (isDiscontinued || price <= 0)
                            Text(
                              isDiscontinued
                                  ? 'Item cannot be purchased'
                                  : 'Not available for online checkout',
                              style: const TextStyle(
                                  color: AppColors.textSecondary, fontSize: 12),
                            )
                          else if (qty > 0)
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                _QtyButton(
                                  icon: Icons.remove,
                                  onTap: () => _updateQuantity(id, -1),
                                  fill: AppColors.paleGreen,
                                  iconColor: AppColors.primary,
                                ),
                                SizedBox(
                                  width: 36,
                                  child: Text(
                                    '$qty',
                                    textAlign: TextAlign.center,
                                    style: const TextStyle(
                                      color: AppColors.textPrimary,
                                      fontSize: 15,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                                _QtyButton(
                                  icon: Icons.add,
                                  onTap: () => _updateQuantity(id, 1),
                                  fill: AppColors.primary,
                                  iconColor: AppColors.white,
                                ),
                              ],
                            )
                          else
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton(
                                onPressed: () => _updateQuantity(id, 1),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.primary,
                                  padding:
                                      const EdgeInsets.symmetric(vertical: 12),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  elevation: 0,
                                ),
                                child: const Text(
                                  'Add to Cart',
                                  style: TextStyle(
                                    color: AppColors.white,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                    );
                  }),
                  if (hasItems) ...[
                    const SizedBox(height: 20),
                    const Text(
                      'Delivery Address',
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _deliveryAddressController,
                      minLines: 3,
                      maxLines: 5,
                      onChanged: (_) => setState(() {}),
                      decoration: InputDecoration(
                        hintText: 'House / street / city / pincode',
                        hintStyle: TextStyle(
                            color: AppColors.textSecondary.withOpacity(0.6)),
                        filled: true,
                        fillColor: AppColors.paleGreen.withOpacity(0.2),
                        contentPadding: const EdgeInsets.all(14),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide:
                              const BorderSide(color: AppColors.surfaceSage),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide:
                              const BorderSide(color: AppColors.surfaceSage),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide:
                              const BorderSide(color: AppColors.primary),
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      'Payment Details',
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 12),
                    _PaymentMethodTile(
                      title: 'Razorpay Checkout',
                      subtitle: 'Card, UPI, net banking, wallet',
                      selected: _paymentMethod == 'RAZORPAY',
                      onTap: () => setState(() => _paymentMethod = 'RAZORPAY'),
                    ),
                  ],
                ],
              ),
            ),
            if (hasItems)
              SafeArea(
                top: false,
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: const BoxDecoration(
                    color: AppColors.white,
                    border: Border(top: BorderSide(color: AppColors.surfaceSage)),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              '$_cartItemCount ${_cartItemCount == 1 ? 'item' : 'items'}',
                              style: const TextStyle(
                                color: AppColors.textSecondary,
                                fontSize: 13,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Text(
                            'Rs. ${_cartTotal.toStringAsFixed(2)}',
                            style: const TextStyle(
                              color: AppColors.primary,
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: canPlaceOrder ? _placeOrder : null,
                          icon: const Icon(Icons.shopping_cart_outlined,
                              size: 20),
                          label: Text(
                              _isSubmitting ? 'Placing...' : 'Book Order'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: AppColors.white,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  String _text(dynamic value, [String fallback = '']) {
    if (value == null) return fallback;
    final text = value.toString().trim();
    return text.isEmpty ? fallback : text;
  }

  int _toInt(dynamic value, [int fallback = 0]) {
    if (value is int) return value;
    if (value is num) return value.round();
    return int.tryParse(value?.toString() ?? '') ?? fallback;
  }

  double _toDouble(dynamic value, [double fallback = 0]) {
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '') ?? fallback;
  }

  Map<String, dynamic> _toMap(dynamic value) {
    if (value is! Map) return const {};
    return value.map((key, val) => MapEntry(key.toString(), val));
  }
}

class _QtyButton extends StatelessWidget {
  const _QtyButton({
    required this.icon,
    required this.onTap,
    required this.fill,
    required this.iconColor,
  });

  final IconData icon;
  final VoidCallback onTap;
  final Color fill;
  final Color iconColor;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          color: fill,
          shape: BoxShape.circle,
        ),
        child: Icon(icon, color: iconColor, size: 16),
      ),
    );
  }
}

class _PaymentMethodTile extends StatelessWidget {
  const _PaymentMethodTile({
    required this.title,
    required this.subtitle,
    required this.selected,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.white,
          border: Border.all(
            color: selected ? AppColors.primary : AppColors.surfaceSage,
            width: selected ? 1.5 : 1,
          ),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          children: [
            Icon(
              selected ? Icons.radio_button_checked : Icons.radio_button_off,
              color: selected ? AppColors.primary : AppColors.textSecondary,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
