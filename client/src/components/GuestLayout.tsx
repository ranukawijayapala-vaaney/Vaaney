import { LogIn, UserPlus, Menu, X, ShoppingBag, Info, HelpCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Link, useLocation } from "wouter";
import vaaneyLogo from "@assets/Vaaney logo (2)_1763908268914.png";

interface GuestLayoutProps {
  children: React.ReactNode;
}

export function GuestLayout({ children }: GuestLayoutProps) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center hover-elevate active-elevate-2 rounded-md px-2 py-1 -ml-2 cursor-pointer" data-testid="link-home-logo">
              <img src={vaaneyLogo} alt="Vaaney" className="h-10" />
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              <Button
                asChild
                variant={location === "/marketplace" ? "default" : "ghost"}
                size="sm"
                data-testid="link-marketplace"
                className={location === "/marketplace" ? "" : "hover-elevate"}
              >
                <Link href="/marketplace">
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Marketplace
                </Link>
              </Button>

              <Button
                asChild
                variant={location === "/about" ? "default" : "ghost"}
                size="sm"
                data-testid="link-about"
                className={location === "/about" ? "" : "hover-elevate"}
              >
                <Link href="/about">
                  <Info className="h-4 w-4 mr-2" />
                  About
                </Link>
              </Button>

              <Button
                asChild
                variant={location === "/buyer-guidelines" ? "default" : "ghost"}
                size="sm"
                data-testid="link-buyer-guidelines"
                className={location === "/buyer-guidelines" ? "" : "hover-elevate"}
              >
                <Link href="/buyer-guidelines">
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Buyer Guide
                </Link>
              </Button>
            </nav>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                asChild
                variant="outline"
                size="sm"
                data-testid="link-login"
                className="hidden sm:flex"
              >
                <Link href="/login">
                  <LogIn className="h-4 w-4 mr-2" />
                  Login
                </Link>
              </Button>
              <Button
                asChild
                size="sm"
                data-testid="link-signup"
                className="hidden sm:flex"
              >
                <Link href="/signup">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Sign Up
                </Link>
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden min-h-11 min-w-11"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                data-testid="button-guest-mobile-menu"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
          
          {mobileMenuOpen && (
            <div className="md:hidden border-t bg-background/95 backdrop-blur">
              <div className="px-4 py-4 space-y-2">
                <Button asChild variant="ghost" className="w-full justify-start min-h-11" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-marketplace">
                  <Link href="/marketplace">
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Marketplace
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="w-full justify-start min-h-11" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-about">
                  <Link href="/about">
                    <Info className="h-4 w-4 mr-2" />
                    About
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="w-full justify-start min-h-11" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-buyer-guidelines">
                  <Link href="/buyer-guidelines">
                    <HelpCircle className="h-4 w-4 mr-2" />
                    Buyer Guide
                  </Link>
                </Button>

                <div className="pt-3 border-t flex gap-2">
                  <Button asChild variant="outline" className="flex-1 min-h-11" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-login">
                    <Link href="/login">
                      <LogIn className="h-4 w-4 mr-2" />
                      Login
                    </Link>
                  </Button>
                  <Button asChild className="flex-1 min-h-11" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-signup">
                    <Link href="/signup">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Sign Up
                    </Link>
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
