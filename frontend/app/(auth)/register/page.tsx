"use client";

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, Gavel, CheckCircle, Send } from 'lucide-react';

const passwordStrength = (pw: string) => {
  let strength = 0;
  if (pw.length >= 8) strength++;
  if (/[A-Z]/.test(pw)) strength++;
  if (/[0-9]/.test(pw)) strength++;
  if (/[^A-Za-z0-9]/.test(pw)) strength++;
  return strength;
};

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const strength = passwordStrength(password);
  const strengthColors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400'];
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/register', { name, email, password });
      setRegisteredEmail(email);
      setRegistered(true);
    } catch (err: any) {
      if (Array.isArray(err.response?.data?.message)) {
        setError(err.response.data.message[0]);
      } else {
        setError(err.response?.data?.message || 'Failed to register');
      }
    } finally {
      setLoading(false);
    }
  };

  const perks = [
    'Bid on thousands of live auctions',
    'Real-time notifications & alerts',
    'Secure payment & buyer protection',
    'Sell your items to a global audience',
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-600 via-indigo-700 to-indigo-800 relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 right-20 w-72 h-72 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-20 left-10 w-96 h-96 rounded-full bg-indigo-300/20 blur-3xl" />
        </div>
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Gavel className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">AuctionHouse</span>
          </Link>
        </div>
        <div className="relative z-10">
          <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">
            Join the auction revolution
          </h2>
          <p className="text-indigo-200 text-lg mb-8">
            Create a free account and start bidding or selling in minutes.
          </p>
          <ul className="space-y-3">
            {perks.map(p => (
              <li key={p} className="flex items-center gap-3 text-indigo-100">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative z-10 text-indigo-300 text-sm">
          © 2025 AuctionHouse. All rights reserved.
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50">
        <div className="w-full max-w-md">
          <Link href="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Gavel className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">AuctionHouse</span>
          </Link>

          {registered ? (
            <div className="text-center animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-6">
                <Send className="w-10 h-10 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Check your inbox</h2>
              <p className="text-gray-600 mb-2">
                We&apos;ve sent a verification link to
              </p>
              <p className="font-semibold text-indigo-600 mb-6 break-all">{registeredEmail}</p>
              <p className="text-sm text-gray-500 mb-8">
                Click the link in the email to activate your account. The link expires in 24 hours.
              </p>
              <Link
                href="/login"
                className="btn-primary inline-flex items-center gap-2 px-6 py-3"
              >
                Go to Login
              </Link>
              <p className="mt-6 text-xs text-gray-400">
                Didn&apos;t receive it? Check your spam folder or{' '}
                <button
                  className="text-indigo-600 underline"
                  onClick={() => setRegistered(false)}
                >
                  try again
                </button>
                .
              </p>
            </div>
          ) : (
            <>
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900">Create account</h1>
            <p className="mt-2 text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
                Sign in
              </Link>
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm animate-fade-in">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="input-field pl-10"
                  suppressHydrationWarning
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input-field pl-10"
                  suppressHydrationWarning
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="input-field pl-10 pr-10"
                  suppressHydrationWarning
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  suppressHydrationWarning
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[0, 1, 2, 3].map(i => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${i < strength ? strengthColors[strength - 1] : 'bg-gray-200'}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">Password strength: <span className="font-medium">{strength > 0 ? strengthLabels[strength - 1] : 'Too short'}</span></p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-sm"
              suppressHydrationWarning
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : 'Create account'}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
                window.location.href = `${apiUrl}/auth/google`;
              }}
              className="w-full flex justify-center items-center gap-3 py-3 px-4 border border-gray-300 rounded-xl shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              suppressHydrationWarning
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign up with Google
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-400">
            By creating an account, you agree to our{' '}
            <span className="underline cursor-pointer">Terms of Service</span> and{' '}
            <span className="underline cursor-pointer">Privacy Policy</span>.
          </p>
          </>
          )}
        </div>
      </div>
    </div>
  );
}
