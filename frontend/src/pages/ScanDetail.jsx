import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  RiArrowLeftLine, RiDownloadLine, RiTimeLine,
  RiImageLine, RiAlertLine, RiCheckLine, RiFileList3Line,
} from 'react-icons/ri';
import { scansAPI, reportsAPI } from '../services/api';
import SeverityBadge, { StatusBadge } from '../components/common/SeverityBadge';
import { PageLoader } from '../components/common/LoadingSpinner';
import { formatDateTime, confidencePct, defectLabel, formatFileSize, downloadBlob } from '../utils/helpers';

function DefectRow({ defect, index }) {
  const pct = Math.round(parseFloat(defect.confidence) * 100);
  return (
    <tr>
      <td className="font-mono text-xs text-slate-400">#{index + 1}</td>
      <td className="font-semibold text-sm">{defectLabel(defect.defect_type)}</td>
      <td>
        <div className="flex items-center gap-2">
          <div className="w-24 bg-slate-800 rounded-full h-1.5">
            <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-slate-300">{pct}%</span>
        </div>
      </td>
      <td><SeverityBadge severity={defect.severity} /></td>
      <td className="text-xs text-slate-400">
        {defect.bbox_x != null ? `(${defect.bbox_x},${defect.bbox_y}) ${defect.bbox_width}×${defect.bbox_height}` : '—'}
      </td>
      <td className="text-xs text-slate-400 max-w-[200px]">
        <p className="truncate" title={defect.recommendation}>{defect.recommendation || '—'}</p>
      </td>
    </tr>
  );
}

export default function ScanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [scan,     setScan]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [genPDF,   setGenPDF]   = useState(false);

  useEffect(() => {
    scansAPI.get(id)
      .then((r) => setScan(r.data))
      .catch(() => { toast.error('Scan not found.'); navigate('/history'); })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const generateReport = async () => {
    setGenPDF(true);
    try {
      const res = await reportsAPI.generate(scan.id);
      const reportId = res.data.id;
      toast.success('Report is being generated. Check the Reports page.');
      // Poll for ready
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        if (attempts > 15) { clearInterval(poll); return; }
        try {
          const r = await reportsAPI.get(reportId);
          if (r.data.status === 'ready') {
            clearInterval(poll);
            toast.success('Report ready — downloading…');
            const dlRes = await reportsAPI.download(reportId);
            downloadBlob(dlRes.data, `${r.data.report_code}.pdf`);
          }
        } catch { clearInterval(poll); }
      }, 2000);
    } catch {
      toast.error('Failed to generate report.');
    } finally {
      setGenPDF(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!scan) return null;

  const hasCritical = scan.defects?.some((d) => d.severity === 'critical');
  const annotatedImg = scan.defects?.find((d) => d.annotated_image_path)?.annotated_image_path;

  return (
    <div className="page-container space-y-6 max-w-5xl">
      {/* Back + header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button onClick={() => navigate('/history')} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 mb-3 transition-colors">
            <RiArrowLeftLine /> Back to History
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="section-title font-mono">{scan.scan_code}</h2>
            <StatusBadge status={scan.status} />
            {hasCritical && <SeverityBadge severity="critical" />}
          </div>
          <p className="section-subtitle">{formatDateTime(scan.created_at)}</p>
        </div>
        <button
          onClick={generateReport}
          disabled={genPDF || scan.status !== 'completed'}
          className="btn-primary text-sm self-start"
        >
          {genPDF ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating…
            </span>
          ) : (
            <><RiDownloadLine /> Download Report</>
          )}
        </button>
      </div>

      {/* Scan metadata */}
      <div className="card">
        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <RiImageLine className="text-brand-400" /> Scan Details
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          {[
            { l: 'Image File',     v: scan.image_filename },
            { l: 'Dimensions',     v: scan.image_width ? `${scan.image_width}×${scan.image_height}px` : '—' },
            { l: 'File Size',      v: formatFileSize(scan.image_size_kb) },
            { l: 'Processing',     v: scan.processing_time_ms ? `${scan.processing_time_ms}ms` : '—' },
            { l: 'Status',         v: <StatusBadge status={scan.status} /> },
            { l: 'Total Defects',  v: scan.defects?.length ?? 0 },
            { l: 'Created',        v: formatDateTime(scan.created_at) },
            { l: 'Notes',          v: scan.notes || '—' },
          ].map((r) => (
            <div key={r.l}>
              <p className="text-xs text-slate-500 uppercase tracking-wider">{r.l}</p>
              <div className="text-sm font-medium text-slate-200 mt-0.5">{r.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Images side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="card p-0 overflow-hidden">
          <p className="text-xs font-semibold text-slate-400 px-4 py-2.5 border-b border-slate-800">Original Image</p>
          <img
            src={`/uploads/${scan.image_path.split(/[\\/]/).pop()}`}
            alt="Original"
            className="w-full object-contain max-h-64 bg-slate-950"
            onError={(e) => { e.target.src = ''; e.target.alt = 'Image not available'; }}
          />
        </div>
        {annotatedImg ? (
          <div className="card p-0 overflow-hidden">
            <p className="text-xs font-semibold text-slate-400 px-4 py-2.5 border-b border-slate-800">Annotated Detection</p>
            <img
              src={`/uploads/${annotatedImg.split(/[\\/]/).pop()}`}
              alt="Annotated"
              className="w-full object-contain max-h-64 bg-slate-950"
            />
          </div>
        ) : (
          <div className="card flex items-center justify-center text-center min-h-[200px]">
            <div>
              <RiCheckLine className="text-green-400 text-4xl mx-auto mb-2" />
              <p className="text-sm text-slate-400">No defects annotated</p>
            </div>
          </div>
        )}
      </div>

      {/* Defect table */}
      <div className="card">
        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <RiAlertLine className="text-red-400" />
          Detected Defects ({scan.defects?.length ?? 0})
        </h3>

        {!scan.defects?.length ? (
          <div className="text-center py-10">
            <RiCheckLine className="text-green-400 text-4xl mx-auto mb-3" />
            <p className="text-green-400 font-semibold">No defects detected — Wafer PASSED</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>#</th><th>Type</th><th>Confidence</th><th>Severity</th><th>Bounding Box</th><th>Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {scan.defects.map((d, i) => <DefectRow key={d.id} defect={d} index={i} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recommendations summary */}
      {scan.defects?.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <RiFileList3Line className="text-brand-400" /> Maintenance Recommendations
          </h3>
          <div className="space-y-3">
            {scan.defects.filter((d) => d.recommendation).map((d, i) => (
              <div key={d.id} className="flex gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="flex-shrink-0">
                  <SeverityBadge severity={d.severity} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">{defectLabel(d.defect_type)}</p>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{d.recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
