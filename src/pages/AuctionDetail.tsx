import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

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
  endingSoon?: boolean;
}

const AuctionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [auction, setAuction] = useState<Auction | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [amount, setAmount] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [{ data: a }, { data: b }] = await Promise.all([
        supabase.from('auctions').select('id,title,current_price,end_time').eq('id', id).single(),
        supabase.from('bids').select('*').eq('auction_id', id).order('bid_time', { ascending: false }),
      ]);
      if (a) setAuction({ id: a.id, title: a.title, current_price: a.current_price });
      setBids((b || []) as Bid[]);
    };
    load();
  }, [id]);

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
    const value = parseInt(amount, 10);
    if (isNaN(value) || value <= 0) {
      toast({ title: 'Invalid amount', variant: 'destructive' });
      return;
    }
    const { data: session } = await supabase.auth.getSession();
    const bidderId = session?.session?.user?.id ?? '';
    const { error } = await supabase.from('bids').insert({ auction_id: id, amount: value, bidder_id: bidderId });
    if (error) toast({ title: 'Bid failed', description: error.message, variant: 'destructive' });
    else setAmount('');
  }, [amount, id, toast]);

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
          <CardTitle>{auction.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl mb-4">Current Price: ₹{auction.current_price.toLocaleString('en-IN')}</div>
          <div className="flex gap-2">
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter your bid" />
            <Button onClick={placeBid}>Place Bid</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bid History</CardTitle>
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


