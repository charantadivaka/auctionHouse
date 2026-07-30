"use client";

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Cookies from 'js-cookie';
import { useAuth } from '@/context/AuthContext';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refreshToken');

    if (token && refreshToken) {
      import('@/lib/api').then(({ api }) => {
        api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
          .then(res => {
            import('js-cookie').then((Cookies) => {
              Cookies.default.set('refreshToken', refreshToken, { expires: 30 });
              login(token, res.data);
              router.push('/dashboard');
            });
          })
          .catch(() => {
            router.push('/login?error=FailedToFetchProfile');
          });
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
