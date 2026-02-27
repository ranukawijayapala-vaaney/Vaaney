import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function PaymentReturn() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"verifying" | "success" | "failed">("verifying");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const resultIndicator = searchParams.get("resultIndicator");
    const transactionType = searchParams.get("type");
    const transactionRef = searchParams.get("ref");

    if (!resultIndicator || !transactionRef || !transactionType) {
      setStatus("failed");
      setMessage("Payment was cancelled or missing payment details.");
      return;
    }

    async function verifyPayment() {
      try {
        const response = await apiRequest("POST", "/api/payments/verify", {
          transactionRef,
          resultIndicator,
          transactionType,
        });
        const data = await response.json();
        if (data.success) {
          setStatus("success");
          setMessage("Your payment has been confirmed successfully.");
        } else {
          setStatus("failed");
          setMessage(data.message || "Payment verification failed. Please contact support.");
        }
      } catch (error: any) {
        setStatus("failed");
        setMessage("Unable to verify payment. Please check your order status or contact support.");
      }
    }

    verifyPayment();
  }, []);

  function getRedirectPath() {
    const searchParams = new URLSearchParams(window.location.search);
    const type = searchParams.get("type");
    if (type === "booking") return "/bookings";
    if (type === "boost") return "/seller/boost";
    return "/orders";
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === "verifying" && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-3" />
              <CardTitle data-testid="text-payment-status">Verifying Payment</CardTitle>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <CardTitle data-testid="text-payment-status">Payment Successful</CardTitle>
            </>
          )}
          {status === "failed" && (
            <>
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
              <CardTitle data-testid="text-payment-status">Payment Not Completed</CardTitle>
            </>
          )}
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground" data-testid="text-payment-message">
            {status === "verifying" ? "Please wait while we confirm your payment with the bank..." : message}
          </p>
          {status !== "verifying" && (
            <Button
              onClick={() => setLocation(getRedirectPath())}
              className="w-full"
              data-testid="button-continue"
            >
              {status === "success" ? "View My Orders" : "Return to Previous Page"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
