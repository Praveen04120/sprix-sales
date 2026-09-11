'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useHiring } from '@/context/HiringContext';
import { ArrowRight, KeyRound, AlertCircle } from 'lucide-react';

export default function LoginView() {
  const { setIsAuthenticated, showToast } = useHiring();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter the password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('sprix_authenticated', 'true');
        }
        setIsAuthenticated(true);
        showToast('Welcome to Sprix Hiring Management', 'success');
      } else {
        setError(data.error || 'Invalid password. Please try again.');
      }
    } catch {
      setError('Unable to authenticate. Please check network connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FC] flex flex-col justify-center items-center p-4">
      {/* Background decorative soft shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-100/50 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-pink-100/40 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card Container */}
        <div className="bg-white rounded-2xl shadow-modal border border-slate-200/80 p-8 sm:p-10 backdrop-blur-xl">
          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-20 h-20 mb-4 relative flex items-center justify-center bg-white rounded-2xl border border-slate-200 shadow-sm p-2">
              <Image
                src="/sprix-logo.png"
                alt="Sprix Logo"
                width={72}
                height={72}
                priority
                className="object-contain"
              />
            </div>

            <h1 className="text-2xl font-black text-[#01008A] tracking-tight">
              SPRIX
            </h1>
            <p className="text-sm font-semibold text-slate-700 mt-0.5">
              Hiring Management
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Enter Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Password"
                  autoFocus
                  className={`w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                    error
                      ? 'border-rose-300 focus:ring-rose-200 focus:border-rose-500 bg-rose-50/20'
                      : 'border-slate-200 focus:ring-[#01008A]/15 focus:border-[#01008A]'
                  }`}
                />
              </div>
              {error && (
                <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-rose-600">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-[#01008A] hover:bg-[#000066] active:scale-[0.99] text-white font-semibold text-sm rounded-xl shadow-md shadow-[#01008A]/15 flex items-center justify-center gap-2 transition-all group disabled:opacity-70 cursor-pointer"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Enter Portal</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 text-[#FF0198] transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-slate-400 font-medium">
          Sprix Internal Hiring Platform
        </div>
      </div>
    </div>
  );
}
