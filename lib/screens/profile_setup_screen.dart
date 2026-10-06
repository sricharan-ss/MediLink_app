import 'package:flutter/material.dart';
import '../core/app_colors.dart';
import '../core/session_store.dart';
import '../services/auth_service.dart';

class ProfileSetupScreen extends StatefulWidget {
  const ProfileSetupScreen({super.key});

  @override
  State<ProfileSetupScreen> createState() => _ProfileSetupScreenState();
}

class _ProfileSetupScreenState extends State<ProfileSetupScreen> {
  String? _selectedGender = "Female";
  String? _selectedBloodGroup;
  final List<String> _bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  final List<String> _chronicConditions = ['Diabetes Type 2', 'Hypertension', 'Asthma', 'Allergies'];
  final Set<String> _selectedConditions = {'Hypertension', 'Allergies'};
  final TextEditingController _ageController = TextEditingController();
  final TextEditingController _customConditionController = TextEditingController();
  bool _isSaving = false;
  String? _errorMessage;

  void _toggleCondition(String condition) {
    setState(() {
      if (_selectedConditions.contains(condition)) {
        _selectedConditions.remove(condition);
      } else {
        _selectedConditions.add(condition);
      }
    });
  }

  void _addCustomCondition() {
    final text = _customConditionController.text.trim();
    if (text.isNotEmpty) {
      setState(() {
        if (!_chronicConditions.contains(text)) {
          _chronicConditions.add(text);
        }
        _selectedConditions.add(text);
        _customConditionController.clear();
      });
    }
  }

  @override
  void dispose() {
    _ageController.dispose();
    _customConditionController.dispose();
    super.dispose();
  }

  String? _mapGenderToApi(String? genderLabel) {
    switch ((genderLabel ?? '').toLowerCase()) {
      case 'male':
        return 'male';
      case 'female':
        return 'female';
      case 'other':
        return 'other';
      default:
        return null;
    }
  }

  String? _mapBloodGroupToApi(String? bloodGroupLabel) {
    switch (bloodGroupLabel) {
      case 'A+':
        return 'A_POSITIVE';
      case 'A-':
        return 'A_NEGATIVE';
      case 'B+':
        return 'B_POSITIVE';
      case 'B-':
        return 'B_NEGATIVE';
      case 'AB+':
        return 'AB_POSITIVE';
      case 'AB-':
        return 'AB_NEGATIVE';
      case 'O+':
        return 'O_POSITIVE';
      case 'O-':
        return 'O_NEGATIVE';
      default:
        return null;
    }
  }

  Future<void> _saveProfileAndContinue() async {
    final ageText = _ageController.text.trim();
    final age = int.tryParse(ageText);
    if (age == null || age < 0 || age > 130) {
      setState(() {
        _errorMessage = 'Please enter a valid age between 0 and 130.';
      });
      return;
    }

    final gender = _mapGenderToApi(_selectedGender);
    if (gender == null) {
      setState(() {
        _errorMessage = 'Please select a valid gender.';
      });
      return;
    }

    final bloodGroup = _mapBloodGroupToApi(_selectedBloodGroup);
    final chronicConditions = _selectedConditions.toList();

    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });

    final result = await AuthService.upsertMyPatientProfile(
      age: age,
      gender: gender,
      bloodGroup: bloodGroup,
      chronicConditions: chronicConditions,
    );

    if (!mounted) return;

    if (!result.success) {
      setState(() {
        _isSaving = false;
        _errorMessage = result.message;
      });
      return;
    }

    final phoneNumber = SessionStore.phoneNumber;
    final fullName = '${SessionStore.firstName} ${SessionStore.lastName}'.trim();
    SessionStore.registerUser(phoneNumber, {
      'firstName': SessionStore.firstName,
      'lastName': SessionStore.lastName,
      'fullName': fullName,
      'age': ageText,
      'gender': _selectedGender,
      'bloodGroup': _selectedBloodGroup,
      'chronicConditions': chronicConditions,
    });

    Navigator.pushNamedAndRemoveUntil(context, '/main-app', (route) => false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Tell us about you',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 26,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'This helps us personalize your care.',
                style: TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 15,
                  fontWeight: FontWeight.w400,
                ),
              ),
              const SizedBox(height: 20),

              // Age and Blood Group
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const _Label('Age'),
                        const SizedBox(height: 8),
                        _CustomTextField(hint: '32', keyboardType: TextInputType.number, controller: _ageController),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const _Label('Blood Group'),
                        const SizedBox(height: 8),
                        _BloodGroupDropdown(
                          value: _selectedBloodGroup,
                          items: _bloodGroups,
                          onChanged: (val) => setState(() => _selectedBloodGroup = val),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),

              // Gender
              const _Label('Gender'),
              const SizedBox(height: 8),
              Row(
                children: [
                  _GenderButton(
                    label: 'Male',
                    isSelected: _selectedGender == 'Male',
                    onTap: () => setState(() => _selectedGender = 'Male'),
                  ),
                  const SizedBox(width: 8),
                  _GenderButton(
                    label: 'Female',
                    isSelected: _selectedGender == 'Female',
                    onTap: () => setState(() => _selectedGender = 'Female'),
                  ),
                  const SizedBox(width: 8),
                  _GenderButton(
                    label: 'Other',
                    isSelected: _selectedGender == 'Other',
                    onTap: () => setState(() => _selectedGender = 'Other'),
                  ),
                ],
              ),
              const SizedBox(height: 18),

              // Chronic Conditions
              const _Label('Chronic Conditions (optional)'),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _chronicConditions.map((condition) {
                  return _ConditionChip(
                    label: condition,
                    isSelected: _selectedConditions.contains(condition),
                    onTap: () => _toggleCondition(condition),
                  );
                }).toList(),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _CustomTextField(
                      controller: _customConditionController,
                      hint: 'Add custom condition',
                    ),
                  ),
                  const SizedBox(width: 8),
                  _MiniActionButton(label: 'Add', onTap: _addCustomCondition),
                ],
              ),
              const SizedBox(height: 20),
              if (_errorMessage != null) ...[
                Text(
                  _errorMessage!,
                  style: const TextStyle(
                    color: AppColors.error,
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 10),
              ],

              // Continue Button
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _isSaving ? null : _saveProfileAndContinue,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: _isSaving
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.5,
                            valueColor: AlwaysStoppedAnimation<Color>(AppColors.white),
                          ),
                        )
                      : const Text(
                          'Continue',
                          style: TextStyle(
                            color: AppColors.white,
                            fontSize: 17,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                ),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }
}

class _Label extends StatelessWidget {
  final String text;
  const _Label(this.text);

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        color: AppColors.textPrimary,
        fontSize: 14,
        fontWeight: FontWeight.w700,
      ),
    );
  }
}

class _CustomTextField extends StatelessWidget {
  final String hint;
  final TextInputType keyboardType;
  final TextEditingController? controller;

  const _CustomTextField({
    required this.hint,
    this.keyboardType = TextInputType.text,
    this.controller,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: AppColors.textSecondary),
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.paleGreen, width: 1.2),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primary, width: 2),
        ),
      ),
    );
  }
}

class _BloodGroupDropdown extends StatelessWidget {
  final String? value;
  final List<String> items;
  final Function(String?) onChanged;

  const _BloodGroupDropdown({
    required this.value,
    required this.items,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.paleGreen, width: 1.2),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: value,
          hint: const Text('Select', style: TextStyle(color: AppColors.textSecondary)),
          isExpanded: true,
          icon: const Icon(Icons.keyboard_arrow_down, color: AppColors.textPrimary, size: 20),
          onChanged: onChanged,
          items: items.map<DropdownMenuItem<String>>((String value) {
            return DropdownMenuItem<String>(
              value: value,
              child: Text(value, style: const TextStyle(color: AppColors.textPrimary)),
            );
          }).toList(),
        ),
      ),
    );
  }
}

class _GenderButton extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _GenderButton({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

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
            color: isSelected ? AppColors.primary : Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: isSelected ? AppColors.primary : AppColors.paleGreen, width: 1.2),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: isSelected ? Colors.white : AppColors.textPrimary,
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }
}

class _ConditionChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _ConditionChip({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : AppColors.paleGreen.withValues(alpha: 0.5),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: isSelected ? AppColors.primary : AppColors.paleGreen),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : AppColors.textPrimary,
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}

class _MiniActionButton extends StatelessWidget {
  final String label;
  final VoidCallback onTap;

  const _MiniActionButton({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: AppColors.secondary,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Text(
          label,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 13,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}
