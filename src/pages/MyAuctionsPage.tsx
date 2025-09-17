import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface Auction {
  id: string;
  title: string;
  current_price: number;
  status: string;
}

const MyAuctionsPage: React.FC = () => {
  const [selling, setSelling] = useState<Auction[]>([]);
  const [bidding, setBidding] = useState<Auction[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      if (!userId) return;
      const [{ data: a1 }, { data: a2 }] = await Promise.all([
        supabase.from('auctions').select('id,title,current_price,status').eq('seller_id', userId).order('created_at', { ascending: false }),
        supabase.from('bids').select('auction_id').eq('bidder_id', userId),
      ]);
      setSelling((a1 as Auction[]) || []);
      const bidAuctionIds = Array.from(new Set((a2 || []).map((b: any) => b.auction_id)));
      if (bidAuctionIds.length) {
        const { data: a3 } = await supabase.from('auctions').select('id,title,current_price,status').in('id', bidAuctionIds);
        setBidding((a3 as Auction[]) || []);
      }
    };
    load();
  }, []);

  const renderList = (items: Auction[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map((a) => (
        <Card key={a.id}>
          <CardHeader>
            <CardTitle className="text-base">{a.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>₹{a.current_price.toLocaleString('en-IN')}</div>
              <Button size="sm" onClick={() => navigate(`/auction/${a.id}`)}>View</Button>
            </div>
          </CardContent>
        </Card>
      ))}
      {items.length === 0 && <div className="text-sm text-muted-foreground">No items found.</div>}
    </div>
  );

  return (
    <div className="container mx-auto p-4">
      <Tabs defaultValue="selling">
        <TabsList>
          <TabsTrigger value="selling">Auctions I'm Selling</TabsTrigger>
          <TabsTrigger value="bidding">Auctions I've Bid On</TabsTrigger>
        </TabsList>
        <TabsContent value="selling" className="mt-4">
          {renderList(selling)}
        </TabsContent>
        <TabsContent value="bidding" className="mt-4">
          {renderList(bidding)}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyAuctionsPage;


