import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { db } from "./db";
import { shippingAddresses, productVariants, servicePackages } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { isAuthenticated } from "./localAuth";
import { insertQuoteSchema, insertDesignApprovalSchema } from "@shared/schema";
import type { QuoteStatus, DesignApprovalStatus } from "@shared/schema";
import { addDays } from "date-fns";
import {
  notifyQuoteReceived,
  notifyQuoteAccepted,
  notifyQuoteRejected,
  notifyDesignSubmitted,
  notifyDesignApproved,
  notifyDesignRejected,
  notifyDesignChangesRequested,
} from "./services/notificationService";

interface AuthRequest extends Request {
  user?: any;
}

const requireRole = (allowedRoles: string[]) => {
  return async (req: AuthRequest, res: Response, next: Function) => {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const user = await storage.getUser(userId);
    if (!user || !allowedRoles.includes(user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    (req as any).currentUser = user;
    next();
  };
};

export function setupQuoteApprovalRoutes(app: Express) {
  // ====================================
  // QUOTE MANAGEMENT ROUTES
  // ====================================

  // Create a new quote (seller sends quote to buyer)
  app.post("/api/quotes", isAuthenticated, requireRole(["seller"]), async (req: AuthRequest, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const parsed = insertQuoteSchema.parse(req.body);
      const quoteData = parsed as any; // Type assertion due to Zod schema complexity
      
      // Validate conversation exists and user is the seller
      const conversation = await storage.getConversation(quoteData.conversationId as string);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      if (conversation.sellerId !== userId) {
        return res.status(403).json({ message: "Only the seller can create quotes for this conversation" });
      }

      // Validate that exactly one of productId or serviceId is present
      if (!quoteData.productId && !quoteData.serviceId) {
        return res.status(400).json({ message: "Either productId or serviceId is required" });
      }
      if (quoteData.productId && quoteData.serviceId) {
        return res.status(400).json({ message: "Cannot specify both productId and serviceId" });
      }

      // Validate variant if provided (optional - allows custom specifications)
      if (quoteData.productId && quoteData.productVariantId) {
        const variant = await storage.getProductVariantById(quoteData.productVariantId as string);
        if (!variant) {
          return res.status(404).json({ message: "Product variant not found" });
        }
        if (variant.productId !== (quoteData.productId as string)) {
          return res.status(400).json({ message: "Variant does not belong to the specified product" });
        }
      }

      // Validate package if provided (optional - allows custom specifications)
      if (quoteData.serviceId && quoteData.servicePackageId) {
        const pkg = await storage.getServicePackageById(quoteData.servicePackageId as string);
        if (!pkg) {
          return res.status(404).json({ message: "Service package not found" });
        }
        if (pkg.serviceId !== (quoteData.serviceId as string)) {
          return res.status(400).json({ message: "Package does not belong to the specified service" });
        }
      }

      // Validate quantity
      if (!quoteData.quantity || (quoteData.quantity as number) < 1) {
        return res.status(400).json({ message: "Quantity must be at least 1" });
      }

      // DESIGN-FIRST ENFORCEMENT: Only applies when BOTH requiresQuote AND requiresDesignApproval are true
      let requiresDesignApproval = false;
      let requiresQuote = false;
      if (quoteData.productId) {
        const product = await storage.getProduct(quoteData.productId as string);
        if (product) {
          requiresDesignApproval = product.requiresDesignApproval || false;
          requiresQuote = product.requiresQuote || false;
        }
      } else if (quoteData.serviceId) {
        const service = await storage.getService(quoteData.serviceId as string);
        if (service) {
          requiresDesignApproval = service.requiresDesignApproval || false;
          requiresQuote = service.requiresQuote || false;
        }
      }

      // If BOTH design approval AND quote are required, verify an approved design exists for this variant/package
      // This enforces the design-first workflow only when both workflows are in play
      if (requiresDesignApproval && requiresQuote) {
        // Get all design approvals for this conversation
        const designApprovals = await storage.getDesignApprovalsForConversation(quoteData.conversationId as string);
        
        // Find an approved design that matches the variant/package (or custom if none specified)
        const variantId = quoteData.productVariantId || null;
        const packageId = quoteData.servicePackageId || null;
        
        const matchingApprovedDesign = designApprovals.find(design => {
          // Must be approved status
          if (design.status !== "approved") return false;
          
          // Match variant/package (null matches null for custom specifications)
          if (quoteData.productId) {
            return design.productVariantId === variantId;
          } else if (quoteData.serviceId) {
            return design.servicePackageId === packageId;
          }
          return false;
        });

        if (!matchingApprovedDesign) {
          const variantName = variantId || packageId ? "this variant/package" : "custom specifications";
          return res.status(400).json({ 
            message: `Design approval is required before sending a quote. Please wait for the buyer to submit a design for ${variantName} and approve it first.` 
          });
        }

        // Auto-link the approved design to this quote if not already provided
        if (!quoteData.designApprovalId) {
          quoteData.designApprovalId = matchingApprovedDesign.id;
        }
      }

      // Validate design approval if explicitly provided
      if (quoteData.designApprovalId) {
        const design = await storage.getDesignApproval(quoteData.designApprovalId as string);
        if (!design) {
          return res.status(404).json({ message: "Design approval not found" });
        }
        if (design.conversationId !== (quoteData.conversationId as string)) {
          return res.status(400).json({ message: "Design approval does not belong to this conversation" });
        }
        if (design.status !== "approved" && design.status !== "resubmitted") {
          return res.status(400).json({ message: "Design approval must be approved before creating a quote" });
        }
      }

      // Apply 7-day default expiry if not provided
      const expiresAt = quoteData.expiresAt ?? addDays(new Date(), 7);

      // Check if there's an existing "requested" quote for this conversation
      const existingQuote = await storage.getActiveQuoteForConversation(quoteData.conversationId as string);
      
      let quote;
      if (existingQuote && existingQuote.status === "requested") {
        // Update the existing requested quote with seller's response
        quote = await storage.updateQuote(existingQuote.id, {
          ...quoteData,
          expiresAt,
          status: "sent" as QuoteStatus,
          updatedAt: new Date(),
        });
      } else {
        // Create new quote
        quote = await storage.createQuote({
          ...quoteData,
          expiresAt,
          buyerId: conversation.buyerId!,
          sellerId: conversation.sellerId!,
          status: "sent" as QuoteStatus,
        });
      }

      // Add "quote" workflow context to conversation so it shows in conversation list
      await storage.addWorkflowContext(quoteData.conversationId as string, "quote");

      // Send notification to buyer about new quote
      let itemName = "Item";
      if (quoteData.productId) {
        const product = await storage.getProduct(quoteData.productId as string);
        itemName = product?.name || "Product";
      } else if (quoteData.serviceId) {
        const service = await storage.getService(quoteData.serviceId as string);
        itemName = service?.name || "Service";
      }
      
      await notifyQuoteReceived({
        buyerId: conversation.buyerId!,
        quoteId: quote.id,
        itemName,
        price: parseFloat(quoteData.price as string),
      });

      res.json(quote);
    } catch (error: any) {
      console.error("Error creating quote:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Get active quote for an item (used during checkout validation and messaging)
  // IMPORTANT: This must come BEFORE /api/quotes/:id to avoid route collision
  app.get("/api/quotes/active", isAuthenticated, requireRole(["buyer", "seller"]), async (req: AuthRequest, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { conversationId, productId, serviceId } = req.query;
      console.log("[QUOTE ACTIVE] Request params:", { conversationId, productId, serviceId, userId });
      
      // Prioritize conversation-based lookup
      if (conversationId) {
        const conversation = await storage.getConversation(conversationId as string);
        console.log("[QUOTE ACTIVE] Conversation found:", conversation ? "yes" : "no");
        if (!conversation) {
          return res.status(404).json({ message: "Conversation not found" });
        }
        
        // Verify user is either the buyer OR seller in this conversation
        console.log("[QUOTE ACTIVE] Auth check:", { buyerId: conversation.buyerId, sellerId: conversation.sellerId, userId });
        if (conversation.buyerId !== userId && conversation.sellerId !== userId) {
          return res.status(403).json({ message: "Not authorized to access this quote" });
        }
        
        const quote = await storage.getActiveQuoteForConversation(conversationId as string);
        console.log("[QUOTE ACTIVE] Quote found:", quote ? `yes (id: ${quote.id}, status: ${quote.status})` : "no");
        return res.json(quote || null);
      }
      
      // Fallback to product/service-based lookup (for checkout validation)
      if (!productId && !serviceId) {
        return res.status(400).json({ message: "Either conversationId, productId, or serviceId is required" });
      }

      const quote = await storage.getActiveQuoteForItem(
        userId,
        productId as string | undefined,
        serviceId as string | undefined
      );

      res.json(quote || null);
    } catch (error: any) {
      console.error("Error fetching active quote:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get a specific quote by ID (with enriched product/service data for checkout)
  app.get("/api/quotes/:id", isAuthenticated, async (req: AuthRequest, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const quote = await storage.getQuote(req.params.id);
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }

      // Verify user is buyer, seller, or admin
      const user = await storage.getUser(userId);
      if (quote.buyerId !== userId && quote.sellerId !== userId && user?.role !== "admin") {
        return res.status(403).json({ message: "You are not authorized to view this quote" });
      }

      // Enrich quote with product/service data for checkout
      let enrichedQuote: any = { ...quote };
      
      if (quote.productId) {
        const product = await storage.getProduct(quote.productId);
        if (product) {
          const seller = await storage.getUser(product.sellerId);
          enrichedQuote.product = {
            ...product,
            seller: seller ? {
              id: seller.id,
              email: seller.email,
              firstName: seller.firstName,
              lastName: seller.lastName,
            } : null
          };
          
          // Also include variant data if available
          if (quote.productVariantId) {
            const variants = await db.select().from(productVariants)
              .where(eq(productVariants.id, quote.productVariantId)).limit(1);
            if (variants[0]) {
              enrichedQuote.productVariant = variants[0];
            }
          }
        }
      }
      
      if (quote.serviceId) {
        const service = await storage.getService(quote.serviceId);
        if (service) {
          const seller = await storage.getUser(service.sellerId);
          enrichedQuote.service = {
            ...service,
            seller: seller ? {
              id: seller.id,
              email: seller.email,
              firstName: seller.firstName,
              lastName: seller.lastName,
            } : null
          };
          
          // Also include package data if available
          if (quote.servicePackageId) {
            const packages = await db.select().from(servicePackages)
              .where(eq(servicePackages.id, quote.servicePackageId)).limit(1);
            if (packages[0]) {
              enrichedQuote.servicePackage = packages[0];
            }
          }
        }
      }

      res.json(enrichedQuote);
    } catch (error: any) {
      console.error("Error fetching quote:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get quotes for a conversation
  app.get("/api/conversations/:conversationId/quotes", isAuthenticated, async (req: AuthRequest, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Verify user has access to this conversation
      const conversation = await storage.getConversation(req.params.conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      const user = await storage.getUser(userId);
      if (conversation.buyerId !== userId && conversation.sellerId !== userId && user?.role !== "admin") {
        return res.status(403).json({ message: "You are not authorized to view quotes for this conversation" });
      }

      const quotes = await storage.getQuotesByConversation(req.params.conversationId);
      res.json(quotes);
    } catch (error: any) {
      console.error("Error fetching conversation quotes:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get quotes for current user (buyer or seller view)
  app.get("/api/quotes", isAuthenticated, async (req: AuthRequest, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { status } = req.query;
      let quotes;

      if (user.role === "buyer") {
        quotes = await storage.getQuotesByBuyer(userId, status as QuoteStatus | undefined);
      } else if (user.role === "seller") {
        quotes = await storage.getQuotesBySeller(userId, status as QuoteStatus | undefined);
      } else {
        return res.status(403).json({ message: "Only buyers and sellers can view quotes" });
      }

      // Enrich quotes with buyer, product, service, and conversation details
      const enrichedQuotes = await Promise.all(
        quotes.map(async (quote) => {
          const buyer = await storage.getUser(quote.buyerId);
          const seller = await storage.getUser(quote.sellerId);
          const conversation = await storage.getConversation(quote.conversationId);
          let product = null;
          let service = null;
          
          if (quote.productId) {
            product = await storage.getProduct(quote.productId);
          }
          if (quote.serviceId) {
            service = await storage.getService(quote.serviceId);
          }
          
          return {
            ...quote,
            buyer,
            seller,
            conversation,
            product,
            service,
          };
        })
      );

      res.json(enrichedQuotes);
    } catch (error: any) {
      console.error("Error fetching quotes:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Accept a quote (buyer action)
  app.post("/api/quotes/:id/accept", isAuthenticated, requireRole(["buyer"]), async (req: AuthRequest, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const quote = await storage.acceptQuote(req.params.id, userId);
      
      // Send notification to seller about quote acceptance
      let itemName = "Item";
      if (quote.productId) {
        const product = await storage.getProduct(quote.productId);
        itemName = product?.name || "Product";
      } else if (quote.serviceId) {
        const service = await storage.getService(quote.serviceId);
        itemName = service?.name || "Service";
      }
      
      await notifyQuoteAccepted({
        sellerId: quote.sellerId,
        quoteId: quote.id,
        itemName,
      });
      
      res.json(quote);
    } catch (error: any) {
      console.error("Error accepting quote:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Reject a quote (buyer action)
  app.post("/api/quotes/:id/reject", isAuthenticated, requireRole(["buyer"]), async (req: AuthRequest, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { reason } = req.body;
      const quote = await storage.rejectQuote(req.params.id, userId, reason);
      
      // Send notification to seller about quote rejection
      let itemName = "Item";
      if (quote.productId) {
        const product = await storage.getProduct(quote.productId);
        itemName = product?.name || "Product";
      } else if (quote.serviceId) {
        const service = await storage.getService(quote.serviceId);
        itemName = service?.name || "Service";
      }
      
      await notifyQuoteRejected({
        sellerId: quote.sellerId,
        quoteId: quote.id,
        itemName,
        reason,
      });
      
      res.json(quote);
    } catch (error: any) {
      console.error("Error rejecting quote:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Calculate shipping cost for a quote (for display in purchase dialog)
  app.post("/api/quotes/:id/calculate-shipping", isAuthenticated, requireRole(["buyer"]), async (req: AuthRequest, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { shippingAddressId } = req.body;
      if (!shippingAddressId) {
        return res.status(400).json({ message: "Shipping address ID is required" });
      }

      const quote = await storage.getQuote(req.params.id);
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }

      if (quote.buyerId !== userId) {
        return res.status(403).json({ message: "You are not authorized to calculate shipping for this quote" });
      }

      if (quote.status !== "accepted") {
        return res.status(400).json({ message: "Only accepted quotes can have shipping calculated" });
      }

      // Only calculate shipping for products
      if (!quote.productId) {
        return res.json({ shippingCost: "0.00" });
      }

      // Get product weight - match purchase endpoint logic exactly
      let unitWeight = 0;
      let productDimensions = "";

      if (quote.productVariantId) {
        // If quote has variant, use variant weight only (don't fall back to product)
        const variant = await storage.getProductVariantById(quote.productVariantId);
        if (variant) {
          // Parse weight to handle potential string values
          unitWeight = parseFloat(variant.weight as any) || 0;
          productDimensions = variant.dimensions || "";
        }
      } else if (quote.productId) {
        // Only use product weight for custom quotes without variant
        const product = await storage.getProduct(quote.productId);
        if (product) {
          // Parse weight to handle potential string values, default 0.5kg for custom quotes
          unitWeight = parseFloat(product.weight as any) || 0.5;
          productDimensions = product.dimensions || "";
        }
      }

      // Calculate shipping cost with quantity (same logic as purchase)
      const totalWeight = unitWeight * quote.quantity;
      let shippingCost = 0;
      if (totalWeight > 0) {
        shippingCost = totalWeight * 2.5; // $2.5 per kg
      }
      if (shippingCost < 10) {
        shippingCost = 10; // Minimum $10 shipping
      }

      res.json({
        shippingCost: shippingCost.toFixed(2),
        productWeight: totalWeight,
        unitWeight,
        productDimensions,
      });
    } catch (error: any) {
      console.error("Error calculating shipping:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Purchase a custom quote directly (buyer action) - creates order from quote
  app.post("/api/quotes/:id/purchase", isAuthenticated, requireRole(["buyer"]), async (req: AuthRequest, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { shippingAddressId, paymentMethod } = req.body;

      // Validate required fields
      if (!shippingAddressId) {
        return res.status(400).json({ message: "Shipping address is required" });
      }
      if (!paymentMethod || !["ipg", "bank_transfer"].includes(paymentMethod)) {
        return res.status(400).json({ message: "Valid payment method is required" });
      }

      // Get and validate quote
      const quote = await storage.getQuote(req.params.id);
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      // Verify user is the buyer
      if (quote.buyerId !== userId) {
        return res.status(403).json({ message: "You are not authorized to purchase this quote" });
      }

      // Verify quote is accepted
      if (quote.status !== "accepted") {
        return res.status(400).json({ message: "Only accepted quotes can be purchased" });
      }

      // Get shipping address
      const [shippingAddress] = await db
        .select()
        .from(shippingAddresses)
        .where(
          and(
            eq(shippingAddresses.id, shippingAddressId),
            eq(shippingAddresses.userId, userId)
          )
        )
        .limit(1);
      
      if (!shippingAddress) {
        return res.status(404).json({ message: "Shipping address not found or does not belong to you" });
      }

      // Get product/service details
      let sellerId: string;
      
      if (quote.productId) {
        const product = await storage.getProduct(quote.productId);
        if (!product) {
          return res.status(404).json({ message: "Product not found" });
        }
        sellerId = product.sellerId;
      } else if (quote.serviceId) {
        const service = await storage.getService(quote.serviceId);
        if (!service) {
          return res.status(404).json({ message: "Service not found" });
        }
        sellerId = service.sellerId;
      } else {
        return res.status(400).json({ message: "Quote must have either productId or serviceId" });
      }

      // Calculate product total (quote price * quantity)
      const unitPrice = parseFloat(quote.quotedPrice);
      const productTotal = unitPrice * quote.quantity;

      // Calculate shipping cost (for products only)
      let shippingCost = 0;
      let productWeight = 0;
      let productDimensions = null;
      
      if (quote.productId) {
        const product = await storage.getProduct(quote.productId);
        
        // Get weight from variant if exists, otherwise from product
        if (quote.productVariantId) {
          const variant = await db.query.productVariants.findFirst({
            where: (variants, { eq }) => eq(variants.id, quote.productVariantId!),
          });
          if (variant) {
            productWeight = (parseFloat(variant.weight || "0") || 0) * quote.quantity;
            if (variant.length && variant.width && variant.height) {
              productDimensions = {
                length: parseFloat(variant.length),
                width: parseFloat(variant.width),
                height: parseFloat(variant.height),
              };
            }
          }
        } else if (product) {
          // Use product weight for custom quotes without variant
          productWeight = (parseFloat(product.weight || "0") || 0.5) * quote.quantity; // Default 0.5 kg per item
        }
        
        // Calculate shipping using same logic as checkout
        const hasAramexCredentials = !!(
          process.env.ARAMEX_USERNAME &&
          process.env.ARAMEX_PASSWORD &&
          process.env.ARAMEX_ACCOUNT_NUMBER
        );
        
        if (!hasAramexCredentials) {
          // Dev mode fallback
          shippingCost = Math.max(10, productWeight * 2.5); // $2.5 per KG, minimum $10
        } else {
          // TODO: Call Aramex API - for now use fallback
          shippingCost = Math.max(10, productWeight * 2.5);
        }
      }

      const totalAmount = productTotal + shippingCost;

      // Format shipping address as text (for orders only)
      const shippingAddressText = `${shippingAddress.recipientName}\n${shippingAddress.addressLine1}${shippingAddress.addressLine2 ? `\n${shippingAddress.addressLine2}` : ""}\n${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postalCode}\n${shippingAddress.country}${shippingAddress.phoneNumber ? `\nPhone: ${shippingAddress.phoneNumber}` : ""}`;

      // Create order or booking based on quote type
      let result;
      if (quote.productId) {
        // Create order from product quote
        result = await storage.createOrder({
          buyerId: userId,
          sellerId,
          productId: quote.productId,
          variantId: quote.productVariantId || undefined, // Can be null for custom quotes
          quoteId: quote.id,
          designApprovalId: quote.designApprovalId || undefined,
          quantity: quote.quantity,
          unitPrice: unitPrice.toString(),
          totalAmount: totalAmount.toFixed(2),
          shippingCost: shippingCost.toFixed(2),
          productWeight: productWeight.toFixed(3),
          productDimensions,
          shippingAddress: shippingAddressText,
          shippingAddressId,
          paymentMethod,
          status: "pending_payment",
        });
      } else if (quote.serviceId) {
        // Create booking from service quote
        // Note: Bookings don't have shipping addresses or scheduled dates yet
        result = await storage.createBooking({
          buyerId: userId,
          sellerId,
          serviceId: quote.serviceId,
          packageId: quote.servicePackageId || undefined,
          quoteId: quote.id,
          designApprovalId: quote.designApprovalId || undefined,
          quantity: quote.quantity,
          amount: totalAmount.toString(),
          paymentMethod,
          status: "pending_payment",
        });
      }

      // If payment method is IPG, create payment session and redirect URL
      if (paymentMethod === "ipg") {
        const baseUrl = process.env.REPLIT_DOMAINS?.split(",")[0] 
          ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
          : "http://localhost:5000";
        const ipgUrl = new URL("/mock-ipg", baseUrl);
        const referenceId = quote.productId ? result.id : result.id; // Use order/booking ID as reference
        
        // Set parameters expected by Mock IPG
        ipgUrl.searchParams.set("transactionRef", referenceId);
        ipgUrl.searchParams.set("amount", totalAmount.toFixed(2));
        ipgUrl.searchParams.set("merchantId", "VAANEY_MERCHANT");
        ipgUrl.searchParams.set("returnUrl", `${baseUrl}/orders`);
        ipgUrl.searchParams.set("transactionType", quote.productId ? "order" : "booking");
        
        return res.json({
          ...result,
          type: quote.productId ? "order" : "booking",
          ipgRedirectUrl: ipgUrl.toString(),
          shippingCost: shippingCost.toFixed(2),
        });
      }
      
      res.json({
        ...result,
        type: quote.productId ? "order" : "booking",
        shippingCost: quote.productId ? shippingCost.toFixed(2) : "0.00",
      });
    } catch (error: any) {
      console.error("Error purchasing quote:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // ====================================
  // DESIGN APPROVAL ROUTES
  // ====================================

  // Create a new design approval (buyer uploads design)
  app.post("/api/design-approvals", isAuthenticated, requireRole(["buyer"]), async (req: AuthRequest, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const approvalData = insertDesignApprovalSchema.parse(req.body) as {
        conversationId: string;
        quoteId?: string;
        context: "product" | "quote";
        productId?: string;
        serviceId?: string;
        variantId?: string;
        packageId?: string;
        designFiles: Array<{ url: string; filename: string; size: number; mimeType: string }>;
        sellerNotes?: string;
      };
      
      // Validate conversation exists and user is the buyer
      const conversation = await storage.getConversation(approvalData.conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      if (conversation.buyerId !== userId) {
        return res.status(403).json({ message: "Only the buyer can submit designs for this conversation" });
      }

      // Validate that exactly one of productId or serviceId is present
      if (!approvalData.productId && !approvalData.serviceId) {
        return res.status(400).json({ message: "Either productId or serviceId is required" });
      }
      if (approvalData.productId && approvalData.serviceId) {
        return res.status(400).json({ message: "Cannot specify both productId and serviceId" });
      }

      // Context-specific validation
      const context = approvalData.context || "product";
      
      if (context === "product") {
        // Product-scoped designs require variant/package
        if (approvalData.productId && !approvalData.variantId) {
          return res.status(400).json({ message: "Variant is required for product-scoped design approvals" });
        }
        if (approvalData.serviceId && !approvalData.packageId) {
          return res.status(400).json({ message: "Package is required for service-scoped design approvals" });
        }
      } else if (context === "quote") {
        // Quote-scoped designs should NOT have variant/package initially
        // They are for custom specifications, not listed options
        if (approvalData.variantId || approvalData.packageId) {
          return res.status(400).json({ message: "Quote-scoped design approvals should not specify variant or package" });
        }
      }

      // If linked to a quote, verify quote exists and belongs to this conversation
      if (approvalData.quoteId) {
        const quote = await storage.getQuote(approvalData.quoteId);
        if (!quote) {
          return res.status(404).json({ message: "Quote not found" });
        }
        if (quote.conversationId !== approvalData.conversationId) {
          return res.status(400).json({ message: "Quote does not belong to this conversation" });
        }
        // Ensure context matches
        if (context !== "quote") {
          return res.status(400).json({ message: "Design approvals linked to quotes must have context='quote'" });
        }
      }

      // Create design approval with buyer and seller IDs from conversation
      const approval = await storage.createDesignApproval({
        ...approvalData,
        context,
        buyerId: conversation.buyerId!,
        sellerId: conversation.sellerId!,
      });

      // Add "product" workflow context to conversation so it shows in conversation list
      await storage.addWorkflowContext(approvalData.conversationId, "product");

      res.json(approval);
    } catch (error: any) {
      console.error("Error creating design approval:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Get approved design for an item (used during checkout validation and messaging)
  // IMPORTANT: This must come BEFORE /api/design-approvals/:id to avoid route collision
  app.get("/api/design-approvals/approved", isAuthenticated, requireRole(["buyer", "seller"]), async (req: AuthRequest, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { conversationId, productId, serviceId, variantId, packageId } = req.query;
      
      // Prioritize conversation-based lookup (for messaging UI)
      if (conversationId) {
        const conversation = await storage.getConversation(conversationId as string);
        if (!conversation) {
          return res.status(404).json({ message: "Conversation not found" });
        }
        
        // Verify user is either the buyer OR seller in this conversation
        if (conversation.buyerId !== userId && conversation.sellerId !== userId) {
          return res.status(403).json({ message: "Not authorized to access this design" });
        }
        
        const approval = await storage.getApprovedDesignForConversation(conversationId as string);
        return res.json(approval || null);
      }
      
      // Fallback to product/service-based lookup (for checkout validation)
      if (!productId && !serviceId) {
        return res.status(400).json({ message: "Either conversationId, productId, or serviceId is required" });
      }

      const approval = await storage.getApprovedDesignForItem(
        userId,
        productId as string | undefined,
        serviceId as string | undefined,
        variantId as string | undefined,
        packageId as string | undefined
      );

      res.json(approval || null);
    } catch (error: any) {
      console.error("Error fetching approved design:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get a specific design approval by ID
  app.get("/api/design-approvals/:id", isAuthenticated, async (req: AuthRequest, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const approval = await storage.getDesignApproval(req.params.id);
      if (!approval) {
        return res.status(404).json({ message: "Design approval not found" });
      }

      // Verify user is buyer, seller, or admin
      const user = await storage.getUser(userId);
      if (approval.buyerId !== userId && approval.sellerId !== userId && user?.role !== "admin") {
        return res.status(403).json({ message: "You are not authorized to view this design approval" });
      }

      res.json(approval);
    } catch (error: any) {
      console.error("Error fetching design approval:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get design approvals for a conversation
  app.get("/api/conversations/:conversationId/design-approvals", isAuthenticated, async (req: AuthRequest, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Verify user has access to this conversation
      const conversation = await storage.getConversation(req.params.conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      const user = await storage.getUser(userId);
      if (conversation.buyerId !== userId && conversation.sellerId !== userId && user?.role !== "admin") {
        return res.status(403).json({ message: "You are not authorized to view design approvals for this conversation" });
      }

      const approvals = await storage.getDesignApprovalsByConversation(req.params.conversationId);
      res.json(approvals);
    } catch (error: any) {
      console.error("Error fetching conversation design approvals:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get design approvals for current user (buyer or seller view)
  app.get("/api/design-approvals", isAuthenticated, async (req: AuthRequest, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { status, conversationId } = req.query;
      let approvals;

      if (user.role === "buyer") {
        approvals = await storage.getDesignApprovalsByBuyer(userId, status as DesignApprovalStatus | undefined);
      } else if (user.role === "seller") {
        approvals = await storage.getDesignApprovalsBySeller(userId, status as DesignApprovalStatus | undefined);
      } else {
        return res.status(403).json({ message: "Only buyers and sellers can view design approvals" });
      }

      // Filter by conversationId if provided
      if (conversationId && typeof conversationId === 'string') {
        approvals = approvals.filter(approval => approval.conversationId === conversationId);
      }

      // Enrich approvals with buyer, product, service, variant, package, and conversation details
      const enrichedApprovals = await Promise.all(
        approvals.map(async (approval) => {
          const buyer = await storage.getUser(approval.buyerId);
          const seller = await storage.getUser(approval.sellerId);
          const conversation = await storage.getConversation(approval.conversationId);
          let product = null;
          let service = null;
          let productVariant = null;
          let servicePackage = null;
          
          if (approval.productId) {
            product = await storage.getProduct(approval.productId);
          }
          if (approval.serviceId) {
            service = await storage.getService(approval.serviceId);
          }
          if (approval.variantId) {
            productVariant = await storage.getProductVariantById(approval.variantId);
          }
          if (approval.packageId) {
            servicePackage = await storage.getServicePackageById(approval.packageId);
          }
          
          return {
            ...approval,
            buyer,
            seller,
            conversation,
            product,
            service,
            productVariant,
            servicePackage,
          };
        })
      );

      res.json(enrichedApprovals);
    } catch (error: any) {
      console.error("Error fetching design approvals:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Approve a design (seller action)
  app.post("/api/design-approvals/:id/approve", isAuthenticated, requireRole(["seller"]), async (req: AuthRequest, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { notes } = req.body;
      const approval = await storage.approveDesign(req.params.id, userId, notes);
      res.json(approval);
    } catch (error: any) {
      console.error("Error approving design:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Reject a design (seller action)
  app.post("/api/design-approvals/:id/reject", isAuthenticated, requireRole(["seller"]), async (req: AuthRequest, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { notes } = req.body;
      // Notes are optional for rejection
      const approval = await storage.rejectDesign(req.params.id, userId, notes || undefined);
      res.json(approval);
    } catch (error: any) {
      console.error("Error rejecting design:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Request changes to a design (seller action)
  app.post("/api/design-approvals/:id/request-changes", isAuthenticated, requireRole(["seller"]), async (req: AuthRequest, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { notes } = req.body;
      if (!notes) {
        return res.status(400).json({ message: "Change request notes are required" });
      }

      const approval = await storage.requestDesignChanges(req.params.id, userId, notes);
      res.json(approval);
    } catch (error: any) {
      console.error("Error requesting design changes:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Resubmit a design after changes (buyer action)
  app.post("/api/design-approvals/:id/resubmit", isAuthenticated, requireRole(["buyer"]), async (req: AuthRequest, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { designFiles } = req.body;
      if (!designFiles || !Array.isArray(designFiles)) {
        return res.status(400).json({ message: "Design files are required for resubmission" });
      }

      const approval = await storage.resubmitDesign(req.params.id, userId, designFiles);
      res.json(approval);
    } catch (error: any) {
      console.error("Error resubmitting design:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // ====================================
  // BUYER DASHBOARD ROUTES
  // ====================================

  // Get approved designs library for buyer (for reuse/reference)
  app.get("/api/buyer/design-library", isAuthenticated, requireRole(["buyer"]), async (req: AuthRequest, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const approvedDesigns = await storage.getApprovedDesignsLibrary(userId);

      // Enrich with product/service/variant details
      const enrichedDesigns = await Promise.all(
        approvedDesigns.map(async (design) => {
          let product = null;
          let service = null;
          let productVariant = null;
          let servicePackage = null;
          
          if (design.productId) {
            product = await storage.getProduct(design.productId);
          }
          if (design.serviceId) {
            service = await storage.getService(design.serviceId);
          }
          if (design.variantId) {
            productVariant = await storage.getProductVariantById(design.variantId);
          }
          if (design.packageId) {
            servicePackage = await storage.getServicePackageById(design.packageId);
          }
          
          return {
            ...design,
            product,
            service,
            productVariant,
            servicePackage,
          };
        })
      );

      res.json(enrichedDesigns);
    } catch (error: any) {
      console.error("Error fetching design library:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get which variants have approved designs for a product (for smart add-to-cart)
  app.get("/api/products/:productId/approved-variants", isAuthenticated, requireRole(["buyer"]), async (req: AuthRequest, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const approvedVariants = await storage.getProductApprovedVariants(req.params.productId, userId);
      
      // Enrich with variant details (status and approvedAt now come from storage method)
      const enrichedVariants = await Promise.all(
        approvedVariants.map(async (av) => {
          const variant = await storage.getProductVariantById(av.variantId);
          
          return {
            id: av.designApprovalId, // Use 'id' as canonical field
            variantId: av.variantId,
            designApprovalId: av.designApprovalId,
            status: av.status,
            approvedAt: av.approvedAt,
            variant,
          };
        })
      );

      res.json(enrichedVariants);
    } catch (error: any) {
      console.error("Error fetching approved variants:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Copy an approved design to a different variant/package
  app.post("/api/design-approvals/:sourceId/copy-to-variant", isAuthenticated, requireRole(["buyer"]), async (req: AuthRequest, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { sourceId } = req.params;
      const { targetVariantId, targetPackageId } = req.body;

      // Validate that exactly one target is provided
      if (!targetVariantId && !targetPackageId) {
        return res.status(400).json({ message: "Either targetVariantId or targetPackageId is required" });
      }
      if (targetVariantId && targetPackageId) {
        return res.status(400).json({ message: "Cannot specify both targetVariantId and targetPackageId" });
      }

      const newApproval = await storage.copyDesignApprovalToTarget(
        sourceId,
        userId,
        targetVariantId,
        targetPackageId
      );

      res.status(201).json(newApproval);
    } catch (error: any) {
      console.error("Error copying design approval:", error);
      // Return 403 for authorization errors, 400 for validation errors
      if (error.message.includes("not authorized") || error.message.includes("same seller")) {
        return res.status(403).json({ message: error.message });
      }
      res.status(400).json({ message: error.message });
    }
  });
}
