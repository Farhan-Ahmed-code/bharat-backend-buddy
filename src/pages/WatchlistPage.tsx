import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Heart, Clock, DollarSign, Trash2 } from 'lucide-react';

interface WatchlistItem {
  id: string;
  auction_id: string;
  created_at: string;
  auctions: {
    id: string;
    title: string;
    current_price: number;
    end_time: string;
    status: string;
    image_url: string | null;
  };
}

const WatchlistPage: React.FC = () => {
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadWatchlist();
  }, []);

  const loadWatchlist = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Please login to view your watchlist', variant: 'destructive' });
        return;
      }

      const { data, error } = await supabase
        .from('watchlist')
        .select(`
          id,
          auction_id,
          created_at,
          auctions (
            id,
            title,
            current_price,
            end_time,
            status,
            image_url
          )
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        toast({ title: 'Error loading watchlist', description: error.message, variant: 'destructive' });
        return;
      }

      setWatchlistItems(data || []);
    } catch (error) {
      console.error('Error loading watchlist:', error);
      toast({ title: 'Error', description: 'Failed to load watchlist', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const removeFromWatchlist = async (watchlistId: string) => {
    try {
      const { error } = await supabase
        .from('watchlist')
        .delete()
        .eq('id', watchlistId);

      if (error) {
        toast({ title: 'Error removing from watchlist', description: error.message, variant: 'destructive' });
        return;
      }

      setWatchlistItems(prev => prev.filter(item => item.id !== watchlistId));
      toast({ title: 'Removed from watchlist' });
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      toast({ title: 'Error', description: 'Failed to remove from watchlist', variant: 'destructive' });
    }
  };

  const getTimeRemaining = (endTime: string) => {
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const distance = end - now;

    if (distance <= 0) return 'Ended';

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <Card className="max-w-6xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              My Watchlist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Loading your watchlist...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Heart className="h-8 w-8 text-red-500" />
            My Watchlist
          </h1>
          <p className="text-muted-foreground mt-2">
            {watchlistItems.length} saved auction{watchlistItems.length !== 1 ? 's' : ''}
          </p>
        </div>

        {watchlistItems.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Your watchlist is empty</h3>
              <p className="text-muted-foreground mb-4">
                Start saving auctions you're interested in to keep track of them here.
              </p>
              <Button asChild>
                <Link to="/auctions">Browse Auctions</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {watchlistItems.map((item) => (
              <Card key={item.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <Badge
                      variant={item.auctions.status === 'ended' ? "destructive" : "secondary"}
                      className="mb-2"
                    >
                      {item.auctions.status === 'ended' ? "Ended" : "Active"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromWatchlist(item.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold line-clamp-2">
                      <Link
                        to={`/auction/${item.auctions.id}`}
                        className="hover:text-blue-600 transition-colors"
                      >
                        {item.auctions.title}
                      </Link>
                    </h3>

                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="font-semibold">
                        ₹{item.auctions.current_price.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="text-muted-foreground">
                        {getTimeRemaining(item.auctions.end_time)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button asChild className="flex-1">
                      <Link to={`/auction/${item.auctions.id}`}>
                        View Details
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WatchlistPage;