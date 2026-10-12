import React, { useEffect, useState, useMemo } from 'react';
import {
  Users,
  Search,
  Phone,
  Mail,
  Droplet,
  Eye,
  RefreshCw,
  AlertCircle,
  Shield,
} from 'lucide-react';
import { adminService } from '../services/adminService';
import { getErrorMessage } from '../services/api';
import type { Patient } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { Badge } from '../components/ui/Badge';

export const PatientsPage: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [bloodGroupFilter, setBloodGroupFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Detail Modal
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const fetchPatients = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await adminService.getPatients();
      setPatients(data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const bloodGroups = useMemo(() => {
    const list = patients.map((p) => p.bloodGroup).filter(Boolean) as string[];
    return Array.from(new Set(list));
  }, [patients]);

  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      const fullName = `${p.user?.firstName || ''} ${p.user?.lastName || ''}`.toLowerCase();
      const phone = p.user?.phoneNumber || '';
      const email = (p.user?.email || '').toLowerCase();
      const q = searchQuery.toLowerCase();

      const matchesSearch =
        fullName.includes(q) ||
        phone.includes(q) ||
        email.includes(q) ||
        p.patientId.toLowerCase().includes(q);

      const matchesBlood =
        bloodGroupFilter === 'all' || p.bloodGroup?.toUpperCase() === bloodGroupFilter.toUpperCase();

      return matchesSearch && matchesBlood;
    });
  }, [patients, searchQuery, bloodGroupFilter]);

  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage) || 1;
  const paginatedPatients = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPatients.slice(start, start + itemsPerPage);
  }, [filteredPatients, currentPage]);

  const handleOpenDetail = (p: Patient) => {
    setSelectedPatient(p);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#263238] tracking-tight">Patient Directory</h1>
          <p className="text-sm text-[#607D80] mt-1">
            Privacy-governed registry of registered MediLink patients and demographic profiles.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPatients}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Privacy Notice Banner */}
      <div className="p-3.5 bg-[#E0ECDE]/50 border border-[#CDE0C9] rounded-xl flex items-center gap-3 text-xs text-[#2C6975]">
        <Shield className="h-4 w-4 shrink-0 text-[#2C6975]" />
        <span>
          <strong>Data Privacy Notice:</strong> Administrator views apply least-privilege principles. Sensitive clinical
          records, prescription files, and secure vault storage remain strictly restricted to treating medical providers.
        </span>
      </div>

      {/* Filters and Search Bar */}
      <Card orientation="none" className="p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#607D80]" />
            <input
              type="text"
              placeholder="Search by patient name, phone, or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2C6975]/30 focus:border-[#2C6975]"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <label className="text-xs font-medium text-[#607D80] shrink-0">Blood Group:</label>
            <select
              value={bloodGroupFilter}
              onChange={(e) => {
                setBloodGroupFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2C6975]/30 focus:border-[#2C6975] text-[#263238]"
            >
              <option value="all">All Blood Groups</option>
              {bloodGroups.map((bg) => (
                <option key={bg} value={bg}>
                  {bg}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-sm text-red-800">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          <div className="flex-1">{error}</div>
          <Button size="sm" variant="outline" onClick={fetchPatients}>
            Retry
          </Button>
        </div>
      )}

      {/* Patients Data Table */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Spinner size="lg" />
          <p className="text-sm text-[#607D80] mt-3">Loading patients registry...</p>
        </div>
      ) : filteredPatients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No patients found"
          description={
            searchQuery || bloodGroupFilter !== 'all'
              ? 'No patients match the search or filter criteria.'
              : 'There are currently no patients registered on the platform.'
          }
          actionLabel={searchQuery || bloodGroupFilter !== 'all' ? 'Clear Filters' : undefined}
          onAction={() => {
            setSearchQuery('');
            setBloodGroupFilter('all');
          }}
        />
      ) : (
        <Card orientation="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-[#607D80] uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Patient Name</th>
                  <th className="px-6 py-3.5">Contact Details</th>
                  <th className="px-6 py-3.5">Demographics</th>
                  <th className="px-6 py-3.5">Blood Group</th>
                  <th className="px-6 py-3.5">Activity</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedPatients.map((p) => {
                  const patientName = p.user
                    ? `${p.user.firstName} ${p.user.lastName}`
                    : `Patient (${p.patientId.slice(0, 8)})`;
                  const ageDisplay = p.age ? `${p.age} yrs` : p.gender || '—';

                  return (
                    <tr key={p.patientId} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-[#2C6975]/10 text-[#2C6975] flex items-center justify-center font-bold text-sm shrink-0">
                            {p.user?.firstName?.charAt(0) || 'P'}
                          </div>
                          <div>
                            <div className="font-medium text-[#263238]">{patientName}</div>
                            <div className="text-xs text-[#607D80] font-mono">{p.patientId.slice(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-[#263238] flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3 text-[#68B2A0]" />
                            <span>{p.user?.phoneNumber || 'No phone'}</span>
                          </div>
                          {p.user?.email && (
                            <div className="flex items-center gap-1.5 text-[#607D80]">
                              <Mail className="h-3 w-3 text-[#68B2A0]" />
                              <span className="truncate max-w-[180px]">{p.user.email}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-[#263238]">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{ageDisplay}</span>
                          {p.gender && <Badge variant="neutral">{p.gender}</Badge>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {p.bloodGroup ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                            <Droplet className="h-3 w-3 fill-rose-500 text-rose-500" />
                            {p.bloodGroup}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Not recorded</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-[#607D80]">
                        <div className="flex items-center gap-3">
                          <span>{p._count?.encounters ?? 0} Visits</span>
                          <span>•</span>
                          <span>{p._count?.invoices ?? 0} Invoices</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenDetail(p)}
                          className="p-1.5 text-[#607D80] hover:text-[#2C6975] hover:bg-gray-100 rounded-lg transition-colors"
                          title="View Patient Profile"
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

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredPatients.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </Card>
      )}

      {/* Patient Detail Modal */}
      {selectedPatient && (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title="Patient Demographic Summary"
          size="md"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="h-12 w-12 rounded-full bg-[#2C6975] text-white flex items-center justify-center font-bold text-lg">
                {selectedPatient.user?.firstName?.charAt(0) || 'P'}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-base text-[#263238]">
                  {selectedPatient.user?.firstName} {selectedPatient.user?.lastName}
                </h3>
                <p className="text-xs text-[#607D80] font-mono mt-0.5">Patient ID: {selectedPatient.patientId}</p>
                <div className="flex items-center gap-2 mt-2">
                  {selectedPatient.bloodGroup && (
                    <Badge variant="error">Blood Group {selectedPatient.bloodGroup}</Badge>
                  )}
                  {selectedPatient.gender && <Badge variant="neutral">{selectedPatient.gender}</Badge>}
                  {selectedPatient.age && <Badge variant="teal">{selectedPatient.age} Years</Badge>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white rounded-lg border border-gray-100">
                <span className="text-[#607D80] block mb-1">Contact Phone</span>
                <span className="font-medium text-[#263238] text-sm">
                  {selectedPatient.user?.phoneNumber || 'None'}
                </span>
              </div>
              <div className="p-3 bg-white rounded-lg border border-gray-100">
                <span className="text-[#607D80] block mb-1">Email Address</span>
                <span className="font-medium text-[#263238] text-sm truncate block">
                  {selectedPatient.user?.email || 'None registered'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-gray-100 text-xs">
              <span className="text-[#607D80] block mb-1">Residential Address</span>
              <p className="text-[#263238] font-normal leading-relaxed">
                {selectedPatient.address || 'No residential address on file'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white rounded-lg border border-gray-100">
                <span className="text-[#607D80] block mb-1">Total Appointments</span>
                <span className="font-semibold text-[#2C6975] text-sm">
                  {selectedPatient._count?.encounters ?? 0} Encounters
                </span>
              </div>
              <div className="p-3 bg-white rounded-lg border border-gray-100">
                <span className="text-[#607D80] block mb-1">Total Invoices</span>
                <span className="font-semibold text-[#2C6975] text-sm">
                  {selectedPatient._count?.invoices ?? 0} Invoices
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setIsDetailOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
export default PatientsPage;
