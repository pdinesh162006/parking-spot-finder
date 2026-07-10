import React, { useState } from 'react';
import { useAuthStore, API_URL } from '../store/authStore';
import { User, Phone, Lock, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function Profile() {
  const { user, accessToken, updateUser } = useAuthStore();

  // Profile form state
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg(null);

    try {
      const res = await fetch(`${API_URL}/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name, phone }),
      });

      const data = await res.json();

      if (res.ok) {
        updateUser({ name, phone });
        setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
      } else {
        setProfileMsg({ type: 'error', text: data.message || 'Failed to update profile.' });
      }
    } catch (err) {
      setProfileMsg({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New password and confirmation do not match.' });
      setPasswordLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
      setPasswordLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/users/me/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        setPasswordMsg({ type: 'success', text: 'Password changed successfully.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordMsg({ type: 'error', text: data.message || 'Failed to change password.' });
      }
    } catch (err) {
      setPasswordMsg({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8 space-y-10">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Account Settings</h1>
        <p className="text-xs font-semibold text-slate-400">Update your personal details and security credentials.</p>
      </div>

      {/* Account Info Card */}
      <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm space-y-2">
        <div className="flex items-center space-x-4 pb-6 border-b border-slate-100">
          <div className="h-16 w-16 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-800">{user?.name}</h2>
            <p className="text-xs text-slate-400 font-semibold">{user?.email}</p>
            <span className="text-[9px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-extrabold uppercase mt-1 inline-block">
              {user?.role}
            </span>
          </div>
        </div>

        <p className="text-[10px] text-slate-400 font-semibold pt-2">
          Account created: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
        </p>
      </div>

      {/* Profile Update Form */}
      <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-slate-800">Edit Profile</h2>

        {profileMsg && (
          <div className={`flex items-center space-x-2 text-xs font-bold px-4 py-3 rounded-xl ${
            profileMsg.type === 'success' ? 'bg-emerald-50 border border-emerald-100 text-emerald-600' : 'bg-rose-50 border border-rose-100 text-rose-600'
          }`}>
            {profileMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            <span>{profileMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Full Name</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <User className="h-4 w-4" />
              </span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Phone Number</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Phone className="h-4 w-4" />
              </span>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={profileLoading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 px-6 rounded-xl shadow transition hover-lift flex items-center space-x-1 text-sm"
          >
            {profileLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            <span>Save Changes</span>
          </button>
        </form>
      </div>

      {/* Password Change Form */}
      <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-slate-800">Change Password</h2>

        {passwordMsg && (
          <div className={`flex items-center space-x-2 text-xs font-bold px-4 py-3 rounded-xl ${
            passwordMsg.type === 'success' ? 'bg-emerald-50 border border-emerald-100 text-emerald-600' : 'bg-rose-50 border border-rose-100 text-rose-600'
          }`}>
            {passwordMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            <span>{passwordMsg.text}</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Current Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Confirm Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={passwordLoading}
            className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3 px-6 rounded-xl shadow transition hover-lift flex items-center space-x-1 text-sm"
          >
            {passwordLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            <span>Update Password</span>
          </button>
        </form>
      </div>
    </div>
  );
}
