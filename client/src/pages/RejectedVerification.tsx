import { XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";

export default function RejectedVerification() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center space-y-4">
          <div className="h-16 w-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-display">Verification Rejected</CardTitle>
          <CardDescription className="text-base">
            Unfortunately, your verification was not approved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {user?.verificationRejectionReason && (
            <Alert variant="destructive">
              <AlertDescription>
                <p className="font-medium mb-1">Reason for rejection:</p>
                <p className="text-sm">{user.verificationRejectionReason}</p>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">What you can do:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Ensure your documents are clear and readable</li>
                <li>Submit valid government-issued ID or business registration</li>
                <li>Make sure document information matches your profile</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              className="w-full hover-elevate active-elevate-2"
              onClick={() => window.location.href = "/role-selection"}
              data-testid="button-resubmit"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Resubmit Documents
            </Button>
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
