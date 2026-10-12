import React, { useEffect, useState, useMemo } from 'react';
import {
  CreditCard,
  Receipt,
  Search,
  Clock,
  CheckCircle2,
  Eye,
  RefreshCw,
  AlertCircle,
  Building2,
} from 'lucide-react';
import { adminService } from '../services/adminService';
import { getErrorMessage } from '../services/api';
import type { Invoice, Payment } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { Badge } from '../components/ui/Badge';
import { StatCard } from '../components/ui/StatCard';

export const PaymentsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isInvoiceDetailOpen, setIsInvoiceDetailOpen] = useState(false);
  const [isPaymentDetailOpen, setIsPaymentDetailOpen] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [invData, payData] = await Promise.all([
        adminService.getInvoices(),
        adminService.getPayments(),
      ]);
      setInvoices(invData || []);
      setPayments(payData || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Financial statistics calculated strictly from real data
  const metrics = useMemo(() => {
    const totalInvoiced = invoices.reduce((acc, inv) => acc + (Number(inv.finalAmount) || 0), 0);
    const paidRevenue = invoices
      .filter((inv) => inv.status === 'PAID')
      .reduce((acc, inv) => acc + (Number(inv.finalAmount) || 0), 0);
    const pendingRevenue = invoices
      .filter((inv) => inv.status === 'PENDING')
      .reduce((acc, inv) => acc + (Number(inv.finalAmount) || 0), 0);
    const successfulPaymentsCount = payments.filter((p) => p.status === 'SUCCESS').length;

    return {
      totalInvoiced,
      paidRevenue,
      pendingRevenue,
      successfulPaymentsCount,
    };
  }, [invoices, payments]);

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const patientName = `${inv.patient?.user?.firstName || ''} ${inv.patient?.user?.lastName || ''}`.toLowerCase();
      const hospitalName = (inv.hospital?.name || '').toLowerCase();
      const invNum = (inv.invoiceNumber || '').toLowerCase();
      const q = searchQuery.toLowerCase();

      const matchesSearch =
        patientName.includes(q) ||
        hospitalName.includes(q) ||
        invNum.includes(q) ||
        inv.invoiceId.toLowerCase().includes(q);

      const matchesStatus = invoiceStatusFilter === 'all' || inv.status === invoiceStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, invoiceStatusFilter]);

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return payments.filter((pay) => {
      const patientName = `${pay.invoice?.patient?.user?.firstName || ''} ${pay.invoice?.patient?.user?.lastName || ''}`.toLowerCase();
      const txId = (pay.transactionId || '').toLowerCase();
      const q = searchQuery.toLowerCase();

      const matchesSearch =
        patientName.includes(q) ||
        txId.includes(q) ||
        pay.paymentId.toLowerCase().includes(q) ||
        pay.invoiceId.toLowerCase().includes(q);

      const matchesStatus = paymentStatusFilter === 'all' || pay.status === paymentStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [payments, searchQuery, paymentStatusFilter]);

  // Pagination
  const activeItemsCount = activeTab === 'invoices' ? filteredInvoices.length : filteredPayments.length;
  const totalPages = Math.ceil(activeItemsCount / itemsPerPage) || 1;
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredInvoices.slice(start, start + itemsPerPage);
  }, [filteredInvoices, currentPage]);

  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPayments.slice(start, start + itemsPerPage);
  }, [filteredPayments, currentPage]);

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#263238] tracking-tight">Payments & Invoicing</h1>
          <p className="text-sm text-[#607D80] mt-1">
            Financial reconciliation, hospital billing items, and gateway transaction records.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Financial Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Invoiced"
          value={`₹${metrics.totalInvoiced.toLocaleString()}`}
          icon={Receipt}
          color="teal"
          subtext={`${invoices.length} invoices generated`}
        />
        <StatCard
          title="Paid Revenue"
          value={`₹${metrics.paidRevenue.toLocaleString()}`}
          icon={CheckCircle2}
          color="green"
          subtext="Settled transactions"
        />
        <StatCard
          title="Pending Receivables"
          value={`₹${metrics.pendingRevenue.toLocaleString()}`}
          icon={Clock}
          color="amber"
          subtext="Awaiting patient payment"
        />
        <StatCard
          title="Settled Payments"
          value={metrics.successfulPaymentsCount}
          icon={CreditCard}
          color="teal"
          subtext={`${payments.length} total attempts`}
        />
      </div>

      {/* Tab Switcher & Search Bar */}
      <Card orientation="none" className="p-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl w-full lg:w-auto">
            <button
              onClick={() => {
                setActiveTab('invoices');
                setCurrentPage(1);
              }}
              className={`flex-1 lg:flex-none px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'invoices'
                  ? 'bg-white text-[#2C6975] shadow-xs'
                  : 'text-[#607D80] hover:text-[#263238]'
              }`}
            >
              Invoices Registry ({invoices.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('payments');
                setCurrentPage(1);
              }}
              className={`flex-1 lg:flex-none px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'payments'
                  ? 'bg-white text-[#2C6975] shadow-xs'
                  : 'text-[#607D80] hover:text-[#263238]'
              }`}
            >
              Gateway Transactions ({payments.length})
            </button>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#607D80]" />
              <input
                type="text"
                placeholder={
                  activeTab === 'invoices'
                    ? 'Search invoice #, patient, hospital...'
                    : 'Search transaction ID, patient...'
                }
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2C6975]/30 focus:border-[#2C6975]"
              />
            </div>

            {activeTab === 'invoices' ? (
              <select
                value={invoiceStatusFilter}
                onChange={(e) => {
                  setInvoiceStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2C6975]/30 focus:border-[#2C6975] text-[#263238]"
              >
                <option value="all">All Invoices</option>
                <option value="PAID">PAID</option>
                <option value="PENDING">PENDING</option>
                <option value="CANCELLED">CANCELLED</option>
                <option value="REFUNDED">REFUNDED</option>
              </select>
            ) : (
              <select
                value={paymentStatusFilter}
                onChange={(e) => {
                  setPaymentStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2C6975]/30 focus:border-[#2C6975] text-[#263238]"
              >
                <option value="all">All Payments</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="PENDING">PENDING</option>
                <option value="FAILED">FAILED</option>
                <option value="REFUNDED">REFUNDED</option>
              </select>
            )}
          </div>
        </div>
      </Card>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-sm text-red-800">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          <div className="flex-1">{error}</div>
          <Button size="sm" variant="outline" onClick={fetchData}>
            Retry
          </Button>
        </div>
      )}

      {/* Content Tables */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Spinner size="lg" />
          <p className="text-sm text-[#607D80] mt-3">Loading financial records...</p>
        </div>
      ) : activeTab === 'invoices' ? (
        /* Invoices Table */
        filteredInvoices.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No invoices found"
            description="No invoice records matched the filters or search term."
            actionLabel="Reset Filters"
            onAction={() => {
              setSearchQuery('');
              setInvoiceStatusFilter('all');
            }}
          />
        ) : (
          <Card orientation="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-[#607D80] uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Invoice #</th>
                    <th className="px-6 py-3.5">Patient</th>
                    <th className="px-6 py-3.5">Hospital</th>
                    <th className="px-6 py-3.5">Total & Final</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedInvoices.map((inv) => {
                    const patientName = inv.patient?.user
                      ? `${inv.patient.user.firstName} ${inv.patient.user.lastName}`
                      : `Patient (${inv.patientId.slice(0, 8)})`;

                    return (
                      <tr key={inv.invoiceId} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-[#2C6975]">
                            {inv.invoiceNumber || `INV-${inv.invoiceId.slice(0, 6)}`}
                          </div>
                          <div className="text-[11px] text-[#607D80] font-mono">{inv.invoiceId.slice(0, 8)}...</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-[#263238]">{patientName}</div>
                          {inv.patient?.user?.phoneNumber && (
                            <div className="text-xs text-[#607D80]">{inv.patient.user.phoneNumber}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-[#607D80]">
                          <div className="flex items-center gap-1.5 max-w-[180px] truncate">
                            <Building2 className="h-3.5 w-3.5 shrink-0 text-[#68B2A0]" />
                            <span className="truncate">{inv.hospital?.name || 'General'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-[#263238]">₹{Number(inv.finalAmount).toLocaleString()}</div>
                          {Number(inv.discountAmount) > 0 && (
                            <div className="text-[11px] text-emerald-600">-₹{inv.discountAmount} discount</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant={
                              inv.status === 'PAID'
                                ? 'success'
                                : inv.status === 'PENDING'
                                ? 'warning'
                                : inv.status === 'CANCELLED'
                                ? 'error'
                                : 'neutral'
                            }
                          >
                            {inv.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-xs text-[#607D80]">
                          {formatDate(inv.generatedAt)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setIsInvoiceDetailOpen(true);
                            }}
                            className="p-1.5 text-[#607D80] hover:text-[#2C6975] hover:bg-gray-100 rounded-lg transition-colors"
                            title="View Invoice Breakdown"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredInvoices.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </Card>
        )
      ) : (
        /* Payments Table */
        filteredPayments.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No transactions found"
            description="No gateway payment records matched the filters or search term."
            actionLabel="Reset Filters"
            onAction={() => {
              setSearchQuery('');
              setPaymentStatusFilter('all');
            }}
          />
        ) : (
          <Card orientation="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-[#607D80] uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Transaction ID</th>
                    <th className="px-6 py-3.5">Patient</th>
                    <th className="px-6 py-3.5">Payment Mode</th>
                    <th className="px-6 py-3.5">Amount</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedPayments.map((pay) => {
                    const patientName = pay.invoice?.patient?.user
                      ? `${pay.invoice.patient.user.firstName} ${pay.invoice.patient.user.lastName}`
                      : 'MediLink Patient';

                    return (
                      <tr key={pay.paymentId} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-mono text-xs font-semibold text-[#263238]">
                            {pay.transactionId || pay.paymentId.slice(0, 12)}
                          </div>
                          <div className="text-[11px] text-[#607D80] font-mono">Invoice: {pay.invoiceId.slice(0, 8)}...</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-[#263238]">{patientName}</div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="teal">{pay.mode}</Badge>
                        </td>
                        <td className="px-6 py-4 font-semibold text-[#263238]">
                          ₹{Number(pay.amount).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant={
                              pay.status === 'SUCCESS'
                                ? 'success'
                                : pay.status === 'PENDING'
                                ? 'warning'
                                : pay.status === 'FAILED'
                                ? 'error'
                                : 'neutral'
                            }
                          >
                            {pay.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-xs text-[#607D80]">
                          {formatDate(pay.paidAt || pay.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedPayment(pay);
                              setIsPaymentDetailOpen(true);
                            }}
                            className="p-1.5 text-[#607D80] hover:text-[#2C6975] hover:bg-gray-100 rounded-lg transition-colors"
                            title="View Transaction Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredPayments.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </Card>
        )
      )}

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <Modal
          isOpen={isInvoiceDetailOpen}
          onClose={() => setIsInvoiceDetailOpen(false)}
          title="Invoice Financial Breakdown"
          size="md"
        >
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div>
                <span className="text-xs text-[#607D80] block">Invoice Reference</span>
                <span className="font-bold text-[#2C6975] text-base">
                  {selectedInvoice.invoiceNumber || selectedInvoice.invoiceId}
                </span>
              </div>
              <Badge
                variant={
                  selectedInvoice.status === 'PAID'
                    ? 'success'
                    : selectedInvoice.status === 'PENDING'
                    ? 'warning'
                    : 'error'
                }
              >
                {selectedInvoice.status}
              </Badge>
            </div>

            {/* Line items if available */}
            {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-[#607D80]">
                    <tr>
                      <th className="px-4 py-2 text-left">Description</th>
                      <th className="px-4 py-2 text-center">Qty</th>
                      <th className="px-4 py-2 text-right">Unit Price</th>
                      <th className="px-4 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedInvoice.items.map((item) => (
                      <tr key={item.invoiceItemId}>
                        <td className="px-4 py-2.5 font-medium text-[#263238]">{item.description || item.itemType}</td>
                        <td className="px-4 py-2.5 text-center text-[#607D80]">{item.quantity}</td>
                        <td className="px-4 py-2.5 text-right text-[#607D80]">₹{item.unitPrice}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-[#263238]">₹{item.totalPrice}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {/* Totals */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2 text-xs">
              <div className="flex justify-between text-[#607D80]">
                <span>Gross Subtotal</span>
                <span>₹{Number(selectedInvoice.totalAmount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-emerald-600">
                <span>Promotional / System Discount</span>
                <span>-₹{Number(selectedInvoice.discountAmount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[#607D80]">
                <span>Tax / Service Fee</span>
                <span>₹{Number(selectedInvoice.taxAmount).toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-sm text-[#263238]">
                <span>Final Payable Amount</span>
                <span className="text-[#2C6975]">₹{Number(selectedInvoice.finalAmount).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setIsInvoiceDetailOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Payment Detail Modal */}
      {selectedPayment && (
        <Modal
          isOpen={isPaymentDetailOpen}
          onClose={() => setIsPaymentDetailOpen(false)}
          title="Payment Gateway Transaction"
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div>
                <span className="text-[#607D80] block mb-1">Transaction ID</span>
                <span className="font-mono font-semibold text-[#263238] text-sm">
                  {selectedPayment.transactionId || 'Awaiting Gateway Confirmation'}
                </span>
              </div>
              <Badge
                variant={
                  selectedPayment.status === 'SUCCESS'
                    ? 'success'
                    : selectedPayment.status === 'PENDING'
                    ? 'warning'
                    : 'error'
                }
              >
                {selectedPayment.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white rounded-lg border border-gray-100">
                <span className="text-[#607D80] block mb-1">Settled Amount</span>
                <span className="font-bold text-base text-[#2C6975]">₹{Number(selectedPayment.amount).toLocaleString()}</span>
              </div>
              <div className="p-3 bg-white rounded-lg border border-gray-100">
                <span className="text-[#607D80] block mb-1">Payment Mode</span>
                <span className="font-semibold text-sm text-[#263238]">{selectedPayment.mode}</span>
              </div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-gray-100">
              <span className="text-[#607D80] block mb-1">Associated Invoice Reference</span>
              <span className="font-mono text-[#263238]">{selectedPayment.invoiceId}</span>
            </div>

            <div className="p-3 bg-white rounded-lg border border-gray-100">
              <span className="text-[#607D80] block mb-1">Timestamp</span>
              <span className="text-[#263238]">
                {formatDate(selectedPayment.paidAt || selectedPayment.createdAt)}
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setIsPaymentDetailOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
export default PaymentsPage;
