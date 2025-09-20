import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { Gavel, Users, TrendingUp, Star, ArrowRight, Clock, IndianRupee, Shield, MapPin, Zap } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import heroImage from '@/assets/hero-auction.jpg';

const Index = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [stats, setStats] = useState({ auctions: 0, users: 0, bids: 0 });
  const [featuredAuctions, setFeaturedAuctions] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Get initial auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    fetchStats();
    fetchFeaturedAuctions();

    return () => subscription.unsubscribe();
  }, []);

  const fetchStats = async () => {
    const [
      { count: auctionCount },
      { count: userCount },
      { count: bidCount }
    ] = await Promise.all([
      supabase.from('auctions').select('*', { count: 'exact' }),
      supabase.from('profiles').select('*', { count: 'exact' }),
      supabase.from('bids').select('*', { count: 'exact' })
    ]);

    setStats({
      auctions: auctionCount || 0,
      users: userCount || 0,
      bids: bidCount || 0
    });
  };

  const fetchFeaturedAuctions = async () => {
    const { data } = await supabase
      .from('auctions')
      .select(`
        id,
        title,
        current_price,
        end_time,
        image_url,
        categories (name)
      `)
      .eq('status', 'active')
      .gte('end_time', new Date().toISOString())
      .order('current_price', { ascending: false })
      .limit(3);

    setFeaturedAuctions(data || []);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative container mx-auto text-center text-white">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            <span lang="hi">भारत का सबसे बड़ा</span>
            <br />
            <span className="text-yellow-400">Auction Platform</span>
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-3xl mx-auto">
            Discover unique treasures from across India. Bid on antiques, art, vehicles, and rare collectibles from the comfort of your home.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <>
                <Button 
                  size="lg" 
                  className="bg-white text-primary hover:bg-white/90"
                  onClick={() => navigate('/auctions')}
                >
                  <Gavel className="mr-2 h-5 w-5" />
                  Browse Auctions
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-white text-white hover:bg-white/10"
                  onClick={() => navigate('/create-auction')}
                >
                  Create Auction
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </>
            ) : (
              <Button 
                size="lg" 
                className="bg-white text-primary hover:bg-white/90"
                onClick={() => navigate('/auth')}
              >
                Get Started Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 bg-card-elevated">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-primary">
                <Gavel className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-primary mb-2">{stats.auctions}+</h3>
              <p className="text-muted-foreground">Active Auctions</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-secondary">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-secondary mb-2">{stats.users}+</h3>
              <p className="text-muted-foreground">Registered Users</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-accent">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-accent mb-2">{stats.bids}+</h3>
              <p className="text-muted-foreground">Total Bids Placed</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Auctions */}
      {featuredAuctions.length > 0 && (
        <section className="py-16 px-4">
          <div className="container mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Featured Auctions</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Explore some of the most exciting auctions currently live on our platform
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {featuredAuctions.map((auction) => (
                <Card 
                  key={auction.id} 
                  className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105"
                  onClick={() => navigate(`/auction/${auction.id}`)}
                >
                  <div className="relative overflow-hidden rounded-t-lg">
                    {auction.image_url ? (
                      <img 
                        src={auction.image_url} 
                        alt={auction.title}
                        className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                    ) : (
                      <div className="h-48 bg-gradient-card flex items-center justify-center">
                        <Star className="h-12 w-12 text-primary" />
                      </div>
                    )}
                    
                    {auction.categories && (
                      <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground">
                        {auction.categories.name}
                      </Badge>
                    )}
                  </div>
                  
                  <CardHeader>
                    <CardTitle className="line-clamp-2">{auction.title}</CardTitle>
                    <CardDescription className="flex items-center text-primary font-semibold">
                      <IndianRupee className="h-4 w-4 mr-1" />
                      {formatPrice(auction.current_price)}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 mr-1" />
                        Ending soon
                      </div>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="text-center mt-8">
              <Button onClick={() => navigate('/auctions')}>
                View All Auctions
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-16 px-4 bg-card-elevated">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose QuickBidder?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Experience the most trusted and feature-rich auction platform designed for Indian buyers and sellers
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="text-center p-6">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-primary">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="mb-3">Secure & Trusted</CardTitle>
              <CardDescription>
                Advanced security measures and verified sellers ensure safe transactions for all users
              </CardDescription>
            </Card>
            
            <Card className="text-center p-6">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-secondary">
                <MapPin className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="mb-3">Pan-India Network</CardTitle>
              <CardDescription>
                Connect with buyers and sellers from every corner of India with localized support
              </CardDescription>
            </Card>
            
            <Card className="text-center p-6">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-accent">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="mb-3">Real-time Bidding</CardTitle>
              <CardDescription>
                Live auction updates and instant notifications keep you ahead in the bidding process
              </CardDescription>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="py-16 px-4 bg-gradient-hero">
          <div className="container mx-auto text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Ready to Start Your Auction Journey?</h2>
            <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
              Join thousands of satisfied users who trust QuickBidder for their buying and selling needs
            </p>
            <Button 
              size="lg" 
              className="bg-white text-primary hover:bg-white/90"
              onClick={() => navigate('/auth')}
            >
              Create Free Account
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </section>
      )}
      
      {/* Footer */}
      <footer className="py-8 px-4 border-t bg-card">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>&copy; 2024 QuickBidder. Made with ❤️ for India.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
