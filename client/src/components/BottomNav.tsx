import { Link, useLocation } from "wouter";
import { Home, ShoppingCart, MessageCircle, User } from "lucide-react";

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { href: "/marketplace", icon: Home, label: "Home", testid: "bottom-nav-home" },
    { href: "/orders", icon: ShoppingCart, label: "Orders", testid: "bottom-nav-orders" },
    { href: "/messages", icon: MessageCircle, label: "Messages", testid: "bottom-nav-messages" },
    { href: "/profile", icon: User, label: "Profile", testid: "bottom-nav-profile" },
  ];

  return (
    <nav className="xl:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t">
      <div className="flex justify-around items-center h-16 max-w-7xl mx-auto px-2">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center min-h-11 min-w-11 rounded-md transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid={item.testid}
            >
              <item.icon className={`h-5 w-5 ${isActive ? "mb-0.5" : ""}`} />
              <span className={`text-xs mt-0.5 ${isActive ? "font-semibold" : ""}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
