import React from 'react';
import Navbar from '@/components/layout/Navbar';
import AuctionGrid from '@/components/auctions/AuctionGrid';

const AuctionsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <AuctionGrid />
      </main>
    </div>
  );
};

export default AuctionsPage;