import { UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

interface RoleSwitcherProps {
  currentRole: string;
}

export function RoleSwitcher({ currentRole }: RoleSwitcherProps) {
  const { toast } = useToast();

  const switchRoleMutation = useMutation({
    mutationFn: async (newRole: string) => {
      return await apiRequest("POST", "/api/user/switch-role", { role: newRole });
    },
    onSuccess: (data: any, newRole: string) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Role switched successfully!" });
      
      // Redirect to the appropriate page for each role
      const roleRedirects: Record<string, string> = {
        buyer: "/",
        seller: "/seller/dashboard",
        admin: "/admin/dashboard"
      };
      
      setTimeout(() => {
        window.location.href = roleRedirects[newRole] || "/";
      }, 500);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to switch role", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const roles = [
    { value: "buyer", label: "Buyer", description: "Browse and purchase" },
    { value: "seller", label: "Seller", description: "Sell products/services" },
    { value: "admin", label: "Admin", description: "Platform management" },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          data-testid="button-role-switcher"
          className="hover-elevate active-elevate-2"
        >
          <UserCog className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Switch Role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {roles.map((role) => (
          <DropdownMenuItem
            key={role.value}
            onClick={() => switchRoleMutation.mutate(role.value)}
            disabled={currentRole === role.value || switchRoleMutation.isPending}
            data-testid={`role-option-${role.value}`}
          >
            <div className="flex flex-col">
              <span className="font-medium">{role.label}</span>
              <span className="text-xs text-muted-foreground">{role.description}</span>
            </div>
            {currentRole === role.value && (
              <span className="ml-auto text-xs text-primary">Current</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
