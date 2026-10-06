import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../core/app_colors.dart';
import '../core/session_store.dart';
import '../services/medication_notification_service.dart';
import '../services/patient_api_service.dart';
import '../screens/doctor_profile_screen.dart';
import '../screens/hospital_detail_screen.dart';
import 'profile_screen.dart';
import 'medications_screen.dart';
import 'medical_history_screen.dart';
import 'order_tracking_screen.dart';
import 'appointment_detail_screen.dart';

class MainAppScreen extends StatefulWidget {
  const MainAppScreen({super.key});

  @override
  State<MainAppScreen> createState() => _MainAppScreenState();
}

class _MainAppScreenState extends State<MainAppScreen> {
  int _selectedIndex = 0;
  bool _locationChecked = false;
  int _homeRefreshSeed = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkLocationPermission();
    });
  }

  Future<void> _checkLocationPermission() async {
    if (_locationChecked) return;
    _locationChecked = true;

    LocationPermission permission = await Geolocator.checkPermission();

    if (permission == LocationPermission.denied) {
      // Show custom dialog first
      if (!mounted) return;
      final shouldRequest = await showDialog<bool>(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => Dialog(
          backgroundColor: AppColors.warmWhite,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 64,
                  height: 64,
                  decoration: const BoxDecoration(
                    color: Color(0xFFE8F5E9),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.location_on,
                      color: Color(0xFF2E7D32), size: 32),
                ),
                const SizedBox(height: 18),
                const Text(
                  'Enable Location',
                  style: TextStyle(
                    color: AppColors.brownDeep,
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 10),
                const Text(
                  'MediLink uses your location to find nearby hospitals and doctors for you.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 14,
                    fontWeight: FontWeight.w400,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(ctx, true),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.brownDeep,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14)),
                    ),
                    child: const Text(
                      'Allow Location',
                      style: TextStyle(
                        color: AppColors.cream,
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                GestureDetector(
                  onTap: () => Navigator.pop(ctx, false),
                  child: const Text(
                    'Not Now',
                    style: TextStyle(
                      color: AppColors.brownLight,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );

      if (shouldRequest == true) {
        await Geolocator.requestPermission();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.warmWhite,
      body: IndexedStack(
        index: _selectedIndex,
        children: [
          _HomeTab(
            refreshSeed: _homeRefreshSeed,
            onOpenMedications: () => setState(() => _selectedIndex = 1),
          ),
          const MedicationsScreen(),
          const MedicalHistoryScreen(),
          ProfileScreen(onBack: () => setState(() => _selectedIndex = 0)),
        ],
      ),
      bottomNavigationBar: _BottomNav(
        selectedIndex: _selectedIndex,
        onTap: (i) => setState(() {
          if (i == 0) _homeRefreshSeed++;
          _selectedIndex = i;
        }),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Home Tab
// ─────────────────────────────────────────────────────────────
class _HomeTab extends StatefulWidget {
  const _HomeTab({
    required this.refreshSeed,
    required this.onOpenMedications,
  });

  final int refreshSeed;
  final VoidCallback onOpenMedications;

  @override
  State<_HomeTab> createState() => _HomeTabState();
}

class _HomeTabState extends State<_HomeTab> {
  bool _isLoading = true;
  String? _errorMessage;
  List<PatientAppointment> _appointments = <PatientAppointment>[];
  List<PatientHospital> _hospitals = <PatientHospital>[];
  List<PatientDoctor> _doctors = <PatientDoctor>[];
  Map<String, dynamic> _medicationDashboard = const {};
  List<Map<String, dynamic>> _recentOrders = const [];
  Timer? _midnightResetTimer;

  @override
  void initState() {
    super.initState();
    _scheduleMidnightReset();
    _loadHomeData();
  }

  @override
  void dispose() {
    _midnightResetTimer?.cancel();
    super.dispose();
  }

  void _scheduleMidnightReset() {
    _midnightResetTimer?.cancel();
    final now = DateTime.now();
    final tomorrow = DateTime(now.year, now.month, now.day + 1);
    final delay = tomorrow.difference(now) + const Duration(seconds: 2);
    _midnightResetTimer = Timer(delay, () {
      if (!mounted) return;
      _loadHomeData();
      _scheduleMidnightReset();
    });
  }

  @override
  void didUpdateWidget(covariant _HomeTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.refreshSeed != widget.refreshSeed) {
      _loadHomeData();
    }
  }

  Future<void> _loadHomeData() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final results = await Future.wait<dynamic>([
        PatientApiService.getAppointments(),
        PatientApiService.getHospitals(),
        PatientApiService.getDoctors(),
        PatientApiService.getMedicationDashboard(),
        PatientApiService.getMedicationOrders(limit: 1),
      ]);

      final medicationDashboard = results[3] as Map<String, dynamic>;
      final schedule = _mapList(medicationDashboard['todaySchedule']);
      try {
        await MedicationNotificationService.syncMedicationReminders(schedule);
      } catch (_) {
        // Home data should continue rendering even if local reminder sync fails.
      }

      if (!mounted) return;
      setState(() {
        _appointments = results[0] as List<PatientAppointment>;
        _hospitals = results[1] as List<PatientHospital>;
        _doctors = results[2] as List<PatientDoctor>;
        _medicationDashboard = medicationDashboard;
        _recentOrders = results[4] as List<Map<String, dynamic>>;
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

  Future<void> _markHomeMedicationTaken(String scheduleId) async {
    try {
      await PatientApiService.markMedicationTaken(scheduleId);
      await _loadHomeData();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Medication marked as taken')),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(PatientApiService.friendlyError(error))),
      );
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

  Color _statusColor(String status) {
    final normalized = status.trim().toUpperCase();
    if (normalized == 'COMPLETED') return const Color(0xFF2E7D32);
    if (normalized == 'CANCELLED' || normalized == 'NO_SHOW') {
      return AppColors.errorRed;
    }
    return AppColors.accent;
  }

  String _formatDate(DateTime? dateTime) {
    if (dateTime == null) return 'Date TBD';
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
    return '${months[dateTime.month - 1]} ${dateTime.day}';
  }

  String _formatTime(DateTime? dateTime) {
    if (dateTime == null) return 'Time TBD';
    final hour = dateTime.hour;
    final minute = dateTime.minute;
    final displayHour = hour == 0 ? 12 : (hour > 12 ? hour - 12 : hour);
    final meridiem = hour >= 12 ? 'PM' : 'AM';
    return '$displayHour:${minute.toString().padLeft(2, '0')} $meridiem';
  }

  PatientDoctor? get _recommendedDoctor {
    if (_doctors.isEmpty) return null;
    final availableDoctors = _doctors.where((doctor) => doctor.isAvailable);
    return availableDoctors.isNotEmpty
        ? availableDoctors.first
        : _doctors.first;
  }

  @override
  Widget build(BuildContext context) {
    final previewAppointments = _appointments.take(2).toList();
    final previewHospitals = _hospitals.take(3).toList();
    final schedule = _mapList(_medicationDashboard['todaySchedule'])
        .where(
            (item) => _text(item['status'], 'ACTIVE').toUpperCase() == 'ACTIVE')
        .toList();
    final nextMedication = schedule.isEmpty ? null : schedule.first;
    final recentOrder = _recentOrders.isEmpty ? null : _recentOrders.first;
    final recommendedDoctor = _recommendedDoctor;

    return RefreshIndicator(
      onRefresh: _loadHomeData,
      color: AppColors.accent,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const _HomeHeader(),
            const SizedBox(height: 24),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const _SectionHeader(
                      title: 'Your Appointments', onSeeAll: null),
                  const SizedBox(height: 12),
                  if (_isLoading)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.symmetric(vertical: 16),
                        child:
                            CircularProgressIndicator(color: AppColors.accent),
                      ),
                    )
                  else if (_errorMessage != null)
                    _HomeInlineError(
                        message: _errorMessage!, onRetry: _loadHomeData)
                  else if (previewAppointments.isEmpty)
                    const _NoAppointmentCard()
                  else
                    Column(
                      children: previewAppointments.map((appointment) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _AppointmentCard(
                            doctorName: appointment.doctor?.name ??
                                'Doctor appointment',
                            specialty: appointment.doctor?.specialty ??
                                'General Practice',
                            hospital: appointment.hospital?.name ??
                                appointment.doctor?.hospitalName ??
                                'MediLink Hospital',
                            date: _formatDate(appointment.scheduledTime),
                            time: _formatTime(appointment.scheduledTime),
                            status: appointment.status,
                            statusColor: _statusColor(appointment.status),
                            onTap: () async {
                              await Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => AppointmentDetailScreen(
                                    appointment: appointment,
                                    onAppointmentUpdated: _loadHomeData,
                                  ),
                                ),
                              );
                              if (mounted) _loadHomeData();
                            },
                          ),
                        );
                      }).toList(),
                    ),
                  const SizedBox(height: 24),
                  _SectionHeader(
                    title: 'Hospitals on MediLink',
                    onSeeAll: () =>
                        Navigator.pushNamed(context, '/hospital-list'),
                  ),
                  const SizedBox(height: 12),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: _HospitalGrid(hospitals: previewHospitals),
            ),
            const SizedBox(height: 20),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: _SectionHeader(
                title: 'AI Recommended Doctor',
                onSeeAll: () => Navigator.pushNamed(context, '/doctor-list'),
              ),
            ),
            const SizedBox(height: 10),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: _DoctorPreviewCard(
                name: recommendedDoctor?.name ?? 'No recommendation yet',
                specialty: recommendedDoctor?.specialty ??
                    'Book an appointment to unlock personalized picks',
                hospital: recommendedDoctor?.hospitalName ??
                    'MediLink will suggest doctors from your care network',
                aiPick: recommendedDoctor != null,
                onTap: recommendedDoctor == null
                    ? null
                    : () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => DoctorProfileScreen(
                              id: recommendedDoctor.id,
                              hospitalId: recommendedDoctor.hospitalId,
                              name: recommendedDoctor.name,
                              specialty: recommendedDoctor.specialty,
                              hospital: recommendedDoctor.hospitalName,
                              experience: recommendedDoctor.experience,
                              totalPatients: recommendedDoctor.totalPatients,
                              fee: recommendedDoctor.fee,
                              aiRecommended: true,
                            ),
                          ),
                        );
                      },
              ),
            ),
            const SizedBox(height: 24),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                children: [
                  _MedicationCard(
                    schedule: nextMedication,
                    onOpenMedications: widget.onOpenMedications,
                    onMarkTaken: nextMedication == null
                        ? null
                        : () => _markHomeMedicationTaken(
                            _text(nextMedication['id'])),
                  ),
                  const SizedBox(height: 16),
                  _RecentOrderCard(
                    order: recentOrder,
                    onTap: recentOrder == null
                        ? null
                        : () async {
                            await Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => OrderTrackingScreen(
                                  orderId: _text(recentOrder['id']),
                                ),
                              ),
                            );
                            if (mounted) _loadHomeData();
                          },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Header
// ─────────────────────────────────────────────────────────────
class _HomeHeader extends StatelessWidget {
  const _HomeHeader();

  @override
  Widget build(BuildContext context) {
    final fullName = SessionStore.fullName;
    final profileInitial = SessionStore.profileInitial;
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [AppColors.primary, AppColors.secondary],
        ),
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(28),
          bottomRight: Radius.circular(28),
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top row: logo + title + settings
              Row(
                children: [
                  Image.asset('assets/images/medilink_icon.png',
                      height: 32, width: 32, fit: BoxFit.contain),
                  const SizedBox(width: 8),
                  const Text(
                    'MediLink',
                    style: TextStyle(
                      color: AppColors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const Spacer(),
                  InkWell(
                    borderRadius: BorderRadius.circular(18),
                    onTap: () => Navigator.pushNamed(context, '/notifications'),
                    child: const Padding(
                      padding: EdgeInsets.all(4),
                      child: Icon(Icons.notifications_none,
                          color: AppColors.white, size: 26),
                    ),
                  ),
                  const SizedBox(width: 8),
                  InkWell(
                    borderRadius: BorderRadius.circular(18),
                    onTap: () => Navigator.pushNamed(context, '/settings'),
                    child: const Padding(
                      padding: EdgeInsets.all(4),
                      child: Icon(Icons.settings_outlined,
                          color: AppColors.white, size: 26),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              // Greeting row
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Good evening',
                          style: TextStyle(
                            color: AppColors.cream.withValues(alpha: 0.7),
                            fontSize: 14,
                            fontWeight: FontWeight.w400,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          fullName,
                          style: const TextStyle(
                            color: AppColors.warmWhite,
                            fontSize: 24,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ],
                    ),
                  ),
                  GestureDetector(
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const ProfileScreen()),
                    ),
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: const BoxDecoration(
                        color: AppColors.accent,
                        shape: BoxShape.circle,
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        profileInitial,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              // Search bar
              GestureDetector(
                onTap: () => Navigator.pushNamed(context, '/search-results'),
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.95),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const IgnorePointer(
                    child: TextField(
                      decoration: InputDecoration(
                        hintText: 'Search doctors, hospitals...',
                        hintStyle:
                            TextStyle(color: Colors.black38, fontSize: 15),
                        prefixIcon: Icon(Icons.search, color: Colors.black38),
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.symmetric(vertical: 14),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Section Header
// ─────────────────────────────────────────────────────────────
class _SectionHeader extends StatelessWidget {
  final String title;
  final VoidCallback? onSeeAll;

  const _SectionHeader({required this.title, this.onSeeAll});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          title,
          style: const TextStyle(
            color: AppColors.brownDeep,
            fontSize: 17,
            fontWeight: FontWeight.w700,
          ),
        ),
        if (onSeeAll != null)
          GestureDetector(
            onTap: onSeeAll,
            child: const Text(
              'See all →',
              style: TextStyle(
                color: AppColors.accent,
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Appointment Card
// ─────────────────────────────────────────────────────────────
class _AppointmentCard extends StatelessWidget {
  final String doctorName;
  final String specialty;
  final String hospital;
  final String date;
  final String time;
  final String status;
  final Color statusColor;
  final VoidCallback? onTap;

  const _AppointmentCard({
    required this.doctorName,
    required this.specialty,
    required this.hospital,
    required this.date,
    required this.time,
    required this.status,
    required this.statusColor,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.brownDeep,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  doctorName,
                  style: const TextStyle(
                    color: AppColors.warmWhite,
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: statusColor, width: 1),
                ),
                child: Text(
                  status,
                  style: TextStyle(
                    color: statusColor,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            '$specialty · $hospital',
            style: TextStyle(
              color: AppColors.cream.withValues(alpha: 0.7),
              fontSize: 13,
              fontWeight: FontWeight.w400,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Icon(Icons.calendar_today_outlined,
                  color: AppColors.cream.withValues(alpha: 0.8), size: 14),
              const SizedBox(width: 6),
              Text(
                date,
                style: TextStyle(
                    color: AppColors.cream.withValues(alpha: 0.9),
                    fontSize: 14,
                    fontWeight: FontWeight.w500),
              ),
              const SizedBox(width: 12),
              Container(
                  width: 4,
                  height: 4,
                  decoration: const BoxDecoration(
                      color: AppColors.accent, shape: BoxShape.circle)),
              const SizedBox(width: 12),
              Icon(Icons.access_time_outlined,
                  color: AppColors.cream.withValues(alpha: 0.8), size: 14),
              const SizedBox(width: 6),
              Text(
                time,
                style: TextStyle(
                    color: AppColors.cream.withValues(alpha: 0.9),
                    fontSize: 14,
                    fontWeight: FontWeight.w500),
              ),
            ],
          ),
        ],
      ),
    ),
  ),
);
  }
}

// ─────────────────────────────────────────────────────────────
// Hospital Grid
// ─────────────────────────────────────────────────────────────
class _HospitalGrid extends StatelessWidget {
  const _HospitalGrid({required this.hospitals});

  final List<PatientHospital> hospitals;

  @override
  Widget build(BuildContext context) {
    if (hospitals.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.cream,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.surface),
        ),
        child: const Text(
          'No hospitals available right now.',
          style: TextStyle(
            color: AppColors.brownMid,
            fontSize: 13,
            fontWeight: FontWeight.w500,
          ),
        ),
      );
    }

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: hospitals.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        mainAxisExtent: 145,
      ),
      itemBuilder: (context, index) {
        final h = hospitals[index];
        return GestureDetector(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => HospitalDetailScreen(
                  hospitalName: h.name,
                  hospitalId: h.id,
                ),
              ),
            );
          },
          child: _HospitalCard(
            name: h.name,
            location: h.city,
            distance: '${h.doctorCount} doctors',
            rating: h.rating.toStringAsFixed(1),
            tags: h.tags,
          ),
        );
      },
    );
  }
}

class _NoAppointmentCard extends StatelessWidget {
  const _NoAppointmentCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.cream,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.surface),
      ),
      child: const Row(
        children: [
          Icon(Icons.event_busy_outlined, color: AppColors.brownMid, size: 20),
          SizedBox(width: 10),
          Expanded(
            child: Text(
              'No appointment yet. Book one to see it here.',
              style: TextStyle(
                color: AppColors.brownMid,
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _HomeInlineError extends StatelessWidget {
  const _HomeInlineError({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.cream,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.surface),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            message,
            style: const TextStyle(
              color: AppColors.brownMid,
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 8),
          TextButton(
            onPressed: onRetry,
            style: TextButton.styleFrom(
              foregroundColor: AppColors.accent,
              padding: EdgeInsets.zero,
              minimumSize: const Size(0, 0),
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            child: const Text(
              'Retry',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }
}

class _HospitalCard extends StatelessWidget {
  final String name;
  final String location;
  final String distance;
  final String rating;
  final List<String> tags;

  const _HospitalCard({
    required this.name,
    required this.location,
    required this.distance,
    required this.rating,
    required this.tags,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.cream,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.surface),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  name,
                  style: const TextStyle(
                    color: AppColors.brownDeep,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.accent.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Text(
                  '✓',
                  style: TextStyle(
                    color: AppColors.accent,
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.location_on_outlined,
                  color: AppColors.brownMid, size: 12),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  '$location • $distance',
                  style:
                      const TextStyle(color: AppColors.brownMid, fontSize: 11),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              const Icon(Icons.star, color: AppColors.accent, size: 12),
              const SizedBox(width: 4),
              Text(
                rating,
                style: const TextStyle(
                    color: AppColors.brownDeep,
                    fontSize: 11,
                    fontWeight: FontWeight.w600),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 4,
            runSpacing: 4,
            children: tags
                .take(2)
                .map((tag) => Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        tag,
                        style: const TextStyle(
                            color: AppColors.brownMid,
                            fontSize: 9,
                            fontWeight: FontWeight.w500),
                      ),
                    ))
                .toList(),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Medication Card
// ─────────────────────────────────────────────────────────────
class _DoctorPreviewCard extends StatelessWidget {
  const _DoctorPreviewCard({
    required this.name,
    required this.specialty,
    required this.hospital,
    required this.aiPick,
    required this.onTap,
  });

  final String name;
  final String specialty;
  final String hospital;
  final bool aiPick;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.surface),
          ),
          child: Row(
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: const BoxDecoration(
                  color: AppColors.accent,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: const TextStyle(
                        color: AppColors.brownDeep,
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      specialty,
                      style: const TextStyle(
                        color: AppColors.brownMid,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      hospital,
                      style: const TextStyle(
                        color: AppColors.brownLight,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              if (aiPick)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1E7FF),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Text(
                    'AI Pick',
                    style: TextStyle(
                      color: Color(0xFF8F3AF8),
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MedicationCard extends StatelessWidget {
  const _MedicationCard({
    required this.schedule,
    required this.onOpenMedications,
    required this.onMarkTaken,
  });

  final Map<String, dynamic>? schedule;
  final VoidCallback onOpenMedications;
  final VoidCallback? onMarkTaken;

  String _text(dynamic value, [String fallback = '']) {
    if (value == null) return fallback;
    final text = value.toString().trim();
    return text.isEmpty ? fallback : text;
  }

  String _formatTime(String hhmm) {
    final parts = hhmm.split(':');
    if (parts.length < 2) return hhmm.isEmpty ? 'Time TBD' : hhmm;
    final hour = int.tryParse(parts[0]) ?? 0;
    final minute = int.tryParse(parts[1]) ?? 0;
    final suffix = hour >= 12 ? 'PM' : 'AM';
    final displayHour = hour % 12 == 0 ? 12 : hour % 12;
    return '$displayHour:${minute.toString().padLeft(2, '0')} $suffix';
  }

  @override
  Widget build(BuildContext context) {
    final medicineName = schedule == null
        ? 'No medication due'
        : '${_text(schedule!['medicineName'], 'Medicine')} ${_text(schedule!['dosage'])}'
            .trim();
    final timeText = schedule == null
        ? 'Open medications to manage your schedule'
        : _formatTime(_text(schedule!['timeOfDay']));

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.surface),
      ),
      child: IntrinsicHeight(
        child: Row(
          children: [
            // Orange left accent bar
            Container(
              width: 5,
              decoration: const BoxDecoration(
                color: AppColors.accent,
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(16),
                  bottomLeft: Radius.circular(16),
                ),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: AppColors.accent.withValues(alpha: 0.12),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.medication_outlined,
                              color: AppColors.accent, size: 20),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Next medication',
                                style: TextStyle(
                                    color: AppColors.brownMid,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500),
                              ),
                              Text(
                                medicineName,
                                style: const TextStyle(
                                    color: AppColors.brownDeep,
                                    fontSize: 16,
                                    fontWeight: FontWeight.w800),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              Text(
                                timeText,
                                style: const TextStyle(
                                    color: AppColors.brownMid,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w500),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                        ElevatedButton(
                          onPressed: onMarkTaken,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.brownDeep,
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(20)),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 10),
                          ),
                          child: const Text(
                            'Mark Taken',
                            style: TextStyle(
                                color: AppColors.warmWhite,
                                fontSize: 13,
                                fontWeight: FontWeight.w700),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    GestureDetector(
                      onTap: onOpenMedications,
                      child: const Text(
                        'View all medications +',
                        style: TextStyle(
                            color: AppColors.accent,
                            fontSize: 13,
                            fontWeight: FontWeight.w600),
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
}

// ─────────────────────────────────────────────────────────────
// Recent Order Card
// ─────────────────────────────────────────────────────────────
class _RecentOrderCard extends StatelessWidget {
  const _RecentOrderCard({
    required this.order,
    required this.onTap,
  });

  final Map<String, dynamic>? order;
  final VoidCallback? onTap;

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

  @override
  Widget build(BuildContext context) {
    final items = _mapList(order?['items']);
    final firstItem = items.isEmpty ? null : items.first;
    final orderId = _text(order?['id'], 'No active order');
    final itemText = order == null
        ? 'Orders you place will appear here.'
        : '${_text(firstItem?['name'], 'Medication order')} x${_text(firstItem?['quantity'], '1')}';
    final status =
        _text(order?['status'], order == null ? 'No order' : 'PLACED');

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: const BorderRadius.all(Radius.circular(16)),
          border: Border.all(color: AppColors.surface),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Recent Order',
                        style: TextStyle(
                            color: AppColors.brownDeep,
                            fontSize: 15,
                            fontWeight: FontWeight.w700),
                      ),
                      Flexible(
                        child: Text(
                          orderId,
                          style: const TextStyle(
                              color: AppColors.accent,
                              fontSize: 13,
                              fontWeight: FontWeight.w600),
                          textAlign: TextAlign.right,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    itemText,
                    style: const TextStyle(
                        color: AppColors.brownDeep,
                        fontSize: 14,
                        fontWeight: FontWeight.w500),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    status,
                    style: const TextStyle(
                        color: AppColors.accent,
                        fontSize: 13,
                        fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            const Icon(Icons.chevron_right,
                color: AppColors.brownMid, size: 24),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Bottom Navigation
// ─────────────────────────────────────────────────────────────
class _BottomNav extends StatelessWidget {
  final int selectedIndex;
  final ValueChanged<int> onTap;

  const _BottomNav({required this.selectedIndex, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(20), topRight: Radius.circular(20)),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 12,
              offset: const Offset(0, -4))
        ],
      ),
      child: SafeArea(
        top: false,
        child: BottomNavigationBar(
          type: BottomNavigationBarType.fixed,
          currentIndex: selectedIndex,
          onTap: onTap,
          selectedItemColor: AppColors.brownDeep,
          unselectedItemColor: AppColors.brownMid.withValues(alpha: 0.5),
          backgroundColor: Colors.transparent,
          elevation: 0,
          selectedFontSize: 11,
          unselectedFontSize: 11,
          selectedLabelStyle: const TextStyle(fontWeight: FontWeight.w700),
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.home_outlined),
              activeIcon: Icon(Icons.home),
              label: 'Home',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.medication_outlined),
              activeIcon: Icon(Icons.medication),
              label: 'Medications',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.folder_outlined),
              activeIcon: Icon(Icons.folder),
              label: 'Medical History',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.person_outline),
              activeIcon: Icon(Icons.person),
              label: 'Profile',
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Placeholder Tabs
// ─────────────────────────────────────────────────────────────
