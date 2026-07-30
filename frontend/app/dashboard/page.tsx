"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';
import { Activity, DollarSign, Package, ShoppingBag, ArrowRight, TrendingUp, PlusCircle, Star, Eye } from 'lucide-react';
import Link from 'next/link';

const StatCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color: string }) => (
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

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [myBids, setMyBids] = useState<any[]>([]);
  const [myAuctions, setMyAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const [statsRes, bidsRes, auctionsRes] = await Promise.all([
          api.get('/users/me/dashboard'),
          api.get('/bids/me?limit=5'),
          api.get('/auctions/mine?limit=4'),
        ]);
        setStats(statsRes.data);
        setMyBids(bidsRes.data.data || []);
        setMyAuctions(auctionsRes.data?.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (authLoading || !user || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center items-center h-96">
          <div className="w-10 h-10 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6366f1&color=fff&size=64`}
              alt={user.name}
              className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-md"
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user.name.split(' ')[0]}! 👋</h1>
              <p className="text-gray-500 text-sm mt-0.5">Here's what's happening with your account.</p>
            </div>
          </div>
          <Link href="/auctions/create" className="btn-primary text-sm">
            <PlusCircle className="w-4 h-4" /> New Listing
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <StatCard icon={Package}      label="Active Listings"  value={stats?.activeListings} color="bg-blue-100 text-blue-600" />
          <StatCard icon={Activity}     label="Active Bids"      value={stats?.activeBids}     color="bg-indigo-100 text-indigo-600" />
          <StatCard icon={DollarSign}   label="Items Sold"       value={stats?.soldListings}   color="bg-green-100 text-green-600" />
          <StatCard icon={ShoppingBag}  label="Auctions Won"     value={stats?.wonAuctions}    color="bg-purple-100 text-purple-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent bids */}
          <div className="lg:col-span-2 card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-500" /> Recent Bids
              </h2>
              <Link href="/dashboard/bids" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {myBids.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center text-gray-400">
                <Activity className="w-10 h-10 mb-3 text-gray-200" />
                <p className="text-sm">You haven't placed any bids yet.</p>
                <Link href="/" className="mt-3 text-sm text-indigo-600 font-medium hover:underline">Browse Auctions</Link>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {myBids.map(bid => (
                  <li key={bid.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0 mr-4">
                      <Link href={`/auctions/${bid.auction.id}`} className="font-medium text-gray-900 hover:text-indigo-600 transition-colors text-sm line-clamp-1">
                        {bid.auction.title}
                      </Link>
                      <p className="text-xs text-gray-400 mt-0.5">
                        ${Number(bid.amount).toFixed(2)} · {new Date(bid.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`badge ${
                        bid.auction.status === 'active'
                          ? 'badge-primary'
                          : bid.isWinningBid ? 'badge-success' : 'badge-danger'
                      }`}>
                        {bid.auction.status === 'active' ? 'Active' : bid.isWinningBid ? 'Won ✓' : 'Lost'}
                      </span>
                      <Link href={`/auctions/${bid.auction.id}`} className="text-gray-300 hover:text-indigo-500 transition-colors">
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Seller rating + profile card */}
          <div className="space-y-5">
            <div className="card p-5">
              <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                <Star className="w-4 h-4 text-yellow-500" /> Seller Profile
              </h2>
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6366f1&color=fff`}
                  className="w-12 h-12 rounded-xl object-cover"
                  alt={user.name}
                />
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{user.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i <= Math.round(Number(stats?.sellerRating || 0)) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`} />
                    ))}
                    <span className="text-xs text-gray-400 ml-1">({stats?.totalRatingsCount || 0})</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total sales</span>
                  <span className="font-medium text-gray-900">{stats?.totalSales || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total purchases</span>
                  <span className="font-medium text-gray-900">{stats?.totalPurchases || 0}</span>
                </div>
              </div>
              <Link href={`/profile/${user.id}`} className="mt-4 btn-secondary w-full text-sm justify-center">
                View Public Profile
              </Link>
            </div>

            <div className="card p-5">
              <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
                <Package className="w-4 h-4 text-blue-500" /> Quick Actions
              </h2>
              <div className="space-y-2">
                <Link href="/auctions/create" className="flex items-center gap-2 text-sm text-gray-700 hover:text-indigo-600 py-2 px-3 rounded-lg hover:bg-indigo-50 transition-colors">
                  <PlusCircle className="w-4 h-4" /> Create new auction
                </Link>
                <Link href="/" className="flex items-center gap-2 text-sm text-gray-700 hover:text-indigo-600 py-2 px-3 rounded-lg hover:bg-indigo-50 transition-colors">
                  <Eye className="w-4 h-4" /> Browse auctions
                </Link>
                <Link href="/notifications" className="flex items-center gap-2 text-sm text-gray-700 hover:text-indigo-600 py-2 px-3 rounded-lg hover:bg-indigo-50 transition-colors">
                  <Activity className="w-4 h-4" /> View notifications
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
