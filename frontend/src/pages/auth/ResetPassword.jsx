import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import { RiCpuLine, RiLockLine, RiEyeLine, RiEyeOffLine, RiCheckLine } from 'react-icons/ri';
import { authAPI } from '../../services/api';
import { getErrorMessage } from '../../hooks/useApi';

const schema = yup.object({
  new_password: yup
    .string()
    .min(8, 'At least 8 characters')
    .matches(/[A-Z]/, 'Must contain an uppercase letter')
    .matches(/[0-9]/, 'Must contain a number')
    .required('Password is required'),
  confirm: yup.string().oneOf([yup.ref('new_password')], 'Passwords do not match').required(),
});

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const [showPw,  setShowPw]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async ({ new_password }) => {
    if (!token) { toast.error('Invalid reset link.'); return; }
    setLoading(true);
    try {
      await authAPI.resetPassword({ token, new_password });
      setDone(true);
      toast.success('Password reset successfully!');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md animate-slide-up">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 bg-brand-700 rounded-xl flex items-center justify-center glow-blue">
            <RiCpuLine className="text-white text-lg" />
          </div>
          <span className="text-lg font-bold text-white">SemiAI</span>
        </div>

        {done ? (
          <div className="text-center card border-green-800/40 bg-green-900/10">
            <div className="w-16 h-16 bg-green-900/40 rounded-full flex items-center justify-center mx-auto mb-5">
              <RiCheckLine className="text-green-400 text-3xl" />
            </div>
            <h2 className="text-xl font-bold text-white">Password updated!</h2>
            <p className="text-slate-400 text-sm mt-2">Redirecting you to sign in…</p>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-black text-white">Set new password</h1>
            <p className="text-slate-400 mt-2 text-sm">Choose a strong password for your account.</p>

            {!token && (
              <div className="mt-4 p-4 bg-red-900/20 border border-red-700 rounded-lg text-sm text-red-300">
                Invalid or missing reset token. Please request a new reset link.
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
              {['new_password', 'confirm'].map((name) => (
                <div key={name}>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    {name === 'new_password' ? 'New Password' : 'Confirm Password'}
                  </label>
                  <div className="relative">
                    <RiLockLine className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      {...register(name)}
                      type={showPw ? 'text' : 'password'}
                      placeholder="••••••••"
                      className={`input pl-10 pr-10 ${errors[name] ? 'input-error' : ''}`}
                    />
                    {name === 'new_password' && (
                      <button type="button" onClick={() => setShowPw(!showPw)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                        aria-label="Toggle">
                        {showPw ? <RiEyeOffLine /> : <RiEyeLine />}
                      </button>
                    )}
                  </div>
                  {errors[name] && <p className="text-red-400 text-xs mt-1">{errors[name].message}</p>}
                </div>
              ))}

              <button type="submit" disabled={loading || !token} className="btn-primary w-full py-3 text-base">
                {loading ? (
                  <span className="flex items-center gap-2 justify-center">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Updating…
                  </span>
                ) : 'Reset Password'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-400">
              <Link to="/login" className="text-brand-400 hover:text-brand-300 transition-colors">
                Back to Sign In
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
