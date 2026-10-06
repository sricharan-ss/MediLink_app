import 'dart:async';

import 'package:flutter/material.dart';

import '../services/medication_notification_service.dart';
import '../services/patient_api_service.dart';
import 'order_medicines_screen.dart';
import 'order_tracking_screen.dart';
import 'refill_page_screen.dart';

class MedicationsScreen extends StatefulWidget {
  const MedicationsScreen({super.key});

  @override
  State<MedicationsScreen> createState() => _MedicationsScreenState();
}

class _MedicationsScreenState extends State<MedicationsScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  Map<String, dynamic> _summary = const {};
  List<Map<String, dynamic>> _todaySchedule = const [];
  List<Map<String, dynamic>> _refillAlerts = const [];
  List<Map<String, dynamic>> _orders = const [];
  final Set<String> _updatingScheduleIds = <String>{};
  Timer? _midnightResetTimer;

  @override
  void initState() {
    super.initState();
    _scheduleMidnightReset();
    _loadMedicationDashboard();
  }

  @override
  void dispose() {
    _midnightResetTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadMedicationDashboard() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final dashboard = await PatientApiService.getMedicationDashboard();
      final summary = _toMap(dashboard['summary']);
      final schedule = _mapList(dashboard['todaySchedule']);
      final refill = _mapList(dashboard['refillAlerts']);
      var orders = _mapList(dashboard['activeOrders']);
      if (orders.isEmpty) {
        orders = await PatientApiService.getMedicationOrders(limit: 5);
      }
      try {
        await MedicationNotificationService.syncMedicationReminders(schedule);
      } catch (_) {
        // Medication data should still render if local notification setup fails.
      }

      if (!mounted) return;
      setState(() {
        _summary = summary;
        _todaySchedule = schedule;
        _refillAlerts = refill;
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

  bool _isTakenToday(Map<String, dynamic> schedule) {
    final lastTakenAt = DateTime.tryParse(schedule['lastTakenAt']?.toString() ?? '');
    if (lastTakenAt == null) return false;
    final now = DateTime.now();
    final local = lastTakenAt.toLocal();
    return local.year == now.year &&
        local.month == now.month &&
        local.day == now.day;
  }

  Future<void> _markTaken(Map<String, dynamic> schedule) async {
    final id = _text(schedule['id']);
    if (id.isEmpty || _updatingScheduleIds.contains(id)) return;

    setState(() => _updatingScheduleIds.add(id));
    try {
      await PatientApiService.markMedicationTaken(id);
      await _loadMedicationDashboard();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Medication marked as taken')),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(PatientApiService.friendlyError(error))),
      );
    } finally {
      if (mounted) {
        setState(() => _updatingScheduleIds.remove(id));
      }
    }
  }

  Future<void> _changeScheduleStatus(Map<String, dynamic> schedule, String action) async {
    final id = _text(schedule['id']);
    if (id.isEmpty || _updatingScheduleIds.contains(id)) return;

    setState(() => _updatingScheduleIds.add(id));
    try {
      await PatientApiService.updateMedicationScheduleStatus(
        scheduleId: id,
        action: action,
      );
      await _loadMedicationDashboard();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(PatientApiService.friendlyError(error))),
      );
    } finally {
      if (mounted) {
        setState(() => _updatingScheduleIds.remove(id));
      }
    }
  }

  void _scheduleMidnightReset() {
    _midnightResetTimer?.cancel();
    final now = DateTime.now();
    final tomorrow = DateTime(now.year, now.month, now.day + 1);
    final delay = tomorrow.difference(now) + const Duration(seconds: 2);
    _midnightResetTimer = Timer(delay, () {
      if (!mounted) return;
      _loadMedicationDashboard();
      _scheduleMidnightReset();
    });
  }

  Future<void> _deleteSchedule(Map<String, dynamic> schedule) async {
    final id = _text(schedule['id']);
    if (id.isEmpty || _updatingScheduleIds.contains(id)) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remove medicine?'),
        content: Text(
          'Remove ${_text(schedule['medicineName'], 'this medicine')} from your schedule?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    setState(() => _updatingScheduleIds.add(id));
    try {
      await PatientApiService.deleteMedicationSchedule(id);
      await MedicationNotificationService.cancelMedicationReminder(id);
      await _loadMedicationDashboard();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(PatientApiService.friendlyError(error))),
      );
    } finally {
      if (mounted) setState(() => _updatingScheduleIds.remove(id));
    }
  }

  Future<void> _showScheduleForm([Map<String, dynamic>? schedule]) async {
    final existingSchedule = schedule;
    final editing = existingSchedule != null;
    var medicineCatalog = <Map<String, dynamic>>[];
    try {
      medicineCatalog = await PatientApiService.getOrderableMedicines(limit: 100);
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(PatientApiService.friendlyError(error))),
      );
      return;
    }

    var selectedMedicineId = existingSchedule == null
        ? ''
        : _text(existingSchedule['medicineId']);
    if (selectedMedicineId.isNotEmpty &&
        !medicineCatalog.any((item) => _text(item['medicineId']) == selectedMedicineId)) {
      medicineCatalog = [
        {
          'medicineId': selectedMedicineId,
          'name': _text(existingSchedule!['medicineName'], 'Medicine'),
          'type': _text(existingSchedule['dosage']),
        },
        ...medicineCatalog,
      ];
    }

    final quantityController = TextEditingController(
      text: existingSchedule == null
          ? '1'
          : _toInt(existingSchedule['quantity'], 1).toString(),
    );
    final instructionsController = TextEditingController(
      text: existingSchedule == null ? '' : _text(existingSchedule['instructions']),
    );
    TimeOfDay selectedTime = _parseTimeOfDay(
      existingSchedule == null ? '' : _text(existingSchedule['timeOfDay']),
    );
    bool isSaving = false;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFFFFFDF8),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            Future<void> save() async {
              final quantity = int.tryParse(quantityController.text.trim()) ?? 1;
              var closeSheet = false;
              if (selectedMedicineId.isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Select a medicine from the catalog')),
                );
                return;
              }

              setSheetState(() => isSaving = true);
              final timeText = _timeToApi(selectedTime);
              try {
                if (existingSchedule != null) {
                  await PatientApiService.updateMedicationSchedule(
                    scheduleId: _text(existingSchedule['id']),
                    medicineId: selectedMedicineId,
                    quantity: quantity,
                    timeOfDay: timeText,
                    instructions: instructionsController.text,
                  );
                } else {
                  await PatientApiService.createMedicationSchedule(
                    medicineId: selectedMedicineId,
                    quantity: quantity,
                    timeOfDay: timeText,
                    instructions: instructionsController.text,
                  );
                }
                if (!mounted) return;
                closeSheet = true;
                Navigator.pop(context);
                await _loadMedicationDashboard();
              } catch (error) {
                if (!mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(PatientApiService.friendlyError(error))),
                );
              } finally {
                if (!closeSheet && mounted) {
                  setSheetState(() => isSaving = false);
                }
              }
            }

            return Padding(
              padding: EdgeInsets.only(
                left: 16,
                right: 16,
                top: 18,
                bottom: MediaQuery.of(context).viewInsets.bottom + 18,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    editing ? 'Edit Medicine Schedule' : 'Add Medicine Schedule',
                    style: const TextStyle(
                      color: Color(0xFF3B1F0A),
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    value: selectedMedicineId.isEmpty ? null : selectedMedicineId,
                    isExpanded: true,
                    decoration: _inputDecoration('Medicine'),
                    items: medicineCatalog.map((medicine) {
                      final id = _text(medicine['medicineId'], _text(medicine['id']));
                      final name = _text(medicine['name'], 'Medicine');
                      final type = _text(medicine['type']);
                      return DropdownMenuItem<String>(
                        value: id,
                        child: Text(
                          type.isEmpty ? name : '$name - $type',
                          overflow: TextOverflow.ellipsis,
                        ),
                      );
                    }).toList(),
                    onChanged: isSaving
                        ? null
                        : (value) {
                            setSheetState(() => selectedMedicineId = value ?? '');
                          },
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: quantityController,
                          keyboardType: TextInputType.number,
                          decoration: _inputDecoration('Quantity'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () async {
                            final picked = await showTimePicker(
                              context: context,
                              initialTime: selectedTime,
                            );
                            if (picked != null) {
                              setSheetState(() => selectedTime = picked);
                            }
                          },
                          icon: const Icon(Icons.schedule, size: 18),
                          label: Text(selectedTime.format(context)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: instructionsController,
                    minLines: 2,
                    maxLines: 3,
                    decoration: _inputDecoration('Instructions'),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: isSaving ? null : save,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF3B1F0A),
                        foregroundColor: const Color(0xFFFBF6EC),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      child: Text(isSaving ? 'Saving...' : 'Save Schedule'),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );

    quantityController.dispose();
    instructionsController.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final totalDoses = _toInt(_summary['totalDosesToday']);
    final takenDoses = _toInt(_summary['takenDosesToday']);
    final percent = _toInt(_summary['adherencePercent']);

    return Scaffold(
      backgroundColor: const Color(0xFFFFFDF8),
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          onRefresh: _loadMedicationDashboard,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 24, 16, 100),
            children: [
              if (_isLoading)
                const Padding(
                  padding: EdgeInsets.only(top: 80),
                  child: Center(
                    child: CircularProgressIndicator(color: Color(0xFFD4822A)),
                  ),
                )
              else if (_errorMessage != null)
                Padding(
                  padding: const EdgeInsets.only(top: 60),
                  child: Text(
                    _errorMessage!,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Color(0xFF6B3A1F),
                      fontSize: 13,
                    ),
                  ),
                )
              else ...[
                Container(
                  width: 160,
                  height: 160,
                  margin: const EdgeInsets.only(bottom: 16),
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      CircularProgressIndicator(
                        value: (percent.clamp(0, 100)) / 100,
                        strokeWidth: 12,
                        backgroundColor: const Color(0xFFEFE2CC),
                        color: const Color(0xFFA0622A),
                      ),
                      Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              '$percent%',
                              style: const TextStyle(
                                color: Color(0xFF3B1F0A),
                                fontSize: 36,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const Text(
                              'completed',
                              style: TextStyle(
                                color: Color(0xFFA0622A),
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const Text(
                  "Today's Medications",
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Color(0xFF3B1F0A),
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '$takenDoses of $totalDoses doses taken',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Color(0xFF6B3A1F),
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 24),

                Row(
                  children: [
                    const Expanded(
                      child: Text(
                        "Today's Schedule",
                        style: TextStyle(
                          color: Color(0xFF3B1F0A),
                          fontSize: 15,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                    TextButton.icon(
                      onPressed: () => _showScheduleForm(),
                      icon: const Icon(Icons.add, size: 18),
                      label: const Text('Add'),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                if (_todaySchedule.isEmpty)
                  const Padding(
                    padding: EdgeInsets.only(bottom: 12),
                    child: Text(
                      'No medication schedule found yet.',
                      style: TextStyle(
                        color: Color(0xFF6B3A1F),
                        fontSize: 12,
                      ),
                    ),
                  ),
                ..._todaySchedule.map((med) {
                  final isDone = _isTakenToday(med);
                  final scheduleId = _text(med['id']);
                  final medStatus = _text(med['status'], 'ACTIVE').toUpperCase();
                  final isPaused = medStatus == 'PAUSED';
                  final isUpdating = _updatingScheduleIds.contains(scheduleId);
                  final status = isDone ? 'Done' : 'Pending';
                  final statusBgColor =
                      isPaused ? Colors.grey.shade200 : (isDone ? Colors.green.shade100 : Colors.amber.shade100);
                  final statusTextColor =
                      isPaused ? Colors.grey.shade700 : (isDone ? Colors.green.shade700 : Colors.amber.shade700);

                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFBF6EC),
                      border: Border.all(color: const Color(0xFFEFE2CC)),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Column(
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '${_text(med['medicineName'], 'Medicine')} x${_toInt(med['quantity'], 1)} ${_text(med['dosage'])}',
                                    style: const TextStyle(
                                      color: Color(0xFF3B1F0A),
                                      fontSize: 14,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    [
                                      _formatTime(_text(med['timeOfDay'])),
                                      if (_text(med['instructions']).isNotEmpty)
                                        _text(med['instructions']),
                                      if (isPaused) 'paused',
                                    ].join(' - '),
                                    style: const TextStyle(
                                      color: Color(0xFF6B3A1F),
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                              decoration: BoxDecoration(
                                color: statusBgColor,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                isPaused ? 'Paused' : status,
                                style: TextStyle(
                                  color: statusTextColor,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: isUpdating || isDone || isPaused ? null : () => _markTaken(med),
                                icon: isUpdating
                                    ? const SizedBox(
                                        width: 14,
                                        height: 14,
                                        child: CircularProgressIndicator(strokeWidth: 2),
                                      )
                                    : const Icon(Icons.check_circle_outline, size: 16),
                                label: const Text('Mark Taken'),
                              ),
                            ),
                            const SizedBox(width: 8),
                            PopupMenuButton<String>(
                              enabled: !isUpdating,
                              onSelected: (action) {
                                if (action == 'edit') {
                                  _showScheduleForm(med);
                                } else if (action == 'delete') {
                                  _deleteSchedule(med);
                                } else {
                                  _changeScheduleStatus(med, action);
                                }
                              },
                              itemBuilder: (_) => [
                                const PopupMenuItem(value: 'edit', child: Text('Edit')),
                                PopupMenuItem(
                                  value: isPaused ? 'resume' : 'pause',
                                  child: Text(isPaused ? 'Resume' : 'Pause'),
                                ),
                                const PopupMenuItem(value: 'cancel', child: Text('Cancel')),
                                const PopupMenuItem(value: 'delete', child: Text('Remove')),
                              ],
                            ),
                          ],
                        ),
                      ],
                    ),
                  );
                }),
                const SizedBox(height: 16),

                if (_refillAlerts.isNotEmpty) ...[
                  const Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      'Refill Alerts',
                      style: TextStyle(
                        color: Color(0xFF3B1F0A),
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  ..._refillAlerts.map((med) {
                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.amber.shade50,
                        border: Border.all(color: Colors.amber.shade200),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(Icons.error_outline, color: Colors.amber.shade600, size: 20),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _text(med['medicineName'], 'Medicine'),
                                  style: TextStyle(
                                    color: Colors.amber.shade900,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'Low stock - Qty ${_toInt(med['quantity'])} (reorder at ${_toInt(med['reorderLevel'])})',
                                  style: TextStyle(color: Colors.amber.shade700, fontSize: 12),
                                ),
                                const SizedBox(height: 8),
                                GestureDetector(
                                  onTap: () async {
                                    await Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) => RefillPageScreen(
                                          initialItems: _refillAlerts,
                                        ),
                                      ),
                                    );
                                    if (mounted) _loadMedicationDashboard();
                                  },
                                  child: Text(
                                    'Refill Now ->',
                                    style: TextStyle(
                                      color: Colors.amber.shade700,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w500,
                                      decoration: TextDecoration.underline,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                  const SizedBox(height: 16),
                ],

                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () async {
                      await Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const OrderMedicinesScreen()),
                      );
                      if (mounted) _loadMedicationDashboard();
                    },
                    icon: const Icon(Icons.add, size: 20),
                    label: const Text('Order Medicines'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF3B1F0A),
                      foregroundColor: const Color(0xFFFBF6EC),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      elevation: 0,
                      textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500),
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                const Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'Ongoing Orders',
                    style: TextStyle(
                      color: Color(0xFF3B1F0A),
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                if (_orders.isEmpty)
                  const Text(
                    'No active orders.',
                    style: TextStyle(color: Color(0xFF6B3A1F), fontSize: 12),
                  ),
                ..._orders.map((order) {
                  final items = _mapList(order['items']);
                  final itemLabel = items.isEmpty
                      ? 'Medication order'
                      : '${_text(items.first['name'], 'Medicine')} x${_toInt(items.first['quantity'])}';
                  final expectedDelivery =
                      _text(order['expectedDeliveryAt']).isNotEmpty
                          ? _text(order['expectedDeliveryAt'])
                          : _text(order['orderedAt']);

                  return GestureDetector(
                    onTap: () async {
                      await Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => OrderTrackingScreen(
                            orderId: _text(order['id']),
                          ),
                        ),
                      );
                      if (mounted) _loadMedicationDashboard();
                    },
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFBF6EC),
                        border: Border.all(color: const Color(0xFFEFE2CC)),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                _text(order['id']),
                                style: const TextStyle(
                                  color: Color(0xFFA0622A),
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              const Icon(Icons.chevron_right, color: Color(0xFFA0622A), size: 16),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            itemLabel,
                            style: const TextStyle(
                              color: Color(0xFF3B1F0A),
                              fontSize: 13,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                _text(order['status']),
                                style: const TextStyle(
                                  color: Color(0xFFD4822A),
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              Text(
                                'Delivery: ${_formatDate(expectedDelivery)}',
                                style: const TextStyle(
                                  color: Color(0xFF6B3A1F),
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                }),
              ],
            ],
          ),
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

  List<Map<String, dynamic>> _mapList(dynamic value) {
    if (value is! List) return const [];
    return value
        .whereType<Map>()
        .map((entry) => entry.map((k, v) => MapEntry(k.toString(), v)))
        .toList();
  }

  Map<String, dynamic> _toMap(dynamic value) {
    if (value is! Map) return const {};
    return value.map((k, v) => MapEntry(k.toString(), v));
  }

  String _formatTime(String hhmm) {
    final parts = hhmm.split(':');
    if (parts.length < 2) return hhmm;
    final hour = int.tryParse(parts[0]) ?? 0;
    final minute = int.tryParse(parts[1]) ?? 0;
    final suffix = hour >= 12 ? 'PM' : 'AM';
    final twelveHour = hour % 12 == 0 ? 12 : hour % 12;
    return '${twelveHour.toString().padLeft(2, '0')}:${minute.toString().padLeft(2, '0')} $suffix';
  }

  String _formatDate(String isoString) {
    try {
      final date = DateTime.parse(isoString);
      final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return '${months[date.month - 1]} ${date.day}';
    } catch (_) {
      return isoString;
    }
  }

  TimeOfDay _parseTimeOfDay(String value) {
    final parts = value.split(':');
    if (parts.length >= 2) {
      final hour = int.tryParse(parts[0]);
      final minute = int.tryParse(parts[1]);
      if (hour != null &&
          minute != null &&
          hour >= 0 &&
          hour <= 23 &&
          minute >= 0 &&
          minute <= 59) {
        return TimeOfDay(hour: hour, minute: minute);
      }
    }
    return const TimeOfDay(hour: 9, minute: 0);
  }

  String _timeToApi(TimeOfDay time) {
    return '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
  }

  InputDecoration _inputDecoration(String label) {
    return InputDecoration(
      labelText: label,
      filled: true,
      fillColor: const Color(0xFFFBF6EC),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFEFE2CC)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFEFE2CC)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFD4822A)),
      ),
    );
  }
}
