import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'AuctionHouse | Premium Online Auctions',
  description: 'Discover, bid, and win exclusive items on AuctionHouse. Your premium destination for real-time online auctions, unique finds, and unbeatable deals.',
  keywords: 'auctions, bidding, online auction, premium items, deals, collectibles',
  openGraph: {
    title: 'AuctionHouse | Premium Online Auctions',
    description: 'Discover, bid, and win exclusive items on AuctionHouse.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans bg-gray-50 text-gray-900`}>
        <AuthProvider>
          <Toaster position="bottom-right" />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
