"use client";

import { Suspense, useState, useEffect } from 'react';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { Clock, Tag, ArrowRight, Search, SlidersHorizontal, TrendingUp, Zap, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useSearchParams, useRouter } from 'next/navigation';

const CONDITIONS: Record<string, string> = {
  new: 'New', like_new: 'Like New', good: 'Good', fair: 'Fair', poor: 'Poor',
};

function AuctionCard({ auction }: { auction: any }) {
  const timeLeft = auction.endTime ? formatDistanceToNow(new Date(auction.endTime), { addSuffix: true }) : '';
  const isEndingSoon = auction.endTime && (new Date(auction.endTime).getTime() - Date.now()) < 3600000;

  return (
    <div className="card group hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 overflow-hidden flex flex-col">
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        {auction.images?.length > 0 ? (
          <img
            src={auction.images[0]}
            alt={auction.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Tag className="w-10 h-10 text-gray-300" />
          </div>
        )}

        {/* Status badges */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          {auction.status === 'active' && (
            <span className="flex items-center gap-1 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-semibold text-gray-700 shadow-sm">
              <Clock className="w-3 h-3 text-indigo-500" />
              {timeLeft}
            </span>
          )}
          {isEndingSoon && auction.status === 'active' && (
            <span className="flex items-center gap-1 bg-red-500 px-2 py-1 rounded-full text-xs font-bold text-white shadow-sm">
              <Zap className="w-3 h-3" /> Hot
            </span>
          )}
          {auction.status === 'pending' && (
            <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-xs font-semibold border border-amber-200">
              Starting soon
            </span>
          )}
        </div>

        {auction.auctionType === 'manual' && (
          <span className="absolute top-3 right-3 bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-semibold border border-purple-200">
            Manual
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col flex-grow">
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          <span className="badge badge-primary">
            {auction.category?.name || 'Uncategorized'}
          </span>
          {auction.condition && (
            <span className="badge badge-gray">
              {CONDITIONS[auction.condition] || auction.condition}
            </span>
          )}
        </div>

        <h3 className="font-semibold text-gray-900 text-base mb-1 line-clamp-1 group-hover:text-indigo-600 transition-colors">
          {auction.title}
        </h3>

        {auction.creator && (
          <p className="text-xs text-gray-400 mb-3">by {auction.creator.name}</p>
        )}

        <div className="mt-auto flex items-end justify-between pt-3 border-t border-gray-100">
          <div>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-0.5">Current Bid</p>
            <p className="font-bold text-xl text-gray-900">
              ${Number(auction.currentPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <Link
            href={`/auctions/${auction.id}`}
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors"
          >
            Bid Now <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {auction.viewCount > 0 && (
          <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
            <Eye className="w-3 h-3" /> {auction.viewCount} views
          </div>
        )}
      </div>
    </div>
  );
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'ending_soon', label: 'Ending Soon' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'most_viewed', label: 'Most Viewed' },
];

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const search = searchParams.get('search') || '';

  const [auctions, setAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState('newest');
  const [auctionType, setAuctionType] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchAuctions = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        sort,
        status: 'active',
      });
      if (search) queryParams.append('search', search);
      if (auctionType) queryParams.append('auctionType', auctionType);

      const res = await api.get(`/auctions?${queryParams.toString()}`);
      setAuctions(Array.isArray(res.data?.data) ? res.data.data : []);
      setTotalPages(res.data?.totalPages || 1);
      setTotal(res.data?.total || 0);
    } catch (error) {
      console.error('Error fetching auctions', error);
      setAuctions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setPage(1); }, [search, sort, auctionType]);
  useEffect(() => { fetchAuctions(); }, [page, search, sort, auctionType]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero */}
      {!search && (
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-white/20 blur-3xl" />
            <div className="absolute bottom-10 right-10 w-80 h-80 rounded-full bg-purple-400/30 blur-3xl" />
          </div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
              <TrendingUp className="w-4 h-4" /> Live Bidding • Real-Time Updates
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 leading-tight">
              Discover. Bid. Win.
            </h1>
            <p className="text-lg text-indigo-100 max-w-xl mx-auto mb-8">
              Premium auction marketplace for unique finds. Place bids in real-time and never miss a deal.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/auctions/create" className="inline-flex items-center justify-center gap-2 bg-white text-indigo-700 font-bold px-6 py-3 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
                <Zap className="w-4 h-4" /> Start Selling
              </Link>
              <button
                onClick={() => document.getElementById('auctions-grid')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm border border-white/30 text-white font-semibold px-6 py-3 rounded-full hover:bg-white/20 transition-all"
              >
                Browse Auctions
              </button>
            </div>
          </div>
        </div>
      )}

      <main id="auctions-grid" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {search ? `Results for "${search}"` : 'Live Auctions'}
            </h2>
            {!loading && (
              <p className="text-sm text-gray-500 mt-1">{total} auction{total !== 1 ? 's' : ''} found</p>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Auction type pills */}
            <div className="flex items-center gap-1.5">
              {['', 'timed', 'manual'].map(type => (
                <button
                  key={type}
                  onClick={() => setAuctionType(type)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    auctionType === type
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'
                  }`}
                >
                  {type === '' ? 'All' : type === 'timed' ? 'Timed' : 'Manual'}
                </button>
              ))}
            </div>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="input-field w-auto py-1.5 px-3 text-sm bg-white border border-gray-200 rounded-full"
              suppressHydrationWarning
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card overflow-hidden animate-pulse">
                <div className="aspect-[4/3] skeleton" />
                <div className="p-4 space-y-3">
                  <div className="skeleton h-3 w-20 rounded-full" />
                  <div className="skeleton h-4 w-3/4 rounded" />
                  <div className="skeleton h-6 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : auctions.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-10 h-10 text-indigo-300" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Auctions Found</h3>
            <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">
              {search ? `No results for "${search}". Try a different search term.` : 'No active auctions right now. Be the first to list one!'}
            </p>
            <Link href="/auctions/create" className="btn-primary">
              + Create Auction
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {auctions.map(auction => (
                <AuctionCard key={auction.id} auction={auction} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-12 flex justify-center items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary py-2 px-4 disabled:opacity-40"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const p = page <= 3 ? i + 1 : page - 2 + i;
                    if (p > totalPages) return null;
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                          p === page
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white border border-gray-200 text-gray-700 hover:border-indigo-300'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-secondary py-2 px-4 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-grow flex justify-center items-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
            <p className="text-sm text-gray-500">Loading auctions...</p>
          </div>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
