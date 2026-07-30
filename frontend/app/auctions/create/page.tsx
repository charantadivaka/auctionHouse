"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';
import { Image as ImageIcon, DollarSign, Clock, Timer, AlertCircle, Plus, X, Video } from 'lucide-react';

type AuctionType = 'timed' | 'manual';

export default function CreateAuction() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [auctionType, setAuctionType] = useState<AuctionType>('timed');
  const [imageUrls, setImageUrls] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    categoryId: '',
    condition: 'good',
    startingPrice: '',
    minBidIncrement: '1',
    reservePrice: '',
    endTime: '',
    location: '',
    shippingInfo: '',
    videoUrl: '',
  });

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    api.get('/categories').then(res => setCategories(res.data)).catch(() => {});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (auctionType === 'timed' && !form.endTime) {
      setError('End time is required for timed auctions.');
      return;
    }
    setLoading(true);
    try {
      const payload: any = {
        ...form,
        auctionType,
        startingPrice: Number(form.startingPrice),
        minBidIncrement: form.minBidIncrement ? Number(form.minBidIncrement) : 1,
        reservePrice: form.reservePrice ? Number(form.reservePrice) : undefined,
        images: imageUrls.filter(u => u.trim() !== ''),
        videoUrl: form.videoUrl || undefined,
      };
      if (auctionType === 'manual') {
        delete payload.endTime;
        // Set a far-future end time for manual auctions
        payload.endTime = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      }
      const res = await api.post('/auctions', payload);
      router.push(`/auctions/${res.data.id}`);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : msg || 'Failed to create auction');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-gray-900">Create Auction</h1>
          <p className="mt-1 text-sm text-gray-500">Fill in the details to list your item for auction.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm animate-fade-in">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
            </div>
          )}

          {/* Auction Type */}
          <div className="card p-6">
            <h2 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Timer className="w-4 h-4 text-indigo-500" /> Auction Type
            </h2>
            <p className="text-xs text-gray-500 mb-4">Choose how this auction will be managed.</p>
            <div className="grid grid-cols-2 gap-3">
              {(['timed', 'manual'] as AuctionType[]).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setAuctionType(type)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    auctionType === type
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-indigo-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    {type === 'timed' ? <Clock className="w-4 h-4 text-indigo-500" /> : <Timer className="w-4 h-4 text-purple-500" />}
                    <span className="font-semibold text-sm text-gray-900 capitalize">{type} Auction</span>
                    {auctionType === type && <span className="ml-auto badge badge-primary">Selected</span>}
                  </div>
                  <p className="text-xs text-gray-500">
                    {type === 'timed'
                      ? 'Automatically ends at a set date & time. Winner is declared at expiry.'
                      : 'You control when it ends. Manually end the auction whenever ready.'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Basic Info */}
          <div className="card p-6 space-y-5">
            <h2 className="text-base font-bold text-gray-900">Basic Information</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Title <span className="text-red-500">*</span></label>
              <input name="title" required value={form.title} onChange={handleChange} className="input-field" placeholder="e.g. Vintage Rolex Submariner" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description <span className="text-red-500">*</span></label>
              <textarea name="description" required rows={4} value={form.description} onChange={handleChange} className="input-field resize-none" placeholder="Describe your item in detail — condition, history, any flaws..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                <select name="categoryId" required value={form.categoryId} onChange={handleChange} className="input-field" suppressHydrationWarning>
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Condition</label>
                <select name="condition" value={form.condition} onChange={handleChange} className="input-field" suppressHydrationWarning>
                  <option value="new">New</option>
                  <option value="like_new">Like New</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                </select>
              </div>
            </div>
          </div>

          {/* Pricing & Timing */}
          <div className="card p-6 space-y-5">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500" /> Pricing & Timing
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Starting Price <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
                  <input type="number" name="startingPrice" required min="0.01" step="0.01" value={form.startingPrice} onChange={handleChange} className="input-field pl-7" placeholder="0.00" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Min. Bid Increment</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
                  <input type="number" name="minBidIncrement" min="0.01" step="0.01" value={form.minBidIncrement} onChange={handleChange} className="input-field pl-7" placeholder="1.00" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Reserve Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
                  <input type="number" name="reservePrice" min="0.01" step="0.01" value={form.reservePrice} onChange={handleChange} className="input-field pl-7" placeholder="Optional" />
                </div>
              </div>
            </div>

            {auctionType === 'timed' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date & Time <span className="text-red-500">*</span></label>
                <input type="datetime-local" name="endTime" value={form.endTime} onChange={handleChange} min={new Date().toISOString().slice(0, 16)} className="input-field" />
                <p className="text-xs text-gray-400 mt-1.5">The auction will automatically end at this time.</p>
              </div>
            )}
          </div>

          {/* Images & Video */}
          <div className="card p-6 space-y-5">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-blue-500" /> Images & Video
            </h2>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Image URLs (up to 5)</label>
              {imageUrls.map((url, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  {url && (
                    <img src={url} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-200 flex-shrink-0" onError={e => { (e.target as any).style.display='none'; }} />
                  )}
                  <input
                    type="url"
                    value={url}
                    onChange={e => { const u = [...imageUrls]; u[idx] = e.target.value; setImageUrls(u); }}
                    placeholder={`Image URL ${idx + 1}`}
                    className="input-field flex-1"
                  />
                  {imageUrls.length > 1 && (
                    <button type="button" onClick={() => setImageUrls(imageUrls.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 p-1">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {imageUrls.length < 5 && (
                <button type="button" onClick={() => setImageUrls([...imageUrls, ''])} className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                  <Plus className="w-4 h-4" /> Add image
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Video className="w-4 h-4" /> Product Video URL <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input type="url" name="videoUrl" value={form.videoUrl} onChange={handleChange} className="input-field" placeholder="https://youtube.com/watch?v=..." />
            </div>
          </div>

          {/* Location */}
          <div className="card p-6 space-y-5">
            <h2 className="text-base font-bold text-gray-900">Location & Shipping</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Location</label>
                <input name="location" value={form.location} onChange={handleChange} className="input-field" placeholder="e.g. New York, USA" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Shipping Info</label>
                <input name="shippingInfo" value={form.shippingInfo} onChange={handleChange} className="input-field" placeholder="e.g. Free shipping" />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pb-8">
            <button type="button" onClick={() => router.back()} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary px-8">
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </span>
              ) : 'Create Auction'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
