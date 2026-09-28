"use client";

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Cookies from 'js-cookie';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  useEffect(() => {
    // BUG FIX: Read from cookies first (set by backend), then fallback to search params (legacy)
    const token = Cookies.get('token') || searchParams.get('token');
    const refreshToken = Cookies.get('refreshToken') || searchParams.get('refreshToken');

    if (token && refreshToken) {
      api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          Cookies.set('token', token, { expires: 30 });
          Cookies.set('refreshToken', refreshToken, { expires: 30 });
          login(token, res.data);
          router.push('/dashboard');
        })
        .catch(() => {
          router.push('/login?error=FailedToFetchProfile');
        });
    } else {
      router.push('/login?error=OAuthFailed');
    }
  }, [searchParams, router, login]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
        <p className="text-gray-500 font-medium animate-pulse">Completing sign in...</p>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
