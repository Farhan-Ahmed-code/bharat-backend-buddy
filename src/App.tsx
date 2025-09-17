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
import ProfilePage from "./pages/ProfilePage";
import MyAuctionsPage from "./pages/MyAuctionsPage";

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
					<Route path="/checkout/:auctionId" element={<CheckoutPage />} />
					<Route path="/profile" element={<ProfilePage />} />
					<Route path="/my-auctions" element={<MyAuctionsPage />} />
					<Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
					{/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
					<Route path="*" element={<NotFound />} />
				</Routes>
			</BrowserRouter>
		</TooltipProvider>
	</QueryClientProvider>
);

export default App;
