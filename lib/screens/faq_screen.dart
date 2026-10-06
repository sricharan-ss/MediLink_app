import 'package:flutter/material.dart';
import '../core/app_colors.dart';

class FAQScreen extends StatefulWidget {
  const FAQScreen({super.key});

  @override
  State<FAQScreen> createState() => _FAQScreenState();
}

class _FAQScreenState extends State<FAQScreen> {
  int _expandedIndex = 0;

  static const _items = [
    (
      q: 'How do I book an appointment?',
      a: 'You can book an appointment by navigating to the Home tab, selecting a hospital or doctor, and choosing an available time slot.'
    ),
    (
      q: 'Can I cancel or reschedule my appointment?',
      a: 'Yes. Open your appointment details and choose Cancel or Reschedule based on your need.'
    ),
    (
      q: 'How do I order medications?',
      a: 'Go to the Medications tab, choose Order Medicines, add items, and place your order.'
    ),
    (
      q: 'How long does medication delivery take?',
      a: 'Delivery times depend on your location and pharmacy, but most orders arrive within 24 to 48 hours.'
    ),
    (
      q: 'How do I access my medical records?',
      a: 'Use the Medical History tab to open prescriptions, lab reports, and appointment summaries.'
    ),
    (
      q: 'Is my data secure?',
      a: 'Yes. Your data is stored securely with access controls and encryption practices.'
    ),
    (
      q: 'Can I add family members to my account?',
      a: 'Family profiles support will be available in an upcoming release.'
    ),
    (
      q: 'How do I contact support?',
      a: 'Open Settings and use the phone or email details under Support Phone/Mail.'
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.white,
        title: const Text(
          'FAQs',
          style: TextStyle(fontWeight: FontWeight.w700),
        ),
        centerTitle: true,
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
              colors: [AppColors.primary, AppColors.secondary],
            ),
          ),
        ),
      ),
      body: SafeArea(
        child: ListView.separated(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 20),
          itemCount: _items.length,
          separatorBuilder: (_, __) => const SizedBox(height: 10),
          itemBuilder: (context, index) {
            final item = _items[index];
            final expanded = _expandedIndex == index;
            return InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: () {
                setState(() {
                  _expandedIndex = expanded ? -1 : index;
                });
              },
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: expanded ? AppColors.secondary : AppColors.paleGreen,
                    width: expanded ? 1.5 : 1,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.04),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            item.q,
                            style: const TextStyle(
                              color: AppColors.textPrimary,
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              height: 1.25,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Icon(
                          expanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                          color: expanded ? AppColors.primary : AppColors.secondary,
                        ),
                      ],
                    ),
                    if (expanded) ...[
                      const SizedBox(height: 10),
                      Text(
                        item.a,
                        style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 14,
                          fontWeight: FontWeight.w400,
                          height: 1.4,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
