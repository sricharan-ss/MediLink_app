import 'package:flutter/material.dart';
import '../core/app_colors.dart';
import '../core/session_store.dart';
import '../services/patient_api_service.dart';
import 'my_information_screen.dart';
import 'order_history_screen.dart';
import 'secure_vault_screen.dart';
import 'favorite_doctors_screen.dart';
import 'payment_history_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key, this.onBack});

  final VoidCallback? onBack;

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  String _orderPreview = 'Loading...';
  String _vaultPreview = 'Loading...';

  @override
  void initState() {
    super.initState();
    _loadProfileCounts();
  }

  Future<void> _loadProfileCounts() async {
    try {
      final results = await Future.wait<dynamic>([
        PatientApiService.getMedicationOrders(limit: 100),
        PatientApiService.getRecords(),
      ]);
      final orders = results[0] as List<Map<String, dynamic>>;
      final records = results[1] as PatientRecords;
      if (!mounted) return;
      setState(() {
        _orderPreview = _countLabel(orders.length, 'order');
        _vaultPreview = '${_countLabel(records.vault.length, 'file')} stored';
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _orderPreview = 'Unable to load';
        _vaultPreview = 'Unable to load';
      });
    }
  }

  String _countLabel(int count, String singular) {
    final noun = count == 1 ? singular : '${singular}s';
    return '$count $noun';
  }

  void _handleBack() {
    if (widget.onBack != null) {
      widget.onBack!();
      return;
    }
    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final fullName = SessionStore.fullName;
    final profileInitial = SessionStore.profileInitial;
    final email = SessionStore.email.isEmpty ? 'Not set' : SessionStore.email;
    final phoneNumber = SessionStore.phoneNumber;
    final agePreview = SessionStore.ageLabel.isNotEmpty
        ? '${SessionStore.ageLabel} years'
        : 'Age not set';
    final bloodPreview = SessionStore.bloodGroupLabel.isNotEmpty
        ? SessionStore.bloodGroupLabel
        : 'Blood Group not set';
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [AppColors.background, AppColors.paleGreen],
          ),
        ),
        child: SafeArea(
          bottom: false,
          child: Column(
            children: [
              // Profile Header
              Container(
                width: double.infinity,
                padding: const EdgeInsets.only(
                    left: 16, right: 16, top: 16, bottom: 32),
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [AppColors.primary, AppColors.secondary],
                  ),
                  borderRadius: BorderRadius.only(
                    bottomLeft: Radius.circular(24),
                    bottomRight: Radius.circular(24),
                  ),
                ),
                child: Column(
                  children: [
                    Align(
                      alignment: Alignment.topLeft,
                      child: IconButton(
                        icon: const Icon(Icons.arrow_back, color: Colors.white),
                        onPressed: _handleBack,
                        padding: EdgeInsets.zero,
                        alignment: Alignment.topLeft,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      width: 80,
                      height: 80,
                      decoration: const BoxDecoration(
                        color: AppColors.paleGreen,
                        shape: BoxShape.circle,
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        profileInitial,
                        style: const TextStyle(
                          color: AppColors.primary,
                          fontSize: 28,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      fullName,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'MediLink ID: ML-892401',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.85),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),

              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      // My Information
                      _buildSectionCard(
                        context,
                        title: 'My Information',
                        preview: '$agePreview - $bloodPreview',
                        icon: Icons.person_outline,
                        onTap: () async {
                          await Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (_) => const MyInformationScreen()),
                          );
                          if (mounted) setState(() {});
                        },
                        isInformation: true,
                        details: [
                          {
                            'label': 'Age',
                            'value': SessionStore.ageLabel.isNotEmpty
                                ? '${SessionStore.ageLabel} years'
                                : 'Not set'
                          },
                          {
                            'label': 'Gender',
                            'value': SessionStore.genderLabel.isNotEmpty
                                ? SessionStore.genderLabel
                                : 'Not set'
                          },
                          {'label': 'Phone', 'value': phoneNumber},
                          {'label': 'Email', 'value': email},
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Favorite Doctors
                      _buildSectionCard(
                        context,
                        title: 'Favorite Doctors',
                        preview: SessionStore.favoriteDoctorIds.isEmpty
                            ? 'No saved doctors'
                            : '${SessionStore.favoriteDoctorIds.length} saved ${SessionStore.favoriteDoctorIds.length == 1 ? "doctor" : "doctors"}',
                        icon: Icons.favorite_outline,
                        onTap: () async {
                          await Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const FavoriteDoctorsScreen(),
                            ),
                          );
                          if (mounted) setState(() {});
                        },
                      ),
                      const SizedBox(height: 12),

                      // Order History
                      _buildSectionCard(
                        context,
                        title: 'Order History',
                        preview: _orderPreview,
                        icon: Icons.inventory_2_outlined,
                        onTap: () async {
                          await Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (_) => const OrderHistoryScreen()),
                          );
                          if (mounted) _loadProfileCounts();
                        },
                      ),
                      const SizedBox(height: 12),

                      // Payment History
                      _buildSectionCard(
                        context,
                        title: 'Payment History',
                        preview: 'Invoices & transaction records',
                        icon: Icons.receipt_long_outlined,
                        onTap: () async {
                          await Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const PaymentHistoryScreen(),
                            ),
                          );
                        },
                      ),
                      const SizedBox(height: 12),

                      // Secure Vault
                      _buildSectionCard(
                        context,
                        title: 'Secure Vault',
                        preview: _vaultPreview,
                        icon: Icons.lock_outline,
                        onTap: () async {
                          await Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (_) => const SecureVaultScreen()),
                          );
                          if (mounted) _loadProfileCounts();
                        },
                      ),
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

  Widget _buildSectionCard(
    BuildContext context, {
    required String title,
    required String preview,
    required IconData icon,
    required VoidCallback onTap,
    bool isInformation = false,
    List<Map<String, String>>? details,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.white,
          border: Border.all(color: AppColors.paleGreen),
          borderRadius: BorderRadius.circular(14),
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
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: const BoxDecoration(
                    color: AppColors.paleGreen,
                    shape: BoxShape.circle,
                  ),
                  alignment: Alignment.center,
                  child: Icon(icon, color: AppColors.primary, size: 20),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        preview,
                        style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 12,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right,
                    color: AppColors.secondary, size: 20),
              ],
            ),
            if (isInformation && details != null) ...[
              const SizedBox(height: 16),
              const Divider(color: AppColors.paleGreen, height: 1),
              const SizedBox(height: 16),
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  childAspectRatio: 3,
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                ),
                itemCount: details.length,
                itemBuilder: (context, index) {
                  final detail = details[index];
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        detail['label']!,
                        style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 10,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        detail['value']!,
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  );
                },
              ),
            ],
          ],
        ),
      ),
    );
  }
}
