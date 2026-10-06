import 'package:flutter/material.dart';
import '../core/app_colors.dart';
import '../services/patient_api_service.dart';

const _dayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const _monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const _weekdaySlots = [
  '9:00 AM',
  '9:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '2:00 PM',
  '2:30 PM',
  '3:00 PM',
  '3:30 PM',
  '4:00 PM',
  '4:30 PM',
  '5:00 PM',
  '5:30 PM',
];

const _weekendSlots = ['10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM'];

class BookAppointmentScreen extends StatefulWidget {
  final String doctorId;
  final String? hospitalId;
  final String doctorName;
  final String doctorSpecialty;
  final String hospitalName;
  final int fee;

  const BookAppointmentScreen({
    super.key,
    required this.doctorId,
    this.hospitalId,
    required this.doctorName,
    required this.doctorSpecialty,
    required this.hospitalName,
    required this.fee,
  });

  @override
  State<BookAppointmentScreen> createState() => _BookAppointmentScreenState();
}

class _BookAppointmentScreenState extends State<BookAppointmentScreen> {
  late DateTime _today;
  late DateTime _viewMonth;
  DateTime? _selectedDate;
  String? _selectedTime;
  final _notesController = TextEditingController();
  bool _showConfirmation = false;
  bool _isLoadingSlots = false;
  bool _isBooking = false;
  String? _bookingError;
  List<PatientSlot> _availableSlots = [];

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _today = DateTime(now.year, now.month, now.day);
    _viewMonth = DateTime(_today.year, _today.month, 1);
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  List<DateTime?> _buildCalendar(int year, int month) {
    final firstDay = DateTime(year, month, 1);
    int firstDayIndex = firstDay.weekday == 7 ? 0 : firstDay.weekday;
    final daysInMonth = DateTime(year, month + 1, 0).day;

    final cells = <DateTime?>[];
    for (int i = 0; i < firstDayIndex; i++) {
      cells.add(null);
    }
    for (int d = 1; d <= daysInMonth; d++) {
      cells.add(DateTime(year, month, d));
    }
    return cells;
  }

  void _prevMonth() {
    setState(() {
      if (_viewMonth.month == 1) {
        _viewMonth = DateTime(_viewMonth.year - 1, 12, 1);
      } else {
        _viewMonth = DateTime(_viewMonth.year, _viewMonth.month - 1, 1);
      }
    });
  }

  void _nextMonth() {
    setState(() {
      if (_viewMonth.month == 12) {
        _viewMonth = DateTime(_viewMonth.year + 1, 1, 1);
      } else {
        _viewMonth = DateTime(_viewMonth.year, _viewMonth.month + 1, 1);
      }
    });
  }

  bool _isWeekend(DateTime date) => date.weekday == 7 || date.weekday == 6;

  bool _isDayDisabled(DateTime date) {
    if (date.isBefore(_today)) return true;
    return false;
  }

  List<PatientSlot> _getTimeSlots(DateTime date) {
    if (_availableSlots.isNotEmpty) return _availableSlots;
    final fallback = _isWeekend(date) ? _weekendSlots : _weekdaySlots;
    return fallback
        .map(
          (slot) => PatientSlot(time: _timeLabelToApi(slot), available: true),
        )
        .toList();
  }

  void _handleSelectDate(DateTime date) {
    if (_isDayDisabled(date)) return;
    setState(() {
      _selectedDate = date;
      _selectedTime = null;
      _availableSlots = [];
      _bookingError = null;
    });
    _loadSlots(date);
  }

  Future<void> _loadSlots(DateTime date) async {
    setState(() => _isLoadingSlots = true);
    try {
      final slots = await PatientApiService.getDoctorSlots(
        doctorId: widget.doctorId,
        hospitalId: widget.hospitalId,
        date: date,
      );
      if (!mounted) return;
      setState(() {
        _availableSlots = slots;
        _isLoadingSlots = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _isLoadingSlots = false);
    }
  }

  Future<void> _handleConfirm() async {
    if (_selectedDate == null ||
        _selectedTime == null ||
        widget.hospitalId == null) {
      setState(() {
        _bookingError = widget.hospitalId == null
            ? 'Hospital mapping is missing for this doctor.'
            : 'Please select a date and time.';
      });
      return;
    }

    setState(() {
      _isBooking = true;
      _bookingError = null;
    });

    try {
      await PatientApiService.createAppointment(
        doctorId: widget.doctorId,
        hospitalId: widget.hospitalId!,
        scheduledTime: _combineDateAndTime(_selectedDate!, _selectedTime!),
        reason: _notesController.text.trim().isEmpty
            ? 'Patient booked mobile appointment'
            : _notesController.text.trim(),
        notes: _notesController.text.trim(),
      );
      if (!mounted) return;
      setState(() {
        _isBooking = false;
        _showConfirmation = true;
      });
      Future.delayed(const Duration(milliseconds: 2500), () {
        if (mounted) {
          Navigator.pushNamedAndRemoveUntil(
            context,
            '/main-app',
            (route) => false,
          );
        }
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _isBooking = false;
        _bookingError = PatientApiService.friendlyError(error);
      });
    }
  }

  String _formatDate(DateTime date) {
    // Simple manual format: Month Day, Year
    return '${_monthNames[date.month - 1]} ${date.day}, ${date.year}';
  }

  String _timeLabelToApi(String label) {
    final parts = label.trim().split(' ');
    final hm = parts.first.split(':');
    var hour = int.tryParse(hm.first) ?? 9;
    final minute = hm.length > 1 ? int.tryParse(hm[1]) ?? 0 : 0;
    final meridiem = parts.length > 1 ? parts[1].toUpperCase() : '';
    if (meridiem == 'PM' && hour < 12) hour += 12;
    if (meridiem == 'AM' && hour == 12) hour = 0;
    return '${hour.toString().padLeft(2, '0')}:${minute.toString().padLeft(2, '0')}';
  }

  String _formatTimeLabel(String value) {
    final parts = value.split(':');
    final hour = int.tryParse(parts.first) ?? 0;
    final minute = parts.length > 1 ? int.tryParse(parts[1]) ?? 0 : 0;
    final displayHour = hour == 0 ? 12 : (hour > 12 ? hour - 12 : hour);
    final meridiem = hour >= 12 ? 'PM' : 'AM';
    return '$displayHour:${minute.toString().padLeft(2, '0')} $meridiem';
  }

  DateTime _combineDateAndTime(DateTime date, String time) {
    final parts = time.split(':');
    final hour = int.tryParse(parts.first) ?? 9;
    final minute = parts.length > 1 ? int.tryParse(parts[1]) ?? 0 : 0;
    return DateTime(date.year, date.month, date.day, hour, minute);
  }

  Widget _buildLegendItem(Color color, String text) {
    return Row(
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 6),
        Text(
          text,
          style: const TextStyle(color: Color(0xFFA0622A), fontSize: 10),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final year = _viewMonth.year;
    final month = _viewMonth.month;
    final cells = _buildCalendar(year, month);
    final isPrevDisabled = year == _today.year && month <= _today.month;
    final canConfirm = _selectedDate != null && _selectedTime != null;

    return Scaffold(
      backgroundColor: const Color(0xFFFFFDF8),
      body: Stack(
        children: [
          Column(
            children: [
              // Header
              Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.centerLeft,
                    end: Alignment.centerRight,
                    colors: [AppColors.brownDeep, AppColors.brownMid],
                  ),
                ),
                child: SafeArea(
                  bottom: false,
                  child: SizedBox(
                    height: 56,
                    child: Stack(
                      children: [
                        Align(
                          alignment: Alignment.centerLeft,
                          child: IconButton(
                            icon: const Icon(
                              Icons.arrow_back,
                              color: Colors.white,
                            ),
                            onPressed: () => Navigator.of(context).pop(),
                          ),
                        ),
                        const Center(
                          child: Text(
                            'Book Appointment',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.only(bottom: 100),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Doctor Info
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFBF6EC),
                            border: Border.all(color: const Color(0xFFEFE2CC)),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 56,
                                height: 56,
                                decoration: const BoxDecoration(
                                  shape: BoxShape.circle,
                                  gradient: LinearGradient(
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                    colors: [
                                      Color(0xFFD4822A),
                                      Color(0xFFA0622A),
                                    ],
                                  ),
                                ),
                                alignment: Alignment.center,
                                child: Text(
                                  widget.doctorName.startsWith('Dr. ') &&
                                          widget.doctorName.length > 4
                                      ? widget.doctorName[4]
                                      : (widget.doctorName.isNotEmpty
                                            ? widget.doctorName[0]
                                            : 'D'),
                                  style: const TextStyle(
                                    color: Color(0xFFFBF6EC),
                                    fontSize: 20,
                                    fontWeight: FontWeight.w500,
                                    fontFamily: 'Playfair Display',
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      widget.doctorName,
                                      style: const TextStyle(
                                        color: Color(0xFF3B1F0A),
                                        fontSize: 15,
                                        fontWeight: FontWeight.w600,
                                        fontFamily: 'Playfair Display',
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      widget.doctorSpecialty,
                                      style: const TextStyle(
                                        color: Color(0xFF6B3A1F),
                                        fontSize: 12,
                                      ),
                                    ),
                                    Text(
                                      widget.hospitalName,
                                      style: const TextStyle(
                                        color: Color(0xFFA0622A),
                                        fontSize: 11,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      '\$${widget.fee} / visit',
                                      style: const TextStyle(
                                        color: Color(0xFFD4822A),
                                        fontSize: 12,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: 24),

                        // Calendar
                        const Row(
                          children: [
                            Icon(
                              Icons.calendar_month,
                              color: Color(0xFF3B1F0A),
                              size: 16,
                            ),
                            SizedBox(width: 8),
                            Text(
                              'Select Date',
                              style: TextStyle(
                                color: Color(0xFF3B1F0A),
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Container(
                          decoration: BoxDecoration(
                            color: const Color(0xFFFBF6EC),
                            border: Border.all(color: const Color(0xFFEFE2CC)),
                            borderRadius: BorderRadius.circular(18),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Padding(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 12,
                                ),
                                child: Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    GestureDetector(
                                      onTap: isPrevDisabled ? null : _prevMonth,
                                      child: Container(
                                        width: 32,
                                        height: 32,
                                        alignment: Alignment.center,
                                        child: Icon(
                                          Icons.chevron_left,
                                          color: isPrevDisabled
                                              ? const Color(
                                                  0xFF3B1F0A,
                                                ).withOpacity(0.3)
                                              : const Color(0xFF3B1F0A),
                                          size: 20,
                                        ),
                                      ),
                                    ),
                                    Text(
                                      '${_monthNames[month - 1]} $year',
                                      style: const TextStyle(
                                        color: Color(0xFF3B1F0A),
                                        fontSize: 15,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    GestureDetector(
                                      onTap: _nextMonth,
                                      child: Container(
                                        width: 32,
                                        height: 32,
                                        alignment: Alignment.center,
                                        child: const Icon(
                                          Icons.chevron_right,
                                          color: Color(0xFF3B1F0A),
                                          size: 20,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const Divider(
                                height: 1,
                                color: Color(0xFFEFE2CC),
                              ),
                              Padding(
                                padding: const EdgeInsets.only(
                                  top: 12,
                                  left: 8,
                                  right: 8,
                                ),
                                child: Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceAround,
                                  children: _dayLabels.map((d) {
                                    final isWeekendStr = d == 'Su' || d == 'Sa';
                                    return SizedBox(
                                      width: 40,
                                      child: Text(
                                        d,
                                        textAlign: TextAlign.center,
                                        style: TextStyle(
                                          color: isWeekendStr
                                              ? const Color(
                                                  0xFFD4822A,
                                                ).withOpacity(0.7)
                                              : const Color(0xFFA0622A),
                                          fontSize: 11,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                    );
                                  }).toList(),
                                ),
                              ),
                              Padding(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 8,
                                ),
                                child: GridView.builder(
                                  shrinkWrap: true,
                                  physics: const NeverScrollableScrollPhysics(),
                                  gridDelegate:
                                      const SliverGridDelegateWithFixedCrossAxisCount(
                                        crossAxisCount: 7,
                                        childAspectRatio: 1,
                                        mainAxisSpacing: 4,
                                        crossAxisSpacing: 4,
                                      ),
                                  itemCount: cells.length,
                                  itemBuilder: (context, index) {
                                    final date = cells[index];
                                    if (date == null) return const SizedBox();

                                    final disabled = _isDayDisabled(date);
                                    final isSelected =
                                        _selectedDate != null &&
                                        _selectedDate!.year == date.year &&
                                        _selectedDate!.month == date.month &&
                                        _selectedDate!.day == date.day;
                                    final isToday =
                                        date.year == _today.year &&
                                        date.month == _today.month &&
                                        date.day == _today.day;
                                    final weekend = _isWeekend(date);

                                    Color textColor = const Color(0xFF3B1F0A);
                                    if (isSelected) {
                                      textColor = const Color(0xFFFBF6EC);
                                    } else if (weekend) {
                                      textColor = const Color(0xFFD4822A);
                                    }

                                    return GestureDetector(
                                      onTap: disabled
                                          ? null
                                          : () => _handleSelectDate(date),
                                      child: Container(
                                        decoration: BoxDecoration(
                                          color: isSelected
                                              ? const Color(0xFF3B1F0A)
                                              : Colors.transparent,
                                          borderRadius: BorderRadius.circular(
                                            10,
                                          ),
                                        ),
                                        child: Stack(
                                          alignment: Alignment.center,
                                          children: [
                                            Opacity(
                                              opacity: disabled ? 0.3 : 1.0,
                                              child: Text(
                                                '${date.day}',
                                                style: TextStyle(
                                                  color: textColor,
                                                  fontSize: 13,
                                                  fontWeight: FontWeight.w500,
                                                ),
                                              ),
                                            ),
                                            if (isToday && !isSelected)
                                              Positioned(
                                                top: 6,
                                                right: 8,
                                                child: Container(
                                                  width: 6,
                                                  height: 6,
                                                  decoration:
                                                      const BoxDecoration(
                                                        color: Color(
                                                          0xFFD4822A,
                                                        ),
                                                        shape: BoxShape.circle,
                                                      ),
                                                ),
                                              ),
                                          ],
                                        ),
                                      ),
                                    );
                                  },
                                ),
                              ),
                              Padding(
                                padding: const EdgeInsets.only(
                                  left: 16,
                                  right: 16,
                                  bottom: 12,
                                ),
                                child: Row(
                                  children: [
                                    _buildLegendItem(
                                      const Color(0xFF3B1F0A),
                                      'Selected',
                                    ),
                                    const SizedBox(width: 16),
                                    _buildLegendItem(
                                      const Color(0xFFD4822A),
                                      'Today',
                                    ),
                                    const SizedBox(width: 16),
                                    const Text(
                                      'Red',
                                      style: TextStyle(
                                        color: Color(0xFFD4822A),
                                        fontSize: 10,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                    const SizedBox(width: 4),
                                    const Text(
                                      '= Weekends',
                                      style: TextStyle(
                                        color: Color(0xFFA0622A),
                                        fontSize: 10,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),

                        if (_selectedDate != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 8, left: 4),
                            child: RichText(
                              text: TextSpan(
                                children: [
                                  const TextSpan(
                                    text: 'Selected: ',
                                    style: TextStyle(
                                      color: Color(0xFFD4822A),
                                      fontSize: 12,
                                    ),
                                  ),
                                  TextSpan(
                                    text: _formatDate(_selectedDate!),
                                    style: const TextStyle(
                                      color: Color(0xFF3B1F0A),
                                      fontSize: 12,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),

                        // Time Slots
                        if (_selectedDate != null) ...[
                          const SizedBox(height: 24),
                          const Row(
                            children: [
                              Icon(
                                Icons.schedule,
                                color: Color(0xFF3B1F0A),
                                size: 16,
                              ),
                              SizedBox(width: 8),
                              Text(
                                'Available Time Slots',
                                style: TextStyle(
                                  color: Color(0xFF3B1F0A),
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          if (_isLoadingSlots)
                            const Padding(
                              padding: EdgeInsets.symmetric(vertical: 16),
                              child: Center(
                                child: CircularProgressIndicator(
                                  color: AppColors.accent,
                                ),
                              ),
                            )
                          else
                            GridView.builder(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              gridDelegate:
                                  const SliverGridDelegateWithFixedCrossAxisCount(
                                    crossAxisCount: 3,
                                    childAspectRatio: 2.5,
                                    mainAxisSpacing: 8,
                                    crossAxisSpacing: 8,
                                  ),
                              itemCount: _getTimeSlots(_selectedDate!).length,
                              itemBuilder: (context, index) {
                                final slot = _getTimeSlots(
                                  _selectedDate!,
                                )[index];
                                final isSelected = _selectedTime == slot.time;

                                return GestureDetector(
                                  onTap: slot.available
                                      ? () => setState(
                                          () => _selectedTime = slot.time,
                                        )
                                      : null,
                                  child: Container(
                                    alignment: Alignment.center,
                                    decoration: BoxDecoration(
                                      color: isSelected
                                          ? const Color(0xFFD4822A)
                                          : slot.available
                                          ? const Color(0xFFFBF6EC)
                                          : const Color(0xFFEFE2CC),
                                      border: Border.all(
                                        color: isSelected
                                            ? const Color(0xFFD4822A)
                                            : const Color(0xFFEFE2CC),
                                      ),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Text(
                                      _formatTimeLabel(slot.time),
                                      style: TextStyle(
                                        color: isSelected
                                            ? const Color(0xFFFFFDF8)
                                            : slot.available
                                            ? const Color(0xFF6B3A1F)
                                            : const Color(
                                                0xFFA0622A,
                                              ).withOpacity(0.5),
                                        fontSize: 12,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ),
                                );
                              },
                            ),
                        ],

                        // Notes
                        const SizedBox(height: 24),
                        const Text.rich(
                          TextSpan(
                            children: [
                              TextSpan(
                                text: 'Notes for doctor ',
                                style: TextStyle(
                                  color: Color(0xFFA0622A),
                                  fontSize: 13,
                                ),
                              ),
                              TextSpan(
                                text: '(optional)',
                                style: TextStyle(
                                  color: Color(0x80A0622A),
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _notesController,
                          maxLines: 4,
                          style: const TextStyle(
                            color: Color(0xFF3B1F0A),
                            fontSize: 14,
                          ),
                          decoration: InputDecoration(
                            hintText:
                                'Describe your symptoms or reason for visit...',
                            hintStyle: TextStyle(
                              color: const Color(0xFFA0622A).withOpacity(0.5),
                              fontSize: 14,
                            ),
                            filled: true,
                            fillColor: const Color(0xFFFBF6EC),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(14),
                              borderSide: const BorderSide(
                                color: Color(0xFFEFE2CC),
                              ),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(14),
                              borderSide: const BorderSide(
                                color: Color(0xFFD4822A),
                              ),
                            ),
                          ),
                        ),

                        // Booking Summary
                        if (_selectedDate != null && _selectedTime != null) ...[
                          const SizedBox(height: 24),
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                                colors: [
                                  const Color(0xFF3B1F0A).withOpacity(0.05),
                                  const Color(0xFFD4822A).withOpacity(0.05),
                                ],
                              ),
                              border: Border.all(
                                color: const Color(0xFFEFE2CC),
                              ),
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'BOOKING SUMMARY',
                                  style: TextStyle(
                                    color: Color(0xFFA0622A),
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                                const SizedBox(height: 12),
                                _buildSummaryRow('Doctor', widget.doctorName),
                                const SizedBox(height: 6),
                                _buildSummaryRow(
                                  'Date',
                                  _formatDate(_selectedDate!),
                                ),
                                const SizedBox(height: 6),
                                _buildSummaryRow(
                                  'Time',
                                  _formatTimeLabel(_selectedTime!),
                                ),
                                const SizedBox(height: 12),
                                const Divider(
                                  color: Color(0xFFEFE2CC),
                                  height: 1,
                                ),
                                const SizedBox(height: 12),
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    const Text(
                                      'Consultation Fee',
                                      style: TextStyle(
                                        color: Color(0xFF6B3A1F),
                                        fontSize: 13,
                                      ),
                                    ),
                                    Text(
                                      '\$${widget.fee}',
                                      style: const TextStyle(
                                        color: Color(0xFFD4822A),
                                        fontSize: 14,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                        if (_bookingError != null) ...[
                          const SizedBox(height: 14),
                          Text(
                            _bookingError!,
                            style: const TextStyle(
                              color: AppColors.errorRed,
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),

          // Bottom Bar
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                color: Color(0xFFFFFDF8),
                border: Border(top: BorderSide(color: Color(0xFFEFE2CC))),
              ),
              child: ElevatedButton(
                onPressed: canConfirm && !_isBooking ? _handleConfirm : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF3B1F0A),
                  disabledBackgroundColor: const Color(
                    0xFF3B1F0A,
                  ).withOpacity(0.4),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  elevation: 0,
                ),
                child: Text(
                  _isBooking
                      ? 'Booking...'
                      : canConfirm
                      ? 'Confirm Booking'
                      : (_selectedDate != null
                            ? 'Select a Time Slot'
                            : 'Select a Date First'),
                  style: const TextStyle(
                    color: Color(0xFFFBF6EC),
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ),

          // Confirmation Bottom Sheet Overlay
          if (_showConfirmation)
            Positioned.fill(
              child: Container(
                color: Colors.black54,
                alignment: Alignment.bottomCenter,
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(24),
                  decoration: const BoxDecoration(
                    color: Color(0xFFFFFDF8),
                    borderRadius: BorderRadius.vertical(
                      top: Radius.circular(24),
                    ),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 48,
                        height: 4,
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFE2CC),
                          borderRadius: BorderRadius.circular(2),
                        ),
                        margin: const EdgeInsets.only(bottom: 24),
                      ),
                      Container(
                        width: 64,
                        height: 64,
                        decoration: const BoxDecoration(
                          color: Colors.green,
                          shape: BoxShape.circle,
                        ),
                        alignment: Alignment.center,
                        child: const Icon(
                          Icons.check,
                          color: Colors.white,
                          size: 32,
                        ),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Booking Confirmed!',
                        style: TextStyle(
                          color: Color(0xFF3B1F0A),
                          fontSize: 22,
                          fontFamily: 'Playfair Display',
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Your appointment with ${widget.doctorName} is all set.',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Color(0xFF6B3A1F),
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFBF6EC),
                          border: Border.all(color: const Color(0xFFEFE2CC)),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text(
                                  'Date',
                                  style: TextStyle(
                                    color: Color(0xFFA0622A),
                                    fontSize: 12,
                                  ),
                                ),
                                Text(
                                  _formatDate(_selectedDate!),
                                  style: const TextStyle(
                                    color: Color(0xFF3B1F0A),
                                    fontSize: 13,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text(
                                  'Time',
                                  style: TextStyle(
                                    color: Color(0xFFA0622A),
                                    fontSize: 12,
                                  ),
                                ),
                                Text(
                                  _formatTimeLabel(_selectedTime!),
                                  style: const TextStyle(
                                    color: Color(0xFF3B1F0A),
                                    fontSize: 13,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: () => Navigator.pushNamedAndRemoveUntil(
                            context,
                            '/main-app',
                            (route) => false,
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF3B1F0A),
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                            elevation: 0,
                          ),
                          child: const Text(
                            'Done',
                            style: TextStyle(
                              color: Color(0xFFFBF6EC),
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(color: Color(0xFF6B3A1F), fontSize: 13),
        ),
        Text(
          value,
          style: const TextStyle(
            color: Color(0xFF3B1F0A),
            fontSize: 13,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}
