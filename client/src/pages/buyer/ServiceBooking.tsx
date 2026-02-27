import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar, ChevronRight, Check, CreditCard, Building2, Package as PackageIcon, Edit2, ChevronDown, MessageCircle, FileText, Upload, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addDays, format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { Service, ServicePackage, PaymentMethod } from "@shared/schema";

interface ServiceWithPackages extends Service {
  packages: ServicePackage[];
  seller: {
    id: string;
    firstName: string;
    lastName: string;
    shopName?: string;
  };
}

export default function ServiceBooking({ serviceId }: { serviceId: string }) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("package");
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [isCustomQuoteSelected, setIsCustomQuoteSelected] = useState(false);
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("ipg");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [notesOpen, setNotesOpen] = useState(false);
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>("");
  const [transferSlipUrl, setTransferSlipUrl] = useState<string>("");
  const [transferSlipObjectPath, setTransferSlipObjectPath] = useState<string>("");
  const [isUploadingSlip, setIsUploadingSlip] = useState(false);
  const [showDesignApprovalGate, setShowDesignApprovalGate] = useState(false);
  const [pendingPackageSelection, setPendingPackageSelection] = useState<{ packageId?: string; isCustomQuote: boolean } | null>(null);
  const [showPrePurchaseDialog, setShowPrePurchaseDialog] = useState(false);
  const [pendingPackageId, setPendingPackageId] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [acceptedQuoteId, setAcceptedQuoteId] = useState<string | null>(null);
  
  // Helper to normalize packageId: returns valid ID or null (never empty string)
  const normalizedPackageId = selectedPackageId && selectedPackageId.trim() !== "" ? selectedPackageId : null;

  // Reset state when service ID changes (fixes back button navigation)
  useEffect(() => {
    setActiveTab("package");
    setSelectedPackageId("");
    setIsCustomQuoteSelected(false);
    setNotes("");
    setPaymentMethod("ipg");
    setSelectedImageIndex(0);
    setNotesOpen(false);
    setDescriptionOpen(false);
    setShowContactDialog(false);
    setContactMessage("");
    setSelectedBankAccountId("");
    setTransferSlipUrl("");
    setTransferSlipObjectPath("");
    setFailedImages(new Set());
    setShowDesignApprovalGate(false);
    setPendingPackageSelection(null);
    setShowPrePurchaseDialog(false);
    setPendingPackageId(null);
    setAcceptedQuoteId(null);
  }, [serviceId]);

  // Get current user to determine messages route
  const { user, isLoading: isAuthLoading } = useAuth();

  // Flag to determine if messages navigation is safe
  const canNavigateToMessages = !!user?.role && !isAuthLoading;

  // Helper function to get correct messages route based on user role
  const getMessagesRoute = () => {
    return user?.role === "seller" ? "/seller/messages" : "/messages";
  };

  // Safe navigation wrapper that only navigates when user role is loaded
  const navigateToMessages = () => {
    if (!canNavigateToMessages) {
      return; // Silently no-op until role is loaded
    }
    navigate(getMessagesRoute());
  };

  const { data: service, isLoading } = useQuery<ServiceWithPackages>({
    queryKey: [`/api/services/${serviceId}`],
    enabled: !!serviceId,
  });

  // Extract URL parameters reactively using useLocation
  const [location] = useLocation();
  
  // Parse URL params - recompute whenever location changes
  const urlParams = useMemo(() => {
    const search = window.location.search;
    const params = new URLSearchParams(search);
    return {
      quoteId: params.get('quoteId'),
      packageId: params.get('packageId'),
      designApprovalId: params.get('designApprovalId')
    };
  }, [location]);
  
  const quoteIdFromUrl = urlParams.quoteId;
  
  // Fetch specific quote by ID when quoteId is in URL params (takes priority)
  const { data: urlQuote, isLoading: isUrlQuoteLoading } = useQuery<any>({
    queryKey: ["/api/quotes", quoteIdFromUrl],
    queryFn: async () => {
      if (!quoteIdFromUrl) return null;
      try {
        return await apiRequest("GET", `/api/quotes/${quoteIdFromUrl}`);
      } catch {
        return null;
      }
    },
    enabled: !!quoteIdFromUrl,
  });

  // Fetch active quote for this service and selected package (fallback when no quoteId in URL)
  // When Quote Workflow Only is enabled, buyers can request quotes for each package independently
  // Only fetch when a package is selected to avoid showing stale/incorrect quote status
  const hasPackageSelection = isCustomQuoteSelected || !!selectedPackageId;
  const { data: rawConversationQuote } = useQuery<any>({
    queryKey: ["/api/quotes/active", serviceId, selectedPackageId, isCustomQuoteSelected],
    queryFn: async () => {
      if (!serviceId || !hasPackageSelection) return null;
      const conversations: any[] = await apiRequest("GET", "/api/conversations");
      const serviceConversation = conversations.find(c => 
        c.type === "pre_purchase_service" && c.serviceId === serviceId
      );
      if (!serviceConversation?.id) return null;
      try {
        // Include servicePackageId to get quote for specific package
        // "custom" means custom specifications (no specific package)
        const packageParam = isCustomQuoteSelected 
          ? "&servicePackageId=custom" 
          : `&servicePackageId=${selectedPackageId}`;
        return await apiRequest("GET", `/api/quotes/active?conversationId=${serviceConversation.id}&serviceId=${serviceId}${packageParam}`);
      } catch {
        return null;
      }
    },
    enabled: !!service?.requiresQuote && !quoteIdFromUrl && hasPackageSelection,
  });
  
  // Validate that the returned quote matches the currently selected package
  // This prevents stale data from showing when switching between packages due to cache
  const quoteMatchesSelection = () => {
    if (!rawConversationQuote) return false;
    if (isCustomQuoteSelected) {
      // Custom quote: servicePackageId should be null/undefined
      return !rawConversationQuote.servicePackageId;
    }
    // Package-specific quote: should match selected package
    return rawConversationQuote.servicePackageId === selectedPackageId;
  };
  const conversationQuote = quoteMatchesSelection() ? rawConversationQuote : null;
  
  // Use URL quote if available and accepted, otherwise fallback to validated conversation quote
  const activeQuote = (urlQuote?.status === "accepted" ? urlQuote : null) || conversationQuote;

  // Hydrate acceptedQuoteId from activeQuote data (survives page refresh)
  // The booking submission uses quote data as authoritative source, so UI selection is informational
  useEffect(() => {
    if (activeQuote?.status === "accepted" && activeQuote?.id) {
      // Set the accepted quote ID when we have an accepted quote
      if (!acceptedQuoteId) {
        setAcceptedQuoteId(activeQuote.id);
      }
      
      // Set initial package selection from quote (on first load only)
      // Don't force - let the user navigate, but submission will use quote's data
      if (!selectedPackageId && !isCustomQuoteSelected) {
        if (activeQuote.packageId && service?.packages) {
          const packageExists = service.packages.some((pkg: ServicePackage) => pkg.id === activeQuote.packageId);
          if (packageExists) {
            setSelectedPackageId(activeQuote.packageId);
            setIsCustomQuoteSelected(false);
          }
        } else if (!activeQuote.packageId) {
          // Custom quote - set custom mode
          setIsCustomQuoteSelected(true);
        }
      }
    }
  }, [activeQuote, service, acceptedQuoteId, selectedPackageId, isCustomQuoteSelected]);

  // Fetch ALL approved designs for this service conversation
  // This allows checking package-specific approvals without refetching
  const { data: allApprovedDesigns = [] } = useQuery<any[]>({
    queryKey: ["/api/design-approvals/service", serviceId],
    queryFn: async () => {
      if (!serviceId) return [];
      const conversations: any[] = await apiRequest("GET", "/api/conversations");
      const serviceConversation = conversations.find(c => 
        c.type === "pre_purchase_service" && c.serviceId === serviceId
      );
      if (!serviceConversation?.id) return [];
      try {
        // Fetch all design approvals for this conversation
        const approvals = await apiRequest("GET", `/api/design-approvals?conversationId=${serviceConversation.id}`);
        // Filter to only approved ones
        return (approvals || []).filter((a: any) => a.status === "approved");
      } catch {
        return [];
      }
    },
    enabled: !!service?.requiresDesignApproval,
  });

  // Helper to check if a specific package has an approved design
  const getApprovalForPackage = (packageId: string | null) => {
    if (!packageId) {
      // Custom quote - look for approval without packageId
      return allApprovedDesigns.find((a: any) => !a.packageId);
    }
    return allApprovedDesigns.find((a: any) => a.packageId === packageId);
  };

  // Get the approval for the currently selected package (for backward compatibility)
  const approvedDesign = selectedPackageId 
    ? getApprovalForPackage(selectedPackageId)
    : isCustomQuoteSelected 
      ? getApprovalForPackage(null)
      : allApprovedDesigns[0]; // Fallback to any approval for general display

  // Fetch bank accounts
  const { data: bankAccounts = [] } = useQuery<any[]>({
    queryKey: ["/api/bank-accounts"],
  });

  // Request quote mutation - MUST be declared before useEffect that uses it
  // Accepts optional packageId to request quote for a specific package (used when design is approved)
  // Also tracks isCustom flag for proper cache invalidation
  const requestQuoteMutation = useMutation({
    mutationFn: async (data: { packageId?: string; isCustom?: boolean }) => {
      if (!service) throw new Error("Service not found");
      
      // Determine which package to request quote for
      const targetPackageId = data.packageId || selectedPackageId || undefined;
      const packageName = targetPackageId 
        ? service.packages?.find(p => p.id === targetPackageId)?.name 
        : null;
      
      // Use the conversations workflow endpoint with context: "quote" to create proper quote record
      const conversation: any = await apiRequest("POST", "/api/conversations/workflows", {
        serviceId: service.id,
        servicePackageId: targetPackageId,
        context: "quote",
        initialMessage: packageName 
          ? `Hi, I'm interested in ${service.name} - ${packageName}. Could you please provide me with a custom quote?`
          : `Hi, I'm interested in booking ${service.name}. The standard packages don't meet my requirements. Could you please provide me with a custom quote?`,
      });
      
      return conversation;
    },
    onSuccess: (_conversation, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      // Use mutation variables to invalidate the correct cache key even if selection changed during request
      // Key structure must match useQuery: ["/api/quotes/active", serviceId, selectedPackageId, isCustomQuoteSelected]
      // For custom quotes: selectedPackageId is "" (empty string), isCustomQuoteSelected is true
      // For package quotes: selectedPackageId is the package ID, isCustomQuoteSelected is false
      const isCustom = variables.isCustom ?? false;
      const pkgId = isCustom ? "" : (variables.packageId || "");
      queryClient.invalidateQueries({ queryKey: ["/api/quotes/active", serviceId, pkgId, isCustom] });
      toast({ 
        title: "Quote request sent!", 
        description: "The seller will respond with a custom quote in your messages.",
        ...(canNavigateToMessages && {
          action: (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={navigateToMessages}
            >
              View Messages
            </Button>
          )
        })
      });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send quote request", description: error.message, variant: "destructive" });
    },
  });

  // Auto-select default bank account when bank transfer is selected
  useEffect(() => {
    if (paymentMethod === "bank_transfer" && bankAccounts.length > 0 && !selectedBankAccountId) {
      const defaultAccount = bankAccounts.find((acc: any) => acc.isDefault) || bankAccounts[0];
      if (defaultAccount) {
        setSelectedBankAccountId(String(defaultAccount.id));
      }
    } else if (paymentMethod === "ipg") {
      setSelectedBankAccountId("");
      setTransferSlipUrl("");
      setTransferSlipObjectPath("");
    }
  }, [paymentMethod, bankAccounts, selectedBankAccountId]);
  
  // Handle direct navigation from "Book Now" button with packageId and designApprovalId
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const packageIdParam = params.get('packageId');
    const designApprovalIdParam = params.get('designApprovalId');
    
    // If coming from Book Now button with a packageId, pre-select it and go to review
    if (packageIdParam && designApprovalIdParam && service) {
      // Verify this package exists in the service
      const packageExists = service.packages?.some(pkg => pkg.id === packageIdParam);
      if (packageExists) {
        setSelectedPackageId(packageIdParam);
        setIsCustomQuoteSelected(false);
        setActiveTab("review");
        // Clean up URL parameters
        window.history.replaceState({}, '', window.location.pathname);
      }
    } else if (designApprovalIdParam && !packageIdParam && service) {
      // Custom design approval without package - go to custom quote flow
      setIsCustomQuoteSelected(true);
      setSelectedPackageId("");
      setActiveTab("review");
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [service]);

  // Handle navigation from accepted quote "Book Now" button
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const quoteIdParam = params.get('quoteId');
    const packageIdParam = params.get('packageId');
    
    // If coming from accepted quote with quoteId, pre-select the package and go to checkout
    if (quoteIdParam && service) {
      // Store the accepted quote ID for checkout flow
      setAcceptedQuoteId(quoteIdParam);
      
      if (packageIdParam) {
        // Verify this package exists in the service
        const packageExists = service.packages?.some(pkg => pkg.id === packageIdParam);
        if (packageExists) {
          setSelectedPackageId(packageIdParam);
          setIsCustomQuoteSelected(false);
        }
      } else {
        // Custom quote without package
        setIsCustomQuoteSelected(true);
        setSelectedPackageId("");
      }
      
      // Go directly to review tab for checkout
      setActiveTab("review");
      
      // Clean up URL parameters
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [service]);

  // Handle return from design approval flow (via sessionStorage)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returnFromDesign = params.get('returnFromDesign');
    
    if (returnFromDesign === 'true' && approvedDesign) {
      const storedData = sessionStorage.getItem('pendingBooking');
      if (storedData) {
        try {
          const { serviceId: storedServiceId, packageId, isCustomQuote } = JSON.parse(storedData);
          
          if (storedServiceId === serviceId) {
            if (isCustomQuote) {
              setIsCustomQuoteSelected(true);
              setSelectedPackageId("");
            } else if (packageId) {
              setSelectedPackageId(packageId);
              setIsCustomQuoteSelected(false);
            }
            setActiveTab("review");
            
            sessionStorage.removeItem('pendingBooking');
            
            window.history.replaceState({}, '', window.location.pathname);
          }
        } catch (error) {
          console.error('Failed to parse pending booking data:', error);
        }
      }
    }
  }, [approvedDesign, serviceId]);

  // Clean up stale pending bookings when service changes
  useEffect(() => {
    const storedData = sessionStorage.getItem('pendingBooking');
    if (storedData) {
      try {
        const { serviceId: storedServiceId } = JSON.parse(storedData);
        if (storedServiceId !== serviceId) {
          sessionStorage.removeItem('pendingBooking');
        }
      } catch (error) {
        sessionStorage.removeItem('pendingBooking');
      }
    }
  }, [serviceId]);

  const selectedPackage = service?.packages?.find(pkg => pkg.id === selectedPackageId);
  
  // Calculate delivery date based on selected package duration
  const estimatedDeliveryDate = selectedPackage?.duration 
    ? addDays(new Date(), selectedPackage.duration)
    : null;

  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      return await apiRequest("POST", "/api/buyer/bookings", bookingData);
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/buyer/bookings"] });
      
      if (response.redirectUrl) {
        toast({ title: "Redirecting to payment gateway..." });
        window.location.href = response.redirectUrl;
        return;
      }
      
      toast({ title: "Booking request submitted!", description: "Waiting for seller to confirm availability." });
      navigate("/bookings");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create booking", description: error.message, variant: "destructive" });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { serviceId: string; subject: string; message: string }) => {
      const conversation = await apiRequest("POST", "/api/conversations", {
        type: "pre_purchase_service",
        serviceId: messageData.serviceId,
        subject: messageData.subject,
      });
      
      if (messageData.message.trim()) {
        await apiRequest("POST", `/api/conversations/${conversation.id}/messages`, {
          content: messageData.message,
        });
      }
      
      return conversation;
    },
    onSuccess: (data: any) => {
      toast({ 
        title: "Message sent!", 
        description: "Check Messages to see the conversation.",
        ...(canNavigateToMessages && {
          action: (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={navigateToMessages}
            >
              View Messages
            </Button>
          )
        })
      });
      setShowContactDialog(false);
      setContactMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send message", description: error.message, variant: "destructive" });
    },
  });

  const handlePackageSelect = (packageId: string) => {
    // Check if user is authenticated - redirect to login if not
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/book-service/${serviceId}`)}`);
      return;
    }

    // If design approval is required, check if THIS PACKAGE has an approved design
    // Uses the getApprovalForPackage helper to check all approvals
    const hasApprovalForThisPackage = !!getApprovalForPackage(packageId);
    if (service?.requiresDesignApproval && !hasApprovalForThisPackage) {
      setPendingPackageSelection({ packageId, isCustomQuote: false });
      setShowDesignApprovalGate(true);
      return;
    }
    
    // For all other cases (including when there ARE existing approvals), show pre-purchase dialog
    setPendingPackageId(packageId);
    setShowPrePurchaseDialog(true);
  };
  
  const handleContinueToPurchase = () => {
    if (pendingPackageId) {
      setSelectedPackageId(pendingPackageId);
      setIsCustomQuoteSelected(false);
      setActiveTab("review");
    }
    setShowPrePurchaseDialog(false);
    setPendingPackageId(null);
  };
  
  const handleContactSellerFirst = () => {
    setShowPrePurchaseDialog(false);
    setShowContactDialog(true);
    // Don't clear pendingPackageId yet - we'll need it after they send message
  };

  const handleUploadNewDesign = () => {
    if (!pendingPackageId) return;
    setPendingPackageSelection({ packageId: pendingPackageId, isCustomQuote: false });
    setShowPrePurchaseDialog(false);
    setShowDesignApprovalGate(true);
  };

  const handleRequestNewQuote = () => {
    // Capture the pending package ID before clearing it
    const packageToRequest = pendingPackageId;
    setShowPrePurchaseDialog(false);
    setPendingPackageId(null);
    // Navigate to request new quote workflow - pass the package ID and custom flag for proper cache invalidation
    if (service) {
      requestQuoteMutation.mutate({ 
        packageId: packageToRequest || undefined,
        isCustom: !packageToRequest // Custom if no specific package
      });
    }
  };

  const handleCustomQuoteSelect = () => {
    // Check if user is authenticated - redirect to login if not
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/book-service/${serviceId}`)}`);
      return;
    }

    // For custom quotes (no package), check if there's an approved design without packageId
    const hasCustomApproval = !!getApprovalForPackage(null);
    if (service?.requiresDesignApproval && !hasCustomApproval) {
      setPendingPackageSelection({ isCustomQuote: true });
      setShowDesignApprovalGate(true);
      return;
    }
    setIsCustomQuoteSelected(true);
    setSelectedPackageId("");
    setActiveTab("review");
  };

  const createDesignApprovalConversationMutation = useMutation({
    mutationFn: async (data: { packageId?: string; isCustomQuote: boolean }) => {
      if (!service) throw new Error("Service not found");
      
      // Determine workflow context
      const context = data.isCustomQuote ? 'quote' : 'service';
      
      // Prepare initial message with package/quote details
      let initialMessage = `Hi, I'm interested in booking **${service.name}**.\n\n`;
      
      if (data.isCustomQuote) {
        initialMessage += `I would like a **custom quote** and need to get my design approved first. I'll upload my design files for your review.`;
      } else if (data.packageId) {
        const selectedPkg = service.packages.find(pkg => pkg.id === data.packageId);
        if (selectedPkg) {
          initialMessage += `I would like to book the **${selectedPkg.name}** package ($${selectedPkg.price}) and need to get my design approved first. I'll upload my design files for your review.\n\n**Package Details:**\n- Price: $${selectedPkg.price}\n- Delivery: ${selectedPkg.duration} days`;
        }
      }
      
      // Use workflow initialization endpoint to create conversation with context
      const conversation: any = await apiRequest("POST", "/api/conversations/workflows", {
        serviceId: service.id,
        context,
        initialMessage,
      });
      
      await queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversation.id] });
      
      return conversation;
    },
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setShowDesignApprovalGate(false);
      setPendingPackageSelection(null);
      
      // Navigate to the specific conversation
      const messagesRoute = user?.role === "seller" ? "/seller/messages" : "/messages";
      navigate(`${messagesRoute}?conversation=${conversation.id}`);
      
      toast({ 
        title: "Conversation started!", 
        description: "Please upload your design files for seller approval.",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create conversation", description: error.message, variant: "destructive" });
    },
  });

  const handleDesignGateConfirm = () => {
    if (!pendingPackageSelection || !serviceId) return;
    
    createDesignApprovalConversationMutation.mutate({
      packageId: pendingPackageSelection.packageId,
      isCustomQuote: pendingPackageSelection.isCustomQuote,
    });
  };

  const handleDesignGateCancel = () => {
    setShowDesignApprovalGate(false);
    setPendingPackageSelection(null);
  };

  // Handle action query parameters from marketplace (upload-design, request-quote)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const isNew = params.get('new') === 'true';
    
    // Guard against repeated executions and wait for auth
    if (!service || !action || !canNavigateToMessages) return;
    
    if (action === 'upload-design' && service.requiresDesignApproval) {
      if (isNew) {
        // Create a new design approval conversation for fresh upload
        createDesignApprovalConversationMutation.mutate({
          packageId: undefined,
          isCustomQuote: false,
        });
      } else {
        // Navigate to existing design workflow
        navigateToMessages();
      }
      window.history.replaceState({}, '', window.location.pathname);
    } else if (action === 'request-quote' && service.requiresQuote && !requestQuoteMutation.isPending) {
      // Trigger quote request workflow (allows requesting new quote even if one exists)
      requestQuoteMutation.mutate({ packageId: undefined, isCustom: true });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [service, canNavigateToMessages, createDesignApprovalConversationMutation, requestQuoteMutation]);

  const handleUploadSlip = async (file: File) => {
    try {
      setIsUploadingSlip(true);
      
      console.log("[UPLOAD] Step 1: Getting upload URL");
      const urlResponse: any = await apiRequest("POST", "/api/object-storage/upload-url", {
        fileName: file.name,
        contentType: file.type,
      });
      console.log("[UPLOAD] Step 1 complete. Upload URL received:", urlResponse);

      console.log("[UPLOAD] Step 2: Uploading to GCS");
      const uploadResponse = await fetch(urlResponse.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      console.log("[UPLOAD] Step 2 complete. GCS response status:", uploadResponse.status);

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error("[UPLOAD] GCS upload failed:", errorText);
        throw new Error(`Failed to upload file to storage (status ${uploadResponse.status})`);
      }

      console.log("[UPLOAD] Step 3: Finalizing upload");
      const finalizeResponse: any = await apiRequest("POST", "/api/object-storage/finalize-private-upload", {
        objectPath: urlResponse.objectPath,
        fileName: file.name,
      });
      console.log("[UPLOAD] Step 3 complete. Finalize response:", finalizeResponse);

      setTransferSlipUrl(finalizeResponse.url);
      setTransferSlipObjectPath(urlResponse.objectPath);
      toast({ title: "Transfer slip uploaded successfully" });
    } catch (error: any) {
      console.error("[UPLOAD] Error caught:", error);
      toast({ 
        title: "Upload failed", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsUploadingSlip(false);
    }
  };

  const handleBookingSubmit = () => {
    if (!service) {
      toast({ title: "Service not found", variant: "destructive" });
      return;
    }

    // When using an accepted quote, prioritize quote's data as the authoritative source
    const usingAcceptedQuote = acceptedQuoteId && activeQuote?.status === "accepted";
    
    // Determine package ID: quote's package takes precedence, then UI selection
    const finalPackageId = usingAcceptedQuote && activeQuote?.packageId 
      ? activeQuote.packageId 
      : normalizedPackageId;
    
    const selectedPkg = finalPackageId 
      ? service.packages.find(pkg => pkg.id === finalPackageId)
      : null;
    
    // For standard packages, require package selection
    // Custom quotes (no package) are allowed when using accepted quote
    const isCustomQuoteCheckout = usingAcceptedQuote && !activeQuote?.packageId;
    if (!isCustomQuoteCheckout && !selectedPkg) {
      toast({ title: "Please select a package", variant: "destructive" });
      return;
    }
    
    // Get price: quote's price takes precedence for accepted quotes, otherwise from package
    const bookingAmount = usingAcceptedQuote 
      ? activeQuote?.quotedPrice 
      : selectedPkg?.price;
    if (!bookingAmount && bookingAmount !== 0) {
      toast({ title: "Unable to determine price", variant: "destructive" });
      return;
    }

    // Validate bank transfer requirements
    if (paymentMethod === "bank_transfer") {
      if (!selectedBankAccountId) {
        toast({ 
          title: "Bank account required", 
          description: "Please select a bank account for bank transfer payments",
          variant: "destructive" 
        });
        return;
      }
      if (!transferSlipUrl) {
        toast({ 
          title: "Transfer slip required", 
          description: "Please upload your payment transfer slip",
          variant: "destructive" 
        });
        return;
      }
    }

    // Check design approval requirement (always blocks booking)
    if (service.requiresDesignApproval && !approvedDesign) {
      toast({ 
        title: "Design approval required", 
        description: "Please upload your design and get seller approval before booking.",
        variant: "destructive",
        ...(canNavigateToMessages && {
          action: (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={navigateToMessages}
            >
              Upload Design
            </Button>
          )
        })
      });
      return;
    }

    // Calculate scheduled date and time based on delivery
    const now = new Date();
    const scheduledDate = estimatedDeliveryDate || addDays(now, 3); // Default 3 days if no duration
    const scheduledTime = "12:00 PM"; // Default delivery time

    createBookingMutation.mutate({
      serviceId: service.id,
      packageId: finalPackageId, // Uses quote's package or UI selection (null for custom quotes)
      scheduledDate: scheduledDate.toISOString(),
      scheduledTime,
      amount: bookingAmount,
      notes: notes || undefined,
      sellerId: service.sellerId,
      paymentMethod,
      bankAccountId: paymentMethod === "bank_transfer" ? selectedBankAccountId : null,
      transferSlipUrl: paymentMethod === "bank_transfer" ? transferSlipUrl : null,
      transferSlipObjectPath: paymentMethod === "bank_transfer" ? transferSlipObjectPath : null,
      quoteId: acceptedQuoteId || null, // Include accepted quote ID for checkout flow
    });
  };

  const handleSendQuestion = () => {
    if (!service || !contactMessage.trim()) return;
    
    sendMessageMutation.mutate({
      serviceId: service.id,
      subject: `Question about ${service.name}`,
      message: contactMessage,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading service details...</p>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <PackageIcon className="h-16 w-16 text-muted-foreground mx-auto" />
          <p className="text-lg font-medium">Service not found</p>
          <Button onClick={() => navigate("/marketplace")} variant="outline">
            Browse Services
          </Button>
        </div>
      </div>
    );
  }

  // Check if design approval blocks booking for the selected package
  // Uses the helper function to check all approved designs
  const selectedPackageHasApproval = selectedPackageId 
    ? !!getApprovalForPackage(selectedPackageId)
    : isCustomQuoteSelected 
      ? !!getApprovalForPackage(null)
      : false;
  const isBlockedByDesignApproval = service.requiresDesignApproval && (selectedPackageId || isCustomQuoteSelected) && !selectedPackageHasApproval;
  const isBlockedByQuote = service.requiresQuote && (!activeQuote || activeQuote.status !== "accepted");
  const hasApprovedDesign = service.requiresDesignApproval && !!approvedDesign;
  const hasAcceptedQuote = service.requiresQuote && activeQuote?.status === "accepted";

  const selectedBankAccount = bankAccounts.find((acc: any) => String(acc.id) === selectedBankAccountId);

  return (
    <div className="container max-w-7xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Design Approval Required Alert */}
          {isBlockedByDesignApproval && !isBlockedByQuote && (
            <Alert className="border-orange-500 bg-orange-500/10">
              <Upload className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Design Approval Required</p>
                  <p className="text-sm mt-1">This service requires design approval before you can proceed with booking. Please upload your design files in Messages to get seller approval.</p>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={navigateToMessages}
                  disabled={!canNavigateToMessages}
                  className="ml-4 flex-shrink-0"
                  data-testid="button-upload-design-alert"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Design
                </Button>
              </AlertDescription>
            </Alert>
          )}
          

          {/* Service Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Service Image */}
                <div className="w-full md:w-1/3 flex-shrink-0">
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                    {service.images && service.images.length > 0 && service.images[selectedImageIndex] && !failedImages.has(service.images[selectedImageIndex]) ? (
                      <img
                        src={service.images[selectedImageIndex]}
                        alt={service.name}
                        className="w-full h-full object-cover"
                        data-testid="img-service-main"
                        onError={() => {
                          const originalUrl = service.images![selectedImageIndex];
                          setFailedImages(prev => new Set(prev).add(originalUrl));
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <PackageIcon className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  {service.images && service.images.length > 1 && (
                    <div className="flex gap-2 mt-3">
                      {service.images.map((imgUrl, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedImageIndex(index)}
                          className={`w-16 h-16 rounded-md border-2 transition-colors flex-shrink-0 ${
                            selectedImageIndex === index ? 'border-primary' : 'border-transparent hover:border-muted-foreground'
                          }`}
                          data-testid={`button-service-image-thumb-${index}`}
                        >
                          {failedImages.has(imgUrl) ? (
                            <div className="w-full h-full flex items-center justify-center bg-muted rounded-sm">
                              <PackageIcon className="h-6 w-6 text-muted-foreground" />
                            </div>
                          ) : (
                            <img 
                              src={imgUrl} 
                              alt="" 
                              className="w-full h-full object-cover rounded-sm"
                              onError={() => {
                                setFailedImages(prev => new Set(prev).add(imgUrl));
                              }}
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Service Info */}
                <div className="w-full">
                  <h1 className="text-2xl font-bold mb-2" data-testid="text-service-name">{service.name}</h1>
                  
                  {/* Expandable Description */}
                  <Collapsible open={descriptionOpen} onOpenChange={setDescriptionOpen}>
                    <div className="mb-2">
                      <CollapsibleTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-auto p-0 mb-1 text-muted-foreground hover:text-foreground hover:bg-transparent"
                        >
                          <span className="text-sm font-medium">Description</span>
                          <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${descriptionOpen ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                      {!descriptionOpen && (
                        <p className="text-sm text-muted-foreground line-clamp-2" data-testid="text-service-description">
                          {service.description}
                        </p>
                      )}
                    </div>
                    <CollapsibleContent>
                      <p className="text-sm text-muted-foreground mb-2" data-testid="text-service-description-full">
                        {service.description}
                      </p>
                    </CollapsibleContent>
                  </Collapsible>

                  {service.seller && (
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs">Verified</Badge>
                        <span className="text-sm text-muted-foreground">
                          {service.seller.shopName || `${service.seller.firstName} ${service.seller.lastName}`}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/seller/${service.seller.id}`)}
                          data-testid="link-view-seller-profile"
                        >
                          View Seller Profile
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowContactDialog(true)}
                        data-testid="button-ask-seller"
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Ask Seller a Question
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabbed Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="package" data-testid="tab-package">
                <Check className={`h-4 w-4 mr-2 ${selectedPackageId || isCustomQuoteSelected ? 'opacity-100' : 'opacity-0'}`} />
                Package Selection
              </TabsTrigger>
              <TabsTrigger 
                value="review" 
                disabled={(!selectedPackageId && !isCustomQuoteSelected) || !!isBlockedByDesignApproval} 
                data-testid="tab-review"
              >
                Review & Payment
              </TabsTrigger>
            </TabsList>

            {/* Package Selection */}
            <TabsContent value="package" className="mt-4">
              {service?.requiresDesignApproval && !selectedPackageId && !isCustomQuoteSelected && (
                <Alert className="mb-4" data-testid="alert-design-required">
                  <Upload className="h-4 w-4" />
                  <AlertDescription>
                    <span className="font-medium">Design approval is required for this service.</span>
                    <span className="block text-sm mt-1">Select a package below to start the design upload process. Your design must be approved by the seller before you can complete your booking.</span>
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Fixed Price Packages */}
                {service.packages?.map((pkg) => (
                  <Card
                    key={pkg.id}
                    className={`cursor-pointer transition-all ${
                      selectedPackageId === pkg.id ? "ring-2 ring-primary" : "hover-elevate"
                    }`}
                    onClick={() => handlePackageSelect(pkg.id)}
                    data-testid={`card-package-${pkg.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-lg" data-testid={`text-package-name-${pkg.id}`}>{pkg.name}</h3>
                            {selectedPackageId === pkg.id && <Badge>Selected</Badge>}
                          </div>
                          <div className="mb-2">
                            <p className="text-2xl font-bold text-primary" data-testid={`text-package-price-${pkg.id}`}>
                              ${pkg.price}
                            </p>
                            {pkg.duration && (
                              <p className="text-xs text-muted-foreground">Delivery in {pkg.duration} days</p>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{pkg.description}</p>
                        <div className="space-y-1">
                          {(pkg.features as string[]).map((feature, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <Check className="h-3 w-3 text-primary flex-shrink-0" />
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Custom Quote Option (if enabled) */}
                {service.requiresQuote && (
                  <Card
                    className={`cursor-pointer transition-all ${
                      isCustomQuoteSelected ? "ring-2 ring-primary" : "hover-elevate"
                    }`}
                    onClick={handleCustomQuoteSelect}
                    data-testid="card-custom-quote"
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-lg">Custom Quote</h3>
                            {isCustomQuoteSelected && <Badge>Selected</Badge>}
                          </div>
                          <div className="mb-2">
                            <Badge variant="outline" className="text-xs">
                              <FileText className="h-3 w-3 mr-1" />
                              Price varies
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Need something different? Request a custom quote tailored to your specific requirements.
                        </p>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Check className="h-3 w-3 text-primary flex-shrink-0" />
                            <span>Personalized pricing</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Check className="h-3 w-3 text-primary flex-shrink-0" />
                            <span>Custom specifications</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Check className="h-3 w-3 text-primary flex-shrink-0" />
                            <span>Direct seller consultation</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Review & Payment */}
            <TabsContent value="review" className="mt-4 space-y-4">
              {isCustomQuoteSelected ? (
                /* Custom Quote Flow */
                <Card>
                  <CardHeader>
                    <CardTitle>Request Custom Quote</CardTitle>
                    <CardDescription>
                      The seller will review your requirements and provide a personalized quote
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!activeQuote ? (
                      <>
                        <Alert>
                          <FileText className="h-4 w-4" />
                          <AlertDescription>
                            <p className="font-medium mb-2">How custom quotes work:</p>
                            <ol className="list-decimal list-inside space-y-1 text-sm">
                              <li>Submit your quote request to the seller</li>
                              <li>Seller reviews and creates a custom package</li>
                              <li>Review and accept the quote in Messages</li>
                              <li>Complete your booking with the custom package</li>
                            </ol>
                          </AlertDescription>
                        </Alert>
                        
                        <div className="space-y-2">
                          <Label>Additional Details (Optional)</Label>
                          <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Describe your specific requirements, quantities, deadlines, etc."
                            rows={4}
                            data-testid="input-quote-notes"
                          />
                        </div>

                        <Button
                          size="lg"
                          onClick={() => requestQuoteMutation.mutate({ packageId: undefined, isCustom: true })}
                          disabled={requestQuoteMutation.isPending}
                          className="w-full gap-2"
                          data-testid="button-request-quote"
                        >
                          <FileText className="h-5 w-5" />
                          {requestQuoteMutation.isPending ? "Sending Request..." : "Request Custom Quote"}
                        </Button>
                      </>
                    ) : (
                      <div className="space-y-3 text-center py-4">
                        <Badge variant="secondary" className="text-sm px-4 py-2">
                          Quote Requested - Pending Seller Response
                        </Badge>
                        <p className="text-sm text-muted-foreground">
                          The seller will respond with a custom quote in your Messages. Once you accept the quote, you can proceed with booking.
                        </p>
                        <Button
                          variant="default"
                          size="lg"
                          onClick={navigateToMessages}
                          disabled={!canNavigateToMessages}
                          className="w-full"
                          data-testid="button-view-quote-messages"
                        >
                          <MessageCircle className="h-5 w-5 mr-2" />
                          View Messages
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : selectedPackage ? (
                /* Fixed Package Flow */
                <>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Booking Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <Label className="text-xs text-muted-foreground">Package</Label>
                          <p className="font-medium" data-testid="text-review-package-name">{selectedPackage.name}</p>
                        </div>
                        <div className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setActiveTab("package")}
                            className="h-auto p-0 text-primary hover:bg-transparent"
                          >
                            <Edit2 className="h-3 w-3 mr-1" />
                            Change
                          </Button>
                        </div>
                        {estimatedDeliveryDate && (
                          <>
                            <div>
                              <Label className="text-xs text-muted-foreground">Estimated Delivery</Label>
                              <p className="font-medium" data-testid="text-review-delivery">
                                {format(estimatedDeliveryDate, "MMM dd, yyyy")}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                ({selectedPackage.duration} days)
                              </p>
                            </div>
                            <div className="text-right">
                              <Calendar className="h-4 w-4 text-muted-foreground inline" />
                            </div>
                          </>
                        )}
                      </div>

                      <Separator />

                      {/* Notes Collapsible */}
                      <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" className="w-full justify-start p-0 min-h-11">
                            <ChevronRight className={`h-4 w-4 mr-2 transition-transform ${notesOpen ? 'rotate-90' : ''}`} />
                            <span className="text-sm">Add notes (optional)</span>
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                          <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Any special requirements..."
                            rows={3}
                            data-testid="input-notes"
                          />
                        </CollapsibleContent>
                      </Collapsible>

                      <Separator />

                      {/* Payment Method */}
                      <div>
                        <Label className="text-sm font-semibold mb-3 block">Payment Method</Label>
                        <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
                          <div className="space-y-2">
                            <div className={`flex items-center space-x-3 p-3 border rounded-md cursor-pointer ${
                              paymentMethod === "ipg" ? "border-primary bg-primary/5" : ""
                            }`}>
                              <RadioGroupItem value="ipg" id="ipg" data-testid="radio-ipg" />
                              <Label htmlFor="ipg" className="flex items-center gap-2 cursor-pointer flex-1">
                                <CreditCard className="h-4 w-4" />
                                <span className="text-sm">Internet Payment Gateway</span>
                              </Label>
                            </div>
                            <div className={`flex items-center space-x-3 p-3 border rounded-md cursor-pointer ${
                              paymentMethod === "bank_transfer" ? "border-primary bg-primary/5" : ""
                            }`}>
                              <RadioGroupItem value="bank_transfer" id="bank_transfer" data-testid="radio-bank-transfer" />
                              <Label htmlFor="bank_transfer" className="flex items-center gap-2 cursor-pointer flex-1">
                                <Building2 className="h-4 w-4" />
                                <span className="text-sm">Bank Transfer</span>
                              </Label>
                            </div>
                          </div>
                        </RadioGroup>
                      </div>

                      {/* Bank Transfer Payment Section */}
                      {paymentMethod === "bank_transfer" && (
                        <>
                          <Separator />
                          
                          {/* Bank Account Selection */}
                          <div>
                            <Label className="text-sm font-semibold mb-3 block">Select Bank Account</Label>
                            <Select value={selectedBankAccountId} onValueChange={setSelectedBankAccountId}>
                              <SelectTrigger data-testid="select-bank-account">
                                <SelectValue placeholder="Choose a bank account" />
                              </SelectTrigger>
                              <SelectContent>
                                {bankAccounts.map((account: any) => (
                                  <SelectItem key={account.id} value={String(account.id)}>
                                    {account.accountName} - {account.bankName}
                                    {account.isDefault && " (Default)"}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Bank Account Details Display */}
                          {selectedBankAccount && (
                            <Alert>
                              <Building2 className="h-4 w-4" />
                              <AlertDescription>
                                <p className="font-medium mb-2">Transfer payment to this account:</p>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <p className="text-xs text-muted-foreground">Bank Name</p>
                                    <p className="font-medium">{selectedBankAccount.bankName} - {selectedBankAccount.location}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Account Number</p>
                                    <p className="font-medium">{selectedBankAccount.accountNumber}</p>
                                  </div>
                                  {selectedBankAccount.accountName && (
                                    <div>
                                      <p className="text-xs text-muted-foreground">Account Name</p>
                                      <p className="font-medium">{selectedBankAccount.accountName}</p>
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-xs text-muted-foreground">Currency</p>
                                    <p className="font-medium">{selectedBankAccount.currency}</p>
                                  </div>
                                  {selectedBankAccount.swiftCode && (
                                    <div className="col-span-2">
                                      <p className="text-xs text-muted-foreground">SWIFT Code</p>
                                      <p className="font-medium">{selectedBankAccount.swiftCode}</p>
                                    </div>
                                  )}
                                </div>
                              </AlertDescription>
                            </Alert>
                          )}

                          {/* Transfer Slip Upload */}
                          <div>
                            <Label className="text-sm font-semibold mb-3 block">Upload Payment Slip *</Label>
                            {!transferSlipUrl ? (
                              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                                <input
                                  type="file"
                                  id="transfer-slip"
                                  className="hidden"
                                  accept="image/*,.pdf"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      if (file.size > 10 * 1024 * 1024) {
                                        toast({ 
                                          title: "File too large", 
                                          description: "Maximum file size is 10MB",
                                          variant: "destructive" 
                                        });
                                        return;
                                      }
                                      handleUploadSlip(file);
                                    }
                                  }}
                                  data-testid="input-transfer-slip"
                                />
                                <label htmlFor="transfer-slip" className="cursor-pointer">
                                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                  <p className="text-sm font-medium mb-1">
                                    {isUploadingSlip ? "Uploading..." : "Click to upload transfer slip"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    PNG, JPG, or PDF (max 10MB)
                                  </p>
                                </label>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-primary" />
                                  <span className="text-sm">Transfer slip uploaded</span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setTransferSlipUrl("");
                                    setTransferSlipObjectPath("");
                                  }}
                                  data-testid="button-remove-slip"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  <Button
                    onClick={handleBookingSubmit}
                    disabled={createBookingMutation.isPending}
                    size="lg"
                    className="w-full"
                    data-testid="button-confirm-booking"
                  >
                    {createBookingMutation.isPending ? "Processing..." : "Confirm Booking"}
                  </Button>
                </>
              ) : null}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sticky Summary Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isCustomQuoteSelected ? (
                activeQuote?.status === "accepted" && activeQuote?.quotedPrice ? (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Quote</p>
                      <p className="font-semibold text-sm">Custom Quote - Accepted</p>
                    </div>
                    
                    {activeQuote.validUntil && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Valid Until</p>
                        <p className="font-semibold text-sm">{new Date(activeQuote.validUntil).toLocaleDateString()}</p>
                      </div>
                    )}

                    <Separator />

                    <div className="flex justify-between items-center pt-2">
                      <span className="text-sm font-medium">Total</span>
                      <span className="text-2xl font-bold text-primary" data-testid="text-summary-total">
                        ${activeQuote.quotedPrice}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="font-medium mb-1">Custom Quote</p>
                    <p className="text-sm text-muted-foreground">
                      Price will be determined after seller review
                    </p>
                  </div>
                )
              ) : selectedPackage ? (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Package</p>
                    <p className="font-semibold text-sm">{selectedPackage.name}</p>
                    {activeQuote?.status === "accepted" && activeQuote?.quotedPrice && (
                      <Badge variant="secondary" className="mt-1">Quoted Price</Badge>
                    )}
                  </div>
                  
                  {estimatedDeliveryDate && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Delivery</p>
                      <p className="font-semibold text-sm">{selectedPackage.duration} days</p>
                    </div>
                  )}

                  <Separator />

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-sm font-medium">Total</span>
                    <span className="text-2xl font-bold text-primary" data-testid="text-summary-total">
                      ${activeQuote?.status === "accepted" && activeQuote?.quotedPrice 
                        ? activeQuote.quotedPrice 
                        : selectedPackage.price}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <PackageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {service?.requiresDesignApproval 
                      ? "Select a package to start the design approval process"
                      : "Select a package to continue"}
                  </p>
                  {service?.requiresDesignApproval && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Your design must be approved before booking
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Contact Seller Dialog */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ask Seller a Question</DialogTitle>
            <DialogDescription>
              Send a message to the seller about this service
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              value={contactMessage}
              onChange={(e) => setContactMessage(e.target.value)}
              placeholder="Type your question here..."
              rows={4}
              data-testid="input-contact-message"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => setShowContactDialog(false)}
              data-testid="button-cancel-message"
            >
              Cancel
            </Button>
            <Button
              className="min-h-11"
              onClick={handleSendQuestion}
              disabled={!contactMessage.trim() || sendMessageMutation.isPending}
              data-testid="button-send-message"
            >
              {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pre-Purchase Confirmation Dialog */}
      <Dialog open={showPrePurchaseDialog} onOpenChange={setShowPrePurchaseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {(approvedDesign || activeQuote) ? "Booking Options Available" : "Before You Continue"}
            </DialogTitle>
            <DialogDescription>
              {(approvedDesign || activeQuote) 
                ? "You have existing approvals. Choose how you'd like to proceed:"
                : "We recommend contacting the seller first to clarify any questions about this service"
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {(approvedDesign || activeQuote) ? (
              <>
                {/* Show existing approvals badges */}
                <div className="flex flex-wrap gap-2">
                  {approvedDesign && (
                    <Badge variant="default" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500">
                      <Check className="h-3 w-3 mr-1" />
                      Design Approved
                    </Badge>
                  )}
                  {activeQuote && (
                    <Badge variant="default" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500">
                      <Check className="h-3 w-3 mr-1" />
                      Quote Accepted
                    </Badge>
                  )}
                </div>
                
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    You can continue with your existing approvals or start a new workflow if your requirements have changed.
                  </p>
                </div>

                <div className="space-y-2">
                  {/* Primary action - continue with existing */}
                  <Button
                    className="w-full justify-start min-h-11"
                    onClick={handleContinueToPurchase}
                    data-testid="button-continue-to-purchase"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Continue with Existing Approvals
                  </Button>

                  {/* Secondary actions */}
                  {service?.requiresDesignApproval && (
                    <Button
                      variant="outline"
                      className="w-full justify-start min-h-11"
                      onClick={handleUploadNewDesign}
                      data-testid="button-upload-new-design"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload New Design for Approval
                    </Button>
                  )}

                  {service?.requiresQuote && (
                    <Button
                      variant="outline"
                      className="w-full justify-start min-h-11"
                      onClick={handleRequestNewQuote}
                      data-testid="button-request-new-quote"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Request New Custom Quote
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    className="w-full justify-start min-h-11"
                    onClick={handleContactSellerFirst}
                    data-testid="button-contact-seller-first"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Contact Seller First
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm">
                  Would you like to ask the seller any questions before proceeding with your booking?
                </p>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    className="w-full min-h-11"
                    onClick={handleContactSellerFirst}
                    data-testid="button-contact-seller-first"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Contact Seller First
                  </Button>
                  <Button
                    className="w-full min-h-11"
                    onClick={handleContinueToPurchase}
                    data-testid="button-continue-to-purchase"
                  >
                    Continue to Purchase
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Design Approval Gate Modal */}
      <Dialog open={showDesignApprovalGate} onOpenChange={setShowDesignApprovalGate}>
        <DialogContent data-testid="dialog-design-approval-gate">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-orange-500/10 p-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <DialogTitle>Design Approval Required</DialogTitle>
                <DialogDescription>
                  Complete design approval before booking
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm">
              This service requires your design to be uploaded and approved by the seller before you can proceed with booking.
            </p>
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">Next steps:</p>
              <ol className="text-sm space-y-1 list-decimal list-inside">
                <li>Go to Messages to upload your design files</li>
                <li>Wait for seller to review and approve</li>
                <li>Return here to complete your booking</li>
              </ol>
            </div>
            {pendingPackageSelection && (
              <p className="text-xs text-muted-foreground">
                {pendingPackageSelection.isCustomQuote 
                  ? "Your custom quote selection will be saved" 
                  : "Your package selection will be saved"}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="min-h-11"
              onClick={handleDesignGateCancel}
              data-testid="button-cancel-design-gate"
            >
              Cancel
            </Button>
            <Button
              className="min-h-11"
              onClick={handleDesignGateConfirm}
              data-testid="button-go-to-messages"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Go to Messages
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
