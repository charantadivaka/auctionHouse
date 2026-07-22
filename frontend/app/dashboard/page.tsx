"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';
import { Activity, DollarSign, Package, ShoppingBag, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [myBids, setMyBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const [statsRes, bidsRes] = await Promise.all([
          api.get('/users/me/dashboard'),
          api.get('/bids/me?limit=5')
        ]);
        setStats(statsRes.data);
        setMyBids(bidsRes.data.data);
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
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-grow flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome, {user.name}</h1>
            <p className="text-gray-500 mt-1">Here's an overview of your activity on AuctionHouse.</p>
          </div>
          <Link href="/auctions/create" className="bg-indigo-600 text-white px-5 py-2 rounded-lg shadow-sm hover:bg-indigo-700 font-medium transition-colors">
            Sell an Item
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Active Listings</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeListings}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center">
            <div className="p-3 rounded-full bg-indigo-100 text-indigo-600 mr-4">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Active Bids</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeBids}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Items Sold</p>
              <p className="text-2xl font-bold text-gray-900">{stats.soldListings}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-4">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Auctions Won</p>
              <p className="text-2xl font-bold text-gray-900">{stats.wonAuctions}</p>
            </div>
          </div>
        </div>

        {/* Recent Bids */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
          <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
            <h2 className="font-bold text-gray-900">Recent Bids</h2>
          </div>
          {myBids.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              You haven't placed any bids yet.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {myBids.map((bid) => (
                <li key={bid.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <Link href={`/auctions/${bid.auction.id}`} className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors">
                        {bid.auction.title}
                      </Link>
                      <p className="text-sm text-gray-500 mt-1">
                        You bid ${Number(bid.amount).toFixed(2)} on {new Date(bid.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        bid.auction.status === 'active' ? 'bg-blue-100 text-blue-800' :
                        bid.isWinningBid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {bid.auction.status === 'active' ? 'Active' : bid.isWinningBid ? 'Won' : 'Lost'}
                      </span>
                      <Link href={`/auctions/${bid.auction.id}`} className="text-gray-400 hover:text-indigo-600">
                        <ArrowRight className="w-5 h-5" />
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

      </main>
    </div>
  );
}
