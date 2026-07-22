"use client";

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Search, Bell, Menu, X, PlusCircle, LogOut } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                AuctionHouse
              </span>
            </Link>
            
            <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
              <Link href="/" className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-indigo-500 text-sm font-medium">
                Browse
              </Link>
            </div>
          </div>

          <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search auctions..."
                className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>

            {user ? (
              <>
                <Link href="/auctions/create" className="text-gray-600 hover:text-indigo-600 transition-colors flex items-center gap-1 font-medium">
                  <PlusCircle className="h-5 w-5" />
                  <span>Sell</span>
                </Link>
                
                <button className="text-gray-500 hover:text-indigo-600 transition-colors p-2 relative">
                  <Bell className="h-6 w-6" />
                  <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                </button>

                <div className="relative ml-3 group">
                  <button className="flex text-sm border-2 border-transparent rounded-full focus:outline-none focus:border-indigo-500 transition">
                    <img
                      className="h-8 w-8 rounded-full object-cover bg-gray-100"
                      src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.name}&background=random`}
                      alt={user.name}
                    />
                  </button>
                  
                  {/* Dropdown */}
                  <div className="absolute right-0 w-48 mt-2 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all z-50">
                    <div className="py-1">
                      <Link href={`/profile/${user.id}`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        Your Profile
                      </Link>
                      <Link href="/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        Dashboard
                      </Link>
                      {user.role === 'admin' && (
                        <Link href="/admin" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                          Admin Panel
                        </Link>
                      )}
                      <button
                        onClick={logout}
                        className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign out
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex space-x-4">
                <Link href="/login" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                  Log in
                </Link>
                <Link href="/register" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors">
                  Sign up
                </Link>
              </div>
            )}
          </div>
          
          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
            >
              {isMenuOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="sm:hidden bg-white border-t border-gray-200">
          <div className="pt-2 pb-3 space-y-1">
            <Link href="/" className="bg-indigo-50 border-indigo-500 text-indigo-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium">
              Browse
            </Link>
            {user && (
              <Link href="/auctions/create" className="border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800 block pl-3 pr-4 py-2 border-l-4 text-base font-medium">
                Sell
              </Link>
            )}
          </div>
          {user ? (
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="flex items-center px-4">
                <div className="flex-shrink-0">
                  <img
                    className="h-10 w-10 rounded-full"
                    src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.name}&background=random`}
                    alt=""
                  />
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800">{user.name}</div>
                  <div className="text-sm font-medium text-gray-500">{user.email}</div>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <Link href="/dashboard" className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100">
                  Dashboard
                </Link>
                <button
                  onClick={logout}
                  className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                >
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-4 pb-3 border-t border-gray-200 flex flex-col px-4 space-y-2">
              <Link href="/login" className="block text-center text-gray-600 font-medium py-2">
                Log in
              </Link>
              <Link href="/register" className="block text-center bg-indigo-600 text-white rounded-md py-2 font-medium">
                Sign up
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
