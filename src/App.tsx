import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Listings from "./pages/Listings";
import MarketListings from "./pages/MarketListings";
import Transactions from "./pages/Transactions";
import TransactionDetail from "./pages/TransactionDetail";
import TransactionForm from "./pages/TransactionForm";
import IssueBuilder from "./pages/IssueBuilder";
import SharePage from "./pages/SharePage";
import AdminUsers from "./pages/AdminUsers";
import JoinTeam from "./pages/JoinTeam";
import Recipients from "./pages/Recipients";
import TrackingRedirect from "./pages/TrackingRedirect";
import PublicDistributionMap from "./pages/PublicDistributionMap";
import DistributionMapViewer from "./pages/DistributionMapViewer";
import PdfOpenMap from "./pages/PdfOpenMap";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/listings" element={<Listings />} />
            <Route path="/market-listings" element={<MarketListings />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/transactions/new" element={<TransactionForm />} />
            <Route path="/transactions/:id" element={<TransactionDetail />} />
            <Route path="/transactions/:id/edit" element={<TransactionForm />} />
            <Route path="/issue-builder" element={<IssueBuilder />} />
            <Route path="/share/:token" element={<SharePage />} />
            <Route path="/r/:trackingToken" element={<TrackingRedirect />} />
            {/* PDF helper route: opens the interactive map in a new tab */}
            <Route path="/pdf/open-map" element={<PdfOpenMap />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/join-team" element={<JoinTeam />} />
            <Route path="/join" element={<JoinTeam />} />
            <Route path="/recipients" element={<Recipients />} />
            {/* Authenticated distribution map viewer */}
            <Route path="/distribution-map" element={<DistributionMapViewer />} />
            {/* Public distribution map - tokenized access, no auth required */}
            <Route path="/public/distribution-map" element={<PublicDistributionMap />} />
            {/* Backwards compatibility alias for old PDFs that used /dashboard/public/... */}
            <Route path="/dashboard/public/distribution-map" element={<PublicDistributionMap />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
