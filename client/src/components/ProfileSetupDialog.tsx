import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Phone, MapPin, AlertCircle } from "lucide-react";
import type { ShippingAddress } from "@shared/schema";

const DISMISSED_KEY = "profile-setup-dismissed";

export default function ProfileSetupDialog() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [hasDismissed, setHasDismissed] = useState(false);

  const { data: shippingAddresses } = useQuery<ShippingAddress[]>({
    queryKey: ["/api/shipping-addresses"],
    enabled: user?.role === "buyer",
  });

  useEffect(() => {
    if (!user || user.role !== "buyer") return;

    const dismissed = sessionStorage.getItem(DISMISSED_KEY);
    if (dismissed) {
      setHasDismissed(true);
      return;
    }

    const missingContactNumber = !user.userContactNumber;
    const missingShippingAddress = !shippingAddresses || shippingAddresses.length === 0;

    if (missingContactNumber || missingShippingAddress) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, shippingAddresses]);

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, "true");
    setHasDismissed(true);
    setIsOpen(false);
  };

  const handleGoToProfile = () => {
    sessionStorage.setItem(DISMISSED_KEY, "true");
    setHasDismissed(true);
    setIsOpen(false);
    setLocation("/profile");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      sessionStorage.setItem(DISMISSED_KEY, "true");
      setHasDismissed(true);
    }
    setIsOpen(open);
  };

  if (!user || user.role !== "buyer" || hasDismissed) {
    return null;
  }

  const missingContactNumber = !user.userContactNumber;
  const missingShippingAddress = !shippingAddresses || shippingAddresses.length === 0;

  if (!missingContactNumber && !missingShippingAddress) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent data-testid="dialog-profile-setup">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            Complete Your Profile
          </DialogTitle>
          <DialogDescription>
            To ensure smooth order processing and delivery, please add the following information to your profile:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {missingContactNumber && (
            <Alert>
              <Phone className="h-4 w-4" />
              <AlertDescription>
                <strong>Contact Number:</strong> Helps us reach you for order updates and delivery coordination
              </AlertDescription>
            </Alert>
          )}

          {missingShippingAddress && (
            <Alert>
              <MapPin className="h-4 w-4" />
              <AlertDescription>
                <strong>Shipping Address:</strong> Required for product deliveries. You can save multiple addresses for convenience
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleDismiss}
            data-testid="button-dismiss-setup"
          >
            I'll do this later
          </Button>
          <Button
            onClick={handleGoToProfile}
            data-testid="button-go-to-profile"
          >
            Complete Profile Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
