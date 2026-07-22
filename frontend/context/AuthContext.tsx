"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
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
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const token = Cookies.get('token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data);
          // Initialize sockets with the new token
          socketManager.reconnectAll();
        } catch (error) {
          Cookies.remove('token');
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  const login = (token: string, userData: User) => {
    Cookies.set('token', token, { expires: 7 }); // 7 days
    setUser(userData);
    socketManager.reconnectAll();
  };

  const logout = () => {
    Cookies.remove('token');
    setUser(null);
    socketManager.disconnectAll();
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
