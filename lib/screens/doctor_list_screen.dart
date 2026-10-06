import 'package:flutter/material.dart';
import '../core/app_colors.dart';
import '../core/session_store.dart';
import '../services/patient_api_service.dart';
import 'doctor_profile_screen.dart';
import 'favorite_doctors_screen.dart';

class DoctorListScreen extends StatefulWidget {
  final String? initialSearchQuery;
  final String? hospitalId;

  const DoctorListScreen({super.key, this.initialSearchQuery, this.hospitalId});

  @override
  State<DoctorListScreen> createState() => _DoctorListScreenState();
}

class _DoctorListScreenState extends State<DoctorListScreen> {
  late TextEditingController _searchController;
  String _sortBy = 'rating'; // rating | reviews | patients
  final Set<String> _selectedSpecialties = {};
  bool _showFilter = false;
  bool _isLoading = true;
  String? _errorMessage;
  List<PatientDoctor> _doctors = [];

  List<String> get _allSpecialties {
    final s = <String>{};
    for (final d in _doctors) {
      s.add(d.specialty);
    }
    return s.toList()..sort();
  }

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController(
      text: widget.initialSearchQuery ?? '',
    );
    _loadDoctors();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadDoctors() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      final doctors = await PatientApiService.getDoctors(
        hospitalId: widget.hospitalId,
      );
      if (!mounted) return;
      setState(() {
        _doctors = doctors;
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

  List<PatientDoctor> get _filteredDoctors {
    var result = _doctors.toList();

    // Search
    final q = _searchController.text.trim().toLowerCase();
    if (q.isNotEmpty) {
      result = result.where((d) {
        return d.name.toLowerCase().contains(q) ||
            d.specialty.toLowerCase().contains(q) ||
            d.hospitalName.toLowerCase().contains(q);
      }).toList();
    }

    // Specialty filter
    if (_selectedSpecialties.isNotEmpty) {
      result = result
          .where((d) => _selectedSpecialties.contains(d.specialty))
          .toList();
    }

    // Sort
    if (_sortBy == 'rating') {
      result.sort((a, b) => b.rating.compareTo(a.rating));
    } else if (_sortBy == 'reviews') {
      result.sort((a, b) => b.reviewCount.compareTo(a.reviewCount));
    } else if (_sortBy == 'patients') {
      result.sort((a, b) => b.totalPatients.compareTo(a.totalPatients));
    }

    return result;
  }

  void _toggleSpecialty(String s) {
    setState(() {
      if (_selectedSpecialties.contains(s)) {
        _selectedSpecialties.remove(s);
      } else {
        _selectedSpecialties.add(s);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredDoctors;

    return Scaffold(
      backgroundColor: AppColors.warmWhite,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        foregroundColor: AppColors.warmWhite,
        title: const Text(
          'Find a Doctor',
          style: TextStyle(fontWeight: FontWeight.w700),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.favorite_outline),
            tooltip: 'Favorite Doctors',
            onPressed: () async {
              await Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const FavoriteDoctorsScreen(),
                ),
              );
              if (mounted) setState(() {});
            },
          ),
        ],
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
      body: Stack(
        children: [
          Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 14, 14, 0),
                child: Column(
                  children: [
                    // Search + Filter
                    Row(
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
                                  size: 18,
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: TextField(
                                    controller: _searchController,
                                    onChanged: (_) => setState(() {}),
                                    style: const TextStyle(
                                      color: AppColors.brownDeep,
                                      fontSize: 14,
                                      fontWeight: FontWeight.w500,
                                    ),
                                    decoration: const InputDecoration(
                                      hintText:
                                          'Search doctors or specialties...',
                                      hintStyle: TextStyle(
                                        color: Color(0xFFB69A83),
                                        fontSize: 14,
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
                          onTap: () => setState(() => _showFilter = true),
                          child: Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: AppColors.cream,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: _selectedSpecialties.isNotEmpty
                                    ? AppColors.accent
                                    : AppColors.surface,
                              ),
                            ),
                            child: Stack(
                              children: [
                                Center(
                                  child: Icon(
                                    Icons.tune,
                                    color: _selectedSpecialties.isNotEmpty
                                        ? AppColors.accent
                                        : AppColors.brownMid,
                                    size: 20,
                                  ),
                                ),
                                if (_selectedSpecialties.isNotEmpty)
                                  Positioned(
                                    top: 4,
                                    right: 4,
                                    child: Container(
                                      width: 16,
                                      height: 16,
                                      decoration: const BoxDecoration(
                                        color: AppColors.accent,
                                        shape: BoxShape.circle,
                                      ),
                                      alignment: Alignment.center,
                                      child: Text(
                                        '${_selectedSpecialties.length}',
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 9,
                                          fontWeight: FontWeight.w700,
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
                    const SizedBox(height: 12),

                    // Sort pills
                    Row(
                      children: [
                        _buildSortPill('rating', 'Top Rated'),
                        const SizedBox(width: 8),
                        _buildSortPill('reviews', 'Most Reviewed'),
                        const SizedBox(width: 8),
                        _buildSortPill('patients', 'Most Patients'),
                      ],
                    ),
                    const SizedBox(height: 10),

                    // Count
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        '${filtered.length} doctor${filtered.length != 1 ? 's' : ''} found',
                        style: const TextStyle(
                          color: AppColors.brownLight,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                  ],
                ),
              ),

              // Doctor cards
              Expanded(
                child: _isLoading
                    ? const Center(
                        child: CircularProgressIndicator(
                          color: AppColors.accent,
                        ),
                      )
                    : _errorMessage != null
                    ? _LoadError(message: _errorMessage!, onRetry: _loadDoctors)
                    : filtered.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Text(
                              'No doctors found',
                              style: TextStyle(
                                color: AppColors.brownMid,
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(height: 8),
                            GestureDetector(
                              onTap: () {
                                _searchController.clear();
                                setState(() => _selectedSpecialties.clear());
                              },
                              child: const Text(
                                'Clear filters',
                                style: TextStyle(
                                  color: AppColors.accent,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  decoration: TextDecoration.underline,
                                  decorationColor: AppColors.accent,
                                ),
                              ),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.fromLTRB(14, 0, 14, 16),
                        itemCount: filtered.length,
                        itemBuilder: (context, i) {
                          final d = filtered[i];
                          return _DoctorCard(
                            id: d.id,
                            name: d.name,
                            specialty: d.specialty,
                            hospitalId: d.hospitalId,
                            hospital: d.hospitalName,
                            rating: d.rating,
                            reviewCount: d.reviewCount,
                            totalPatients: d.totalPatients,
                            experience: d.experience,
                            fee: d.fee,
                            videoUrl: d.videoUrl,
                            aiPick: i < 2,
                          );
                        },
                      ),
              ),
            ],
          ),

          // Filter overlay
          if (_showFilter) _buildFilterOverlay(),
        ],
      ),
    );
  }

  Widget _buildSortPill(String value, String label) {
    final isActive = _sortBy == value;
    return GestureDetector(
      onTap: () => setState(() => _sortBy = value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: isActive ? AppColors.brownDeep : AppColors.cream,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isActive ? AppColors.brownDeep : AppColors.surface,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isActive ? AppColors.cream : AppColors.brownMid,
            fontSize: 12,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }

  Widget _buildFilterOverlay() {
    return GestureDetector(
      onTap: () => setState(() => _showFilter = false),
      child: Container(
        color: Colors.black54,
        child: Align(
          alignment: Alignment.bottomCenter,
          child: GestureDetector(
            onTap: () {}, // absorb taps on sheet
            child: Container(
              constraints: BoxConstraints(
                maxHeight: MediaQuery.of(context).size.height * 0.7,
              ),
              decoration: const BoxDecoration(
                color: AppColors.warmWhite,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Header
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 12, 12),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Filter by Specialty',
                          style: TextStyle(
                            color: AppColors.brownDeep,
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            fontFamily: 'Playfair Display',
                          ),
                        ),
                        IconButton(
                          icon: const Icon(
                            Icons.close,
                            color: AppColors.brownMid,
                            size: 22,
                          ),
                          onPressed: () => setState(() => _showFilter = false),
                        ),
                      ],
                    ),
                  ),
                  const Divider(color: AppColors.surface, height: 1),

                  // Chips
                  Flexible(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.all(20),
                      child: Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: _allSpecialties.map((s) {
                          final isSelected = _selectedSpecialties.contains(s);
                          return GestureDetector(
                            onTap: () => _toggleSpecialty(s),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 10,
                              ),
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? AppColors.accent
                                    : AppColors.cream,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                  color: isSelected
                                      ? AppColors.accent
                                      : AppColors.surface,
                                ),
                              ),
                              child: Text(
                                s,
                                style: TextStyle(
                                  color: isSelected
                                      ? Colors.white
                                      : AppColors.brownMid,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                  ),

                  const Divider(color: AppColors.surface, height: 1),

                  // Actions
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
                    child: Row(
                      children: [
                        Expanded(
                          child: GestureDetector(
                            onTap: () =>
                                setState(() => _selectedSpecialties.clear()),
                            child: Container(
                              height: 48,
                              decoration: BoxDecoration(
                                color: AppColors.cream,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: AppColors.surface),
                              ),
                              alignment: Alignment.center,
                              child: const Text(
                                'Clear',
                                style: TextStyle(
                                  color: AppColors.brownMid,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: GestureDetector(
                            onTap: () => setState(() => _showFilter = false),
                            child: Container(
                              height: 48,
                              decoration: BoxDecoration(
                                color: AppColors.accent,
                                borderRadius: BorderRadius.circular(14),
                              ),
                              alignment: Alignment.center,
                              child: const Text(
                                'Apply',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 14,
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
          ),
        ),
      ),
    );
  }
}

// ─── Doctor Card ─────────────────────────────────────────────────────────────

class _DoctorCard extends StatefulWidget {
  const _DoctorCard({
    required this.id,
    required this.name,
    required this.specialty,
    required this.hospitalId,
    required this.hospital,
    required this.rating,
    required this.reviewCount,
    required this.totalPatients,
    required this.experience,
    required this.fee,
    required this.videoUrl,
    required this.aiPick,
  });

  final String id;
  final String name;
  final String specialty;
  final String? hospitalId;
  final String hospital;
  final double rating;
  final int reviewCount;
  final int totalPatients;
  final int experience;
  final int fee;
  final String? videoUrl;
  final bool aiPick;

  @override
  State<_DoctorCard> createState() => _DoctorCardState();
}

class _DoctorCardState extends State<_DoctorCard> {
  bool _isToggling = false;

  Future<void> _handleFavoriteTap() async {
    if (_isToggling) return;
    setState(() => _isToggling = true);

    try {
      await PatientApiService.toggleFavoriteDoctor(widget.id);
      if (!mounted) return;
      setState(() => _isToggling = false);
    } catch (e) {
      if (!mounted) return;
      setState(() => _isToggling = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(PatientApiService.friendlyError(e)),
          backgroundColor: const Color(0xFFD9534F),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isFav = SessionStore.isDoctorFavorite(widget.id);

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GestureDetector(
        onTap: () async {
          await Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => DoctorProfileScreen(
                id: widget.id,
                hospitalId: widget.hospitalId,
                name: widget.name,
                specialty: widget.specialty,
                hospital: widget.hospital,
                experience: widget.experience,
                totalPatients: widget.totalPatients,
                fee: widget.fee,
                videoUrl: widget.videoUrl,
                aiRecommended: widget.aiPick,
              ),
            ),
          );
          if (mounted) {
            setState(() {});
          }
        },
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.cream,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.surface),
          ),
          child: Column(
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Avatar
                  Container(
                    width: 56,
                    height: 56,
                    decoration: const BoxDecoration(
                      color: AppColors.accent,
                      shape: BoxShape.circle,
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      widget.name.length > 3 ? widget.name[3] : 'D',
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
                                widget.name,
                                style: const TextStyle(
                                  color: AppColors.brownDeep,
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                  fontFamily: 'Playfair Display',
                                ),
                              ),
                            ),
                            if (widget.aiPick) ...[
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF1E7FF),
                                  borderRadius: BorderRadius.circular(14),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      '✦ ',
                                      style: TextStyle(
                                        color: Color(0xFF8F3AF8),
                                        fontSize: 9,
                                      ),
                                    ),
                                    Text(
                                      'AI Pick',
                                      style: TextStyle(
                                        color: Color(0xFF8F3AF8),
                                        fontSize: 10,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 4),
                            ],
                            IconButton(
                              iconSize: 22,
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(
                                minWidth: 32,
                                minHeight: 32,
                              ),
                              splashRadius: 20,
                              icon: _isToggling
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
                                  : Icon(
                                      isFav
                                          ? Icons.favorite
                                          : Icons.favorite_border,
                                      color: isFav
                                          ? const Color(0xFFD9534F)
                                          : AppColors.brownLight,
                                    ),
                              tooltip: isFav
                                  ? 'Remove from Favorites'
                                  : 'Add to Favorites',
                              onPressed:
                                  _isToggling ? null : _handleFavoriteTap,
                            ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          widget.specialty,
                          style: const TextStyle(
                            color: AppColors.brownMid,
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          widget.hospital,
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
                            Text(
                              '${widget.rating.toStringAsFixed(1)} rating',
                              style: const TextStyle(
                                color: AppColors.brownLight,
                                fontSize: 11,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            Text(
                              '${widget.reviewCount} reviews',
                              style: const TextStyle(
                                color: AppColors.brownLight,
                                fontSize: 11,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            Text(
                              '${widget.totalPatients}+ patients',
                              style: const TextStyle(
                                color: AppColors.brownLight,
                                fontSize: 11,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            Text(
                              '${widget.experience}y exp',
                              style: const TextStyle(
                                color: AppColors.brownLight,
                                fontSize: 11,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              // Fee + Book row
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.only(top: 10),
                decoration: const BoxDecoration(
                  border: Border(
                    top: BorderSide(color: AppColors.surface, width: 1),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    RichText(
                      text: TextSpan(
                        children: [
                          TextSpan(
                            text: '\$${widget.fee} ',
                            style: const TextStyle(
                              color: AppColors.brownDeep,
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const TextSpan(
                            text: '/ visit',
                            style: TextStyle(
                              color: AppColors.brownLight,
                              fontSize: 11,
                              fontWeight: FontWeight.w400,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.brownDeep,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Text(
                        'Book Now',
                        style: TextStyle(
                          color: AppColors.cream,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
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
