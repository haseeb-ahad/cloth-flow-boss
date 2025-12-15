import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { TimezoneProvider } from "./contexts/TimezoneContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ResetPassword from "./pages/ResetPassword";
import Invoice from "./pages/Invoice";
import Inventory from "./pages/Inventory";
import Sales from "./pages/Sales";
import Credits from "./pages/Credits";
import Customers from "./pages/Customers";
import Settings from "./pages/Settings";
import Workers from "./pages/Workers";
import ReceivePayment from "./pages/ReceivePayment";
import Expenses from "./pages/Expenses";
import NotFound from "./pages/NotFound";
import Layout from "./components/Layout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <TimezoneProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Protected routes */}
              <Route path="/" element={<ProtectedRoute adminOnly><Layout><Index /></Layout></ProtectedRoute>} />
              <Route path="/invoice" element={<ProtectedRoute feature="invoice" requirePermission="view"><Layout><Invoice /></Layout></ProtectedRoute>} />
              <Route path="/inventory" element={<ProtectedRoute feature="inventory" requirePermission="view"><Layout><Inventory /></Layout></ProtectedRoute>} />
              <Route path="/sales" element={<ProtectedRoute feature="sales" requirePermission="view"><Layout><Sales /></Layout></ProtectedRoute>} />
              <Route path="/credits" element={<ProtectedRoute feature="credits" requirePermission="view"><Layout><Credits /></Layout></ProtectedRoute>} />
              <Route path="/customers" element={<ProtectedRoute feature="customers" requirePermission="view"><Layout><Customers /></Layout></ProtectedRoute>} />
              <Route path="/receive-payment" element={<ProtectedRoute feature="credits" requirePermission="view"><Layout><ReceivePayment /></Layout></ProtectedRoute>} />
              <Route path="/expenses" element={<ProtectedRoute adminOnly><Layout><Expenses /></Layout></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
              <Route path="/workers" element={<ProtectedRoute><Layout><Workers /></Layout></ProtectedRoute>} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TimezoneProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
