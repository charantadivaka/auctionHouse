"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';
import { Star, MapPin, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Profile() {
  const params = useParams();
  const id = params.id as string;
  
  const [profile, setProfile] = useState<any>(null);
  const [ratings, setRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [profileRes, ratingsRes] = await Promise.all([
          api.get(`/users/${id}`),
          api.get(`/ratings/seller/${id}`)
        ]);
        setProfile(profileRes.data);
        setRatings(ratingsRes.data.data);
      } catch (err) {
        console.error('Failed to load profile', err);
      } finally {
        setLoading(false);
      }
    };
    
    if (id) fetchProfile();
  }, [id]);

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

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-grow flex justify-center items-center">
          <h2 className="text-2xl font-bold text-gray-900">User not found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      
      <main className="flex-grow max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
          <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
          <div className="px-8 pb-8">
            <div className="relative flex justify-between items-end -mt-12 mb-6">
              <img 
                src={profile.avatarUrl || `https://ui-avatars.com/api/?name=${profile.name}&size=128`} 
                alt={profile.name} 
                className="w-24 h-24 rounded-full border-4 border-white shadow-md bg-white"
              />
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900">{profile.name}</h1>
            <p className="text-gray-500 mb-4">{profile.bio || 'No bio provided.'}</p>
            
            <div className="flex flex-wrap gap-6 text-sm text-gray-600">
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                {profile.location || 'Location not specified'}
              </div>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                Joined {new Date(profile.createdAt).toLocaleDateString()}
              </div>
              <div className="flex items-center text-yellow-500 font-medium">
                <Star className="w-4 h-4 fill-current mr-1" />
                {profile.sellerRating > 0 ? Number(profile.sellerRating).toFixed(1) : 'No ratings yet'} ({profile.totalRatingsCount})
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">Reviews as Seller</h2>
          </div>
          
          {ratings.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              This user hasn't received any reviews yet.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {ratings.map((rating) => (
                <li key={rating.id} className="p-8">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < rating.stars ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                        ))}
                      </div>
                      <p className="text-gray-800 mb-2">{rating.comment || 'No comment provided.'}</p>
                      <p className="text-xs text-gray-500">
                        By {rating.reviewer.name} • {formatDistanceToNow(new Date(rating.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
