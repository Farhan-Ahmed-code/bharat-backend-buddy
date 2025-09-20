import React, { useEffect, useMemo, useState } from 'react';
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
  seller_id: string;
  winner_id: string | null;
  payment_status?: string | null;
}

interface Shipment {
  auction_id: string;
  status: string;
  tracking_number: string | null;
  carrier: string | null;
}

const MyAuctionsPage: React.FC = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [selling, setSelling] = useState<Auction[]>([]);
  const [bidding, setBidding] = useState<Auction[]>([]);
  const [shipments, setShipments] = useState<Record<string, Shipment>>({});
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const { data: session } = await supabase.auth.getSession();
      const uid = session?.session?.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;

      // Load auctions the user is selling
      const { data: a1 } = await supabase
        .from('auctions')
        .select('id,title,current_price,status,seller_id,winner_id,payment_status')
        .eq('seller_id', uid)
        .order('created_at', { ascending: false });
      const sellingList = (a1 as Auction[]) || [];
      setSelling(sellingList);

      // Bids placed by user -> fetch those auctions
      const { data: b1 } = await supabase
        .from('bids')
        .select('auction_id')
        .eq('bidder_id', uid);
      const bidAuctionIds = Array.from(new Set((b1 || []).map((b: any) => b.auction_id)));
      let biddingList: Auction[] = [];
      if (bidAuctionIds.length) {
        const { data: a3 } = await supabase
          .from('auctions')
          .select('id,title,current_price,status,seller_id,winner_id,payment_status')
          .in('id', bidAuctionIds);
        biddingList = (a3 as Auction[]) || [];
        setBidding(biddingList);
      } else {
        setBidding([]);
      }

      // Fetch shipments for all relevant auctions (selling + bidding)
      const allIds = Array.from(new Set([...sellingList, ...biddingList].map((a) => a.id)));
      if (allIds.length) {
        const { data: s } = await supabase
          .from('shipments')
          .select('auction_id,status,tracking_number,carrier')
          .in('auction_id', allIds);
        const map: Record<string, Shipment> = {};
        (s || []).forEach((row: any) => {
          map[row.auction_id] = {
            auction_id: row.auction_id,
            status: row.status,
            tracking_number: row.tracking_number,
            carrier: row.carrier,
          };
        });
        setShipments(map);
      } else {
        setShipments({});
      }
    };
    load();
  }, []);

  const isWinner = (a: Auction) => userId && a.winner_id === userId;
  const isSeller = (a: Auction) => userId && a.seller_id === userId;

  const ShipmentInfo: React.FC<{ a: Auction }> = ({ a }) => {
    const sh = shipments[a.id];

    // Seller view: show action when paid
    if (isSeller(a) && a.winner_id && a.payment_status === 'paid') {
      return (
        <div className="flex items-center gap-2">
          {sh ? (
            <>
              <div className="text-sm">
                <span className="font-medium">Shipment:</span> {sh.status}
                {sh.tracking_number && (
                  <> — {sh.carrier ?? 'Carrier'} #{sh.tracking_number}</>
                )}
              </div>
              <Button size="sm" variant="secondary" onClick={() => navigate(`/shipment/${a.id}`)}>
                Update Shipping
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => navigate(`/shipment/${a.id}`)}>
              Enter Shipping Details
            </Button>
          )}
        </div>
      );
    }

    // Buyer view: if you won & paid, show tracking
    if (isWinner(a) && a.payment_status === 'paid') {
      return (
        <div className="text-sm text-muted-foreground">
          {sh ? (
            <>
              <span className="font-medium text-foreground">Your Order:</span> {sh.status}
              {sh.tracking_number && (
                <> — {sh.carrier ?? 'Carrier'} #{sh.tracking_number}</>
              )}
            </>
          ) : (
            <>Awaiting seller to ship…</>
          )}
        </div>
      );
    }

    return null;
  };

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
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => navigate(`/auction/${a.id}`)}>View</Button>
              </div>
            </div>
            <div className="mt-2">
              <ShipmentInfo a={a} />
            </div>
          </CardContent>
        </Card>
      ))}
      {items.length === 0 && <div className="text-sm text-muted-foreground">No items found.</div>}
    </div>
  );

  const tabs = useMemo(() => (
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
  ), [selling, bidding]);

  return (
    <div className="container mx-auto p-4">
      {tabs}
    </div>
  );
};

export default MyAuctionsPage;