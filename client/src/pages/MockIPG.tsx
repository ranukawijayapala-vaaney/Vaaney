import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Building2, CheckCircle, XCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function MockIPG() {
  const [, setLocation] = useLocation();
  const [processing, setProcessing] = useState(false);
  const [params, setParams] = useState<{
    transactionRef: string;
    amount: string;
    merchantId: string;
    returnUrl: string;
    transactionType: string;
  } | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const transactionRef = searchParams.get("transactionRef");
    const amount = searchParams.get("amount");
    const merchantId = searchParams.get("merchantId");
    const returnUrl = searchParams.get("returnUrl");
    const transactionType = searchParams.get("transactionType");

    if (transactionRef && amount && merchantId && returnUrl && transactionType) {
      setParams({
        transactionRef,
        amount,
        merchantId,
        returnUrl,
        transactionType,
      });
    }
  }, []);

  const handlePayment = async (success: boolean) => {
    setProcessing(true);
    
    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (params) {
      // Simulate webhook call to backend
      const webhookUrl = `${window.location.origin}/api/webhooks/ipg-payment`;
      
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "X-Webhook-Secret": "mock_webhook_secret_for_development"
          },
          body: JSON.stringify({
            transactionRef: params.transactionRef,
            status: success ? "SUCCESS" : "FAILED",
            amount: params.amount,
            paymentMethod: "IPG",
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (error) {
        console.error("Webhook error:", error);
      }
      
      // Redirect back to merchant site
      const returnUrl = new URL(params.returnUrl);
      returnUrl.searchParams.set("payment", success ? "success" : "failed");
      returnUrl.searchParams.set("transactionRef", params.transactionRef);
      window.location.href = returnUrl.toString();
    }
  };

  if (!params) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Invalid Payment Request</CardTitle>
            <CardDescription>Missing required payment parameters</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/")} variant="outline" className="w-full" data-testid="button-return-home">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <Card className="w-full max-w-md border-2">
        <CardHeader className="space-y-1 pb-4">
          <div className="flex items-center gap-2 text-primary">
            <Building2 className="h-6 w-6" />
            <CardTitle className="text-xl">Mock Payment Gateway</CardTitle>
          </div>
          <CardDescription className="text-xs">
            This is a simulated payment gateway for testing purposes
          </CardDescription>
        </CardHeader>
        
        <Separator />
        
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Merchant ID:</span>
              <span className="text-sm font-medium" data-testid="text-merchant-id">{params.merchantId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Transaction Ref:</span>
              <span className="text-sm font-mono font-medium" data-testid="text-transaction-ref">{params.transactionRef}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Transaction Type:</span>
              <span className="text-sm font-medium capitalize" data-testid="text-transaction-type">{params.transactionType}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-base font-semibold">Amount:</span>
              <span className="text-2xl font-bold text-primary" data-testid="text-amount">
                ${parseFloat(params.amount).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg border">
            <p className="text-xs text-muted-foreground text-center">
              In a real IPG, you would enter your card details here. For testing, use the buttons below to simulate payment success or failure.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => handlePayment(true)}
              disabled={processing}
              className="w-full"
              size="lg"
              data-testid="button-simulate-success"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              {processing ? "Processing..." : "Simulate Successful Payment"}
            </Button>
            
            <Button
              onClick={() => handlePayment(false)}
              disabled={processing}
              variant="destructive"
              className="w-full"
              size="lg"
              data-testid="button-simulate-failure"
            >
              <XCircle className="h-5 w-5 mr-2" />
              {processing ? "Processing..." : "Simulate Failed Payment"}
            </Button>
            
            <Button
              onClick={() => window.history.back()}
              disabled={processing}
              variant="outline"
              className="w-full"
              data-testid="button-cancel"
            >
              Cancel Payment
            </Button>
          </div>

          <div className="pt-2">
            <p className="text-xs text-center text-muted-foreground">
              <CreditCard className="h-3 w-3 inline mr-1" />
              Secured by Mock IPG v1.0
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
