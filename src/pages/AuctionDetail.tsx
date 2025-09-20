import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, History } from 'lucide-react';
import WatchlistButton from '@/components/WatchlistButton';

interface Bid {
  id: string;
  amount: number;
  bidder_id: string;
  bid_time: string;
}

interface Auction {
  id: string;
  title: string;
  current_price: number;
  end_time: string;
  status: string;
}

const AuctionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [auction, setAuction] = useState<Auction | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [amount, setAmount] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isEnded, setIsEnded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [{ data: a }, { data: b }] = await Promise.all([
        supabase.from('auctions').select('id,title,current_price,end_time,status').eq('id', id).single(),
        supabase.from('bids').select('*').eq('auction_id', id).order('bid_time', { ascending: false }),
      ]);
      if (a) setAuction({ id: a.id, title: a.title, current_price: a.current_price, end_time: a.end_time, status: a.status });
      setBids((b || []) as Bid[]);
    };
    load();
  }, [id]);

  // Countdown timer effect
  useEffect(() => {
    if (!auction?.end_time) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const endTime = new Date(auction.end_time).getTime();
      const distance = endTime - now;

      if (distance <= 0) {
        setTimeLeft('Auction Ended');
        setIsEnded(true);
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
      setIsEnded(false);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [auction?.end_time]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`bids-auction-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bids', filter: `auction_id=eq.${id}` }, (payload) => {
        const newBid = payload.new as any;
        setBids((prev) => [{ id: newBid.id, amount: newBid.amount, bidder_id: newBid.bidder_id, bid_time: newBid.bid_time }, ...prev]);
        setAuction((prev) => (prev ? { ...prev, current_price: Math.max(prev.current_price, newBid.amount) } : prev));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const placeBid = useCallback(async () => {
    if (!id) return;

    // Check if auction has ended
    if (isEnded) {
      toast({ title: 'Auction Ended', description: 'You cannot bid on ended auctions', variant: 'destructive' });
      return;
    }

    const value = parseInt(amount, 10);
    if (isNaN(value) || value <= 0) {
      toast({ title: 'Invalid amount', variant: 'destructive' });
      return;
    }

    // Check if bid is higher than current price
    if (value <= auction!.current_price) {
      toast({ title: 'Bid too low', description: 'Your bid must be higher than the current price', variant: 'destructive' });
      return;
    }

    const { data: session } = await supabase.auth.getSession();
    const bidderId = session?.session?.user?.id ?? '';
    const { error } = await supabase.from('bids').insert({ auction_id: id, amount: value, bidder_id: bidderId });
    if (error) toast({ title: 'Bid failed', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Bid placed successfully!' });
      setAmount('');
    }
  }, [amount, id, toast, isEnded, auction]);

  if (!auction) {
    return (
      <Card className="mx-auto mt-8 max-w-2xl">
        <CardHeader>
          <CardTitle>Loading auction…</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="container mx-auto p-4 grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {auction.title}
              <Badge variant={isEnded ? "destructive" : "secondary"}>
                {isEnded ? "Ended" : "Active"}
              </Badge>
            </div>
            <WatchlistButton auctionId={auction.id} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl mb-4">Current Price: ₹{auction.current_price.toLocaleString('en-IN')}</div>

          {/* Countdown Timer */}
          <div className={`mb-4 p-3 rounded-lg border ${isEnded ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
            <div className="flex items-center gap-2">
              {isEnded ? (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              ) : (
                <Clock className="h-5 w-5 text-blue-600" />
              )}
              <div>
                <div className={`text-sm font-medium ${isEnded ? 'text-red-800' : 'text-blue-800'}`}>
                  {isEnded ? 'Auction Ended' : 'Time Remaining'}
                </div>
                <div className={`text-lg font-bold ${isEnded ? 'text-red-900' : 'text-blue-900'}`}>
                  {timeLeft}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter your bid"
              disabled={isEnded}
            />
            <Button onClick={placeBid} disabled={isEnded}>
              {isEnded ? 'Auction Ended' : 'Place Bid'}
            </Button>
          </div>

          {isEnded && (
            <div className="mt-2 text-sm text-red-600 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              Bidding is no longer available for this auction
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Bid History
            <Button variant="outline" size="sm" asChild>
              <Link to={`/auction/${id}/bids`}>
                <History className="mr-2 h-4 w-4" />
                View Full History
              </Link>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[400px] overflow-auto">
            {bids.map((b) => (
              <div key={b.id} className="flex justify-between text-sm">
                <span>₹{b.amount.toLocaleString('en-IN')}</span>
                <span className="text-muted-foreground">{new Date(b.bid_time).toLocaleString()}</span>
              </div>
            ))}
            {bids.length === 0 && <div className="text-sm text-muted-foreground">No bids yet.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuctionDetail;


