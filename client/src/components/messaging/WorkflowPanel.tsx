import { useState, useEffect, useMemo } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Info,
  CheckCircle,
  Clock,
  Lock,
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
  // Buyer's target variant selection at panel level
  const [buyerSelectedVariantId, setBuyerSelectedVariantId] = useState<string>("");
  const [buyerSelectedPackageId, setBuyerSelectedPackageId] = useState<string>("");
  // Track if workflow intro has been dismissed
  const [showWorkflowIntro, setShowWorkflowIntro] = useState(true);

  const { data: workflowSummary, isLoading, refetch } = useQuery<WorkflowSummary>({
    queryKey: ["/api/conversations", conversationId, "workflow-summary"],
    enabled: !!conversationId,
  });

  const variants = workflowSummary?.variants || propsVariants || [];
  const packages = workflowSummary?.packages || propsPackages || [];
  const tasks = workflowSummary?.tasks || [];
  
  // Use API response values if available, fallback to props
  const effectiveRequiresDesignApproval = workflowSummary?.product?.requiresDesignApproval 
    ?? workflowSummary?.service?.requiresDesignApproval 
    ?? requiresDesignApproval;
  const effectiveRequiresQuote = workflowSummary?.product?.requiresQuote 
    ?? workflowSummary?.service?.requiresQuote 
    ?? requiresQuote;

  // Product/service name for display
  const productName = workflowSummary?.product?.name || workflowSummary?.service?.name || itemName || "Item";

  // Variants with "Custom" option for buyers
  const variantsWithCustom = useMemo(() => {
    const customOption = { id: "custom", name: "Custom Specifications", price: "0" };
    return [customOption, ...variants];
  }, [variants]);

  const packagesWithCustom = useMemo(() => {
    const customOption = { id: "custom", name: "Custom Specifications", price: "0" };
    return [customOption, ...packages];
  }, [packages]);

  // Get approved designs per variant
  const approvedDesignsMap = useMemo(() => {
    const map = new Map<string, WorkflowTask>();
    tasks.forEach(task => {
      if (task.type === "design" && task.status === "approved") {
        const key = task.variantId || task.packageId || "custom";
        if (!map.has(key)) {
          map.set(key, task);
        }
      }
    });
    return map;
  }, [tasks]);

  // Check if the buyer's selected variant has an approved design
  const selectedVariantKey = productId ? buyerSelectedVariantId : buyerSelectedPackageId;
  const selectedVariantHasApprovedDesign = approvedDesignsMap.has(selectedVariantKey || "custom");

  // Get the approved design for the selected variant (for linking to quotes)
  const approvedDesignForSelectedVariant = approvedDesignsMap.get(selectedVariantKey || "custom");

  // Check if the seller's selected quote variant has an approved design (for design-first enforcement)
  const quoteVariantKey = productId ? quoteVariantId : quotePackageId;
  const quoteVariantHasApprovedDesign = approvedDesignsMap.has(quoteVariantKey || "custom");
  const approvedDesignForQuoteVariant = approvedDesignsMap.get(quoteVariantKey || "custom");

  // Get display name for the selected variant
  const getVariantDisplayName = (variantId: string | undefined) => {
    if (!variantId || variantId === "custom") return "Custom Specifications";
    const variant = variants.find(v => v.id === variantId);
    const pkg = packages.find(p => p.id === variantId);
    return variant?.name || pkg?.name || "Unknown";
  };

  // Group tasks by variant/package for display
  const tasksByVariant = useMemo(() => {
    const grouped = new Map<string, { name: string; tasks: WorkflowTask[] }>();
    
    tasks.forEach(task => {
      const key = task.variantId || task.packageId || "custom";
      const name = task.variantName || task.packageName || "Custom Specifications";
      
      if (!grouped.has(key)) {
        grouped.set(key, { name, tasks: [] });
      }
      grouped.get(key)!.tasks.push(task);
    });
    
    return grouped;
  }, [tasks]);

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
      designApprovalId?: string;
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
        designApprovalId: data.designApprovalId || undefined,
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

  // Load workflow intro dismissed state from localStorage
  useEffect(() => {
    const introKey = `workflow-intro-dismissed-${conversationId}`;
    const dismissed = localStorage.getItem(introKey);
    setShowWorkflowIntro(!dismissed);
  }, [conversationId]);

  const dismissWorkflowIntro = () => {
    const introKey = `workflow-intro-dismissed-${conversationId}`;
    localStorage.setItem(introKey, "true");
    setShowWorkflowIntro(false);
  };

  // Auto-select first variant for buyer when data loads
  useEffect(() => {
    if (userRole === "buyer") {
      if (productId && variants.length > 0 && !buyerSelectedVariantId) {
        // Default to first real variant, or "custom" if none
        setBuyerSelectedVariantId(variants[0]?.id || "custom");
      }
      if (serviceId && packages.length > 0 && !buyerSelectedPackageId) {
        setBuyerSelectedPackageId(packages[0]?.id || "custom");
      }
    }
  }, [productId, serviceId, variants, packages, userRole, buyerSelectedVariantId, buyerSelectedPackageId]);

  // Auto-select first variant/package when upload dialog opens - use buyer's selection
  useEffect(() => {
    if (showUploadDialog) {
      if (productId) {
        // Use buyer's selected variant or default to first
        setSelectedVariantId(buyerSelectedVariantId || variants[0]?.id || "custom");
      }
      if (serviceId) {
        setSelectedPackageId(buyerSelectedPackageId || packages[0]?.id || "custom");
      }
    }
  }, [showUploadDialog, productId, serviceId, variants, packages, buyerSelectedVariantId, buyerSelectedPackageId]);

  if (!effectiveRequiresDesignApproval && !effectiveRequiresQuote) {
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
        variantId: selectedVariantId && selectedVariantId !== "custom" ? selectedVariantId : undefined,
        packageId: selectedPackageId && selectedPackageId !== "custom" ? selectedPackageId : undefined,
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
      designApprovalId: approvedDesignForQuoteVariant?.id || undefined,
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
        {effectiveRequiresDesignApproval && (
          <Badge variant={approvedDesigns > 0 ? "default" : designCount > 0 ? "secondary" : "outline"}>
            {approvedDesigns > 0 ? `${approvedDesigns} Approved` : designCount > 0 ? `${designCount} Pending` : "No Designs"}
          </Badge>
        )}
        {effectiveRequiresQuote && (
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
            {effectiveRequiresDesignApproval && userRole === "buyer" && "Upload a design to get started"}
            {!effectiveRequiresDesignApproval && effectiveRequiresQuote && userRole === "buyer" && "Request a custom quote"}
          </p>
        </div>
      ) : tasksByVariant.size > 1 ? (
        // Group tasks by variant when there are multiple variants
        Array.from(tasksByVariant.entries()).map(([variantKey, { name, tasks: variantTasks }]) => (
          <div key={variantKey} className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground border-b pb-1">
              <Package className="h-3 w-3" />
              {name}
              {approvedDesignsMap.has(variantKey) && (
                <CheckCircle className="h-3 w-3 text-green-500" />
              )}
            </div>
            {variantTasks.map((task) => (
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
            ))}
          </div>
        ))
      ) : (
        // Single variant or all tasks for same variant - show flat list
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

  // Render the workflow intro banner for buyers
  const renderWorkflowIntro = () => {
    if (!showWorkflowIntro || userRole !== "buyer") return null;
    
    return (
      <Alert className="mb-3 bg-gradient-to-r from-teal-50 to-blue-50 dark:from-teal-950/30 dark:to-blue-950/30 border-teal-200 dark:border-teal-800">
        <Info className="h-4 w-4 text-teal-600 dark:text-teal-400" />
        <AlertDescription className="text-teal-800 dark:text-teal-200 text-sm">
          <strong>Workflow Manager</strong> - This panel helps you manage design approvals and custom quotes.
          {effectiveRequiresDesignApproval && effectiveRequiresQuote && (
            <span> Upload your design first, then request a quote once approved.</span>
          )}
          {effectiveRequiresDesignApproval && !effectiveRequiresQuote && (
            <span> Upload your design for seller approval before purchase.</span>
          )}
          {!effectiveRequiresDesignApproval && effectiveRequiresQuote && (
            <span> Request a custom quote from the seller.</span>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-auto px-2 py-0 ml-2 text-teal-700 dark:text-teal-300 underline"
            onClick={dismissWorkflowIntro}
          >
            Dismiss
          </Button>
        </AlertDescription>
      </Alert>
    );
  };

  // Render the buyer's variant selector
  const renderBuyerVariantSelector = () => {
    if (userRole !== "buyer") return null;
    
    return (
      <div className="mb-3 p-3 bg-muted/50 rounded-lg">
        <Label className="text-xs text-muted-foreground mb-2 block">Select Variant to Work On</Label>
        {productId && (
          <Select value={buyerSelectedVariantId} onValueChange={setBuyerSelectedVariantId}>
            <SelectTrigger data-testid="select-buyer-variant" className="h-9">
              <SelectValue placeholder="Choose variant..." />
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
                  <div className="flex items-center gap-2">
                    {approvedDesignsMap.has(v.id) && <CheckCircle className="h-3 w-3 text-green-500" />}
                    {v.name} - ${parseFloat(v.price).toFixed(2)}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {serviceId && (
          <Select value={buyerSelectedPackageId} onValueChange={setBuyerSelectedPackageId}>
            <SelectTrigger data-testid="select-buyer-package" className="h-9">
              <SelectValue placeholder="Choose package..." />
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
                  <div className="flex items-center gap-2">
                    {approvedDesignsMap.has(p.id) && <CheckCircle className="h-3 w-3 text-green-500" />}
                    {p.name} - ${parseFloat(p.price).toFixed(2)}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {/* Show status for selected variant */}
        {selectedVariantKey && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            {selectedVariantHasApprovedDesign ? (
              <Badge variant="default" className="gap-1 bg-green-500">
                <CheckCircle className="h-3 w-3" />
                Design Approved
              </Badge>
            ) : effectiveRequiresDesignApproval ? (
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                Design Required
              </Badge>
            ) : null}
          </div>
        )}
      </div>
    );
  };

  const renderActions = () => (
    <div className="flex flex-wrap gap-2 pt-3 border-t">
      {effectiveRequiresDesignApproval && userRole === "buyer" && (
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
      {/* Request Quote button for buyers - only shown when design is approved (if design is required) */}
      {effectiveRequiresQuote && userRole === "buyer" && (
        <>
          {!effectiveRequiresDesignApproval || selectedVariantHasApprovedDesign ? (
            <Button
              size="sm"
              variant="outline"
              onClick={onRequestQuote}
              data-testid="button-request-quote"
            >
              <FileText className="h-3 w-3 mr-1" />
              Request Quote
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled
              className="opacity-50"
              title="Design approval required first"
              data-testid="button-request-quote-disabled"
            >
              <Lock className="h-3 w-3 mr-1" />
              Request Quote
            </Button>
          )}
        </>
      )}
      {effectiveRequiresQuote && userRole === "seller" && (
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
            {renderWorkflowIntro()}
            {renderBuyerVariantSelector()}
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
        <SheetContent side="bottom" className="h-[80vh] flex flex-col">
          <SheetHeader className="flex-shrink-0">
            <SheetTitle>Workflow</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col flex-1 overflow-hidden mt-4">
            <div className="flex-shrink-0">
              {renderWorkflowIntro()}
              {renderBuyerVariantSelector()}
            </div>
            <ScrollArea className="flex-1 min-h-0">
              {renderTaskList()}
            </ScrollArea>
            <div className="flex-shrink-0">
              {renderActions()}
            </div>
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
            <DialogTitle>
              Upload Design for {productName}
              {(selectedVariantId || selectedPackageId) && (
                <span className="text-muted-foreground font-normal">
                  {" "}— {getVariantDisplayName(selectedVariantId || selectedPackageId)}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              Upload your design file for seller approval
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Info message about quote activation */}
            {effectiveRequiresQuote && (
              <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
                  Once your design is approved, you can request custom quotes for this variant.
                </AlertDescription>
              </Alert>
            )}

            {productId && (
              <div>
                <Label htmlFor="variant-select">Select Variant</Label>
                <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
                  <SelectTrigger id="variant-select" data-testid="select-design-variant">
                    <SelectValue placeholder="Choose variant..." />
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
                <Label htmlFor="package-select">Select Package</Label>
                <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
                  <SelectTrigger id="package-select" data-testid="select-design-package">
                    <SelectValue placeholder="Choose package..." />
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

            {/* Design-first enforcement warning for sellers - only when BOTH design AND quote are required */}
            {effectiveRequiresDesignApproval && effectiveRequiresQuote && !quoteVariantHasApprovedDesign && (
              <Alert variant="destructive" data-testid="alert-design-required-for-quote">
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  <strong>Design approval required.</strong> The buyer must upload and you must approve a design for {getVariantDisplayName(quoteVariantKey)} before you can send a quote.
                </AlertDescription>
              </Alert>
            )}

            {/* Show approved design info when available - only when BOTH design AND quote are required */}
            {effectiveRequiresDesignApproval && effectiveRequiresQuote && quoteVariantHasApprovedDesign && (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950" data-testid="alert-design-approved">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  Design approved for {getVariantDisplayName(quoteVariantKey)}. You can now send a quote.
                </AlertDescription>
              </Alert>
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
              disabled={
                createQuoteMutation.isPending || 
                !quoteAmount || 
                parseFloat(quoteAmount) <= 0 ||
                (effectiveRequiresDesignApproval && effectiveRequiresQuote && !quoteVariantHasApprovedDesign)
              }
              data-testid="button-submit-quote"
            >
              {createQuoteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : effectiveRequiresDesignApproval && effectiveRequiresQuote && !quoteVariantHasApprovedDesign ? (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Design Required
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
