import { useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";

declare global {
  interface Window {
    Checkout: {
      configure: (config: any) => void;
      showPaymentPage: () => void;
    };
  }
}

function getFallbackPath(type?: string | null): string {
  switch (type) {
    case "booking":
      return "/bookings";
    case "boost":
      return "/seller/boost";
    case "checkout":
    case "order":
    case "quote":
    default:
      return "/orders";
  }
}

export default function PaymentProcessing() {
  const [, navigate] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState(false);

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const sessionId = params.get("sessionId");
  const returnType = params.get("type");
  const urlError = params.get("error");
  const fallbackPath = getFallbackPath(returnType);

  const { data: mpgsConfig } = useQuery<{ checkoutJsUrl: string; merchantId: string }>({
    queryKey: ["/api/payments/mpgs-config"],
    enabled: !!sessionId && !urlError,
  });

  useEffect(() => {
    if (urlError) {
      setError("Payment could not be completed. Please try again.");
    }
  }, [urlError]);

  useEffect(() => {
    if (!sessionId || !mpgsConfig || configured || urlError) return;

    const script = document.createElement("script");
    script.src = mpgsConfig.checkoutJsUrl;

    const currentUrl = window.location.origin;
    const errorUrl = `${currentUrl}/payment-processing?error=true&type=${returnType || "checkout"}`;
    const cancelUrl = `${currentUrl}${fallbackPath}`;
    script.setAttribute("data-error", errorUrl);
    script.setAttribute("data-cancel", cancelUrl);

    script.onload = () => {
      try {
        window.Checkout.configure({
          merchant: mpgsConfig.merchantId,
          session: {
            id: sessionId,
          },
        });
        setConfigured(true);
        window.Checkout.showPaymentPage();
      } catch (err: any) {
        console.error("[MPGS] Configure error:", err);
        setError("Failed to initialize payment. Please try again.");
      }
    };

    script.onerror = () => {
      setError("Failed to load payment gateway. Please try again.");
    };

    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [sessionId, mpgsConfig, configured, urlError, returnType, fallbackPath]);

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-destructive" />
            <p className="text-lg font-medium mb-2">Invalid Payment Session</p>
            <p className="text-sm text-muted-foreground mb-4">No payment session was provided. Please try again from your order.</p>
            <Button
              onClick={() => navigate(fallbackPath)}
              variant="outline"
              data-testid="button-back-from-invalid"
            >
              Go back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-destructive" />
            <p className="text-lg font-medium mb-2">Payment Error</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button
              onClick={() => navigate(fallbackPath)}
              variant="outline"
              data-testid="button-back-from-error"
            >
              Go back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg font-medium" data-testid="text-payment-processing">Preparing payment...</p>
          <p className="text-sm text-muted-foreground mt-2">You will be redirected to the secure payment page shortly.</p>
        </CardContent>
      </Card>
    </div>
  );
}
