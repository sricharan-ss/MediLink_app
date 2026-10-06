import 'package:flutter_test/flutter_test.dart';
import 'package:patient/main.dart';

void main() {
  testWidgets('Landing page renders key content', (WidgetTester tester) async {
    await tester.pumpWidget(const MediLinkApp());

    expect(find.text('MediLink'), findsOneWidget);
    expect(find.text('Get Started'), findsOneWidget);
    expect(find.textContaining('Already have an account'), findsOneWidget);
  });
}
