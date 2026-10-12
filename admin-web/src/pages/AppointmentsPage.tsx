import React, { useEffect, useState, useMemo } from 'react';
import {
  CalendarCheck,
  Search,
  Building2,
  Eye,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Video,
  MapPin,
  Tag,
} from 'lucide-react';
import { adminService } from '../services/adminService';
import { getErrorMessage } from '../services/api';
import type { Encounter, AppointmentStatus } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { Badge } from '../components/ui/Badge';

const STATUS_BADGE_VARIANTS: Record<AppointmentStatus, 'teal' | 'success' | 'warning' | 'error' | 'neutral'> = {
  SCHEDULED: 'warning',
  CONFIRMED: 'teal',
  IN_PROGRESS: 'teal',
  COMPLETED: 'success',
  CANCELLED: 'error',
  NO_SHOW: 'neutral',
};

export const AppointmentsPage: React.FC = () => {
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [visitTypeFilter, setVisitTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals
  const [selectedEncounter, setSelectedEncounter] = useState<Encounter | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<AppointmentStatus>('COMPLETED');
  const [statusNote, setStatusNote] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fetchEncounters = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await adminService.getAppointments();
      setEncounters(data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEncounters();
  }, []);

  const filteredEncounters = useMemo(() => {
    return encounters.filter((enc) => {
      const patientName = `${enc.patient?.user?.firstName || ''} ${enc.patient?.user?.lastName || ''}`.toLowerCase();
      const doctorName = `${enc.doctor?.user?.firstName || ''} ${enc.doctor?.user?.lastName || ''}`.toLowerCase();
      const hospitalName = (enc.hospital?.name || '').toLowerCase();
      const q = searchQuery.toLowerCase();

      const matchesSearch =
        patientName.includes(q) ||
        doctorName.includes(q) ||
        hospitalName.includes(q) ||
        enc.encounterId.toLowerCase().includes(q) ||
        (enc.tokenNo && String(enc.tokenNo).includes(q));

      const matchesStatus = statusFilter === 'all' || enc.status === statusFilter;
      const matchesVisitType = visitTypeFilter === 'all' || enc.visitType === visitTypeFilter;

      return matchesSearch && matchesStatus && matchesVisitType;
    });
  }, [encounters, searchQuery, statusFilter, visitTypeFilter]);

  const totalPages = Math.ceil(filteredEncounters.length / itemsPerPage) || 1;
  const paginatedEncounters = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEncounters.slice(start, start + itemsPerPage);
  }, [filteredEncounters, currentPage]);

  const handleOpenDetail = (enc: Encounter) => {
    setSelectedEncounter(enc);
    setIsDetailOpen(true);
  };

  const handleOpenStatusModal = (enc: Encounter) => {
    setSelectedEncounter(enc);
    setNewStatus(enc.status === 'SCHEDULED' || enc.status === 'CONFIRMED' ? 'COMPLETED' : 'CANCELLED');
    setStatusNote('');
    setStatusError(null);
    setIsStatusModalOpen(true);
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEncounter) return;

    try {
      setIsUpdatingStatus(true);
      setStatusError(null);

      const payload: Partial<Encounter> = {
        status: newStatus,
      };
      if (newStatus === 'CANCELLED' && statusNote.trim()) {
        payload.cancellationNote = statusNote.trim();
      }

      await adminService.updateAppointment(selectedEncounter.encounterId, payload);
      setSuccessToast(`Appointment status changed to ${newStatus}.`);
      setTimeout(() => setSuccessToast(null), 4000);
      setIsStatusModalOpen(false);
      fetchEncounters();
    } catch (err) {
      setStatusError(getErrorMessage(err));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#263238] tracking-tight">Appointment Management</h1>
          <p className="text-sm text-[#607D80] mt-1">
            Track patient consultations, clinical schedules, tokens, and visit statuses across facilities.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchEncounters}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Success Toast */}
      {successToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-sm text-emerald-800 animate-fade-in shadow-xs">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Filters & Search */}
      <Card orientation="none" className="p-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#607D80]" />
            <input
              type="text"
              placeholder="Search by patient, physician, token, or ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2C6975]/30 focus:border-[#2C6975]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-[#607D80] shrink-0">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2C6975]/30 focus:border-[#2C6975] text-[#263238]"
              >
                <option value="all">All Statuses</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="NO_SHOW">No Show</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-[#607D80] shrink-0">Type:</label>
              <select
                value={visitTypeFilter}
                onChange={(e) => {
                  setVisitTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2C6975]/30 focus:border-[#2C6975] text-[#263238]"
              >
                <option value="all">All Visit Types</option>
                <option value="IN_PERSON">In Person</option>
                <option value="VIDEO_CALL">Video Consultation</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-sm text-red-800">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          <div className="flex-1">{error}</div>
          <Button size="sm" variant="outline" onClick={fetchEncounters}>
            Retry
          </Button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Spinner size="lg" />
          <p className="text-sm text-[#607D80] mt-3">Loading encounters log...</p>
        </div>
      ) : filteredEncounters.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="No appointments found"
          description={
            searchQuery || statusFilter !== 'all' || visitTypeFilter !== 'all'
              ? 'No appointments matched your query. Try resetting filters.'
              : 'There are currently no encounters registered in the database.'
          }
          actionLabel={
            searchQuery || statusFilter !== 'all' || visitTypeFilter !== 'all'
              ? 'Clear Filters'
              : undefined
          }
          onAction={() => {
            setSearchQuery('');
            setStatusFilter('all');
            setVisitTypeFilter('all');
          }}
        />
      ) : (
        <Card orientation="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-[#607D80] uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Schedule & Token</th>
                  <th className="px-6 py-3.5">Patient</th>
                  <th className="px-6 py-3.5">Doctor & Specialization</th>
                  <th className="px-6 py-3.5">Facility / Hospital</th>
                  <th className="px-6 py-3.5">Type & Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedEncounters.map((enc) => {
                  const patientName = enc.patient?.user
                    ? `${enc.patient.user.firstName} ${enc.patient.user.lastName}`
                    : `Patient (${enc.patientId.slice(0, 8)})`;
                  const doctorName = enc.doctor?.user
                    ? `Dr. ${enc.doctor.user.firstName} ${enc.doctor.user.lastName}`
                    : `Dr. (${enc.doctorId.slice(0, 8)})`;
                  const hospitalName = enc.hospital?.name || 'General Practice';

                  return (
                    <tr key={enc.encounterId} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-9 w-9 rounded-lg bg-[#2C6975]/10 text-[#2C6975] flex items-center justify-center font-bold text-xs shrink-0">
                            #{enc.tokenNo ?? '—'}
                          </div>
                          <div>
                            <div className="font-medium text-[#263238] text-xs">
                              {formatDate(enc.scheduledTime)}
                            </div>
                            <div className="text-[11px] text-[#607D80] font-mono">
                              ID: {enc.encounterId.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-medium text-[#263238]">{patientName}</div>
                        {enc.patient?.user?.phoneNumber && (
                          <div className="text-xs text-[#607D80]">{enc.patient.user.phoneNumber}</div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-medium text-[#263238]">{doctorName}</div>
                        <div className="text-xs text-[#607D80]">{enc.doctor?.specialization || 'Physician'}</div>
                      </td>

                      <td className="px-6 py-4 text-xs text-[#607D80]">
                        <div className="flex items-center gap-1.5 max-w-[180px] truncate" title={hospitalName}>
                          <Building2 className="h-3.5 w-3.5 shrink-0 text-[#68B2A0]" />
                          <span className="truncate">{hospitalName}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <Badge variant={STATUS_BADGE_VARIANTS[enc.status] || 'neutral'}>
                            {enc.status}
                          </Badge>
                          <span className="text-[11px] text-[#607D80] flex items-center gap-1">
                            {enc.visitType === 'VIDEO_CALL' ? (
                              <Video className="h-3 w-3 text-[#2C6975]" />
                            ) : (
                              <MapPin className="h-3 w-3 text-[#68B2A0]" />
                            )}
                            {enc.visitType.replace('_', ' ')}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDetail(enc)}
                            className="p-1.5 text-[#607D80] hover:text-[#2C6975] hover:bg-gray-100 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenStatusModal(enc)}
                            className="p-1.5 text-[#607D80] hover:text-[#2C6975] hover:bg-gray-100 rounded-lg transition-colors"
                            title="Update Status"
                          >
                            <Tag className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredEncounters.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </Card>
      )}

      {/* Encounter Detail Modal */}
      {selectedEncounter && (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title="Appointment Consultation Record"
          size="md"
        >
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div>
                <span className="text-xs text-[#607D80] block">Token / Queue Position</span>
                <span className="text-2xl font-bold text-[#2C6975]">#{selectedEncounter.tokenNo ?? 'N/A'}</span>
              </div>
              <div className="text-right">
                <Badge variant={STATUS_BADGE_VARIANTS[selectedEncounter.status] || 'neutral'}>
                  {selectedEncounter.status}
                </Badge>
                <span className="text-xs text-[#607D80] block mt-1">
                  {selectedEncounter.visitType.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white rounded-lg border border-gray-100">
                <span className="text-[#607D80] block mb-1">Patient</span>
                <span className="font-semibold text-[#263238] text-sm block">
                  {selectedEncounter.patient?.user?.firstName} {selectedEncounter.patient?.user?.lastName}
                </span>
                <span className="text-gray-500">{selectedEncounter.patient?.user?.phoneNumber}</span>
              </div>

              <div className="p-3 bg-white rounded-lg border border-gray-100">
                <span className="text-[#607D80] block mb-1">Attending Physician</span>
                <span className="font-semibold text-[#263238] text-sm block">
                  Dr. {selectedEncounter.doctor?.user?.firstName} {selectedEncounter.doctor?.user?.lastName}
                </span>
                <span className="text-gray-500">{selectedEncounter.doctor?.specialization}</span>
              </div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-gray-100 text-xs">
              <span className="text-[#607D80] block mb-1">Scheduled Date & Facility</span>
              <div className="font-medium text-[#263238]">{formatDate(selectedEncounter.scheduledTime)}</div>
              <div className="text-gray-500 mt-1">
                {selectedEncounter.hospital?.name || 'General Clinical Center'}
              </div>
            </div>

            {selectedEncounter.reason && (
              <div className="p-3 bg-white rounded-lg border border-gray-100 text-xs">
                <span className="text-[#607D80] block mb-1">Stated Reason for Visit</span>
                <p className="text-[#263238]">{selectedEncounter.reason}</p>
              </div>
            )}

            {selectedEncounter.cancellationNote && (
              <div className="p-3 bg-rose-50 rounded-lg border border-rose-100 text-xs">
                <span className="text-rose-800 font-semibold block mb-1">Cancellation Reason</span>
                <p className="text-rose-700">{selectedEncounter.cancellationNote}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setIsDetailOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Update Status Modal */}
      {selectedEncounter && (
        <Modal
          isOpen={isStatusModalOpen}
          onClose={() => !isUpdatingStatus && setIsStatusModalOpen(false)}
          title="Update Appointment Status"
          size="sm"
        >
          <form onSubmit={handleUpdateStatus} className="space-y-4">
            {statusError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{statusError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#263238] mb-1">New Lifecycle Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as AppointmentStatus)}
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2C6975]/30 focus:border-[#2C6975] text-[#263238]"
              >
                <option value="SCHEDULED">SCHEDULED</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
                <option value="NO_SHOW">NO_SHOW</option>
              </select>
            </div>

            {newStatus === 'CANCELLED' && (
              <div>
                <label className="block text-xs font-medium text-[#263238] mb-1">Cancellation Note</label>
                <textarea
                  rows={2}
                  placeholder="Reason for administrative cancellation..."
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2C6975]/30 focus:border-[#2C6975]"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
              <Button
                type="button"
                variant="secondary"
                disabled={isUpdatingStatus}
                onClick={() => setIsStatusModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdatingStatus} className="flex items-center gap-2">
                {isUpdatingStatus ? <Spinner size="sm" className="border-white border-t-transparent" /> : null}
                {isUpdatingStatus ? 'Updating...' : 'Confirm Update'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
export default AppointmentsPage;
