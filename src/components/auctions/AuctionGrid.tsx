import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Clock, IndianRupee, Users, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface Auction {
  id: string;
  title: string;
  description: string | null;
  starting_price: number;
  current_price: number;
  end_time: string;
  status: string;
  approval_status: string;
  image_url: string | null;
  category_name: string | null;
  bid_count?: number;
}

const AuctionGrid = () => {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchAuctions();
  }, [search, category]);

  const fetchAuctions = async () => {
    try {
      let query = (supabase as any)
        .from('auctions_with_bid_count')
        .select('*')
        .eq('status', 'active')
        .eq('approval_status', 'approved') // Only show approved auctions
        .gte('end_time', new Date().toISOString());

      if (search) {
        query = query.ilike('title', `%${search}%`);
      }
      if (category) {
        query = query.eq('category_name', category);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      const normalized: Auction[] = (data || []).map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description ?? null,
        starting_price: row.starting_price,
        current_price: row.current_price,
        end_time: row.end_time,
        status: row.status,
        image_url: row.image_url ?? null,
        category_name: row.category_name ?? null,
        bid_count: row.bid_count ?? 0,
      }));
      setAuctions(normalized);
    } catch (error: any) {
      toast({
        title: "Error loading auctions",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getTimeRemaining = (endTime: string) => {
    const now = new Date();
    const end = new Date(endTime);
    
    if (end <= now) {
      return 'Ended';
    }
    
    return `${formatDistanceToNow(end)} left`;
  };

  const isEndingSoon = (endTime: string) => {
    const now = new Date();
    const end = new Date(endTime);
    const hoursLeft = (end.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursLeft <= 24 && hoursLeft > 0;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-48 bg-muted rounded-t-lg" />
            <CardHeader>
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Live Auctions</h1>
          <p className="text-muted-foreground">Discover unique items from across India</p>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="Search title" value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} />
          <Input placeholder="Category" value={category ?? ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCategory(e.target.value || null)} />
          <Button onClick={() => navigate('/create-auction')}>Create Auction</Button>
        </div>
      </div>

      {auctions.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <h3 className="text-lg font-medium mb-2">No Active Auctions</h3>
            <p className="text-muted-foreground mb-4">
              Be the first to create an auction on our platform!
            </p>
            <Button onClick={() => navigate('/create-auction')}>
              Create Your First Auction
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {auctions.map((auction) => (
            <Card 
              key={auction.id} 
              className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
              onClick={() => navigate(`/auction/${auction.id}`)}
            >
              <div className="relative overflow-hidden rounded-t-lg">
                {auction.image_url ? (
                  <img 
                    src={auction.image_url} 
                    alt={auction.title}
                    className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="h-48 bg-gradient-card flex items-center justify-center">
                    <Eye className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                
                {isEndingSoon(auction.end_time) && (
                  <Badge className="absolute top-2 right-2 bg-destructive text-destructive-foreground">
                    Ending Soon!
                  </Badge>
                )}
                
                {auction.category_name && (
                  <Badge className="absolute top-2 left-2 bg-secondary text-secondary-foreground">
                    {auction.category_name}
                  </Badge>
                )}
              </div>
              
              <CardHeader>
                <CardTitle className="line-clamp-2">{auction.title}</CardTitle>
                {auction.description && (
                  <CardDescription className="line-clamp-2">
                    {auction.description}
                  </CardDescription>
                )}
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Current Bid</p>
                      <p className="text-xl font-bold text-primary flex items-center">
                        <IndianRupee className="h-4 w-4 mr-1" />
                        {formatPrice(auction.current_price)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Starting Price</p>
                      <p className="text-sm line-through text-muted-foreground">
                        {formatPrice(auction.starting_price)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <Clock className="h-4 w-4 mr-1" />
                      {getTimeRemaining(auction.end_time)}
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Users className="h-4 w-4 mr-1" />
                      {auction.bid_count || 0} bids
                    </div>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter>
                <Button className="w-full" size="sm">
                  View Auction
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AuctionGrid;