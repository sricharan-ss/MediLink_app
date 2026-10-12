import React, { useEffect, useState, useMemo } from 'react';
import {
  Building2,
  Search,
  MapPin,
  Star,
  Edit2,
  Eye,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { adminService } from '../services/adminService';
import { getErrorMessage } from '../services/api';
import { authService } from '../services/authService';
import type { Hospital } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { Badge } from '../components/ui/Badge';

export const HospitalsPage: React.FC = () => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals state
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    rating: 4.5,
    ranking: 1,
  });

  const currentUser = authService.getCurrentUser();
  const isSuperAdmin = currentUser?.roles?.includes('SUPER_ADMIN') || Boolean(currentUser?.superAdmin);
  const hospitalAdminHospitalId = currentUser?.hospitalAdmin?.hospitalId;

  const fetchHospitals = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await adminService.getHospitals();
      setHospitals(data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals();
  }, []);

  // Unique cities for filter dropdown
  const cities = useMemo(() => {
    const list = hospitals.map((h) => h.city).filter(Boolean);
    return Array.from(new Set(list));
  }, [hospitals]);

  // Filtered and searched hospitals
  const filteredHospitals = useMemo(() => {
    return hospitals.filter((h) => {
      const matchesSearch =
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (h.address && h.address.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCity = selectedCity === 'all' || h.city.toLowerCase() === selectedCity.toLowerCase();
      return matchesSearch && matchesCity;
    });
  }, [hospitals, searchQuery, selectedCity]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredHospitals.length / itemsPerPage) || 1;
  const paginatedHospitals = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredHospitals.slice(start, start + itemsPerPage);
  }, [filteredHospitals, currentPage]);

  const handleOpenDetail = (hospital: Hospital) => {
    setSelectedHospital(hospital);
    setIsDetailOpen(true);
  };

  const handleOpenEdit = (hospital: Hospital) => {
    setSelectedHospital(hospital);
    setEditFormData({
      name: hospital.name || '',
      address: hospital.address || '',
      city: hospital.city || '',
      state: hospital.state || '',
      rating: hospital.rating ? Number(hospital.rating) : 4.5,
      ranking: hospital.ranking ? Number(hospital.ranking) : 1,
    });
    setEditFormError(null);
    setIsEditOpen(true);
  };

  const handleSaveHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHospital) return;

    if (!editFormData.name.trim() || !editFormData.city.trim() || !editFormData.address.trim()) {
      setEditFormError('Name, city, and address are required fields.');
      return;
    }

    try {
      setIsSaving(true);
      setEditFormError(null);
      await adminService.updateHospital(selectedHospital.hospitalId, {
        name: editFormData.name.trim(),
        address: editFormData.address.trim(),
        city: editFormData.city.trim(),
        state: editFormData.state.trim() || null,
        rating: Number(editFormData.rating),
        ranking: Number(editFormData.ranking),
      });

      setSuccessToast('Hospital updated successfully.');
      setTimeout(() => setSuccessToast(null), 4000);
      setIsEditOpen(false);
      fetchHospitals();
    } catch (err) {
      setEditFormError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const canEditHospital = (h: Hospital) => {
    if (isSuperAdmin) return true;
    if (hospitalAdminHospitalId && hospitalAdminHospitalId === h.hospitalId) return true;
    return false;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#263238] tracking-tight">Hospital Management</h1>
          <p className="text-sm text-[#607D80] mt-1">
            Monitor, inspect, and update affiliated hospitals and clinical centers.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchHospitals}
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#607D80]" />
            <input
              type="text"
              placeholder="Search by hospital name, city, or address..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2C6975]/30 focus:border-[#2C6975]"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <label className="text-xs font-medium text-[#607D80] shrink-0">City:</label>
            <select
              value={selectedCity}
              onChange={(e) => {
                setSelectedCity(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2C6975]/30 focus:border-[#2C6975] text-[#263238]"
            >
              <option value="all">All Cities</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
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
          <Button size="sm" variant="outline" onClick={fetchHospitals}>
            Retry
          </Button>
        </div>
      )}

      {/* Hospitals Data Table */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Spinner size="lg" />
          <p className="text-sm text-[#607D80] mt-3">Loading hospitals directory...</p>
        </div>
      ) : filteredHospitals.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No hospitals found"
          description={
            searchQuery || selectedCity !== 'all'
              ? 'No hospitals match your search criteria. Try clearing your filters.'
              : 'There are currently no hospitals registered in the database.'
          }
          actionLabel={searchQuery || selectedCity !== 'all' ? 'Clear Filters' : undefined}
          onAction={() => {
            setSearchQuery('');
            setSelectedCity('all');
          }}
        />
      ) : (
        <Card orientation="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-[#607D80] uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Hospital Name</th>
                  <th className="px-6 py-3.5">City & State</th>
                  <th className="px-6 py-3.5">Rating / Ranking</th>
                  <th className="px-6 py-3.5">Address</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedHospitals.map((h) => {
                  const editable = canEditHospital(h);
                  return (
                    <tr key={h.hospitalId} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-[#2C6975]/10 text-[#2C6975] flex items-center justify-center font-bold text-sm shrink-0">
                            {h.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-[#263238]">{h.name}</div>
                            <div className="text-xs text-[#607D80] font-mono">{h.hospitalId.slice(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-[#263238]">
                          <MapPin className="h-3.5 w-3.5 text-[#68B2A0]" />
                          <span>{h.city}</span>
                          {h.state && <span className="text-xs text-[#607D80]">({h.state})</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {h.rating ? (
                            <div className="flex items-center gap-1 text-amber-600 font-medium text-xs bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                              <span>{Number(h.rating).toFixed(1)}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">N/A</span>
                          )}
                          {h.ranking && (
                            <span className="text-xs text-[#607D80]">Rank #{h.ranking}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-[#607D80] max-w-xs truncate">
                        {h.address || '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDetail(h)}
                            className="p-1.5 text-[#607D80] hover:text-[#2C6975] hover:bg-gray-100 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {editable && (
                            <button
                              onClick={() => handleOpenEdit(h)}
                              className="p-1.5 text-[#607D80] hover:text-[#2C6975] hover:bg-gray-100 rounded-lg transition-colors"
                              title="Edit Hospital"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}
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
            totalItems={filteredHospitals.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </Card>
      )}

      {/* Hospital Detail Modal */}
      {selectedHospital && (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title="Hospital Information"
          size="md"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="h-12 w-12 rounded-xl bg-[#2C6975] text-white flex items-center justify-center font-bold text-lg">
                {selectedHospital.name.charAt(0)}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-base text-[#263238]">{selectedHospital.name}</h3>
                <p className="text-xs text-[#607D80] font-mono mt-0.5">ID: {selectedHospital.hospitalId}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="teal">{selectedHospital.city}</Badge>
                  {selectedHospital.state && <Badge variant="neutral">{selectedHospital.state}</Badge>}
                  {selectedHospital.rating && (
                    <Badge variant="warning">★ {Number(selectedHospital.rating).toFixed(1)}</Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white rounded-lg border border-gray-100">
                <span className="text-[#607D80] block mb-1">National / Regional Rank</span>
                <span className="font-medium text-[#263238] text-sm">
                  {selectedHospital.ranking ? `#${selectedHospital.ranking}` : 'Unranked'}
                </span>
              </div>
              <div className="p-3 bg-white rounded-lg border border-gray-100">
                <span className="text-[#607D80] block mb-1">Affiliated Doctors</span>
                <span className="font-medium text-[#263238] text-sm">
                  {selectedHospital.doctors?.length ?? 'Check Doctors Directory'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-gray-100 text-xs">
              <span className="text-[#607D80] block mb-1">Full Physical Address</span>
              <p className="text-[#263238] font-normal leading-relaxed">{selectedHospital.address || 'No address registered'}</p>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setIsDetailOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Hospital Modal */}
      {selectedHospital && (
        <Modal
          isOpen={isEditOpen}
          onClose={() => !isSaving && setIsEditOpen(false)}
          title="Edit Hospital Information"
          size="md"
        >
          <form onSubmit={handleSaveHospital} className="space-y-4">
            {editFormError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{editFormError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#263238] mb-1">Hospital Name *</label>
              <input
                type="text"
                required
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2C6975]/30 focus:border-[#2C6975]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#263238] mb-1">City *</label>
                <input
                  type="text"
                  required
                  value={editFormData.city}
                  onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2C6975]/30 focus:border-[#2C6975]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#263238] mb-1">State / Province</label>
                <input
                  type="text"
                  value={editFormData.state}
                  onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2C6975]/30 focus:border-[#2C6975]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#263238] mb-1">Full Physical Address *</label>
              <textarea
                rows={2}
                required
                value={editFormData.address}
                onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2C6975]/30 focus:border-[#2C6975]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#263238] mb-1">Rating (1.0 - 5.0)</label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="5"
                  value={editFormData.rating}
                  onChange={(e) => setEditFormData({ ...editFormData, rating: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2C6975]/30 focus:border-[#2C6975]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#263238] mb-1">Rank Position</label>
                <input
                  type="number"
                  min="1"
                  value={editFormData.ranking}
                  onChange={(e) => setEditFormData({ ...editFormData, ranking: parseInt(e.target.value, 10) || 1 })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2C6975]/30 focus:border-[#2C6975]"
                />
              </div>
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
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
export default HospitalsPage;
