import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  RiFileList3Line, RiDownloadLine, RiDeleteBinLine,
  RiRefreshLine, RiTimeLine, RiCheckLine,
  RiLoader4Line, RiAlertLine,
} from 'react-icons/ri';
import { reportsAPI, scansAPI } from '../services/api';
import { StatusBadge } from '../components/common/SeverityBadge';
import EmptyState from '../components/common/EmptyState';
import ConfirmModal from '../components/common/ConfirmModal';
import { PageLoader } from '../components/common/LoadingSpinner';
import { formatDateTime, formatFileSize, downloadBlob } from '../utils/helpers';
import clsx from 'clsx';

const STATUS_ICON = {
  ready:      <RiCheckLine     className="text-green-400" />,
  generating: <RiLoader4Line   className="text-brand-400 animate-spin" />,
  failed:     <RiAlertLine     className="text-red-400" />,
};

export default function Reports() {
  const [reports,  setReports]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [page,     setPage]     = useState(1);
  const [hasMore,  setHasMore]  = useState(false);
  const [delTarget,setDelTarget]= useState(null);
  const [deleting, setDeleting] = useState(false);
  const [dlLoading,setDlLoading]= useState(null);
  const PAGE_SIZE = 20;

  const fetchReports = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const res = await reportsAPI.list({ page: p, page_size: PAGE_SIZE });
      const items = res.data || [];
      setReports(p === 1 ? items : (prev) => [...prev, ...items]);
      setHasMore(items.length === PAGE_SIZE);
    } catch { toast.error('Failed to load reports.'); }
    finally { setLoading(false); }
  }, [page]); // eslint-disable-line

  useEffect(() => { fetchReports(1); }, []);

  const handleDownload = async (report) => {
    setDlLoading(report.id);
    try {
      const res = await reportsAPI.download(report.id);
      downloadBlob(res.data, `${report.report_code}.pdf`);
      toast.success('Report downloaded.');
    } catch { toast.error('Download failed. Report may still be generating.'); }
    finally { setDlLoading(null); }
  };

  const handleDelete = async () => {
    if (!delTarget) return;
    setDeleting(true);
    try {
      await reportsAPI.delete(delTarget.id);
      setReports((prev) => prev.filter((r) => r.id !== delTarget.id));
      toast.success('Report deleted.');
      setDelTarget(null);
    } catch { toast.error('Failed to delete.'); }
    finally { setDeleting(false); }
  };

  const pollReport = (reportId) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      if (attempts > 20) { clearInterval(interval); return; }
      try {
        const res = await reportsAPI.get(reportId);
        setReports((prev) => prev.map((r) => r.id === reportId ? res.data : r));
        if (res.data.status === 'ready' || res.data.status === 'failed') {
          clearInterval(interval);
          if (res.data.status === 'ready') toast.success(`Report ${res.data.report_code} is ready.`);
        }
      } catch { clearInterval(interval); }
    }, 2500);
  };

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="section-title">Inspection Reports</h2>
          <p className="section-subtitle">Download PDF reports for completed scans.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => fetchReports(1)} className="btn-secondary text-sm">
            <RiRefreshLine /> Refresh
          </button>
          <Link to="/history" className="btn-primary text-sm">
            <RiFileList3Line /> New from Scan
          </Link>
        </div>
      </div>

      {/* How to generate tip */}
      <div className="p-4 bg-brand-900/20 border border-brand-800/40 rounded-xl text-sm text-brand-200 flex gap-3 items-start">
        <RiFileList3Line className="text-brand-400 text-lg flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">How to generate a report</p>
          <p className="text-xs text-brand-300/70 mt-0.5">
            Go to <Link to="/history" className="underline">Scan History</Link>, open any completed scan, and click
            <strong> "Download Report"</strong>. The PDF will appear here once ready.
          </p>
        </div>
      </div>

      {loading && reports.length === 0 ? (
        <PageLoader />
      ) : reports.length === 0 ? (
        <EmptyState
          title="No reports yet"
          description="Generate a report from any completed scan in the Scan History page."
          action={<Link to="/history" className="btn-primary text-sm">View Scan History</Link>}
        />
      ) : (
        <>
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Report Code</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Size</th>
                    <th>Generated</th>
                    <th>Created</th>
                    <th className="text-right pr-5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <span className="font-mono text-xs text-brand-400">{r.report_code}</span>
                      </td>
                      <td>
                        <span className="text-xs capitalize text-slate-400">{r.report_type}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {STATUS_ICON[r.status] || null}
                          <StatusBadge status={r.status} />
                        </div>
                      </td>
                      <td className="text-xs text-slate-400">{formatFileSize(r.file_size_kb)}</td>
                      <td className="text-xs text-slate-400">{r.generated_at ? formatDateTime(r.generated_at) : '—'}</td>
                      <td className="text-xs text-slate-400">{formatDateTime(r.created_at)}</td>
                      <td>
                        <div className="flex items-center justify-end gap-2 pr-2">
                          <button
                            onClick={() => handleDownload(r)}
                            disabled={r.status !== 'ready' || dlLoading === r.id}
                            className={clsx(
                              'p-1.5 rounded-lg transition-colors',
                              r.status === 'ready'
                                ? 'text-slate-400 hover:text-green-400 hover:bg-green-900/30'
                                : 'text-slate-700 cursor-not-allowed'
                            )}
                            title="Download PDF"
                          >
                            {dlLoading === r.id
                              ? <RiLoader4Line className="animate-spin" />
                              : <RiDownloadLine />}
                          </button>
                          <button
                            onClick={() => setDelTarget(r)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-900/30 transition-colors"
                            title="Delete report"
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

            {hasMore && (
              <div className="px-4 py-3 border-t border-slate-800 text-center">
                <button
                  onClick={() => { const next = page + 1; setPage(next); fetchReports(next); }}
                  className="btn-secondary text-sm"
                  disabled={loading}
                >
                  {loading ? 'Loading…' : 'Load More'}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <ConfirmModal
        open={!!delTarget}
        title="Delete Report"
        message={`Delete report "${delTarget?.report_code}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDelTarget(null)}
        loading={deleting}
        danger
      />
    </div>
  );
}
