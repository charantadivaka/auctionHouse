"use client";

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, AlertCircle, Gavel, ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react';

// ─── Step 1: Credentials Form ───────────────────────────────────────────────
function CredentialsStep({
  onSuccess,
}: {
  onSuccess: (email: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/login', { email, password });
      onSuccess(email);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">Sign in</h1>
        <p className="mt-2 text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-semibold text-indigo-600 hover:text-indigo-500">
            Create one free
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
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="login-email"
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
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
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
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              suppressHydrationWarning
            />
            Remember me (30 days)
          </label>
          <Link href="/forgot-password" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
            Forgot password?
          </Link>
        </div>

        <button
          id="login-submit"
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3 text-sm"
          suppressHydrationWarning
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Sending code...
            </span>
          ) : 'Continue'}
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
          Sign in with Google
        </button>
      </form>
    </>
  );
}

// ─── Step 2: OTP Verification ────────────────────────────────────────────────
const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

function OtpStep({
  email,
  onBack,
}: {
  email: string;
  onBack: () => void;
}) {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { login } = useAuth();
  const router = useRouter();

  // Focus first box on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const id = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(id);
  }, [countdown]);

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const char = value.slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    if (char && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  const handleVerify = async () => {
    const otp = digits.join('');
    if (otp.length < OTP_LENGTH) {
      setError('Please enter all 6 digits.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { email, otp });
      const Cookies = (await import('js-cookie')).default;
      Cookies.set('token', res.data.token, { expires: 1 });
      if (res.data.refreshToken) {
        Cookies.set('refreshToken', res.data.refreshToken, { expires: 30 });
      }
      login(res.data.token, res.data.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid code. Please try again.');
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError('');
    // Resending is not directly supported without the password,
    // so we inform the user to go back and log in again.
    setError('To get a new code, please go back and sign in again.');
    setResending(false);
  };

  return (
    <>
      {/* Header */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        suppressHydrationWarning
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
          <ShieldCheck className="w-8 h-8 text-indigo-600" />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900">Check your email</h1>
        <p className="mt-2 text-sm text-gray-500 max-w-xs">
          We&apos;ve sent a 6-digit verification code to{' '}
          <span className="font-semibold text-gray-800 break-all">{email}</span>
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm animate-fade-in">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* OTP boxes */}
      <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
        {digits.map((digit, i) => (
          <input
            key={i}
            id={`otp-digit-${i}`}
            ref={el => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={e => handleDigitChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            suppressHydrationWarning
            className={`
              w-11 h-14 text-center text-xl font-bold rounded-xl border-2 outline-none
              transition-all duration-150 bg-white
              ${digit
                ? 'border-indigo-500 text-indigo-700 shadow-sm shadow-indigo-100'
                : 'border-gray-200 text-gray-900'}
              focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
            `}
          />
        ))}
      </div>

      <button
        id="otp-verify-btn"
        onClick={handleVerify}
        disabled={loading || digits.join('').length < OTP_LENGTH}
        className="btn-primary w-full py-3 text-sm mb-4"
        suppressHydrationWarning
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Verifying...
          </span>
        ) : 'Verify & Sign in'}
      </button>

      {/* Resend / countdown */}
      <div className="text-center text-sm text-gray-500">
        {countdown > 0 ? (
          <span>
            Code expires in{' '}
            <span className="font-semibold text-gray-700">
              {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
            </span>
          </span>
        ) : (
          <button
            onClick={handleResend}
            disabled={resending}
            className="flex items-center gap-1.5 mx-auto text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
            suppressHydrationWarning
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
            Resend code
          </button>
        )}
      </div>
    </>
  );
}

// ─── Page Shell ──────────────────────────────────────────────────────────────
export default function Login() {
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [otpEmail, setOtpEmail] = useState('');

  const handleCredentialsSuccess = (email: string) => {
    setOtpEmail(email);
    setStep('otp');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-purple-300/20 blur-3xl" />
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
            {step === 'otp' ? (
              <>Secure login<br />in two steps</>
            ) : (
              <>Welcome back to<br />the marketplace</>
            )}
          </h2>
          <p className="text-indigo-200 text-lg">
            {step === 'otp'
              ? 'Your account is protected with a one-time code sent to your inbox.'
              : 'Sign in to bid on live auctions, track your listings, and manage your account.'}
          </p>
          {step === 'credentials' && (
            <div className="mt-10 grid grid-cols-3 gap-4">
              {[
                { label: 'Live Auctions', value: '2,400+' },
                { label: 'Happy Sellers', value: '18K+' },
                { label: 'Items Sold', value: '94K+' },
              ].map(s => (
                <div key={s.label} className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-indigo-200 text-xs mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="relative z-10 text-indigo-300 text-sm">
          © 2025 AuctionHouse. All rights reserved.
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Gavel className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">AuctionHouse</span>
          </Link>

          {step === 'credentials' ? (
            <CredentialsStep onSuccess={handleCredentialsSuccess} />
          ) : (
            <OtpStep email={otpEmail} onBack={() => setStep('credentials')} />
          )}

          <p className="mt-6 text-center text-xs text-gray-400">
            By signing in, you agree to our{' '}
            <span className="underline cursor-pointer">Terms of Service</span> and{' '}
            <span className="underline cursor-pointer">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
