import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import AuctionsPage from "./pages/AuctionsPage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";
import AdminRoute from "@/components/auth/AdminRoute";
import CheckoutPage from "./pages/CheckoutPage";
import AuctionDetail from "./pages/AuctionDetail";
import BidHistoryPage from "./pages/BidHistoryPage";
import WatchlistPage from "./pages/WatchlistPage";
import ProfilePage from "./pages/ProfilePage";
import MyAuctionsPage from "./pages/MyAuctionsPage";
import CreateAuctionPage from "./pages/CreateAuctionPage";
import ShipmentPage from "./pages/ShipmentPage";
import UsersList from "./pages/UsersList";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
	<QueryClientProvider client={queryClient}>
		<TooltipProvider>
			<Toaster />
			<Sonner />
			<BrowserRouter>
				<Routes>
					<Route path="/" element={<Index />} />
					<Route path="/auth" element={<AuthPage />} />
					<Route path="/auctions" element={<AuctionsPage />} />
					<Route path="/auction/:id" element={<AuctionDetail />} />
					<Route path="/auction/:id/bids" element={<BidHistoryPage />} />
					<Route path="/checkout/:auctionId" element={<CheckoutPage />} />
					<Route path="/watchlist" element={<ProtectedRoute><WatchlistPage /></ProtectedRoute>} />
					<Route path="/profile" element={<ProfilePage />} />
					<Route path="/my-auctions" element={<MyAuctionsPage />} />
					<Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
					<Route path="/admin/users" element={<AdminRoute><UsersList /></AdminRoute>} />
					<Route path="/create-auction" element={<ProtectedRoute><CreateAuctionPage /></ProtectedRoute>} />
					<Route path="/shipment/:auctionId" element={<ProtectedRoute><ShipmentPage /></ProtectedRoute>} />
					{/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
					<Route path="*" element={<NotFound />} />
				</Routes>
			</BrowserRouter>
		</TooltipProvider>
	</QueryClientProvider>
);

export default App;