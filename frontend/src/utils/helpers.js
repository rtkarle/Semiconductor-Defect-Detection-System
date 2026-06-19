import { format, formatDistanceToNow } from 'date-fns';

// ── Date formatting ───────────────────────────────────────────────────────────
export const formatDate = (d)    => d ? format(new Date(d), 'MMM dd, yyyy') : '—';
export const formatDateTime = (d) => d ? format(new Date(d), 'MMM dd, yyyy HH:mm') : '—';
export const timeAgo = (d)       => d ? formatDistanceToNow(new Date(d), { addSuffix: true }) : '—';

// ── Defect helpers ────────────────────────────────────────────────────────────
export const DEFECT_TYPES = [
  { value: 'scratch',        label: 'Scratch' },
  { value: 'crack',          label: 'Crack' },
  { value: 'contamination',  label: 'Contamination' },
  { value: 'missing_pattern',label: 'Missing Pattern' },
  { value: 'surface_defect', label: 'Surface Defect' },
  { value: 'other',          label: 'Other' },
];

export const SEVERITY_LEVELS = [
  { value: 'low',      label: 'Low',      color: '#16a34a' },
  { value: 'medium',   label: 'Medium',   color: '#d97706' },
  { value: 'high',     label: 'High',     color: '#ea580c' },
  { value: 'critical', label: 'Critical', color: '#dc2626' },
];

export const defectLabel  = (type) => DEFECT_TYPES.find(d => d.value === type)?.label || type;
export const severityColor = (sev) => ({
  low:      { bg: 'bg-green-900/60',  text: 'text-green-300',  border: 'border-green-700' },
  medium:   { bg: 'bg-yellow-900/60', text: 'text-yellow-300', border: 'border-yellow-700' },
  high:     { bg: 'bg-orange-900/60', text: 'text-orange-300', border: 'border-orange-700' },
  critical: { bg: 'bg-red-900/60',    text: 'text-red-300',    border: 'border-red-700' },
}[sev] || { bg: 'bg-slate-800', text: 'text-slate-400', border: 'border-slate-700' });

export const severityBadgeClass = (sev) => `badge badge-${sev}`;

// ── Confidence formatting ────────────────────────────────────────────────────
export const confidencePct = (val) =>
  val != null ? `${(parseFloat(val) * 100).toFixed(1)}%` : '—';

// ── Status badge class ───────────────────────────────────────────────────────
export const statusBadgeClass = (status) => `badge badge-${status}`;

// ── File helpers ──────────────────────────────────────────────────────────────
export const formatFileSize = (kb) => {
  if (!kb) return '—';
  const n = parseFloat(kb);
  if (n > 1024) return `${(n / 1024).toFixed(1)} MB`;
  return `${n.toFixed(0)} KB`;
};

export const isImageFile = (file) =>
  ['image/jpeg', 'image/png', 'image/tiff', 'image/bmp'].includes(file?.type);

// ── Chart palette ─────────────────────────────────────────────────────────────
export const CHART_COLORS = [
  '#3b82f6', '#06b6d4', '#8b5cf6', '#ec4899',
  '#f59e0b', '#10b981', '#ef4444', '#6366f1',
];

export const SEVERITY_CHART_COLORS = {
  low:      '#16a34a',
  medium:   '#d97706',
  high:     '#ea580c',
  critical: '#dc2626',
};

// ── Misc ─────────────────────────────────────────────────────────────────────
export const truncate = (str, n = 30) =>
  str?.length > n ? `${str.slice(0, n)}…` : (str || '');

export const capitalize = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ') : '';

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href    = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
