"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';
import { Users, Package, Activity, DollarSign, Shield, Ban, CheckCircle, XCircle, Search, ArrowRight } from 'lucide-react';
import Link from 'next/link';

type Tab = 'stats' | 'users' | 'auctions';

const StatCard = ({ icon: Icon, label, value, color }: any) => (
  <div className="card p-6 flex items-center gap-4 hover:shadow-lg hover:-translate-y-0.5 transition-all">
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-0.5">{value ?? 0}</p>
    </div>
  </div>
);

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('users');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [auctions, setAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || user.role !== 'admin') return;
      try {
        const [statsRes, usersRes, auctionsRes] = await Promise.all([
          api.get('/admin/stats'),
          api.get('/admin/users?limit=20'),
          api.get('/auctions?status=active&limit=10'),
        ]);
        setStats(statsRes.data);
        setUsers(usersRes.data.data);
        setAuctions(auctionsRes.data.data || []);
      } catch (err) {
        console.error('Failed to load admin data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const toggleUserStatus = async (userId: string) => {
    try {
      const res = await api.patch(`/admin/users/${userId}/toggle-status`);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: res.data.isActive } : u));
    } catch (e) {
      alert('Failed to toggle user status');
    }
  };

  const cancelAuction = async (auctionId: string) => {
    if (!confirm('Cancel this auction? This cannot be undone.')) return;
    try {
      await api.patch(`/admin/auctions/${auctionId}/cancel`);
      setAuctions(prev => prev.filter(a => a.id !== auctionId));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel auction');
    }
  };

  const filteredUsers = users.filter(u =>
    !userSearch || u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  if (authLoading || loading || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center items-center h-96">
          <div className="w-10 h-10 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'users', label: 'User Management' },
    { id: 'auctions', label: 'Manage Auctions' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-sm text-gray-500">Platform management & oversight</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Users}    label="Total Users"      value={stats?.totalUsers}    color="bg-blue-100 text-blue-600" />
          <StatCard icon={Package}  label="Total Auctions"   value={stats?.totalAuctions} color="bg-indigo-100 text-indigo-600" />
          <StatCard icon={Activity} label="Active Auctions"  value={stats?.activeAuctions}color="bg-green-100 text-green-600" />
          <StatCard icon={DollarSign} label="Sold Auctions"  value={stats?.soldAuctions}  color="bg-purple-100 text-purple-600" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-6 w-fit">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Users tab */}
        {tab === 'users' && (
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
              <h2 className="font-bold text-gray-900">Users ({filteredUsers.length})</h2>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="input-field pl-9 py-2 text-sm"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {['User', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img className="h-9 w-9 rounded-xl object-cover flex-shrink-0" src={u.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=6366f1&color=fff`} alt="" />
                          <div>
                            <Link href={`/profile/${u.id}`} className="text-sm font-semibold text-gray-900 hover:text-indigo-600 transition-colors">{u.name}</Link>
                            <p className="text-xs text-gray-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`badge ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'badge-gray'}`}>{u.role}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>
                          {u.isActive ? '● Active' : '○ Banned'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => toggleUserStatus(u.id)}
                            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${u.isActive ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-green-600 border-green-200 hover:bg-green-50'}`}
                          >
                            {u.isActive ? <><Ban className="w-3.5 h-3.5" /> Ban</> : <><CheckCircle className="w-3.5 h-3.5" /> Unban</>}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && (
                <div className="py-12 text-center text-sm text-gray-400">No users found.</div>
              )}
            </div>
          </div>
        )}

        {/* Auctions tab */}
        {tab === 'auctions' && (
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Active Auctions ({auctions.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {['Auction', 'Seller', 'Price', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {auctions.map(a => (
                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <Link href={`/auctions/${a.id}`} className="text-sm font-semibold text-gray-900 hover:text-indigo-600 line-clamp-1 flex items-center gap-1">
                          {a.title} <ArrowRight className="w-3 h-3 flex-shrink-0" />
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{a.creator?.name}</td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">${Number(a.currentPrice).toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`badge ${a.status === 'active' ? 'badge-success' : 'badge-gray'}`}>{a.status}</span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => cancelAuction(a.id)}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Cancel
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {auctions.length === 0 && (
                <div className="py-12 text-center text-sm text-gray-400">No active auctions.</div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
