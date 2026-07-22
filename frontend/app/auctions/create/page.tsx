"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';
import { Calendar, DollarSign, Image as ImageIcon, Tag } from 'lucide-react';

export default function CreateAuction() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    categoryId: '',
    condition: 'good',
    startingPrice: '',
    minBidIncrement: '',
    reservePrice: '',
    endTime: '',
    location: '',
    shippingInfo: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/categories');
        setCategories(res.data);
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    };
    fetchCategories();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        ...formData,
        startingPrice: Number(formData.startingPrice),
        minBidIncrement: formData.minBidIncrement ? Number(formData.minBidIncrement) : undefined,
        reservePrice: formData.reservePrice ? Number(formData.reservePrice) : undefined,
      };

      const res = await api.post('/auctions', payload);
      router.push(`/auctions/${res.data.id}`);
    } catch (err: any) {
      if (Array.isArray(err.response?.data?.message)) {
        setError(err.response.data.message[0]);
      } else {
        setError(err.response?.data?.message || 'Failed to create auction');
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-grow max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100 bg-gray-50">
            <h1 className="text-2xl font-bold text-gray-900">Create New Auction</h1>
            <p className="mt-1 text-sm text-gray-500">Provide the details for the item you want to sell.</p>
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-8 space-y-8">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Basic Info */}
            <div className="space-y-6">
              <h2 className="text-lg font-medium text-gray-900 border-b pb-2">Basic Information</h2>
              
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
                  <input
                    type="text"
                    name="title"
                    id="title"
                    required
                    value={formData.title}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="e.g. Vintage Rolex Submariner"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    rows={4}
                    required
                    value={formData.description}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Describe the item in detail..."
                  />
                </div>

                <div>
                  <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700">Category</label>
                  <select
                    id="categoryId"
                    name="categoryId"
                    required
                    value={formData.categoryId}
                    onChange={handleChange}
                    className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="">Select a category</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="condition" className="block text-sm font-medium text-gray-700">Condition</label>
                  <select
                    id="condition"
                    name="condition"
                    required
                    value={formData.condition}
                    onChange={handleChange}
                    className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
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
            <div className="space-y-6 pt-4">
              <h2 className="text-lg font-medium text-gray-900 border-b pb-2">Pricing & Timing</h2>
              
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="startingPrice" className="block text-sm font-medium text-gray-700">Starting Price ($)</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      name="startingPrice"
                      id="startingPrice"
                      required
                      min="0.01"
                      step="0.01"
                      value={formData.startingPrice}
                      onChange={handleChange}
                      className="block w-full pl-7 border border-gray-300 rounded-md py-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="minBidIncrement" className="block text-sm font-medium text-gray-700">Min. Bid Increment ($)</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      name="minBidIncrement"
                      id="minBidIncrement"
                      min="0.01"
                      step="0.01"
                      value={formData.minBidIncrement}
                      onChange={handleChange}
                      className="block w-full pl-7 border border-gray-300 rounded-md py-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="1.00"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="reservePrice" className="block text-sm font-medium text-gray-700">Reserve Price ($)</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      name="reservePrice"
                      id="reservePrice"
                      min="0.01"
                      step="0.01"
                      value={formData.reservePrice}
                      onChange={handleChange}
                      className="block w-full pl-7 border border-gray-300 rounded-md py-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">End Time</label>
                  <input
                    type="datetime-local"
                    name="endTime"
                    id="endTime"
                    required
                    value={formData.endTime}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">Auctions are active immediately upon creation and end at this time.</p>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-6 pt-4">
              <h2 className="text-lg font-medium text-gray-900 border-b pb-2">Location & Shipping</h2>
              
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700">Item Location</label>
                  <input
                    type="text"
                    name="location"
                    id="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="e.g. New York, NY"
                  />
                </div>

                <div>
                  <label htmlFor="shippingInfo" className="block text-sm font-medium text-gray-700">Shipping Info</label>
                  <input
                    type="text"
                    name="shippingInfo"
                    id="shippingInfo"
                    value={formData.shippingInfo}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="e.g. Free shipping / Local pickup only"
                  />
                </div>
              </div>
            </div>

            <div className="pt-5 flex justify-end">
              <button
                type="button"
                onClick={() => router.back()}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Creating...' : 'Create Auction'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
