import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import {
  RiUserLine, RiBuildingLine, RiPhoneLine,
  RiLockLine, RiSaveLine, RiShieldCheckLine,
  RiEyeLine, RiEyeOffLine, RiMailLine,
} from 'react-icons/ri';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../hooks/useApi';
import { formatDateTime } from '../utils/helpers';

const profileSchema = yup.object({
  full_name:  yup.string().min(2).required('Name is required'),
  company:    yup.string().nullable(),
  department: yup.string().nullable(),
  phone:      yup.string().nullable(),
});

const pwSchema = yup.object({
  current_password: yup.string().required('Current password is required'),
  new_password: yup
    .string().min(8, 'Min 8 characters')
    .matches(/[A-Z]/, 'Needs an uppercase letter')
    .matches(/[0-9]/, 'Needs a number')
    .required(),
  confirm: yup.string().oneOf([yup.ref('new_password')], 'Passwords do not match').required(),
});

// ── Section card ──────────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children }) {
  return (
    <div className="card space-y-5">
      <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 pb-3 border-b border-slate-800">
        <Icon className="text-brand-400" /> {title}
      </h3>
      {children}
    </div>
  );
}

// ── Text input helper ─────────────────────────────────────────────────────────
function Field({ label, name, register, errors, icon: Icon, type = 'text', placeholder, readOnly }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-400 mb-1.5">{label}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />}
        <input
          {...(register ? register(name) : {})}
          type={type}
          placeholder={placeholder}
          readOnly={readOnly}
          className={`input ${Icon ? 'pl-10' : ''} ${errors?.[name] ? 'input-error' : ''} ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
        />
      </div>
      {errors?.[name] && <p className="text-red-400 text-xs mt-1">{errors[name].message}</p>}
    </div>
  );
}

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [profileLoading, setProfileLoading] = useState(false);
  const [pwLoading,      setPwLoading]      = useState(false);
  const [showCurPw,      setShowCurPw]      = useState(false);
  const [showNewPw,      setShowNewPw]      = useState(false);

  // ── Profile form ─────────────────────────────────────────────────────────
  const {
    register: regProfile,
    handleSubmit: handleProfile,
    formState: { errors: profileErrors },
  } = useForm({
    resolver: yupResolver(profileSchema),
    defaultValues: {
      full_name:  user?.full_name  || '',
      company:    user?.company    || '',
      department: user?.department || '',
      phone:      user?.phone      || '',
    },
  });

  const onProfileSave = async (data) => {
    setProfileLoading(true);
    try {
      const res = await authAPI.updateMe(data);
      updateUser(res.data);
      toast.success('Profile updated successfully.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setProfileLoading(false);
    }
  };

  // ── Password form ─────────────────────────────────────────────────────────
  const {
    register: regPw,
    handleSubmit: handlePw,
    reset: resetPw,
    formState: { errors: pwErrors },
  } = useForm({ resolver: yupResolver(pwSchema) });

  const onPasswordSave = async (data) => {
    setPwLoading(true);
    try {
      await authAPI.changePassword({
        current_password: data.current_password,
        new_password: data.new_password,
      });
      toast.success('Password updated successfully.');
      resetPw();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPwLoading(false);
    }
  };

  const ROLE_COLOR = { admin: 'text-red-400', engineer: 'text-brand-400', viewer: 'text-green-400' };

  return (
    <div className="page-container max-w-3xl space-y-8">
      <div>
        <h2 className="section-title">My Profile</h2>
        <p className="section-subtitle">Manage your account details and security settings.</p>
      </div>

      {/* Avatar + meta strip */}
      <div className="card flex items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-brand-700 flex items-center justify-center text-3xl font-black text-white flex-shrink-0 glow-blue">
          {user?.full_name?.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold text-white truncate">{user?.full_name}</p>
          <p className="text-sm text-slate-400 truncate">{user?.email}</p>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className={`text-xs font-semibold capitalize ${ROLE_COLOR[user?.role] || 'text-slate-400'}`}>
              {user?.role}
            </span>
            {user?.company && <span className="text-xs text-slate-500">{user.company}</span>}
            {user?.department && <span className="text-xs text-slate-500">· {user.department}</span>}
          </div>
        </div>
        <div className="ml-auto text-right text-xs text-slate-500 hidden sm:block">
          <p>Member since</p>
          <p className="text-slate-400 mt-0.5">{formatDateTime(user?.created_at)}</p>
          {user?.last_login && (
            <>
              <p className="mt-2">Last login</p>
              <p className="text-slate-400 mt-0.5">{formatDateTime(user?.last_login)}</p>
            </>
          )}
        </div>
      </div>

      {/* Account info (read-only) */}
      <Section title="Account Information" icon={RiShieldCheckLine}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Email" name="email" icon={RiMailLine} readOnly
            register={() => ({ value: user?.email || '', readOnly: true, onChange: () => {} })} />
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">Role</label>
            <div className="input flex items-center gap-2 opacity-60 cursor-not-allowed">
              <RiShieldCheckLine className="text-slate-500" />
              <span className={`text-sm font-medium capitalize ${ROLE_COLOR[user?.role]}`}>{user?.role}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-5 text-xs text-slate-500 pt-2 border-t border-slate-800">
          <div>
            <p className="text-slate-600 uppercase tracking-wider mb-1">Account Created</p>
            <p className="text-slate-400">{formatDateTime(user?.created_at)}</p>
          </div>
          <div>
            <p className="text-slate-600 uppercase tracking-wider mb-1">Last Login</p>
            <p className="text-slate-400">{user?.last_login ? formatDateTime(user.last_login) : 'N/A'}</p>
          </div>
        </div>
      </Section>

      {/* Profile form */}
      <Section title="Personal Information" icon={RiUserLine}>
        <form onSubmit={handleProfile(onProfileSave)} className="space-y-5" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Full Name"   name="full_name"  register={regProfile} errors={profileErrors} icon={RiUserLine}     placeholder="Alice Chen" />
            <Field label="Company"     name="company"    register={regProfile} errors={profileErrors} icon={RiBuildingLine} placeholder="SemiConductor Inc." />
            <Field label="Department"  name="department" register={regProfile} errors={profileErrors} icon={RiBuildingLine} placeholder="Quality Control" />
            <Field label="Phone"       name="phone"      register={regProfile} errors={profileErrors} icon={RiPhoneLine}    placeholder="+1 555 000 0000" />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={profileLoading} className="btn-primary text-sm">
              {profileLoading
                ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</span>
                : <><RiSaveLine /> Save Changes</>}
            </button>
          </div>
        </form>
      </Section>

      {/* Change password */}
      <Section title="Change Password" icon={RiLockLine}>
        <form onSubmit={handlePw(onPasswordSave)} className="space-y-5" noValidate>
          {/* Current password */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">Current Password</label>
            <div className="relative">
              <RiLockLine className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
              <input
                {...regPw('current_password')}
                type={showCurPw ? 'text' : 'password'}
                placeholder="Enter current password"
                className={`input pl-10 pr-10 ${pwErrors.current_password ? 'input-error' : ''}`}
              />
              <button type="button" onClick={() => setShowCurPw(!showCurPw)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                {showCurPw ? <RiEyeOffLine /> : <RiEyeLine />}
              </button>
            </div>
            {pwErrors.current_password && <p className="text-red-400 text-xs mt-1">{pwErrors.current_password.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* New password */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">New Password</label>
              <div className="relative">
                <RiLockLine className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
                <input
                  {...regPw('new_password')}
                  type={showNewPw ? 'text' : 'password'}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  className={`input pl-10 pr-10 ${pwErrors.new_password ? 'input-error' : ''}`}
                />
                <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showNewPw ? <RiEyeOffLine /> : <RiEyeLine />}
                </button>
              </div>
              {pwErrors.new_password && <p className="text-red-400 text-xs mt-1">{pwErrors.new_password.message}</p>}
            </div>

            {/* Confirm */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Confirm Password</label>
              <div className="relative">
                <RiLockLine className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
                <input
                  {...regPw('confirm')}
                  type={showNewPw ? 'text' : 'password'}
                  placeholder="Repeat new password"
                  className={`input pl-10 ${pwErrors.confirm ? 'input-error' : ''}`}
                />
              </div>
              {pwErrors.confirm && <p className="text-red-400 text-xs mt-1">{pwErrors.confirm.message}</p>}
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={pwLoading} className="btn-primary text-sm">
              {pwLoading
                ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Updating…</span>
                : <><RiLockLine /> Update Password</>}
            </button>
          </div>
        </form>
      </Section>
    </div>
  );
}
