import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Filler,
  Title,
} from 'chart.js';
import { Pie, Bar, Line, Doughnut } from 'react-chartjs-2';
import { analyticsAPI } from '../services/api';
import { PageLoader } from '../components/common/LoadingSpinner';
import StatCard from '../components/common/StatCard';
import {
  RiBarChartLine, RiBugLine, RiShieldCheckLine,
  RiCalendarLine, RiRefreshLine,
} from 'react-icons/ri';
import {
  CHART_COLORS, SEVERITY_CHART_COLORS,
  defectLabel, capitalize,
} from '../utils/helpers';

ChartJS.register(
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Filler, Title,
);

// ── Shared chart defaults ─────────────────────────────────────────────────────
const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#94a3b8', font: { size: 12 } } },
    tooltip: {
      backgroundColor: '#1e293b',
      titleColor: '#f1f5f9',
      bodyColor: '#94a3b8',
      borderColor: '#334155',
      borderWidth: 1,
    },
  },
  scales: {
    x: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } },
    y: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } },
  },
};

const PIE_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 12 }, padding: 16 } },
    tooltip: {
      backgroundColor: '#1e293b',
      titleColor: '#f1f5f9',
      bodyColor: '#94a3b8',
      borderColor: '#334155',
      borderWidth: 1,
    },
  },
};

// ── Chart card wrapper ────────────────────────────────────────────────────────
function ChartCard({ title, subtitle, children, height = 280 }) {
  return (
    <div className="card flex flex-col">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div style={{ height }}>{children}</div>
    </div>
  );
}

export default function Analytics() {
  const [loading,      setLoading]      = useState(true);
  const [dashboard,    setDashboard]    = useState(null);
  const [defectTypes,  setDefectTypes]  = useState([]);
  const [severityDist, setSeverityDist] = useState([]);
  const [monthly,      setMonthly]      = useState([]);
  const [frequency,    setFrequency]    = useState([]);
  const [qualityScore, setQualityScore] = useState([]);
  const [monthRange,   setMonthRange]   = useState(12);

  const fetchAll = async (months = monthRange) => {
    setLoading(true);
    try {
      const [dash, dt, sd, mt, freq, qs] = await Promise.all([
        analyticsAPI.dashboard(),
        analyticsAPI.defectTypes(),
        analyticsAPI.severityDistribution(),
        analyticsAPI.monthlyTrends(months),
        analyticsAPI.defectFrequency(30),
        analyticsAPI.qualityScore(months),
      ]);
      setDashboard(dash.data);
      setDefectTypes(dt.data);
      setSeverityDist(sd.data);
      setMonthly(mt.data);
      setFrequency(freq.data);
      setQualityScore(qs.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []); // eslint-disable-line

  if (loading) return <PageLoader />;

  const d = dashboard || {};

  // ── Defect type pie data ───────────────────────────────────────────────────
  const defectPieData = {
    labels: defectTypes.map((r) => defectLabel(r.defect_type)),
    datasets: [{
      data: defectTypes.map((r) => r.count),
      backgroundColor: CHART_COLORS,
      borderColor: '#0f172a',
      borderWidth: 2,
    }],
  };

  // ── Severity doughnut data ────────────────────────────────────────────────
  const severityOrder = ['critical', 'high', 'medium', 'low'];
  const severityOrdered = severityOrder.map((s) => severityDist.find((r) => r.severity === s) || { severity: s, count: 0 });
  const severityDoughnutData = {
    labels: severityOrdered.map((r) => capitalize(r.severity)),
    datasets: [{
      data: severityOrdered.map((r) => r.count),
      backgroundColor: severityOrdered.map((r) => SEVERITY_CHART_COLORS[r.severity]),
      borderColor: '#0f172a',
      borderWidth: 2,
    }],
  };

  // ── Monthly trend bar/line data ───────────────────────────────────────────
  const monthLabels = monthly.map((r) => r.month);
  const monthlyBarData = {
    labels: monthLabels,
    datasets: [
      {
        label: 'Scans',
        data: monthly.map((r) => r.scans),
        backgroundColor: 'rgba(59,130,246,0.7)',
        borderRadius: 4,
      },
      {
        label: 'Defects',
        data: monthly.map((r) => r.defects),
        backgroundColor: 'rgba(239,68,68,0.7)',
        borderRadius: 4,
      },
    ],
  };

  // ── Defect frequency line ─────────────────────────────────────────────────
  const freqLabels = frequency.map((r) => r.date.slice(5)); // MM-DD
  const freqLineData = {
    labels: freqLabels,
    datasets: [{
      label: 'Defects per Day',
      data: frequency.map((r) => r.count),
      borderColor: '#f59e0b',
      backgroundColor: 'rgba(245,158,11,0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 3,
      pointBackgroundColor: '#f59e0b',
    }],
  };

  // ── Quality score line ────────────────────────────────────────────────────
  const qsLineData = {
    labels: qualityScore.map((r) => r.month),
    datasets: [
      {
        label: 'Quality Score',
        data: qualityScore.map((r) => r.quality_score),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34,197,94,0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#22c55e',
        yAxisID: 'y',
      },
      {
        label: 'Defect Rate %',
        data: qualityScore.map((r) => r.defect_rate),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239,68,68,0.05)',
        fill: false,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#ef4444',
        yAxisID: 'y',
      },
    ],
  };

  return (
    <div className="page-container space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="section-title">Analytics</h2>
          <p className="section-subtitle">Defect trends, severity distribution, and quality metrics.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={monthRange}
            onChange={(e) => { setMonthRange(+e.target.value); fetchAll(+e.target.value); }}
            className="input text-sm py-2 px-3 w-36"
          >
            <option value={3}>Last 3 months</option>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
            <option value={24}>Last 24 months</option>
          </select>
          <button onClick={() => fetchAll(monthRange)} className="btn-secondary text-sm py-2">
            <RiRefreshLine />
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Scans"    value={d.total_scans ?? 0}       icon={RiBarChartLine}    color="blue"   />
        <StatCard label="Total Defects"  value={d.total_defects ?? 0}     icon={RiBugLine}         color="red"    />
        <StatCard label="Quality Score"  value={`${d.quality_score ?? 0}`}icon={RiShieldCheckLine} color="green"  />
        <StatCard label="Defect Rate"    value={`${d.defect_rate ?? 0}%`} icon={RiCalendarLine}    color="orange" />
      </div>

      {/* Row 1: Pie + Doughnut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Defect Type Distribution" subtitle="Breakdown by defect category" height={300}>
          {defectTypes.length > 0
            ? <Pie data={defectPieData} options={PIE_DEFAULTS} />
            : <EmptyChart />}
        </ChartCard>
        <ChartCard title="Severity Distribution" subtitle="Low / Medium / High / Critical" height={300}>
          {severityDist.length > 0
            ? <Doughnut data={severityDoughnutData} options={PIE_DEFAULTS} />
            : <EmptyChart />}
        </ChartCard>
      </div>

      {/* Row 2: Monthly bar */}
      <ChartCard
        title="Monthly Detection Trends"
        subtitle={`Scans vs defects over the last ${monthRange} months`}
        height={300}
      >
        {monthly.length > 0
          ? <Bar data={monthlyBarData} options={{ ...CHART_DEFAULTS, plugins: { ...CHART_DEFAULTS.plugins, legend: { labels: { color: '#94a3b8' } } } }} />
          : <EmptyChart />}
      </ChartCard>

      {/* Row 3: Frequency line + Quality score line */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Defect Frequency (Last 30 Days)" subtitle="Daily defect count" height={260}>
          {frequency.length > 0
            ? <Line data={freqLineData} options={CHART_DEFAULTS} />
            : <EmptyChart />}
        </ChartCard>
        <ChartCard title="Quality Score Over Time" subtitle="Quality score vs defect rate %" height={260}>
          {qualityScore.length > 0
            ? <Line data={qsLineData} options={{
                ...CHART_DEFAULTS,
                plugins: { ...CHART_DEFAULTS.plugins, legend: { labels: { color: '#94a3b8' } } },
              }} />
            : <EmptyChart />}
        </ChartCard>
      </div>

      {/* Defect breakdown table */}
      <div className="card">
        <h3 className="text-sm font-semibold text-slate-200 mb-4">Defect Type Summary</h3>
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Defect Type</th>
                <th>Count</th>
                <th>Share</th>
                <th>Bar</th>
              </tr>
            </thead>
            <tbody>
              {defectTypes.length === 0 ? (
                <tr><td colSpan={4} className="text-center text-slate-500 py-8">No defect data available.</td></tr>
              ) : (() => {
                const total = defectTypes.reduce((s, r) => s + r.count, 0);
                return defectTypes
                  .sort((a, b) => b.count - a.count)
                  .map((r, i) => {
                    const pct = total > 0 ? ((r.count / total) * 100).toFixed(1) : 0;
                    return (
                      <tr key={r.defect_type}>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                            {defectLabel(r.defect_type)}
                          </div>
                        </td>
                        <td className="font-semibold text-slate-200">{r.count}</td>
                        <td className="text-slate-400">{pct}%</td>
                        <td className="w-40">
                          <div className="w-full bg-slate-800 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          </div>
                        </td>
                      </tr>
                    );
                  });
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="h-full flex items-center justify-center">
      <p className="text-slate-600 text-sm">No data available yet. Run some inspections first.</p>
    </div>
  );
}
