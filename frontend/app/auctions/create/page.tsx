'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const DURATION_OPTIONS = [
  { value: '5',     label: '5 Minutes',  subtitle: 'Quick test' },
  { value: '60',    label: '1 Hour',     subtitle: 'Short auction' },
  { value: '720',   label: '12 Hours',   subtitle: 'Half day' },
  { value: '1440',  label: '24 Hours',   subtitle: 'Full day' },
  { value: '4320',  label: '3 Days',     subtitle: 'Extended' },
  { value: '10080', label: '7 Days',     subtitle: 'Full week' },
];

export default function CreateAuction() {
  const router = useRouter();
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState('');
  const [success, setSuccess]   = useState(false);

  const [formData, setFormData] = useState({
    title:           '',
    description:     '',
    startingPrice:   '',
    durationMinutes: '60',
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const validate = (): string => {
    if (!formData.title.trim())         return 'Title is required.';
    if (formData.title.length < 3)      return 'Title must be at least 3 characters.';
    if (!formData.description.trim())   return 'Description is required.';
    if (!formData.startingPrice)        return 'Starting price is required.';
    const price = Number(formData.startingPrice);
    if (isNaN(price) || price < 0.01)  return 'Starting price must be at least $0.01.';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError('');

    const endTime = new Date(Date.now() + Number(formData.durationMinutes) * 60 * 1000);

    try {
      const res = await fetch('http://localhost:3001/auctions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          title:         formData.title.trim(),
          description:   formData.description.trim(),
          startingPrice: Number(formData.startingPrice),
          endTime:       endTime.toISOString(),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? `Server error ${res.status}`);
      }

      const auction = await res.json();
      setSuccess(true);
      setTimeout(() => router.push(`/auctions/${auction.id}`), 600);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  const charCount   = formData.description.length;
  const priceNum    = Number(formData.startingPrice) || 0;
  const selectedDur = DURATION_OPTIONS.find(d => d.value === formData.durationMinutes);

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 animate-fade-in">

      {/* Back */}
      <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 text-sm font-medium">
        ← Back to Auctions
      </Link>

      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold text-white mb-2" style={{ letterSpacing: '-0.5px' }}>
          Create Auction
        </h1>
        <p className="text-gray-400">List your item and start receiving real-time bids.</p>
      </div>

      {/* Form card */}
      <div className="glass-card p-8">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-7">

          {/* Title */}
          <div>
            <label className="form-label" htmlFor="title">Item Title</label>
            <input
              id="title"
              type="text"
              required
              className="input-field"
              value={formData.title}
              onChange={e => handleChange('title', e.target.value)}
              placeholder="e.g. Vintage Rolex Submariner"
              maxLength={120}
            />
            <p className="text-xs text-gray-600 mt-1">{formData.title.length}/120 characters</p>
          </div>

          {/* Description */}
          <div>
            <label className="form-label" htmlFor="description">Description</label>
            <textarea
              id="description"
              required
              rows={5}
              className="input-field"
              value={formData.description}
              onChange={e => handleChange('description', e.target.value)}
              placeholder="Describe the item's condition, history, and what makes it special…"
              maxLength={2000}
            />
            <p className="text-xs text-gray-600 mt-1">{charCount}/2000 characters</p>
          </div>

          {/* Price + Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="form-label" htmlFor="startingPrice">Starting Price</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                <input
                  id="startingPrice"
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  className="input-field"
                  style={{ paddingLeft: '2rem' }}
                  value={formData.startingPrice}
                  onChange={e => handleChange('startingPrice', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              {priceNum > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Starting at <span className="price-display">${priceNum.toFixed(2)}</span>
                </p>
              )}
            </div>

            <div>
              <label className="form-label" htmlFor="duration">Duration</label>
              <select
                id="duration"
                className="input-field"
                value={formData.durationMinutes}
                onChange={e => handleChange('durationMinutes', e.target.value)}
              >
                {DURATION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} — {opt.subtitle}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Preview strip */}
          <div className="p-5 rounded-xl flex flex-wrap gap-4"
               style={{ background: 'rgba(92,124,250,0.06)', border: '1px solid rgba(92,124,250,0.15)' }}>
            <div>
              <div className="text-xs text-gray-500 mb-1">Auction closes in</div>
              <div className="font-semibold text-white">{selectedDur?.label}</div>
            </div>
            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '16px' }}>
              <div className="text-xs text-gray-500 mb-1">Starting bid</div>
              <div className="price-display font-semibold">{priceNum > 0 ? `$${priceNum.toFixed(2)}` : '—'}</div>
            </div>
            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '16px' }}>
              <div className="text-xs text-gray-500 mb-1">Listed as</div>
              <div className="text-gray-300 text-sm font-medium">Test User 1</div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 rounded-xl flex items-center gap-3 text-sm"
                 style={{ background: 'rgba(250,82,82,0.1)', border: '1px solid rgba(250,82,82,0.25)' }}>
              <span className="text-xl">⚠️</span>
              <span className="text-red-400 font-medium">{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || success}
            className="btn-primary w-full py-4 text-base"
          >
            {success ? (
              <>✅ Auction Created! Redirecting…</>
            ) : loading ? (
              <>
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Creating Auction…
              </>
            ) : (
              <>🚀 Launch Auction</>
            )}
          </button>
        </form>
      </div>

      {/* Tips */}
      <div className="mt-8 glass-card p-6">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">💡 Tips for a great listing</h3>
        <ul className="flex flex-col gap-3 text-sm text-gray-400">
          <li className="flex items-start gap-2">
            <span className="text-brand-400 mt-0.5">→</span>
            Use a clear, specific title that describes the exact item.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brand-400 mt-0.5">→</span>
            Include condition, age, and any notable features in the description.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brand-400 mt-0.5">→</span>
            Set a realistic starting price — lower prices attract more bidders.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brand-400 mt-0.5">→</span>
            Shorter durations (1–24 hours) create urgency and higher engagement.
          </li>
        </ul>
      </div>
    </div>
  );
}
