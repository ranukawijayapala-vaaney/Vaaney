import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ExternalLink, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

interface PendingConsent {
  documentType: string;
  version: string;
  title: string;
  path: string;
}

interface PendingConsentsResponse {
  documents: PendingConsent[];
}

export function ConsentGate() {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});

  // Don't block users while they're reading the very documents they need to
  // accept (legal pages may be opened in a new tab from the gate's links).
  const onLegalPage = location.startsWith("/legal/");

  const { data } = useQuery<PendingConsentsResponse>({
    queryKey: ["/api/legal/pending-consents"],
    enabled: isAuthenticated && !!user && !onLegalPage,
  });

  const acceptMutation = useMutation({
    mutationFn: async (documents: string[]) => {
      return await apiRequest("POST", "/api/legal/accept", { documents });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/legal/pending-consents"] });
      setAccepted({});
      toast({
        title: "Thank you",
        description: "Your acceptance has been recorded.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not record acceptance",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const pending = data?.documents ?? [];
  const open = isAuthenticated && !onLegalPage && pending.length > 0;
  const allChecked = pending.length > 0 && pending.every((d) => accepted[d.documentType]);

  if (!open) return null;

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        data-testid="dialog-consent-gate"
      >
        <DialogHeader>
          <DialogTitle>Updated terms — please review and accept</DialogTitle>
          <DialogDescription>
            We've updated the documents that govern your use of Vaaney. Please review
            and accept each one below to continue using your account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {pending.map((doc) => (
            <label
              key={doc.documentType}
              htmlFor={`consent-${doc.documentType}`}
              className="flex items-start gap-3 rounded-md border p-3 hover-elevate cursor-pointer"
              data-testid={`row-consent-${doc.documentType}`}
            >
              <Checkbox
                id={`consent-${doc.documentType}`}
                checked={!!accepted[doc.documentType]}
                onCheckedChange={(value) =>
                  setAccepted((prev) => ({
                    ...prev,
                    [doc.documentType]: value === true,
                  }))
                }
                data-testid={`checkbox-consent-${doc.documentType}`}
              />
              <div className="flex-1 space-y-1">
                <div className="text-sm font-medium leading-tight">
                  I have read and accept the {doc.title}
                </div>
                <Link
                  href={doc.path}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  data-testid={`link-consent-${doc.documentType}`}
                  target="_blank"
                >
                  Read {doc.title} (v{doc.version})
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </label>
          ))}
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            variant="ghost"
            onClick={async () => {
              await fetch("/api/logout", { method: "POST" });
              window.location.href = "/";
            }}
            data-testid="button-consent-logout"
          >
            Sign out
          </Button>
          <Button
            disabled={!allChecked || acceptMutation.isPending}
            onClick={() =>
              acceptMutation.mutate(pending.map((d) => d.documentType))
            }
            data-testid="button-consent-accept"
          >
            {acceptMutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Accept and continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
