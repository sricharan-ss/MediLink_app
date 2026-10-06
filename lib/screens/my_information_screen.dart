import 'package:flutter/material.dart';

import '../core/app_colors.dart';
import '../core/session_store.dart';

import '../services/auth_service.dart';

class MyInformationScreen extends StatefulWidget {
  const MyInformationScreen({super.key});

  @override
  State<MyInformationScreen> createState() => _MyInformationScreenState();
}

class _MyInformationScreenState extends State<MyInformationScreen> {
  late final TextEditingController _nameController;
  late final TextEditingController _ageController;
  late final TextEditingController _phoneController;
  late final TextEditingController _emailController;
  late final TextEditingController _emergencyController;

  late String _selectedGender;
  late String? _selectedBloodGroup;
  final List<String> _bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  late Set<String> _conditions;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: SessionStore.fullName);
    _ageController = TextEditingController(text: SessionStore.ageLabel);
    _phoneController = TextEditingController(text: SessionStore.phoneNumber);
    _emailController = TextEditingController(text: SessionStore.email);
    _emergencyController = TextEditingController(text: SessionStore.emergencyContact);

    _selectedGender = _mapGenderFromApi(SessionStore.genderLabel);
    _selectedBloodGroup = _mapBloodGroupFromApi(SessionStore.bloodGroupLabel);
    if (!_bloodGroups.contains(_selectedBloodGroup)) {
      _selectedBloodGroup = null;
    }
    _conditions = SessionStore.chronicConditionsLabel.toSet();
  }

  String _mapGenderFromApi(String apiValue) {
    if (apiValue.isEmpty) return 'Female';
    if (apiValue.toLowerCase() == 'male') return 'Male';
    if (apiValue.toLowerCase() == 'female') return 'Female';
    if (apiValue.toLowerCase() == 'other') return 'Other';
    return apiValue;
  }

  String? _mapBloodGroupFromApi(String? apiValue) {
    switch (apiValue) {
      case 'A_POSITIVE': return 'A+';
      case 'A_NEGATIVE': return 'A-';
      case 'B_POSITIVE': return 'B+';
      case 'B_NEGATIVE': return 'B-';
      case 'AB_POSITIVE': return 'AB+';
      case 'AB_NEGATIVE': return 'AB-';
      case 'O_POSITIVE': return 'O+';
      case 'O_NEGATIVE': return 'O-';
      default: return apiValue;
    }
  }

  String? _mapGenderToApi(String? genderLabel) {
    switch ((genderLabel ?? '').toLowerCase()) {
      case 'male': return 'male';
      case 'female': return 'female';
      case 'other': return 'other';
      default: return null;
    }
  }

  String? _mapBloodGroupToApi(String? bloodGroupLabel) {
    switch (bloodGroupLabel) {
      case 'A+': return 'A_POSITIVE';
      case 'A-': return 'A_NEGATIVE';
      case 'B+': return 'B_POSITIVE';
      case 'B-': return 'B_NEGATIVE';
      case 'AB+': return 'AB_POSITIVE';
      case 'AB-': return 'AB_NEGATIVE';
      case 'O+': return 'O_POSITIVE';
      case 'O-': return 'O_NEGATIVE';
      default: return null;
    }
  }

  Future<void> _saveProfile() async {
    final ageStr = _ageController.text.trim();
    final age = int.tryParse(ageStr);
    if (age == null) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter a valid age')));
      return;
    }

    final gender = _mapGenderToApi(_selectedGender);
    if (gender == null) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select a valid gender')));
      return;
    }

    setState(() => _isLoading = true);

    final result = await AuthService.upsertMyPatientProfile(
      age: age,
      gender: gender,
      email: _emailController.text.trim(),
      emergencyContact: _emergencyController.text.trim(),
      bloodGroup: _mapBloodGroupToApi(_selectedBloodGroup),
      chronicConditions: _conditions.toList(),
    );

    if (mounted) {
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(result.message)));
      if (result.success) {
        SessionStore.email = _emailController.text.trim();
        SessionStore.emergencyContact = _emergencyController.text.trim();
        SessionStore.age = ageStr;
        SessionStore.gender = gender;
        if (_selectedBloodGroup != null) SessionStore.bloodGroup = _mapBloodGroupToApi(_selectedBloodGroup)!;
        SessionStore.chronicConditions = _conditions.toList();
        Navigator.pop(context);
      }
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _ageController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _emergencyController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.warmWhite,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.white,
        title: const Text(
          'My Information',
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
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(14, 14, 14, 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const _FieldLabel('Full Name'),
              const SizedBox(height: 8),
              _InputField(controller: _nameController),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const _FieldLabel('Age'),
                        const SizedBox(height: 8),
                        _InputField(
                          controller: _ageController,
                          keyboardType: TextInputType.number,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const _FieldLabel('Blood Group'),
                        const SizedBox(height: 8),
                        _BloodGroupField(
                          value: _selectedBloodGroup,
                          items: _bloodGroups,
                          onChanged: (value) => setState(() => _selectedBloodGroup = value),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              const _FieldLabel('Gender'),
              const SizedBox(height: 8),
              Row(
                children: [
                  _GenderButton(
                    label: 'Male',
                    selected: _selectedGender == 'Male',
                    onTap: () => setState(() => _selectedGender = 'Male'),
                  ),
                  const SizedBox(width: 8),
                  _GenderButton(
                    label: 'Female',
                    selected: _selectedGender == 'Female',
                    onTap: () => setState(() => _selectedGender = 'Female'),
                  ),
                  const SizedBox(width: 8),
                  _GenderButton(
                    label: 'Other',
                    selected: _selectedGender == 'Other',
                    onTap: () => setState(() => _selectedGender = 'Other'),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              const _FieldLabel('Phone Number'),
              const SizedBox(height: 8),
              _InputField(controller: _phoneController, keyboardType: TextInputType.phone),
              const SizedBox(height: 12),
              const _FieldLabel('Email'),
              const SizedBox(height: 8),
              _InputField(controller: _emailController, keyboardType: TextInputType.emailAddress),
              const SizedBox(height: 12),
              const _FieldLabel('Emergency Contact'),
              const SizedBox(height: 8),
              _InputField(controller: _emergencyController, keyboardType: TextInputType.phone),
              const SizedBox(height: 12),
              const _FieldLabel('Chronic Conditions'),
              const SizedBox(height: 8),
              if (_conditions.isNotEmpty)
                Wrap(
                spacing: 10,
                runSpacing: 10,
                children: _conditions
                    .map(
                      (condition) => Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: AppColors.cream,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: AppColors.accent),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              condition,
                              style: const TextStyle(
                                color: AppColors.brownLight,
                                fontSize: 15,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(width: 8),
                            const Icon(
                              Icons.close,
                              size: 14,
                              color: AppColors.brownLight,
                            ),
                          ],
                        ),
                      ),
                    )
                    .toList(),
              ),
              const SizedBox(height: 26),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _saveProfile,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.brownDeep,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: _isLoading
                      ? const SizedBox(
                          height: 24,
                          width: 24,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : const Text(
                          'Save Changes',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
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

class _FieldLabel extends StatelessWidget {
  const _FieldLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        color: AppColors.brownLight,
        fontSize: 14,
        fontWeight: FontWeight.w700,
      ),
    );
  }
}

class _InputField extends StatelessWidget {
  const _InputField({
    required this.controller,
    this.keyboardType = TextInputType.text,
  });

  final TextEditingController controller;
  final TextInputType keyboardType;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      decoration: InputDecoration(
        filled: true,
        fillColor: AppColors.cream,
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.surface),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.surface),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.accent, width: 1.5),
        ),
      ),
    );
  }
}

class _BloodGroupField extends StatelessWidget {
  const _BloodGroupField({
    required this.value,
    required this.items,
    required this.onChanged,
  });

  final String? value;
  final List<String> items;
  final ValueChanged<String?> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: AppColors.cream,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.surface),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: value,
          isExpanded: true,
          icon: const Icon(Icons.keyboard_arrow_down, color: AppColors.brownMid),
          onChanged: onChanged,
          items: items
              .map((e) => DropdownMenuItem<String>(value: e, child: Text(e)))
              .toList(),
        ),
      ),
    );
  }
}

class _GenderButton extends StatelessWidget {
  const _GenderButton({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 11),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: selected ? AppColors.accent : AppColors.cream,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: selected ? AppColors.accent : AppColors.surface),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: selected ? Colors.white : AppColors.brownLight,
              fontSize: 15,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }
}
