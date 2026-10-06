# PHASE 3 — MEDICINE ORDERING + INVOICE + RAZORPAY
## Final Implementation Report

**Status:** COMPLETE  
**Project:** MediLink – Smart Healthcare Patient Management System  
**Date:** September 18, 2026  

---

### A. Files Modified

#### 1. Backend:
- `backend/src/modules/medicines/medicine.repo.js`: Enhanced search filter across `name`, `type`, `composition`, and `manufacturer`. Populated inventory association with active inventory records to provide real prices and quantities.
- `backend/src/modules/invoices/invoice.repo.js`: Expanded `getInvoices` and `getInvoiceById` to include associated `items` (`InvoiceItem`) and `payments` (`Payment`).
- `backend/src/modules/invoices/invoice.service.js`: Added `createMedicineInvoiceService` (with server-side inventory unit price retrieval, stock validation, 5% GST computation, unique invoice numbering `MED-YYYY-XXXXXX`, and transactional `Invoice` + `InvoiceItem` records with `itemType: MEDICINE`) and `cancelInvoiceService`.
- `backend/src/modules/invoices/invoice.controller.js`: Implemented `createMedicineOrder` controller validating items and enforcing authenticated patient identity (`req.user.patientId`).
- `backend/src/routes/payment.route.js`: Registered `POST /invoices/medicine-order` protected by `verifyToken` & `checkRole(['PATIENT', 'ADMIN'])`.
- `backend/src/modules/payments/payment.service.js`: In `verifyPaymentService`, updated capture logic so that upon successful payment signature verification, the associated `Invoice` is marked `PAID` with `paidDate`, and inventory quantities are safely decremented for `MEDICINE` invoice items.

#### 2. Frontend (Flutter):
- `lib/services/patient_api_service.dart`:
  - Completely purged fake `createMedicationOrder`, fake refill APIs, fake delivery status, and fake mock responses.
  - Implemented real `getOrderableMedicines({query, limit})` consuming `GET /api/medicines`.
  - Implemented `createMedicineInvoice({items, shippingAddress, notes})` posting to `/api/payments/invoices/medicine-order`.
  - Implemented `createRazorpayOrder({invoiceId, amount, currency, notes})` invoking `POST /api/payments/order`.
  - Implemented `verifyPayment({orderId, paymentId, signature})` invoking `POST /api/payments/verify`.
  - Implemented real `getMedicationOrders({status, limit})` querying `/api/payments/invoices` and filtering for `items[].itemType == 'MEDICINE'`.
  - Implemented real `getMedicationOrderById(invoiceId)` querying `/api/payments/invoices/:id`.
  - Aligned `getMedicationDashboard()` to aggregate legitimate prescription data.
- `lib/screens/order_medicines_screen.dart`:
  - Complete rewrite using the official MediLink design tokens: Deep Teal (`#2C6975`), Soft Teal (`#68B2A0`), Sage (`#CDE0C9`), Pale Green (`#E0ECDE`), White (`#FFFFFF`), Text (`#263238`), Secondary (`#607D80`), Error (`#D9534F`), Success (`#3F8F6B`).
  - Completely eliminated all brown/cream legacy VITADATA styling.
  - Real medicine catalogue with live search, composition, manufacturer, and inventory pricing.
  - Interactive cart: add, increment, decrement (min 1), remove, empty cart prevention, and discontinued item blocking.
  - Server-calculated checkout: creates invoice on backend, initializes Razorpay with `invoiceId` and backend-verified amount, collects and verifies payment signature on backend, and clears cart only after backend verification succeeds.
- `lib/screens/order_history_screen.dart`:
  - Cleaned up to display real invoice numbers, dates (`createdAt`), status tags, item descriptions, and Indian Rupee (`Rs.`) amounts.
- `lib/screens/order_tracking_screen.dart`:
  - Replaced fake courier tracking with honest invoice/payment statuses derived strictly from database records (`Invoice Created`, `Payment Verified`, `Cancelled`).
- `lib/screens/refill_page_screen.dart`:
  - Rebuilt to pull real prescriptions and route refill requests directly to the legitimate `OrderMedicinesScreen` checkout flow.

#### 3. Test Suite:
- `test/medicine_order_invoice_test.dart`:
  - Unit tests covering line item calculations, 5% GST computation, cart quantity constraints, and `MEDICINE` `itemType` schema mapping.

---

### B. New & Changed Backend Endpoints

| Method | Endpoint | Protection | Description |
|---|---|---|---|
| `GET` | `/api/medicines` | Public / Patient | Returns medicine catalogue with joined inventory prices and stock. |
| `POST` | `/api/payments/invoices/medicine-order` | Authenticated (`PATIENT`) | Validates items, looks up inventory prices, computes 5% GST, creates `Invoice` + `InvoiceItem` (`itemType: MEDICINE`). |
| `POST` | `/api/payments/order` | Authenticated (`PATIENT`) | Creates Razorpay order bound to `invoiceId`. |
| `POST` | `/api/payments/verify` | Authenticated (`PATIENT`) | Verifies Razorpay HMAC signature, marks Invoice `PAID`, decrements inventory stock. |
| `GET` | `/api/payments/invoices` | Authenticated (`PATIENT`) | Fetches patient invoices containing `InvoiceItem` records. |
| `GET` | `/api/payments/invoices/:id` | Authenticated (`PATIENT`) | Fetches full invoice detail by ID with ownership verification. |

---

### C. Medicine Catalogue & Pricing
- Medicines are fetched from `GET /api/medicines`.
- Pricing is derived from the Prisma `Inventory` model (`inventory[0].price`).
- If no inventory pricing record exists, the UI safely displays `"Price on request"` or `"Price unavailable"` and disallows checkout.
- No synthetic fields or fake price columns were added to the `Medicine` table.

---

### D. Cart Implementation
- Local state management within `OrderMedicinesScreen`.
- Quantity bounded $\ge 1$.
- Discontinued medicines (`isDiscontinued: true`) cannot be added.
- Empty cart checkout is blocked.
- Totals displayed in client are estimates; authoritative final amount is calculated on the server.
- Cart is preserved if payment fails or is aborted; cart is wiped only upon verified payment success.

---

### E. Server-Side Invoice Creation
- Backend extracts `patientId` strictly from the verified JWT payload (`req.user.patientId`).
- For each item, server queries `Inventory` for current unit price and stock.
- Generates a human-readable, unique `invoiceNumber` (e.g. `MED-2026-XXXXXX`).
- Computes `itemTotal = quantity * unitPrice`.
- Applies 5% GST (`tax = subtotal * 0.05`) and sets `finalAmount = subtotal + tax`.
- Stores `InvoiceItem` with:
  - `itemType = MEDICINE`
  - `itemId = medicineId`
  - `description = medicine.name`
  - `unitPrice`, `quantity`, `totalPrice`

---

### F. Razorpay Flow & Verification
1. App calls `POST /api/payments/invoices/medicine-order` and receives `invoiceId` and `finalAmount`.
2. App calls `POST /api/payments/order` with `invoiceId` and server-returned amount.
3. Razorpay checkout opens on device.
4. Upon signature return, app posts `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }` to `POST /api/payments/verify`.
5. Backend verifies HMAC SHA256 signature using `RAZORPAY_KEY_SECRET`.
6. Only when verification succeeds is the `Invoice` updated to `PAID` with `paidDate`, and stock is decremented in `Inventory`.
7. Success dialog displays order number, payment ID, amount, and items purchased.

---

### G. Order History & Honest Tracking
- Replaces fake `MedicationOrder` queries with queries on `Invoice` where `items[].itemType == 'MEDICINE'`.
- Tracking screen displays honest status progression:
  - `Invoice Created` (`PENDING`)
  - `Payment Verified` (`PAID`)
  - `Cancelled` (`CANCELLED`)
- No fake GPS tracking or invented courier locations.

---

### H. Refill Flow
- Patient selects eligible medicines from active prescriptions.
- Medicines are transferred directly into the medicine ordering flow for standard checkout.
- No phantom orders created without financial or inventory backing.

---

### I. Security & Ownership
- Patient identity verified via JWT (`req.user.patientId`).
- Patients cannot specify arbitrary `patientId`s or change item prices.
- Payment amounts enforced against the database invoice record.
- Invoices are partitioned per patient in queries.

---

### J. Test Results

1. **Prisma Schema Validation:**
   ```
   npx prisma validate
   The schema at prisma\schema.prisma is valid
   ```
2. **Backend Server & DB Health:**
   - `GET /health` -> `status: "OK"`
   - `GET /api/health/db` -> `status: "OK", database: "PostgreSQL"`
3. **Flutter Analysis:**
   - `flutter analyze` completed with 0 errors across all modified Phase 3 files.
4. **Flutter Automated Tests:**
   ```
   flutter test
   All 17 tests passed!
   ```

---

### Phase 3 Status
**PHASE 3 STATUS: COMPLETE**
