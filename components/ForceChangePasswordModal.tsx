import React, { useState } from 'react';
import BeeCharacter from './BeeCharacter';
import api from '../services/api';

interface ForceChangePasswordModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

const ForceChangePasswordModal: React.FC<ForceChangePasswordModalProps> = ({ onSuccess, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const passwordValid = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!passwordValid) {
      setError('New password must be 8+ chars with uppercase, lowercase, number, and special character (@$!%*?&)');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setIsLoading(true);
    try {
      await api.auth.changePassword(currentPassword, newPassword);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to change password. Check your current password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-brand-black/90 backdrop-blur-xl">
      <div className="bg-white rounded-[3rem] p-10 md:p-14 max-w-md w-full shadow-2xl border-4 border-brand-accent animate-slide-up">
        <div className="w-20 h-20 bg-brand-rose/20 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
          <BeeCharacter size="3rem" />
        </div>
        <h1 className="text-2xl font-black text-brand-black mb-2 text-center">Change Password Required</h1>
        <p className="text-gray-500 font-bold text-sm mb-8 text-center">For security, please set a new password before continuing.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-black text-gray-700 mb-2">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              required
              className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-5 py-4 font-semibold focus:border-brand-primary outline-none"
              placeholder="Enter current password"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-gray-700 mb-2">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-5 py-4 font-semibold focus:border-brand-primary outline-none"
              placeholder="8+ chars, upper, lower, number, special"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-gray-700 mb-2">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-5 py-4 font-semibold focus:border-brand-primary outline-none"
              placeholder="Re-enter new password"
            />
          </div>
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm font-bold px-4 py-3 rounded-xl">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-brand-black text-brand-primary font-black py-4 rounded-2xl disabled:opacity-60"
          >
            {isLoading ? 'Updating...' : 'Change Password'}
          </button>
        </form>

        <button
          onClick={onClose}
          className="w-full mt-4 text-gray-500 font-bold text-sm hover:text-brand-primary"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default ForceChangePasswordModal;
