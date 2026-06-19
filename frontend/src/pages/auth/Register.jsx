import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import {
  RiCpuLine, RiEyeLine, RiEyeOffLine, RiLockLine,
  RiMailLine, RiUserLine, RiBuildingLine,
} from 'react-icons/ri';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../hooks/useApi';

const schema = yup.object({
  full_name:  yup.string().min(2, 'At least 2 characters').required('Full name is required'),
  email:      yup.string().email('Invalid email').required('Email is required'),
  company:    yup.string().optional(),
  department: yup.string().optional(),
  password: yup
    .string()
    .min(8, 'At least 8 characters')
    .matches(/[A-Z]/, 'Must contain an uppercase letter')
    .matches(/[0-9]/, 'Must contain a number')
    .required('Password is required'),
  confirm_password: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords do not match')
    .required('Please confirm your password'),
});

export default function Register() {
  const { register: signUp } = useAuth();
  const navigate = useNavigate();
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { role: 'engineer' },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const { confirm_password, ...payload } = data;
      await signUp(payload);
      toast.success('Account created! Please sign in.');
      navigate('/login');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ name, label, type = 'text', icon: Icon, placeholder, extra }) => (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />}
        <input
          {...register(name)}
          type={type}
          placeholder={placeholder}
          className={`input ${Icon ? 'pl-10' : ''} ${extra || ''} ${errors[name] ? 'input-error' : ''}`}
        />
        {name === 'password' && (
          <button type="button" onClick={() => setShowPw(!showPw)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            aria-label="Toggle password">
            {showPw ? <RiEyeOffLine /> : <RiEyeLine />}
          </button>
        )}
      </div>
      {errors[name] && <p className="text-red-400 text-xs mt-1">{errors[name].message}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-lg animate-slide-up">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 bg-brand-700 rounded-xl flex items-center justify-center glow-blue">
            <RiCpuLine className="text-white text-lg" />
          </div>
          <span className="text-lg font-bold text-white">SemiAI</span>
        </div>

        <h1 className="text-3xl font-black text-white">Create your account</h1>
        <p className="text-slate-400 mt-2 text-sm">Join the AI-powered quality inspection platform.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field name="full_name"  label="Full Name"   icon={RiUserLine}     placeholder="Alice Chen" />
            <Field name="email"      label="Email"       icon={RiMailLine}     placeholder="you@company.com" type="email" />
            <Field name="company"    label="Company"     icon={RiBuildingLine} placeholder="SemiConductor Inc." />
            <Field name="department" label="Department"  icon={RiBuildingLine} placeholder="Quality Control" />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Role</label>
            <select {...register('role')} className="input">
              <option value="engineer">Engineer</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>

          <Field
            name="password"
            label="Password"
            icon={RiLockLine}
            placeholder="Min 8 chars, 1 uppercase, 1 number"
            type={showPw ? 'text' : 'password'}
          />
          <Field
            name="confirm_password"
            label="Confirm Password"
            icon={RiLockLine}
            placeholder="Repeat your password"
            type={showPw ? 'text' : 'password'}
          />

          {/* Password hint */}
          <p className="text-xs text-slate-500">
            Password must be at least 8 characters with one uppercase letter and one number.
          </p>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base mt-2">
            {loading ? (
              <span className="flex items-center gap-2 justify-center">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating account…
              </span>
            ) : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
