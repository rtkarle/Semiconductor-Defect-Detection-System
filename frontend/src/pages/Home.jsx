import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  RiCpuLine, RiMicroscopeLine, RiShieldCheckLine, RiBarChartLine,
  RiFileList3Line, RiBellLine, RiArrowRightLine, RiCheckLine,
  RiGithubLine, RiMailLine, RiPhoneLine, RiMapPinLine,
  RiMenu3Line, RiCloseLine,
} from 'react-icons/ri';

// ── Nav ───────────────────────────────────────────────────────────────────────
function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-700 rounded-lg flex items-center justify-center glow-blue">
              <RiCpuLine className="text-white text-lg" />
            </div>
            <span className="text-lg font-bold text-white">SemiAI</span>
          </div>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-6 text-sm text-slate-400">
            {['Features', 'About', 'Contact'].map((s) => (
              <a key={s} href={`#${s.toLowerCase()}`} className="hover:text-white transition-colors">{s}</a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login"    className="btn-secondary text-sm py-2 px-4">Sign In</Link>
            <Link to="/register" className="btn-primary  text-sm py-2 px-4">Get Started</Link>
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setOpen(!open)}>
            {open ? <RiCloseLine size={24} /> : <RiMenu3Line size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden pb-4 space-y-2 border-t border-slate-800 pt-4">
            {['Features', 'About', 'Contact'].map((s) => (
              <a key={s} href={`#${s.toLowerCase()}`} onClick={() => setOpen(false)}
                 className="block py-2 text-sm text-slate-400 hover:text-white">{s}</a>
            ))}
            <div className="flex gap-3 pt-2">
              <Link to="/login"    className="btn-secondary text-sm py-2 px-4 flex-1 text-center">Sign In</Link>
              <Link to="/register" className="btn-primary  text-sm py-2 px-4 flex-1 text-center">Get Started</Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950 pt-16">
      {/* Background gradient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-brand-900/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-cyan-900/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-950/30 rounded-full blur-3xl" />
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-900/40 border border-brand-800/50 rounded-full text-brand-300 text-xs font-medium mb-8 animate-fade-in">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          Powered by EfficientNetB3 + YOLOv8 + TensorFlow
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-tight tracking-tight animate-slide-up">
          <span className="text-white">Semiconductor</span>
          <br />
          <span className="text-gradient">Defect Detection</span>
          <br />
          <span className="text-white">Reimagined</span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed animate-fade-in">
          AI-powered quality inspection for semiconductor wafers and chips.
          Detect scratches, cracks, contamination, and more — in milliseconds.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10 animate-slide-up">
          <Link to="/register" className="btn-primary text-base py-3 px-8 glow-blue">
            Start Inspecting <RiArrowRightLine />
          </Link>
          <a href="#features" className="btn-secondary text-base py-3 px-8">
            Explore Features
          </a>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-20 pt-10 border-t border-slate-800">
          {[
            { value: '6',     label: 'Defect Categories' },
            { value: '4',     label: 'Severity Levels' },
            { value: '99ms',  label: 'Avg Detection Time' },
            { value: '98%+',  label: 'Model Accuracy' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-black text-brand-400">{s.value}</p>
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Features ──────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: RiMicroscopeLine,
    title: 'AI-Powered Inspection',
    desc: 'Upload wafer images and get instant defect detection using EfficientNetB3 classification and YOLOv8 bounding-box localization.',
    color: 'text-brand-400', bg: 'bg-brand-900/30',
  },
  {
    icon: RiShieldCheckLine,
    title: 'Severity Classification',
    desc: 'Automatically classifies defects as Low, Medium, High, or Critical — with tailored maintenance recommendations.',
    color: 'text-green-400', bg: 'bg-green-900/30',
  },
  {
    icon: RiBarChartLine,
    title: 'Analytics Dashboard',
    desc: 'Real-time pie charts, monthly detection trends, defect frequency analysis, and quality score tracking.',
    color: 'text-purple-400', bg: 'bg-purple-900/30',
  },
  {
    icon: RiFileList3Line,
    title: 'PDF Report Generator',
    desc: 'One-click professional inspection reports with annotated images, defect tables, and actionable recommendations.',
    color: 'text-orange-400', bg: 'bg-orange-900/30',
  },
  {
    icon: RiBellLine,
    title: 'Email Notifications',
    desc: 'Instant email alerts for critical defects and completed reports, keeping your team informed automatically.',
    color: 'text-red-400', bg: 'bg-red-900/30',
  },
  {
    icon: RiCpuLine,
    title: 'Complete Scan History',
    desc: 'Searchable, filterable, and sortable scan archive with full defect details and bounding box visualization.',
    color: 'text-cyan-400', bg: 'bg-cyan-900/30',
  },
];

function Features() {
  return (
    <section id="features" className="py-24 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black text-white">Everything You Need</h2>
          <p className="text-slate-400 mt-3 max-w-xl mx-auto">
            A complete quality inspection platform built for semiconductor manufacturing teams.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="card hover:border-slate-700 transition-all duration-300 group">
              <div className={`inline-flex p-3 rounded-xl ${f.bg} mb-4`}>
                <f.icon className={`text-2xl ${f.color}`} />
              </div>
              <h3 className="text-base font-semibold text-slate-100 mb-2">{f.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Defect categories ─────────────────────────────────────────────────────────
const DEFECTS = [
  { name: 'Scratch',         color: 'bg-yellow-500',  desc: 'Physical surface damage from mechanical contact' },
  { name: 'Crack',           color: 'bg-red-500',     desc: 'Structural fracture requiring immediate action' },
  { name: 'Contamination',   color: 'bg-purple-500',  desc: 'Foreign particle or chemical deposit' },
  { name: 'Missing Pattern', color: 'bg-orange-500',  desc: 'Lithography or etching process failure' },
  { name: 'Surface Defect',  color: 'bg-cyan-500',    desc: 'CMP or deposition process irregularity' },
  { name: 'Other Defects',   color: 'bg-slate-500',   desc: 'Unclassified anomalies requiring review' },
];

function DefectCategories() {
  return (
    <section className="py-24 bg-slate-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black text-white">6 Defect Categories</h2>
          <p className="text-slate-400 mt-3 max-w-xl mx-auto">
            The AI model detects and classifies all major wafer defect types found in semiconductor fabrication.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DEFECTS.map((d) => (
            <div key={d.name} className="flex items-start gap-4 p-5 card hover:border-slate-700 transition-colors">
              <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${d.color}`} />
              <div>
                <p className="font-semibold text-slate-100 text-sm">{d.name}</p>
                <p className="text-xs text-slate-400 mt-1">{d.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── About ─────────────────────────────────────────────────────────────────────
function About() {
  const bullets = [
    'EfficientNetB3 + YOLOv8 dual-model architecture',
    'OpenCV preprocessing with CLAHE enhancement',
    'Real-time bounding box visualization',
    'Automated severity classification engine',
    'ReportLab PDF report generation',
    'JWT authentication with refresh tokens',
    'MySQL database with full audit logging',
    'React + Tailwind CSS responsive UI',
  ];

  return (
    <section id="about" className="py-24 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl font-black text-white leading-tight">
              Built for Production-Grade
              <br />
              <span className="text-gradient">Semiconductor QA</span>
            </h2>
            <p className="text-slate-400 mt-5 leading-relaxed">
              SemiAI combines state-of-the-art computer vision with an enterprise-ready web
              platform. Engineers upload wafer images, the AI pipeline runs inference, and
              results are stored, visualized, and reported — all in one seamless workflow.
            </p>
            <ul className="mt-8 space-y-3">
              {bullets.map((b) => (
                <li key={b} className="flex items-center gap-3 text-sm text-slate-300">
                  <div className="w-5 h-5 rounded-full bg-green-900/50 border border-green-700 flex items-center justify-center flex-shrink-0">
                    <RiCheckLine className="text-green-400 text-xs" />
                  </div>
                  {b}
                </li>
              ))}
            </ul>
          </div>

          {/* Visual card */}
          <div className="relative">
            <div className="card border-brand-800/40 glow-blue">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-brand-700 flex items-center justify-center">
                  <RiCpuLine className="text-white text-xl" />
                </div>
                <div>
                  <p className="font-semibold text-slate-100">Live Detection Result</p>
                  <p className="text-xs text-slate-400">SCAN-20240617-A1B2C3</p>
                </div>
                <span className="ml-auto badge badge-critical">Critical</span>
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Defect Type',    value: 'Crack',          color: 'text-red-400' },
                  { label: 'Confidence',     value: '96.7%',          color: 'text-green-400' },
                  { label: 'Severity',       value: 'Critical',       color: 'text-red-400' },
                  { label: 'Processing',     value: '134 ms',         color: 'text-brand-400' },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between items-center py-2 border-b border-slate-800">
                    <span className="text-sm text-slate-400">{row.label}</span>
                    <span className={`text-sm font-semibold ${row.color}`}>{row.value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 p-4 bg-red-900/20 border border-red-800/40 rounded-lg">
                <p className="text-xs font-semibold text-red-300 mb-1">Recommendation</p>
                <p className="text-xs text-slate-400">Remove wafer from production immediately. Schedule full equipment maintenance.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── CTA ───────────────────────────────────────────────────────────────────────
function CTA() {
  return (
    <section className="py-24 bg-gradient-to-r from-brand-900 via-brand-800 to-brand-900 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: 'radial-gradient(circle at 25% 50%, #fff 1px, transparent 1px), radial-gradient(circle at 75% 50%, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      <div className="relative max-w-3xl mx-auto px-4 text-center">
        <h2 className="text-4xl font-black text-white">Ready to Improve Your QA?</h2>
        <p className="text-brand-200 mt-4 text-lg">
          Create your free account and start detecting defects in minutes.
        </p>
        <Link to="/register" className="inline-flex items-center gap-2 mt-8 px-10 py-4 bg-white text-brand-800 font-bold rounded-xl hover:bg-brand-50 transition-colors text-base">
          Create Free Account <RiArrowRightLine />
        </Link>
      </div>
    </section>
  );
}

// ── Contact ───────────────────────────────────────────────────────────────────
function Contact() {
  return (
    <section id="contact" className="py-24 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black text-white">Get in Touch</h2>
          <p className="text-slate-400 mt-3">Have questions? Our team is ready to help.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            { icon: RiMailLine,    label: 'Email',    value: 'support@semiconductor-ai.com' },
            { icon: RiPhoneLine,   label: 'Phone',    value: '+1 (555) 234-5678' },
            { icon: RiMapPinLine,  label: 'Location', value: 'Silicon Valley, CA 94025' },
          ].map((c) => (
            <div key={c.label} className="card text-center hover:border-slate-700 transition-colors">
              <div className="w-12 h-12 bg-brand-900/40 rounded-xl flex items-center justify-center mx-auto mb-4">
                <c.icon className="text-brand-400 text-xl" />
              </div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{c.label}</p>
              <p className="text-sm font-medium text-slate-200">{c.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-brand-700 rounded-lg flex items-center justify-center">
            <RiCpuLine className="text-white text-sm" />
          </div>
          <span className="text-sm font-bold text-slate-300">SemiAI</span>
        </div>
        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} SemiAI — AI Semiconductor Defect Detection. All rights reserved.
        </p>
        <a href="https://github.com" className="text-slate-500 hover:text-slate-300 transition-colors">
          <RiGithubLine size={20} />
        </a>
      </div>
    </footer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <Hero />
      <Features />
      <DefectCategories />
      <About />
      <CTA />
      <Contact />
      <Footer />
    </div>
  );
}
