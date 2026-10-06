// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use

import 'dart:js' as js;

typedef RazorpaySuccessHandler = Future<void> Function({
  required String paymentId,
  required String razorpayOrderId,
  required String signature,
});
typedef RazorpayErrorHandler = void Function(String message);
typedef RazorpayExternalWalletHandler = void Function(String walletName);

class RazorpayCheckoutService {
  RazorpayCheckoutService({
    required this.onSuccess,
    required this.onError,
    required this.onExternalWallet,
  });

  final RazorpaySuccessHandler onSuccess;
  final RazorpayErrorHandler onError;
  final RazorpayExternalWalletHandler onExternalWallet;

  void open(Map<String, dynamic> options) {
    final razorpayConstructor = js.context['Razorpay'];
    if (razorpayConstructor == null) {
      onError('Razorpay checkout could not be loaded.');
      return;
    }

    final checkoutOptions = Map<String, dynamic>.from(options);
    checkoutOptions['handler'] = js.allowInterop((dynamic response) {
      final result = js.JsObject.fromBrowserObject(response);
      onSuccess(
        paymentId: result['razorpay_payment_id']?.toString() ?? '',
        razorpayOrderId: result['razorpay_order_id']?.toString() ?? '',
        signature: result['razorpay_signature']?.toString() ?? '',
      );
    });
    checkoutOptions['modal'] = {
      'ondismiss': js.allowInterop(() {
        onError('Payment was not completed.');
      }),
    };

    final checkout =
        js.JsObject(razorpayConstructor, [js.JsObject.jsify(checkoutOptions)]);
    checkout.callMethod('open');
  }

  void dispose() {}
}
