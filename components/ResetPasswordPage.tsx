import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import BeeCharacter from './BeeCharacter';
import api from '../services/api';

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const passwordValid = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!token) {
      setError('Invalid or missing reset link. Request a new one.');
      return;
    }
    if (!passwordValid) {
      setError('Password must be 8+ chars with uppercase, lowercase, number, and special character (@$!%*?&)');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setIsLoading(true);
    try {
      await api.auth.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => navigate('/'), 3000);
    } catch (err: any) {
      setError(err.message || 'Reset failed. The link may have expired. Request a new one.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token && !success) {
    return (
      <div className="min-h-screen bg-brand-light flex items-center justify-center p-4">
        <div className="bg-white rounded-[4rem] p-12 max-w-md w-full text-center shadow-2xl border-4 border-brand-accent">
          <div className="w-24 h-24 bg-brand-rose/20 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-black text-brand-black mb-4">Invalid Reset Link</h1>
          <p className="text-gray-500 font-bold mb-8">This link is invalid or expired. Please request a new password reset from the login page.</p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-brand-primary text-brand-black font-black py-4 rounded-2xl"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-brand-light flex items-center justify-center p-4">
        <div className="bg-white rounded-[4rem] p-12 max-w-md w-full text-center shadow-2xl border-4 border-brand-accent">
          <div className="w-24 h-24 bg-brand-meadow rounded-[2rem] flex items-center justify-center mx-auto mb-6">
            <BeeCharacter size="4rem" />
          </div>
          <h1 className="text-2xl font-black text-brand-black mb-4">Password Reset!</h1>
          <p className="text-gray-500 font-bold mb-8">You can now sign in with your new password.</p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-brand-black text-brand-primary font-black py-4 rounded-2xl"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-light flex items-center justify-center p-4">
      <div className="bg-white rounded-[4rem] p-10 md:p-14 max-w-md w-full shadow-2xl border-4 border-brand-accent">
        <div className="w-20 h-20 bg-brand-primary rounded-[2rem] flex items-center justify-center mx-auto mb-8">
          <BeeCharacter size="3rem" />
        </div>
        <h1 className="text-3xl font-black text-brand-black mb-2 text-center">Set New Password</h1>
        <p className="text-gray-500 font-bold text-sm mb-8 text-center">Enter your new password below</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-black text-gray-700 mb-2">New Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-5 py-4 font-semibold focus:border-brand-primary outline-none"
              placeholder="8+ chars, upper, lower, number, special"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-gray-700 mb-2">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-5 py-4 font-semibold focus:border-brand-primary outline-none"
              placeholder="Re-enter password"
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
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <button
          onClick={() => navigate('/')}
          className="w-full mt-4 text-gray-500 font-bold text-sm hover:text-brand-primary"
        >
          ← Back to Home
        </button>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
