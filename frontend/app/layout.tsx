import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AuctionHouse — Real-Time Bidding Marketplace',
  description: 'Bid live on exclusive items in real-time. AuctionHouse is the premier destination for collectors and sellers.',
  keywords: ['auction', 'bidding', 'real-time', 'marketplace'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {/* Navbar */}
        <header className="navbar">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <a href="/" className="flex items-center gap-3 text-white no-underline">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                   style={{ background: 'linear-gradient(135deg, #4c6ef5, #5c7cfa)', boxShadow: '0 4px 12px rgba(92,124,250,0.4)' }}>
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                  <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm-1 14.5v-9l7 3.5v9l-7-3.5z"/>
                </svg>
              </div>
              <span className="text-lg font-bold tracking-tight" style={{ letterSpacing: '-0.3px' }}>
                Auction<span className="gradient-text">House</span>
              </span>
            </a>
            <nav className="flex items-center gap-4">
              <a href="/" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Browse</a>
              <a href="/auctions/create" className="btn-primary text-sm py-2 px-5">
                + New Auction
              </a>
            </nav>
          </div>
        </header>

        <main>{children}</main>

        <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '80px', padding: '32px 24px', textAlign: 'center', color: '#868e96', fontSize: '13px' }}>
          © {new Date().getFullYear()} AuctionHouse · Real-Time Bidding Marketplace
        </footer>
      </body>
    </html>
  );
}
