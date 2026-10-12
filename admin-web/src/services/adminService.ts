import { api } from './api';
import type {
  DashboardData,
  Hospital,
  Doctor,
  Patient,
  Encounter,
  Invoice,
  Payment,
} from '../types';

export const adminService = {
  // Dashboard & Analytics
  async getDashboard(): Promise<DashboardData> {
    const response = await api.get<{ status: string; data: DashboardData }>('/analytics/dashboard');
    return response.data.data;
  },

  // Hospitals Management
  async getHospitals(params?: { search?: string; city?: string }): Promise<Hospital[]> {
    const response = await api.get<Hospital[]>('/hospitals', { params });
    return response.data;
  },

  async getHospitalById(id: string): Promise<Hospital> {
    const response = await api.get<Hospital>(`/hospitals/${id}`);
    return response.data;
  },

  async updateHospital(id: string, data: Partial<Hospital>): Promise<Hospital> {
    const response = await api.put<Hospital>(`/hospitals/${id}`, data);
    return response.data;
  },

  // Doctors Management
  async getDoctors(params?: {
    specialization?: string;
    hospitalId?: string;
    isAvailable?: boolean;
    search?: string;
  }): Promise<Doctor[]> {
    const response = await api.get<Doctor[]>('/doctors', { params });
    return response.data;
  },

  async getDoctorById(id: string): Promise<Doctor> {
    const response = await api.get<Doctor>(`/doctors/${id}`);
    return response.data;
  },

  async updateDoctor(id: string, data: Partial<Doctor>): Promise<Doctor> {
    const response = await api.put<Doctor>(`/doctors/${id}`, data);
    return response.data;
  },

  // Patients Management
  async getPatients(params?: { search?: string; doctorId?: string }): Promise<Patient[]> {
    const response = await api.get<Patient[]>('/patients', { params });
    return response.data;
  },

  async getPatientById(id: string): Promise<Patient> {
    const response = await api.get<Patient>(`/patients/${id}`);
    return response.data;
  },

  // Appointments / Encounters Management
  async getAppointments(params?: {
    status?: string;
    statusCategory?: string;
    doctorId?: string;
    hospitalId?: string;
    patientId?: string;
  }): Promise<Encounter[]> {
    const response = await api.get<Encounter[]>('/encounters', { params });
    return response.data;
  },

  async getAppointmentById(id: string): Promise<Encounter> {
    const response = await api.get<Encounter>(`/encounters/${id}`);
    return response.data;
  },

  async updateAppointment(id: string, data: Partial<Encounter>): Promise<Encounter> {
    const response = await api.put<Encounter>(`/encounters/${id}`, data);
    return response.data;
  },

  // Invoices Management
  async getInvoices(params?: {
    status?: string;
    hospitalId?: string;
    patientId?: string;
    search?: string;
  }): Promise<Invoice[]> {
    const response = await api.get<Invoice[]>('/payments/invoices', { params });
    return response.data;
  },

  async getInvoiceById(id: string): Promise<Invoice> {
    const response = await api.get<Invoice>(`/payments/invoices/${id}`);
    return response.data;
  },

  // Payments Management
  async getPayments(params?: {
    status?: string;
    invoiceId?: string;
    patientId?: string;
    search?: string;
  }): Promise<Payment[]> {
    const response = await api.get<Payment[]>('/payments', { params });
    return response.data;
  },

  async getPaymentById(id: string): Promise<Payment> {
    const response = await api.get<Payment>(`/payments/${id}`);
    return response.data;
  },
};
