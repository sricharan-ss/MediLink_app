import 'package:flutter/material.dart';

import '../core/app_colors.dart';
import '../core/session_store.dart';
import '../services/patient_api_service.dart';
import 'doctor_profile_screen.dart';

class FavoriteDoctorsScreen extends StatefulWidget {
  const FavoriteDoctorsScreen({super.key});

  @override
  State<FavoriteDoctorsScreen> createState() => _FavoriteDoctorsScreenState();
}

class _FavoriteDoctorsScreenState extends State<FavoriteDoctorsScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  List<PatientDoctor> _doctors = [];
  final Set<String> _togglingIds = {};

  @override
  void initState() {
    super.initState();
    _loadFavoriteDoctors();
  }

  Future<void> _loadFavoriteDoctors() async {
    final favIds = SessionStore.favoriteDoctorIds;
    if (favIds.isEmpty) {
      if (mounted) {
        setState(() {
          _doctors = [];
          _isLoading = false;
          _errorMessage = null;
        });
      }
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // First attempt bulk retrieval
      final allDoctors = await PatientApiService.getDoctors();
      final doctorMap = {for (final d in allDoctors) d.id: d};

      final List<PatientDoctor> loaded = [];

      for (final id in favIds) {
        if (doctorMap.containsKey(id)) {
          loaded.add(doctorMap[id]!);
        } else {
          // If not in bulk list, attempt individual GET /api/doctors/:id
          try {
            final docData = await PatientApiService.getDoctor(id);
            loaded.add(PatientDoctor.fromJson(docData));
          } catch (_) {
            // Gracefully handle unavailable or deleted doctor
            loaded.add(
              PatientDoctor(
                id: id,
                name: 'Unavailable Doctor',
                specialty: 'Doctor Profile Unavailable',
                specialization: null,
                hospitalId: null,
                hospitalName: 'Information not available',
                rating: 0.0,
                reviewCount: 0,
                totalPatients: 0,
                experience: 0,
                fee: 0,
                isAvailable: false,
              ),
            );
          }
        }
      }

      if (!mounted) return;
      setState(() {
        _doctors = loaded;
        _isLoading = false;
      });
    } catch (e) {
      // Fallback to individual retrieval
      try {
        final List<PatientDoctor> individualLoaded = [];
        for (final id in favIds) {
          try {
            final docData = await PatientApiService.getDoctor(id);
            individualLoaded.add(PatientDoctor.fromJson(docData));
          } catch (_) {
            individualLoaded.add(
              PatientDoctor(
                id: id,
                name: 'Unavailable Doctor',
                specialty: 'Doctor Profile Unavailable',
                specialization: null,
                hospitalId: null,
                hospitalName: 'Information not available',
                rating: 0.0,
                reviewCount: 0,
                totalPatients: 0,
                experience: 0,
                fee: 0,
                isAvailable: false,
              ),
            );
          }
        }

        if (!mounted) return;
        setState(() {
          _doctors = individualLoaded;
          _isLoading = false;
        });
      } catch (err) {
        if (!mounted) return;
        setState(() {
          _errorMessage = PatientApiService.friendlyError(e);
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _handleRemoveFavorite(String doctorId) async {
    if (_togglingIds.contains(doctorId)) return;
    setState(() => _togglingIds.add(doctorId));

    try {
      await PatientApiService.toggleFavoriteDoctor(doctorId);
      if (!mounted) return;
      setState(() {
        _doctors.removeWhere((doc) => doc.id == doctorId);
        _togglingIds.remove(doctorId);
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Doctor removed from favorites'),
          duration: Duration(seconds: 2),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      setState(() => _togglingIds.remove(doctorId));
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(PatientApiService.friendlyError(error)),
          backgroundColor: const Color(0xFFD9534F),
        ),
      );
    }
  }

  void _onDoctorCardTap(PatientDoctor doctor) async {
    if (doctor.name == 'Unavailable Doctor') {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('This doctor profile is currently unavailable.'),
        ),
      );
      return;
    }

    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => DoctorProfileScreen(
          id: doctor.id,
          hospitalId: doctor.hospitalId,
          name: doctor.name,
          specialty: doctor.specialty,
          hospital: doctor.hospitalName,
          experience: doctor.experience,
          totalPatients: doctor.totalPatients,
          fee: doctor.fee,
          videoUrl: doctor.videoUrl,
        ),
      ),
    );

    // Refresh if doctor was unfavorited in profile screen
    if (mounted) {
      final currentFavs = SessionStore.favoriteDoctorIds;
      setState(() {
        _doctors.removeWhere((d) => !currentFavs.contains(d.id));
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.warmWhite,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        foregroundColor: AppColors.warmWhite,
        title: const Text(
          'Favorite Doctors',
          style: TextStyle(fontWeight: FontWeight.w700),
        ),
        centerTitle: true,
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
              colors: [AppColors.brownDeep, AppColors.brownMid],
            ),
          ),
        ),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(
          valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
        ),
      );
    }

    if (_errorMessage != null && _doctors.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.error_outline,
                size: 48,
                color: Color(0xFFD9534F),
              ),
              const SizedBox(height: 12),
              Text(
                _errorMessage!,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _loadFavoriteDoctors,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                child: const Text('Try Again'),
              ),
            ],
          ),
        ),
      );
    }

    if (_doctors.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 90,
                height: 90,
                decoration: const BoxDecoration(
                  color: AppColors.paleGreen,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.favorite_border,
                  size: 44,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                'No Favorite Doctors Yet',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  fontFamily: 'Playfair Display',
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Doctors you favorite will appear here for quick and easy access.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 13,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 12,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text(
                  'Find Doctors',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadFavoriteDoctors,
      color: AppColors.primary,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(14, 14, 14, 24),
        itemCount: _doctors.length,
        itemBuilder: (context, index) {
          final doctor = _doctors[index];
          final isToggling = _togglingIds.contains(doctor.id);

          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: GestureDetector(
              onTap: () => _onDoctorCardTap(doctor),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.cream,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.surface),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.04),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Avatar
                        Container(
                          width: 54,
                          height: 54,
                          decoration: const BoxDecoration(
                            color: AppColors.accent,
                            shape: BoxShape.circle,
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            doctor.name.length > 4 ? doctor.name[4] : 'D',
                            style: const TextStyle(
                              color: AppColors.cream,
                              fontSize: 20,
                              fontWeight: FontWeight.w700,
                              fontFamily: 'Playfair Display',
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      doctor.name,
                                      style: const TextStyle(
                                        color: AppColors.brownDeep,
                                        fontSize: 15,
                                        fontWeight: FontWeight.w700,
                                        fontFamily: 'Playfair Display',
                                      ),
                                    ),
                                  ),
                                  IconButton(
                                    iconSize: 22,
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(
                                      minWidth: 32,
                                      minHeight: 32,
                                    ),
                                    splashRadius: 20,
                                    icon: isToggling
                                        ? const SizedBox(
                                            width: 16,
                                            height: 16,
                                            child: CircularProgressIndicator(
                                              strokeWidth: 2,
                                              valueColor:
                                                  AlwaysStoppedAnimation<Color>(
                                                AppColors.primary,
                                              ),
                                            ),
                                          )
                                        : const Icon(
                                            Icons.favorite,
                                            color: Color(0xFFD9534F),
                                          ),
                                    tooltip: 'Remove from Favorites',
                                    onPressed: isToggling
                                        ? null
                                        : () => _handleRemoveFavorite(doctor.id),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 2),
                              Text(
                                doctor.specialty,
                                style: const TextStyle(
                                  color: AppColors.brownMid,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                doctor.hospitalName,
                                style: const TextStyle(
                                  color: AppColors.brownLight,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Wrap(
                                spacing: 10,
                                runSpacing: 4,
                                children: [
                                  if (doctor.rating > 0)
                                    Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Icon(
                                          Icons.star,
                                          color: Color(0xFFD4822A),
                                          size: 13,
                                        ),
                                        const SizedBox(width: 3),
                                        Text(
                                          '${doctor.rating.toStringAsFixed(1)} rating',
                                          style: const TextStyle(
                                            color: AppColors.brownLight,
                                            fontSize: 11,
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                      ],
                                    ),
                                  if (doctor.experience > 0)
                                    Text(
                                      '${doctor.experience}y exp',
                                      style: const TextStyle(
                                        color: AppColors.brownLight,
                                        fontSize: 11,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 6,
                                      vertical: 1,
                                    ),
                                    decoration: BoxDecoration(
                                      color: doctor.isAvailable
                                          ? AppColors.paleGreen
                                          : AppColors.surface,
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(
                                      doctor.isAvailable
                                          ? 'Available'
                                          : 'Unavailable',
                                      style: TextStyle(
                                        color: doctor.isAvailable
                                            ? AppColors.primary
                                            : AppColors.textSecondary,
                                        fontSize: 10,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
