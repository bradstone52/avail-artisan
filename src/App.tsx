import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Listings from "./pages/Listings";
import MarketListings from "./pages/MarketListings";
import Properties from "./pages/Properties";
import PropertyDetail from "./pages/PropertyDetail";
import PropertiesMap from "./pages/PropertiesMap";
import Transactions from "./pages/Transactions";
import TransactionDetail from "./pages/TransactionDetail";
import TransactionForm from "./pages/TransactionForm";
import IssueBuilder from "./pages/IssueBuilder";
import SharePage from "./pages/SharePage";
import AdminUsers from "./pages/AdminUsers";
import AdminPublicMarket from "./pages/AdminPublicMarket";
import JoinTeam from "./pages/JoinTeam";
import Recipients from "./pages/Recipients";
import TrackingRedirect from "./pages/TrackingRedirect";
import PublicDistributionMap from "./pages/PublicDistributionMap";
import DistributionMapViewer from "./pages/DistributionMapViewer";
import MarketListingsMap from "./pages/MarketListingsMap";
import PdfOpenMap from "./pages/PdfOpenMap";
import PdfImport from "./pages/PdfImport";
import AccountSettings from "./pages/AccountSettings";
import Deals from "./pages/Deals";
import DealDetail from "./pages/DealDetail";
import Prospects from "./pages/Prospects";
import ProspectDetail from "./pages/ProspectDetail";
import Settings from "./pages/Settings";
import CRETracker from "./pages/CRETracker";
import MyTasks from "./pages/MyTasks";
import AdminBrokerages from "./pages/AdminBrokerages";
import Tenants from "./pages/Tenants";
import Install from "./pages/Install";
import InternalListings from "./pages/InternalListings";
import InternalListingDetail from "./pages/InternalListingDetail";
import NotFound from "./pages/NotFound";
import PublicMarket from "./pages/PublicMarket";
import PublicMarketDetail from "./pages/PublicMarketDetail";

function CRETrackerRedirect() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab');
  const dest: Record<string, string> = {
    deals: '/deals',
    prospects: '/prospects',
    listings: '/internal-listings',
    tasks: '/my-tasks',
    contacts: '/admin/brokerages',
  };
  return <Navigate to={dest[tab ?? ''] ?? '/dashboard'} replace />;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Prevent refetch when switching tabs
      staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes - no authentication required */}
            <Route path="/market" element={<PublicMarket />} />
            <Route path="/market/:id" element={<PublicMarketDetail />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/install" element={<Install />} />
            <Route path="/share/:token" element={<SharePage />} />
            <Route path="/r/:trackingToken" element={<TrackingRedirect />} />
            <Route path="/public/distribution-map" element={<PublicDistributionMap />} />
            <Route path="/dashboard/public/distribution-map" element={<PublicDistributionMap />} />
            <Route path="/join-team" element={<JoinTeam />} />
            <Route path="/join" element={<JoinTeam />} />
            
            {/* Protected routes - authentication required */}
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/listings" element={<ProtectedRoute><Listings /></ProtectedRoute>} />
            <Route path="/market-listings" element={<ProtectedRoute><MarketListings /></ProtectedRoute>} />
            <Route path="/properties" element={<ProtectedRoute><Properties /></ProtectedRoute>} />
            <Route path="/properties/map" element={<ProtectedRoute><PropertiesMap /></ProtectedRoute>} />
            <Route path="/properties/:id" element={<ProtectedRoute><PropertyDetail /></ProtectedRoute>} />
            <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
            <Route path="/transactions/new" element={<ProtectedRoute><TransactionForm /></ProtectedRoute>} />
            <Route path="/transactions/:id" element={<ProtectedRoute><TransactionDetail /></ProtectedRoute>} />
            <Route path="/transactions/:id/edit" element={<ProtectedRoute><TransactionForm /></ProtectedRoute>} />
            <Route path="/issue-builder" element={<ProtectedRoute><IssueBuilder /></ProtectedRoute>} />
            <Route path="/pdf/open-map" element={<PdfOpenMap />} />
             <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
             <Route path="/admin/public-market" element={<ProtectedRoute><AdminPublicMarket /></ProtectedRoute>} />
            <Route path="/recipients" element={<ProtectedRoute><Recipients /></ProtectedRoute>} />
            <Route path="/pdf-import" element={<ProtectedRoute><PdfImport /></ProtectedRoute>} />
            <Route path="/account" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />
            <Route path="/cre-tracker" element={<ProtectedRoute><CRETrackerRedirect /></ProtectedRoute>} />
            <Route path="/my-tasks" element={<ProtectedRoute><MyTasks /></ProtectedRoute>} />
            <Route path="/admin/brokerages" element={<ProtectedRoute><AdminBrokerages /></ProtectedRoute>} />
            <Route path="/tenants" element={<ProtectedRoute><Tenants /></ProtectedRoute>} />
            <Route path="/internal-listings" element={<ProtectedRoute><InternalListings /></ProtectedRoute>} />
            <Route path="/internal-listings/:id" element={<ProtectedRoute><InternalListingDetail /></ProtectedRoute>} />
            <Route path="/deals" element={<ProtectedRoute><Deals /></ProtectedRoute>} />
            <Route path="/deals/:id" element={<ProtectedRoute><DealDetail /></ProtectedRoute>} />
            <Route path="/prospects" element={<ProtectedRoute><Prospects /></ProtectedRoute>} />
            <Route path="/prospects/:id" element={<ProtectedRoute><ProspectDetail /></ProtectedRoute>} />
            <Route path="/contacts" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/distribution-map" element={<ProtectedRoute><DistributionMapViewer /></ProtectedRoute>} />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
