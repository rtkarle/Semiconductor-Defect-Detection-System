import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  RiMicroscopeLine, RiBugLine, RiCheckboxCircleLine,
  RiAlertLine, RiBarChartLine, RiArrowRightLine, RiShieldCheckLine,
} from 'react-icons/ri';
import { analyticsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/common/StatCard';
import SeverityBadge, { StatusBadge } from '../components/common/SeverityBadge';
import { PageLoader } from '../components/common/LoadingSpinner';
import { formatDateTime, confidencePct, defectLabel } from '../utils/helpers';

export default function Dashboard() {
  const { user } = useAuth();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsAPI.dashboard()
      .then((r) => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  const d = data || {};

  return (
    <div className="page-container space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="section-title">
            Welcome back, <span className="text-brand-400">{user?.full_name?.split(' ')[0]}</span>
          </h2>
          <p className="section-subtitle">Here's your quality inspection overview.</p>
        </div>
        <Link to="/inspect" className="btn-primary self-start sm:self-auto">
          <RiMicroscopeLine /> New Inspection
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Scans"
          value={d.total_scans ?? 0}
          icon={RiMicroscopeLine}
          color="blue"
        />
        <StatCard
          label="Defective Chips"
          value={d.defective_chips ?? 0}
          icon={RiBugLine}
          color="red"
        />
        <StatCard
          label="Healthy Chips"
          value={d.healthy_chips ?? 0}
          icon={RiCheckboxCircleLine}
          color="green"
        />
        <StatCard
          label="Defect Rate"
          value={`${d.defect_rate ?? 0}%`}
          icon={RiBarChartLine}
          color="orange"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Critical Defects"   value={d.critical_defects ?? 0}    icon={RiAlertLine}          color="red"    />
        <StatCard label="High Severity"       value={d.high_defects ?? 0}        icon={RiAlertLine}          color="orange" />
        <StatCard label="Avg Confidence"      value={`${d.avg_confidence_pct ?? 0}%`} icon={RiBarChartLine} color="purple" />
        <StatCard label="Quality Score"       value={`${d.quality_score ?? 0}`}  icon={RiShieldCheckLine}    color="cyan"   />
      </div>

      {/* Quality score bar */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-200">Overall Quality Score</h3>
          <span className={`text-2xl font-black ${
            (d.quality_score ?? 100) >= 80 ? 'text-green-400'
            : (d.quality_score ?? 100) >= 60 ? 'text-yellow-400'
            : 'text-red-400'
          }`}>{d.quality_score ?? 100} / 100</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-700 ${
              (d.quality_score ?? 100) >= 80 ? 'bg-green-500'
              : (d.quality_score ?? 100) >= 60 ? 'bg-yellow-500'
              : 'bg-red-500'
            }`}
            style={{ width: `${d.quality_score ?? 100}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>0 — Critical</span><span>60 — Acceptable</span><span>100 — Perfect</span>
        </div>
      </div>

      {/* Recent scans */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-slate-100">Recent Scan Activity</h3>
          <Link to="/history" className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors">
            View all <RiArrowRightLine />
          </Link>
        </div>

        {(!d.recent_scans || d.recent_scans.length === 0) ? (
          <div className="text-center py-10">
            <RiMicroscopeLine className="text-slate-600 text-4xl mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No scans yet.</p>
            <Link to="/inspect" className="btn-primary mt-4 text-sm inline-flex">Start First Inspection</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Scan Code</th>
                  <th>Image</th>
                  <th>Status</th>
                  <th>Defects</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {d.recent_scans.map((s) => (
                  <tr key={s.scan_code}>
                    <td><span className="font-mono text-xs text-brand-400">{s.scan_code}</span></td>
                    <td><span className="text-xs truncate max-w-[140px] block">{s.image_filename}</span></td>
                    <td><StatusBadge status={s.status} /></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{s.defect_count}</span>
                        {s.has_critical && <SeverityBadge severity="critical" />}
                      </div>
                    </td>
                    <td className="text-xs text-slate-400">{formatDateTime(s.created_at)}</td>
                    <td>
                      <Link to={`/history/${s.scan_code}`} className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { to: '/inspect',   icon: RiMicroscopeLine, label: 'New Inspection',    desc: 'Upload and scan a wafer image',     color: 'text-brand-400',  bg: 'bg-brand-900/30'  },
          { to: '/analytics', icon: RiBarChartLine,   label: 'Analytics',         desc: 'View defect trends and charts',     color: 'text-purple-400', bg: 'bg-purple-900/30' },
          { to: '/reports',   icon: RiShieldCheckLine,label: 'Generate Report',   desc: 'Download PDF inspection reports',   color: 'text-green-400',  bg: 'bg-green-900/30'  },
        ].map((q) => (
          <Link key={q.to} to={q.to} className="card hover:border-slate-700 transition-all duration-200 group flex items-center gap-4">
            <div className={`p-3 rounded-xl ${q.bg} flex-shrink-0`}>
              <q.icon className={`text-xl ${q.color}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">{q.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{q.desc}</p>
            </div>
            <RiArrowRightLine className="ml-auto text-slate-600 group-hover:text-slate-400 transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}
