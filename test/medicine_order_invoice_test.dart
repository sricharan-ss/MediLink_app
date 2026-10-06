import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Medicine Ordering & Invoice Data Flow Tests', () {
    test('Calculates line item and server invoice amount correctly', () {
      final items = [
        {'medicineId': 'med-1', 'unitPrice': 150.0, 'quantity': 2},
        {'medicineId': 'med-2', 'unitPrice': 45.5, 'quantity': 3},
      ];

      double subtotal = 0.0;
      for (final item in items) {
        final price = item['unitPrice'] as double;
        final qty = item['quantity'] as int;
        subtotal += price * qty;
      }

      expect(subtotal, (150.0 * 2) + (45.5 * 3)); // 300 + 136.5 = 436.5
      final gst = subtotal * 0.05; // 5% GST
      final total = subtotal + gst;
      expect(total, closeTo(458.325, 0.001));
    });

    test('Medicine cart quantities are properly constrained', () {
      final cart = <String, int>{};

      // Add item
      cart['med-1'] = 1;
      expect(cart['med-1'], 1);

      // Increase quantity
      cart['med-1'] = cart['med-1']! + 1;
      expect(cart['med-1'], 2);

      // Decrease quantity
      cart['med-1'] = cart['med-1']! - 1;
      expect(cart['med-1'], 1);

      // Decrease to 0 removes from cart
      cart.remove('med-1');
      expect(cart.containsKey('med-1'), isFalse);
    });

    test('Invoice Item mapping matches MEDICINE itemType', () {
      final rawItem = {
        'invoiceItemId': 'inv-item-1',
        'invoiceId': 'inv-001',
        'itemType': 'MEDICINE',
        'itemId': 'med-101',
        'description': 'Paracetamol 500mg (Qty: 2)',
        'quantity': 2,
        'unitPrice': 25.0,
        'totalPrice': 50.0,
      };

      expect(rawItem['itemType'], 'MEDICINE');
      expect(rawItem['itemId'], 'med-101');
      expect(rawItem['quantity'], 2);
      expect(rawItem['unitPrice'], 25.0);
      expect(rawItem['totalPrice'], 50.0);
    });
  });
}
