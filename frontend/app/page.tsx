"use client";

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { Clock, Tag, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Home() {
  const [auctions, setAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState('newest');

  const fetchAuctions = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/auctions?page=${page}&limit=12&sort=${sort}`);
      setAuctions(res.data.data);
      setTotalPages(res.data.totalPages);
    } catch (error) {
      console.error('Error fetching auctions', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuctions();
  }, [page, sort]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Live Auctions</h1>
          
          <select 
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="newest">Newest First</option>
            <option value="ending_soon">Ending Soon</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {auctions.map((auction) => (
                <div key={auction.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden flex flex-col group border border-gray-100">
                  <div className="relative aspect-[4/3] bg-gray-200 overflow-hidden">
                    {auction.images && auction.images.length > 0 ? (
                      <img 
                        src={auction.images[0]} 
                        alt={auction.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        No Image
                      </div>
                    )}
                    {auction.status === 'active' && (
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-gray-700 flex items-center gap-1 shadow-sm">
                        <Clock className="w-3 h-3 text-indigo-600" />
                        {formatDistanceToNow(new Date(auction.endTime), { addSuffix: true })}
                      </div>
                    )}
                  </div>
                  
                  <div className="p-5 flex flex-col flex-grow">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-md">
                        {auction.category?.name || 'Uncategorized'}
                      </span>
                      <span className="text-xs text-gray-500 capitalize">
                        {auction.condition?.replace('_', ' ')}
                      </span>
                    </div>
                    
                    <h3 className="font-semibold text-gray-900 text-lg mb-1 line-clamp-1">{auction.title}</h3>
                    
                    <div className="mt-auto pt-4 flex items-end justify-between">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Current Bid</p>
                        <p className="font-bold text-2xl text-gray-900">${Number(auction.currentPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                      
                      <Link 
                        href={`/auctions/${auction.id}`}
                        className="h-10 w-10 bg-gray-900 hover:bg-indigo-600 text-white rounded-full flex items-center justify-center transition-colors shadow-sm"
                      >
                        <ArrowRight className="w-5 h-5" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-12 flex justify-center gap-2">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-gray-700">
                  Page {page} of {totalPages}
                </span>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
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
