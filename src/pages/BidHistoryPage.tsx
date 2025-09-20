import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, User, Clock, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BidWithUser {
  id: string;
  amount: number;
  bidder_id: string;
  bid_time: string;
  profiles: {
    username: string;
    email: string;
  };
}

interface Auction {
  id: string;
  title: string;
  current_price: number;
  end_time: string;
  status: string;
}

const BidHistoryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [auction, setAuction] = useState<Auction | null>(null);
  const [bids, setBids] = useState<BidWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      try {
        setLoading(true);

        // Load auction details
        const { data: auctionData, error: auctionError } = await supabase
          .from('auctions')
          .select('id,title,current_price,end_time,status')
          .eq('id', id)
          .single();

        if (auctionError) {
          toast({ title: 'Error loading auction', description: auctionError.message, variant: 'destructive' });
          return;
        }

        setAuction(auctionData);

        // Load bids with user profiles
        const { data: bidsData, error: bidsError } = await supabase
          .from('bids')
          .select(`
            id,
            amount,
            bidder_id,
            bid_time,
            profiles:users!bids_bidder_id_fkey (
              username,
              email
            )
          `)
          .eq('auction_id', id)
          .order('bid_time', { ascending: false });

        if (bidsError) {
          toast({ title: 'Error loading bids', description: bidsError.message, variant: 'destructive' });
          return;
        }

        setBids(bidsData || []);
      } catch (error) {
        console.error('Error loading data:', error);
        toast({ title: 'Error', description: 'Failed to load auction and bid data', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, toast]);

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Loading bid history...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="container mx-auto p-4">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Auction not found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>The auction you're looking for doesn't exist.</p>
            <Button asChild className="mt-4">
              <Link to="/auctions">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Auctions
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link to={`/auction/${id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Auction
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{auction.title}</h1>
            <p className="text-muted-foreground">Bid History ({bids.length} bids)</p>
          </div>
        </div>

        {/* Auction Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Auction Summary
              <Badge variant={auction.status === 'ended' ? "destructive" : "secondary"}>
                {auction.status === 'ended' ? "Ended" : "Active"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Current Price</p>
                  <p className="text-lg font-semibold">₹{auction.current_price.toLocaleString('en-IN')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">End Time</p>
                  <p className="text-lg font-semibold">
                    {new Date(auction.end_time).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Bidders</p>
                  <p className="text-lg font-semibold">{new Set(bids.map(b => b.bidder_id)).size}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bid History */}
        <Card>
          <CardHeader>
            <CardTitle>Detailed Bid History</CardTitle>
          </CardHeader>
          <CardContent>
            {bids.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No bids have been placed yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bids.map((bid, index) => (
                  <div
                    key={bid.id}
                    className={`p-4 rounded-lg border ${
                      index === 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                          index === 0 ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold">₹{bid.amount.toLocaleString('en-IN')}</p>
                          <p className="text-sm text-muted-foreground">
                            by {bid.profiles?.username || bid.profiles?.email?.split('@')[0] || 'Anonymous'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {new Date(bid.bid_time).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(bid.bid_time).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    {index === 0 && (
                      <div className="mt-2">
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Winning Bid
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BidHistoryPage;