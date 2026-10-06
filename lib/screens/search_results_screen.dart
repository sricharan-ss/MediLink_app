import 'dart:async';

import 'package:flutter/material.dart';

import '../core/app_colors.dart';
import '../services/patient_api_service.dart';
import 'doctor_profile_screen.dart';
import 'hospital_detail_screen.dart';

class SearchResultsScreen extends StatefulWidget {
  const SearchResultsScreen({super.key});

  @override
  State<SearchResultsScreen> createState() => _SearchResultsScreenState();
}

class _SearchResultsScreenState extends State<SearchResultsScreen> {
  final TextEditingController _controller = TextEditingController();
  final FocusNode _focusNode = FocusNode();
  final List<String> _recentSearches = [
    'Cardiology',
    'General Medicine',
    'Hospitals'
  ];

  Timer? _debounce;
  String _activeTab = 'all';
  bool _isLoading = false;
  String? _errorMessage;
  List<PatientDoctor> _doctors = const [];
  List<PatientHospital> _hospitals = const [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance
        .addPostFrameCallback((_) => _focusNode.requestFocus());
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  String get _query => _controller.text.trim();

  List<PatientHospital> get _filteredHospitals {
    final query = _query.toLowerCase();
    if (query.isEmpty) return const [];
    return _hospitals.where((hospital) {
      return hospital.name.toLowerCase().contains(query) ||
          hospital.city.toLowerCase().contains(query) ||
          hospital.address.toLowerCase().contains(query) ||
          hospital.tags.any((tag) => tag.toLowerCase().contains(query));
    }).toList();
  }

  bool get _hasResults => _doctors.isNotEmpty || _filteredHospitals.isNotEmpty;

  void _onSearchChanged(String _) {
    setState(() {});
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), _loadResults);
  }

  Future<void> _loadResults() async {
    final query = _query;
    if (query.isEmpty) {
      setState(() {
        _isLoading = false;
        _errorMessage = null;
        _doctors = const [];
        _hospitals = const [];
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final results = await Future.wait([
        PatientApiService.getDoctors(query: query),
        PatientApiService.getHospitals(),
      ]);
      if (!mounted || query != _query) return;
      setState(() {
        _doctors = results[0] as List<PatientDoctor>;
        _hospitals = results[1] as List<PatientHospital>;
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

  void _clearSearch() {
    _controller.clear();
    _debounce?.cancel();
    setState(() {
      _doctors = const [];
      _hospitals = const [];
      _errorMessage = null;
      _isLoading = false;
    });
    _focusNode.requestFocus();
  }

  void _setQuery(String value) {
    _controller.text = value;
    _controller.selection =
        TextSelection.fromPosition(TextPosition(offset: value.length));
    _loadResults();
  }

  void _rememberSearch() {
    final query = _query;
    if (query.isEmpty) return;
    setState(() {
      _recentSearches
          .removeWhere((item) => item.toLowerCase() == query.toLowerCase());
      _recentSearches.insert(0, query);
      if (_recentSearches.length > 6) _recentSearches.removeLast();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.warmWhite,
      body: Column(
        children: [
          _buildHeader(),
          Expanded(
            child: _query.isEmpty ? _buildEmptyState() : _buildResultsState(),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
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
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 16, 14),
          child: Row(
            children: [
              GestureDetector(
                onTap: () => Navigator.pop(context),
                child: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.arrow_back,
                      color: AppColors.cream, size: 20),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Container(
                  height: 42,
                  decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14)),
                  child: Row(
                    children: [
                      const SizedBox(width: 12),
                      const Icon(Icons.search,
                          color: AppColors.brownMid, size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextField(
                          controller: _controller,
                          focusNode: _focusNode,
                          onChanged: _onSearchChanged,
                          onSubmitted: (_) => _rememberSearch(),
                          style: const TextStyle(
                            color: AppColors.brownDeep,
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                          decoration: const InputDecoration(
                            hintText: 'Search doctors, hospitals...',
                            hintStyle: TextStyle(
                                color: Color(0xFFB69A83), fontSize: 14),
                            border: InputBorder.none,
                            isDense: true,
                            contentPadding: EdgeInsets.zero,
                          ),
                        ),
                      ),
                      if (_controller.text.isNotEmpty)
                        GestureDetector(
                          onTap: _clearSearch,
                          child: Container(
                            width: 22,
                            height: 22,
                            margin: const EdgeInsets.only(right: 10),
                            decoration: const BoxDecoration(
                                color: AppColors.surface,
                                shape: BoxShape.circle),
                            child: const Icon(Icons.close,
                                size: 12, color: AppColors.brownDeep),
                          ),
                        )
                      else
                        const SizedBox(width: 10),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildSectionLabel('QUICK ACTIONS'),
        const SizedBox(height: 10),
        _buildQuickActions(),
        const SizedBox(height: 24),
        if (_recentSearches.isNotEmpty) ...[
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.history, color: AppColors.brownLight, size: 16),
                  SizedBox(width: 6),
                  Text('Recent Searches',
                      style: TextStyle(
                          color: AppColors.brownDeep,
                          fontSize: 14,
                          fontWeight: FontWeight.w600)),
                ],
              ),
              GestureDetector(
                onTap: () => setState(_recentSearches.clear),
                child: const Text('Clear All',
                    style: TextStyle(
                        color: AppColors.accent,
                        fontSize: 12,
                        fontWeight: FontWeight.w600)),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _recentSearches.map(_buildRecentChip).toList(),
          ),
          const SizedBox(height: 24),
        ],
        const Row(
          children: [
            Icon(Icons.trending_up, color: AppColors.brownLight, size: 16),
            SizedBox(width: 6),
            Text('Trending Specialties',
                style: TextStyle(
                    color: AppColors.brownDeep,
                    fontSize: 14,
                    fontWeight: FontWeight.w600)),
          ],
        ),
        const SizedBox(height: 10),
        _buildTrendingGrid(),
      ],
    );
  }

  Widget _buildSectionLabel(String title) {
    return Text(
      title,
      style: const TextStyle(
          color: AppColors.brownLight,
          fontSize: 12,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.0),
    );
  }

  Widget _buildQuickActions() {
    final actions = [
      (
        icon: Icons.medical_services_outlined,
        label: 'Find Doctor',
        route: '/doctor-list'
      ),
      (
        icon: Icons.local_hospital_outlined,
        label: 'Hospitals',
        route: '/hospital-list'
      ),
      (
        icon: Icons.location_on_outlined,
        label: 'Nearby',
        route: '/hospital-list'
      ),
    ];

    return Row(
      children: actions.map((action) {
        return Expanded(
          child: Padding(
            padding: EdgeInsets.only(right: action == actions.last ? 0 : 10),
            child: GestureDetector(
              onTap: () => Navigator.pushNamed(
                context,
                action.route,
                arguments:
                    action.label == 'Nearby' ? {'nearbyOnly': true} : null,
              ),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.surface),
                ),
                child: Column(
                  children: [
                    Container(
                      width: 42,
                      height: 42,
                      decoration: const BoxDecoration(
                          color: AppColors.cream, shape: BoxShape.circle),
                      child: Icon(action.icon,
                          size: 22, color: AppColors.brownDeep),
                    ),
                    const SizedBox(height: 8),
                    Text(action.label,
                        style: const TextStyle(
                            color: AppColors.brownDeep,
                            fontSize: 11,
                            fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildRecentChip(String search) {
    return Container(
      padding: const EdgeInsets.only(left: 12, right: 4, top: 6, bottom: 6),
      decoration: BoxDecoration(
        color: AppColors.cream,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.surface),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          GestureDetector(
            onTap: () => _setQuery(search),
            child: Text(search,
                style: const TextStyle(
                    color: AppColors.brownMid,
                    fontSize: 12,
                    fontWeight: FontWeight.w500)),
          ),
          const SizedBox(width: 4),
          GestureDetector(
            onTap: () => setState(() => _recentSearches.remove(search)),
            child: const SizedBox(
              width: 18,
              height: 18,
              child: Icon(Icons.close, size: 10, color: AppColors.brownLight),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTrendingGrid() {
    const specialties = [
      'Cardiology',
      'Pediatrics',
      'Neurology',
      'Dermatology',
      'Orthopedics',
      'Psychiatry'
    ];
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
        mainAxisExtent: 50,
      ),
      itemCount: specialties.length,
      itemBuilder: (context, index) => GestureDetector(
        onTap: () => _setQuery(specialties[index]),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: AppColors.cream,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.surface),
          ),
          child: Row(
            children: [
              Container(
                width: 30,
                height: 30,
                decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(10)),
                child: const Icon(Icons.medical_services_outlined,
                    size: 16, color: AppColors.brownDeep),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  specialties[index],
                  style: const TextStyle(
                      color: AppColors.brownDeep,
                      fontSize: 13,
                      fontWeight: FontWeight.w500),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildResultsState() {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: const BoxDecoration(
              color: AppColors.warmWhite,
              border: Border(bottom: BorderSide(color: AppColors.surface))),
          child: Row(
            children: [
              _buildTab('all', 'All'),
              const SizedBox(width: 8),
              _buildTab('doctors', 'Doctors'),
              const SizedBox(width: 8),
              _buildTab('hospitals', 'Hospitals'),
            ],
          ),
        ),
        Expanded(
          child: _isLoading
              ? const Center(
                  child: CircularProgressIndicator(color: AppColors.accent))
              : _errorMessage != null
                  ? _buildErrorState()
                  : _hasResults
                      ? _buildResultsList()
                      : _buildNoResults(),
        ),
      ],
    );
  }

  Widget _buildTab(String value, String label) {
    final isActive = _activeTab == value;
    return GestureDetector(
      onTap: () => setState(() => _activeTab = value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 7),
        decoration: BoxDecoration(
          color: isActive ? AppColors.brownDeep : AppColors.cream,
          borderRadius: BorderRadius.circular(20),
          border: isActive ? null : Border.all(color: AppColors.surface),
        ),
        child: Text(
          label,
          style: TextStyle(
              color: isActive ? AppColors.cream : AppColors.brownMid,
              fontSize: 13,
              fontWeight: FontWeight.w600),
        ),
      ),
    );
  }

  Widget _buildErrorState() {
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        Text(_errorMessage!,
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.brownMid, fontSize: 13)),
        const SizedBox(height: 12),
        OutlinedButton(onPressed: _loadResults, child: const Text('Retry')),
      ],
    );
  }

  Widget _buildNoResults() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.search_off, size: 44, color: AppColors.surface),
            const SizedBox(height: 16),
            const Text('No results found',
                style: TextStyle(
                    color: AppColors.brownDeep,
                    fontSize: 16,
                    fontWeight: FontWeight.w600)),
            const SizedBox(height: 6),
            Text(
              'We could not find anything matching "${_controller.text}". Try a specialty, doctor name, or hospital city.',
              textAlign: TextAlign.center,
              style: TextStyle(
                  color: AppColors.brownMid.withOpacity(0.7), fontSize: 14),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResultsList() {
    final hospitals = _filteredHospitals;
    final showDoctors =
        (_activeTab == 'all' || _activeTab == 'doctors') && _doctors.isNotEmpty;
    final showHospitals = (_activeTab == 'all' || _activeTab == 'hospitals') &&
        hospitals.isNotEmpty;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (showDoctors) ...[
          _buildResultSectionHeader('DOCTORS', _doctors.length),
          const SizedBox(height: 10),
          ..._doctors.map(_buildDoctorResult),
          const SizedBox(height: 20),
        ],
        if (showHospitals) ...[
          _buildResultSectionHeader('HOSPITALS', hospitals.length),
          const SizedBox(height: 10),
          ...hospitals.map(_buildHospitalResult),
        ],
      ],
    );
  }

  Widget _buildResultSectionHeader(String title, int count) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title,
            style: const TextStyle(
                color: AppColors.brownLight,
                fontSize: 12,
                fontWeight: FontWeight.w700,
                letterSpacing: 1.0)),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(12)),
          child: Text('$count found',
              style: const TextStyle(
                  color: AppColors.brownDeep,
                  fontSize: 10,
                  fontWeight: FontWeight.w500)),
        ),
      ],
    );
  }

  Widget _buildDoctorResult(PatientDoctor doctor) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: GestureDetector(
        onTap: () {
          _rememberSearch();
          Navigator.push(
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
              ),
            ),
          );
        },
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.surface)),
          child: Row(
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: AppColors.accent,
                child: Text(_avatarLetter(doctor.name),
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.w700)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(doctor.name,
                        style: const TextStyle(
                            color: AppColors.brownDeep,
                            fontSize: 15,
                            fontWeight: FontWeight.w600),
                        overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 2),
                    Text(doctor.specialty,
                        style: const TextStyle(
                            color: AppColors.brownMid,
                            fontSize: 12,
                            fontWeight: FontWeight.w500)),
                    const SizedBox(height: 2),
                    Text(doctor.hospitalName,
                        style: const TextStyle(
                            color: AppColors.brownLight, fontSize: 11),
                        overflow: TextOverflow.ellipsis),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right,
                  color: AppColors.surface, size: 22),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHospitalResult(PatientHospital hospital) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: GestureDetector(
        onTap: () {
          _rememberSearch();
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => HospitalDetailScreen(
                  hospitalName: hospital.name, hospitalId: hospital.id),
            ),
          );
        },
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.surface)),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(14)),
                child: const Icon(Icons.local_hospital_outlined,
                    size: 24, color: AppColors.brownDeep),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(hospital.name,
                        style: const TextStyle(
                            color: AppColors.brownDeep,
                            fontSize: 15,
                            fontWeight: FontWeight.w600),
                        overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        const Icon(Icons.location_on_outlined,
                            size: 12, color: AppColors.brownMid),
                        const SizedBox(width: 3),
                        Expanded(
                          child: Text(
                              '${hospital.city} - ${hospital.doctorCount} doctors',
                              style: const TextStyle(
                                  color: AppColors.brownMid, fontSize: 12),
                              overflow: TextOverflow.ellipsis),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Wrap(
                        spacing: 6,
                        runSpacing: 4,
                        children: hospital.tags.take(2).map(_tagChip).toList()),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _tagChip(String tag) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
          color: AppColors.cream, borderRadius: BorderRadius.circular(12)),
      child: Text(tag,
          style: const TextStyle(
              color: AppColors.brownLight,
              fontSize: 10,
              fontWeight: FontWeight.w500)),
    );
  }

  String _avatarLetter(String name) {
    final cleaned =
        name.replaceFirst(RegExp(r'^Dr\.\s*', caseSensitive: false), '').trim();
    return cleaned.isEmpty ? 'D' : cleaned[0].toUpperCase();
  }
}
