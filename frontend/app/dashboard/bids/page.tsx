"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { Activity, ArrowLeft, ArrowRight, Gavel, ExternalLink } from 'lucide-react';

export default function MyBidsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchBids = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const res = await api.get(`/bids/me?page=${page}&limit=15`);
        setBids(res.data.data || []);
        setTotalPages(res.data.totalPages || 1);
        setTotal(res.data.total || 0);
      } catch (err) {
        console.error('Failed to load bids', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBids();
  }, [user, page]);

  if (authLoading || !user) {
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
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Gavel className="w-6 h-6 text-indigo-600" />
                My Bids History
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                All bids you have placed across live and ended auctions ({total} total)
              </p>
            </div>
            <Link href="/" className="btn-secondary text-sm">
              Browse Auctions
            </Link>
          </div>
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-8 h-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
            </div>
          ) : bids.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center text-gray-400">
              <Activity className="w-12 h-12 mb-3 text-gray-200" />
              <p className="text-base font-medium text-gray-700">No bids placed yet</p>
              <p className="text-sm text-gray-400 mt-1">Explore auctions to place your first bid</p>
              <Link href="/" className="mt-4 btn-primary text-sm">
                Explore Live Auctions
              </Link>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-gray-100">
                {bids.map((bid) => (
                  <li key={bid.id} className="p-5 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/auctions/${bid.auction?.id}`}
                        className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors text-base line-clamp-1"
                      >
                        {bid.auction?.title || 'Auction'}
                      </Link>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                        <span>Bid Amount: <strong className="text-gray-800 font-semibold">${Number(bid.amount).toFixed(2)}</strong></span>
                        <span>•</span>
                        <span>Placed: {new Date(bid.createdAt).toLocaleDateString()} {new Date(bid.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span
                        className={`badge ${
                          bid.auction?.status === 'active'
                            ? 'badge-primary'
                            : bid.isWinningBid
                            ? 'badge-success'
                            : 'badge-danger'
                        }`}
                      >
                        {bid.auction?.status === 'active' ? 'Active' : bid.isWinningBid ? 'Won ✓' : 'Lost'}
                      </span>
                      {bid.auction?.id && (
                        <Link
                          href={`/auctions/${bid.auction.id}`}
                          className="p-2 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-gray-100 transition-colors"
                          title="View Auction"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-gray-500 font-medium">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
