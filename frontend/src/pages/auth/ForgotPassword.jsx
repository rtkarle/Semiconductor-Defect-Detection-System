import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import { RiCpuLine, RiMailLine, RiArrowLeftLine, RiCheckLine } from 'react-icons/ri';
import { authAPI } from '../../services/api';
import { getErrorMessage } from '../../hooks/useApi';

const schema = yup.object({ email: yup.string().email('Invalid email').required('Email is required') });

export default function ForgotPassword() {
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, getValues, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async ({ email }) => {
    setLoading(true);
    try {
      await authAPI.forgotPassword({ email });
      setSent(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 bg-brand-700 rounded-xl flex items-center justify-center glow-blue">
            <RiCpuLine className="text-white text-lg" />
          </div>
          <span className="text-lg font-bold text-white">SemiAI</span>
        </div>

        {sent ? (
          <div className="text-center card border-green-800/40 bg-green-900/10">
            <div className="w-16 h-16 bg-green-900/40 rounded-full flex items-center justify-center mx-auto mb-5">
              <RiCheckLine className="text-green-400 text-3xl" />
            </div>
            <h2 className="text-xl font-bold text-white">Check your email</h2>
            <p className="text-slate-400 text-sm mt-3 leading-relaxed">
              If <span className="text-brand-400">{getValues('email')}</span> is registered,
              you'll receive a password reset link shortly. The link expires in 1 hour.
            </p>
            <Link to="/login" className="btn-primary mt-6 inline-flex">
              Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-black text-white">Forgot password?</h1>
            <p className="text-slate-400 mt-2 text-sm">
              Enter your email and we'll send you a reset link.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email address</label>
                <div className="relative">
                  <RiMailLine className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="you@company.com"
                    className={`input pl-10 ${errors.email ? 'input-error' : ''}`}
                  />
                </div>
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
                {loading ? (
                  <span className="flex items-center gap-2 justify-center">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending…
                  </span>
                ) : 'Send Reset Link'}
              </button>
            </form>

            <Link to="/login" className="flex items-center gap-2 justify-center mt-6 text-sm text-slate-400 hover:text-slate-200 transition-colors">
              <RiArrowLeftLine /> Back to Sign In
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
