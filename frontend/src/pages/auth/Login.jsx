import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import { RiCpuLine, RiEyeLine, RiEyeOffLine, RiLockLine, RiMailLine } from 'react-icons/ri';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../hooks/useApi';

const schema = yup.object({
  email:    yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().min(1, 'Password is required').required(),
});

export default function Login() {
  const { login }       = useAuth();
  const navigate        = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-brand-900 via-slate-900 to-slate-950 flex-col justify-between p-12">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'linear-gradient(#3b82f6 1px,transparent 1px),linear-gradient(90deg,#3b82f6 1px,transparent 1px)', backgroundSize: '48px 48px' }} />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-brand-700/20 rounded-full blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-700 rounded-xl flex items-center justify-center glow-blue">
            <RiCpuLine className="text-white text-xl" />
          </div>
          <span className="text-xl font-bold text-white">SemiAI</span>
        </div>

        <div className="relative">
          <h2 className="text-4xl font-black text-white leading-tight">
            AI-Powered
            <br />
            <span className="text-gradient">Defect Detection</span>
            <br />
            Platform
          </h2>
          <p className="mt-4 text-slate-400 leading-relaxed max-w-sm">
            Upload wafer images and get instant AI-driven defect analysis with bounding box visualization, severity classification, and automated reports.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4">
            {[
              { v: '6',    l: 'Defect Types' },
              { v: '4',    l: 'Severity Levels' },
              { v: '99ms', l: 'Avg Detection' },
              { v: '98%',  l: 'Accuracy' },
            ].map((s) => (
              <div key={s.l} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-2xl font-black text-brand-400">{s.v}</p>
                <p className="text-xs text-slate-400 mt-1">{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-slate-600">
          © {new Date().getFullYear()} SemiAI. All rights reserved.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-slide-up">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-brand-700 rounded-xl flex items-center justify-center">
              <RiCpuLine className="text-white text-lg" />
            </div>
            <span className="text-lg font-bold text-white">SemiAI</span>
          </div>

          <h1 className="text-3xl font-black text-white">Welcome back</h1>
          <p className="text-slate-400 mt-2 text-sm">Sign in to your account to continue.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
              <div className="relative">
                <RiMailLine className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  className={`input pl-10 ${errors.email ? 'input-error' : ''}`}
                />
              </div>
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium text-slate-300">Password</label>
                <Link to="/forgot-password" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <RiLockLine className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
                <input
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`input pl-10 pr-10 ${errors.password ? 'input-error' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPw ? <RiEyeOffLine /> : <RiEyeLine />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base"
            >
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : 'Sign In'}
            </button>

            {/* Demo credentials */}
            <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700 text-xs text-slate-400 space-y-1">
              <p className="font-medium text-slate-300">Demo credentials:</p>
              <p>Admin: <span className="text-brand-400">admin@semiconductor-ai.com</span> / <span className="text-brand-400">Admin@1234</span></p>
              <p>Engineer: <span className="text-brand-400">alice@semiconductor-ai.com</span> / <span className="text-brand-400">Admin@1234</span></p>
            </div>
          </form>

          <p className="mt-8 text-center text-sm text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
