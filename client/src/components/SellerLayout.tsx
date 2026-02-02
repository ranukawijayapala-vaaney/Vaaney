import { LayoutDashboard, Store, Calendar as CalendarIcon, DollarSign, MessageCircle, LogOut, ShoppingBag, Package2, Menu, X, Rocket, ChevronDown, Truck, User, AlertCircle, RotateCcw, FileText, FileImage, Building2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { NotificationBell } from "@/components/NotificationBell";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import vaaneyLogo from "@assets/Vaaney logo (2)_1763908268914.png";

interface SellerLayoutProps {
  children: React.ReactNode;
}

export function SellerLayout({ children }: SellerLayoutProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isInventoryActive = location === "/seller/products" || location === "/seller/services";
  const isSalesActive = location === "/seller/orders" || location === "/seller/bookings" || location === "/seller/returns";
  const isLeadsActive = location === "/seller/quotes" || location === "/seller/designs";
  const isMoreActive = location === "/seller/boost" || location === "/seller/payouts" || location === "/profile" || location === "/seller/profile-management";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/seller/dashboard" className="flex items-center gap-2 hover-elevate active-elevate-2 rounded-md px-2 py-1 -ml-2 cursor-pointer" data-testid="link-home-logo">
              <img src={vaaneyLogo} alt="Vaaney" className="h-10" />
              <Badge variant="secondary" className="text-xs">Seller</Badge>
            </Link>
            <nav className="hidden lg:flex items-center gap-1">
              {/* Dashboard */}
              <Button
                asChild
                variant={location === "/seller/dashboard" ? "default" : "ghost"}
                size="sm"
                data-testid="link-dashboard"
                className={location === "/seller/dashboard" ? "" : "hover-elevate"}
              >
                <Link href="/seller/dashboard">
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Dashboard
                </Link>
              </Button>

              {/* Inventory Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isInventoryActive ? "default" : "ghost"}
                    size="sm"
                    className={isInventoryActive ? "" : "hover-elevate"}
                    data-testid="dropdown-inventory"
                  >
                    <Package2 className="h-4 w-4 mr-2" />
                    Inventory
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild data-testid="link-products">
                    <Link href="/seller/products">
                      <Package2 className="h-4 w-4 mr-2" />
                      Products
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild data-testid="link-services">
                    <Link href="/seller/services">
                      <Store className="h-4 w-4 mr-2" />
                      Services
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Sales Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isSalesActive ? "default" : "ghost"}
                    size="sm"
                    className={isSalesActive ? "" : "hover-elevate"}
                    data-testid="dropdown-sales"
                  >
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Sales
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild data-testid="link-orders">
                    <Link href="/seller/orders">
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      Orders
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild data-testid="link-bookings">
                    <Link href="/seller/bookings">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      Bookings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild data-testid="link-returns">
                    <Link href="/seller/returns">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Returns
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Leads Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isLeadsActive ? "default" : "ghost"}
                    size="sm"
                    className={isLeadsActive ? "" : "hover-elevate"}
                    data-testid="dropdown-leads"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Leads
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild data-testid="link-quotes">
                    <Link href="/seller/quotes">
                      <FileText className="h-4 w-4 mr-2" />
                      Quotes
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild data-testid="link-designs">
                    <Link href="/seller/designs">
                      <FileImage className="h-4 w-4 mr-2" />
                      Designs
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Messages */}
              <Button
                asChild
                variant={location === "/seller/messages" ? "default" : "ghost"}
                size="sm"
                data-testid="link-messages"
                className={location === "/seller/messages" ? "" : "hover-elevate"}
              >
                <Link href="/seller/messages">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Messages
                </Link>
              </Button>

              {/* More Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isMoreActive ? "default" : "ghost"}
                    size="sm"
                    className={isMoreActive ? "" : "hover-elevate"}
                    data-testid="dropdown-more"
                  >
                    More
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild data-testid="link-shop-profile">
                    <Link href="/seller/profile-management">
                      <Building2 className="h-4 w-4 mr-2" />
                      Shop Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild data-testid="link-boost">
                    <Link href="/seller/boost">
                      <Rocket className="h-4 w-4 mr-2" />
                      Boost
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild data-testid="link-payouts">
                    <Link href="/seller/payouts">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Payouts
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild data-testid="link-profile">
                    <Link href="/profile">
                      <User className="h-4 w-4 mr-2" />
                      My Account
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden sm:block">
                {user?.firstName} {user?.lastName}
              </span>
              {user?.canSwitchRoles && <RoleSwitcher currentRole={user?.role || "seller"} />}
              <NotificationBell />
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  await fetch("/api/logout", { method: "POST" });
                  window.location.href = "/";
                }}
                data-testid="button-logout"
                className="hover-elevate active-elevate-2 hidden lg:flex"
              >
                <LogOut className="h-5 w-5" />
              </Button>
              
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                data-testid="button-mobile-menu"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
          
          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t bg-background/95 backdrop-blur">
              <div className="px-4 py-4 space-y-1">
                <Button asChild variant="ghost" size="sm" className="w-full justify-start" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-dashboard">
                  <Link href="/seller/dashboard">
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Dashboard
                  </Link>
                </Button>
                
                <div className="text-xs font-semibold text-muted-foreground px-3 py-2">Inventory</div>
                <Button asChild variant="ghost" size="sm" className="w-full justify-start pl-6" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-products">
                  <Link href="/seller/products">
                    <Package2 className="h-4 w-4 mr-2" />
                    Products
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm" className="w-full justify-start pl-6" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-services">
                  <Link href="/seller/services">
                    <Store className="h-4 w-4 mr-2" />
                    Services
                  </Link>
                </Button>

                <div className="text-xs font-semibold text-muted-foreground px-3 py-2">Sales</div>
                <Button asChild variant="ghost" size="sm" className="w-full justify-start pl-6" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-orders">
                  <Link href="/seller/orders">
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Orders
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm" className="w-full justify-start pl-6" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-bookings">
                  <Link href="/seller/bookings">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Bookings
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm" className="w-full justify-start pl-6" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-returns">
                  <Link href="/seller/returns">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Returns
                  </Link>
                </Button>

                <div className="text-xs font-semibold text-muted-foreground px-3 py-2">Leads</div>
                <Button asChild variant="ghost" size="sm" className="w-full justify-start pl-6" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-quotes">
                  <Link href="/seller/quotes">
                    <FileText className="h-4 w-4 mr-2" />
                    Quotes
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm" className="w-full justify-start pl-6" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-designs">
                  <Link href="/seller/designs">
                    <FileImage className="h-4 w-4 mr-2" />
                    Designs
                  </Link>
                </Button>

                <Button asChild variant="ghost" size="sm" className="w-full justify-start" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-messages">
                  <Link href="/seller/messages">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Messages
                  </Link>
                </Button>

                <div className="text-xs font-semibold text-muted-foreground px-3 py-2">More</div>
                <Button asChild variant="ghost" size="sm" className="w-full justify-start pl-6" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-shop-profile">
                  <Link href="/seller/profile-management">
                    <Building2 className="h-4 w-4 mr-2" />
                    Shop Profile
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm" className="w-full justify-start pl-6" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-boost">
                  <Link href="/seller/boost">
                    <Rocket className="h-4 w-4 mr-2" />
                    Boost
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm" className="w-full justify-start pl-6" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-payouts">
                  <Link href="/seller/payouts">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Payouts
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm" className="w-full justify-start pl-6" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-profile">
                  <Link href="/profile">
                    <User className="h-4 w-4 mr-2" />
                    My Account
                  </Link>
                </Button>

                <div className="pt-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      await fetch("/api/logout", { method: "POST" });
                      window.location.href = "/";
                    }}
                    data-testid="mobile-button-logout"
                    className="w-full justify-start text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>
      
      {/* Pending Verification Alert - Only show for "pending" status. 
          Sellers with "approved" or "verified" status won't see this banner */}
      {user?.verificationStatus === "pending" && (
        <div className="bg-yellow-50 dark:bg-yellow-950 border-b border-yellow-200 dark:border-yellow-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Alert className="border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-950" data-testid="alert-pending-verification">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <AlertTitle className="text-yellow-800 dark:text-yellow-200">Account Under Review</AlertTitle>
              <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                Your seller account is currently being reviewed by our admin team. You'll be notified once your account is approved and you can start selling. Thank you for your patience!
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )}
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
