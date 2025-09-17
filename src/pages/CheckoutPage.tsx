import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface Auction {
  id: string;
  title: string;
  current_price: number;
  winner_id: string | null;
}

const CheckoutPage: React.FC = () => {
  const { auctionId } = useParams<{ auctionId: string }>();
  const [auction, setAuction] = useState<Auction | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      if (!auctionId) return;
      const { data, error } = await supabase
        .from('auctions')
        .select('id,title,current_price,winner_id')
        .eq('id', auctionId)
        .single();
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        return;
      }
      setAuction(data as Auction);
    };
    load();
  }, [auctionId, toast]);

  const startPayment = useCallback(async () => {
    if (!auction) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).functions.invoke('create_payment_order', {
        body: { auction_id: auction.id },
      });
      if (error) throw error;
      const { order_id, key_id } = data as { order_id: string; key_id: string };

      const options = {
        key: key_id,
        amount: auction.current_price * 100,
        currency: 'INR',
        name: 'QuickBidder',
        description: auction.title,
        order_id,
        handler: () => {
          toast({ title: 'Payment submitted', description: 'Awaiting confirmation...' });
          navigate('/');
        },
        prefill: {},
        theme: { color: '#f59e0b' },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast({ title: 'Payment error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [auction, navigate, toast]);

  if (!auction) {
    return (
      <Card className="mx-auto mt-12 max-w-lg">
        <CardHeader>
          <CardTitle>Loading checkout…</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="mx-auto mt-12 max-w-lg">
      <CardHeader>
        <CardTitle>Checkout: {auction.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-lg">Amount: ₹{auction.current_price.toLocaleString('en-IN')}</div>
          <Button onClick={startPayment} disabled={loading}>
            {loading ? 'Starting…' : 'Pay with Razorpay'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CheckoutPage;


