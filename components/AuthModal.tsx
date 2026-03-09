import React, { useState, useEffect } from 'react';
import { User, Category } from '../types';
import BeeCharacter from './BeeCharacter.tsx';
import api from '../services/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

type AuthMode = 'login' | 'signup';

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMode('login');
      setStep(1);
      setError('');
      setEmail('');
      setName('');
      setPassword('');
      setPhone('');
      setAddress('');
      setLandmark('');
      setCity('');
      setState('');
      setZip('');
      setIsLoading(false);
    }
  }, [isOpen]);

  // Validation helpers
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPhone = (phone: string) => /^[0-9]{10}$/.test(phone);
  const isValidCityState = (value: string) =>
    /^[a-zA-Z\s]+$/.test(value) && value.trim().length >= 2;

  const handleNextStep = () => {
    if (mode === 'signup') {
      if (!isValidEmail(email))
        return setError('Please enter a valid email address (e.g. name@example.com)');
      if (password.length < 6) return setError('Password too short (min 6 chars)');
      if (name.length < 2) return setError('Full name required');
      setError('');
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (mode === 'login') {
      if (!isValidEmail(email) || password.length < 6) {
        return setError('Invalid email or password');
      }
    } else {
      if (!phone || !address || !city || !state || !zip) {
        return setError('All primary shipping details are required');
      }
      if (!isValidPhone(phone)) {
        return setError('Phone number must be exactly 10 digits');
      }
      if (!isValidCityState(city)) {
        return setError('City must contain only letters');
      }
      if (!isValidCityState(state)) {
        return setError('State must contain only letters');
      }
      if (zip.length !== 6 || !/^[0-9]{6}$/.test(zip)) {
        return setError('Pincode must be exactly 6 digits');
      }
    }
    setIsLoading(true);
    try {
      let apiUser: any;
      if (mode === 'login') {
        apiUser = await api.auth.signin(email, password);
      } else {
        apiUser = await api.auth.signup({
          fullName: name,
          email,
          password,
          phone,
          address: {
            street: address,
            landmark,
            city,
            state,
            zipCode: zip,
          },
        });
      }
      // Map API user to frontend User type
      const mappedUser: User = {
        id: apiUser._id || apiUser.id || 'u_' + Date.now(),
        email: apiUser.email || email,
        name: apiUser.fullName || apiUser.name || (mode === 'signup' ? name : email.split('@')[0]),
        phoneNumber: apiUser.phone || phone,
        streetAddress: apiUser.address?.street || address,
        landmark: apiUser.address?.landmark || landmark,
        city: apiUser.address?.city || city,
        state: apiUser.address?.state || state,
        zipCode: apiUser.address?.zipCode || zip,
        country: 'India',
        role: apiUser.role,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(apiUser.fullName || apiUser.name || name || email.split('@')[0])}&background=F59E0B&color=fff`,
      };
      onLoginSuccess(mappedUser);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-brand-black/80 backdrop-blur-xl animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="bg-white rounded-[2.5rem] shadow-[0_40px_80px_rgba(0,0,0,0.3)] w-full max-w-lg relative z-10 overflow-hidden animate-slide-up border border-gray-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-30 w-10 h-10 rounded-xl bg-gray-100 hover:bg-rose-100 text-gray-400 hover:text-rose-500 transition-all flex items-center justify-center group"
        >
          <svg
            className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header Section */}
        <div className="px-10 pt-10 pb-8 bg-gradient-to-br from-amber-50/80 via-white to-orange-50/50 border-b border-gray-100/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-brand-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

          <div className="relative z-10 flex items-center gap-5">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <BeeCharacter size="2.2rem" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-brand-black tracking-tight">
                {mode === 'login' ? 'Welcome Back!' : 'Join the Hive'}
              </h2>
              <p className="text-gray-500 font-medium text-sm mt-0.5">
                {mode === 'login'
                  ? 'Enter your credentials to continue'
                  : 'Create your account in just 2 steps'}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="px-10 pt-6 pb-4">
          <div className="bg-gray-100 p-1.5 rounded-2xl flex gap-2">
            <button
              className={`flex-1 py-3.5 text-sm font-black uppercase tracking-wider transition-all rounded-xl ${mode === 'login' ? 'bg-white text-brand-black shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
              onClick={() => {
                setMode('login');
                setStep(1);
              }}
            >
              Sign In
            </button>
            <button
              className={`flex-1 py-3.5 text-sm font-black uppercase tracking-wider transition-all rounded-xl ${mode === 'signup' ? 'bg-white text-brand-black shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
              onClick={() => setMode('signup')}
            >
              Sign Up
            </button>
          </div>
        </div>

        {/* Progress Indicator for Signup */}
        {mode === 'signup' && (
          <div className="px-10 pb-4 flex items-center gap-4">
            <div
              className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${step >= 1 ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gray-200'}`}
            />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Step {step}/2
            </span>
            <div
              className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${step >= 2 ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gray-200'}`}
            />
          </div>
        )}

        {/* Form Content */}
        <div className="px-10 pb-10 overflow-y-auto custom-scrollbar max-h-[50vh]">
          <form
            onSubmit={
              mode === 'login'
                ? handleSubmit
                : step === 1
                  ? (e) => {
                      e.preventDefault();
                      handleNextStep();
                    }
                  : handleSubmit
            }
            className="space-y-5"
          >
            {mode === 'login' ? (
              <div className="space-y-5 animate-fade-in">
                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-700 ml-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-5 py-4 text-sm font-semibold focus:bg-white focus:border-brand-primary outline-none transition-all placeholder:text-gray-400"
                      placeholder="you@example.com"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-700 ml-1">Password</label>
                  <div className="relative">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-5 py-4 text-sm font-semibold focus:bg-white focus:border-brand-primary outline-none transition-all placeholder:text-gray-400"
                      placeholder="••••••••"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="animate-fade-in">
                {step === 1 ? (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-gray-700 ml-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-5 py-4 text-sm font-semibold focus:bg-white focus:border-brand-primary outline-none transition-all"
                        placeholder="Your full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-gray-700 ml-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-5 py-4 text-sm font-semibold focus:bg-white focus:border-brand-primary outline-none transition-all"
                        placeholder="you@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-gray-700 ml-1">
                        Password{' '}
                        <span className="text-gray-400 font-medium">(min 6 characters)</span>
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-5 py-4 text-sm font-semibold focus:bg-white focus:border-brand-primary outline-none transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5 animate-slide-in-right">
                    <p className="text-xs text-gray-500 font-medium bg-amber-50 px-4 py-3 rounded-xl border border-amber-100/50">
                      📦 <strong>Shipping Details</strong> — We'll use this for faster checkout
                    </p>
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-gray-700 ml-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        pattern="[0-9]{10}"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-5 py-4 text-sm font-semibold focus:bg-white focus:border-brand-primary outline-none transition-all"
                        placeholder="10-digit mobile number"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-gray-700 ml-1">
                        Street Address
                      </label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        required
                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-5 py-4 text-sm font-semibold focus:bg-white focus:border-brand-primary outline-none transition-all"
                        placeholder="House/Flat No, Street"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-xs font-black text-gray-700 ml-1">City</label>
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          required
                          className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-5 py-4 text-sm font-semibold focus:bg-white focus:border-brand-primary outline-none transition-all"
                          placeholder="City"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs font-black text-gray-700 ml-1">State</label>
                        <input
                          type="text"
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          required
                          className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-5 py-4 text-sm font-semibold focus:bg-white focus:border-brand-primary outline-none transition-all"
                          placeholder="State"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-gray-700 ml-1">Pincode</label>
                      <input
                        type="text"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        value={zip}
                        onChange={(e) => setZip(e.target.value)}
                        required
                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-5 py-4 text-sm font-semibold focus:bg-white focus:border-brand-primary outline-none transition-all"
                        placeholder="6-digit pincode"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-1"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                      Back to account details
                    </button>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold px-4 py-3 rounded-xl flex items-center gap-2 animate-shake">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black py-5 rounded-2xl shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 hover:scale-[1.02] active:scale-95 transition-all flex justify-center items-center gap-3 text-sm uppercase tracking-wider disabled:opacity-60 disabled:cursor-wait"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    {mode === 'login' ? 'Sign In' : step === 1 ? 'Continue' : 'Create Account'}
                  </span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
