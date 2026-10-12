import React, { useEffect, useState, useMemo } from 'react';
import {
  UserCheck,
  Search,
  Building2,
  Phone,
  Mail,
  Eye,
  Edit2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { adminService } from '../services/adminService';
import { getErrorMessage } from '../services/api';
import type { Doctor } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { Badge } from '../components/ui/Badge';

export const DoctorsPage: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpec, setSelectedSpec] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals state
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    specialization: '',
    experience: 0,
    consultationFee: 0,
    isAvailable: true,
  });

  const fetchDoctors = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await adminService.getDoctors();
      setDoctors(data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  // Distinct specializations
  const specializations = useMemo(() => {
    const specs = doctors.map((d) => d.specialization).filter(Boolean);
    return Array.from(new Set(specs));
  }, [doctors]);

  // Filtered doctors
  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      const fullName = `${doc.user?.firstName || ''} ${doc.user?.lastName || ''}`.toLowerCase();
      const spec = (doc.specialization || '').toLowerCase();
      const matchesSearch =
        fullName.includes(searchQuery.toLowerCase()) ||
        spec.includes(searchQuery.toLowerCase()) ||
        (doc.user?.phoneNumber && doc.user.phoneNumber.includes(searchQuery));

      const matchesSpec = selectedSpec === 'all' || doc.specialization === selectedSpec;

      let matchesAvail = true;
      if (availabilityFilter === 'available') matchesAvail = doc.isAvailable === true;
      if (availabilityFilter === 'unavailable') matchesAvail = doc.isAvailable === false;

      return matchesSearch && matchesSpec && matchesAvail;
    });
  }, [doctors, searchQuery, selectedSpec, availabilityFilter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredDoctors.length / itemsPerPage) || 1;
  const paginatedDoctors = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDoctors.slice(start, start + itemsPerPage);
  }, [filteredDoctors, currentPage]);

  const handleOpenDetail = (doc: Doctor) => {
    setSelectedDoctor(doc);
    setIsDetailOpen(true);
  };

  const handleOpenEdit = (doc: Doctor) => {
    setSelectedDoctor(doc);
    setEditFormData({
      specialization: doc.specialization || '',
      experience: doc.experience ? Number(doc.experience) : 0,
      consultationFee: doc.consultationFee ? Number(doc.consultationFee) : 0,
      isAvailable: doc.isAvailable ?? true,
    });
    setEditFormError(null);
    setIsEditOpen(true);
  };

  const handleSaveDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor) return;

    if (!editFormData.specialization.trim()) {
      setEditFormError('Specialization is required.');
      return;
    }

    try {
      setIsSaving(true);
      setEditFormError(null);
      await adminService.updateDoctor(selectedDoctor.doctorId, {
        specialization: editFormData.specialization.trim(),
        experience: Number(editFormData.experience),
        consultationFee: Number(editFormData.consultationFee),
        isAvailable: editFormData.isAvailable,
      });

      setSuccessToast(`Doctor details updated successfully.`);
      setTimeout(() => setSuccessToast(null), 4000);
      setIsEditOpen(false);
      fetchDoctors();
    } catch (err) {
      setEditFormError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#263238] tracking-tight">Doctor Management</h1>
          <p className="text-sm text-[#607D80] mt-1">
            Directory of licensed physicians, specialties, availability, and clinical affiliations.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDoctors}
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

      {/* Filters and Search Bar */}
      <Card orientation="none" className="p-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#607D80]" />
            <input
              type="text"
              placeholder="Search by physician name, specialty, phone..."
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
              <label className="text-xs font-medium text-[#607D80] shrink-0">Specialty:</label>
              <select
                value={selectedSpec}
                onChange={(e) => {
                  setSelectedSpec(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2C6975]/30 focus:border-[#2C6975] text-[#263238]"
              >
                <option value="all">All Specialties</option>
                {specializations.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-[#607D80] shrink-0">Status:</label>
              <select
                value={availabilityFilter}
                onChange={(e) => {
                  setAvailabilityFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2C6975]/30 focus:border-[#2C6975] text-[#263238]"
              >
                <option value="all">All Statuses</option>
                <option value="available">Available</option>
                <option value="unavailable">Unavailable</option>
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
          <Button size="sm" variant="outline" onClick={fetchDoctors}>
            Retry
          </Button>
        </div>
      )}

      {/* Doctors Data Table */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Spinner size="lg" />
          <p className="text-sm text-[#607D80] mt-3">Loading doctors directory...</p>
        </div>
      ) : filteredDoctors.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title="No doctors found"
          description={
            searchQuery || selectedSpec !== 'all' || availabilityFilter !== 'all'
              ? 'No doctors match your filter criteria. Try adjusting or clearing search terms.'
              : 'There are currently no doctor profiles registered in the database.'
          }
          actionLabel={
            searchQuery || selectedSpec !== 'all' || availabilityFilter !== 'all'
              ? 'Clear Filters'
              : undefined
          }
          onAction={() => {
            setSearchQuery('');
            setSelectedSpec('all');
            setAvailabilityFilter('all');
          }}
        />
      ) : (
        <Card orientation="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-[#607D80] uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Doctor</th>
                  <th className="px-6 py-3.5">Specialization</th>
                  <th className="px-6 py-3.5">Experience</th>
                  <th className="px-6 py-3.5">Fee</th>
                  <th className="px-6 py-3.5">Availability</th>
                  <th className="px-6 py-3.5">Hospital Affiliation</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedDoctors.map((doc) => {
                  const doctorName = doc.user
                    ? `Dr. ${doc.user.firstName} ${doc.user.lastName}`
                    : `Doctor (${doc.doctorId.slice(0, 8)})`;
                  const hospitalName =
                    doc.hospitalName ||
                    (doc.hospitals && doc.hospitals[0]?.hospital?.name) ||
                    'General Practice';

                  return (
                    <tr key={doc.doctorId} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-[#68B2A0]/20 text-[#2C6975] flex items-center justify-center font-bold text-sm shrink-0">
                            {doc.user?.firstName?.charAt(0) || 'D'}
                          </div>
                          <div>
                            <div className="font-medium text-[#263238]">{doctorName}</div>
                            <div className="text-xs text-[#607D80] flex items-center gap-2">
                              {doc.user?.phoneNumber && <span>{doc.user.phoneNumber}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="teal">{doc.specialization}</Badge>
                      </td>
                      <td className="px-6 py-4 text-xs text-[#263238]">
                        {doc.experience ? `${doc.experience} yrs` : '—'}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-[#263238]">
                        {doc.consultationFee ? `₹${doc.consultationFee}` : 'Free'}
                      </td>
                      <td className="px-6 py-4">
                        {doc.isAvailable ? (
                          <Badge variant="success">Available</Badge>
                        ) : (
                          <Badge variant="neutral">Unavailable</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-[#607D80]">
                        <div className="flex items-center gap-1.5 max-w-[200px] truncate" title={hospitalName}>
                          <Building2 className="h-3.5 w-3.5 shrink-0 text-[#68B2A0]" />
                          <span className="truncate">{hospitalName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDetail(doc)}
                            className="p-1.5 text-[#607D80] hover:text-[#2C6975] hover:bg-gray-100 rounded-lg transition-colors"
                            title="View Profile Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(doc)}
                            className="p-1.5 text-[#607D80] hover:text-[#2C6975] hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit Doctor Settings"
                          >
                            <Edit2 className="h-4 w-4" />
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
            totalItems={filteredDoctors.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </Card>
      )}

      {/* Doctor Detail Modal */}
      {selectedDoctor && (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title="Physician Profile Details"
          size="md"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="h-12 w-12 rounded-full bg-[#2C6975] text-white flex items-center justify-center font-bold text-lg">
                {selectedDoctor.user?.firstName?.charAt(0) || 'D'}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-base text-[#263238]">
                  Dr. {selectedDoctor.user?.firstName} {selectedDoctor.user?.lastName}
                </h3>
                <p className="text-xs text-[#607D80] font-mono mt-0.5">ID: {selectedDoctor.doctorId}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="teal">{selectedDoctor.specialization}</Badge>
                  {selectedDoctor.isAvailable ? (
                    <Badge variant="success">Active / Available</Badge>
                  ) : (
                    <Badge variant="neutral">Inactive / Offline</Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white rounded-lg border border-gray-100">
                <span className="text-[#607D80] block mb-1">Clinical Experience</span>
                <span className="font-medium text-[#263238] text-sm">
                  {selectedDoctor.experience ? `${selectedDoctor.experience} Years` : 'Not Specified'}
                </span>
              </div>
              <div className="p-3 bg-white rounded-lg border border-gray-100">
                <span className="text-[#607D80] block mb-1">Consultation Fee</span>
                <span className="font-medium text-[#263238] text-sm">
                  {selectedDoctor.consultationFee ? `₹${selectedDoctor.consultationFee}` : 'Free of Charge'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-gray-100 text-xs space-y-2">
              <span className="text-[#607D80] block font-medium">Contact & Account Information</span>
              <div className="flex items-center gap-2 text-[#263238]">
                <Phone className="h-3.5 w-3.5 text-[#68B2A0]" />
                <span>{selectedDoctor.user?.phoneNumber || 'No phone recorded'}</span>
              </div>
              {selectedDoctor.user?.email && (
                <div className="flex items-center gap-2 text-[#263238]">
                  <Mail className="h-3.5 w-3.5 text-[#68B2A0]" />
                  <span>{selectedDoctor.user.email}</span>
                </div>
              )}
            </div>

            <div className="p-3 bg-white rounded-lg border border-gray-100 text-xs">
              <span className="text-[#607D80] block font-medium mb-1.5">Affiliated Hospital Centers</span>
              {selectedDoctor.hospitals && selectedDoctor.hospitals.length > 0 ? (
                <div className="space-y-1">
                  {selectedDoctor.hospitals.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-[#263238]">
                      <Building2 className="h-3.5 w-3.5 text-[#2C6975]" />
                      <span>{h.hospital?.name || h.hospitalId}</span>
                    </div>
                  ))}
                </div>
              ) : selectedDoctor.hospitalName ? (
                <div className="flex items-center gap-2 text-[#263238]">
                  <Building2 className="h-3.5 w-3.5 text-[#2C6975]" />
                  <span>{selectedDoctor.hospitalName}</span>
                </div>
              ) : (
                <p className="text-gray-400">Independent practitioner / No hospital assigned</p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setIsDetailOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Doctor Modal */}
      {selectedDoctor && (
        <Modal
          isOpen={isEditOpen}
          onClose={() => !isSaving && setIsEditOpen(false)}
          title="Edit Doctor Settings"
          size="md"
        >
          <form onSubmit={handleSaveDoctor} className="space-y-4">
            {editFormError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{editFormError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#263238] mb-1">Specialization *</label>
              <input
                type="text"
                required
                value={editFormData.specialization}
                onChange={(e) => setEditFormData({ ...editFormData, specialization: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2C6975]/30 focus:border-[#2C6975]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#263238] mb-1">Experience (Years)</label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={editFormData.experience}
                  onChange={(e) => setEditFormData({ ...editFormData, experience: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2C6975]/30 focus:border-[#2C6975]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#263238] mb-1">Consultation Fee (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={editFormData.consultationFee}
                  onChange={(e) => setEditFormData({ ...editFormData, consultationFee: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2C6975]/30 focus:border-[#2C6975]"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editFormData.isAvailable}
                  onChange={(e) => setEditFormData({ ...editFormData, isAvailable: e.target.checked })}
                  className="h-4 w-4 rounded text-[#2C6975] focus:ring-[#2C6975] border-gray-300"
                />
                <div>
                  <div className="text-xs font-medium text-[#263238]">Active & Available for Booking</div>
                  <div className="text-[11px] text-[#607D80]">
                    When disabled, patients cannot book new appointment slots with this physician.
                  </div>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
              <Button
                type="button"
                variant="secondary"
                disabled={isSaving}
                onClick={() => setIsEditOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="flex items-center gap-2">
                {isSaving ? <Spinner size="sm" className="border-white border-t-transparent" /> : null}
                {isSaving ? 'Updating...' : 'Save Settings'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
export default DoctorsPage;
