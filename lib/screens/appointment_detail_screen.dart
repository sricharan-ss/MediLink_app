import 'package:flutter/material.dart';

import '../core/app_colors.dart';
import '../services/patient_api_service.dart';

class AppointmentDetailScreen extends StatefulWidget {
  final PatientAppointment appointment;
  final VoidCallback? onAppointmentUpdated;

  const AppointmentDetailScreen({
    super.key,
    required this.appointment,
    this.onAppointmentUpdated,
  });

  @override
  State<AppointmentDetailScreen> createState() => _AppointmentDetailScreenState();
}

class _AppointmentDetailScreenState extends State<AppointmentDetailScreen> {
  late PatientAppointment _appointment;
  PatientSummary? _summary;
  bool _isLoadingDetails = false;
  bool _isCancelling = false;
  bool _isRescheduling = false;
  String? _actionError;

  @override
  void initState() {
    super.initState();
    _appointment = widget.appointment;
    _refreshAppointmentDetails();
  }

  Future<void> _refreshAppointmentDetails() async {
    setState(() => _isLoadingDetails = true);
    try {
      final updated = await PatientApiService.getAppointmentDetails(_appointment.id);
      PatientSummary? summary;
      try {
        summary = await PatientApiService.getSummaryByEncounter(_appointment.id);
      } catch (_) {}

      if (!mounted) return;
      setState(() {
        _appointment = updated;
        _summary = summary;
        _isLoadingDetails = false;
      });
      widget.onAppointmentUpdated?.call();
    } catch (_) {
      if (!mounted) return;
      setState(() => _isLoadingDetails = false);
    }
  }

  bool get _canCancel {
    final status = _appointment.status.toUpperCase();
    return status == 'SCHEDULED' || status == 'CONFIRMED' || status == 'RESCHEDULED';
  }

  bool get _canReschedule {
    final status = _appointment.status.toUpperCase();
    return status == 'SCHEDULED' || status == 'CONFIRMED' || status == 'RESCHEDULED';
  }

  Color _statusColor(String status) {
    switch (status.toUpperCase()) {
      case 'CONFIRMED':
        return AppColors.success;
      case 'SCHEDULED':
      case 'RESCHEDULED':
        return AppColors.secondary;
      case 'IN_PROGRESS':
        return const Color(0xFFE67E22);
      case 'COMPLETED':
        return AppColors.primary;
      case 'CANCELLED':
        return AppColors.error;
      case 'NO_SHOW':
        return AppColors.textSecondary;
      default:
        return AppColors.secondary;
    }
  }

  String _formatDate(DateTime? date) {
    if (date == null) return 'Not available';
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return '${months[date.month - 1]} ${date.day}, ${date.year}';
  }

  String _formatTime(DateTime? date) {
    if (date == null) return 'Not available';
    final hour = date.hour;
    final minute = date.minute;
    final displayHour = hour == 0 ? 12 : (hour > 12 ? hour - 12 : hour);
    final meridiem = hour >= 12 ? 'PM' : 'AM';
    return '$displayHour:${minute.toString().padLeft(2, '0')} $meridiem';
  }

  Future<void> _showCancelDialog() async {
    final reasonController = TextEditingController();
    final shouldCancel = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          backgroundColor: AppColors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text(
            'Cancel Appointment',
            style: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 18,
              fontWeight: FontWeight.w700,
            ),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Are you sure you want to cancel this appointment?',
                style: TextStyle(color: AppColors.textSecondary, fontSize: 14),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: reasonController,
                maxLines: 3,
                decoration: InputDecoration(
                  labelText: 'Cancellation reason (optional)',
                  labelStyle: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                  hintText: 'e.g., Change in schedule, feeling better',
                  hintStyle: const TextStyle(color: Colors.black26, fontSize: 12),
                  filled: true,
                  fillColor: AppColors.paleGreen,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text(
                'Keep Appointment',
                style: TextStyle(color: AppColors.textSecondary, fontWeight: FontWeight.w600),
              ),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(dialogContext, true),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.error,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text(
                'Confirm Cancel',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        );
      },
    );

    if (shouldCancel != true) return;

    setState(() {
      _isCancelling = true;
      _actionError = null;
    });

    try {
      final updated = await PatientApiService.cancelAppointment(
        _appointment.id,
        cancellationNote: reasonController.text.trim(),
      );

      if (!mounted) return;
      setState(() {
        _appointment = updated;
        _isCancelling = false;
      });
      widget.onAppointmentUpdated?.call();

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Appointment cancelled successfully.'),
          backgroundColor: AppColors.primary,
        ),
      );
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _isCancelling = false;
        _actionError = PatientApiService.friendlyError(error);
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_actionError!),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  Future<void> _openRescheduleSheet() async {
    final doctorId = _appointment.doctor?.id ?? _appointment.doctorId ?? '';
    final hospitalId = _appointment.hospital?.id ?? _appointment.hospitalId;

    DateTime viewMonth = DateTime.now();
    DateTime selectedDate = DateTime(viewMonth.year, viewMonth.month, viewMonth.day).add(const Duration(days: 1));
    String? selectedTime;
    List<PatientSlot> availableSlots = [];
    bool loadingSlots = false;
    String? slotError;

    final result = await showModalBottomSheet<DateTime?>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            void loadSlotsForDate(DateTime date) async {
              setSheetState(() {
                loadingSlots = true;
                slotError = null;
                availableSlots = [];
              });
              try {
                final slots = await PatientApiService.getDoctorSlots(
                  doctorId: doctorId,
                  hospitalId: hospitalId,
                  date: date,
                );
                setSheetState(() {
                  availableSlots = slots;
                  loadingSlots = false;
                });
              } catch (e) {
                setSheetState(() {
                  loadingSlots = false;
                  slotError = 'Could not load slots for this day.';
                });
              }
            }

            if (availableSlots.isEmpty && !loadingSlots && slotError == null) {
              loadSlotsForDate(selectedDate);
            }

            final firstDayOfMonth = DateTime(viewMonth.year, viewMonth.month, 1);
            final firstWeekday = firstDayOfMonth.weekday == 7 ? 0 : firstDayOfMonth.weekday;
            final daysInMonth = DateTime(viewMonth.year, viewMonth.month + 1, 0).day;
            final cells = <DateTime?>[];
            for (var i = 0; i < firstWeekday; i++) {
              cells.add(null);
            }
            for (var d = 1; d <= daysInMonth; d++) {
              cells.add(DateTime(viewMonth.year, viewMonth.month, d));
            }

            return Container(
              height: MediaQuery.of(context).size.height * 0.85,
              decoration: const BoxDecoration(
                color: AppColors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: AppColors.sage,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Reschedule Appointment',
                    style: TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Select a new date and time with ${_appointment.doctor?.name ?? 'your doctor'}.',
                    style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${_monthName(viewMonth.month)} ${viewMonth.year}',
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Row(
                        children: [
                          IconButton(
                            icon: const Icon(Icons.chevron_left, color: AppColors.primary),
                            onPressed: () {
                              setSheetState(() {
                                viewMonth = DateTime(viewMonth.year, viewMonth.month - 1, 1);
                              });
                            },
                          ),
                          IconButton(
                            icon: const Icon(Icons.chevron_right, color: AppColors.primary),
                            onPressed: () {
                              setSheetState(() {
                                viewMonth = DateTime(viewMonth.year, viewMonth.month + 1, 1);
                              });
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) {
                      return SizedBox(
                        width: 36,
                        child: Text(
                          day,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    height: 180,
                    child: GridView.builder(
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 7,
                        childAspectRatio: 1.2,
                        mainAxisSpacing: 4,
                        crossAxisSpacing: 4,
                      ),
                      itemCount: cells.length,
                      itemBuilder: (context, index) {
                        final date = cells[index];
                        if (date == null) return const SizedBox();

                        final isPast = date.isBefore(DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day));
                        final isSelected = selectedDate.year == date.year &&
                            selectedDate.month == date.month &&
                            selectedDate.day == date.day;

                        return GestureDetector(
                          onTap: isPast
                              ? null
                              : () {
                                  setSheetState(() {
                                    selectedDate = date;
                                    selectedTime = null;
                                  });
                                  loadSlotsForDate(date);
                                },
                          child: Container(
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? AppColors.primary
                                  : (isPast ? Colors.transparent : AppColors.paleGreen),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              '${date.day}',
                              style: TextStyle(
                                color: isSelected
                                    ? Colors.white
                                    : (isPast ? Colors.black26 : AppColors.textPrimary),
                                fontSize: 13,
                                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  const Divider(color: AppColors.paleGreen, height: 24),
                  const Text(
                    'Available Time Slots',
                    style: TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Expanded(
                    child: loadingSlots
                        ? const Center(child: CircularProgressIndicator(color: AppColors.secondary))
                        : availableSlots.isEmpty
                            ? Center(
                                child: Text(
                                  slotError ?? 'No available slots for this day.',
                                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                                ),
                              )
                            : GridView.builder(
                                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                  crossAxisCount: 3,
                                  childAspectRatio: 2.2,
                                  mainAxisSpacing: 8,
                                  crossAxisSpacing: 8,
                                ),
                                itemCount: availableSlots.length,
                                itemBuilder: (context, index) {
                                  final slot = availableSlots[index];
                                  final isSlotSelected = selectedTime == slot.time;
                                  return GestureDetector(
                                    onTap: slot.available
                                        ? () {
                                            setSheetState(() {
                                              selectedTime = slot.time;
                                            });
                                          }
                                        : null,
                                    child: Container(
                                      decoration: BoxDecoration(
                                        color: isSlotSelected
                                            ? AppColors.secondary
                                            : (slot.available ? AppColors.paleGreen : Colors.black12),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      alignment: Alignment.center,
                                      child: Text(
                                        _displaySlotTime(slot.time),
                                        style: TextStyle(
                                          color: isSlotSelected
                                              ? Colors.white
                                              : (slot.available ? AppColors.textPrimary : Colors.black38),
                                          fontSize: 12,
                                          fontWeight: isSlotSelected ? FontWeight.w700 : FontWeight.w500,
                                        ),
                                      ),
                                    ),
                                  );
                                },
                              ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: selectedTime == null
                          ? null
                          : () {
                              final parts = selectedTime!.split(':');
                              final hour = int.tryParse(parts.first) ?? 9;
                              final minute = parts.length > 1 ? int.tryParse(parts[1]) ?? 0 : 0;
                              final newDateTime = DateTime(
                                selectedDate.year,
                                selectedDate.month,
                                selectedDate.day,
                                hour,
                                minute,
                              );
                              Navigator.pop(sheetContext, newDateTime);
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text(
                        'Confirm Reschedule',
                        style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );

    if (result == null || !mounted) return;

    // Show Confirmation Dialog with Before/After
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          backgroundColor: AppColors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text(
            'Confirm Reschedule',
            style: TextStyle(color: AppColors.textPrimary, fontSize: 18, fontWeight: FontWeight.w700),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Current Appointment:', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
              Text(
                '${_formatDate(_appointment.scheduledTime)} at ${_formatTime(_appointment.scheduledTime)}',
                style: const TextStyle(color: AppColors.textPrimary, fontSize: 14, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 14),
              const Text('New Appointment:', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
              Text(
                '${_formatDate(result)} at ${_formatTime(result)}',
                style: const TextStyle(color: AppColors.primary, fontSize: 15, fontWeight: FontWeight.w700),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('Cancel', style: TextStyle(color: AppColors.textSecondary)),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(dialogContext, true),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text('Confirm', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
            ),
          ],
        );
      },
    );

    if (confirmed != true) return;

    setState(() {
      _isRescheduling = true;
      _actionError = null;
    });

    try {
      final updated = await PatientApiService.rescheduleAppointment(
        _appointment.id,
        result,
      );

      if (!mounted) return;
      setState(() {
        _appointment = updated;
        _isRescheduling = false;
      });
      widget.onAppointmentUpdated?.call();

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Appointment rescheduled successfully.'),
          backgroundColor: AppColors.primary,
        ),
      );
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _isRescheduling = false;
        _actionError = PatientApiService.friendlyError(error);
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_actionError!),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  String _monthName(int month) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  }

  String _displaySlotTime(String slotTime) {
    final parts = slotTime.split(':');
    final hour = int.tryParse(parts.first) ?? 9;
    final minute = parts.length > 1 ? int.tryParse(parts[1]) ?? 0 : 0;
    final displayHour = hour == 0 ? 12 : (hour > 12 ? hour - 12 : hour);
    final meridiem = hour >= 12 ? 'PM' : 'AM';
    return '$displayHour:${minute.toString().padLeft(2, '0')} $meridiem';
  }

  @override
  Widget build(BuildContext context) {
    final doctorName = _appointment.doctor?.name ?? 'Doctor Appointment';
    final doctorSpecialty = _appointment.doctor?.specialty ?? 'General Practice';
    final hospitalName = _appointment.hospital?.name ?? _appointment.doctor?.hospitalName ?? 'MediLink Hospital';
    final status = _appointment.status.toUpperCase();
    final statusBadgeColor = _statusColor(status);

    return Scaffold(
      backgroundColor: AppColors.white,
      appBar: AppBar(
        title: const Text('Appointment Details'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _isLoadingDetails ? null : _refreshAppointmentDetails,
          ),
        ],
      ),
      body: _isLoadingDetails
          ? const Center(child: CircularProgressIndicator(color: AppColors.secondary))
          : ListView(
              padding: const EdgeInsets.all(20),
              children: [
                // Top Status Card
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.paleGreen,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.sage),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Status',
                            style: TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: statusBadgeColor.withAlpha(40),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: statusBadgeColor),
                            ),
                            child: Text(
                              status,
                              style: TextStyle(
                                color: statusBadgeColor,
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (_appointment.tokenNo > 0)
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            const Text(
                              'Token Number',
                              style: TextStyle(
                                color: AppColors.textSecondary,
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '#${_appointment.tokenNo}',
                              style: const TextStyle(
                                color: AppColors.primary,
                                fontSize: 20,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Doctor Information Card
                _buildCard(
                  title: 'Doctor & Hospital',
                  icon: Icons.person_outline,
                  children: [
                    _buildField('Doctor Name', doctorName),
                    _buildField('Specialization', doctorSpecialty),
                    _buildField('Hospital', hospitalName),
                    if (_appointment.doctor?.experience != null)
                      _buildField('Experience', '${_appointment.doctor!.experience} years'),
                  ],
                ),
                const SizedBox(height: 16),

                // Schedule Details Card
                _buildCard(
                  title: 'Schedule & Timing',
                  icon: Icons.calendar_today_outlined,
                  children: [
                    _buildField('Date', _formatDate(_appointment.scheduledTime)),
                    _buildField('Time', _formatTime(_appointment.scheduledTime)),
                    _buildField('Duration', '${_appointment.duration} minutes'),
                    _buildField('Visit Type', _appointment.visitType ?? 'OPD'),
                  ],
                ),
                const SizedBox(height: 16),

                // Clinical & Encounter Details
                _buildCard(
                  title: 'Encounter Information',
                  icon: Icons.medical_information_outlined,
                  children: [
                    _buildField('Reason for Visit', _appointment.reason ?? 'Not available'),
                    if ((_appointment.notes ?? '').trim().isNotEmpty)
                      _buildField('Notes', _appointment.notes!),
                    if ((_appointment.chiefComplaint ?? '').trim().isNotEmpty)
                      _buildField('Chief Complaint', _appointment.chiefComplaint!),
                    if ((_appointment.diagnosis ?? '').trim().isNotEmpty)
                      _buildField('Diagnosis', _appointment.diagnosis!),
                    if ((_appointment.outcome ?? '').trim().isNotEmpty)
                      _buildField('Outcome', _appointment.outcome!),
                    if (_appointment.followUpDate != null)
                      _buildField('Follow-Up Date', _formatDate(_appointment.followUpDate)),
                    if ((_appointment.cancellationNote ?? '').trim().isNotEmpty)
                      _buildField('Cancellation Reason', _appointment.cancellationNote!, isHighlight: true),
                  ],
                ),
                const SizedBox(height: 16),

                // Medical Summary
                _buildCard(
                  title: 'Medical Summary',
                  icon: Icons.assignment_outlined,
                  children: [
                    if (_summary == null)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 4),
                        child: Text(
                          'No summary available',
                          style: TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 13,
                            fontStyle: FontStyle.italic,
                          ),
                        ),
                      )
                    else ...[
                      if ((_summary!.keyFindings ?? '').trim().isNotEmpty)
                        _buildField('Key Findings', _summary!.keyFindings!),
                      if ((_summary!.recommendations ?? '').trim().isNotEmpty)
                        _buildField('Recommendations', _summary!.recommendations!),
                      if ((_summary!.riskFactors ?? '').trim().isNotEmpty)
                        _buildField('Risk Factors', _summary!.riskFactors!),
                      if ((_summary!.medicalHistory ?? '').trim().isNotEmpty)
                        _buildField('Medical History', _summary!.medicalHistory!),
                      if ((_summary!.labHistory ?? '').trim().isNotEmpty)
                        _buildField('Lab History', _summary!.labHistory!),
                      if ((_summary!.generatedBy ?? '').trim().isNotEmpty)
                        _buildField('Generated By', _summary!.generatedBy!),
                      if (_summary!.generatedAt != null)
                        _buildField('Generated Date', _formatDate(_summary!.generatedAt)),
                    ],
                  ],
                ),
                const SizedBox(height: 28),

                // Action Buttons (Reschedule / Cancel)
                if (_canReschedule || _canCancel) ...[
                  if (_canReschedule)
                    ElevatedButton.icon(
                      onPressed: (_isRescheduling || _isCancelling) ? null : _openRescheduleSheet,
                      icon: _isRescheduling
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : const Icon(Icons.edit_calendar_outlined, size: 18),
                      label: Text(_isRescheduling ? 'Rescheduling...' : 'Reschedule Appointment'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  if (_canReschedule && _canCancel) const SizedBox(height: 12),
                  if (_canCancel)
                    OutlinedButton.icon(
                      onPressed: (_isCancelling || _isRescheduling) ? null : _showCancelDialog,
                      icon: _isCancelling
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.error),
                            )
                          : const Icon(Icons.cancel_outlined, size: 18, color: AppColors.error),
                      label: Text(
                        _isCancelling ? 'Cancelling...' : 'Cancel Appointment',
                        style: const TextStyle(color: AppColors.error, fontWeight: FontWeight.w600),
                      ),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: AppColors.error),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                ],
              ],
            ),
    );
  }

  Widget _buildCard({
    required String title,
    required IconData icon,
    required List<Widget> children,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.paleGreen),
        boxShadow: const [
          BoxShadow(
            color: Color(0x08000000),
            blurRadius: 8,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: AppColors.primary),
              const SizedBox(width: 8),
              Text(
                title,
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const Divider(color: AppColors.paleGreen, height: 20),
          ...children,
        ],
      ),
    );
  }

  Widget _buildField(String label, String value, {bool isHighlight = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                color: isHighlight ? AppColors.error : AppColors.textPrimary,
                fontSize: 13,
                fontWeight: isHighlight ? FontWeight.w700 : FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
