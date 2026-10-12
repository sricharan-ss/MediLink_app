import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:url_launcher/url_launcher.dart';
import '../core/app_colors.dart';
import '../services/patient_api_service.dart';

class SecureVaultScreen extends StatefulWidget {
  const SecureVaultScreen({super.key});

  @override
  State<SecureVaultScreen> createState() => _SecureVaultScreenState();
}

class _SecureVaultScreenState extends State<SecureVaultScreen> {
  final List<Map<String, String>> _files = [];
  bool _isLoading = true;
  bool _isUploading = false;
  String? _errorMessage;

  Future<void> _openVaultLink(String? value) async {
    final url = value?.trim() ?? '';
    final uri = Uri.tryParse(url);
    if (uri == null || !uri.hasScheme) return;

    final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!launched && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not open vault link')),
      );
    }
  }

  @override
  void initState() {
    super.initState();
    _loadVault();
  }

  Future<void> _loadVault() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      final records = await PatientApiService.getRecords();
      if (!mounted) return;
      setState(() {
        _files
          ..clear()
          ..addAll(
            records.vault.map((file) {
              final name = file['fileName']?.toString() ?? 'Medical document';
              final ext = name.split('.').last.toLowerCase();
              final mimeType = file['mimeType']?.toString().toLowerCase() ?? '';
              return {
                'id': file['id']?.toString() ?? name,
                'name': name,
                'type': _fileType(ext, mimeType),
                'date': file['uploadedAt']?.toString() ??
                    DateTime.now().toIso8601String(),
                'size': _formatBytes(file['bytes']),
                'url': file['fileUrl']?.toString() ?? '',
              };
            }),
          );
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

  Future<void> _addFile() async {
    try {
      // Use file_picker which works on both Mobile and Web
      FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['jpg', 'jpeg', 'png', 'pdf'],
        withData: kIsWeb,
      );

      if (result != null && result.files.single.name.isNotEmpty) {
        final file = result.files.single;
        final fileName = file.name;
        final bytes = file.bytes;
        final path = kIsWeb ? null : file.path;

        setState(() => _isUploading = true);
        await PatientApiService.uploadVaultFile(
          fileName: fileName,
          filePath: path,
          bytes: bytes,
        );
        await _loadVault();

        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('File added successfully'),
            backgroundColor: AppColors.primary,
            duration: Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(PatientApiService.friendlyError(e)),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) setState(() => _isUploading = false);
    }
  }

  Future<void> _deleteFile(String id, String name) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Document'),
        content:
            Text('Are you sure you want to delete "$name" from your vault?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      await PatientApiService.deleteVaultFile(id);
      await _loadVault();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Document deleted successfully')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(PatientApiService.friendlyError(e)),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  String _formatDate(String isoString) {
    try {
      final date = DateTime.parse(isoString);
      final months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      return '${months[date.month - 1]} ${date.day}';
    } catch (_) {
      return isoString;
    }
  }

  String _fileType(String ext, String mimeType) {
    if (mimeType.startsWith('image/') ||
        ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].contains(ext)) {
      return 'image';
    }
    if (mimeType.contains('pdf') || ext == 'pdf') return 'pdf';
    if (mimeType.startsWith('video/') ||
        ['mp4', 'mov', 'avi', 'mkv'].contains(ext)) {
      return 'video';
    }
    return 'file';
  }

  String _formatBytes(dynamic value) {
    final bytes = value is num ? value.toDouble() : double.tryParse('$value');
    if (bytes == null || bytes <= 0) return 'Cloud file';
    const units = ['B', 'KB', 'MB', 'GB'];
    var size = bytes;
    var unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return '${size.toStringAsFixed(unitIndex == 0 ? 0 : 1)} ${units[unitIndex]}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Secure Vault',
          style: TextStyle(
            color: AppColors.white,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        backgroundColor: AppColors.primary,
        iconTheme: const IconThemeData(color: AppColors.white),
        elevation: 0,
      ),
      body: Stack(
        children: [
          ListView(
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 100),
            children: [
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                child: Text(
                  'Your medical documents stored securely on MediLink',
                  style:
                      TextStyle(color: AppColors.textSecondary, fontSize: 13),
                ),
              ),
              const SizedBox(height: 16),
              if (_isLoading)
                const Padding(
                  padding: EdgeInsets.only(top: 80),
                  child: Center(
                    child: CircularProgressIndicator(color: AppColors.primary),
                  ),
                )
              else if (_errorMessage != null)
                Padding(
                  padding: const EdgeInsets.only(top: 80),
                  child: Center(
                    child: Text(
                      _errorMessage!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 13,
                      ),
                    ),
                  ),
                )
              else if (_files.isEmpty)
                const Padding(
                  padding: EdgeInsets.only(top: 80),
                  child: Center(
                    child: Text(
                      'No vault files uploaded yet.',
                      style: TextStyle(
                          color: AppColors.textSecondary, fontSize: 13),
                    ),
                  ),
                )
              else
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 0.85,
                  ),
                  itemCount: _files.length,
                  itemBuilder: (context, index) {
                    final file = _files[index];
                    final type = file['type'];

                    return GestureDetector(
                      onTap: () => _openVaultLink(file['url']),
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.white,
                          border: Border.all(color: AppColors.paleGreen),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Container(
                                  width: 44,
                                  height: 44,
                                  decoration: BoxDecoration(
                                    color: AppColors.paleGreen,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  alignment: Alignment.center,
                                  child: Icon(
                                    type == 'pdf'
                                        ? Icons.picture_as_pdf_outlined
                                        : type == 'image'
                                            ? Icons.image_outlined
                                            : type == 'video'
                                                ? Icons.play_circle_outline
                                                : Icons
                                                    .insert_drive_file_outlined,
                                    color: AppColors.primary,
                                    size: 22,
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(
                                    Icons.delete_outline,
                                    color: AppColors.textSecondary,
                                    size: 20,
                                  ),
                                  onPressed: () =>
                                      _deleteFile(file['id']!, file['name']!),
                                  tooltip: 'Delete document',
                                  constraints: const BoxConstraints(
                                    minWidth: 32,
                                    minHeight: 32,
                                  ),
                                  padding: EdgeInsets.zero,
                                  splashRadius: 18,
                                ),
                              ],
                            ),
                            const Spacer(),
                            Text(
                              file['name']!,
                              style: const TextStyle(
                                color: AppColors.textPrimary,
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                const Icon(
                                  Icons.calendar_today_outlined,
                                  color: AppColors.textSecondary,
                                  size: 10,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  _formatDate(file['date']!),
                                  style: const TextStyle(
                                    color: AppColors.textSecondary,
                                    fontSize: 10,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              file['url']!.isEmpty
                                  ? file['size']!
                                  : file['url']!,
                              style: const TextStyle(
                                color: AppColors.textSecondary,
                                fontSize: 10,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
            ],
          ),
          Positioned(
            bottom: 24,
            right: 24,
            child: FloatingActionButton(
              onPressed: _isUploading ? null : _addFile,
              backgroundColor: AppColors.primary,
              elevation: 4,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(30),
              ),
              child: _isUploading
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppColors.white,
                      ),
                    )
                  : const Icon(Icons.add, color: AppColors.white, size: 28),
            ),
          ),
        ],
      ),
    );
  }
}
