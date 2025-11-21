import { LayoutDashboard, Users, ShieldCheck, DollarSign, MessageCircle, Image, LogOut, Menu, X, TrendingUp, Zap, ChevronDown, Truck, History, User, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import logoUrl from "@assets/Vaaney logo (1)_1763710382064.png";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isUsersActive = location === "/admin/users" || location === "/admin/verifications";
  const isShippingActive = location === "/admin/shipping" || location === "/admin/shipment-history" || location === "/admin/returns";
  const isContentActive = location === "/admin/conversations" || location === "/admin/banners" || location === "/admin/boost-packages" || location === "/admin/boost-items";
  const isProfileActive = location === "/profile";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/admin/dashboard" className="flex items-center gap-2 hover-elevate active-elevate-2 rounded-md px-2 py-1 -ml-2 cursor-pointer" data-testid="link-home-logo">
              <img src={logoUrl} alt="Vaaney" className="h-10" />
              <Badge variant="destructive" className="ml-2 text-xs">Admin</Badge>
            </Link>
            <nav className="hidden lg:flex items-center gap-1">
              {/* Dashboard */}
              <Link href="/admin/dashboard">
                <Button
                  variant={location === "/admin/dashboard" ? "default" : "ghost"}
                  size="sm"
                  data-testid="link-dashboard"
                  className={location === "/admin/dashboard" ? "" : "hover-elevate"}
                >
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </Link>

              {/* Users Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isUsersActive ? "default" : "ghost"}
                    size="sm"
                    className={isUsersActive ? "" : "hover-elevate"}
                    data-testid="dropdown-users"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Users
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setLocation("/admin/users")} data-testid="link-users">
                    <Users className="h-4 w-4 mr-2" />
                    User Management
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/admin/verifications")} data-testid="link-verifications">
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Verifications
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Transactions */}
              <Link href="/admin/transactions">
                <Button
                  variant={location === "/admin/transactions" ? "default" : "ghost"}
                  size="sm"
                  data-testid="link-transactions"
                  className={location === "/admin/transactions" ? "" : "hover-elevate"}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Transactions
                </Button>
              </Link>

              {/* Shipping Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isShippingActive ? "default" : "ghost"}
                    size="sm"
                    className={isShippingActive ? "" : "hover-elevate"}
                    data-testid="dropdown-shipping"
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    Shipping
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setLocation("/admin/shipping")} data-testid="link-shipping-management">
                    <Truck className="h-4 w-4 mr-2" />
                    Shipping Management
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/admin/shipment-history")} data-testid="link-shipment-history">
                    <History className="h-4 w-4 mr-2" />
                    Shipment History
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/admin/returns")} data-testid="link-returns">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Returns
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Content Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isContentActive ? "default" : "ghost"}
                    size="sm"
                    className={isContentActive ? "" : "hover-elevate"}
                    data-testid="dropdown-content"
                  >
                    <Image className="h-4 w-4 mr-2" />
                    Content
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setLocation("/admin/conversations")} data-testid="link-conversations">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Conversations
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/admin/banners")} data-testid="link-banners">
                    <Image className="h-4 w-4 mr-2" />
                    Banners
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/admin/boost-packages")} data-testid="link-boost-packages">
                    <Zap className="h-4 w-4 mr-2" />
                    Boost Packages
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/admin/boost-items")} data-testid="link-boost-items">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Featured Items
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Profile */}
              <Link href="/profile">
                <Button
                  variant={isProfileActive ? "default" : "ghost"}
                  size="sm"
                  data-testid="link-profile"
                  className={isProfileActive ? "" : "hover-elevate"}
                >
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Button>
              </Link>
            </nav>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden sm:block">
                {user?.firstName} {user?.lastName}
              </span>
              {user?.canSwitchRoles && <RoleSwitcher currentRole={user?.role || "admin"} />}
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
                <Link href="/admin/dashboard">
                  <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-dashboard">
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
                
                <div className="text-xs font-semibold text-muted-foreground px-3 py-2">Users</div>
                <Link href="/admin/users">
                  <Button variant="ghost" size="sm" className="w-full justify-start pl-6" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-users">
                    <Users className="h-4 w-4 mr-2" />
                    User Management
                  </Button>
                </Link>
                <Link href="/admin/verifications">
                  <Button variant="ghost" size="sm" className="w-full justify-start pl-6" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-verifications">
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Verifications
                  </Button>
                </Link>

                <Link href="/admin/transactions">
                  <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-transactions">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Transactions
                  </Button>
                </Link>

                <div className="text-xs font-semibold text-muted-foreground px-3 py-2">Shipping</div>
                <Link href="/admin/shipping">
                  <Button variant="ghost" size="sm" className="w-full justify-start pl-6" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-shipping">
                    <Truck className="h-4 w-4 mr-2" />
                    Shipping Management
                  </Button>
                </Link>
                <Link href="/admin/shipment-history">
                  <Button variant="ghost" size="sm" className="w-full justify-start pl-6" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-shipment-history">
                    <History className="h-4 w-4 mr-2" />
                    Shipment History
                  </Button>
                </Link>

                <div className="text-xs font-semibold text-muted-foreground px-3 py-2">Content</div>
                <Link href="/admin/conversations">
                  <Button variant="ghost" size="sm" className="w-full justify-start pl-6" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-conversations">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Conversations
                  </Button>
                </Link>
                <Link href="/admin/banners">
                  <Button variant="ghost" size="sm" className="w-full justify-start pl-6" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-banners">
                    <Image className="h-4 w-4 mr-2" />
                    Banners
                  </Button>
                </Link>
                <Link href="/admin/boost-packages">
                  <Button variant="ghost" size="sm" className="w-full justify-start pl-6" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-boost-packages">
                    <Zap className="h-4 w-4 mr-2" />
                    Boost Packages
                  </Button>
                </Link>
                <Link href="/admin/boost-items">
                  <Button variant="ghost" size="sm" className="w-full justify-start pl-6" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-boost-items">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Featured Items
                  </Button>
                </Link>

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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
