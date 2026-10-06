import 'package:flutter/material.dart';

import '../core/app_colors.dart';
import '../services/patient_api_service.dart';
import 'doctor_profile_screen.dart';

class HospitalDetailScreen extends StatefulWidget {
  const HospitalDetailScreen(
      {super.key, required this.hospitalName, this.hospitalId});

  final String hospitalName;
  final String? hospitalId;

  @override
  State<HospitalDetailScreen> createState() => _HospitalDetailScreenState();
}

class _HospitalDetailScreenState extends State<HospitalDetailScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  PatientHospitalDetail? _hospital;

  @override
  void initState() {
    super.initState();
    _loadHospital();
  }

  Future<void> _loadHospital() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      var hospitalId = widget.hospitalId;
      if (hospitalId == null || hospitalId.trim().isEmpty) {
        final hospitals = await PatientApiService.getHospitals();
        final matches = hospitals.where(
          (hospital) =>
              hospital.name.toLowerCase() == widget.hospitalName.toLowerCase(),
        );
        if (matches.isNotEmpty) hospitalId = matches.first.id;
      }

      if (hospitalId == null || hospitalId.trim().isEmpty) {
        throw const PatientApiException(
            'Hospital details are not available yet.');
      }

      final hospital = await PatientApiService.getHospital(hospitalId);
      if (!mounted) return;
      setState(() {
        _hospital = hospital;
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
  Widget build(BuildContext context) {
    final title = _hospital?.name ?? widget.hospitalName;

    return Scaffold(
      backgroundColor: const Color(0xFFFFFDF8),
      body: Column(
        children: [
          _Header(title: title),
          Expanded(
            child: _isLoading
                ? const Center(
                    child: CircularProgressIndicator(color: AppColors.accent))
                : _errorMessage != null
                    ? _ErrorState(
                        message: _errorMessage!, onRetry: _loadHospital)
                    : _HospitalBody(hospital: _hospital!),
          ),
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Container(
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
                  icon: const Icon(Icons.arrow_back, color: Colors.white),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ),
              Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 56),
                  child: Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w600),
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

class _HospitalBody extends StatelessWidget {
  const _HospitalBody({required this.hospital});

  final PatientHospitalDetail hospital;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _Cover(hospital: hospital),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _HospitalSummary(hospital: hospital),
                const SizedBox(height: 24),
                const _SectionTitle('Specialties'),
                const SizedBox(height: 12),
                hospital.tags.isEmpty
                    ? const Text('No specialties listed yet.',
                        style:
                            TextStyle(color: Color(0xFF6B3A1F), fontSize: 13))
                    : Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children:
                            hospital.tags.map(_SpecialtyChip.new).toList()),
                const SizedBox(height: 24),
                _SectionTitle('Labs (${hospital.labs.length})'),
                const SizedBox(height: 12),
                hospital.labs.isEmpty
                    ? const _EmptyCard(
                        icon: Icons.biotech_outlined,
                        label: 'No labs listed yet')
                    : Column(
                        children: hospital.labs.map(_LabCard.new).toList()),
                const SizedBox(height: 24),
                _SectionTitle('Medical Staff (${hospital.doctors.length})'),
                const SizedBox(height: 12),
                hospital.doctors.isEmpty
                    ? const _EmptyCard(
                        icon: Icons.people_outline,
                        label: 'No doctors listed yet')
                    : Column(
                        children: hospital.doctors
                            .map((doctor) =>
                                _DoctorCard(doctor: doctor, hospital: hospital))
                            .toList(),
                      ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Cover extends StatelessWidget {
  const _Cover({required this.hospital});

  final PatientHospitalDetail hospital;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 160,
      width: double.infinity,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF3B1F0A), Color(0xFF6B3A1F)],
        ),
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          const Positioned(
            top: 16,
            left: 32,
            child: _OutlineCircle(size: 80, opacity: 0.1),
          ),
          const Positioned(
            bottom: 16,
            right: 32,
            child: _OutlineCircle(size: 128, opacity: 0.1),
          ),
          Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    shape: BoxShape.circle),
                child: const Center(
                    child:
                        Icon(Icons.domain, color: Color(0xFFFBF6EC), size: 28)),
              ),
              const SizedBox(height: 8),
              Text(
                '${hospital.city} - ${hospital.doctorCount} doctors',
                style: TextStyle(
                    color: const Color(0xFFFBF6EC).withValues(alpha: 0.85),
                    fontSize: 12),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _OutlineCircle extends StatelessWidget {
  const _OutlineCircle({required this.size, required this.opacity});

  final double size;
  final double opacity;

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: opacity,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 2)),
      ),
    );
  }
}

class _HospitalSummary extends StatelessWidget {
  const _HospitalSummary({required this.hospital});

  final PatientHospitalDetail hospital;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: 8,
          runSpacing: 8,
          children: [
            Text(
              hospital.name,
              style: const TextStyle(
                color: Color(0xFF3B1F0A),
                fontSize: 20,
                fontWeight: FontWeight.w700,
                fontFamily: 'Playfair Display',
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                  color: AppColors.paleGreen,
                  borderRadius: BorderRadius.circular(20)),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.workspace_premium,
                      color: AppColors.primary, size: 12),
                  SizedBox(width: 4),
                  Text('MediLink Verified',
                      style: TextStyle(
                          color: AppColors.primary,
                          fontSize: 10,
                          fontWeight: FontWeight.w600)),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        _InfoLine(icon: Icons.location_on_outlined, text: hospital.address),
        const SizedBox(height: 8),
        _InfoLine(
            icon: Icons.star_outline,
            text: '${hospital.rating.toStringAsFixed(1)} rating'),
      ],
    );
  }
}

class _InfoLine extends StatelessWidget {
  const _InfoLine({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 2),
          child: Icon(icon, color: const Color(0xFFA0622A), size: 16),
        ),
        const SizedBox(width: 8),
        Expanded(
            child: Text(text,
                style:
                    const TextStyle(color: Color(0xFF6B3A1F), fontSize: 13))),
      ],
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(text,
        style: const TextStyle(
            color: Color(0xFF3B1F0A),
            fontSize: 15,
            fontWeight: FontWeight.w500));
  }
}

class _SpecialtyChip extends StatelessWidget {
  const _SpecialtyChip(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFFFBF6EC),
        border: Border.all(color: const Color(0xFFEFE2CC)),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(label,
          style: const TextStyle(color: Color(0xFF6B3A1F), fontSize: 12)),
    );
  }
}

class _LabCard extends StatelessWidget {
  const _LabCard(this.lab);

  final PatientLab lab;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFBF6EC),
        border: Border.all(color: const Color(0xFFEFE2CC)),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          const Icon(Icons.biotech_outlined,
              color: Color(0xFFA0622A), size: 20),
          const SizedBox(width: 10),
          Expanded(
              child: Text(lab.name,
                  style: const TextStyle(
                      color: Color(0xFF3B1F0A),
                      fontSize: 13,
                      fontWeight: FontWeight.w500))),
        ],
      ),
    );
  }
}

class _DoctorCard extends StatelessWidget {
  const _DoctorCard({required this.doctor, required this.hospital});

  final PatientDoctor doctor;
  final PatientHospitalDetail hospital;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: const Color(0xFFFBF6EC),
        border: Border.all(color: const Color(0xFFEFE2CC)),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => DoctorProfileScreen(
                  id: doctor.id,
                  hospitalId: doctor.hospitalId ?? hospital.id,
                  name: doctor.name,
                  specialty: doctor.specialty,
                  hospital: doctor.hospitalName,
                  experience: doctor.experience,
                  totalPatients: doctor.totalPatients,
                  fee: doctor.fee,
                ),
              ),
            );
          },
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CircleAvatar(
                  radius: 24,
                  backgroundColor: const Color(0xFFD4822A),
                  child: Text(_avatarLetter(doctor.name),
                      style: const TextStyle(
                          color: Color(0xFFFBF6EC),
                          fontSize: 16,
                          fontWeight: FontWeight.w600)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(doctor.name,
                          style: const TextStyle(
                              color: Color(0xFF3B1F0A),
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              fontFamily: 'Playfair Display')),
                      const SizedBox(height: 2),
                      Text(doctor.specialty,
                          style: const TextStyle(
                              color: Color(0xFF6B3A1F), fontSize: 12)),
                      const SizedBox(height: 4),
                      Wrap(
                        spacing: 12,
                        runSpacing: 4,
                        children: [
                          Text('${doctor.experience}y Experience',
                              style: const TextStyle(
                                  color: Color(0xFFA0622A),
                                  fontSize: 11,
                                  fontWeight: FontWeight.w500)),
                          Text('${doctor.totalPatients}+ Patients',
                              style: const TextStyle(
                                  color: Color(0xFFA0622A), fontSize: 11)),
                        ],
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text('Rs. ${doctor.fee}',
                        style: const TextStyle(
                            color: Color(0xFFD4822A),
                            fontSize: 12,
                            fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    Container(
                      width: 32,
                      height: 32,
                      decoration: const BoxDecoration(
                          color: Color(0xFF3B1F0A), shape: BoxShape.circle),
                      alignment: Alignment.center,
                      child: const Icon(Icons.chevron_right,
                          color: Color(0xFFFBF6EC), size: 16),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _avatarLetter(String name) {
    final cleaned =
        name.replaceFirst(RegExp(r'^Dr\.\s*', caseSensitive: false), '').trim();
    return cleaned.isEmpty ? 'D' : cleaned[0].toUpperCase();
  }
}

class _EmptyCard extends StatelessWidget {
  const _EmptyCard({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: const Color(0xFFFBF6EC),
        border: Border.all(color: const Color(0xFFEFE2CC)),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        children: [
          Icon(icon, color: const Color(0xFFEFE2CC), size: 32),
          const SizedBox(height: 8),
          Text(label,
              style: const TextStyle(color: Color(0xFFA0622A), fontSize: 13)),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        const SizedBox(height: 80),
        Text(message,
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.brownMid, fontSize: 13)),
        const SizedBox(height: 12),
        OutlinedButton(onPressed: onRetry, child: const Text('Retry')),
      ],
    );
  }
}
