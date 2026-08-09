"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { socketManager } from '@/lib/socket';
import Navbar from '@/components/Navbar';
import { formatDistanceToNow } from 'date-fns';
import {
  Clock, ArrowLeft, Heart, ShieldCheck, MapPin, Package,
  Star, Edit2, Trash2, StopCircle, Send, Video, ChevronLeft, ChevronRight, MessageCircle, X, CreditCard, CheckCircle2, Trophy
} from 'lucide-react';
import Link from 'next/link';

function CountdownTimer({ endTime }: { endTime: string }) {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    const update = () => {
      const distance = new Date(endTime).getTime() - Date.now();
      if (distance <= 0) { setTimeLeft('Ended'); return; }
      const d = Math.floor(distance / 86400000);
      const h = Math.floor((distance % 86400000) / 3600000);
      const m = Math.floor((distance % 3600000) / 60000);
      const s = Math.floor((distance % 60000) / 1000);
      setTimeLeft(d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [endTime]);
  return <span>{timeLeft}</span>;
}

function ChatPanel({ auctionId, user }: { auctionId: string; user: any }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<any>(null);

  useEffect(() => {
    let chatSocket: any;
    try {
      chatSocket = socketManager.instance.getChatSocket?.();
    } catch {}
    if (!chatSocket) return;

    chatSocket.emit('joinChatRoom', auctionId);
    chatSocket.on('chatHistory', (msgs: any[]) => setMessages(msgs));
    chatSocket.on('newMessage', (msg: any) => setMessages(p => [...p, msg]));
    chatSocket.on('userTyping', ({ userName, isTyping }: any) => {
      if (isTyping) {
        setIsTyping(userName);
      } else {
        setIsTyping(null);
      }
    });

    return () => {
      chatSocket.emit('leaveChatRoom', auctionId);
      chatSocket.off('chatHistory');
      chatSocket.off('newMessage');
      chatSocket.off('userTyping');
    };
  }, [auctionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;
    let chatSocket: any;
    try { chatSocket = socketManager.instance.getChatSocket?.(); } catch {}
    if (!chatSocket) return;
    chatSocket.emit('sendMessage', { auctionId, content: input.trim() });
    setInput('');
  };

  const handleTyping = () => {
    let chatSocket: any;
    try { chatSocket = socketManager.instance.getChatSocket?.(); } catch {}
    if (!chatSocket) return;
    chatSocket.emit('typing', { auctionId, isTyping: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      chatSocket.emit('typing', { auctionId, isTyping: false });
    }, 1500);
  };

  return (
    <div className="flex flex-col h-80">
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <div className="text-center text-xs text-gray-400 mt-8">No messages yet. Start the conversation!</div>
        )}
        {messages.map(msg => {
          const isOwn = user && msg.sender?.id === user.id;
          return (
            <div key={msg.id || Math.random()} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
              <img
                src={msg.sender?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender?.name || 'U')}&size=32&background=6366f1&color=fff`}
                className="w-6 h-6 rounded-full object-cover flex-shrink-0 mt-0.5"
                alt={msg.sender?.name}
              />
              <div className={`max-w-[75%] ${isOwn ? 'items-end' : ''} flex flex-col`}>
                {!isOwn && <p className="text-[10px] text-gray-400 mb-0.5 ml-1">{msg.sender?.name}</p>}
                <div className={`px-3 py-2 rounded-2xl text-sm ${isOwn ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-900 rounded-tl-sm'}`}>
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}
        {isTyping && (
          <p className="text-xs text-gray-400 italic px-1">{isTyping} is typing...</p>
        )}
        <div ref={bottomRef} />
      </div>
      {user ? (
        <form onSubmit={sendMessage} className="flex gap-2 p-2 border-t border-gray-100">
          <input
            value={input}
            onChange={e => { setInput(e.target.value); handleTyping(); }}
            placeholder="Type a message..."
            className="input-field flex-1 py-2 text-sm"
          />
          <button type="submit" disabled={!input.trim()} className="btn-primary px-3 py-2 disabled:opacity-50">
            <Send className="w-4 h-4" />
          </button>
        </form>
      ) : (
        <div className="p-3 border-t border-gray-100 text-center text-sm text-gray-500">
          <Link href="/login" className="text-indigo-600 font-medium hover:underline">Log in</Link> to chat
        </div>
      )}
    </div>
  );
}

export default function AuctionDetails() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { user } = useAuth();

  const [auction, setAuction] = useState<any>(null);
  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState('');
  const [bidLoading, setBidLoading] = useState(false);
  const [error, setError] = useState('');
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [endingAuction, setEndingAuction] = useState(false);
  const [deletingAuction, setDeletingAuction] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [auctionRes, bidsRes] = await Promise.all([
          api.get(`/auctions/${id}`),
          api.get(`/bids/auction/${id}`)
        ]);
        setAuction(auctionRes.data);
        setBids(bidsRes.data.data || []);
        if (user) {
          api.get(`/watchlist/check/${id}`).then(r => setIsWatchlisted(r.data.isWatchlisted)).catch(() => {});
        }
      } catch (err) {
        console.error('Failed to load auction', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id, user]);

  useEffect(() => {
    if (!id) return;
    const socket = socketManager.getAuctionsSocket();
    socket.emit('joinAuction', id);

    const onBid = (a: any) => { setAuction(a); setError(''); setBidLoading(false); api.get(`/bids/auction/${id}`).then(r => setBids(r.data.data || [])); };
    const onEnded = (a: any) => { setAuction(a); api.get(`/bids/auction/${id}`).then(r => setBids(r.data.data || [])); };
    const onError = (d: { message: string }) => { setError(d.message); setBidLoading(false); };

    socket.on('bidPlaced', onBid);
    socket.on('auctionEnded', onEnded);
    socket.on('bidError', onError);

    return () => {
      socket.off('bidPlaced', onBid);
      socket.off('auctionEnded', onEnded);
      socket.off('bidError', onError);
      socket.emit('leaveAuction', id);
    };
  }, [id]);

  const handlePlaceBid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { router.push('/login'); return; }
    setError('');
    setBidLoading(true);
    socketManager.getAuctionsSocket().emit('placeBid', { auctionId: id, amount: Number(bidAmount) });
  };

  const toggleWatchlist = async () => {
    if (!user) { router.push('/login'); return; }
    try {
      isWatchlisted ? await api.delete(`/watchlist/${id}`) : await api.post(`/watchlist/${id}`);
      setIsWatchlisted(!isWatchlisted);
    } catch {}
  };

  const handleManualEnd = async () => {
    setEndingAuction(true);
    try {
      const res = await api.post(`/auctions/${id}/end`);
      setAuction(res.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to end auction');
    } finally {
      setEndingAuction(false);
    }
  };

  const handleDelete = async () => {
    setDeletingAuction(true);
    try {
      await api.delete(`/auctions/${id}`);
      router.push('/dashboard');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete auction');
      setDeletingAuction(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleMarkAsPaid = async () => {
    setPaymentLoading(true);
    try {
      const res = await api.post(`/auctions/${id}/pay`);
      setAuction(res.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to confirm payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center items-center h-96">
          <div className="w-10 h-10 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex flex-col justify-center items-center h-96 gap-4">
          <h2 className="text-2xl font-bold text-gray-900">Auction not found</h2>
          <button onClick={() => router.back()} className="btn-secondary">Go back</button>
        </div>
      </div>
    );
  }

  const isSeller = user?.id === auction.creator?.id;
  const isWinner = user?.id === auction.winnerId;
  const images = auction.images?.length > 0 ? auction.images : [];
  const isEndingSoon = auction.endTime && (new Date(auction.endTime).getTime() - Date.now()) < 3600000 && auction.status === 'active';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="card p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Auction</h3>
            <p className="text-sm text-gray-500 mb-5">Are you sure? This will permanently delete this auction and all its bids. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleDelete} disabled={deletingAuction} className="flex-1 btn-primary bg-red-600 hover:bg-red-700 shadow-red-200">
                {deletingAuction ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => router.back()} className="flex items-center text-gray-500 hover:text-indigo-600 mb-6 transition-colors text-sm font-medium">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to auctions
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Images + Info */}
          <div className="lg:col-span-2 space-y-5">
            {/* Image gallery */}
            <div className="card overflow-hidden">
              {images.length > 0 ? (
                <div className="relative">
                  <div className="aspect-[16/10] overflow-hidden bg-gray-100">
                    <img src={images[activeImageIdx]} alt={auction.title} className="w-full h-full object-contain" />
                  </div>
                  {images.length > 1 && (
                    <>
                      <button onClick={() => setActiveImageIdx(i => Math.max(0, i - 1))} disabled={activeImageIdx === 0} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full shadow flex items-center justify-center disabled:opacity-30 hover:bg-white transition-all">
                        <ChevronLeft className="w-4 h-4 text-gray-700" />
                      </button>
                      <button onClick={() => setActiveImageIdx(i => Math.min(images.length - 1, i + 1))} disabled={activeImageIdx === images.length - 1} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full shadow flex items-center justify-center disabled:opacity-30 hover:bg-white transition-all">
                        <ChevronRight className="w-4 h-4 text-gray-700" />
                      </button>
                      <div className="flex gap-1.5 p-3 overflow-x-auto bg-gray-50 border-t border-gray-100">
                        {images.map((img: string, i: number) => (
                          <button key={i} onClick={() => setActiveImageIdx(i)} className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${i === activeImageIdx ? 'border-indigo-500' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                            <img src={img} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="aspect-[16/10] flex items-center justify-center bg-gray-50">
                  <Package className="w-20 h-20 text-gray-200" />
                </div>
              )}
            </div>

            {/* Video */}
            {auction.videoUrl && (
              <div className="card p-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
                  <Video className="w-4 h-4 text-indigo-500" /> Product Video
                </h3>
                <div className="aspect-video rounded-xl overflow-hidden bg-black">
                  <iframe src={auction.videoUrl.replace('watch?v=', 'embed/')} className="w-full h-full" allowFullScreen title="Product video" />
                </div>
              </div>
            )}

            {/* Details */}
            <div className="card p-6">
              <div className="flex flex-wrap gap-2 mb-3">
                <span className={`badge ${auction.status === 'active' ? 'badge-success' : auction.status === 'sold' ? 'badge-primary' : auction.status === 'pending' ? 'badge-warning' : 'badge-gray'}`}>
                  {auction.status === 'active' ? '● Live' : auction.status}
                </span>
                {auction.auctionType === 'manual' && (
                  <span className="badge badge-primary bg-purple-100 text-purple-700">Manual</span>
                )}
                {auction.condition && (
                  <span className="badge badge-gray capitalize">{auction.condition.replace('_', ' ')}</span>
                )}
                {auction.category && (
                  <span className="badge badge-primary">{auction.category.name}</span>
                )}
              </div>

              <h1 className="text-2xl font-extrabold text-gray-900 mb-3">{auction.title}</h1>

              {/* Seller actions (only visible to creator) */}
              {isSeller && auction.status === 'active' && (
                <div className="flex flex-wrap gap-2 mb-5 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                  <p className="text-xs text-indigo-700 font-medium w-full mb-1">Seller Actions</p>
                  <Link href={`/auctions/${id}/edit`} className="btn-secondary text-xs py-1.5 flex items-center gap-1">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </Link>
                  {auction.auctionType === 'manual' && (
                    <button onClick={handleManualEnd} disabled={endingAuction} className="btn-primary text-xs py-1.5 bg-green-600 shadow-green-200 hover:bg-green-700 flex items-center gap-1">
                      <StopCircle className="w-3.5 h-3.5" />
                      {endingAuction ? 'Ending...' : 'End Auction Now'}
                    </button>
                  )}
                  <button onClick={() => setShowDeleteConfirm(true)} className="btn-secondary text-xs py-1.5 text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              )}

              <p className="text-gray-600 leading-relaxed text-sm mb-5">{auction.description}</p>

              <div className="grid grid-cols-2 gap-3 text-sm">
                {auction.location && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span>{auction.location}</span>
                  </div>
                )}
                {auction.shippingInfo && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span>{auction.shippingInfo}</span>
                  </div>
                )}
                {auction.creator && (
                  <div className="flex items-center gap-2 col-span-2">
                    <span className="text-gray-400 text-xs">Seller:</span>
                    <Link href={`/profile/${auction.creator.id}`} className="flex items-center gap-1.5 text-indigo-600 hover:underline">
                      <img src={auction.creator.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(auction.creator.name)}&size=20&background=6366f1&color=fff`} className="w-5 h-5 rounded-full object-cover" alt="" />
                      <span className="text-sm font-medium">{auction.creator.name}</span>
                    </Link>
                    {auction.creator.sellerRating > 0 && (
                      <div className="flex items-center gap-1 text-yellow-500">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span className="text-xs font-medium">{Number(auction.creator.sellerRating).toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bid History */}
            <div className="card overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900">Bid History ({bids.length})</h3>
              </div>
              {bids.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-400">No bids yet — be the first!</div>
              ) : (
                <ul className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                  {bids.map((bid, i) => (
                    <li key={bid.id} className={`px-6 py-3 flex items-center justify-between ${i === 0 ? 'bg-green-50' : ''}`}>
                      <div className="flex items-center gap-2">
                        <img src={bid.bidder?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(bid.bidder?.name || 'U')}&size=28&background=6366f1&color=fff`} className="w-7 h-7 rounded-full" alt="" />
                        <span className="text-sm text-gray-700 font-medium">{bid.bidder?.name || 'Anonymous'}</span>
                        {i === 0 && <span className="badge badge-success text-[9px]">Leading</span>}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900 text-sm">${Number(bid.amount).toLocaleString()}</p>
                        <p className="text-xs text-gray-400">{formatDistanceToNow(new Date(bid.createdAt), { addSuffix: true })}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Chat Panel */}
            <div className="card overflow-hidden">
              <button
                onClick={() => setShowChat(v => !v)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span className="font-bold text-gray-900 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-indigo-500" /> Auction Chat
                </span>
                {showChat ? <X className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
              </button>
              {showChat && (
                <div className="border-t border-gray-100">
                  <ChatPanel auctionId={id} user={user} />
                </div>
              )}
            </div>
          </div>

          {/* Right: Bid Panel */}
          <div className="space-y-4">
            {/* Price + Status */}
            <div className="card p-6 sticky top-20">
              <div className="text-center mb-5">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">
                  {auction.status === 'active' ? 'Current Bid' : 'Final Price'}
                </p>
                <p className="text-4xl font-extrabold text-gray-900">
                  ${Number(auction.currentPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                {auction.reservePrice && (
                  <p className={`text-xs mt-1.5 font-medium ${auction.isReserveMet ? 'text-green-600' : 'text-amber-600'}`}>
                    {auction.isReserveMet ? '✓ Reserve price met' : '⚠ Reserve price not met'}
                  </p>
                )}
              </div>

              {auction.status === 'active' && (
                <div className="flex items-center justify-center gap-2 text-sm font-medium mb-5">
                  <Clock className={`w-4 h-4 ${isEndingSoon ? 'text-red-500' : 'text-indigo-500'}`} />
                  <span className={isEndingSoon ? 'text-red-600 font-bold' : 'text-gray-700'}>
                    <CountdownTimer endTime={auction.endTime} />
                  </span>
                </div>
              )}

              {auction.status === 'sold' && isWinner && (
                <div className="mb-5">
                  {auction.paymentStatus === 'paid' ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <p className="text-lg font-bold text-green-700">Payment Confirmed</p>
                      </div>
                      <p className="text-sm text-green-600">Thank you! The seller has been notified.</p>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="w-5 h-5 text-amber-600" />
                        <p className="font-bold text-amber-800">🏆 You Won!</p>
                      </div>
                      <p className="text-sm text-amber-700 mb-4">
                        Congratulations! Please confirm your payment to complete the transaction.
                      </p>
                      <button
                        onClick={handleMarkAsPaid}
                        disabled={paymentLoading}
                        className="btn-primary w-full flex items-center justify-center gap-2 py-3"
                      >
                        {paymentLoading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4" />
                            Complete Payment
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {auction.status === 'active' && !isSeller && (
                <form onSubmit={handlePlaceBid} className="space-y-3">
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-lg flex items-start gap-1.5">
                      {error}
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Your bid ($)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
                      <input
                        type="number"
                        min={(Number(auction.currentPrice) + Number(auction.minBidIncrement || 1)).toFixed(2)}
                        step="0.01"
                        value={bidAmount}
                        onChange={e => setBidAmount(e.target.value)}
                        required
                        className="input-field pl-7 text-lg font-bold"
                        placeholder={`Min: $${(Number(auction.currentPrice) + Number(auction.minBidIncrement || 1)).toFixed(2)}`}
                        suppressHydrationWarning
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Min. increment: ${Number(auction.minBidIncrement || 1).toFixed(2)}</p>
                  </div>
                  <button
                    type="submit"
                    disabled={bidLoading}
                    className="btn-primary w-full py-3.5 text-base"
                  >
                    {bidLoading ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Placing bid...
                      </span>
                    ) : '⚡ Place Bid'}
                  </button>
                </form>
              )}

              {auction.status === 'active' && (
                <button
                  onClick={toggleWatchlist}
                  className={`w-full mt-3 btn-secondary flex items-center justify-center gap-2 ${isWatchlisted ? 'text-red-600 border-red-200' : ''}`}
                >
                  <Heart className={`w-4 h-4 ${isWatchlisted ? 'fill-red-500 text-red-500' : ''}`} />
                  {isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
                </button>
              )}

              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400">
                <ShieldCheck className="w-4 h-4 text-green-500 flex-shrink-0" />
                Buyer protection applies to this auction
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
