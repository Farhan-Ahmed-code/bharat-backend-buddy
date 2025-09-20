import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Gavel, IndianRupee, TrendingUp, Calendar, Download, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AnalyticsStats {
  totalRevenue: number;
  totalBids: number;
  avgAuctionPrice: number;
  completionRate: number;
  mostActiveUsers: Array<{
    user_id: string;
    full_name: string | null;
    bid_count: number;
    total_spent: number;
  }>;
  topAuctions: Array<{
    id: string;
    title: string;
    final_price: number;
    bid_count: number;
    seller_name: string | null;
  }>;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
    auction_count: number;
  }>;
}

const AnalyticsDashboard = () => {
  const [stats, setStats] = useState<AnalyticsStats>({
    totalRevenue: 0,
    totalBids: 0,
    avgAuctionPrice: 0,
    completionRate: 0,
    mostActiveUsers: [],
    topAuctions: [],
    revenueByMonth: []
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      // Fetch comprehensive analytics data
      const [
        { data: revenueData },
        { data: bidsData },
        { data: avgPriceData },
        { data: completionData },
        { data: activeUsersData },
        { data: topAuctionsData },
        { data: monthlyRevenueData }
      ] = await Promise.all([
        // Total revenue from completed auctions
        supabase
          .from('auctions')
          .select('current_price')
          .eq('status', 'completed')
          .eq('approval_status', 'approved'),

        // Total bids count
        supabase
          .from('bids')
          .select('id', { count: 'exact' }),

        // Average auction price
        supabase
          .rpc('get_avg_auction_price'),

        // Completion rate
        supabase
          .rpc('get_completion_rate'),

        // Most active users
        supabase
          .rpc('get_most_active_users', { limit_count: 10 }),

        // Top performing auctions
        supabase
          .rpc('get_top_auctions', { limit_count: 10 }),

        // Monthly revenue data
        supabase
          .rpc('get_monthly_revenue', { months_back: 12 })
      ]);

      // Calculate total revenue
      const totalRevenue = revenueData?.reduce((sum, auction) => sum + auction.current_price, 0) || 0;

      // Get total bids
      const totalBids = bidsData?.length || 0;

      // Get average price (fallback to 0 if no data)
      const avgAuctionPrice = avgPriceData || 0;

      // Get completion rate (fallback to 0 if no data)
      const completionRate = completionData || 0;

      setStats({
        totalRevenue,
        totalBids,
        avgAuctionPrice,
        completionRate,
        mostActiveUsers: activeUsersData || [],
        topAuctions: topAuctionsData || [],
        revenueByMonth: monthlyRevenueData || []
      });

    } catch (error: any) {
      toast({
        title: "Error loading analytics data",
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
    }).format(price);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-8 bg-muted rounded w-3/4" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          Comprehensive insights into your auction platform performance
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              From completed auctions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bids</CardTitle>
            <Gavel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBids.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across all auctions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Auction Price</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(stats.avgAuctionPrice)}</div>
            <p className="text-xs text-muted-foreground">
              Per completed auction
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(stats.completionRate)}</div>
            <p className="text-xs text-muted-foreground">
              Auctions with bids
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Most Active Users</TabsTrigger>
          <TabsTrigger value="auctions">Top Auctions</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Most Active Users</CardTitle>
              <CardDescription>
                Users with the highest bidding activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Total Bids</TableHead>
                    <TableHead>Total Spent</TableHead>
                    <TableHead>Activity Level</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.mostActiveUsers.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium">
                        {user.full_name || 'Anonymous User'}
                      </TableCell>
                      <TableCell>{user.bid_count}</TableCell>
                      <TableCell>{formatPrice(user.total_spent)}</TableCell>
                      <TableCell>
                        <Badge variant={user.bid_count > 50 ? 'default' : user.bid_count > 20 ? 'secondary' : 'outline'}>
                          {user.bid_count > 50 ? 'High' : user.bid_count > 20 ? 'Medium' : 'Low'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {stats.mostActiveUsers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No user activity data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auctions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Auctions</CardTitle>
              <CardDescription>
                Auctions with highest final prices and most bids
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Auction Title</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Final Price</TableHead>
                    <TableHead>Total Bids</TableHead>
                    <TableHead>Performance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.topAuctions.map((auction) => (
                    <TableRow key={auction.id}>
                      <TableCell className="font-medium max-w-xs truncate">
                        {auction.title}
                      </TableCell>
                      <TableCell>{auction.seller_name || 'Unknown'}</TableCell>
                      <TableCell>{formatPrice(auction.final_price)}</TableCell>
                      <TableCell>{auction.bid_count}</TableCell>
                      <TableCell>
                        <Badge variant={auction.final_price > 50000 ? 'default' : auction.final_price > 10000 ? 'secondary' : 'outline'}>
                          {auction.final_price > 50000 ? 'High Value' : auction.final_price > 10000 ? 'Medium Value' : 'Low Value'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {stats.topAuctions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No completed auctions data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Revenue Trends</CardTitle>
              <CardDescription>
                Revenue and auction completion trends over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Auctions Completed</TableHead>
                    <TableHead>Avg Revenue/Auction</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.revenueByMonth.map((month) => (
                    <TableRow key={month.month}>
                      <TableCell className="font-medium">{month.month}</TableCell>
                      <TableCell>{formatPrice(month.revenue)}</TableCell>
                      <TableCell>{month.auction_count}</TableCell>
                      <TableCell>
                        {month.auction_count > 0 ? formatPrice(month.revenue / month.auction_count) : formatPrice(0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {stats.revenueByMonth.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No monthly revenue data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Export Actions */}
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={() => fetchAnalyticsData()}>
          <BarChart3 className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;