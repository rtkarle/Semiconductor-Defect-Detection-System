import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import {
  RiUploadCloud2Line, RiImageLine, RiCloseLine,
  RiMicroscopeLine, RiCheckLine, RiAlertLine,
  RiTimeLine, RiFileImageLine,
} from 'react-icons/ri';
import { scansAPI } from '../services/api';
import SeverityBadge from '../components/common/SeverityBadge';
import { defectLabel, confidencePct, formatFileSize } from '../utils/helpers';

const ACCEPTED = { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/tiff': ['.tiff', '.tif'], 'image/bmp': ['.bmp'] };
const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

// ── Defect result card ─────────────────────────────────────────────────────
function DefectCard({ defect, index }) {
  const pct = Math.round(parseFloat(defect.confidence) * 100);
  const barColor = { low: 'bg-green-500', medium: 'bg-yellow-500', high: 'bg-orange-500', critical: 'bg-red-500' }[defect.severity] || 'bg-brand-500';

  return (
    <div className="card border-slate-700 animate-fade-in">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-100">#{index + 1} {defectLabel(defect.defect_type)}</span>
            <SeverityBadge severity={defect.severity} />
          </div>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">Defect ID: {defect.id}</p>
        </div>
        <span className="text-2xl font-black text-brand-400 flex-shrink-0">{pct}%</span>
      </div>

      {/* Confidence bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>Confidence</span><span>{confidencePct(defect.confidence)}</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2">
          <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Bounding box */}
      {defect.bbox_x != null && (
        <p className="text-xs text-slate-500 mb-3">
          Bounding box: ({defect.bbox_x}, {defect.bbox_y}) — {defect.bbox_width}×{defect.bbox_height}px
        </p>
      )}

      {/* Recommendation */}
      {defect.recommendation && (
        <div className="p-3 bg-brand-900/20 border border-brand-800/40 rounded-lg">
          <p className="text-xs font-semibold text-brand-300 mb-1">Recommendation</p>
          <p className="text-xs text-slate-400 leading-relaxed">{defect.recommendation}</p>
        </div>
      )}
    </div>
  );
}

export default function UploadInspection() {
  const navigate = useNavigate();
  const [file,     setFile]     = useState(null);
  const [preview,  setPreview]  = useState(null);
  const [notes,    setNotes]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);

  const onDrop = useCallback((accepted, rejected) => {
    if (rejected.length > 0) {
      const err = rejected[0].errors[0];
      toast.error(err.code === 'file-too-large' ? 'File too large (max 20 MB).' : `Invalid file: ${err.message}`);
      return;
    }
    const f = accepted[0];
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxSize: MAX_SIZE,
    multiple: false,
  });

  const clearFile = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null); setPreview(null); setResult(null);
  };

  const runInspection = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (notes.trim()) fd.append('notes', notes.trim());
      const res = await scansAPI.upload(fd);
      setResult(res.data);
      toast.success('Inspection complete!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Inspection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const viewFullDetail = () => result && navigate(`/history/${result.id}`);

  return (
    <div className="page-container space-y-8 max-w-5xl">
      <div>
        <h2 className="section-title">Upload Inspection</h2>
        <p className="section-subtitle">Upload a semiconductor wafer or chip image to run AI defect detection.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: upload + controls */}
        <div className="space-y-5">
          {/* Dropzone */}
          {!file ? (
            <div
              {...getRootProps()}
              className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200
                ${isDragActive ? 'border-brand-500 bg-brand-900/20' : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/30'}`}
            >
              <input {...getInputProps()} />
              <RiUploadCloud2Line className={`text-5xl mx-auto mb-4 ${isDragActive ? 'text-brand-400' : 'text-slate-500'}`} />
              <p className="text-base font-semibold text-slate-300">
                {isDragActive ? 'Drop your image here…' : 'Drag & drop or click to upload'}
              </p>
              <p className="text-xs text-slate-500 mt-2">JPEG · PNG · TIFF · BMP — max 20 MB</p>
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900">
              <img src={preview} alt="Preview" className="w-full object-contain max-h-64" />
              <button
                onClick={clearFile}
                className="absolute top-2 right-2 w-8 h-8 bg-slate-900/80 hover:bg-red-900/80 rounded-full flex items-center justify-center text-slate-300 hover:text-white transition-colors"
                aria-label="Remove image"
              >
                <RiCloseLine />
              </button>
              <div className="p-3 border-t border-slate-800">
                <p className="text-xs font-medium text-slate-200 truncate">{file.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{formatFileSize(file.size / 1024)}</p>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="e.g. Batch #A1-2024, Line 3, Wafer #47"
              className="input resize-none"
            />
          </div>

          {/* Supported formats */}
          <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300 mb-2">Supported image requirements:</p>
            {[
              'Formats: JPEG, PNG, TIFF, BMP',
              'Max size: 20 MB',
              'Recommended resolution: 512×512 to 2048×2048 px',
              'Grayscale or RGB wafer / chip images',
            ].map((t) => (
              <p key={t} className="flex items-center gap-2">
                <RiCheckLine className="text-green-400 flex-shrink-0" />{t}
              </p>
            ))}
          </div>

          {/* Submit */}
          <button
            onClick={runInspection}
            disabled={!file || loading}
            className="btn-primary w-full py-3 text-base"
          >
            {loading ? (
              <span className="flex items-center gap-2 justify-center">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Running AI Inspection…
              </span>
            ) : (
              <><RiMicroscopeLine className="text-lg" /> Run Defect Detection</>
            )}
          </button>
        </div>

        {/* Right: results panel */}
        <div className="space-y-4">
          {/* Processing indicator */}
          {loading && (
            <div className="card border-brand-800/40 bg-brand-900/10 text-center py-10 animate-pulse-slow">
              <div className="w-16 h-16 border-4 border-brand-800 border-t-brand-400 rounded-full animate-spin mx-auto mb-5" />
              <p className="text-brand-300 font-semibold">AI model is analyzing your image…</p>
              <p className="text-xs text-slate-400 mt-2">EfficientNetB3 + YOLOv8 pipeline running</p>
            </div>
          )}

          {/* No result placeholder */}
          {!loading && !result && (
            <div className="card border-dashed border-slate-700 text-center py-16">
              <RiFileImageLine className="text-slate-600 text-5xl mx-auto mb-4" />
              <p className="text-slate-400 text-sm font-medium">Upload an image to see results</p>
              <p className="text-slate-600 text-xs mt-1">AI detection results will appear here</p>
            </div>
          )}

          {/* Results */}
          {result && !loading && (
            <div className="space-y-4 animate-slide-up">
              {/* Summary */}
              <div className={`card ${result.defects?.length > 0 ? 'border-red-800/50 bg-red-900/10' : 'border-green-800/50 bg-green-900/10'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${result.defects?.length > 0 ? 'bg-red-900/40' : 'bg-green-900/40'}`}>
                    {result.defects?.length > 0
                      ? <RiAlertLine className="text-red-400 text-2xl" />
                      : <RiCheckLine className="text-green-400 text-2xl" />
                    }
                  </div>
                  <div>
                    <p className="font-bold text-slate-100 text-base">
                      {result.defects?.length > 0
                        ? `${result.defects.length} defect${result.defects.length > 1 ? 's' : ''} detected`
                        : '✅ No defects detected — PASS'
                      }
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">{result.scan_code}</p>
                  </div>
                  {result.processing_time_ms && (
                    <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-400">
                      <RiTimeLine />{result.processing_time_ms}ms
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800">
                  {[
                    { l: 'Scan Code',    v: result.scan_code, mono: true },
                    { l: 'Image Size',   v: result.image_width ? `${result.image_width}×${result.image_height}px` : '—' },
                    { l: 'Total Defects',v: result.defects?.length ?? 0 },
                  ].map((r) => (
                    <div key={r.l} className="text-center">
                      <p className="text-xs text-slate-500">{r.l}</p>
                      <p className={`text-sm font-semibold text-slate-200 mt-0.5 ${r.mono ? 'font-mono text-xs text-brand-400' : ''}`}>{r.v}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Annotated image */}
              {result.defects?.[0]?.annotated_image_path && (
                <div className="card p-0 overflow-hidden">
                  <p className="text-xs font-semibold text-slate-400 px-4 py-2 border-b border-slate-800">Annotated Detection</p>
                  <img
                    src={`/uploads/${result.defects[0].annotated_image_path.split('/').pop()}`}
                    alt="Annotated"
                    className="w-full object-contain max-h-56"
                  />
                </div>
              )}

              {/* Defect cards */}
              {result.defects?.map((d, i) => <DefectCard key={d.id} defect={d} index={i} />)}

              {/* Actions */}
              <div className="flex gap-3">
                <button onClick={viewFullDetail} className="btn-primary flex-1 text-sm">
                  View Full Details
                </button>
                <button onClick={clearFile} className="btn-secondary flex-1 text-sm">
                  New Inspection
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
