import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Heart } from 'lucide-react';

interface WatchlistButtonProps {
  auctionId: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

const WatchlistButton: React.FC<WatchlistButtonProps> = ({
  auctionId,
  variant = 'ghost',
  size = 'sm',
  className = ''
}) => {
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkWatchlistStatus();
  }, [auctionId]);

  const checkWatchlistStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('watchlist')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('auction_id', auctionId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking watchlist status:', error);
        return;
      }

      setIsInWatchlist(!!data);
    } catch (error) {
      console.error('Error checking watchlist status:', error);
    }
  };

  const toggleWatchlist = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Please login',
          description: 'You need to be logged in to manage your watchlist',
          variant: 'destructive'
        });
        return;
      }

      if (isInWatchlist) {
        // Remove from watchlist
        const { error } = await supabase
          .from('watchlist')
          .delete()
          .eq('user_id', session.user.id)
          .eq('auction_id', auctionId);

        if (error) {
          toast({
            title: 'Error',
            description: 'Failed to remove from watchlist',
            variant: 'destructive'
          });
          return;
        }

        setIsInWatchlist(false);
        toast({ title: 'Removed from watchlist' });
      } else {
        // Add to watchlist
        const { error } = await supabase
          .from('watchlist')
          .insert({
            user_id: session.user.id,
            auction_id: auctionId
          });

        if (error) {
          toast({
            title: 'Error',
            description: 'Failed to add to watchlist',
            variant: 'destructive'
          });
          return;
        }

        setIsInWatchlist(true);
        toast({ title: 'Added to watchlist' });
      }
    } catch (error) {
      console.error('Error toggling watchlist:', error);
      toast({
        title: 'Error',
        description: 'Failed to update watchlist',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggleWatchlist}
      disabled={loading}
      className={`${className} ${isInWatchlist ? 'text-red-500 hover:text-red-600' : ''}`}
    >
      <Heart
        className={`h-4 w-4 ${isInWatchlist ? 'fill-current' : ''}`}
      />
    </Button>
  );
};

export default WatchlistButton;