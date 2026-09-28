"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { Star, MapPin, Calendar, Users, UserPlus, UserMinus, Edit2, ArrowRight, Package, Clock, Tag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';

const getImageUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
};

function StarRating({ stars, size = 'sm' }: { stars: number; size?: 'sm' | 'md' }) {
  const sz = size === 'md' ? 'w-5 h-5' : 'w-4 h-4';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`${sz} ${i <= stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`} />
      ))}
    </div>
  );
}

function EditProfileModal({ profile, onClose, onSaved }: { profile: any; onClose: () => void; onSaved: (p: any) => void }) {
  const [form, setForm] = useState({
    name: profile.name || '',
    bio: profile.bio || '',
    location: profile.location || '',
    avatarUrl: profile.avatarUrl || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.patch('/users/me', form);
      onSaved(res.data);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="card w-full max-w-md p-6 animate-fade-in">
        <h2 className="text-xl font-bold text-gray-900 mb-5">Edit Profile</h2>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
            <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea value={form.bio} onChange={e => setForm(f => ({...f, bio: e.target.value}))} rows={3} className="input-field resize-none" placeholder="Tell others about yourself..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} className="input-field" placeholder="e.g. New York, USA" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Avatar URL</label>
            <input value={form.avatarUrl} onChange={e => setForm(f => ({...f, avatarUrl: e.target.value}))} className="input-field" placeholder="https://..." />
            {form.avatarUrl && <img src={form.avatarUrl} alt="Preview" className="w-12 h-12 rounded-full mt-2 object-cover" onError={e => { (e.target as any).style.display='none'; }} />}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type Tab = 'reviews' | 'auctions';

export default function Profile() {
  const params = useParams();
  const id = params.id as string;
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState<any>(null);
  const [ratings, setRatings] = useState<any[]>([]);
  const [auctions, setAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('auctions');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const isOwnProfile = currentUser?.id === id;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [profileRes, ratingsRes, auctionsRes] = await Promise.all([
          api.get(`/users/${id}`),
          api.get(`/ratings/seller/${id}`),
          api.get(`/users/${id}/auctions?limit=8`),
        ]);
        setProfile(profileRes.data);
        setRatings(ratingsRes.data.data || []);
        setAuctions(auctionsRes.data.data || []);

        if (currentUser && !isOwnProfile) {
          const followRes = await api.get(`/users/${id}/is-following`).catch(() => ({ data: { isFollowing: false } }));
          setIsFollowing(followRes.data.isFollowing);
        }
      } catch (err) {
        console.error('Failed to load profile', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProfile();
  }, [id, currentUser, isOwnProfile]);

  const handleFollow = async () => {
    if (!currentUser) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await api.delete(`/users/${id}/follow`);
        setIsFollowing(false);
        setProfile((p: any) => ({ ...p, followersCount: Math.max(0, p.followersCount - 1) }));
      } else {
        await api.post(`/users/${id}/follow`);
        setIsFollowing(true);
        setProfile((p: any) => ({ ...p, followersCount: p.followersCount + 1 }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFollowLoading(false);
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

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex flex-col justify-center items-center h-96 gap-4">
          <h2 className="text-2xl font-bold text-gray-900">User not found</h2>
          <Link href="/" className="btn-secondary">Go Home</Link>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'auctions', label: 'Auctions', count: auctions.length },
    { id: 'reviews', label: 'Reviews', count: ratings.length },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      {showEditModal && (
        <EditProfileModal
          profile={profile}
          onClose={() => setShowEditModal(false)}
          onSaved={(updated) => setProfile((p: any) => ({ ...p, ...updated }))}
        />
      )}

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cover + Avatar */}
        <div className="card overflow-hidden mb-6">
          <div className="h-40 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 relative">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent" />
            </div>
          </div>

          <div className="px-6 pb-6">
            {/* Avatar row — pulls up into the banner */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                <img
                  src={profile.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&size=128&background=6366f1&color=fff`}
                  alt={profile.name}
                  className="w-24 h-24 rounded-2xl border-4 border-white shadow-lg object-cover bg-white flex-shrink-0 -mt-0"
                />
                {/* Name block — sits below banner, never overlapping it */}
                <div className="mt-2 sm:mt-0 min-w-0">
                  <h1 className="text-2xl font-bold text-gray-900 truncate">{profile.name}</h1>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <StarRating stars={Math.round(Number(profile.sellerRating))} />
                    <span className="text-sm text-gray-500">
                      {profile.sellerRating > 0 ? `${Number(profile.sellerRating).toFixed(1)} (${profile.totalRatingsCount})` : 'No ratings'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 flex-shrink-0 mt-2 sm:mt-4">
                {isOwnProfile ? (
                  <button onClick={() => setShowEditModal(true)} className="btn-secondary flex items-center gap-1.5 text-sm">
                    <Edit2 className="w-4 h-4" /> Edit Profile
                  </button>
                ) : currentUser && (
                  <button
                    onClick={handleFollow}
                    disabled={followLoading}
                    className={isFollowing ? 'btn-secondary flex items-center gap-1.5 text-sm' : 'btn-primary flex items-center gap-1.5 text-sm'}
                  >
                    {isFollowing ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    {followLoading ? '...' : isFollowing ? 'Unfollow' : 'Follow'}
                  </button>
                )}
              </div>
            </div>

            {/* Bio + meta */}
            <p className="text-gray-600 text-sm mb-4 max-w-2xl">
              {profile.bio || <span className="text-gray-400 italic">No bio provided.</span>}
            </p>

            <div className="flex flex-wrap gap-5 text-sm text-gray-500 mb-4">
              {profile.location && (
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-gray-400" /> {profile.location}</span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-gray-400" />
                Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-gray-400" />
                {profile.followersCount || 0} followers · {profile.followingCount || 0} following
              </span>
            </div>

            {/* Stat mini cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Auctions', value: profile.totalSales || auctions.length },
                { label: 'Rating', value: profile.sellerRating > 0 ? `${Number(profile.sellerRating).toFixed(1)}★` : 'N/A' },
                { label: 'Reviews', value: profile.totalRatingsCount || 0 },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                  <p className="text-xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-6 w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'auctions' && (
          <div>
            {auctions.length === 0 ? (
              <div className="card flex flex-col items-center py-16 text-center">
                <Package className="w-12 h-12 text-gray-200 mb-3" />
                <p className="text-gray-500">No auctions listed yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {auctions.map(auction => (
                  <Link key={auction.id} href={`/auctions/${auction.id}`} className="card group hover:shadow-lg hover:-translate-y-0.5 transition-all overflow-hidden flex flex-col">
                    <div className="relative aspect-[16/9] bg-gray-100 overflow-hidden">
                      {auction.images?.length > 0 ? (
                        <Image src={getImageUrl(auction.images[0])} alt={auction.title} fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Tag className="w-8 h-8 text-gray-300" /></div>
                      )}
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1 group-hover:text-indigo-600 transition-colors">{auction.title}</h3>
                      <div className="flex items-center gap-2 mt-auto pt-3 border-t border-gray-100">
                        <span className={`badge ${auction.status === 'active' ? 'badge-success' : auction.status === 'sold' ? 'badge-primary' : 'badge-gray'}`}>
                          {auction.status}
                        </span>
                        <span className="text-sm font-bold text-gray-900 ml-auto">${Number(auction.currentPrice).toFixed(2)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="card overflow-hidden">
            {ratings.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <Star className="w-12 h-12 text-gray-200 mb-3" />
                <p className="text-gray-500">No reviews yet.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {ratings.map(r => (
                  <li key={r.id} className="p-6 animate-fade-in">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={r.reviewer?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.reviewer?.name || 'U')}&background=6366f1&color=fff`}
                          className="w-9 h-9 rounded-full object-cover"
                          alt={r.reviewer?.name}
                        />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{r.reviewer?.name}</p>
                          <p className="text-xs text-gray-400">{formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}</p>
                        </div>
                      </div>
                      <StarRating stars={r.stars} size="sm" />
                    </div>
                    {r.comment && (
                      <p className="mt-3 text-sm text-gray-600 leading-relaxed">{r.comment}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
