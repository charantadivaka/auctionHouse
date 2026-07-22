"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { socketManager } from '@/lib/socket';
import Navbar from '@/components/Navbar';
import { formatDistanceToNow } from 'date-fns';
import { Clock, Tag, ArrowLeft, Heart, ShieldCheck, MapPin, Package, Star } from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';

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
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    const fetchAuction = async () => {
      try {
        const [auctionRes, bidsRes] = await Promise.all([
          api.get(`/auctions/${id}`),
          api.get(`/bids/auction/${id}`)
        ]);
        
        setAuction(auctionRes.data);
        setBids(bidsRes.data.data);
        
        if (user) {
          try {
            const watchRes = await api.get('/watchlist');
            const inWatchlist = watchRes.data.data.some((a: any) => a.id === id);
            setIsWatchlisted(inWatchlist);
          } catch (e) {}
        }
      } catch (err) {
        console.error('Failed to load auction', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAuction();
  }, [id, user]);

  // Setup sockets
  useEffect(() => {
    if (!id) return;
    
    const socket = socketManager.getAuctionsSocket();
    socket.emit('joinAuction', id);

    const handleBidPlaced = (updatedAuction: any) => {
      setAuction(updatedAuction);
      setError(''); // Fix #14 clear error
      setBidLoading(false); // Fix #16 stop loading
      
      // We don't have the new bid object in updatedAuction easily accessible for the list
      // A full app might emit the bid object. Let's re-fetch bids to be safe
      api.get(`/bids/auction/${id}`).then(res => setBids(res.data.data));
    };

    const handleAuctionEnded = (endedAuction: any) => {
      setAuction(endedAuction);
      api.get(`/bids/auction/${id}`).then(res => setBids(res.data.data));
    };

    const handleBidError = (data: { message: string }) => {
      setError(data.message);
      setBidLoading(false);
    };

    socket.on('bidPlaced', handleBidPlaced);
    socket.on('auctionEnded', handleAuctionEnded);
    socket.on('bidError', handleBidError);

    return () => {
      socket.off('bidPlaced', handleBidPlaced);
      socket.off('auctionEnded', handleAuctionEnded);
      socket.off('bidError', handleBidError);
      socket.emit('leaveAuction', id);
    };
  }, [id]);

  // Countdown timer
  useEffect(() => {
    if (!auction) return;
    
    const updateTime = () => {
      const end = new Date(auction.endTime).getTime();
      const now = new Date().getTime();
      const distance = end - now;

      if (distance < 0) {
        setTimeLeft('Ended');
        if (timerRef.current) clearInterval(timerRef.current);
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      if (days > 0) setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      else if (hours > 0) setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      else setTimeLeft(`${minutes}m ${seconds}s`);
    };

    updateTime();
    // Fix #20 clear existing interval
    if (timerRef.current) clearInterval(timerRef.current);
    // Fix #1 recreate timer when auction updates (end time changes)
    timerRef.current = setInterval(updateTime, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [auction]); // Dependency on auction fixes bug #1 (timer resetting properly on new bid)

  const handlePlaceBid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push('/login');
      return;
    }
    
    setError('');
    setBidLoading(true);
    const socket = socketManager.getAuctionsSocket();
    socket.emit('placeBid', { auctionId: id, amount: Number(bidAmount) });
  };

  const toggleWatchlist = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    try {
      if (isWatchlisted) {
        await api.delete(`/watchlist/${id}`);
      } else {
        await api.post(`/watchlist/${id}`);
      }
      setIsWatchlisted(!isWatchlisted);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-grow flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-grow flex flex-col justify-center items-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Auction not found</h2>
          <button onClick={() => router.back()} className="text-indigo-600 hover:underline">Go back</button>
        </div>
      </div>
    );
  }

  const isSeller = user?.id === auction.creator.id;
  const isWinner = user?.id === auction.winnerId;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => router.back()} className="flex items-center text-gray-500 hover:text-indigo-600 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            
            {/* Left Col: Image & Details */}
            <div className="p-8 lg:border-r border-gray-200 flex flex-col">
              <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden mb-6 relative">
                {auction.images && auction.images.length > 0 ? (
                  <img src={auction.images[0]} alt={auction.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">No Image provided</div>
                )}
                
                <button 
                  onClick={toggleWatchlist}
                  className="absolute top-4 right-4 p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:scale-110 transition-transform"
                >
                  <Heart className={clsx("w-6 h-6 transition-colors", isWatchlisted ? "fill-red-500 text-red-500" : "text-gray-400")} />
                </button>
              </div>

              <div className="mt-auto">
                <h3 className="font-semibold text-lg border-b pb-2 mb-4">Description</h3>
                <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{auction.description}</p>
                
                <div className="mt-8 grid grid-cols-2 gap-4">
                  <div className="flex items-start">
                    <MapPin className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Location</p>
                      <p className="text-sm font-medium">{auction.location || 'Not specified'}</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Package className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Shipping</p>
                      <p className="text-sm font-medium">{auction.shippingInfo || 'Not specified'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col: Bidding & Seller info */}
            <div className="p-8 flex flex-col bg-gray-50/50">
              <div className="flex justify-between items-start mb-2">
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium uppercase tracking-wide">
                    {auction.category?.name || 'Category'}
                  </span>
                  <span className="px-3 py-1 bg-gray-200 text-gray-800 rounded-full text-xs font-medium uppercase tracking-wide">
                    {auction.condition?.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center text-gray-500 text-sm">
                  <Tag className="w-4 h-4 mr-1" /> ID: {auction.id.slice(0,8)}
                </div>
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mt-2 mb-6 leading-tight">{auction.title}</h1>

              {/* Status Banner */}
              <div className={clsx(
                "rounded-xl p-6 mb-8 flex items-center justify-between border shadow-sm",
                auction.status === 'active' ? "bg-white border-indigo-100" :
                auction.status === 'sold' ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
              )}>
                <div>
                  <p className="text-sm text-gray-500 font-medium mb-1">
                    {auction.status === 'active' ? 'Current Bid' : 
                     auction.status === 'sold' ? 'Sold For' : 'Starting Price'}
                  </p>
                  <p className="text-4xl font-bold text-gray-900">
                    ${Number(auction.currentPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 font-medium mb-1 flex items-center justify-end">
                    <Clock className="w-4 h-4 mr-1" /> 
                    {auction.status === 'active' ? 'Time Left' : 'Status'}
                  </p>
                  <p className={clsx(
                    "text-xl font-bold",
                    auction.status === 'active' ? "text-indigo-600" :
                    auction.status === 'sold' ? "text-green-600" : "text-red-600"
                  )}>
                    {auction.status === 'active' ? timeLeft : auction.status.toUpperCase()}
                  </p>
                </div>
              </div>

              {/* Bidding Area */}
              {auction.status === 'active' && (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8">
                  {isSeller ? (
                    <div className="text-center py-4 text-gray-500">
                      You are the seller of this item. You cannot bid.
                    </div>
                  ) : (
                    <form onSubmit={handlePlaceBid}>
                      {error && (
                        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-md">
                          {error}
                        </div>
                      )}
                      <div className="flex gap-4">
                        <div className="relative flex-grow">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <span className="text-gray-500 font-medium">$</span>
                          </div>
                          <input
                            type="number"
                            min={(Number(auction.currentPrice) + (Number(auction.currentPrice) === Number(auction.startingPrice) && bids.length === 0 ? 0 : Number(auction.minBidIncrement))).toFixed(2)}
                            step="0.01"
                            required
                            value={bidAmount}
                            onChange={(e) => setBidAmount(e.target.value)}
                            className="block w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-0 focus:border-indigo-600 text-lg font-semibold transition-colors"
                            placeholder="Enter amount"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={bidLoading}
                          className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                        >
                          {bidLoading ? 'Processing...' : 'Place Bid'}
                        </button>
                      </div>
                      <p className="mt-3 text-xs text-gray-500 flex items-center">
                        <ShieldCheck className="w-4 h-4 mr-1 text-green-500" />
                        Enter ${(Number(auction.currentPrice) + (Number(auction.currentPrice) === Number(auction.startingPrice) && bids.length === 0 ? 0 : Number(auction.minBidIncrement))).toFixed(2)} or more. {auction.reservePrice && (auction.isReserveMet ? 'Reserve price met.' : 'Reserve price not met.')}
                      </p>
                    </form>
                  )}
                </div>
              )}

              {/* Result Area */}
              {auction.status === 'sold' && isWinner && (
                <div className="bg-green-100 border border-green-300 text-green-800 p-6 rounded-xl shadow-sm mb-8">
                  <h3 className="font-bold text-lg mb-1 flex items-center">🎉 You won this auction!</h3>
                  <p className="text-sm">Please arrange payment with the seller.</p>
                </div>
              )}
              {auction.status === 'sold' && isSeller && (
                <div className="bg-green-100 border border-green-300 text-green-800 p-6 rounded-xl shadow-sm mb-8">
                  <h3 className="font-bold text-lg mb-1 flex items-center">🎉 Your item sold!</h3>
                  <p className="text-sm">The winner will contact you for payment.</p>
                </div>
              )}

              {/* Seller Info */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img 
                    src={auction.creator.avatarUrl || `https://ui-avatars.com/api/?name=${auction.creator.name}`} 
                    className="w-12 h-12 rounded-full border border-gray-200" 
                    alt="Seller" 
                  />
                  <div>
                    <p className="text-xs text-gray-500 font-medium">SELLER</p>
                    <Link href={`/profile/${auction.creator.id}`} className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors">
                      {auction.creator.name}
                    </Link>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center text-yellow-500 mb-1">
                    <Star className="w-4 h-4 fill-current mr-1" />
                    <span className="font-bold">{auction.creator.sellerRating > 0 ? Number(auction.creator.sellerRating).toFixed(1) : 'New'}</span>
                  </div>
                  <p className="text-xs text-gray-500">{auction.creator.totalRatingsCount} reviews</p>
                </div>
              </div>

              {/* Bid History */}
              <div className="flex-grow flex flex-col">
                <h3 className="font-semibold text-lg mb-4 flex items-center justify-between">
                  <span>Bid History</span>
                  <span className="text-sm font-normal text-gray-500">{bids.length} bids</span>
                </h3>
                
                <div className="bg-white rounded-xl border border-gray-200 shadow-inner overflow-hidden flex-grow relative min-h-[200px]">
                  {bids.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                      No bids yet. Be the first!
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                      {bids.map((bid, i) => (
                        <li key={bid.id} className={clsx("p-4 flex justify-between items-center", i === 0 && "bg-gray-50")}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-xs">
                              {bid.bidder?.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {bid.bidder?.id === user?.id ? 'You' : 
                                 `${bid.bidder?.name?.slice(0,2)}***`} 
                                {i === 0 && <span className="ml-2 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Leading</span>}
                              </p>
                              <p className="text-xs text-gray-500">{formatDistanceToNow(new Date(bid.createdAt), { addSuffix: true })}</p>
                            </div>
                          </div>
                          <span className="font-bold text-gray-900">${Number(bid.amount).toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
