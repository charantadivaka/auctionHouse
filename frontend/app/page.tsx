'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Auction {
  id: string;
  title: string;
  description: string;
  currentPrice: number;
  startingPrice: number;
  status: string;
  endTime: string;
  bids: { id: string }[];
  creator?: { name: string };
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'active'    ? 'badge badge-active' :
    status === 'sold'      ? 'badge badge-sold' :
                             'badge badge-cancelled';
  const dot =
    status === 'active'    ? '🟢' :
    status === 'sold'      ? '🔵' : '🔴';
  return <span className={cls}>{dot} {status}</span>;
}

function TimeLeftBadge({ endTime, status }: { endTime: string; status: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (status !== 'active') return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [status]);

  if (status !== 'active') return null;
  const ms = Math.max(0, new Date(endTime).getTime() - now);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  const urgent = ms < 60_000;
  return (
    <span className={`timer text-xs ${urgent ? 'timer-urgent' : 'text-gray-400'}`}>
      ⏱ {h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="glass-card p-6 animate-pulse">
      <div className="skeleton h-5 w-3/4 mb-3" />
      <div className="skeleton h-4 w-full mb-1" />
      <div className="skeleton h-4 w-5/6 mb-6" />
      <div className="flex justify-between items-center">
        <div className="skeleton h-7 w-24" />
        <div className="skeleton h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-24 text-center">
      <div className="text-6xl mb-6">🏛️</div>
      <h2 className="text-2xl font-bold text-white mb-2">No auctions yet</h2>
      <p className="text-gray-400 mb-8 max-w-sm">
        Be the first to list an item. Create an auction and start receiving bids instantly.
      </p>
      <Link href="/auctions/create" className="btn-primary">
        + Create First Auction
      </Link>
    </div>
  );
}

export default function Home() {
  const [auctions, setAuctions]     = useState<Auction[]>([]);
  const [loading,  setLoading]      = useState(true);
  const [error,    setError]        = useState('');
  const [filter,   setFilter]       = useState<'all' | 'active' | 'sold'>('all');

  useEffect(() => {
    setLoading(true);
    fetch('http://localhost:3001/auctions')
      .then(res => {
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        return res.json();
      })
      .then(data => { setAuctions(data); setLoading(false); })
      .catch(err => { setError(err.message || 'Failed to load auctions'); setLoading(false); });
  }, []);

  const filtered = filter === 'all' ? auctions : auctions.filter(a => a.status === filter);
  const activeCount   = auctions.filter(a => a.status === 'active').length;
  const soldCount     = auctions.filter(a => a.status === 'sold').length;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 animate-fade-in">

      {/* Hero */}
      <div className="text-center mb-14">
        <h1 className="text-5xl font-extrabold mb-4" style={{ letterSpacing: '-1px' }}>
          <span className="gradient-text">Live Auctions</span>
        </h1>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">
          Discover unique items, place bids in real-time, and win exclusive goods — all in one place.
        </p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <div className="stat-box">
          <div className="text-3xl font-bold text-white mb-1">{auctions.length}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">Total Auctions</div>
        </div>
        <div className="stat-box">
          <div className="text-3xl font-bold mb-1" style={{ color: '#69db7c' }}>{activeCount}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">Live Now</div>
        </div>
        <div className="stat-box">
          <div className="text-3xl font-bold mb-1" style={{ color: '#91a7ff' }}>{soldCount}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">Sold</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-8">
        {(['all', 'active', 'sold'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              filter === f
                ? 'text-white'
                : 'text-gray-400 hover:text-white'
            }`}
            style={filter === f
              ? { background: 'linear-gradient(135deg, #4c6ef5, #5c7cfa)', boxShadow: '0 4px 12px rgba(92,124,250,0.35)' }
              : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }
            }
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'all' && <span className="ml-2 opacity-70">{f === 'active' ? activeCount : soldCount}</span>}
          </button>
        ))}
        <span className="ml-auto text-sm text-gray-500">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Error */}
      {error && (
        <div className="glass-card p-5 mb-8 flex items-center gap-4" style={{ borderColor: 'rgba(250,82,82,0.3)' }}>
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-semibold text-red-400">Could not load auctions</p>
            <p className="text-sm text-gray-400">{error} — Is the backend running on port 3001?</p>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : filtered.length === 0
            ? <EmptyState />
            : filtered.map(auction => (
                <Link
                  key={auction.id}
                  href={`/auctions/${auction.id}`}
                  className="auction-card p-6 flex flex-col gap-4"
                >
                  {/* Top row */}
                  <div className="flex justify-between items-start gap-2">
                    <h2 className="text-lg font-bold text-white leading-snug flex-1">{auction.title}</h2>
                    <StatusBadge status={auction.status} />
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">{auction.description}</p>

                  <hr className="divider" style={{ margin: '4px 0' }} />

                  {/* Price + bids */}
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Current Price</div>
                      <div className="price-display text-2xl">
                        ${Number(auction.currentPrice).toFixed(2)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500 mb-1">Bids</div>
                      <div className="text-lg font-bold text-white">{auction.bids?.length ?? 0}</div>
                    </div>
                  </div>

                  {/* Timer */}
                  <div className="flex justify-between items-center">
                    {auction.creator && (
                      <span className="text-xs text-gray-500">by {auction.creator.name}</span>
                    )}
                    <TimeLeftBadge endTime={auction.endTime} status={auction.status} />
                  </div>
                </Link>
              ))
        }
      </div>
    </div>
  );
}
