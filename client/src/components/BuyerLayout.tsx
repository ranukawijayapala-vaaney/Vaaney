import { Package, ShoppingCart, ShoppingBag, History, Calendar, MessageCircle, LogOut, Menu, X, User, FileImage, FileText, Library } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { NotificationBell } from "@/components/NotificationBell";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import ProfileSetupDialog from "@/components/ProfileSetupDialog";

interface BuyerLayoutProps {
  children: React.ReactNode;
}

export function BuyerLayout({ children }: BuyerLayoutProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    // Shopping
    { icon: ShoppingBag, label: "Marketplace", href: "/", testid: "link-marketplace" },
    { icon: ShoppingCart, label: "Cart", href: "/cart", testid: "link-cart" },
    // History & Support
    { icon: History, label: "Orders", href: "/orders", testid: "link-orders" },
    { icon: Calendar, label: "Bookings", href: "/bookings", testid: "link-bookings" },
    // Design & Quotes
    { icon: FileImage, label: "Design Approvals", href: "/design-approvals", testid: "link-design-approvals" },
    { icon: FileText, label: "Custom Quotes", href: "/quotes", testid: "link-custom-quotes" },
    { icon: Library, label: "Design Library", href: "/design-library", testid: "link-design-library" },
    // Communication
    { icon: MessageCircle, label: "Messages", href: "/messages", testid: "link-messages" },
    { icon: User, label: "Profile", href: "/profile", testid: "link-profile" },
  ];

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
              {navItems.map((item) => (
                <Button
                  key={item.href}
                  asChild
                  variant={location === item.href ? "default" : "ghost"}
                  size="sm"
                  data-testid={item.testid}
                  className={location === item.href ? "" : "hover-elevate"}
                >
                  <Link href={item.href}>
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Link>
                </Button>
              ))}
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
                {navItems.map((item) => (
                  <Button
                    key={item.href}
                    asChild
                    variant={location === item.href ? "default" : "ghost"}
                    className="w-full justify-start min-h-11"
                    data-testid={`mobile-${item.testid}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4 mr-2" />
                      {item.label}
                    </Link>
                  </Button>
                ))}
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <ProfileSetupDialog />
    </div>
  );
}
