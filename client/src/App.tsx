// Referenced from javascript_log_in_with_replit blueprint
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { ChatAssistant } from "@/components/ChatAssistant";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import SetPassword from "@/pages/SetPassword";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import VerifyEmail from "@/pages/VerifyEmail";
import Profile from "@/pages/Profile";
import RoleSelection from "@/pages/RoleSelection";
import PendingVerification from "@/pages/PendingVerification";
import RejectedVerification from "@/pages/RejectedVerification";
import BuyerGuidelines from "@/pages/BuyerGuidelines";
import SellerGuidelines from "@/pages/SellerGuidelines";
import AboutUs from "@/pages/AboutUs";
import MockIPG from "@/pages/MockIPG";
import AdminSetup from "@/pages/AdminSetup";

import { BuyerLayout } from "@/components/BuyerLayout";
import { SellerLayout } from "@/components/SellerLayout";
import { AdminLayout } from "@/components/AdminLayout";
import { GuestLayout } from "@/components/GuestLayout";

import Marketplace from "@/pages/buyer/Marketplace";
import ProductDetail from "@/pages/buyer/ProductDetail";
import Cart from "@/pages/buyer/Cart";
import Checkout from "@/pages/buyer/Checkout";
import OrderHistory from "@/pages/buyer/OrderHistory";
import ServiceHistory from "@/pages/buyer/ServiceHistory";
import ServiceBooking from "@/pages/buyer/ServiceBooking";
import BuyerMessages from "@/pages/buyer/Messages";
import BuyerDesignApprovals from "@/pages/buyer/DesignApprovals";
import BuyerCustomQuotes from "@/pages/buyer/CustomQuotes";
import BuyerDesignLibrary from "@/pages/buyer/DesignLibrary";
import Notifications from "@/pages/Notifications";

import SellerDashboard from "@/pages/seller/SellerDashboard";
import Products from "@/pages/seller/Products";
import Services from "@/pages/seller/Services";
import Orders from "@/pages/seller/Orders";
import Bookings from "@/pages/seller/Bookings";
import Payouts from "@/pages/seller/Payouts";
import SellerBoost from "@/pages/seller/Boost";
import SellerMessages from "@/pages/seller/Messages";
import SellerReturns from "@/pages/seller/Returns";
import SellerQuotes from "@/pages/seller/Quotes";
import SellerDesigns from "@/pages/seller/Designs";

import AdminDashboard from "@/pages/admin/AdminDashboard";
import Users from "@/pages/admin/Users";
import Verifications from "@/pages/admin/Verifications";
import Transactions from "@/pages/admin/Transactions";
import Banners from "@/pages/admin/Banners";
import AdminOrders from "@/pages/admin/Orders";
import AdminBookings from "@/pages/admin/Bookings";
import AdminConversations from "@/pages/admin/Conversations";
import BoostPackages from "@/pages/admin/BoostPackages";
import BoostItems from "@/pages/admin/BoostItems";
import ShippingManagement from "@/pages/admin/ShippingManagement";
import ShipmentHistory from "@/pages/admin/ShipmentHistory";
import AdminReturns from "@/pages/admin/Returns";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/verify-email" component={VerifyEmail} />
        <Route path="/set-password" component={SetPassword} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/buyer-guidelines" component={BuyerGuidelines} />
        <Route path="/seller-guidelines" component={SellerGuidelines} />
        <Route path="/about" component={AboutUs} />
        <Route path="/mock-ipg" component={MockIPG} />
        <Route path="/admin-setup" component={AdminSetup} />
        <Route path="/marketplace">
          {() => (
            <GuestLayout>
              <Marketplace />
            </GuestLayout>
          )}
        </Route>
        <Route path="/product/:id">
          {(params) => (
            <GuestLayout>
              <ProductDetail productId={params.id} />
            </GuestLayout>
          )}
        </Route>
        <Route path="/book-service/:id">
          {(params) => (
            <GuestLayout>
              <ServiceBooking serviceId={params.id} />
            </GuestLayout>
          )}
        </Route>
        <Route component={NotFound} />
      </Switch>
    );
  }

  // Add null check for user
  if (!user) {
    return <Route component={NotFound} />;
  }

  // If user has no verification document AND not already approved, send to role selection
  // Don't send already approved users back to role selection
  if (!user.verificationDocumentUrl && user.verificationStatus !== "approved") {
    return (
      <Switch>
        <Route path="/" component={RoleSelection} />
        <Route path="/role-selection" component={RoleSelection} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  if (user.verificationStatus === "pending") {
    return (
      <Switch>
        <Route path="/" component={PendingVerification} />
        <Route component={PendingVerification} />
      </Switch>
    );
  }

  if (user.verificationStatus === "rejected") {
    return (
      <Switch>
        <Route path="/" component={RejectedVerification} />
        <Route path="/role-selection" component={RoleSelection} />
        <Route component={RejectedVerification} />
      </Switch>
    );
  }

  if (user.role === "buyer") {
    return (
      <BuyerLayout>
        <Switch>
          <Route path="/" component={Marketplace} />
          <Route path="/marketplace" component={Marketplace} />
          <Route path="/product/:id">
            {(params) => <ProductDetail productId={params.id} />}
          </Route>
          <Route path="/cart" component={Cart} />
          <Route path="/checkout" component={Checkout} />
          <Route path="/orders" component={OrderHistory} />
          <Route path="/bookings" component={ServiceHistory} />
          <Route path="/messages" component={BuyerMessages} />
          <Route path="/design-approvals" component={BuyerDesignApprovals} />
          <Route path="/quotes" component={BuyerCustomQuotes} />
          <Route path="/design-library" component={BuyerDesignLibrary} />
          <Route path="/notifications" component={Notifications} />
          <Route path="/profile" component={Profile} />
          <Route path="/book-service/:id">
            {(params) => <ServiceBooking serviceId={params.id} />}
          </Route>
          <Route path="/mock-ipg" component={MockIPG} />
          <Route component={NotFound} />
        </Switch>
      </BuyerLayout>
    );
  }

  if (user.role === "seller") {
    return (
      <SellerLayout>
        <Switch>
          <Route path="/" component={SellerDashboard} />
          <Route path="/seller" component={SellerDashboard} />
          <Route path="/seller/dashboard" component={SellerDashboard} />
          <Route path="/seller/products" component={Products} />
          <Route path="/seller/services" component={Services} />
          <Route path="/seller/orders" component={Orders} />
          <Route path="/seller/bookings" component={Bookings} />
          <Route path="/seller/returns" component={SellerReturns} />
          <Route path="/seller/boost" component={SellerBoost} />
          <Route path="/seller/messages" component={SellerMessages} />
          <Route path="/seller/payouts" component={Payouts} />
          <Route path="/seller/quotes" component={SellerQuotes} />
          <Route path="/seller/designs" component={SellerDesigns} />
          <Route path="/notifications" component={Notifications} />
          <Route path="/profile" component={Profile} />
          <Route path="/product/:id">
            {(params) => <ProductDetail productId={params.id} />}
          </Route>
          <Route path="/book-service/:id">
            {(params) => <ServiceBooking serviceId={params.id} />}
          </Route>
          <Route path="/mock-ipg" component={MockIPG} />
          <Route component={NotFound} />
        </Switch>
      </SellerLayout>
    );
  }

  if (user.role === "admin") {
    return (
      <AdminLayout>
        <Switch>
          <Route path="/" component={AdminDashboard} />
          <Route path="/admin/dashboard" component={AdminDashboard} />
          <Route path="/admin/users" component={Users} />
          <Route path="/admin/verifications" component={Verifications} />
          <Route path="/admin/transactions" component={Transactions} />
          <Route path="/admin/shipping" component={ShippingManagement} />
          <Route path="/admin/shipment-history" component={ShipmentHistory} />
          <Route path="/admin/returns" component={AdminReturns} />
          <Route path="/admin/conversations" component={AdminConversations} />
          <Route path="/admin/banners" component={Banners} />
          <Route path="/admin/boost-packages" component={BoostPackages} />
          <Route path="/admin/boost-items" component={BoostItems} />
          <Route path="/notifications" component={Notifications} />
          <Route path="/profile" component={Profile} />
          <Route path="/mock-ipg" component={MockIPG} />
          <Route component={NotFound} />
        </Switch>
      </AdminLayout>
    );
  }

  return <Route component={NotFound} />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <ChatAssistant />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
