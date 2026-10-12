export interface User {
  userId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phoneNumber: string;
  profile?: string | null;
  roles?: string[];
  superAdmin?: { superAdminId: string } | null;
  hospitalAdmin?: {
    adminId: string;
    hospitalId: string | null;
    hospital?: Hospital | null;
  } | null;
}

export interface Hospital {
  hospitalId: string;
  name: string;
  address: string;
  city: string;
  state?: string | null;
  rating?: number | null;
  ranking?: number | null;
  logoUrl?: string | null;
  doctors?: Doctor[];
  doctorCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Doctor {
  doctorId: string;
  userId: string;
  specialization: string;
  experience?: number | null;
  consultationFee?: number | null;
  isAvailable?: boolean;
  user?: {
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    email?: string | null;
    profile?: string | null;
  };
  hospitals?: {
    hospitalId: string;
    hospital?: Hospital;
  }[];
  hospitalName?: string;
  hospitalId?: string;
}

export interface Patient {
  patientId: string;
  userId: string;
  age?: number | null;
  dob?: string | null;
  gender?: string | null;
  bloodGroup?: string | null;
  address?: string | null;
  chronicConditions?: string[];
  createdAt?: string;
  user?: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email?: string | null;
    createdAt?: string;
  };
  _count?: {
    encounters: number;
    invoices: number;
  };
}

export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface Encounter {
  encounterId: string;
  patientId: string;
  doctorId: string;
  hospitalId?: string | null;
  scheduledTime: string;
  duration?: number | null;
  tokenNo?: number | null;
  status: AppointmentStatus;
  visitType: string;
  reason?: string | null;
  notes?: string | null;
  cancellationNote?: string | null;
  patient?: {
    patientId: string;
    user?: {
      firstName: string;
      lastName: string;
      phoneNumber: string;
      email?: string | null;
    };
  };
  doctor?: {
    doctorId: string;
    specialization: string;
    user?: {
      firstName: string;
      lastName: string;
      phoneNumber?: string;
    };
  };
  hospital?: {
    hospitalId: string;
    name: string;
    city?: string;
  };
  createdAt?: string;
}

export interface InvoiceItem {
  invoiceItemId: string;
  invoiceId: string;
  itemType: string;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Invoice {
  invoiceId: string;
  patientId: string;
  hospitalId?: string | null;
  invoiceNumber?: string | null;
  totalAmount: number;
  discountAmount: number;
  taxAmount: number;
  finalAmount: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED' | 'OVERDUE' | 'DRAFT';
  generatedAt: string;
  dueDate?: string | null;
  notes?: string | null;
  items?: InvoiceItem[];
  payments?: Payment[];
  patient?: {
    patientId: string;
    user?: {
      firstName: string;
      lastName: string;
      phoneNumber?: string;
      email?: string | null;
    };
  };
  hospital?: {
    hospitalId: string;
    name: string;
    city?: string;
  } | null;
}

export interface Payment {
  paymentId: string;
  invoiceId: string;
  amount: number;
  mode: string;
  transactionId?: string | null;
  orderId?: string | null;
  status: 'SUCCESS' | 'PENDING' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
  paidAt?: string | null;
  createdAt: string;
  invoice?: Invoice;
}

export interface DashboardSummary {
  totalPatients: number;
  totalDoctors: number;
  totalHospitals: number;
  totalAppointments: number;
  upcomingAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  totalInvoices: number;
  paidInvoicesCount: number;
  pendingInvoicesCount: number;
  paidRevenue: number;
  pendingRevenue: number;
  totalRevenue: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  appointmentDistribution: { status: string; count: number }[];
  invoiceDistribution: { status: string; count: number; amount: number }[];
  recentAppointments: {
    encounterId: string;
    patientName: string;
    doctorName: string;
    hospitalName: string;
    scheduledTime: string;
    status: string;
    visitType: string;
  }[];
  recentPayments: {
    paymentId: string;
    amount: number;
    mode: string;
    status: string;
    createdAt: string;
    patientName: string;
  }[];
}
