import 'package:flutter/foundation.dart';

class BackendConfig {
  const BackendConfig._();

  static String get baseUrl {
    const fromEnv = String.fromEnvironment('API_BASE_URL', defaultValue: '');
    final configured = fromEnv.trim();
    if (configured.isNotEmpty) {
      return _normalize(configured);
    }

    // Backend folder location does not matter; only reachable host/port matters.
    final fallback = (defaultTargetPlatform == TargetPlatform.android)
        ? 'http://10.0.2.2:5000'
        : 'http://127.0.0.1:5000';
    return _normalize(fallback);
  }

  static String _normalize(String url) {
    if (url.endsWith('/')) {
      return url.substring(0, url.length - 1);
    }
    return url;
  }
}
