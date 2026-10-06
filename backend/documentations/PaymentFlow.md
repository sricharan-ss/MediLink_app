# Payment Flow Documentation

## Overview

This document outlines the complete payment processing flow in VitaData, including automatic invoice generation on appointment creation, payment initiation with duplicate prevention, verification, and refund processing.

---

## API Routes & Frontend Integration

### Invoice Generation Flow

#### 1. Invoice Auto-Generated on Encounter Creation
When a patient books an appointment, an invoice is automatically created:

```
POST /api/encounters
Content-Type: application/json
Authorization: Bearer <token>

Request Body:
{
  "doctorId": "doctor-uuid",
  "patientId": "patient-uuid",
  "hospitalId": "hospital-uuid",
  "scheduledTime": "2026-02-25T10:00:00Z",
  "duration": 15,
  "visitType": "OPD",
  "reason": "Regular checkup"
}

Response: 201 Created
{
  "encounterId": "encounter-uuid",
  "tokenNo": 3,
  "doctorId": "doctor-uuid",
  "patientId": "patient-uuid",
  "hospitalId": "hospital-uuid",
  "scheduledTime": "2026-02-25T10:00:00Z",
  "duration": 15,
  "status": "SCHEDULED",
  "visitType": "OPD",
  "reason": "Regular checkup",
  "createdAt": "2026-02-25T09:00:00Z"
}
```

**Auto-Generated Invoice** (not shown in response but created in background):
```json
{
  "invoiceId": "invoice-uuid",
  "invoiceNumber": "INV-2026-534821",
  "patientId": "patient-uuid",
  "hospitalId": "hospital-uuid",
  "totalAmount": 500.00,
  "taxAmount": 50.00,
  "finalAmount": 550.00,
  "status": "PENDING",
  "generatedAt": "2026-02-25T09:00:00Z"
}
```

**Calculation Logic:**
- `totalAmount` = Doctor's consultationFee (default 500.00)
- `taxAmount` = totalAmount × 10% (tax rate)
- `finalAmount` = totalAmount + taxAmount - discountAmount
- Invoice linked via InvoiceItem with itemType="ENCOUNTER"

### Payment Routes

**Base URL**: `/api/payments`

#### 2. Initiate Payment (User Clicks "Pay Now" Button)
```
POST /api/payments/order
Content-Type: application/json
Authorization: Bearer <token>

Request Body:
{
  "invoiceId": "invoice-uuid",
  "amount": 550.00,
  "currency": "INR"
}

Response: 201 Created
{
  "payment": {
    "paymentId": "payment-uuid",
    "invoiceId": "invoice-uuid",
    "amount": 550.00,
    "orderId": "razorpay-order-id",
    "status": "PENDING",
    "createdAt": "2026-02-25T10:05:00Z"
  },
  "order": {
    "id": "razorpay-order-id",
    "entity": "order",
    "amount": 55000,
    "currency": "INR",
    "receipt": "INV-2026-534821"
  },
  "isExisting": false,
  "message": "New payment order created"
}
```

**Duplicate Payment Prevention:**
- If "Pay Now" clicked multiple times within 15 minutes, same payment/order is reused
- Response will have `isExisting: true` if order was reused
- Prevents multiple charges for same invoice

**Frontend Usage (Pay Button Click)**:
```javascript
const response = await fetch('/api/payments/order', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({
    invoiceId: invoice.invoiceId,
    amount: invoice.finalAmount,
    currency: 'INR'
  })
});

const { payment, order, isExisting } = await response.json();

// Load Razorpay and open payment modal
const options = {
  key: 'YOUR_RAZORPAY_KEY',
  order_id: order.id,
  amount: order.amount,
  currency: order.currency,
  name: 'VitaData Hospital',
  description: invoice.invoiceNumber,
  handler: async (response) => {
    // Verify payment on backend
    const verifyResponse = await fetch('/api/payments/verify', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        paymentId: payment.paymentId,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpayOrderId: response.razorpay_order_id,
        razorpaySignature: response.razorpay_signature
      })
    });
    
    const verified = await verifyResponse.json();
    if (verified.status === 'SUCCESS') {
      alert('Payment Successful!');
      // Redirect to appointment confirmation
      window.location.href = '/appointments/confirmed';
    }
  }
};

const rzp = new Razorpay(options);
rzp.open();
```

#### 3. Verify Payment (After Razorpay Returns)
```
POST /api/payments/verify
Content-Type: application/json
Authorization: Bearer <token>

Request Body:
{
  "paymentId": "payment-uuid",
  "razorpayPaymentId": "pay_xxxxx",
  "razorpayOrderId": "order_xxxxx",
  "razorpaySignature": "signature_xxxxx"
}

Response: 200 OK
{
  "paymentId": "payment-uuid",
  "invoiceId": "invoice-uuid",
  "status": "SUCCESS",
  "transactionId": "pay_xxxxx",
  "paidAt": "2026-02-25T10:07:00Z",
  "message": "Payment verified and captured successfully"
}
```

**Payment Status Values:**
- `PENDING` → Payment initiated, waiting for user to complete in Razorpay
- `SUCCESS` → Payment completed and verified (correct enum value, not "COMPLETED")
- `FAILED` → Payment declined or failed in Razorpay
- `REFUNDED` → Payment refunded due to appointment cancellation
- `CANCELLED` → Payment cancelled by user or system

---

## Implementation Details

### Refund Flow

**When Encounter is Cancelled:**
1. System checks for existing payment records for the encounter's invoice
2. If payment status is `SUCCESS` → Initiate refund process
3. Create refund transaction record:
   - New Payment record with amount as negative (original amount × -1)
   - Status: `REFUNDED`
   - TransactionId: Razorpay refund ID
4. Update original payment status to `REFUNDED`
5. Delete associated doctor schedule
6. Delete encounter record

**Refund API Endpoint:**
```
DELETE /api/encounters/:encounterId
Authorization: Bearer <token>

Response: 204 No Content
```

**Automatic Refund Record Created:**
```json
{
  "paymentId": "refund-uuid",
  "invoiceId": "same-as-original",
  "mode": "original-payment-mode",
  "amount": -550.00,
  "transactionId": "REFUND-pay_xxxxx",
  "status": "REFUNDED",
  "remarks": "Refund for cancelled encounter {encounterId}",
  "createdAt": "2026-02-25T10:30:00Z"
}
```

**Frontend Usage (Cancel Appointment)**:
```javascript
const cancelAppointment = async (encounterId) => {
  const response = await fetch(`/api/encounters/${encounterId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (response.ok) {
    alert('Appointment cancelled and refund initiated');
    // Refresh appointments list
  }
};
```

### Invoice → Payment → Refund Lifecycle

**Payment Lifecycle:**

1. **Encounter Created** → **Invoice Auto-Generated**
   - Invoice Status: `PENDING`
   - No payment record yet
   - Invoice includes: consultation fee, tax calculation, invoice number

2. **User Clicks "Pay Now" Button**
   - `POST /api/payments/order` called
   - Payment record created with status `PENDING`
   - Razorpay order generated (amount in paise)
   - Duplicate prevention: if same invoice already has PENDING payment < 15 min old, reuses it

3. **User Completes Payment (Razorpay Checkout)**
   - User fills payment details in Razorpay modal
   - Gateway processes payment
   - User receives OTP/confirmation

4. **Payment Verified on Backend**
   - `POST /api/payments/verify` called with Razorpay signature
   - Signature verified for security (prevents tampering)
   - Payment status updated to `SUCCESS`
   - Razorpay transactionId stored in Payment record
   - Note: Invoice status is NOT automatically updated by this step (only Payment record is updated)
   - Invoice status update must be handled by application business logic or manual action

5. **Appointment Confirmed**
   - Token number auto-generated (per doctor, per day)
   - Doctor schedule confirmed
   - Patient notified via SMS/Push/Email
   - App displays confirmation with token number

6. **Appointment Cancellation (Optional)**
   - `DELETE /api/encounters/:encounterId`
   - Invoice status → `CANCELLED`
   - Refund initiated through Razorpay API via payment service
   - New Payment record created with negative amount (accounting refund entry)
   - Original payment marked as `REFUNDED`
   - Refund ID from Razorpay stored in refund Payment record
   - Patient refunded to original payment method (Razorpay processes gateway refund)
   - Note: Encounter deletion runs full cleanup including doctor schedule removal

**Payment Status Flow:**
```
PENDING → SUCCESS → (End) or REFUNDED
       ↘ FAILED → (End)
       ↘ CANCELLED → (End)
```

**Invoice Status Values:**
- `DRAFT` → Invoice created but not finalized
- `PENDING` → Invoice ready, awaiting payment
- `PAID` → Payment successful, appointment confirmed
- `PARTIALLY_PAID` → Partial payment received (future feature)
- `CANCELLED` → Appointment cancelled, invoice voided
- `OVERDUE` → Payment not received by due date

---

## Payment Schema (from Prisma)

### Invoice Model
```
Invoice {
  invoiceId         String @id @default(uuid())
  patientId         String (FK)
  hospitalId        String (FK, optional)
  invoiceNumber     String @unique
  totalAmount       Decimal
  discountAmount    Decimal @default(0)
  taxAmount         Decimal @default(0)
  finalAmount       Decimal
  status            InvoiceStatus @default(PENDING)
    // DRAFT | PENDING | PAID | PARTIALLY_PAID | CANCELLED | OVERDUE
  generatedAt       DateTime @default(now())
  dueDate           DateTime
  paidDate          DateTime
  notes             String
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // Relations
  items             InvoiceItem[]
  payments          Payment[]
}
```

### InvoiceItem Model
```
InvoiceItem {
  invoiceItemId String @id @default(uuid())
  invoiceId     String (FK)
  itemType      InvoiceItemType
    // ENCOUNTER | MEDICINE | LAB_TEST | BED_CHARGE | PROCEDURE | CONSULTATION | SURGERY | OTHER
  itemId        String (optional, reference ID)
  description   String
  quantity      Int @default(1)
  unitPrice     Decimal
  discount      Decimal @default(0)
  totalPrice    Decimal
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relations
  invoice       Invoice @relation(fields: [invoiceId])
  encounter     Encounter @relation(fields: [itemId], references: [encounterId])
}
```

### Payment Model
```
Payment {
  paymentId       String @id @default(uuid())
  invoiceId       String (FK)
  mode            PaymentMode
    // CASH | CARD | ONLINE | INSURANCE | UPI | BANK_TRANSFER
  amount          Decimal
  transactionId   String @unique (Razorpay payment_id or refund ID)
  orderId         String (Razorpay order_id)
  transactionDate DateTime
  status          PaymentStatus @default(PENDING)
    // SUCCESS | PENDING | FAILED | REFUNDED | CANCELLED
  gatewayResponse Json (full Razorpay response)
  remarks         String
  paidBy          String
  receiptNumber   String @unique
  paidAt          DateTime @default(now())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // Relations
  invoice         Invoice @relation(fields: [invoiceId])
}
```

---

## Integration Points

### 1. When Invoice is Auto-Generated (on Encounter Creation)
- **Trigger:** `POST /api/encounters`
- **What happens:**
  - Encounter record created with `status: SCHEDULED`
  - Token number auto-generated based on doctor's appointments for the day
  - DoctorSchedule created and linked to encounter
  - Invoice created automatically with:
    - Consultation fee from doctor record (default 500.00)
    - Tax calculated (10% of consultation fee)
    - Invoice number generated (INV-YYYY-RANDOM)
    - Status: `PENDING`
  - InvoiceItem created linking encounter to invoice
  
**Response Includes:**
- Encounter details with tokenNo
- Does NOT include invoice details (created silently)
- Frontend must query `/api/invoices` to get invoice

### 2. When Patient Views Invoice (Optional API)
- **Endpoint:** `GET /api/invoices/:invoiceId` or `GET /api/invoices?patientId={patientId}`
- Frontend displays:
  - Invoice number
  - Total amount with tax breakdown
  - Due date
  - "Pay Now" button (enabled if status is PENDING or OVERDUE)

### 3. When Patient Clicks "Pay Now"
- **Endpoint:** `POST /api/payments/order`
- **Duplicate Prevention:**
  - Checks if invoice already has PENDING payment created < 15 minutes ago
  - If yes and Razorpay order is still valid (not paid/attempted), reuses it
  - Response includes `isExisting: true` to let frontend know
- Razorpay checkout modal opens with order details
- User completes payment in Razorpay

### 4. After Successful Razorpay Payment
- **Endpoint:** `POST /api/payments/verify`
- Payment status updated to `SUCCESS`
- Invoice status updated to `PAID`
- Returns confirmation with transactionId
- Frontend should:
  - Show success message
  - Show appointment confirmation with token number
  - Optionally navigate to appointment details page

### 5. Before Appointment Time
- **Display on Frontend:**
  - Token number (from encounter.tokenNo)
  - Queue position (based on encounters for this doctor that day)
  - Doctor's name and specialization
  - Scheduled time
  - "Cancel Appointment" button (if before cancellation deadline)

### 6. When Patient Cancels Appointment
- **Endpoint:** `DELETE /api/encounters/:encounterId`
- **What happens:**
  - Encounter status → `CANCELLED`
  - Invoice status → `CANCELLED`
  - If original payment was `SUCCESS`:
    - Razorpay refund initiated
    - New Payment record created with:
      - Status: `REFUNDED`
      - Amount: negative (original × -1)
      - TransactionId: Razorpay refund ID
    - Original payment marked as `REFUNDED`
  - DoctorSchedule deleted (slot becomes available)
  - Response: 204 No Content
- **Frontend:**
  - Show "Cancellation successful"
  - Show "Refund will be processed to your original payment method (2-5 business days)"
  - Remove appointment from list

---

## Error Handling

### Common Payment Errors

**Error: "Multiple payments for same invoice in short time"**
- Status: 400 Bad Request
- Cause: User clicked "Pay Now" multiple times rapidly
- Solution: Reuses existing PENDING payment, included in `isExisting` flag

**Error: "Payment signature verification failed"**
- Status: 401 Unauthorized
- Cause: Tampered Razorpay response or HMAC mismatch
- Solution: Show error to user, ask to retry


---

## Payment Flow Summary (Description)

The VitaData payment flow is designed for seamless, secure, and automated processing:

1. **Invoice Generation:** When a patient books an appointment, an invoice is auto-generated in the background, including consultation fee, tax, and a unique invoice number. The invoice is linked to the encounter and can be fetched by the frontend.

2. **Payment Initiation:** On clicking "Pay Now," a payment order is created. Duplicate payment attempts within 15 minutes reuse the same order to prevent double charges. Razorpay is used for payment processing.

3. **Payment Verification:** After payment, the backend verifies the transaction and updates the payment status to `SUCCESS` if valid. The frontend is notified of the result.

4. **Appointment Confirmation:** Successful payment confirms the appointment, assigns a token number, and notifies the patient.

5. **Refunds:** If the appointment is cancelled, the system checks for successful payments and initiates a refund through Razorpay. A negative payment record is created, and the original payment is marked as `REFUNDED`.

**Status Values:**
- Payment: `PENDING`, `SUCCESS`, `FAILED`, `REFUNDED`, `CANCELLED`
- Invoice: `DRAFT`, `PENDING`, `PAID`, `PARTIALLY_PAID`, `CANCELLED`, `OVERDUE`

**Summary:**
The flow ensures automatic invoice creation, duplicate payment prevention, secure transaction verification, and automatic refunds, all tightly integrated with Razorpay for a smooth user experience.

**Error: "Cannot refund payment in PENDING status"**
- Status: 400 Bad Request
- Cause: Tried to cancel appointment before payment was verified
- Solution: Delete encounter to cancel; refund only upon SUCCESS status
