import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface Auction {
  id: string;
  title: string;
  seller_id: string;
  winner_id: string | null;
  payment_status: string | null;
}

interface Shipment {
  auction_id: string;
  tracking_number: string | null;
  carrier: string | null;
  status: string;
  shipping_address: string | null;
}

const ShipmentPage: React.FC = () => {
  const { auctionId } = useParams<{ auctionId: string }>();
  const [auction, setAuction] = useState<Auction | null>(null);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  const canCreateShipment = useMemo(() => {
    if (!auction) return false;
    return auction.winner_id && auction.payment_status === 'paid';
  }, [auction]);

  useEffect(() => {
    const load = async () => {
      try {
        if (!auctionId) return;
        const { data: session } = await supabase.auth.getSession();
        const userId = session?.session?.user?.id;
        if (!userId) {
          toast({ title: 'Not signed in', variant: 'destructive' });
          navigate('/auth');
          return;
        }

        // Load auction and validate seller
        const { data: a, error: ae } = await supabase
          .from('auctions')
          .select('id,title,seller_id,winner_id,payment_status')
          .eq('id', auctionId)
          .single();
        if (ae) throw ae;
        const auctionData = a as Auction;
        if (auctionData.seller_id !== userId) {
          toast({ title: 'Access denied', description: 'Only the seller can add shipping details.', variant: 'destructive' });
          navigate(`/auction/${auctionId}`);
          return;
        }
        setAuction(auctionData);

        // Attempt to load existing shipment
        const { data: s } = await supabase
          .from('shipments')
          .select('auction_id,tracking_number,carrier,status,shipping_address')
          .eq('auction_id', auctionId)
          .maybeSingle();
        if (s) {
          const ship = s as Shipment;
          setShipment(ship);
          setTrackingNumber(ship.tracking_number ?? '');
          setCarrier(ship.carrier ?? '');
          setDestinationAddress(ship.shipping_address ?? '');
        }

        // Load winner address if not in shipment yet
        if (!s && auctionData.winner_id) {
          const { data: p } = await supabase
            .from('profiles')
            .select('address,city,state,pincode')
            .eq('user_id', auctionData.winner_id)
            .single();
          if (p) {
            const formatted = [p.address, p.city, p.state, p.pincode].filter(Boolean).join(', ');
            setDestinationAddress(formatted);
          }
        }
      } catch (e: any) {
        toast({ title: 'Error', description: e.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [auctionId, navigate, toast]);

  const submit = useCallback(async () => {
    if (!auction || !auctionId) return;
    if (!canCreateShipment) {
      toast({ title: 'Cannot create shipment', description: 'Auction must be paid and have a winner.', variant: 'destructive' });
      return;
    }
    if (!trackingNumber || !carrier) {
      toast({ title: 'Missing info', description: 'Please enter tracking number and carrier.', variant: 'destructive' });
      return;
    }
    try {
      const payload = {
        auction_id: auctionId,
        seller_id: auction.seller_id,
        winner_id: auction.winner_id,
        shipping_address: destinationAddress || null,
        tracking_number: trackingNumber,
        carrier,
        status: 'Shipped',
      } as any;

      // Upsert by auction_id
      const { error } = await (supabase as any)
        .from('shipments')
        .upsert(payload, { onConflict: 'auction_id' });
      if (error) throw error;

      toast({ title: 'Shipment saved', description: 'Tracking info updated.' });
      navigate('/my-auctions');
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    }
  }, [auction, auctionId, canCreateShipment, carrier, destinationAddress, navigate, toast, trackingNumber]);

  if (loading) {
    return (
      <Card className="mx-auto mt-8 max-w-2xl">
        <CardHeader>
          <CardTitle>Loading shipment…</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!auction) return null;

  return (
    <Card className="mx-auto mt-8 max-w-2xl">
      <CardHeader>
        <CardTitle>Shipping for: {auction.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label>Destination Address</Label>
            <Input value={destinationAddress} onChange={(e) => setDestinationAddress(e.target.value)} placeholder="Buyer address" />
            <div className="text-xs text-muted-foreground mt-1">Pre-filled from buyer profile. Edit if needed.</div>
          </div>
          <div>
            <Label>Carrier</Label>
            <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="e.g., Blue Dart, Delhivery, India Post" />
          </div>
          <div>
            <Label>Tracking Number</Label>
            <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="Enter tracking number" />
          </div>
          <div className="flex justify-end">
            <Button onClick={submit}>{shipment ? 'Update Shipping' : 'Create Shipment'}</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShipmentPage;