"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { Bell, CheckCheck, Gavel, Trophy, Zap, Info, ArrowRight, BellOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  outbid:        { icon: Zap,       color: 'text-amber-600', bg: 'bg-amber-100' },
  auction_won:   { icon: Trophy,    color: 'text-green-600', bg: 'bg-green-100' },
  auction_lost:  { icon: Gavel,     color: 'text-red-500',   bg: 'bg-red-100'   },
  auction_ending:{ icon: Bell,      color: 'text-indigo-600',bg: 'bg-indigo-100'},
  new_bid:       { icon: Gavel,     color: 'text-blue-600',  bg: 'bg-blue-100'  },
  payment_status:{ icon: Info,      color: 'text-gray-600',  bg: 'bg-gray-100'  },
};

export default function NotificationsPage() {
  const { user, loading: authLoading, clearUnread } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      try {
        const res = await api.get('/notifications');
        setNotifications(Array.isArray(res.data) ? res.data : []);
        clearUnread();
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [user]);

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      clearUnread();
    } catch (e) {}
  };

  const markOneRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (e) {}
  };

  const filtered = filter === 'unread' ? notifications.filter(n => !n.isRead) : notifications;
  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Bell className="w-6 h-6 text-indigo-600" />
              Notifications
              {unreadCount > 0 && (
                <span className="badge badge-primary ml-1">{unreadCount} new</span>
              )}
            </h1>
            <p className="text-sm text-gray-500 mt-1">Stay updated on your auctions and bids</p>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="btn-secondary text-sm py-2 flex items-center gap-1.5">
              <CheckCheck className="w-4 h-4" /> Mark all read
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-6 w-fit">
          {(['all', 'unread'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {f === 'all' ? `All (${notifications.length})` : `Unread (${unreadCount})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="card p-4 flex gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-full skeleton flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-3/4 rounded" />
                  <div className="skeleton h-3 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
              <BellOff className="w-8 h-8 text-indigo-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
            </h3>
            <p className="text-sm text-gray-500 max-w-xs">
              {filter === 'unread'
                ? 'You have no unread notifications.'
                : 'Notifications about your bids, auctions, and activity will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(notif => {
              const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.payment_status;
              const Icon = config.icon;
              return (
                <div
                  key={notif.id}
                  className={`card p-4 flex items-start gap-3 transition-all hover:shadow-md cursor-pointer group ${!notif.isRead ? 'border-l-4 border-indigo-400' : ''}`}
                  onClick={() => {
                    if (!notif.isRead) markOneRead(notif.id);
                    if (notif.relatedAuctionId) router.push(`/auctions/${notif.relatedAuctionId}`);
                  }}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${notif.isRead ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                      {notif.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    {!notif.isRead && (
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 flex-shrink-0" />
                    )}
                    {notif.relatedAuctionId && (
                      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
