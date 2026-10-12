import 'package:flutter/material.dart';
import '../core/app_colors.dart';
import '../core/date_utils.dart';
import '../services/doctor_api_service.dart';

class DoctorConsultationScreen extends StatefulWidget {
  final String encounterId;

  const DoctorConsultationScreen({
    super.key,
    required this.encounterId,
  });

  @override
  State<DoctorConsultationScreen> createState() =>
      _DoctorConsultationScreenState();
}

class _DoctorConsultationScreenState extends State<DoctorConsultationScreen> {
  DoctorAppointmentItem? _appointment;
  bool _isLoading = true;
  bool _isActionLoading = false;
  String? _errorMessage;

  // Controllers for clinical notes
  final _diagnosisController = TextEditingController();
  final _notesController = TextEditingController();
  final _outcomeController = TextEditingController();
  DateTime? _selectedFollowUpDate;

  @override
  void initState() {
    super.initState();
    _fetchDetails();
  }

  @override
  void dispose() {
    _diagnosisController.dispose();
    _notesController.dispose();
    _outcomeController.dispose();
    super.dispose();
  }

  Future<void> _fetchDetails() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final details =
          await DoctorApiService.getAppointmentDetails(widget.encounterId);
      if (!mounted) return;
      setState(() {
        _appointment = details;
        _isLoading = false;
        if (_diagnosisController.text.isEmpty && details.diagnosis != null) {
          _diagnosisController.text = details.diagnosis!;
        }
        if (_notesController.text.isEmpty && details.notes != null) {
          _notesController.text = details.notes!;
        }
        if (_outcomeController.text.isEmpty && details.outcome != null) {
          _outcomeController.text = details.outcome!;
        }
        if (_selectedFollowUpDate == null && details.followUpDate != null) {
          _selectedFollowUpDate = details.followUpDate;
        }
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e.toString().replaceFirst('Exception: ', '');
        _isLoading = false;
      });
    }
  }

  Future<void> _startConsultation() async {
    setState(() => _isActionLoading = true);
    try {
      final updated =
          await DoctorApiService.startConsultation(widget.encounterId);
      if (!mounted) return;
      setState(() {
        _appointment = updated;
        _isActionLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Consultation started'),
          backgroundColor: AppColors.success,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _isActionLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to start consultation: $e'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  Future<void> _saveConsultationNotes() async {
    setState(() => _isActionLoading = true);
    try {
      final updated = await DoctorApiService.updateConsultation(
        widget.encounterId,
        diagnosis: _diagnosisController.text.trim(),
        notes: _notesController.text.trim(),
        outcome: _outcomeController.text.trim(),
        followUpDate: _selectedFollowUpDate,
      );
      if (!mounted) return;
      setState(() {
        _appointment = updated;
        _isActionLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Clinical notes saved'),
          backgroundColor: AppColors.success,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _isActionLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to save notes: $e'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  Future<void> _completeConsultation() async {
    if (_diagnosisController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text(
              'Please enter a diagnosis before completing consultation.'),
          backgroundColor: AppColors.warning,
        ),
      );
      return;
    }

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Complete Consultation'),
        content: const Text(
          'Are you sure you want to finish this consultation? The encounter will be marked as COMPLETED.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.success,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child:
                const Text('Complete', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isActionLoading = true);
    try {
      final updated = await DoctorApiService.completeConsultation(
        widget.encounterId,
        diagnosis: _diagnosisController.text.trim(),
        notes: _notesController.text.trim(),
        outcome: _outcomeController.text.trim(),
        followUpDate: _selectedFollowUpDate,
      );
      if (!mounted) return;
      setState(() {
        _appointment = updated;
        _isActionLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Consultation completed successfully!'),
          backgroundColor: AppColors.success,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _isActionLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to complete consultation: $e'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  void _showAddPrescriptionModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _AddPrescriptionSheet(
        encounterId: widget.encounterId,
        initialDiagnosis: _diagnosisController.text.trim(),
        onPrescriptionCreated: () {
          _fetchDetails();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.primary,
        elevation: 0,
        title: Text(
          _appointment != null ? 'Patient Consultation' : 'Consultation',
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            fontSize: 18,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white),
            onPressed: _fetchDetails,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
              ? _buildErrorView()
              : _buildConsultationContent(),
    );
  }

  Widget _buildErrorView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: AppColors.error),
            const SizedBox(height: 12),
            Text(
              _errorMessage ?? 'Failed to load consultation details',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: _fetchDetails,
              icon: const Icon(Icons.refresh, size: 18),
              label: const Text('Try Again'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildConsultationContent() {
    final a = _appointment!;
    final isCompleted = a.status == 'COMPLETED';
    final isInProgress = a.status == 'IN_PROGRESS';
    final isScheduled = a.status == 'SCHEDULED' ||
        a.status == 'CONFIRMED' ||
        a.status == 'RESCHEDULED';

    return Stack(
      children: [
        SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Status Bar Banner
              _buildStatusBar(a),
              const SizedBox(height: 14),

              // Patient Information Card
              _buildPatientCard(a),
              const SizedBox(height: 14),

              // Clinical Alerts (Allergies & Chronic Conditions)
              if (a.allergies.isNotEmpty || a.chronicConditions.isNotEmpty) ...[
                _buildClinicalAlertsCard(a),
                const SizedBox(height: 14),
              ],

              // Appointment Metadata Card
              _buildAppointmentInfoCard(a),
              const SizedBox(height: 14),

              // WORKFLOW SECTIONS ACCORDING TO STATUS:
              if (isScheduled) ...[
                _buildScheduledActionCard(),
              ] else if (isInProgress) ...[
                _buildClinicalNotesForm(),
                const SizedBox(height: 14),
                _buildPrescriptionsCard(a, allowAdd: true),
                const SizedBox(height: 24),
                _buildInProgressActions(),
              ] else if (isCompleted) ...[
                _buildCompletedSummaryCard(a),
                const SizedBox(height: 14),
                _buildPrescriptionsCard(a, allowAdd: false),
              ] else ...[
                // Cancelled or other state
                _buildCancelledCard(a),
              ],

              const SizedBox(height: 40),
            ],
          ),
        ),
        if (_isActionLoading)
          Container(
            color: Colors.black26,
            child: const Center(
              child: CircularProgressIndicator(),
            ),
          ),
      ],
    );
  }

  Widget _buildStatusBar(DoctorAppointmentItem a) {
    Color color;
    IconData icon;
    String label;

    switch (a.status) {
      case 'IN_PROGRESS':
        color = AppColors.warning;
        icon = Icons.pending_outlined;
        label = 'Consultation In Progress';
        break;
      case 'COMPLETED':
        color = AppColors.success;
        icon = Icons.check_circle_outline;
        label = 'Consultation Completed';
        break;
      case 'CANCELLED':
      case 'NO_SHOW':
        color = AppColors.error;
        icon = Icons.cancel_outlined;
        label = 'Appointment ${a.status}';
        break;
      default:
        color = AppColors.primary;
        icon = Icons.schedule;
        label = 'Scheduled Appointment';
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.w700,
                fontSize: 14,
              ),
            ),
          ),
          if (a.actualStartTime != null)
            Text(
              'Started: ${MediDateUtils.formatTimeOnly(a.actualStartTime!)}',
              style: TextStyle(
                color: color,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildPatientCard(DoctorAppointmentItem a) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: AppColors.primary.withOpacity(0.12),
                child: Text(
                  a.patientName.isNotEmpty
                      ? a.patientName[0].toUpperCase()
                      : 'P',
                  style: const TextStyle(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w800,
                    fontSize: 20,
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      a.patientName,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Token #${a.tokenNo > 0 ? a.tokenNo : 1} • Patient ID: ${a.patientId.substring(0, 8)}...',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const Divider(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildPatientMetaItem(
                'Gender',
                (a.patientGender ?? 'N/A').toUpperCase(),
              ),
              _buildPatientMetaItem(
                'Age',
                a.patientAge != null ? '${a.patientAge} yrs' : 'N/A',
              ),
              _buildPatientMetaItem(
                'Blood Group',
                a.patientBloodGroup != null
                    ? a.patientBloodGroup!.replaceAll('_', ' ')
                    : 'N/A',
              ),
              _buildPatientMetaItem(
                'Emergency',
                a.patientEmergencyContact ?? 'N/A',
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPatientMetaItem(String label, String value) {
    return Column(
      children: [
        Text(
          value,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            color: AppColors.textSecondary,
          ),
        ),
      ],
    );
  }

  Widget _buildClinicalAlertsCard(DoctorAppointmentItem a) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.amber.shade50,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.amber.shade300),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.warning_amber_rounded,
                  size: 18, color: Colors.amber.shade900),
              const SizedBox(width: 6),
              Text(
                'Clinical Alerts & Pre-existing Conditions',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: Colors.amber.shade900,
                ),
              ),
            ],
          ),
          if (a.allergies.isNotEmpty) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              runSpacing: 4,
              children: a.allergies.map((allergy) {
                return Chip(
                  label: Text('Allergy: $allergy'),
                  backgroundColor: Colors.red.shade100,
                  labelStyle: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: Colors.red.shade900,
                  ),
                  padding: EdgeInsets.zero,
                  visualDensity: VisualDensity.compact,
                );
              }).toList(),
            ),
          ],
          if (a.chronicConditions.isNotEmpty) ...[
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              runSpacing: 4,
              children: a.chronicConditions.map((cond) {
                return Chip(
                  label: Text(cond),
                  backgroundColor: Colors.amber.shade200,
                  labelStyle: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: Colors.amber.shade900,
                  ),
                  padding: EdgeInsets.zero,
                  visualDensity: VisualDensity.compact,
                );
              }).toList(),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildAppointmentInfoCard(DoctorAppointmentItem a) {
    final timeStr = a.scheduledTime != null
        ? MediDateUtils.formatFull(a.scheduledTime!)
        : 'Time not set';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Appointment Details',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              const Icon(Icons.location_on_outlined,
                  size: 16, color: AppColors.primary),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  a.hospitalName,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              const Icon(Icons.calendar_today_outlined,
                  size: 16, color: AppColors.textSecondary),
              const SizedBox(width: 8),
              Text(
                timeStr,
                style: const TextStyle(
                  fontSize: 13,
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
          if ((a.chiefComplaint ?? a.reason) != null &&
              (a.chiefComplaint ?? a.reason)!.trim().isNotEmpty) ...[
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                'Chief Complaint: ${a.chiefComplaint ?? a.reason}',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textPrimary,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildScheduledActionCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          const Icon(Icons.medical_services_outlined,
              size: 44, color: AppColors.primary),
          const SizedBox(height: 12),
          const Text(
            'Ready to begin consultation?',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'Starting the consultation will mark the appointment as IN_PROGRESS and record the consultation start timestamp.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 13,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton.icon(
              icon: const Icon(Icons.play_arrow_rounded, color: Colors.white),
              label: const Text(
                'Start Consultation',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              onPressed: _startConsultation,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildClinicalNotesForm() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Clinical Examination & Notes',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 14),

          // Diagnosis Field
          const Text(
            'Diagnosis *',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: _diagnosisController,
            decoration: InputDecoration(
              hintText: 'e.g., Acute Bronchitis, Hypertension Stage 1',
              filled: true,
              fillColor: AppColors.surface,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(color: Colors.grey.shade300),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(color: Colors.grey.shade300),
              ),
            ),
          ),

          const SizedBox(height: 14),

          // Examination & Clinical Notes
          const Text(
            'Clinical Observations / Notes',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: _notesController,
            maxLines: 3,
            decoration: InputDecoration(
              hintText:
                  'Examination findings, vitals checked, clinical notes...',
              filled: true,
              fillColor: AppColors.surface,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(color: Colors.grey.shade300),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(color: Colors.grey.shade300),
              ),
            ),
          ),

          const SizedBox(height: 14),

          // Outcome / Advice
          const Text(
            'Outcome / Advice',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: _outcomeController,
            maxLines: 2,
            decoration: InputDecoration(
              hintText: 'Patient advice, lifestyle suggestions, next steps...',
              filled: true,
              fillColor: AppColors.surface,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(color: Colors.grey.shade300),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(color: Colors.grey.shade300),
              ),
            ),
          ),

          const SizedBox(height: 14),

          // Follow-up Date Picker
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Follow-up Date',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _selectedFollowUpDate != null
                          ? MediDateUtils.formatDateOnly(_selectedFollowUpDate!)
                          : 'No follow-up scheduled',
                      style: TextStyle(
                        fontSize: 13,
                        color: _selectedFollowUpDate != null
                            ? AppColors.primary
                            : AppColors.textSecondary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              OutlinedButton.icon(
                icon: const Icon(Icons.calendar_month, size: 16),
                label: Text(
                  _selectedFollowUpDate != null ? 'Change' : 'Pick Date',
                ),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  side: const BorderSide(color: AppColors.primary),
                ),
                onPressed: () async {
                  final picked = await showDatePicker(
                    context: context,
                    initialDate: _selectedFollowUpDate ??
                        DateTime.now().add(const Duration(days: 7)),
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 180)),
                  );
                  if (picked != null) {
                    setState(() => _selectedFollowUpDate = picked);
                  }
                },
              ),
              if (_selectedFollowUpDate != null)
                IconButton(
                  icon: const Icon(Icons.clear, size: 18),
                  tooltip: 'Clear follow-up date',
                  onPressed: () => setState(() => _selectedFollowUpDate = null),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPrescriptionsCard(DoctorAppointmentItem a,
      {required bool allowAdd}) {
    final prescriptions = a.prescriptions;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Prescriptions',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              if (allowAdd && prescriptions.isEmpty)
                ElevatedButton.icon(
                  icon: const Icon(Icons.add, size: 16, color: Colors.white),
                  label: const Text('Add Prescription',
                      style: TextStyle(fontSize: 12, color: Colors.white)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  onPressed: _showAddPrescriptionModal,
                ),
            ],
          ),
          const SizedBox(height: 12),
          if (prescriptions.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Text(
                'No prescription created for this consultation yet.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 13,
                  color: AppColors.textSecondary,
                ),
              ),
            )
          else
            ...prescriptions.map((p) => _buildPrescriptionRecordView(p)),
        ],
      ),
    );
  }

  Widget _buildPrescriptionRecordView(DoctorPrescriptionRecord p) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Rx Prescribed Medications',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary,
                ),
              ),
              if (p.nextVisit != null)
                Text(
                  'Next: ${MediDateUtils.formatMonthDay(p.nextVisit!)}',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textSecondary,
                  ),
                ),
            ],
          ),
          const Divider(height: 16),
          if (p.medicines.isEmpty)
            const Text(
              'No medications listed.',
              style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
            )
          else
            ...p.medicines.map((m) {
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.medication_outlined,
                        size: 16, color: AppColors.primary),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            m.medicineName,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          Text(
                            'Dosage: ${m.dosage} • ${m.frequency} • ${m.durationDays} days',
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }

  Widget _buildInProgressActions() {
    return Column(
      children: [
        SizedBox(
          width: double.infinity,
          height: 48,
          child: OutlinedButton.icon(
            icon: const Icon(Icons.save_outlined, color: AppColors.primary),
            label: const Text(
              'Save Progress / Notes',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: AppColors.primary,
              ),
            ),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: AppColors.primary, width: 1.5),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            onPressed: _saveConsultationNotes,
          ),
        ),
        const SizedBox(height: 10),
        SizedBox(
          width: double.infinity,
          height: 48,
          child: ElevatedButton.icon(
            icon: const Icon(Icons.check_circle, color: Colors.white),
            label: const Text(
              'Complete Consultation',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.success,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            onPressed: _completeConsultation,
          ),
        ),
      ],
    );
  }

  Widget _buildCompletedSummaryCard(DoctorAppointmentItem a) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.verified, size: 20, color: AppColors.success),
              const SizedBox(width: 8),
              const Text(
                'Clinical Summary (Completed)',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const Divider(height: 20),
          _buildSummaryField('Diagnosis', a.diagnosis ?? 'None recorded'),
          const SizedBox(height: 10),
          _buildSummaryField('Clinical Notes', a.notes ?? 'None recorded'),
          const SizedBox(height: 10),
          _buildSummaryField('Outcome / Advice', a.outcome ?? 'None recorded'),
          if (a.followUpDate != null) ...[
            const SizedBox(height: 10),
            _buildSummaryField(
              'Follow-up Date',
              MediDateUtils.formatDateOnly(a.followUpDate!),
            ),
          ],
          if (a.actualStartTime != null && a.actualEndTime != null) ...[
            const SizedBox(height: 10),
            _buildSummaryField(
              'Consultation Duration',
              '${MediDateUtils.formatTimeOnly(a.actualStartTime!)} – ${MediDateUtils.formatTimeOnly(a.actualEndTime!)}',
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSummaryField(String title, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: AppColors.textSecondary,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
      ],
    );
  }

  Widget _buildCancelledCard(DoctorAppointmentItem a) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.red.shade200),
      ),
      child: Row(
        children: [
          Icon(Icons.cancel_outlined, color: Colors.red.shade700, size: 28),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Appointment is ${a.status}',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: Colors.red.shade900,
                  ),
                ),
                const SizedBox(height: 2),
                const Text(
                  'No further clinical actions can be taken on this appointment.',
                  style:
                      TextStyle(fontSize: 12, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _AddPrescriptionSheet extends StatefulWidget {
  final String encounterId;
  final String initialDiagnosis;
  final VoidCallback onPrescriptionCreated;

  const _AddPrescriptionSheet({
    required this.encounterId,
    required this.initialDiagnosis,
    required this.onPrescriptionCreated,
  });

  @override
  State<_AddPrescriptionSheet> createState() => _AddPrescriptionSheetState();
}

class _AddPrescriptionSheetState extends State<_AddPrescriptionSheet> {
  final _searchController = TextEditingController();
  final _dosageController = TextEditingController(text: '1 Tablet');
  final _frequencyController =
      TextEditingController(text: 'Twice daily after food');
  final _durationController = TextEditingController(text: '5');
  final _symptomsController = TextEditingController();

  List<MedicineCatalogItem> _searchResults = [];
  MedicineCatalogItem? _selectedMedicine;
  bool _isSearching = false;
  bool _isSubmitting = false;
  String? _errorMessage;

  final List<PrescriptionMedicineItem> _addedMedicines = [];

  @override
  void initState() {
    super.initState();
    _searchMedicines('');
  }

  @override
  void dispose() {
    _searchController.dispose();
    _dosageController.dispose();
    _frequencyController.dispose();
    _durationController.dispose();
    _symptomsController.dispose();
    super.dispose();
  }

  Future<void> _searchMedicines(String query) async {
    setState(() => _isSearching = true);
    try {
      final results = await DoctorApiService.searchMedicines(query: query);
      if (!mounted) return;
      setState(() {
        _searchResults = results;
        _isSearching = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _isSearching = false);
    }
  }

  void _addMedicineToList() {
    if (_selectedMedicine == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a medicine first.')),
      );
      return;
    }

    final duration = int.tryParse(_durationController.text.trim()) ?? 1;

    setState(() {
      _addedMedicines.add(
        PrescriptionMedicineItem(
          medicineId: _selectedMedicine!.medicineId,
          medicineName: _selectedMedicine!.name,
          dosage: _dosageController.text.trim().isEmpty
              ? '1 Tablet'
              : _dosageController.text.trim(),
          frequency: _frequencyController.text.trim().isEmpty
              ? 'Once daily'
              : _frequencyController.text.trim(),
          durationDays: duration,
        ),
      );
      _selectedMedicine = null;
      _searchController.clear();
      _searchMedicines('');
    });
  }

  Future<void> _submitPrescription() async {
    if (_addedMedicines.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please add at least one medication.')),
      );
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      await DoctorApiService.createPrescription(
        encounterId: widget.encounterId,
        diagnosisText: widget.initialDiagnosis.isNotEmpty
            ? widget.initialDiagnosis
            : 'Clinical Diagnosis',
        symptoms: _symptomsController.text.trim().isNotEmpty
            ? _symptomsController.text.trim()
            : null,
        medicines: _addedMedicines,
      );

      if (!mounted) return;
      Navigator.pop(context);
      widget.onPrescriptionCreated();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Prescription added successfully'),
          backgroundColor: AppColors.success,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e.toString().replaceFirst('Exception: ', '');
        _isSubmitting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.88,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.fromLTRB(
        20,
        16,
        20,
        MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Create Prescription',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const Divider(),

          Expanded(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Added Medicines List
                  if (_addedMedicines.isNotEmpty) ...[
                    const Text(
                      'Added Medications:',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 6),
                    ..._addedMedicines.asMap().entries.map((entry) {
                      final idx = entry.key;
                      final m = entry.value;
                      return Container(
                        margin: const EdgeInsets.only(bottom: 6),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 8),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withOpacity(0.08),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.medication,
                                size: 16, color: AppColors.primary),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                '${m.medicineName} (${m.dosage}, ${m.frequency}, ${m.durationDays}d)',
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.delete_outline,
                                  size: 16, color: AppColors.error),
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                              onPressed: () {
                                setState(() {
                                  _addedMedicines.removeAt(idx);
                                });
                              },
                            ),
                          ],
                        ),
                      );
                    }),
                    const SizedBox(height: 12),
                  ],

                  // Medicine Search
                  const Text(
                    'Search Medicine Catalog',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 6),
                  TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: 'Type medicine name...',
                      prefixIcon: const Icon(Icons.search, size: 18),
                      filled: true,
                      fillColor: AppColors.surface,
                      contentPadding: const EdgeInsets.symmetric(vertical: 8),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: BorderSide(color: Colors.grey.shade300),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: BorderSide(color: Colors.grey.shade300),
                      ),
                    ),
                    onChanged: (val) => _searchMedicines(val),
                  ),
                  const SizedBox(height: 8),

                  // Search Results Picker
                  if (_isSearching)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.all(8.0),
                        child: SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                      ),
                    )
                  else if (_searchResults.isNotEmpty)
                    Container(
                      height: 110,
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.grey.shade300),
                      ),
                      child: ListView.builder(
                        itemCount: _searchResults.length,
                        itemBuilder: (ctx, index) {
                          final item = _searchResults[index];
                          final isSelected =
                              _selectedMedicine?.medicineId == item.medicineId;
                          return ListTile(
                            dense: true,
                            selected: isSelected,
                            selectedTileColor:
                                AppColors.primary.withOpacity(0.1),
                            title: Text(
                              item.name,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: isSelected
                                    ? FontWeight.w700
                                    : FontWeight.w500,
                                color: isSelected
                                    ? AppColors.primary
                                    : AppColors.textPrimary,
                              ),
                            ),
                            subtitle: Text(
                              item.saltComposition ?? item.manufacturer ?? '',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 11),
                            ),
                            onTap: () {
                              setState(() => _selectedMedicine = item);
                            },
                          );
                        },
                      ),
                    ),

                  if (_selectedMedicine != null) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.check_circle,
                              size: 16, color: AppColors.primary),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              'Selected: ${_selectedMedicine!.name}',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],

                  const SizedBox(height: 14),

                  // Dosage & Frequency Row
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Dosage',
                              style: TextStyle(
                                  fontSize: 12, fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 4),
                            TextField(
                              controller: _dosageController,
                              decoration: InputDecoration(
                                hintText: 'e.g. 500mg',
                                filled: true,
                                fillColor: AppColors.surface,
                                contentPadding: const EdgeInsets.symmetric(
                                    horizontal: 10, vertical: 8),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  borderSide:
                                      BorderSide(color: Colors.grey.shade300),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Days',
                              style: TextStyle(
                                  fontSize: 12, fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 4),
                            TextField(
                              controller: _durationController,
                              keyboardType: TextInputType.number,
                              decoration: InputDecoration(
                                hintText: 'e.g. 5',
                                filled: true,
                                fillColor: AppColors.surface,
                                contentPadding: const EdgeInsets.symmetric(
                                    horizontal: 10, vertical: 8),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  borderSide:
                                      BorderSide(color: Colors.grey.shade300),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 10),

                  // Frequency
                  const Text(
                    'Frequency',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 4),
                  TextField(
                    controller: _frequencyController,
                    decoration: InputDecoration(
                      hintText: 'e.g. Twice daily after meals',
                      filled: true,
                      fillColor: AppColors.surface,
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 8),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(color: Colors.grey.shade300),
                      ),
                    ),
                  ),

                  const SizedBox(height: 12),

                  // Button to add medicine to list
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.add, size: 16),
                      label: const Text('Add Medication to Prescription'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.primary,
                        side: const BorderSide(color: AppColors.primary),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      onPressed: _addMedicineToList,
                    ),
                  ),

                  if (_errorMessage != null) ...[
                    const SizedBox(height: 12),
                    Text(
                      _errorMessage!,
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.error,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),

          // Submit Prescription Button
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              onPressed: _isSubmitting ? null : _submitPrescription,
              child: _isSubmitting
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2,
                      ),
                    )
                  : Text(
                      'Save Prescription (${_addedMedicines.length} items)',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
