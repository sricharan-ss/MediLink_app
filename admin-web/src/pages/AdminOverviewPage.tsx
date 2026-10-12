import React, { useEffect, useState } from 'react';
import {
  Users,
  UserCheck,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { adminService } from '../services/adminService';
import { getErrorMessage } from '../services/api';
import type { DashboardData } from '../types';
import { StatCard } from '../components/ui/StatCard';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: '#68B2A0',
  CONFIRMED: '#2C6975',
  IN_PROGRESS: '#3B82F6',
  COMPLETED: '#10B981',
  CANCELLED: '#EF4444',
  NO_SHOW: '#6B7280',
  PAID: '#10B981',
  PENDING: '#F59E0B',
  REFUNDED: '#8B5CF6',
};

export const AdminOverviewPage: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await adminService.getDashboard();
      setData(res);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="py-20">
        <Spinner size="lg" label="Loading live operational metrics..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-red-200 shadow-xs max-w-lg mx-auto my-12">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-[#263238]">
          Unable to Load Dashboard Data
        </h3>
        <p className="text-xs text-[#607D80] mt-1.5 mb-5">{error || 'Server returned empty response.'}</p>
        <Button onClick={fetchDashboard} size="sm">
          Retry Request
        </Button>
      </div>
    );
  }

  const { summary, appointmentDistribution, invoiceDistribution, recentAppointments, recentPayments } = data;

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Core Metrics Grid */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-[#263238] uppercase tracking-wider">
            Platform Overview
          </h2>
          <span className="text-xs text-[#607D80]">Real-time database metrics</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Patients"
            value={summary.totalPatients}
            subtitle="Registered accounts"
            icon={<Users className="h-5 w-5" />}
            accentColor="#2C6975"
          />
          <StatCard
            title="Verified Doctors"
            value={summary.totalDoctors}
            subtitle="Clinical practitioners"
            icon={<UserCheck className="h-5 w-5" />}
            accentColor="#68B2A0"
          />
          <StatCard
            title="Partner Hospitals"
            value={summary.totalHospitals}
            subtitle="Affiliated medical centers"
            icon={<Building2 className="h-5 w-5" />}
            accentColor="#2C6975"
          />
          <StatCard
            title="Total Revenue (Paid)"
            value={formatCurrency(summary.totalRevenue)}
            subtitle={`${summary.paidInvoicesCount} paid invoices`}
            icon={<TrendingUp className="h-5 w-5" />}
            accentColor="#3F8F6B"
          />
        </div>
      </section>

      {/* 2. Operational Appointment & Invoice Status Metrics */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Appointments"
            value={summary.totalAppointments}
            subtitle="All recorded encounters"
            icon={<Calendar className="h-5 w-5" />}
            accentColor="#2C6975"
          />
          <StatCard
            title="Upcoming / In-Progress"
            value={summary.upcomingAppointments}
            subtitle="Scheduled or ongoing visits"
            icon={<Clock className="h-5 w-5" />}
            accentColor="#3B82F6"
          />
          <StatCard
            title="Completed Visits"
            value={summary.completedAppointments}
            subtitle="Consultations finished"
            icon={<CheckCircle2 className="h-5 w-5" />}
            accentColor="#10B981"
          />
          <StatCard
            title="Cancelled / No-Show"
            value={summary.cancelledAppointments}
            subtitle="Patient or doctor cancellations"
            icon={<XCircle className="h-5 w-5" />}
            accentColor="#D9534F"
          />
        </div>
      </section>

      {/* 3. Analytics Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointments by Status */}
        <Card
          title="Appointment Status Distribution"
          description="Distribution of all scheduled encounters across stages"
        >
          {appointmentDistribution.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={appointmentDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis
                    dataKey="status"
                    tick={{ fontSize: 11, fill: '#607D80' }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#607D80' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #E5E7EB',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {appointmentDistribution.map((entry) => (
                      <Cell
                        key={`cell-${entry.status}`}
                        fill={STATUS_COLORS[entry.status] || '#2C6975'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-[#607D80]">
              No appointment records found in database.
            </div>
          )}
        </Card>

        {/* Invoices Breakdown */}
        <Card
          title="Invoices by Status"
          description={`Total billing volume: ${summary.totalInvoices} invoices (Pending: ${formatCurrency(summary.pendingRevenue)})`}
        >
          {invoiceDistribution.length > 0 ? (
            <div className="h-64 w-full flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={invoiceDistribution}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {invoiceDistribution.map((entry) => (
                      <Cell
                        key={`pie-${entry.status}`}
                        fill={STATUS_COLORS[entry.status] || '#68B2A0'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any, item: any) => [
                      `${value} invoices (${formatCurrency(item.payload.amount)})`,
                      name,
                    ]}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #E5E7EB',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-40 pr-4 space-y-2 shrink-0">
                {invoiceDistribution.map((item) => (
                  <div key={item.status} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 truncate">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: STATUS_COLORS[item.status] || '#68B2A0',
                        }}
                      />
                      <span className="text-[#607D80] truncate">{item.status}</span>
                    </div>
                    <span className="font-semibold text-[#263238]">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-[#607D80]">
              No invoice records recorded yet.
            </div>
          )}
        </Card>
      </section>

      {/* 4. Recent Operations Tables */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Appointments */}
        <Card
          title="Recent Appointments"
          description="Latest patient encounters booked in the system"
          action={
            <Link to="/admin/appointments">
              <Button size="sm" variant="ghost">
                View All
              </Button>
            </Link>
          }
        >
          {recentAppointments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-[#607D80] font-semibold">
                    <th className="pb-2.5">Patient</th>
                    <th className="pb-2.5">Doctor & Hospital</th>
                    <th className="pb-2.5">Scheduled</th>
                    <th className="pb-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentAppointments.map((app) => (
                    <tr key={app.encounterId} className="hover:bg-gray-50/50">
                      <td className="py-2.5 font-medium text-[#263238]">{app.patientName}</td>
                      <td className="py-2.5">
                        <p className="text-[#263238] font-medium">{app.doctorName}</p>
                        <p className="text-[11px] text-[#607D80]">{app.hospitalName}</p>
                      </td>
                      <td className="py-2.5 text-[#607D80]">
                        {new Date(app.scheduledTime).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 text-right">
                        <Badge
                          variant={
                            app.status === 'COMPLETED'
                              ? 'success'
                              : app.status === 'CANCELLED'
                              ? 'error'
                              : 'info'
                          }
                        >
                          {app.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-[#607D80] text-center py-6">No recent appointments.</p>
          )}
        </Card>

        {/* Recent Transactions */}
        <Card
          title="Recent Transactions"
          description="Most recent payments processed through MediLink"
          action={
            <Link to="/admin/payments">
              <Button size="sm" variant="ghost">
                View All
              </Button>
            </Link>
          }
        >
          {recentPayments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-[#607D80] font-semibold">
                    <th className="pb-2.5">Patient</th>
                    <th className="pb-2.5">Mode</th>
                    <th className="pb-2.5">Date</th>
                    <th className="pb-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentPayments.map((p) => (
                    <tr key={p.paymentId} className="hover:bg-gray-50/50">
                      <td className="py-2.5 font-medium text-[#263238]">{p.patientName}</td>
                      <td className="py-2.5">
                        <span className="font-mono text-[11px] px-1.5 py-0.5 rounded-sm bg-gray-100 text-gray-700">
                          {p.mode}
                        </span>
                      </td>
                      <td className="py-2.5 text-[#607D80]">
                        {new Date(p.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="py-2.5 text-right font-bold text-[#263238]">
                        {formatCurrency(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-[#607D80] text-center py-6">No payments processed yet.</p>
          )}
        </Card>
      </section>
    </div>
  );
};
