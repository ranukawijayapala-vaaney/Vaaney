import { Clock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PendingVerification() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center space-y-4">
          <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-display">Verification Pending</CardTitle>
          <CardDescription className="text-base">
            Your account is currently under review by our admin team.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-md bg-muted">
              <Mail className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">We'll notify you via email</p>
                <p className="text-sm text-muted-foreground">
                  Once your documents are verified, you'll receive an email notification and can access your account.
                </p>
              </div>
            </div>

            <div className="text-sm text-muted-foreground space-y-2">
              <p>Verification typically takes:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>24-48 hours for standard reviews</li>
                <li>Up to 3 business days during peak periods</li>
              </ul>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full hover-elevate active-elevate-2"
            onClick={async () => {
              await fetch("/api/logout", { method: "POST" });
              window.location.href = "/";
            }}
            data-testid="button-logout"
          >
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
