'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';

// ─── Types ────────────────────────────────────────────────
interface BidUser {
  id:   string;
  name: string;
}

interface Bid {
  id:        string;
  amount:    number;
  bidder:    BidUser;
  createdAt: string;
}

interface Auction {
  id:            string;
  title:         string;
  description:   string;
  currentPrice:  number;
  startingPrice: number;
  status:        string;
  endTime:       string;
  winnerId?:     string;
  bids:          Bid[];
  creator?:      BidUser;
}

interface ToastState {
  message: string;
  type:    'success' | 'error' | 'info';
}

// Dummy user for demonstration (no auth in this build)
const DUMMY_BIDDER_ID   = '00000000-0000-0000-0000-000000000002';
const DUMMY_BIDDER_NAME = 'Test User 2 (Bidder)';

// ─── Sub-components ───────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'active' ? 'badge badge-active' :
    status === 'sold'   ? 'badge badge-sold'   :
                          'badge badge-cancelled';
  const label =
    status === 'active' ? '🟢 Live' :
    status === 'sold'   ? '🔵 Sold' : '🔴 Ended';
  return <span className={cls}>{label}</span>;
}

function CountdownTimer({ endTime, status }: { endTime: string; status: string }) {
  const [ms, setMs] = useState(() => Math.max(0, new Date(endTime).getTime() - Date.now()));

  useEffect(() => {
    if (status !== 'active') return;
    const t = setInterval(() => setMs(Math.max(0, new Date(endTime).getTime() - Date.now())), 500);
    return () => clearInterval(t);
  }, [endTime, status]);

  if (status !== 'active') return null;

  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  const urgent = ms < 60_000 && ms > 0;
  const finished = ms === 0;

  return (
    <div className={`timer text-2xl font-bold ${urgent ? 'timer-urgent' : 'text-white'}`}>
      {finished ? (
        <span className="text-gray-400 text-lg">Closing…</span>
      ) : h > 0 ? (
        `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
      ) : (
        `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
      )}
    </div>
  );
}

function BidRow({ bid, rank, isOwn }: { bid: Bid; rank: number; isOwn: boolean }) {
  const date = new Date(bid.createdAt);
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return (
    <div className={`bid-row ${rank === 1 ? 'bid-top' : ''} animate-fade-in`}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
             style={{
               background: rank === 1
                 ? 'linear-gradient(135deg, #fab005, #fcc419)'
                 : 'rgba(255,255,255,0.08)',
               color: rank === 1 ? '#1a1800' : '#adb5bd',
             }}>
          #{rank}
        </div>
        <div>
          <div className="text-sm font-semibold text-white">
            {isOwn ? '⭐ You' : (bid.bidder?.name ?? 'Anonymous')}
          </div>
          <div className="text-xs text-gray-500">{timeStr}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="price-display text-lg">${Number(bid.amount).toFixed(2)}</div>
      </div>
    </div>
  );
}

function Toast({ toast }: { toast: ToastState }) {
  const cls =
    toast.type === 'success' ? 'toast toast-success' :
    toast.type === 'error'   ? 'toast toast-error'   :
                               'toast toast-info';
  const icon =
    toast.type === 'success' ? '✅' :
    toast.type === 'error'   ? '❌' : 'ℹ️';
  return <div className={cls}>{icon} {toast.message}</div>;
}

// ─── Main Component ───────────────────────────────────────
export default function AuctionDetailPage() {
  const params               = useParams();
  const id                   = params.id as string;
  const socketRef            = useRef<Socket | null>(null);

  const [auction,   setAuction]   = useState<Auction | null>(null);
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [loading,   setLoading]   = useState(true);
  const [bidding,   setBidding]   = useState(false);
  const [error,     setError]     = useState('');
  const [toast,     setToast]     = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, type: ToastState['type']) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Fetch auction data
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`http://localhost:3001/auctions/${id}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: Auction) => {
        setAuction(data);
        setBidAmount(Number(data.currentPrice) + 10);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  // Socket.IO
  useEffect(() => {
    if (!id) return;

    const socket = io('http://localhost:3001', { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('joinAuction', id);
    });

    socket.on('bidPlaced', (updatedAuction: Auction) => {
      setAuction(updatedAuction);
      const newPrice = Number(updatedAuction.currentPrice);
      setBidAmount(newPrice + 10);
      setBidding(false);

      // Sort bids descending by amount to find top bidder
      const sorted   = [...(updatedAuction.bids ?? [])].sort((a, b) => Number(b.amount) - Number(a.amount));
      const topBidder = sorted[0]?.bidder?.id;
      if (topBidder === DUMMY_BIDDER_ID) {
        showToast('Your bid is now the highest! 🎉', 'success');
      } else {
        showToast(`A new highest bid of $${newPrice.toFixed(2)} was placed!`, 'info');
      }
    });

    socket.on('auctionEnded', (endedAuction: Auction) => {
      setAuction(endedAuction);
      setBidding(false);
      const won = endedAuction.winnerId === DUMMY_BIDDER_ID;
      showToast(won ? '🏆 You won this auction!' : 'This auction has ended.', won ? 'success' : 'info');
    });

    socket.on('bidError', (data: { message: string }) => {
      setError(data.message);
      setBidding(false);
      showToast(data.message, 'error');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [id, showToast]);

  const handleBid = () => {
    if (!auction || bidding) return;
    const min = Number(auction.currentPrice) + 0.01;
    if (bidAmount < min) {
      setError(`Bid must be greater than $${Number(auction.currentPrice).toFixed(2)}`);
      return;
    }
    setError('');
    setBidding(true);
    socketRef.current?.emit('placeBid', {
      auctionId: id,
      bidderId:  DUMMY_BIDDER_ID,
      amount:    bidAmount,
    });
  };

  // ─── Loading state ──────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10 animate-fade-in">
        <div className="skeleton h-8 w-32 mb-8 rounded-lg" />
        <div className="glass-card p-8">
          <div className="skeleton h-9 w-2/3 mb-4" />
          <div className="skeleton h-4 w-full mb-2" />
          <div className="skeleton h-4 w-4/5 mb-8" />
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[0,1,2].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}
          </div>
          <div className="skeleton h-14 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // ─── Error state ────────────────────────────────────────
  if (error && !auction) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10 text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-white mb-2">Failed to load auction</h1>
        <p className="text-gray-400 mb-6">{error}</p>
        <Link href="/" className="btn-primary">← Back to Auctions</Link>
      </div>
    );
  }

  if (!auction) return null;

  const sortedBids = [...(auction.bids ?? [])].sort((a, b) => Number(b.amount) - Number(a.amount));
  const winner     = auction.winnerId
    ? auction.bids.find(b => b.bidder?.id === auction.winnerId)?.bidder?.name ?? 'Unknown'
    : null;
  const isEnded    = auction.status !== 'active';
  const currentMin = Number(auction.currentPrice) + 0.01;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 animate-fade-in">

      {/* Back link */}
      <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 text-sm font-medium">
        ← Back to Auctions
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left: Auction info */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="glass-card p-8">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="text-3xl font-extrabold text-white leading-tight" style={{ letterSpacing: '-0.5px' }}>
                {auction.title}
              </h1>
              <StatusBadge status={auction.status} />
            </div>

            {auction.creator && (
              <p className="text-sm text-gray-500 mb-4">Listed by <span className="text-gray-300">{auction.creator.name}</span></p>
            )}

            <p className="text-gray-300 leading-relaxed mb-6">{auction.description}</p>

            <hr className="divider" />

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="stat-box">
                <div className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Starting Price</div>
                <div className="font-mono font-bold text-gray-300 text-lg">${Number(auction.startingPrice).toFixed(2)}</div>
              </div>
              <div className="stat-box">
                <div className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Current Price</div>
                <div className="price-display text-xl">${Number(auction.currentPrice).toFixed(2)}</div>
              </div>
              <div className="stat-box">
                <div className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Total Bids</div>
                <div className="text-xl font-bold text-white">{auction.bids?.length ?? 0}</div>
              </div>
            </div>

            {/* Winner announcement */}
            {auction.status === 'sold' && winner && (
              <div className="mt-6 p-5 rounded-xl flex items-center gap-4"
                   style={{ background: 'rgba(250,176,5,0.1)', border: '1px solid rgba(250,176,5,0.3)' }}>
                <span className="text-4xl">🏆</span>
                <div>
                  <div className="font-bold text-yellow-400 text-lg">Auction Won!</div>
                  <div className="text-gray-300 text-sm">Winner: <strong>{winner}</strong></div>
                  <div className="text-gray-400 text-sm">
                    Final Price: <strong className="price-display">${Number(auction.currentPrice).toFixed(2)}</strong>
                  </div>
                </div>
              </div>
            )}

            {auction.status !== 'active' && !winner && (
              <div className="mt-6 p-5 rounded-xl text-center text-gray-400"
                   style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                This auction ended with no bids.
              </div>
            )}
          </div>
        </div>

        {/* Right: Bidding panel */}
        <div className="flex flex-col gap-6">
          {/* Timer */}
          <div className="glass-card p-6 text-center">
            <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">Time Remaining</div>
            <CountdownTimer endTime={auction.endTime} status={auction.status} />
            {auction.status !== 'active' && (
              <div className="text-gray-400 font-medium">Auction Ended</div>
            )}
            <div className="text-xs text-gray-600 mt-2">
              {new Date(auction.endTime).toLocaleString()}
            </div>
          </div>

          {/* Bid input */}
          {!isEnded && (
            <div className="glass-card p-6">
              <div className="text-xs text-gray-500 uppercase tracking-widest mb-4">Place Your Bid</div>

              <div className="relative mb-4">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">$</span>
                <input
                  type="number"
                  value={bidAmount}
                  min={currentMin}
                  step={0.01}
                  onChange={e => { setBidAmount(Number(e.target.value)); setError(''); }}
                  className="input-field pl-9 text-xl font-bold font-mono"
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg text-sm text-red-400 flex items-center gap-2"
                     style={{ background: 'rgba(250,82,82,0.1)', border: '1px solid rgba(250,82,82,0.25)' }}>
                  ⚠️ {error}
                </div>
              )}

              <button
                onClick={handleBid}
                disabled={bidding || bidAmount < currentMin}
                className="btn-bid w-full"
              >
                {bidding ? (
                  <>
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                    Placing Bid…
                  </>
                ) : (
                  <>🔨 Place Bid</>
                )}
              </button>

              <p className="text-xs text-gray-500 text-center mt-3">
                Min bid: <span className="text-gray-300 font-mono">${currentMin.toFixed(2)}</span>
              </p>

              <div className="mt-4 p-3 rounded-lg text-xs text-gray-500"
                   style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                Bidding as: <span className="text-gray-300">{DUMMY_BIDDER_NAME}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bid History */}
      {sortedBids.length > 0 && (
        <div className="glass-card p-8 mt-8">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            🔨 Bid History
            <span className="ml-auto text-sm font-normal text-gray-500">{sortedBids.length} bids</span>
          </h2>
          <div className="flex flex-col gap-3">
            {sortedBids.map((bid, i) => (
              <BidRow
                key={bid.id}
                bid={bid}
                rank={i + 1}
                isOwn={bid.bidder?.id === DUMMY_BIDDER_ID}
              />
            ))}
          </div>
        </div>
      )}

      {!sortedBids.length && !isEnded && (
        <div className="glass-card p-8 mt-8 text-center">
          <div className="text-4xl mb-3">🔇</div>
          <p className="text-gray-400">No bids yet — be the first to bid!</p>
        </div>
      )}

      {/* Toast */}
      {toast && <Toast toast={toast} />}
    </div>
  );
}
