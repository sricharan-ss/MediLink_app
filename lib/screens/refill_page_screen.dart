import 'package:flutter/material.dart';

import '../core/app_colors.dart';
import 'order_medicines_screen.dart';

class RefillPageScreen extends StatefulWidget {
  const RefillPageScreen({
    super.key,
    this.initialItems = const [],
  });

  final List<Map<String, dynamic>> initialItems;

  @override
  State<RefillPageScreen> createState() => _RefillPageScreenState();
}

class _RefillPageScreenState extends State<RefillPageScreen> {
  late final List<Map<String, dynamic>> medicationsRefill;
  Map<String, dynamic>? selectedMed;
  int quantity = 30;
  String deliveryDate = DateTime.now()
      .add(const Duration(days: 2))
      .toIso8601String()
      .split('T')[0];

  @override
  void initState() {
    super.initState();
    medicationsRefill = _buildRefillItems(widget.initialItems);
    if (medicationsRefill.isNotEmpty) {
      selectedMed = medicationsRefill.first;
    }
  }

  List<Map<String, dynamic>> _buildRefillItems(
      List<Map<String, dynamic>> incoming) {
    if (incoming.isNotEmpty) {
      return incoming.map((item) {
        final medicineId = _text(item['medicineId'], _text(item['id']));
        return {
          'id': _text(item['id'], medicineId),
          'medicineId': medicineId,
          'hospitalId': _text(item['hospitalId']),
          'name': _text(item['medicineName'], 'Medicine'),
          'dosage': _text(item['dosage'], ''),
          'refillDate': DateTime.now().toUtc().toIso8601String(),
        };
      }).toList();
    }

    return const [];
  }

  void _proceedToCheckout() {
    if (selectedMed == null) return;
    final medicineId = _text(selectedMed!['medicineId']);
    if (medicineId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Medicine ID is missing for this refill item'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (_) => OrderMedicinesScreen(
          initialCart: {medicineId: quantity},
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.white,
      appBar: AppBar(
        title: const Text(
          'Refill Prescription',
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
      body: medicationsRefill.isEmpty
          ? const Center(
              child: Text(
                'No eligible prescription medicines found for refill.',
                style: TextStyle(color: AppColors.textSecondary, fontSize: 14),
              ),
            )
          : Stack(
              children: [
                ListView(
                  padding: const EdgeInsets.fromLTRB(16, 20, 16, 120),
                  children: [
                    const Text(
                      'Select Prescription Medicine',
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 12),
                    ...medicationsRefill.map((med) {
                      final isSelected = selectedMed?['id'] == med['id'];
                      return GestureDetector(
                        onTap: () => setState(() => selectedMed = med),
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppColors.white,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: isSelected
                                  ? AppColors.primary
                                  : AppColors.surfaceSage,
                              width: isSelected ? 2 : 1,
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${_text(med['name'])} ${_text(med['dosage'])}',
                                style: const TextStyle(
                                  color: AppColors.textPrimary,
                                  fontSize: 15,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(height: 4),
                              const Text(
                                'Eligible for order and delivery',
                                style: TextStyle(
                                  color: AppColors.textSecondary,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                    const SizedBox(height: 20),
                    const Text(
                      'Quantity (pills)',
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      decoration: BoxDecoration(
                        color: AppColors.white,
                        border: Border.all(color: AppColors.surfaceSage),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<int>(
                          value: quantity,
                          isExpanded: true,
                          icon: const Icon(Icons.keyboard_arrow_down,
                              color: AppColors.primary),
                          items: const [
                            DropdownMenuItem(
                                value: 10, child: Text('10 units')),
                            DropdownMenuItem(
                                value: 30, child: Text('30 units (1 month)')),
                            DropdownMenuItem(
                                value: 60, child: Text('60 units (2 months)')),
                            DropdownMenuItem(
                                value: 90, child: Text('90 units (3 months)')),
                          ],
                          onChanged: (val) {
                            if (val != null) setState(() => quantity = val);
                          },
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      'Preferred Date',
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: TextEditingController(text: deliveryDate),
                      readOnly: true,
                      onTap: () async {
                        DateTime? picked = await showDatePicker(
                          context: context,
                          initialDate: DateTime.now(),
                          firstDate: DateTime.now(),
                          lastDate:
                              DateTime.now().add(const Duration(days: 365)),
                        );
                        if (picked != null) {
                          setState(() {
                            deliveryDate =
                                picked.toIso8601String().split('T')[0];
                          });
                        }
                      },
                      decoration: InputDecoration(
                        prefixIcon: const Icon(Icons.calendar_today_outlined,
                            color: AppColors.primary, size: 18),
                        filled: true,
                        fillColor: AppColors.white,
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
                      ),
                    ),
                  ],
                ),
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: 0,
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: const BoxDecoration(
                      color: AppColors.white,
                      border:
                          Border(top: BorderSide(color: AppColors.surfaceSage)),
                    ),
                    child: ElevatedButton(
                      onPressed: _proceedToCheckout,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14)),
                      ),
                      child: const Text(
                        'Proceed to Medicine Checkout',
                        style: TextStyle(
                            color: AppColors.white,
                            fontSize: 15,
                            fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  String _text(dynamic value, [String fallback = '']) {
    if (value == null) return fallback;
    final text = value.toString().trim();
    return text.isEmpty ? fallback : text;
  }
}
