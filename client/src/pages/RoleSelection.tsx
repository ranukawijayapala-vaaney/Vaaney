import { useState } from "react";
import { ShoppingBag, Store, Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { UploadResult } from "@uppy/core";
import type { UserRole } from "@shared/schema";

export default function RoleSelection() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string>("");
  const { toast } = useToast();

  const getUploadUrl = async () => {
    const response = await fetch("/api/object-storage/upload-url", {
      method: "GET",
      credentials: "include",
    });
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadUrl,
    };
  };

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    console.log("Upload complete, result:", result);
    if (result.successful && result.successful.length > 0) {
      const uploadUrl = result.successful[0].uploadURL;
      console.log("Upload URL:", uploadUrl);
      
      try {
        const response = await apiRequest("POST", "/api/object-storage/finalize-upload", {
          objectPath: uploadUrl,
        });
        
        // Parse JSON from Response object
        const data = await response.json();
        console.log("Finalize response:", data);
        
        if (data && data.objectPath) {
          setDocumentUrl(data.objectPath);
          toast({
            title: "Document uploaded",
            description: "Your verification document has been uploaded successfully.",
          });
        } else {
          throw new Error("No objectPath in response");
        }
      } catch (error) {
        console.error("Error saving document:", error);
        toast({
          title: "Upload failed",
          description: error instanceof Error ? error.message : "Failed to save verification document.",
          variant: "destructive",
        });
      }
    }
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRole) throw new Error("Please select a role");
      if (!documentUrl) throw new Error("Please upload a verification document");

      return await apiRequest("POST", "/api/user/role", {
        role: selectedRole,
        verificationDocumentUrl: documentUrl,
      });
    },
    onSuccess: () => {
      toast({
        title: "Registration submitted",
        description: "Your account is pending verification. You'll be notified once approved.",
      });
      setTimeout(() => window.location.href = "/", 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="space-y-3">
          <CardTitle className="text-3xl font-display">Welcome to Vaaney!</CardTitle>
          <CardDescription className="text-base">
            Complete your registration by selecting your role and uploading your verification document.
          </CardDescription>
          <div className="bg-muted/50 p-4 rounded-md space-y-2">
            <p className="text-sm font-medium">Required Documents:</p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• <strong>Buyers (Maldives):</strong> Valid Maldivian ID Card</li>
              <li>• <strong>Sellers (Sri Lanka):</strong> ID Card or Business Registration (BR)</li>
            </ul>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-4">
            <Label className="text-base font-semibold">I want to...</Label>
            <RadioGroup value={selectedRole || ""} onValueChange={(value) => setSelectedRole(value as UserRole)}>
              <div className="grid gap-4">
                <Card className={`cursor-pointer transition-all hover-elevate ${selectedRole === "buyer" ? "ring-2 ring-primary" : ""}`}>
                  <label htmlFor="role-buyer" className="cursor-pointer">
                    <CardContent className="p-6 flex items-start gap-4">
                      <RadioGroupItem value="buyer" id="role-buyer" data-testid="radio-buyer" />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="h-5 w-5 text-primary" />
                          <h3 className="font-semibold text-lg">Buy Products & Services</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Browse and purchase print products and digital services from verified Sri Lankan sellers. Your payments are protected with escrow.
                        </p>
                      </div>
                    </CardContent>
                  </label>
                </Card>

                <Card className={`cursor-pointer transition-all hover-elevate ${selectedRole === "seller" ? "ring-2 ring-primary" : ""}`}>
                  <label htmlFor="role-seller" className="cursor-pointer">
                    <CardContent className="p-6 flex items-start gap-4">
                      <RadioGroupItem value="seller" id="role-seller" data-testid="radio-seller" />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Store className="h-5 w-5 text-primary" />
                          <h3 className="font-semibold text-lg">Sell Products & Services</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          List your print products and digital services to Maldivian buyers. Manage inventory, packages, and earn with transparent commission (starting at 20%).
                        </p>
                      </div>
                    </CardContent>
                  </label>
                </Card>
              </div>
            </RadioGroup>
          </div>

          {selectedRole && (
            <div className="space-y-4 animate-in fade-in-50">
              <div className="space-y-3">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Verification Document (Required)
                </Label>
                <div className="bg-primary/5 border border-primary/20 p-4 rounded-md space-y-2">
                  <p className="text-sm font-medium text-primary">
                    {selectedRole === "buyer" 
                      ? "Buyers: Upload your Maldivian ID Card" 
                      : "Sellers: Upload your ID Card or Business Registration (BR)"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Accepted formats: PDF, JPG, PNG • Maximum size: 10MB
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Document must be clear and readable • All corners must be visible
                  </p>
                </div>
              </div>

              <div className="border-2 border-dashed rounded-md p-8 text-center space-y-4">
                {documentUrl ? (
                  <div className="space-y-3">
                    <div className="h-12 w-12 mx-auto rounded-md bg-primary/10 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Document uploaded successfully</p>
                      <p className="text-sm text-muted-foreground">Your document is ready for verification</p>
                    </div>
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={10485760}
                      onGetUploadParameters={getUploadUrl}
                      onComplete={handleUploadComplete}
                      variant="outline"
                      size="sm"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Different Document
                    </ObjectUploader>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="h-12 w-12 mx-auto rounded-md bg-muted flex items-center justify-center">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">Upload your verification document</p>
                      <p className="text-sm text-muted-foreground">PDF, JPG, or PNG (max 10MB)</p>
                    </div>
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={10485760}
                      onGetUploadParameters={getUploadUrl}
                      onComplete={handleUploadComplete}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Choose Document
                    </ObjectUploader>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={async () => {
                await fetch("/api/logout", { method: "POST" });
                window.location.href = "/";
              }}
              data-testid="button-cancel"
              className="hover-elevate active-elevate-2"
            >
              Cancel
            </Button>
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={!selectedRole || !documentUrl || submitMutation.isPending}
              data-testid="button-submit"
              className="hover-elevate active-elevate-2"
            >
              {submitMutation.isPending ? "Submitting..." : "Submit for Verification"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
