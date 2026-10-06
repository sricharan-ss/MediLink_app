import 'package:flutter/material.dart';
import '../core/app_colors.dart';
import '../services/patient_api_service.dart';
import 'hospital_detail_screen.dart';

class HospitalListScreen extends StatefulWidget {
  final bool nearbyOnly;

  const HospitalListScreen({super.key, this.nearbyOnly = false});

  @override
  State<HospitalListScreen> createState() => _HospitalListScreenState();
}

class _HospitalListScreenState extends State<HospitalListScreen> {
  String _searchQuery = '';

  // Filter states
  String? _appliedLocation;
  Set<String> _appliedSpecialties = {};
  bool _isLoading = true;
  String? _errorMessage;
  List<PatientHospital> _hospitals = [];

  @override
  void initState() {
    super.initState();
    _loadHospitals();
  }

  Future<void> _loadHospitals() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      final hospitals = await PatientApiService.getHospitals();
      if (!mounted) return;
      setState(() {
        _hospitals = hospitals;
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

  List<String> get _allTags {
    final tags = <String>{};
    for (final h in _hospitals) {
      tags.addAll(h.tags);
    }
    return tags.toList()..sort();
  }

  List<String> get _allLocations {
    final locs = <String>{};
    for (final h in _hospitals) {
      locs.add(h.city);
    }
    return locs.toList()..sort();
  }

  List<PatientHospital> get _filteredHospitals {
    var result = _hospitals.where((h) {
      // 1. Search Query
      final matchesQuery =
          _searchQuery.isEmpty ||
          h.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          h.city.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          h.tags.any(
            (t) => t.toLowerCase().contains(_searchQuery.toLowerCase()),
          );

      // 2. Location
      bool matchesLocation = true;
      if (_appliedLocation != null) {
        matchesLocation = h.city == _appliedLocation;
      }

      // 3. Specialties
      bool matchesSpecialty = true;
      if (_appliedSpecialties.isNotEmpty) {
        matchesSpecialty = h.tags.any((t) => _appliedSpecialties.contains(t));
      }

      return matchesQuery && matchesLocation && matchesSpecialty;
    }).toList();

    // Sort by distance if nearby mode
    if (widget.nearbyOnly) {
      result.sort((a, b) => a.city.compareTo(b.city));
    }

    return result;
  }

  void _showFilterSheet() {
    String? tempLocation = _appliedLocation;
    Set<String> tempSpecialties = Set.from(_appliedSpecialties);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.warmWhite,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) {
          Widget buildChip(String title, bool isSelected, VoidCallback onTap) {
            return GestureDetector(
              onTap: onTap,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: isSelected
                      ? AppColors.accent
                      : const Color(0xFFFBF6EC),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isSelected ? AppColors.accent : AppColors.surface,
                  ),
                ),
                child: Text(
                  title,
                  style: TextStyle(
                    color: isSelected ? Colors.white : AppColors.brownDeep,
                    fontSize: 13,
                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                  ),
                ),
              ),
            );
          }

          Widget buildSectionTitle(String title) {
            return Text(
              title,
              style: const TextStyle(
                color: AppColors.brownDeep,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            );
          }

          return SafeArea(
            child: SizedBox(
              height: MediaQuery.of(context).size.height * 0.75,
              child: Column(
                children: [
                  // Header
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 16, 16),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Filter Hospitals',
                          style: TextStyle(
                            color: AppColors.brownDeep,
                            fontSize: 22,
                            fontWeight: FontWeight.w700,
                            fontFamily: 'Playfair Display',
                          ),
                        ),
                        IconButton(
                          icon: const Icon(
                            Icons.close,
                            color: AppColors.brownDeep,
                          ),
                          onPressed: () => Navigator.pop(context),
                        ),
                      ],
                    ),
                  ),
                  const Divider(color: AppColors.surface, height: 1),
                  // Scrollable Content
                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          buildSectionTitle('Location'),
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: _allLocations.map((loc) {
                              return buildChip(
                                loc,
                                tempLocation == loc,
                                () => setModalState(
                                  () => tempLocation = tempLocation == loc
                                      ? null
                                      : loc,
                                ),
                              );
                            }).toList(),
                          ),
                          const SizedBox(height: 24),

                          buildSectionTitle('Specialties'),
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: _allTags.map((tag) {
                              final isSelected = tempSpecialties.contains(tag);
                              return buildChip(tag, isSelected, () {
                                setModalState(() {
                                  if (isSelected) {
                                    tempSpecialties.remove(tag);
                                  } else {
                                    tempSpecialties.add(tag);
                                  }
                                });
                              });
                            }).toList(),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const Divider(color: AppColors.surface, height: 1),
                  // Bottom Actions
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                    child: Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: () {
                              setModalState(() {
                                tempLocation = null;
                                tempSpecialties.clear();
                              });
                            },
                            child: Container(
                              height: 48,
                              decoration: BoxDecoration(
                                color: const Color(0xFFFBF6EC),
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: AppColors.surface),
                              ),
                              alignment: Alignment.center,
                              child: const Text(
                                'Clear All',
                                style: TextStyle(
                                  color: AppColors.brownDeep,
                                  fontSize: 15,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: InkWell(
                            onTap: () {
                              setState(() {
                                _appliedLocation = tempLocation;
                                _appliedSpecialties = tempSpecialties;
                              });
                              Navigator.pop(context);
                            },
                            child: Container(
                              height: 48,
                              decoration: BoxDecoration(
                                color: AppColors.accent,
                                borderRadius: BorderRadius.circular(14),
                              ),
                              alignment: Alignment.center,
                              child: const Text(
                                'Apply Filters',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 15,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isFilterActive =
        _appliedLocation != null || _appliedSpecialties.isNotEmpty;

    return Scaffold(
      backgroundColor: AppColors.warmWhite,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        foregroundColor: AppColors.warmWhite,
        title: Text(
          widget.nearbyOnly ? 'Nearby Hospitals' : 'Hospitals',
          style: const TextStyle(fontWeight: FontWeight.w700),
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
      body: SafeArea(
        child: Column(
          children: [
            // Nearby indicator
            if (widget.nearbyOnly)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                color: const Color(0xFFE8F5E9),
                child: const Row(
                  children: [
                    Icon(Icons.location_on, color: Color(0xFF2E7D32), size: 16),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Showing hospitals sorted by distance from your location',
                        style: TextStyle(
                          color: Color(0xFF2E7D32),
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 10, 10, 10),
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      height: 44,
                      decoration: BoxDecoration(
                        color: AppColors.cream,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.surface),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.search,
                            color: AppColors.brownMid,
                            size: 20,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: TextField(
                              onChanged: (value) {
                                setState(() {
                                  _searchQuery = value;
                                });
                              },
                              style: const TextStyle(
                                color: AppColors.brownDeep,
                                fontSize: 15,
                                fontWeight: FontWeight.w500,
                              ),
                              decoration: const InputDecoration(
                                hintText: 'Search hospitals...',
                                hintStyle: TextStyle(
                                  color: Color(0xFFB69A83),
                                  fontSize: 15,
                                  fontWeight: FontWeight.w500,
                                ),
                                border: InputBorder.none,
                                isDense: true,
                                contentPadding: EdgeInsets.zero,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: _showFilterSheet,
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: AppColors.cream,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: isFilterActive
                              ? AppColors.accent
                              : AppColors.surface,
                        ),
                      ),
                      child: Icon(
                        Icons.filter_alt_outlined,
                        color: isFilterActive
                            ? AppColors.accent
                            : AppColors.brownMid,
                        size: 20,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: _isLoading
                  ? const Center(
                      child: CircularProgressIndicator(color: AppColors.accent),
                    )
                  : _errorMessage != null
                  ? _LoadError(message: _errorMessage!, onRetry: _loadHospitals)
                  : _filteredHospitals.isEmpty
                  ? const Center(
                      child: Text(
                        'No hospitals found',
                        style: TextStyle(
                          color: AppColors.brownMid,
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(10, 0, 10, 14),
                      itemCount: _filteredHospitals.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final h = _filteredHospitals[index];
                        return GestureDetector(
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => HospitalDetailScreen(
                                hospitalName: h.name,
                                hospitalId: h.id,
                              ),
                            ),
                          ),
                          child: _HospitalRowCard(
                            name: h.name,
                            location: h.city,
                            distance: '${h.doctorCount} doctors',
                            tags: h.tags,
                            isNearby: widget.nearbyOnly,
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LoadError extends StatelessWidget {
  const _LoadError({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.brownMid, fontSize: 13),
            ),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: onRetry,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.brownDeep,
              ),
              child: const Text(
                'Retry',
                style: TextStyle(color: AppColors.warmWhite),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HospitalRowCard extends StatelessWidget {
  const _HospitalRowCard({
    required this.name,
    required this.location,
    required this.distance,
    required this.tags,
    this.isNearby = false,
  });

  final String name;
  final String location;
  final String distance;
  final List<String> tags;
  final bool isNearby;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
      decoration: BoxDecoration(
        color: AppColors.cream,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.surface),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  name,
                  style: const TextStyle(
                    color: AppColors.brownDeep,
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.paleGreen,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Text(
                  'MediLink Verified',
                  style: TextStyle(
                    color: AppColors.primary,
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              const Icon(
                Icons.location_on_outlined,
                color: Color(0xFF6B3A1F),
                size: 12,
              ),
              const SizedBox(width: 4),
              Text(
                '$location · $distance',
                style: TextStyle(
                  color: isNearby
                      ? const Color(0xFF2E7D32)
                      : const Color(0xFF6B3A1F),
                  fontSize: 14,
                  fontWeight: isNearby ? FontWeight.w600 : FontWeight.w500,
                ),
              ),
              if (isNearby) ...[
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 6,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE8F5E9),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    'Nearby',
                    style: TextStyle(
                      color: Color(0xFF2E7D32),
                      fontSize: 9,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: tags
                .map(
                  (tag) => Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE9DCCA),
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: Text(
                      tag,
                      style: const TextStyle(
                        color: AppColors.brownLight,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                )
                .toList(),
          ),
        ],
      ),
    );
  }
}
