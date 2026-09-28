"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';
import { api } from '@/lib/api';
import { socketManager } from '@/lib/socket';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  unreadCount: number;
  login: (token: string, user: User) => void;
  logout: () => void;
  clearUnread: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  unreadCount: 0,
  login: () => {},
  logout: () => {},
  clearUnread: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications?unreadOnly=true');
      setUnreadCount(Array.isArray(res.data) ? res.data.length : 0);
    } catch {
      // Non-critical — ignore errors
    }
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      const token = Cookies.get('token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data);
          if (typeof window !== 'undefined') socketManager.reconnectAll();
        } catch {
          Cookies.remove('token');
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  // BUG-08: Subscribe to notifications socket to maintain live unread count
  useEffect(() => {
    if (!user) return;
    // Guard: socket APIs are browser-only
    if (typeof window === 'undefined') return;

    fetchUnreadCount();

    // Listen for new notifications via WebSocket
    const notifSocket = socketManager.getNotificationsSocket();
    const handleNew = () => setUnreadCount(c => c + 1);
    notifSocket.on('newNotification', handleNew);

    return () => {
      notifSocket.off('newNotification', handleNew);
    };
  }, [user, fetchUnreadCount]);

  const login = (token: string, userData: User) => {
    Cookies.set('token', token, { expires: 7 });
    setUser(userData);
    socketManager.reconnectAll();
  };

  // BUG-11: Use window.location.replace instead of window.location.href for proper redirect
  const logout = () => {
    Cookies.remove('token');
    setUser(null);
    setUnreadCount(0);
    socketManager.disconnectAll();
    window.location.replace('/');
  };

  const clearUnread = () => setUnreadCount(0);

  return (
    <AuthContext.Provider value={{ user, loading, unreadCount, login, logout, clearUnread }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

