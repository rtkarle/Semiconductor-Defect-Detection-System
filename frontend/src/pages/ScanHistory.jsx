import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  RiSearchLine, RiFilterLine, RiDeleteBinLine,
  RiEyeLine, RiRefreshLine, RiArrowUpLine, RiArrowDownLine,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import { scansAPI } from '../services/api';
import SeverityBadge, { StatusBadge } from '../components/common/SeverityBadge';
import EmptyState from '../components/common/EmptyState';
import ConfirmModal from '../components/common/ConfirmModal';
import { PageLoader } from '../components/common/LoadingSpinner';
import { formatDateTime, formatFileSize } from '../utils/helpers';

const STATUS_OPTIONS = ['', 'completed', 'processing', 'pending', 'failed'];

export default function ScanHistory() {
  const [scans,    setScans]    = useState([]);
  const [total,    setTotal]    = useState(0);
  const [pages,    setPages]    = useState(1);
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [status,   setStatus]   = useState('');
  const [sortBy,   setSortBy]   = useState('created_at');
  const [sortDir,  setSortDir]  = useState('desc');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const PAGE_SIZE = 15;

  const fetchScans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await scansAPI.list({
        page, page_size: PAGE_SIZE,
        status: status || undefined,
        search: search || undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
      });
      setScans(res.data.items || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
    } catch {
      toast.error('Failed to load scans.');
    } finally {
      setLoading(false);
    }
  }, [page, status, search, sortBy, sortDir]);

  useEffect(() => { fetchScans(); }, [fetchScans]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, status, sortBy, sortDir]);

  const handleSort = (col) => {
    if (sortBy === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await scansAPI.delete(deleteTarget.id);
      toast.success(`Scan ${deleteTarget.scan_code} deleted.`);
      setDeleteTarget(null);
      fetchScans();
    } catch {
      toast.error('Failed to delete scan.');
    } finally {
      setDeleting(false);
    }
  };

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <span className="text-slate-700 ml-1">↕</span>;
    return sortDir === 'asc' ? <RiArrowUpLine className="inline ml-1 text-brand-400" /> : <RiArrowDownLine className="inline ml-1 text-brand-400" />;
  };

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="section-title">Scan History</h2>
          <p className="section-subtitle">{total} total inspection{total !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={fetchScans} className="btn-secondary self-start sm:self-auto text-sm">
          <RiRefreshLine /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <RiSearchLine className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search scan code or filename…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="relative">
          <RiFilterLine className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="input pl-10 pr-4 min-w-[160px]"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All Status'}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <PageLoader />
      ) : scans.length === 0 ? (
        <EmptyState
          title="No scans found"
          description={search || status ? 'Try adjusting your filters.' : 'Upload your first image to get started.'}
          action={<Link to="/inspect" className="btn-primary text-sm">New Inspection</Link>}
        />
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th className="cursor-pointer select-none" onClick={() => handleSort('scan_code')}>
                    Scan Code <SortIcon col="scan_code" />
                  </th>
                  <th>Image</th>
                  <th className="cursor-pointer select-none" onClick={() => handleSort('status')}>
                    Status <SortIcon col="status" />
                  </th>
                  <th>Defects</th>
                  <th className="cursor-pointer select-none" onClick={() => handleSort('created_at')}>
                    Date <SortIcon col="created_at" />
                  </th>
                  <th className="text-right pr-5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {scans.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <span className="font-mono text-xs text-brand-400">{s.scan_code}</span>
                    </td>
                    <td>
                      <span className="text-xs text-slate-400 truncate max-w-[160px] block">{s.image_filename}</span>
                    </td>
                    <td><StatusBadge status={s.status} /></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold text-sm ${s.defect_count > 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {s.defect_count}
                        </span>
                        {s.has_critical && <SeverityBadge severity="critical" />}
                      </div>
                    </td>
                    <td className="text-xs text-slate-400">{formatDateTime(s.created_at)}</td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2 pr-2">
                        <Link
                          to={`/history/${s.id}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-400 hover:bg-brand-900/30 transition-colors"
                          title="View details"
                        >
                          <RiEyeLine />
                        </Link>
                        <button
                          onClick={() => setDeleteTarget(s)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-900/30 transition-colors"
                          title="Delete scan"
                        >
                          <RiDeleteBinLine />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
              <p className="text-xs text-slate-400">Page {page} of {pages} · {total} scans</p>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">
                  Previous
                </button>
                <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete confirm */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Scan"
        message={`Are you sure you want to delete scan "${deleteTarget?.scan_code}"? This will permanently remove the image and all defect data.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
        danger
      />
    </div>
  );
}
