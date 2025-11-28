import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ChevronLeft, 
  ChevronRight, 
  Workflow, 
  Upload, 
  FileText, 
  Plus, 
  Loader2,
  DollarSign,
  Calendar,
  Package,
  Paintbrush,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { WorkflowTaskCard, WorkflowTask } from "./WorkflowTaskCard";

interface WorkflowSummary {
  tasks: WorkflowTask[];
  product?: { id: string; name: string; requiresDesignApproval: boolean; requiresQuote: boolean } | null;
  service?: { id: string; name: string; requiresDesignApproval: boolean; requiresQuote: boolean } | null;
  variants?: Array<{ id: string; name: string; price: string }>;
  packages?: Array<{ id: string; name: string; price: string }>;
}

interface WorkflowPanelProps {
  conversationId: string;
  productId?: string;
  serviceId?: string;
  userRole: "buyer" | "seller";
  itemName?: string;
  requiresDesignApproval?: boolean;
  requiresQuote?: boolean;
  onRequestQuote?: () => void;
  variants?: Array<{ id: string; name: string; price: string }>;
  packages?: Array<{ id: string; name: string; price: string }>;
  conversation?: { workflowContexts?: string[]; buyerId?: string };
  approvedDesign?: any;
  pendingDesigns?: any[];
  activeQuote?: any;
}

export function WorkflowPanel({
  conversationId,
  productId,
  serviceId,
  userRole,
  itemName,
  requiresDesignApproval = false,
  requiresQuote = false,
  onRequestQuote,
  variants: propsVariants,
  packages: propsPackages,
  conversation,
  approvedDesign,
  pendingDesigns,
  activeQuote,
}: WorkflowPanelProps) {
  const { toast } = useToast();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteQuantity, setQuoteQuantity] = useState("1");
  const [quoteVariantId, setQuoteVariantId] = useState<string>("custom");
  const [quotePackageId, setQuotePackageId] = useState<string>("custom");
  const [quoteExpires, setQuoteExpires] = useState("");
  const [quoteNotes, setQuoteNotes] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);

  const { data: workflowSummary, isLoading, refetch } = useQuery<WorkflowSummary>({
    queryKey: ["/api/conversations", conversationId, "workflow-summary"],
    enabled: !!conversationId,
  });

  const variants = workflowSummary?.variants || propsVariants || [];
  const packages = workflowSummary?.packages || propsPackages || [];
  const tasks = workflowSummary?.tasks || [];

  const uploadDesignMutation = useMutation({
    mutationFn: async (data: { 
      designFile: { url: string; filename: string; size: number; mimeType: string };
      variantId?: string;
      packageId?: string;
    }) => {
      return await apiRequest("POST", "/api/design-approvals", {
        conversationId,
        productId,
        serviceId,
        variantId: data.variantId || undefined,
        packageId: data.packageId || undefined,
        designFiles: [data.designFile],
        context: "product",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "workflow-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
      toast({ title: "Design uploaded successfully" });
      setShowUploadDialog(false);
      setSelectedFile(null);
      refetch();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to upload design", description: error.message, variant: "destructive" });
    },
  });

  const createQuoteMutation = useMutation({
    mutationFn: async (data: {
      amount: number;
      quantity: number;
      variantId?: string;
      packageId?: string;
      expiresAt?: string;
      notes?: string;
    }) => {
      return await apiRequest("POST", "/api/quotes", {
        conversationId,
        productId,
        serviceId,
        quotedPrice: data.amount.toString(),
        quantity: data.quantity,
        productVariantId: data.variantId && data.variantId !== "custom" ? data.variantId : undefined,
        servicePackageId: data.packageId && data.packageId !== "custom" ? data.packageId : undefined,
        expiresAt: data.expiresAt || undefined,
        notes: data.notes || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "workflow-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
      toast({ title: "Quote sent successfully" });
      setShowQuoteDialog(false);
      setQuoteAmount("");
      setQuoteQuantity("1");
      setQuoteVariantId("custom");
      setQuotePackageId("custom");
      setQuoteExpires("");
      setQuoteNotes("");
      refetch();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send quote", description: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    const storageKey = `workflow-panel-collapsed-${conversationId}`;
    const stored = localStorage.getItem(storageKey);
    setIsCollapsed(stored ? JSON.parse(stored) : false);
  }, [conversationId]);

  useEffect(() => {
    const storageKey = `workflow-panel-collapsed-${conversationId}`;
    localStorage.setItem(storageKey, JSON.stringify(isCollapsed));
  }, [isCollapsed, conversationId]);

  // Auto-select first variant/package when upload dialog opens
  useEffect(() => {
    if (showUploadDialog) {
      if (productId && variants.length > 0 && !selectedVariantId) {
        setSelectedVariantId(variants[0].id);
      }
      if (serviceId && packages.length > 0 && !selectedPackageId) {
        setSelectedPackageId(packages[0].id);
      }
    }
  }, [showUploadDialog, productId, serviceId, variants, packages, selectedVariantId, selectedPackageId]);

  if (!requiresDesignApproval && !requiresQuote) {
    return null;
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/gif", "application/pdf", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image (JPG, PNG, GIF, SVG) or PDF file",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    if (productId && !selectedVariantId) {
      toast({
        title: "Variant required",
        description: "Please select a product variant",
        variant: "destructive",
      });
      return;
    }

    if (serviceId && !selectedPackageId) {
      toast({
        title: "Package required",
        description: "Please select a service package",
        variant: "destructive",
      });
      return;
    }

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("conversationId", conversationId);

      const response = await fetch("/api/upload-message-attachment", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload file");
      }

      const { url } = await response.json();
      
      uploadDesignMutation.mutate({
        designFile: {
          url,
          filename: selectedFile.name,
          size: selectedFile.size,
          mimeType: selectedFile.type,
        },
        variantId: selectedVariantId || undefined,
        packageId: selectedPackageId || undefined,
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload design file",
        variant: "destructive",
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const handleCreateQuote = () => {
    const amount = parseFloat(quoteAmount);
    const quantity = parseInt(quoteQuantity);
    
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }
    if (isNaN(quantity) || quantity < 1) {
      toast({ title: "Invalid quantity", variant: "destructive" });
      return;
    }

    createQuoteMutation.mutate({
      amount,
      quantity,
      variantId: productId ? quoteVariantId : undefined,
      packageId: serviceId ? quotePackageId : undefined,
      expiresAt: quoteExpires || undefined,
      notes: quoteNotes || undefined,
    });
  };

  const handleUploadDesign = (variantId?: string, packageId?: string) => {
    setSelectedVariantId(variantId || "");
    setSelectedPackageId(packageId || "");
    setShowUploadDialog(true);
  };

  const handleSendQuote = (task?: WorkflowTask) => {
    if (task) {
      setQuoteVariantId(task.variantId || "custom");
      setQuotePackageId(task.packageId || "custom");
    }
    setShowQuoteDialog(true);
  };

  const handlePurchase = (task: WorkflowTask) => {
    if (task.type === "design" && task.variantId && task.productId) {
      window.location.href = `/product/${task.productId}?variantId=${task.variantId}&designApprovalId=${task.designApprovalId}`;
    } else if (task.type === "quote" && task.quoteId) {
      window.location.href = `/checkout?quoteId=${task.quoteId}`;
    }
  };

  const renderCompactSummary = () => {
    const designCount = tasks.filter(t => t.type === "design").length;
    const quoteCount = tasks.filter(t => t.type === "quote").length;
    const approvedDesigns = tasks.filter(t => t.type === "design" && t.status === "approved").length;
    const acceptedQuotes = tasks.filter(t => t.type === "quote" && t.status === "accepted").length;

    return (
      <div className="flex flex-wrap gap-2">
        {requiresDesignApproval && (
          <Badge variant={approvedDesigns > 0 ? "default" : designCount > 0 ? "secondary" : "outline"}>
            {approvedDesigns > 0 ? `${approvedDesigns} Approved` : designCount > 0 ? `${designCount} Pending` : "No Designs"}
          </Badge>
        )}
        {requiresQuote && (
          <Badge variant={acceptedQuotes > 0 ? "default" : quoteCount > 0 ? "secondary" : "outline"}>
            {acceptedQuotes > 0 ? `${acceptedQuotes} Accepted` : quoteCount > 0 ? `${quoteCount} Quotes` : "No Quotes"}
          </Badge>
        )}
      </div>
    );
  };

  const renderTaskList = () => (
    <div className="space-y-3">
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <p className="text-sm">No workflow tasks yet</p>
          <p className="text-xs mt-1">
            {requiresDesignApproval && userRole === "buyer" && "Upload a design to get started"}
            {requiresQuote && userRole === "buyer" && "Request a custom quote"}
          </p>
        </div>
      ) : (
        tasks.map((task) => (
          <WorkflowTaskCard
            key={task.id}
            task={task}
            userRole={userRole}
            conversationId={conversationId}
            onUploadDesign={handleUploadDesign}
            onRequestQuote={onRequestQuote}
            onSendQuote={handleSendQuote}
            onPurchase={handlePurchase}
            onRefresh={refetch}
          />
        ))
      )}
    </div>
  );

  const renderActions = () => (
    <div className="flex flex-wrap gap-2 pt-3 border-t">
      {requiresDesignApproval && userRole === "buyer" && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowUploadDialog(true)}
          data-testid="button-new-design"
        >
          <Upload className="h-3 w-3 mr-1" />
          Upload Design
        </Button>
      )}
      {requiresQuote && userRole === "seller" && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowQuoteDialog(true)}
          data-testid="button-new-quote"
        >
          <FileText className="h-3 w-3 mr-1" />
          Send Quote
        </Button>
      )}
    </div>
  );

  const desktopContent = (
    <Card className="h-full hidden md:flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2 pb-3">
        <CardTitle className="text-base font-semibold">Workflow</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? "Expand workflow panel" : "Collapse workflow panel"}
          data-testid="button-toggle-workflow-panel"
        >
          {isCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden pb-4">
        {isCollapsed ? (
          renderCompactSummary()
        ) : (
          <div className="flex flex-col h-full">
            <ScrollArea className="flex-1">
              {renderTaskList()}
            </ScrollArea>
            {renderActions()}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const mobileContent = (
    <div className="md:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" className="w-full gap-2" data-testid="button-open-workflow-mobile">
            <Workflow className="h-4 w-4" />
            Workflow
            {renderCompactSummary()}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <SheetTitle>Workflow</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col h-full mt-4">
            <ScrollArea className="flex-1">
              {renderTaskList()}
            </ScrollArea>
            {renderActions()}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );

  return (
    <>
      {desktopContent}
      {mobileContent}

      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Design</DialogTitle>
            <DialogDescription>
              Upload your design file for seller approval
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {productId && variants.length > 0 && (
              <div>
                <Label htmlFor="variant-select">Select Variant</Label>
                <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
                  <SelectTrigger id="variant-select" data-testid="select-design-variant">
                    <SelectValue placeholder="Choose variant..." />
                  </SelectTrigger>
                  <SelectContent>
                    {variants.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name} - ${parseFloat(v.price).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {serviceId && packages.length > 0 && (
              <div>
                <Label htmlFor="package-select">Select Package</Label>
                <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
                  <SelectTrigger id="package-select" data-testid="select-design-package">
                    <SelectValue placeholder="Choose package..." />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} - ${parseFloat(p.price).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="design-file">Design File</Label>
              <Input
                id="design-file"
                type="file"
                accept=".jpg,.jpeg,.png,.gif,.pdf,.svg"
                onChange={handleFileSelect}
                data-testid="input-design-file"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Accepted: JPG, PNG, GIF, SVG, PDF (max 10MB)
              </p>
              {selectedFile && (
                <p className="text-sm text-primary mt-2">{selectedFile.name}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUploadSubmit}
              disabled={uploadingFile || uploadDesignMutation.isPending || !selectedFile}
              data-testid="button-submit-design"
            >
              {(uploadingFile || uploadDesignMutation.isPending) ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showQuoteDialog} onOpenChange={setShowQuoteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Quote</DialogTitle>
            <DialogDescription>
              Create a custom quote for the buyer
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {productId && (
              <div>
                <Label>Variant (Optional)</Label>
                <Select value={quoteVariantId} onValueChange={setQuoteVariantId}>
                  <SelectTrigger data-testid="select-quote-variant">
                    <SelectValue placeholder="Select variant..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">
                      <div className="flex items-center gap-2">
                        <Paintbrush className="h-4 w-4" />
                        Custom Specifications
                      </div>
                    </SelectItem>
                    {variants.length > 0 && <Separator className="my-1" />}
                    {variants.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name} - ${parseFloat(v.price).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {serviceId && (
              <div>
                <Label>Package (Optional)</Label>
                <Select value={quotePackageId} onValueChange={setQuotePackageId}>
                  <SelectTrigger data-testid="select-quote-package">
                    <SelectValue placeholder="Select package..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">
                      <div className="flex items-center gap-2">
                        <Paintbrush className="h-4 w-4" />
                        Custom Specifications
                      </div>
                    </SelectItem>
                    {packages.length > 0 && <Separator className="my-1" />}
                    {packages.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} - ${parseFloat(p.price).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="quote-quantity">Quantity</Label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="quote-quantity"
                  type="number"
                  min="1"
                  value={quoteQuantity}
                  onChange={(e) => setQuoteQuantity(e.target.value)}
                  className="pl-9"
                  data-testid="input-quote-quantity"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="quote-amount">Quote Amount (USD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="quote-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={quoteAmount}
                  onChange={(e) => setQuoteAmount(e.target.value)}
                  className="pl-9"
                  data-testid="input-quote-amount"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="quote-expires">Expiration (Optional)</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="quote-expires"
                  type="date"
                  value={quoteExpires}
                  onChange={(e) => setQuoteExpires(e.target.value)}
                  className="pl-9"
                  min={new Date().toISOString().split("T")[0]}
                  data-testid="input-quote-expires"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="quote-notes">Notes (Optional)</Label>
              <Textarea
                id="quote-notes"
                placeholder="Additional details..."
                value={quoteNotes}
                onChange={(e) => setQuoteNotes(e.target.value)}
                rows={2}
                data-testid="textarea-quote-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuoteDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateQuote}
              disabled={createQuoteMutation.isPending || !quoteAmount || parseFloat(quoteAmount) <= 0}
              data-testid="button-submit-quote"
            >
              {createQuoteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Send Quote
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
