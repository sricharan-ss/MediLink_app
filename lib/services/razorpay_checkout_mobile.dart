import 'package:razorpay_flutter/razorpay_flutter.dart';

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
  }) {
    _razorpay = Razorpay()
      ..on(Razorpay.EVENT_PAYMENT_SUCCESS, _handleSuccess)
      ..on(Razorpay.EVENT_PAYMENT_ERROR, _handleError)
      ..on(Razorpay.EVENT_EXTERNAL_WALLET, _handleExternalWallet);
  }

  final RazorpaySuccessHandler onSuccess;
  final RazorpayErrorHandler onError;
  final RazorpayExternalWalletHandler onExternalWallet;

  late final Razorpay _razorpay;

  void open(Map<String, dynamic> options) {
    _razorpay.open(options);
  }

  void dispose() {
    _razorpay.clear();
  }

  void _handleSuccess(PaymentSuccessResponse response) {
    final paymentId = response.paymentId;
    final orderId = response.orderId;
    final signature = response.signature;
    if (paymentId == null || orderId == null || signature == null) {
      onError('Payment details were incomplete.');
      return;
    }
    onSuccess(
      paymentId: paymentId,
      razorpayOrderId: orderId,
      signature: signature,
    );
  }

  void _handleError(PaymentFailureResponse response) {
    onError(response.message ?? 'Payment was not completed.');
  }

  void _handleExternalWallet(ExternalWalletResponse response) {
    onExternalWallet(response.walletName ?? 'selected');
  }
}
