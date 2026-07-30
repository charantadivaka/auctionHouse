"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';
import { AlertCircle, Save, Plus, X } from 'lucide-react';

export default function EditAuction() {
  const params = useParams();
  const id = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [categories, setCategories] = useState<any[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>(['']);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    categoryId: '',
    condition: 'good',
    minBidIncrement: '',
    reservePrice: '',
    location: '',
    shippingInfo: '',
    videoUrl: '',
  });

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [auctionRes, catsRes] = await Promise.all([
          api.get(`/auctions/${id}`),
          api.get('/categories'),
        ]);
        const auction = auctionRes.data;
        if (auction.creator?.id !== user?.id) {
          router.push(`/auctions/${id}`);
          return;
        }
        setCategories(catsRes.data);
        setForm({
          title: auction.title || '',
          description: auction.description || '',
          categoryId: auction.category?.id || '',
          condition: auction.condition || 'good',
          minBidIncrement: auction.minBidIncrement?.toString() || '1',
          reservePrice: auction.reservePrice?.toString() || '',
          location: auction.location || '',
          shippingInfo: auction.shippingInfo || '',
          videoUrl: auction.videoUrl || '',
        });
        setImageUrls(auction.images?.length > 0 ? auction.images : ['']);
      } catch (err) {
        setError('Failed to load auction');
      } finally {
        setLoading(false);
      }
    };
    if (user && id) fetch();
  }, [id, user, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.patch(`/auctions/${id}`, {
        ...form,
        minBidIncrement: form.minBidIncrement ? Number(form.minBidIncrement) : undefined,
        reservePrice: form.reservePrice ? Number(form.reservePrice) : undefined,
        images: imageUrls.filter(u => u.trim() !== ''),
        videoUrl: form.videoUrl || undefined,
      });
      router.push(`/auctions/${id}`);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : msg || 'Failed to update auction');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
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
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-gray-900">Edit Auction</h1>
          <p className="mt-1 text-sm text-gray-500">Update the details of your listing.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm animate-fade-in">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
            </div>
          )}

          <div className="card p-6 space-y-5">
            <h2 className="text-base font-bold text-gray-900">Basic Information</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
              <input name="title" required value={form.title} onChange={handleChange} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <textarea name="description" required rows={4} value={form.description} onChange={handleChange} className="input-field resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                <select name="categoryId" value={form.categoryId} onChange={handleChange} className="input-field" suppressHydrationWarning>
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

          <div className="card p-6 space-y-5">
            <h2 className="text-base font-bold text-gray-900">Pricing</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Min. Bid Increment ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" name="minBidIncrement" min="0.01" step="0.01" value={form.minBidIncrement} onChange={handleChange} className="input-field pl-7" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Reserve Price ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" name="reservePrice" min="0.01" step="0.01" value={form.reservePrice} onChange={handleChange} className="input-field pl-7" placeholder="Optional" />
                </div>
              </div>
            </div>
          </div>

          <div className="card p-6 space-y-5">
            <h2 className="text-base font-bold text-gray-900">Images & Video</h2>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Image URLs</label>
              {imageUrls.map((url, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  {url && <img src={url} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-200 flex-shrink-0" onError={e => { (e.target as any).style.display='none'; }} />}
                  <input type="url" value={url} onChange={e => { const u = [...imageUrls]; u[idx] = e.target.value; setImageUrls(u); }} placeholder={`Image URL ${idx + 1}`} className="input-field flex-1" />
                  {imageUrls.length > 1 && (
                    <button type="button" onClick={() => setImageUrls(imageUrls.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 p-1">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {imageUrls.length < 5 && (
                <button type="button" onClick={() => setImageUrls([...imageUrls, ''])} className="flex items-center gap-1.5 text-sm text-indigo-600 font-medium">
                  <Plus className="w-4 h-4" /> Add image
                </button>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Video URL (optional)</label>
              <input type="url" name="videoUrl" value={form.videoUrl} onChange={handleChange} className="input-field" placeholder="https://youtube.com/watch?v=..." />
            </div>
          </div>

          <div className="card p-6 space-y-5">
            <h2 className="text-base font-bold text-gray-900">Location & Shipping</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Location</label>
                <input name="location" value={form.location} onChange={handleChange} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Shipping Info</label>
                <input name="shippingInfo" value={form.shippingInfo} onChange={handleChange} className="input-field" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pb-8">
            <button type="button" onClick={() => router.push(`/auctions/${id}`)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary px-8 flex items-center gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
