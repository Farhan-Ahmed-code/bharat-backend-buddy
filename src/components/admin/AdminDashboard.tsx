import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Gavel, IndianRupee, TrendingUp, Eye, Edit, Trash2, BarChart3 } from 'lucide-react';
import AnalyticsDashboard from './AnalyticsDashboard';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface DashboardStats {
  totalUsers: number;
  totalAuctions: number;
  activeAuctions: number;
  pendingAuctions: number;
  totalRevenue: number;
}

interface User {
  id: string;
  email: string;
  created_at: string;
  profiles?: {
    full_name: string | null;
    city: string | null;
    state: string | null;
  };
}

interface Auction {
  id: string;
  title: string;
  status: string;
  current_price: number;
  end_time: string;
  created_at: string;
  seller_full_name: string | null;
}

interface PendingAuction {
  id: string;
  title: string;
  description: string | null;
  starting_price: number;
  current_price: number;
  created_at: string;
  seller_id: string;
  seller_full_name: string | null;
  seller_email: string | null;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalAuctions: 0,
    activeAuctions: 0,
    totalRevenue: 0,
    pendingApprovals: 0
  });
  const [users, setUsers] = useState<User[]>([]);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [pendingAuctions, setPendingAuctions] = useState<PendingAuction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingApproval, setProcessingApproval] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
    fetchDashboardData();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    const { data } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single();
    
    if (!data) {
      toast({
        title: "Access Denied",
        description: "You don't have admin privileges.",
        variant: "destructive",
      });
      navigate('/');
      return;
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch stats
      const [
        { count: userCount },
        { count: auctionCount },
        { count: activeAuctionCount },
        { count: pendingCount },
        { data: revenueData }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact' }),
        supabase.from('auctions').select('*', { count: 'exact' }),
        supabase.from('auctions').select('*', { count: 'exact' }).eq('status', 'active'),
        supabase.from('auctions').select('*', { count: 'exact' }).eq('approval_status', 'pending'),
        supabase.from('auctions').select('current_price').eq('status', 'completed')
      ]);

      const totalRevenue = revenueData?.reduce((sum, auction) => sum + auction.current_price, 0) || 0;

      setStats({
        totalUsers: userCount || 0,
        totalAuctions: auctionCount || 0,
        activeAuctions: activeAuctionCount || 0,
        pendingAuctions: pendingCount || 0,
        totalRevenue
      });

      // Fetch recent users - need to join with auth.users for email
      const { data: usersData } = await supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          full_name,
          city,
          state,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      // Transform users data to match interface
      const usersWithEmail = (usersData || []).map(user => ({
        id: user.id,
        email: 'user@example.com', // In real app, would need to join with auth.users
        created_at: user.created_at,
        profiles: {
          full_name: user.full_name,
          city: user.city,
          state: user.state
        }
      }));

      setUsers(usersWithEmail);

      // Fetch recent auctions with seller info (no N+1)
      const { data: auctionsData } = await (supabase as any)
        .from('auctions_with_seller')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      const normalized: Auction[] = (auctionsData || []).map((row: any) => ({
        id: row.id,
        title: row.title,
        status: row.status,
        current_price: row.current_price,
        end_time: row.end_time,
        created_at: row.created_at,
        seller_full_name: row.seller_full_name ?? null,
      }));
      setAuctions(normalized);

      // Fetch pending auctions for approval
      const { data: pendingData } = await supabase
        .from('auctions')
        .select(`
          id,
          title,
          description,
          starting_price,
          current_price,
          created_at,
          seller_id,
          profiles:seller_id (
            full_name,
            email
          )
        `)
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false });

      const normalizedPending: PendingAuction[] = (pendingData || []).map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        starting_price: row.starting_price,
        current_price: row.current_price,
        created_at: row.created_at,
        seller_id: row.seller_id,
        seller_full_name: row.profiles?.full_name ?? null,
        seller_email: row.profiles?.email ?? null,
      }));
      setPendingAuctions(normalizedPending);
    } catch (error: any) {
      toast({
        title: "Error loading dashboard data",
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const handleApproveAuction = async (auctionId: string) => {
    try {
      setProcessingApproval(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Error",
          description: "Please log in again.",
          variant: "destructive",
        });
        return;
      }

      // Update auction status to approved
      const { error: updateError } = await supabase
        .from('auctions')
        .update({
          approval_status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user.id
        })
        .eq('id', auctionId);

      if (updateError) throw updateError;

      // Log the approval action
      await supabase
        .from('admin_audit_log')
        .insert({
          auction_id: auctionId,
          admin_id: user.id,
          action: 'approved',
          details: 'Auction approved and made live'
        });

      // Refresh the data
      await fetchDashboardData();

      toast({
        title: "Auction Approved",
        description: "The auction is now live and visible to users.",
      });
    } catch (error: any) {
      toast({
        title: "Error approving auction",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingApproval(false);
    }
  };

  const handleRejectAuction = async (auctionId: string) => {
    try {
      setProcessingApproval(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Error",
          description: "Please log in again.",
          variant: "destructive",
        });
        return;
      }

      // Update auction status to rejected
      const { error: updateError } = await supabase
        .from('auctions')
        .update({
          approval_status: 'rejected',
          approved_at: new Date().toISOString(),
          approved_by: user.id,
          rejection_reason: 'Rejected by admin'
        })
        .eq('id', auctionId);

      if (updateError) throw updateError;

      // Log the rejection action
      await supabase
        .from('admin_audit_log')
        .insert({
          auction_id: auctionId,
          admin_id: user.id,
          action: 'rejected',
          details: 'Auction rejected by admin'
        });

      // Refresh the data
      await fetchDashboardData();

      toast({
        title: "Auction Rejected",
        description: "The auction has been rejected and removed from pending list.",
      });
    } catch (error: any) {
      toast({
        title: "Error rejecting auction",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingApproval(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      completed: 'secondary',
      cancelled: 'destructive'
    };
    
    return (
      <Badge variant={variants[status as keyof typeof variants] as any}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
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
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your auction platform from here
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Registered on platform
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Auctions</CardTitle>
            <Gavel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAuctions}</div>
            <p className="text-xs text-muted-foreground">
              All time auctions
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Auctions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeAuctions}</div>
            <p className="text-xs text-muted-foreground">
              Currently live
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingAuctions}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting admin review
            </p>
          </CardContent>
        </Card>

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
      </div>

      {/* Data Tables */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Recent Users</TabsTrigger>
          <TabsTrigger value="auctions">Recent Auctions</TabsTrigger>
          <TabsTrigger value="pending">Pending Approvals</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Users</CardTitle>
              <CardDescription>
                Latest registered users on the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.profiles?.full_name || 'No name provided'}
                      </TableCell>
                      <TableCell>
                        {user.profiles?.city && user.profiles?.state 
                          ? `${user.profiles.city}, ${user.profiles.state}`
                          : 'Not provided'
                        }
                      </TableCell>
                      <TableCell>{formatDate(user.created_at)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="auctions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Auctions</CardTitle>
              <CardDescription>
                Latest auctions created on the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Current Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auctions.map((auction) => (
                    <TableRow key={auction.id}>
                      <TableCell className="font-medium max-w-xs truncate">
                        {auction.title}
                      </TableCell>
                      <TableCell>
                        {auction.seller_full_name || 'Unknown'}
                      </TableCell>
                      <TableCell>{formatPrice(auction.current_price)}</TableCell>
                      <TableCell>{getStatusBadge(auction.status)}</TableCell>
                      <TableCell>{formatDate(auction.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/auction/${auction.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Auction Approvals</CardTitle>
              <CardDescription>
                Review and approve auctions before they go live
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Auction Title</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Starting Price</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingAuctions.map((auction) => (
                    <TableRow key={auction.id}>
                      <TableCell className="font-medium max-w-xs truncate">
                        {auction.title}
                      </TableCell>
                      <TableCell>
                        {auction.seller_full_name || auction.seller_email || 'Unknown'}
                      </TableCell>
                      <TableCell>{formatPrice(auction.starting_price)}</TableCell>
                      <TableCell>{formatDate(auction.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/auction/${auction.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleApproveAuction(auction.id)}
                            disabled={processingApproval}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRejectAuction(auction.id)}
                            disabled={processingApproval}
                          >
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {pendingAuctions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No pending auctions to review
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <AnalyticsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;