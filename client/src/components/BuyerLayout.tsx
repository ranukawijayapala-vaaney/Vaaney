import { Package, ShoppingCart, ShoppingBag, History, Calendar, MessageCircle, LogOut, Menu, X, User, FileImage, FileText, Library, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { NotificationBell } from "@/components/NotificationBell";
import { BottomNav } from "@/components/BottomNav";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import ProfileSetupDialog from "@/components/ProfileSetupDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BuyerLayoutProps {
  children: React.ReactNode;
}

export function BuyerLayout({ children }: BuyerLayoutProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActivityActive = location === "/orders" || location === "/bookings";
  const isInquiriesActive = location === "/design-approvals" || location === "/quotes" || location === "/design-library";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2 hover-elevate active-elevate-2 rounded-md px-2 py-1 -ml-2 cursor-pointer" data-testid="link-home-logo">
              <Package className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold font-display">Vaaney</span>
            </Link>
            <nav className="hidden xl:flex items-center gap-1">
              {/* Marketplace */}
              <Button
                asChild
                variant={location === "/" ? "default" : "ghost"}
                size="sm"
                data-testid="link-marketplace"
                className={location === "/" ? "" : "hover-elevate"}
              >
                <Link href="/">
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Marketplace
                </Link>
              </Button>

              {/* Cart */}
              <Button
                asChild
                variant={location === "/cart" ? "default" : "ghost"}
                size="sm"
                data-testid="link-cart"
                className={location === "/cart" ? "" : "hover-elevate"}
              >
                <Link href="/cart">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Cart
                </Link>
              </Button>

              {/* My Activity Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isActivityActive ? "default" : "ghost"}
                    size="sm"
                    className={isActivityActive ? "" : "hover-elevate"}
                    data-testid="dropdown-activity"
                  >
                    <History className="h-4 w-4 mr-2" />
                    My Activity
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild data-testid="link-orders">
                    <Link href="/orders">
                      <History className="h-4 w-4 mr-2" />
                      Orders
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild data-testid="link-bookings">
                    <Link href="/bookings">
                      <Calendar className="h-4 w-4 mr-2" />
                      Bookings
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Inquiries Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isInquiriesActive ? "default" : "ghost"}
                    size="sm"
                    className={isInquiriesActive ? "" : "hover-elevate"}
                    data-testid="dropdown-inquiries"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Inquiries
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild data-testid="link-design-approvals">
                    <Link href="/design-approvals">
                      <FileImage className="h-4 w-4 mr-2" />
                      Design Approvals
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild data-testid="link-custom-quotes">
                    <Link href="/quotes">
                      <FileText className="h-4 w-4 mr-2" />
                      Custom Quotes
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild data-testid="link-design-library">
                    <Link href="/design-library">
                      <Library className="h-4 w-4 mr-2" />
                      Design Library
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Messages */}
              <Button
                asChild
                variant={location === "/messages" ? "default" : "ghost"}
                size="sm"
                data-testid="link-messages"
                className={location === "/messages" ? "" : "hover-elevate"}
              >
                <Link href="/messages">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Messages
                </Link>
              </Button>

              {/* Profile */}
              <Button
                asChild
                variant={location === "/profile" ? "default" : "ghost"}
                size="sm"
                data-testid="link-profile"
                className={location === "/profile" ? "" : "hover-elevate"}
              >
                <Link href="/profile">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Link>
              </Button>
            </nav>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden sm:block">
                {user?.firstName} {user?.lastName}
              </span>
              {user?.canSwitchRoles && <RoleSwitcher currentRole={user?.role || "buyer"} />}
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
                className="hover-elevate active-elevate-2 hidden xl:flex"
              >
                <LogOut className="h-5 w-5" />
              </Button>
              
              {/* Mobile/Tablet Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="xl:hidden min-h-11 min-w-11"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                data-testid="button-mobile-menu"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
          
          {/* Mobile/Tablet Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="xl:hidden border-t bg-background/95 backdrop-blur">
              <div className="px-4 py-4 space-y-2">
                <Button asChild variant="ghost" className="w-full justify-start min-h-11" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-marketplace">
                  <Link href="/">
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Marketplace
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="w-full justify-start min-h-11" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-cart">
                  <Link href="/cart">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Cart
                  </Link>
                </Button>

                <div className="text-xs font-semibold text-muted-foreground px-3 py-2">My Activity</div>
                <Button asChild variant="ghost" className="w-full justify-start pl-6 min-h-11" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-orders">
                  <Link href="/orders">
                    <History className="h-4 w-4 mr-2" />
                    Orders
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="w-full justify-start pl-6 min-h-11" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-bookings">
                  <Link href="/bookings">
                    <Calendar className="h-4 w-4 mr-2" />
                    Bookings
                  </Link>
                </Button>

                <div className="text-xs font-semibold text-muted-foreground px-3 py-2">Inquiries</div>
                <Button asChild variant="ghost" className="w-full justify-start pl-6 min-h-11" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-design-approvals">
                  <Link href="/design-approvals">
                    <FileImage className="h-4 w-4 mr-2" />
                    Design Approvals
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="w-full justify-start pl-6 min-h-11" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-custom-quotes">
                  <Link href="/quotes">
                    <FileText className="h-4 w-4 mr-2" />
                    Custom Quotes
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="w-full justify-start pl-6 min-h-11" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-design-library">
                  <Link href="/design-library">
                    <Library className="h-4 w-4 mr-2" />
                    Design Library
                  </Link>
                </Button>

                <Button asChild variant="ghost" className="w-full justify-start min-h-11" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-messages">
                  <Link href="/messages">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Messages
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="w-full justify-start min-h-11" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-profile">
                  <Link href="/profile">
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </Link>
                </Button>

                <div className="pt-3 border-t">
                  <Button
                    variant="ghost"
                    className="w-full justify-start min-h-11 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                    onClick={async () => {
                      await fetch("/api/logout", { method: "POST" });
                      window.location.href = "/";
                    }}
                    data-testid="mobile-button-logout"
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 xl:pb-8">
        {children}
      </main>
      <BottomNav />
      <ProfileSetupDialog />
    </div>
  );
}
