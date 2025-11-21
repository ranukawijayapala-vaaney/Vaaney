import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { eq, and, or, inArray, isNull, isNotNull, not, desc } from "drizzle-orm";
import { isAuthenticated } from "./localAuth";
import { ObjectStorageService, ObjectNotFoundError, parseObjectPath, objectStorageClient } from "./objectStorage";
import { ObjectAclPolicy, ObjectPermission, setObjectAclPolicy, canAccessObject, getObjectAclPolicy } from "./objectAcl";
import type { User, OrderItem, ConversationType } from "@shared/schema";
import multer from "multer";
import { z } from "zod";
import {
  insertProductSchema,
  insertProductVariantSchema,
  insertServiceSchema,
  insertServicePackageSchema,
  insertOrderSchema,
  insertCheckoutSessionSchema,
  insertBookingSchema,
  insertHomepageBannerSchema,
  insertOrderRatingSchema,
  insertBookingRatingSchema,
  insertConversationSchema,
  insertMessageSchema,
  insertMessageAttachmentSchema,
  insertAdminMessageTemplateSchema,
  insertBoostPackageSchema,
  insertBoostedItemSchema,
  insertAramexShipmentSchema,
  insertReturnRequestSchema,
  insertQuoteSchema,
  insertDesignApprovalSchema,
  insertBankAccountSchema,
  updateBankAccountSchema,
  orderItems,
  orders,
  checkoutSessions,
  bookings,
  products,
  services,
  productVariants,
  servicePackages,
  transactions,
  users,
  messages,
  messageAttachments,
  boostPurchases,
  boostedItems,
  boostPackages,
  aramexShipments,
  consolidatedShipments,
  shippingAddresses,
  returnRequests,
  quotes,
  designApprovals,
  bankAccounts,
} from "@shared/schema";
import * as aramex from "./aramex";
import { trackShipments, isShipmentDelivered } from "./aramex";
import { setupShippingRoutes } from "./shippingRoutes";
import { setupQuoteApprovalRoutes } from "./quoteApprovalRoutes";
import notificationRoutes from "./notificationRoutes";
import emailVerificationRoutes from "./emailVerificationRoutes";
import {
  notifyOrderPaid,
  notifyOrderShipped,
  notifyOrderDelivered,
  notifyBookingPaid,
  notifyBookingCompleted,
  notifyReturnRequested,
  notifyReturnApproved,
  notifyReturnRejected,
  notifyRefundProcessed,
  notifyMessageReceived,
  notifyBoostPurchaseCreated,
  notifyBoostPaymentConfirmed,
  notifyBoostPaymentFailed,
} from "./services/notificationService";

const objectStorageService = new ObjectStorageService();

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

// Centralized payment reference generator
function generatePaymentReference(transactionRef: string): string {
  return `IPG-${transactionRef}-${Date.now()}`;
}

// Shared utility to enrich return requests with buyer, seller, order, and booking details
async function enrichReturnRequest(request: any) {
  let orderDetails = null;
  let bookingDetails = null;
  let buyerDetails = null;
  let sellerDetails = null;

  // Get buyer details
  if (request.buyerId) {
    const buyer = await storage.getUser(request.buyerId);
    if (buyer) {
      buyerDetails = {
        id: buyer.id,
        firstName: buyer.firstName,
        lastName: buyer.lastName,
        email: buyer.email,
      };
    }
  }

  // Get order details
  if (request.orderId) {
    const order = await storage.getOrder(request.orderId);
    if (order) {
      const [product] = await db.select().from(products).where(eq(products.id, order.productId)).limit(1);
      const [variant] = await db.select().from(productVariants).where(eq(productVariants.id, order.variantId)).limit(1);
      orderDetails = {
        id: order.id,
        productName: product?.name,
        variantName: variant?.name,
        totalAmount: order.totalAmount,
        status: order.status,
      };
    }
  }

  // Get booking details
  if (request.bookingId) {
    const booking = await storage.getBooking(request.bookingId);
    if (booking) {
      const service = await storage.getService(booking.serviceId);
      const [pkg] = await db.select().from(servicePackages).where(eq(servicePackages.id, booking.packageId)).limit(1);
      bookingDetails = {
        id: booking.id,
        serviceName: service?.name,
        packageName: pkg?.name,
        amount: booking.amount,
        status: booking.status,
      };
    }
  }

  // Get seller details
  if (request.sellerId) {
    const seller = await storage.getUser(request.sellerId);
    if (seller) {
      sellerDetails = {
        id: seller.id,
        firstName: seller.firstName,
        lastName: seller.lastName,
      };
    }
  }

  return {
    ...request,
    buyer: buyerDetails,
    seller: sellerDetails,
    order: orderDetails,
    booking: bookingDetails,
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize ACL with storage for conversation-based access control
  const { setStorageForAcl } = await import("./objectAcl");
  setStorageForAcl(storage);

  // Object Storage - MUST be first to prevent Vite SPA fallback from catching it
  app.get("/objects/*", async (req: AuthRequest, res: Response) => {
    console.log(`[OBJECTS] GET request to: ${req.path}`);
    const userId = (req.user as any)?.id;
    // Decode the URL to handle spaces and special characters
    const objectPath = decodeURIComponent(req.path);
    console.log(`[OBJECTS] User ID: ${userId}, Decoded object path: ${objectPath}`);
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
      console.log(`[OBJECTS] File found: ${objectFile.name}`);
      
      // Debug: Check ACL policy
      const aclPolicy = await getObjectAclPolicy(objectFile);
      console.log(`[OBJECTS] ACL Policy:`, JSON.stringify(aclPolicy));
      
      const canAccess = await objectStorageService.canAccessObjectEntity({
        userId,
        objectFile,
        requestedPermission: ObjectPermission.READ,
      });
      console.log(`[OBJECTS] Access check: ${canAccess}`);
      if (!canAccess) {
        console.log(`[OBJECTS] Access denied for user ${userId}`);
        return res.status(403).json({ message: "Access denied" });
      }
      console.log(`[OBJECTS] Streaming file...`);
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error: any) {
      console.error(`[OBJECTS] Error:`, error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ message: "Object not found" });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // IPG Payment Webhook - handles automatic payment confirmations from payment gateway
  app.post("/api/webhooks/ipg-payment", async (req: Request, res: Response) => {
    try {
      const { transactionRef, status, amount } = req.body;
      
      if (!transactionRef || !status) {
        return res.status(400).json({ message: "Missing required webhook parameters" });
      }
      
      // Verify webhook authentication using header
      // In production, this would verify HMAC signature or OAuth token
      const webhookSecret = req.headers['x-webhook-secret'];
      const expectedSecret = process.env.WEBHOOK_SECRET || "mock_webhook_secret_for_development";
      
      if (webhookSecret !== expectedSecret) {
        console.log(`IPG webhook authentication failed for ${transactionRef}`);
        return res.status(401).json({ message: "Unauthorized webhook request" });
      }
      
      if (status !== "SUCCESS") {
        console.log(`IPG payment failed for ${transactionRef}`);
        return res.json({ received: true, status: "ignored" });
      }
      
      // Check if transactionRef is a checkout session
      const checkoutSession = await db.query.checkoutSessions.findFirst({
        where: eq(checkoutSessions.id, transactionRef),
      });
      
      if (checkoutSession) {
        const paymentRef = generatePaymentReference(transactionRef);
        
        // Update checkout session status
        await db.update(checkoutSessions).set({
          status: "paid",
        }).where(eq(checkoutSessions.id, transactionRef));
        
        // Update all orders in this checkout session to paid
        await db.update(orders).set({
          status: "paid",
          paymentReference: paymentRef
        }).where(eq(orders.checkoutSessionId, transactionRef));
        
        // Update all transactions for these orders to escrow
        const ordersInSession = await db.query.orders.findMany({
          where: eq(orders.checkoutSessionId, transactionRef),
        });
        
        for (const order of ordersInSession) {
          await db.update(transactions).set({
            status: "escrow",
            paymentReference: paymentRef
          }).where(eq(transactions.orderId, order.id));
          
          // Send notifications for paid order
          const [product] = await db.select().from(products).where(eq(products.id, order.productId));
          if (product) {
            await notifyOrderPaid({
              buyerId: order.buyerId,
              sellerId: order.sellerId,
              orderId: order.id,
              productName: product.name,
            });
          }
        }
        
        console.log(`Checkout session ${transactionRef} paid via IPG with reference ${paymentRef}`);
        return res.json({ received: true, status: "processed", type: "checkout", ordersCount: ordersInSession.length });
      }
      
      // Check individual orders (legacy support)
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, transactionRef),
      });
      
      if (order) {
        const paymentRef = generatePaymentReference(transactionRef);
        
        // Update order status to paid
        await db.update(orders).set({ 
          status: "paid",
          paymentReference: paymentRef
        }).where(eq(orders.id, transactionRef));
        
        // Update all related transactions to escrow status
        await db.update(transactions).set({ 
          status: "escrow",
          paymentReference: paymentRef
        }).where(eq(transactions.orderId, transactionRef));
        
        // Send notifications for paid order
        const [product] = await db.select().from(products).where(eq(products.id, order.productId));
        if (product) {
          await notifyOrderPaid({
            buyerId: order.buyerId,
            sellerId: order.sellerId,
            orderId: order.id,
            productName: product.name,
          });
        }
        
        console.log(`Order ${transactionRef} paid via IPG with reference ${paymentRef}`);
        return res.json({ received: true, status: "processed", type: "order" });
      }
      
      // Check bookings
      const booking = await db.query.bookings.findFirst({
        where: eq(bookings.id, transactionRef),
      });
      
      if (booking) {
        const paymentRef = generatePaymentReference(transactionRef);
        
        // Update booking status to paid
        await db.update(bookings).set({ 
          status: "paid",
          paymentReference: paymentRef
        }).where(eq(bookings.id, transactionRef));
        
        // Update transaction to escrow status
        await db.update(transactions).set({ 
          status: "escrow",
          paymentReference: paymentRef
        }).where(eq(transactions.bookingId, transactionRef));
        
        // Send notifications for paid booking
        const [service] = await db.select().from(users).where(eq(users.id, booking.sellerId));
        const serviceData = await storage.getService(booking.serviceId);
        if (serviceData) {
          await notifyBookingPaid({
            buyerId: booking.buyerId,
            sellerId: booking.sellerId,
            bookingId: booking.id,
            serviceName: serviceData.name,
          });
        }
        
        console.log(`Booking ${transactionRef} paid via IPG with reference ${paymentRef}`);
        return res.json({ received: true, status: "processed", type: "booking" });
      }
      
      // Check boost purchases
      const boostPurchase = await db.query.boostPurchases.findFirst({
        where: eq(boostPurchases.id, transactionRef),
      });
      
      if (boostPurchase) {
        const paymentRef = generatePaymentReference(transactionRef);
        
        // Get the boost package to calculate end date
        const boostPackage = await db.query.boostPackages.findFirst({
          where: eq(boostPackages.id, boostPurchase.packageId),
        });
        
        if (!boostPackage) {
          console.error(`Boost package ${boostPurchase.packageId} not found`);
          return res.status(404).json({ message: "Boost package not found" });
        }
        
        // Activate the boost
        await db.transaction(async (tx) => {
          const now = new Date();
          const endDate = new Date(now);
          endDate.setDate(endDate.getDate() + boostPackage.durationDays);
          
          // Update purchase status to paid
          await tx.update(boostPurchases).set({ 
            status: "paid",
            paymentReference: paymentRef,
            paidAt: now
          }).where(eq(boostPurchases.id, transactionRef));
          
          // Update transaction to paid status (boosts don't use escrow)
          await tx.update(transactions).set({ 
            status: "paid",
            paymentReference: paymentRef
          }).where(eq(transactions.boostPurchaseId, transactionRef));
          
          // Activate the boost by creating boosted_items record
          await tx.insert(boostedItems).values({
            itemType: boostPurchase.itemType,
            itemId: boostPurchase.itemId,
            packageId: boostPurchase.packageId,
            startDate: now,
            endDate: endDate,
            isActive: true,
          });
        });
        
        console.log(`Boost purchase ${transactionRef} paid and activated via IPG with reference ${paymentRef}`);
        return res.json({ received: true, status: "processed", type: "boost" });
      }
      
      return res.status(404).json({ message: "Transaction not found" });
    } catch (error: any) {
      console.error("IPG webhook error:", error);
      return res.status(500).json({ message: error.message });
    }
  });

  // Current user endpoint
  app.get("/api/user", isAuthenticated, async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const user = await storage.getUser(userId);
    res.json(user || null);
  });

  // Role selection and verification
  app.post("/api/user/role", isAuthenticated, async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    const { role, verificationDocumentUrl } = req.body;
    if (!userId || !role || !verificationDocumentUrl) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    try {
      // Check if user is already approved - don't let them change their role
      const existingUser = await storage.getUser(userId);
      if (existingUser && existingUser.verificationStatus === "approved") {
        return res.status(403).json({ message: "Cannot change role for already approved users" });
      }
      
      const user = await storage.updateUserRole(userId, role, verificationDocumentUrl);
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin-only role switcher for testing
  app.post("/api/user/switch-role", isAuthenticated, async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    const { role } = req.body;
    
    if (!userId || !role) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Only users with role switching permission can switch roles
      if (!user.canSwitchRoles) {
        return res.status(403).json({ message: "You don't have permission to switch roles" });
      }

      if (!["buyer", "seller", "admin"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      await db.update(users).set({ 
        role: role as "buyer" | "seller" | "admin",
        verificationStatus: "approved"
      }).where(eq(users.id, userId));
      
      const updatedUser = await storage.getUser(userId);
      res.json(updatedUser);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Object Storage Routes
  app.post("/api/object-storage/upload-url", isAuthenticated, async (req: AuthRequest, res: Response) => {
    try {
      console.log("[UPLOAD URL] Request received:", req.body);
      const { fileName, contentType } = req.body;
      const result = await objectStorageService.getObjectEntityUploadURL();
      console.log("[UPLOAD URL] Returning result:", result);
      res.json(result);
    } catch (error: any) {
      console.error("[UPLOAD URL] Error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/object-storage/finalize-upload", isAuthenticated, async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    const { objectPath, visibility } = req.body;
    console.log("[FINALIZE-UPLOAD] Request:", { userId, objectPath, visibility });
    if (!objectPath) {
      return res.status(400).json({ message: "Missing objectPath" });
    }
    try {
      const aclPolicy: ObjectAclPolicy = {
        owner: userId,
        visibility: visibility === "public" ? "public" : "private", // Allow public for product/service images
      };
      console.log("[FINALIZE-UPLOAD] Setting ACL policy:", aclPolicy);
      const normalizedPath = await objectStorageService.trySetObjectEntityAclPolicy(objectPath, aclPolicy);
      console.log("[FINALIZE-UPLOAD] ACL set successfully, normalized path:", normalizedPath);
      
      // Verify the ACL was set
      const objectFile = await objectStorageService.getObjectEntityFile(normalizedPath);
      const setPolicy = await getObjectAclPolicy(objectFile);
      console.log("[FINALIZE-UPLOAD] Verified ACL policy:", JSON.stringify(setPolicy));
      
      res.json({ objectPath: normalizedPath });
    } catch (error: any) {
      console.error("[FINALIZE-UPLOAD] Error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/object-storage/finalize-private-upload", isAuthenticated, async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    console.log("[FINALIZE UPLOAD] Request received:", { userId, body: req.body });
    const { objectPath, fileName } = req.body;
    if (!objectPath) {
      console.log("[FINALIZE UPLOAD] Missing objectPath");
      return res.status(400).json({ message: "Missing objectPath" });
    }
    try {
      console.log("[FINALIZE UPLOAD] Parsing object path:", objectPath);
      const { bucketName, objectName } = parseObjectPath(objectPath);
      console.log("[FINALIZE UPLOAD] Bucket:", bucketName, "Object:", objectName);
      
      // Get the file object directly from GCS
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      
      // Set ACL policy directly on the file
      const aclPolicy: ObjectAclPolicy = {
        owner: userId,
        visibility: "private",
      };
      console.log("[FINALIZE UPLOAD] Setting ACL policy:", aclPolicy);
      await setObjectAclPolicy(file, aclPolicy);
      
      // Normalize the path to /objects/... format
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(objectPath);
      console.log("[FINALIZE UPLOAD] Success! Normalized path:", normalizedPath);
      
      res.json({ 
        objectPath: normalizedPath,
        url: normalizedPath 
      });
    } catch (error: any) {
      console.error("[FINALIZE UPLOAD] Error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/object-storage/finalize-banner-upload", isAuthenticated, requireRole(["admin"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    const { objectPath } = req.body;
    if (!objectPath) {
      return res.status(400).json({ message: "Missing objectPath" });
    }
    try {
      const aclPolicy: ObjectAclPolicy = {
        owner: userId,
        visibility: "public",
      };
      const normalizedPath = await objectStorageService.trySetObjectEntityAclPolicy(objectPath, aclPolicy);
      res.json({ objectPath: normalizedPath });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/object-storage/finalize-product-upload", isAuthenticated, requireRole(["seller", "admin"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    const { objectPath } = req.body;
    if (!objectPath) {
      return res.status(400).json({ message: "Missing objectPath" });
    }
    try {
      const aclPolicy: ObjectAclPolicy = {
        owner: userId,
        visibility: "public",
      };
      const normalizedPath = await objectStorageService.trySetObjectEntityAclPolicy(objectPath, aclPolicy);
      res.json({ objectPath: normalizedPath });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Buyer Routes
  app.get("/api/products", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const products = await storage.getProducts();
      const productsWithDetails = await Promise.all(
        products.map(async (product) => {
          const variants = await storage.getProductVariants(product.id);
          const seller = await storage.getUser(product.sellerId);
          
          // If buyer is authenticated and product requires design approval, include approved variant count
          let approvedVariantCount = 0;
          if (userId && product.requiresDesignApproval) {
            const approvedVariants = await storage.getProductApprovedVariants(product.id, userId);
            approvedVariantCount = approvedVariants.length;
          }
          
          return { 
            ...product, 
            variants,
            seller: seller ? {
              firstName: seller.firstName,
              lastName: seller.lastName,
              verificationStatus: seller.verificationStatus
            } : null,
            approvedVariantCount
          };
        })
      );
      res.json(productsWithDetails);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/products/:id", async (req: Request, res: Response) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      const variants = await storage.getProductVariants(product.id);
      res.json({ ...product, variants });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/services", async (req: Request, res: Response) => {
    try {
      const services = await storage.getServices();
      const servicesWithDetails = await Promise.all(
        services.map(async (service) => {
          const packages = await storage.getServicePackages(service.id);
          const seller = await storage.getUser(service.sellerId);
          return { 
            ...service, 
            packages,
            seller: seller ? {
              firstName: seller.firstName,
              lastName: seller.lastName,
              verificationStatus: seller.verificationStatus
            } : null
          };
        })
      );
      res.json(servicesWithDetails);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/services/:id", async (req: Request, res: Response) => {
    try {
      const service = await storage.getService(req.params.id);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      const packages = await storage.getServicePackages(service.id);
      const seller = await storage.getUser(service.sellerId);
      res.json({ 
        ...service, 
        packages,
        seller: seller ? {
          firstName: seller.firstName,
          lastName: seller.lastName,
          verificationStatus: seller.verificationStatus
        } : null
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/services/:id/packages", async (req: Request, res: Response) => {
    try {
      const packages = await storage.getServicePackages(req.params.id);
      res.json(packages);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Comprehensive rating system - only after verified delivery/completion
  
  // Create order rating (buyer rates seller after order delivery)
  app.post("/api/orders/:orderId/rating", isAuthenticated, requireRole(["buyer"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    const { orderId } = req.params;
    
    try {
      // Get order to find seller ID
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      const validatedData = insertOrderRatingSchema.parse(req.body);
      const rating = await storage.createOrderRating({
        ...validatedData,
        orderId,
        buyerId: userId,
        sellerId: order.sellerId,
      });
      
      res.status(201).json(rating);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Get order rating
  app.get("/api/orders/:orderId/rating", async (req: Request, res: Response) => {
    try {
      const rating = await storage.getOrderRating(req.params.orderId);
      res.json(rating || null);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Check if buyer can rate order
  app.get("/api/orders/:orderId/can-rate", isAuthenticated, requireRole(["buyer"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    try {
      const result = await storage.canRateOrder(req.params.orderId, userId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create booking rating (buyer rates seller after service completion)
  app.post("/api/bookings/:bookingId/rating", isAuthenticated, requireRole(["buyer"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    const { bookingId } = req.params;
    
    try {
      // Get booking to find seller ID
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const validatedData = insertBookingRatingSchema.parse(req.body);
      const rating = await storage.createBookingRating({
        ...validatedData,
        bookingId,
        buyerId: userId,
        sellerId: booking.sellerId,
      });
      
      res.status(201).json(rating);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Get booking rating
  app.get("/api/bookings/:bookingId/rating", async (req: Request, res: Response) => {
    try {
      const rating = await storage.getBookingRating(req.params.bookingId);
      res.json(rating || null);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Check if buyer can rate booking
  app.get("/api/bookings/:bookingId/can-rate", isAuthenticated, requireRole(["buyer"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    try {
      const result = await storage.canRateBooking(req.params.bookingId, userId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get all ratings for a seller
  app.get("/api/sellers/:sellerId/ratings", async (req: Request, res: Response) => {
    try {
      const ratings = await storage.getSellerRatings(req.params.sellerId);
      res.json(ratings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Homepage Banners
  app.get("/api/homepage-banners", async (req: Request, res: Response) => {
    try {
      const { type } = req.query;
      const banners = await storage.getHomepageBanners(false, type as any);
      res.json(banners);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/homepage-banners", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const { type } = req.query;
      const banners = await storage.getHomepageBanners(true, type as any);
      res.json(banners);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/homepage-banners", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const validatedData = insertHomepageBannerSchema.parse(req.body);
      const banner = await storage.createHomepageBanner(validatedData);
      res.status(201).json(banner);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/admin/homepage-banners/:id", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const banner = await storage.updateHomepageBanner(req.params.id, req.body);
      res.json(banner);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/admin/homepage-banners/:id", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      await storage.deleteHomepageBanner(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Generic orders endpoint for authenticated users (used by API tests)
  app.get("/api/orders", isAuthenticated, async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    const role = (req.user as any)?.role;
    
    try {
      let orders;
      if (role === "buyer") {
        orders = await storage.getOrders(userId);
      } else if (role === "seller") {
        orders = await storage.getOrders(undefined, userId);
      } else {
        // Admin can see all orders
        orders = await storage.getOrders();
      }
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/buyer/orders", isAuthenticated, requireRole(["buyer"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    try {
      const orders = await storage.getOrders(userId);
      
      // Enrich orders with product, variant, seller, active return request, rating, and design approval
      const enrichedOrders = await Promise.all(
        orders.map(async (order) => {
          const [product] = await db.select().from(products).where(eq(products.id, order.productId));
          const [variant] = await db.select().from(productVariants).where(eq(productVariants.id, order.variantId));
          const [seller] = await db.select().from(users).where(eq(users.id, order.sellerId));
          
          // Get the most recent active return request for this order
          const [activeReturnRequest] = await db
            .select()
            .from(returnRequests)
            .where(
              and(
                eq(returnRequests.orderId, order.id),
                not(eq(returnRequests.status, "completed")),
                not(eq(returnRequests.status, "cancelled"))
              )
            )
            .orderBy(desc(returnRequests.createdAt))
            .limit(1);
          
          // Get rating for this order (if exists)
          const rating = await storage.getOrderRating(order.id);
          
          // Get design approval if order has designApprovalId
          let designApproval = null;
          if (order.designApprovalId) {
            designApproval = await storage.getDesignApproval(order.designApprovalId);
          }
          
          return {
            ...order,
            product,
            variant,
            seller: seller ? {
              id: seller.id,
              firstName: seller.firstName,
              lastName: seller.lastName,
            } : null,
            activeReturnRequest: activeReturnRequest || null,
            rating: rating || null,
            designApproval: designApproval || null,
          };
        })
      );
      
      res.json(enrichedOrders);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin manually marks order as delivered (for testing or manual override)
  app.put("/api/admin/orders/:id/mark-delivered", isAuthenticated, requireRole(["admin"]), async (req: AuthRequest, res: Response) => {
    try {
      const order = await storage.getOrder(req.params.id);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Can only mark as delivered if order is shipped
      if (order.status !== "shipped") {
        return res.status(400).json({ 
          message: `Cannot mark as delivered for order with status: ${order.status}`,
          currentStatus: order.status
        });
      }
      
      // Update order to delivered
      const updatedOrder = await storage.updateOrderStatus(req.params.id, "delivered");
      
      res.json({ 
        message: "Order marked as delivered successfully",
        order: updatedOrder 
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/buyer/bookings", isAuthenticated, requireRole(["buyer"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    try {
      const bookings = await storage.getBookings(userId);
      const enrichedBookings = await Promise.all(
        bookings.map(async (booking) => {
          const service = await storage.getService(booking.serviceId);
          const packageDetails = await db.select().from(servicePackages).where(eq(servicePackages.id, booking.packageId)).limit(1);
          
          // Get rating for this booking (if exists)
          const rating = await storage.getBookingRating(booking.id);
          
          return {
            ...booking,
            service: service ? { id: service.id, name: service.name } : null,
            package: packageDetails.length > 0 ? { id: packageDetails[0].id, name: packageDetails[0].name } : null,
            rating: rating || null,
          };
        })
      );
      res.json(enrichedBookings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Buyer Return Requests
  app.post("/api/buyer/return-requests", isAuthenticated, requireRole(["buyer"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    try {
      console.log("Return request body:", JSON.stringify(req.body, null, 2));
      const requestData = insertReturnRequestSchema.parse(req.body);

      // Validate that buyer owns the order or booking
      if (requestData.orderId) {
        const order = await storage.getOrder(requestData.orderId);
        if (!order) {
          return res.status(404).json({ message: "Order not found" });
        }
        if (order.buyerId !== userId) {
          return res.status(403).json({ message: "Unauthorized" });
        }
        
        // Check order status - only allow returns for delivered orders (buyer must receive item first)
        if (order.status !== "delivered") {
          return res.status(400).json({ 
            message: `Returns can only be requested for delivered orders. Current status: ${order.status}`,
            currentStatus: order.status
          });
        }

        // Enforce return attempt limit (max 3 attempts per order)
        const MAX_RETURN_ATTEMPTS = 3;
        const currentAttempts = order.returnAttemptCount || 0;
        if (currentAttempts >= MAX_RETURN_ATTEMPTS) {
          return res.status(400).json({ 
            message: `Maximum return request limit reached (${MAX_RETURN_ATTEMPTS} attempts). Please contact support for further assistance.`,
            attemptCount: currentAttempts,
            maxAttempts: MAX_RETURN_ATTEMPTS
          });
        }

        // Check for existing active return request
        const existingRequest = await storage.findReturnRequestForSource({
          orderId: requestData.orderId,
          statusFilter: ["requested", "under_review", "seller_approved", "seller_rejected", "admin_approved"]
        });
        if (existingRequest) {
          return res.status(400).json({ 
            message: "An active return request already exists for this order",
            existingRequestId: existingRequest.id
          });
        }

        // Create return request with seller ID from order
        const returnRequest = await storage.createReturnRequest({
          ...requestData,
          buyerId: userId,
          sellerId: order.sellerId,
          type: "order"
        });

        // Increment return attempt counter
        await storage.incrementOrderReturnAttempts(order.id);

        res.status(201).json(returnRequest);
      } else if (requestData.bookingId) {
        const booking = await storage.getBooking(requestData.bookingId);
        if (!booking) {
          return res.status(404).json({ message: "Booking not found" });
        }
        if (booking.buyerId !== userId) {
          return res.status(403).json({ message: "Unauthorized" });
        }
        
        // Check booking status - only allow returns for completed bookings
        if (!["paid", "ongoing", "completed"].includes(booking.status)) {
          return res.status(400).json({ 
            message: `Cannot request return for booking with status: ${booking.status}`,
            currentStatus: booking.status
          });
        }

        // Check for existing active return request
        const existingRequest = await storage.findReturnRequestForSource({
          bookingId: requestData.bookingId,
          statusFilter: ["requested", "under_review", "seller_approved", "seller_rejected", "admin_approved"]
        });
        if (existingRequest) {
          return res.status(400).json({ 
            message: "An active return request already exists for this booking",
            existingRequestId: existingRequest.id
          });
        }

        // Create return request with seller ID from booking
        const returnRequest = await storage.createReturnRequest({
          ...requestData,
          buyerId: userId,
          sellerId: booking.sellerId,
          type: "booking"
        });

        res.status(201).json(returnRequest);
      } else {
        return res.status(400).json({ message: "Either orderId or bookingId is required" });
      }
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/buyer/return-requests", isAuthenticated, requireRole(["buyer"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    try {
      const returnRequests = await storage.getReturnRequests({ buyerId: userId });
      
      // Use shared enrichment utility
      const enrichedRequests = await Promise.all(
        returnRequests.map(enrichReturnRequest)
      );

      res.json(enrichedRequests);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get return request history for a specific order (buyer)
  app.get("/api/buyer/orders/:orderId/return-history", isAuthenticated, requireRole(["buyer"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    const { orderId } = req.params;

    try {
      // Verify buyer owns this order
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      if (order.buyerId !== userId) {
        return res.status(403).json({ message: "Access denied - not your order" });
      }

      // Get all return requests for this order, ordered chronologically (oldest first)
      const returnRequests = await storage.getReturnRequests({ orderId });
      const sortedRequests = returnRequests.sort((a, b) => 
        new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()
      );

      // Enrich and add attempt numbers
      const enrichedHistory = await Promise.all(
        sortedRequests.map(async (request, index) => {
          const enriched = await enrichReturnRequest(request);
          return {
            ...enriched,
            attemptNumber: index + 1,
            totalAttempts: order.returnAttemptCount || 0,
          };
        })
      );

      res.json(enrichedHistory);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get return request history for a specific booking (buyer)
  app.get("/api/buyer/bookings/:bookingId/return-history", isAuthenticated, requireRole(["buyer"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    const { bookingId } = req.params;

    try {
      // Verify buyer owns this booking
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      if (booking.buyerId !== userId) {
        return res.status(403).json({ message: "Access denied - not your booking" });
      }

      // Get all return requests for this booking, ordered chronologically (oldest first)
      const returnRequests = await storage.getReturnRequests({ bookingId });
      const sortedRequests = returnRequests.sort((a, b) => 
        new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()
      );

      // Enrich and add attempt numbers
      const enrichedHistory = await Promise.all(
        sortedRequests.map(async (request, index) => {
          const enriched = await enrichReturnRequest(request);
          return {
            ...enriched,
            attemptNumber: index + 1,
            totalAttempts: sortedRequests.length,
          };
        })
      );

      res.json(enrichedHistory);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Calculate shipping rate
  app.post("/api/buyer/calculate-shipping-rate", isAuthenticated, requireRole(["buyer"]), async (req: AuthRequest, res: Response) => {
    try {
      const { weight, dimensions, destinationCity, destinationCountryCode, numberOfPieces } = req.body;
      
      if (!weight || !destinationCity || !destinationCountryCode) {
        return res.status(400).json({ message: "Missing required fields: weight, destinationCity, destinationCountryCode" });
      }
      
      // Check if Aramex credentials are configured
      const hasAramexCredentials = !!(
        process.env.ARAMEX_USERNAME &&
        process.env.ARAMEX_PASSWORD &&
        process.env.ARAMEX_ACCOUNT_NUMBER
      );
      
      // Development fallback: return mock rate if credentials missing
      // This prevents hanging when Aramex is not configured
      if (!hasAramexCredentials) {
        console.log('[DEV MODE] Aramex credentials not found, returning mock shipping rate');
        // Realistic international shipping: $20 base fee + $5 per kg, minimum $30
        const baseFee = 20;
        const perKgRate = 5;
        const weightCost = parseFloat(weight) * perKgRate;
        const mockRate = Math.max(30, baseFee + weightCost);
        return res.json({
          shippingCost: mockRate,
          currency: 'USD',
          breakdown: [],
          dev_mode: true,
        });
      }
      
      let rateResult;
      try {
        // Wrap Aramex call with timeout to prevent hanging
        const timeoutMs = 15000; // 15 seconds
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Shipping rate calculation timeout')), timeoutMs)
        );
        
        const aramexPromise = aramex.calculateShippingRate({
          originCountryCode: 'LK', // Sri Lanka (seller location)
          originCity: 'Colombo',
          destinationCountryCode,
          destinationCity,
          weight: parseFloat(weight),
          dimensions: dimensions ? {
            length: parseFloat(dimensions.length),
            width: parseFloat(dimensions.width),
            height: parseFloat(dimensions.height),
          } : undefined,
          numberOfPieces: numberOfPieces ? parseInt(numberOfPieces, 10) : 1,
        });
        
        rateResult = await Promise.race([aramexPromise, timeoutPromise]) as any;
      } catch (aramexError: any) {
        console.error('Aramex API error:', aramexError);
        console.log('Aramex API failed, returning fallback shipping rate');
        
        // Return fallback rate to ensure checkout can proceed
        // Realistic international shipping: $20 base fee + $5 per kg, minimum $30
        const baseFee = 20;
        const perKgRate = 5;
        const weightCost = parseFloat(weight) * perKgRate;
        const fallbackRate = Math.max(30, baseFee + weightCost);
        return res.json({
          shippingCost: fallbackRate,
          currency: 'USD',
          breakdown: [],
          fallback: true,
        });
      }
      
      if (rateResult.HasErrors) {
        const errorMessages = rateResult.Notifications?.map((n: any) => n.Message).join(', ') || 'Unknown error';
        return res.status(400).json({ 
          message: `Unable to calculate shipping rate: ${errorMessages}`,
          errors: rateResult.Notifications 
        });
      }
      
      res.json({
        shippingCost: rateResult.TotalAmount?.Value || 0,
        currency: rateResult.TotalAmount?.CurrencyCode || 'USD',
        breakdown: rateResult.RateBreakdown || [],
      });
    } catch (error: any) {
      console.error('Error calculating shipping rate:', error);
      res.status(500).json({ message: "An unexpected error occurred while calculating shipping rate. Please try again or contact support." });
    }
  });

  app.post("/api/buyer/orders", isAuthenticated, requireRole(["buyer"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    const { transferSlipObjectPath, ...requestBody } = req.body;
    try {
      const checkoutData = z.object({
        shippingAddressId: z.string().uuid("Invalid shipping address ID"),
        paymentMethod: z.enum(["bank_transfer", "ipg"]),
        paymentReference: z.string().optional(),
        shippingCost: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid shipping cost"),
        totalAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount"),
        notes: z.string().optional().nullable(),
        bankAccountId: z.string().uuid("Invalid bank account ID").optional().nullable(),
        transferSlipUrl: z.string().optional().nullable(),
      }).refine(
        (data) => {
          // Require bank account when bank transfer is selected
          if (data.paymentMethod === "bank_transfer" && !data.bankAccountId) {
            return false;
          }
          return true;
        },
        {
          message: "Bank account is required for bank transfer payments",
          path: ["bankAccountId"],
        }
      ).refine(
        (data) => {
          // Require transfer slip when bank transfer is selected
          if (data.paymentMethod === "bank_transfer" && !data.transferSlipUrl) {
            return false;
          }
          return true;
        },
        {
          message: "Transfer slip is required for bank transfer payments",
          path: ["transferSlipUrl"],
        }
      ).parse(requestBody);
      
      // Get and validate shipping address
      const [shippingAddress] = await db
        .select()
        .from(shippingAddresses)
        .where(and(
          eq(shippingAddresses.id, checkoutData.shippingAddressId),
          eq(shippingAddresses.userId, userId)
        ))
        .limit(1);
      
      if (!shippingAddress) {
        return res.status(400).json({ message: "Shipping address not found" });
      }
      
      // Format address as text for storage
      const shippingAddressText = `${shippingAddress.recipientName}, ${shippingAddress.streetAddress}, ${shippingAddress.city}, ${shippingAddress.postalCode}, ${shippingAddress.country}. Phone: ${shippingAddress.contactNumber}`;
      
      // Validate bank account and transfer slip if bank transfer is selected
      let validatedBankAccountId: string | null = null;
      if (checkoutData.paymentMethod === "bank_transfer" && checkoutData.bankAccountId) {
        // SECURITY: Fetch only public/buyer-facing bank accounts for TT payments
        // getPublicBankAccounts() returns accounts where isActive=true AND isPublic=true
        // This prevents buyers from accessing internal/admin-only accounts
        const publicBankAccounts = await storage.getPublicBankAccounts();
        const selectedAccount = publicBankAccounts.find(acc => acc.id === checkoutData.bankAccountId);
        
        if (!selectedAccount) {
          return res.status(400).json({ message: "Selected bank account is not available for payments" });
        }
        
        // Use the validated account ID from the public list (don't trust client input)
        validatedBankAccountId = selectedAccount.id;
        
        // SECURITY: Validate transfer slip ownership
        if (!transferSlipObjectPath) {
          return res.status(400).json({ message: "Transfer slip object path is required for bank transfer payments" });
        }
        
        try {
          // Check if user has permission to access this object
          // Convert bucket path to /objects/ format
          // Path format: /bucket-name/.private/uploads/id → /objects/uploads/id
          let normalizedPath = transferSlipObjectPath;
          if (transferSlipObjectPath.includes("/.private/uploads/")) {
            const uploadId = transferSlipObjectPath.split("/.private/uploads/")[1];
            normalizedPath = `/objects/uploads/${uploadId}`;
          }
          
          const objectFile = await objectStorageService.getObjectEntityFile(normalizedPath);
          const hasPermission = await canAccessObject({
            objectFile,
            userId,
            requestedPermission: ObjectPermission.READ,
          });
          if (!hasPermission) {
            return res.status(403).json({ message: "Transfer slip must be uploaded by you" });
          }
        } catch (error) {
          console.error("Transfer slip validation error:", error);
          return res.status(400).json({ message: "Invalid transfer slip - please upload a valid payment receipt" });
        }
      }
      
      // Get and validate cart items
      const cartItems = await storage.getCartItems(userId);
      if (cartItems.length === 0) {
        return res.status(400).json({ message: "Cart is empty" });
      }
      
      // Validate all cart items and group by seller BEFORE creating orders
      const sellerGroups = new Map<string, Array<{ cartItem: any, variant: any, product: any, seller: any, quote: any | null, effectivePrice: string }>>();
      let grandTotal = 0;
      let totalWeight = 0;
      
      for (const cartItem of cartItems) {
        const [variant] = await db.select().from(productVariants).where(eq(productVariants.id, cartItem.productVariantId)).limit(1);
        if (!variant) {
          return res.status(400).json({ message: `Product variant not found for cart item ${cartItem.id}` });
        }
        
        const product = await storage.getProduct(variant.productId);
        if (!product) {
          return res.status(400).json({ message: `Product not found for variant ${variant.id}` });
        }

        // Check if cart item is from a quote
        let quote = null;
        let effectivePrice = variant.price;
        
        if (cartItem.quoteId) {
          const [quoteData] = await db.select().from(quotes).where(eq(quotes.id, cartItem.quoteId)).limit(1);
          if (!quoteData) {
            return res.status(400).json({ message: `Quote not found for cart item ${cartItem.id}` });
          }
          
          // SECURITY: Verify quote ownership
          if (quoteData.buyerId !== userId) {
            return res.status(403).json({ message: `Quote ${cartItem.quoteId} does not belong to you` });
          }
          
          // Verify quote status
          if (quoteData.status !== "accepted") {
            return res.status(400).json({ message: `Quote ${cartItem.quoteId} is not accepted (status: ${quoteData.status})` });
          }
          
          // Verify quote matches cart item variant
          if (quoteData.productVariantId !== cartItem.productVariantId) {
            return res.status(400).json({ message: `Quote ${cartItem.quoteId} does not match cart item variant` });
          }
          
          // Verify quote quantity matches or cart quantity is within quote quantity
          if (cartItem.quantity !== quoteData.quantity) {
            return res.status(400).json({ 
              message: `Cart quantity (${cartItem.quantity}) does not match quote quantity (${quoteData.quantity}). Please adjust your cart.` 
            });
          }
          
          // Check expiration (handle nullable expiresAt)
          if (quoteData.expiresAt && new Date() > new Date(quoteData.expiresAt)) {
            return res.status(400).json({ message: `Quote ${cartItem.quoteId} has expired` });
          }
          
          // Use quoted price instead of variant price
          quote = quoteData;
          effectivePrice = quoteData.quotedPrice;
        }

        // Validate purchase requirements for this cart item
        const validation = await storage.validatePurchaseRequirements({
          kind: "product",
          itemId: variant.productId,
          buyerId: userId,
          variantId: variant.id,
        });
        
        if (!validation.canPurchase) {
          return res.status(409).json({
            message: `Cannot checkout: ${product.name} (${variant.name}) has unmet purchase requirements`,
            productName: product.name,
            variantName: variant.name,
            validation,
          });
        }
        
        // Validate seller exists
        const sellerId = product.sellerId;
        const seller = await storage.getUser(sellerId);
        if (!seller) {
          return res.status(400).json({ message: `Seller not found: ${sellerId}` });
        }
        
        if (!sellerGroups.has(sellerId)) {
          sellerGroups.set(sellerId, []);
        }
        sellerGroups.get(sellerId)!.push({ cartItem, variant, product, seller, quote, effectivePrice });
        grandTotal += parseFloat(effectivePrice) * cartItem.quantity;
        // Track total weight using actual variant weights
        const variantWeight = variant.weight ? parseFloat(variant.weight) : 1.0;
        totalWeight += variantWeight * cartItem.quantity;
      }
      
      const shippingCostTotal = parseFloat(checkoutData.shippingCost);
      
      // All items and sellers validated, use transaction for atomic operation
      const result = await db.transaction(async (tx) => {
        // Create checkout session
        const [checkoutSession] = await tx.insert(checkoutSessions).values({
          buyerId: userId,
          paymentMethod: checkoutData.paymentMethod,
          shippingAddress: shippingAddressText,
          shippingCost: checkoutData.shippingCost,
          notes: checkoutData.notes,
          totalAmount: (grandTotal + shippingCostTotal).toFixed(2),
          status: "pending_payment",
          transferSlipObjectPath: transferSlipObjectPath || null,
        }).returning();
        
        const createdOrders = [];
        
        // Create one order per product variant (each cart item)
        for (const [sellerId, items] of Array.from(sellerGroups.entries())) {
          // Get seller from pre-validated group
          const seller = items[0].seller;
          
          // Create one order per variant
          for (const { cartItem, variant, product, quote, effectivePrice } of items) {
            const unitPrice = parseFloat(effectivePrice);
            const variantTotal = unitPrice * cartItem.quantity;
            
            // Use actual variant weight if available, otherwise default to 1kg per item
            const variantWeight = variant.weight ? parseFloat(variant.weight) : 1.0;
            const itemWeight = variantWeight * cartItem.quantity;
            
            // Shipping cost distribution:
            // - If single item: assign full shipping cost (avoids lost remainder from weight rounding)
            // - If multiple items: distribute proportionally by weight
            const itemShippingCost = cartItems.length === 1 
              ? shippingCostTotal 
              : (itemWeight / totalWeight) * shippingCostTotal;
            
            // Prepare dimensions if available
            const productDimensions = (variant.length && variant.width && variant.height) ? {
              length: parseFloat(variant.length),
              width: parseFloat(variant.width),
              height: parseFloat(variant.height),
            } : null;
            
            // Create order for this variant (using effectivePrice which is either variant.price or quote.quotedPrice)
            const newOrderResult = await tx.insert(orders).values({
              buyerId: userId,
              checkoutSessionId: checkoutSession.id,
              sellerId: sellerId,
              productId: product.id,
              variantId: variant.id,
              quoteId: quote?.id || null,
              designApprovalId: cartItem.designApprovalId || null,
              quantity: cartItem.quantity,
              unitPrice: effectivePrice, // Already a string from database or validation
              status: "pending_payment",
              totalAmount: variantTotal.toFixed(2),
              shippingCost: itemShippingCost.toFixed(2),
              productWeight: itemWeight.toFixed(3),
              productDimensions: productDimensions,
              shippingAddress: shippingAddressText,
              shippingAddressId: checkoutData.shippingAddressId,
              notes: checkoutData.notes,
              paymentMethod: checkoutData.paymentMethod,
              paymentReference: checkoutData.paymentReference,
            }).returning();
            const newOrder = (newOrderResult as any)[0];
            
            // Calculate commission for this variant order
            const commissionRate = parseFloat(seller.commissionRate);
            const commissionAmount = variantTotal * (commissionRate / 100);
            const sellerPayout = variantTotal - commissionAmount;
            
            // Create transaction with pending status (waiting for payment)
            await tx.insert(transactions).values({
              type: "order",
              orderId: newOrder.id,
              bookingId: null,
              buyerId: userId,
              sellerId: sellerId,
              amount: variantTotal.toFixed(2),
              commissionRate: commissionRate.toFixed(2),
              commissionAmount: commissionAmount.toFixed(2),
              sellerPayout: sellerPayout.toFixed(2),
              status: "pending",
              releasedAt: null,
              bankAccountId: validatedBankAccountId, // Use validated ID, not client input
              paymentSlipUrl: checkoutData.transferSlipUrl || null, // Transfer slip for bank transfer verification
            });
            
            createdOrders.push({
              ...newOrder,
              totalAmount: variantTotal.toFixed(2),
              seller: {
                id: seller.id,
                firstName: seller.firstName,
                lastName: seller.lastName,
              },
              product,
              variant,
            });
          }
        }
        
        return { checkoutSession, orders: createdOrders };
      });
      
      // Clear the cart only after everything succeeds
      await storage.clearCart(userId);
      
      // If IPG payment, return redirect URL to payment gateway
      if (checkoutData.paymentMethod === "ipg") {
        const ipgUrl = new URL(`${req.protocol}://${req.get('host')}/mock-ipg`);
        ipgUrl.searchParams.set("transactionRef", result.checkoutSession.id);
        ipgUrl.searchParams.set("amount", result.checkoutSession.totalAmount);
        ipgUrl.searchParams.set("merchantId", "VAANEY_MERCHANT");
        ipgUrl.searchParams.set("transactionType", "checkout");
        ipgUrl.searchParams.set("returnUrl", `${req.protocol}://${req.get('host')}/orders`);
        
        return res.json({ 
          checkoutSession: result.checkoutSession,
          orders: result.orders,
          redirectUrl: ipgUrl.toString(),
          paymentMethod: "ipg" 
        });
      }
      
      res.json({ checkoutSession: result.checkoutSession, orders: result.orders });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Buyer submits payment notification (bypass payment gateway)
  app.post("/api/buyer/bookings/:id/submit-payment", isAuthenticated, requireRole(["buyer"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    
    try {
      const booking = await db.query.bookings.findFirst({
        where: and(
          eq(bookings.id, req.params.id),
          eq(bookings.buyerId, userId)
        ),
      });

      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (booking.status !== "pending_payment") {
        return res.status(400).json({ message: "Booking is not awaiting payment" });
      }

      // Just acknowledge - admin will confirm through transactions page
      return res.json({ 
        message: "Payment notification received. Admin will confirm your payment shortly.",
        booking 
      });
    } catch (error: any) {
      console.error("Submit payment error:", error);
      return res.status(500).json({ message: "Failed to submit payment notification" });
    }
  });

  app.post("/api/buyer/bookings", isAuthenticated, requireRole(["buyer"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    const { sellerId, bankAccountId, transferSlipUrl, transferSlipObjectPath, ...bookingData } = req.body;
    try {
      const parsedData = insertBookingSchema.extend({
        paymentMethod: z.enum(["bank_transfer", "ipg"]).optional(),
        paymentReference: z.string().optional(),
      }).parse(bookingData);
      
      // Validate bank transfer requirements
      if (parsedData.paymentMethod === "bank_transfer") {
        if (!bankAccountId) {
          return res.status(400).json({ message: "Bank account is required for bank transfer payments" });
        }
        if (!transferSlipUrl) {
          return res.status(400).json({ message: "Payment transfer slip is required for bank transfer payments" });
        }
        
        // Validate bank account exists, is active, and is public
        const [bankAccount] = await db.select().from(bankAccounts).where(eq(bankAccounts.id, bankAccountId)).limit(1);
        if (!bankAccount) {
          return res.status(400).json({ message: "Invalid bank account selected" });
        }
        if (!bankAccount.isActive) {
          return res.status(400).json({ message: "Selected bank account is not currently active" });
        }
        if (!bankAccount.isPublic) {
          return res.status(400).json({ message: "Selected bank account is not available for public use" });
        }
        
        // Validate transfer slip was uploaded by this user
        if (!transferSlipObjectPath) {
          return res.status(400).json({ message: "Transfer slip object path is required" });
        }
        
        try {
          // Check if user has permission to access this object
          // Convert bucket path to /objects/ format
          // Path format: /bucket-name/.private/uploads/id → /objects/uploads/id
          let normalizedPath = transferSlipObjectPath;
          if (transferSlipObjectPath.includes("/.private/uploads/")) {
            const uploadId = transferSlipObjectPath.split("/.private/uploads/")[1];
            normalizedPath = `/objects/uploads/${uploadId}`;
          }
          
          const objectFile = await objectStorageService.getObjectEntityFile(normalizedPath);
          const hasPermission = await canAccessObject({
            objectFile,
            userId,
            requestedPermission: ObjectPermission.READ,
          });
          if (!hasPermission) {
            return res.status(403).json({ message: "Transfer slip must be uploaded by you" });
          }
        } catch (error) {
          console.error("Transfer slip validation error:", error);
          return res.status(400).json({ message: "Invalid transfer slip - please upload a valid payment receipt" });
        }
      }
      
      // Validate service package exists BEFORE creating booking
      const [servicePackage] = await db.select().from(servicePackages).where(eq(servicePackages.id, parsedData.packageId)).limit(1);
      if (!servicePackage) {
        return res.status(400).json({ message: "Service package not found" });
      }
      
      // Validate seller exists
      const seller = await storage.getUser(sellerId);
      if (!seller) {
        return res.status(400).json({ message: "Seller not found" });
      }
      
      // All validated, use transaction for atomic operation
      const booking = await db.transaction(async (tx) => {
        // Create booking
        const [newBooking] = await tx.insert(bookings).values({
          serviceId: parsedData.serviceId,
          packageId: parsedData.packageId,
          scheduledDate: parsedData.scheduledDate,
          scheduledTime: parsedData.scheduledTime,
          amount: parsedData.amount,
          notes: parsedData.notes,
          paymentMethod: parsedData.paymentMethod,
          paymentReference: parsedData.paymentReference,
          paymentLink: parsedData.paymentLink,
          buyerId: userId,
          sellerId,
          transferSlipObjectPath: parsedData.paymentMethod === "bank_transfer" ? transferSlipObjectPath : null,
        }).returning();
        
        // Calculate commission and create transaction
        const amount = parseFloat(servicePackage.price);
        const commissionRate = parseFloat(seller.commissionRate || "0");
        const commissionAmount = amount * (commissionRate / 100);
        const sellerPayout = amount - commissionAmount;
        
        // Create transaction with pending status (waiting for payment)
        await tx.insert(transactions).values({
          type: "booking",
          orderId: null,
          bookingId: newBooking.id,
          buyerId: userId,
          sellerId: sellerId,
          amount: amount.toFixed(2),
          commissionRate: commissionRate.toFixed(2),
          commissionAmount: commissionAmount.toFixed(2),
          sellerPayout: sellerPayout.toFixed(2),
          status: "pending",
          bankAccountId: parsedData.paymentMethod === "bank_transfer" ? bankAccountId : null,
          paymentSlipUrl: parsedData.paymentMethod === "bank_transfer" ? transferSlipUrl : null,
          releasedAt: null,
        });
        
        return newBooking;
      });
      
      // If IPG payment, return redirect URL to payment gateway
      if (parsedData.paymentMethod === "ipg") {
        const amount = parseFloat(servicePackage.price);
        
        const ipgUrl = new URL(`${req.protocol}://${req.get('host')}/mock-ipg`);
        ipgUrl.searchParams.set("transactionRef", booking.id);
        ipgUrl.searchParams.set("amount", amount.toFixed(2));
        ipgUrl.searchParams.set("merchantId", "VAANEY_MERCHANT");
        ipgUrl.searchParams.set("transactionType", "booking");
        ipgUrl.searchParams.set("returnUrl", `${req.protocol}://${req.get('host')}/bookings`);
        
        return res.json({ 
          booking, 
          redirectUrl: ipgUrl.toString(),
          paymentMethod: "ipg" 
        });
      }
      
      res.json(booking);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Cart Routes
  app.get("/api/cart", isAuthenticated, requireRole(["buyer"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    try {
      // storage.getCartItems now returns enriched cart items with variant, product, quote, and effectiveUnitPrice
      const enrichedItems = await storage.getCartItems(userId);
      res.json(enrichedItems);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/cart", isAuthenticated, requireRole(["buyer"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    try {
      const { productVariantId, quantity, designApprovalId, quoteId } = req.body;
      
      // Get product variant and product to check requirements
      const [variant] = await db.select().from(productVariants)
        .where(eq(productVariants.id, productVariantId))
        .limit(1);
      
      if (!variant) {
        return res.status(404).json({ message: "Product variant not found" });
      }
      
      const product = await storage.getProduct(variant.productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      // If quoteId is provided, validate the quote
      if (quoteId) {
        const [quote] = await db.select().from(quotes)
          .where(eq(quotes.id, quoteId))
          .limit(1);
        
        if (!quote) {
          return res.status(404).json({ message: "Quote not found" });
        }
        
        if (quote.buyerId !== userId) {
          return res.status(403).json({ message: "Quote does not belong to you" });
        }
        
        if (quote.status !== "accepted") {
          return res.status(400).json({ 
            message: `Quote is not accepted (status: ${quote.status}). Please accept the quote first.` 
          });
        }
        
        if (quote.productVariantId !== productVariantId) {
          return res.status(400).json({ message: "Quote does not match the selected product variant" });
        }
        
        // If quote has a designApprovalId, use it (override any passed designApprovalId)
        if (quote.designApprovalId) {
          req.body.designApprovalId = quote.designApprovalId;
        }
      }
      
      // Enforce design approval requirement upfront (unless quote already has one)
      if (product.requiresDesignApproval && !req.body.designApprovalId && !quoteId) {
        return res.status(400).json({
          message: "This product requires design approval before adding to cart. Please upload your design and get it approved first.",
          requiresDesignApproval: true,
          productId: product.id,
        });
      }
      
      // If designApprovalId provided, validate it belongs to buyer and is approved
      if (designApprovalId) {
        const [approval] = await db.select().from(designApprovals)
          .where(eq(designApprovals.id, designApprovalId))
          .limit(1);
        
        if (!approval) {
          return res.status(404).json({ message: "Design approval not found" });
        }
        
        if (approval.buyerId !== userId) {
          return res.status(403).json({ message: "Design approval does not belong to you" });
        }
        
        if (approval.status !== "approved") {
          return res.status(400).json({ message: `Design approval is not approved (status: ${approval.status})` });
        }
        
        // Verify design approval matches the variant
        // Fallback: If approval has null variantId and product has exactly 1 variant, accept it
        if (approval.variantId !== productVariantId) {
          // Check if this is a legacy approval with null variantId
          if (approval.variantId === null) {
            const allVariants = await db.select().from(productVariants)
              .where(eq(productVariants.productId, product.id));
            
            if (allVariants.length === 1 && allVariants[0].id === productVariantId) {
              console.info('Auto-accepting null variantId for single-variant product:', {
                approvalId: approval.id,
                productId: product.id,
                acceptedVariantId: productVariantId,
              });
              // Accept this as valid - continue to next validation
            } else {
              return res.status(400).json({ 
                message: "Design approval does not match the product variant (null variantId with multiple variants)" 
              });
            }
          } else {
            return res.status(400).json({ message: "Design approval does not match the product variant" });
          }
        }
      }
      
      // Validate other purchase requirements (quotes, etc.)
      const validation = await storage.validatePurchaseRequirements({
        kind: "product",
        itemId: variant.productId,
        buyerId: userId,
        variantId: productVariantId,
      });
      
      if (!validation.canPurchase) {
        return res.status(409).json({
          message: "Purchase requirements not met",
          validation,
        });
      }
      
      const cartItem = await storage.addToCart(userId, { 
        productVariantId, 
        quantity: quantity || 1, 
        designApprovalId: req.body.designApprovalId || undefined,
        quoteId: quoteId || undefined,
      });
      res.json(cartItem);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/cart/:id", isAuthenticated, requireRole(["buyer"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    try {
      const { quantity } = req.body;
      const cartItem = await storage.updateCartItem(req.params.id, userId, quantity);
      res.json(cartItem);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/cart/:id", isAuthenticated, requireRole(["buyer"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    try {
      await storage.removeFromCart(req.params.id, userId);
      res.json({ message: "Item removed from cart" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/cart", isAuthenticated, requireRole(["buyer"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    try {
      await storage.clearCart(userId);
      res.json({ message: "Cart cleared" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Seller Routes
  app.get("/api/seller/transactions", isAuthenticated, requireRole(["seller"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    try {
      const transactions = await storage.getTransactions(userId);
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/seller/dashboard-stats", isAuthenticated, requireRole(["seller"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    try {
      const products = await storage.getProducts(userId);
      const services = await storage.getServices(userId);
      const orders = await storage.getOrders(undefined, userId);
      const bookings = await storage.getBookings(undefined, userId);
      
      // Get seller's commission rate
      const seller = await storage.getUser(userId);
      const commissionRate = seller?.commissionRate || "20.00";
      
      const pendingOrders = orders.filter(o => ["pending_payment", "paid"].includes(o.status)).length;
      const pendingBookings = bookings.filter(b => ["pending_payment", "paid", "scheduled"].includes(b.status)).length;
      
      // Calculate revenue from transactions
      const sellerTransactions = await db.select()
        .from(transactions)
        .where(eq(transactions.sellerId, userId));
      
      // Total revenue: sum sellerPayout for all released transactions (commission already deducted)
      const totalRevenue = sellerTransactions
        .filter(tx => tx.status === "released")
        .reduce((sum, tx) => sum + parseFloat(tx.sellerPayout), 0);
      
      // Pending payout: sum sellerPayout for all escrow transactions (commission already deducted)
      const pendingPayout = sellerTransactions
        .filter(tx => tx.status === "escrow")
        .reduce((sum, tx) => sum + parseFloat(tx.sellerPayout), 0);
      
      const stats = {
        totalProducts: products.length,
        totalServices: services.length,
        pendingOrders,
        pendingBookings,
        totalRevenue: totalRevenue.toFixed(2),
        pendingPayout: pendingPayout.toFixed(2),
        commissionRate,
      };
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/seller/products", isAuthenticated, requireRole(["seller"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    try {
      const products = await storage.getProducts(userId);
      // Fetch variants for each product
      const productsWithVariants = await Promise.all(
        products.map(async (product) => {
          const variants = await storage.getProductVariants(product.id);
          return { ...product, variants };
        })
      );
      res.json(productsWithVariants);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/seller/products", isAuthenticated, requireRole(["seller"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    try {
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct({ ...productData, sellerId: userId });
      
      // Extract and parse optional shipping dimensions for default variant
      const { weight, length, width, height } = req.body;
      
      // Parse and validate dimension values, converting to numbers or null
      const parsedWeight = weight ? parseFloat(weight) : null;
      const parsedLength = length ? parseFloat(length) : null;
      const parsedWidth = width ? parseFloat(width) : null;
      const parsedHeight = height ? parseFloat(height) : null;
      
      // Auto-create a default variant so the product is immediately purchasable
      // Sellers can add more variants later if they want size/color options
      await db.insert(productVariants).values({
        productId: product.id,
        name: "Default",
        price: product.price || "0",
        inventory: product.stock || 0,
        attributes: {},
        weight: parsedWeight && !isNaN(parsedWeight) ? parsedWeight.toString() : undefined,
        length: parsedLength && !isNaN(parsedLength) ? parsedLength.toString() : undefined,
        width: parsedWidth && !isNaN(parsedWidth) ? parsedWidth.toString() : undefined,
        height: parsedHeight && !isNaN(parsedHeight) ? parsedHeight.toString() : undefined,
      });
      
      res.json(product);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/seller/products/:id", isAuthenticated, requireRole(["seller"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    try {
      // Allow partial updates - use partial schema for flexibility
      const productData = insertProductSchema.partial().parse(req.body);
      
      // Ensure at least one field is present for update
      if (Object.keys(productData).length === 0) {
        return res.status(400).json({ message: "At least one field must be provided for update" });
      }
      
      const product = await storage.updateProduct(req.params.id, userId, productData);
      res.json(product);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/seller/products/:id", isAuthenticated, requireRole(["seller"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    try {
      await storage.deleteProduct(req.params.id, userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/seller/product-variants", isAuthenticated, requireRole(["seller"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    try {
      const variantData = insertProductVariantSchema.parse(req.body);
      
      // Verify seller owns the product
      const product = await storage.getProduct(variantData.productId);
      if (!product || product.sellerId !== userId) {
        return res.status(403).json({ message: "You can only add variants to your own products" });
      }
      
      const variant = await storage.createProductVariant(variantData);
      res.json(variant);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/seller/products/:id/variants", isAuthenticated, requireRole(["seller"]), async (req: AuthRequest, res: Response) => {
    try {
      const variantData = insertProductVariantSchema.parse({ ...req.body, productId: req.params.id });
      const variant = await storage.createProductVariant(variantData);
      res.json(variant);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/seller/product-variants/:id", isAuthenticated, requireRole(["seller"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    try {
      const variantData = insertProductVariantSchema.partial().parse(req.body);
      
      // Security: Prevent reassignment to different products
      const { productId, ...allowedUpdates } = variantData;
      
      // Ensure at least one field is present for update
      if (Object.keys(allowedUpdates).length === 0) {
        return res.status(400).json({ message: "At least one field must be provided for update" });
      }
      
      const variant = await storage.updateProductVariant(req.params.id, userId, allowedUpdates);
      res.json(variant);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/seller/product-variants/:id", isAuthenticated, requireRole(["seller"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    try {
      await storage.deleteProductVariant(req.params.id, userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/seller/services", isAuthenticated, requireRole(["seller"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    try {
      const services = await storage.getServices(userId);
      res.json(services);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/seller/services", isAuthenticated, requireRole(["seller"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    try {
      const serviceData = insertServiceSchema.parse(req.body);
      const service = await storage.createService({ ...serviceData, sellerId: userId });
      res.json(service);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/seller/services/:id", isAuthenticated, requireRole(["seller"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    try {
      const service = await storage.getService(req.params.id);
      if (!service || service.sellerId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      const serviceData = insertServiceSchema.partial().parse(req.body);
      
      // Ensure at least one field is present for update
      if (Object.keys(serviceData).length === 0) {
        return res.status(400).json({ message: "At least one field must be provided for update" });
      }
      
      const updatedService = await storage.updateService(req.params.id, userId, serviceData);
      res.json(updatedService);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/seller/services/:id", isAuthenticated, requireRole(["seller"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    try {
      const service = await storage.getService(req.params.id);
      if (!service || service.sellerId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      await storage.deleteService(req.params.id, userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/seller/services/:id/packages", isAuthenticated, requireRole(["seller"]), async (req: AuthRequest, res: Response) => {
    try {
      const packageData = insertServicePackageSchema.parse({ ...req.body, serviceId: req.params.id });
      const pkg = await storage.createServicePackage(packageData);
      res.json(pkg);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/seller/service-packages", isAuthenticated, requireRole(["seller"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    try {
      const packageData = insertServicePackageSchema.parse(req.body);
      const service = await storage.getService(packageData.serviceId);
      if (!service || service.sellerId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      const pkg = await storage.createServicePackage(packageData);
      res.json(pkg);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/seller/service-packages/:id", isAuthenticated, requireRole(["seller"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    try {
      const pkg = await storage.getServicePackage(req.params.id);
      if (!pkg) {
        return res.status(404).json({ message: "Package not found" });
      }
      const service = await storage.getService(pkg.serviceId);
      if (!service || service.sellerId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      const packageData = insertServicePackageSchema.partial().parse(req.body);
      const updatedPkg = await storage.updateServicePackage(req.params.id, packageData);
      res.json(updatedPkg);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/seller/service-packages/:id", isAuthenticated, requireRole(["seller"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    try {
      const pkg = await storage.getServicePackage(req.params.id);
      if (!pkg) {
        return res.status(404).json({ message: "Package not found" });
      }
      const service = await storage.getService(pkg.serviceId);
      if (!service || service.sellerId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      await storage.deleteServicePackage(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/seller/orders", isAuthenticated, requireRole(["seller"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    try {
      const orders = await storage.getOrders(undefined, userId);
      
      // Enrich orders with product, variant, and design approval details
      const enrichedOrders = await Promise.all(
        orders.map(async (order) => {
          const [product] = await db.select().from(products).where(eq(products.id, order.productId));
          const [variant] = await db.select().from(productVariants).where(eq(productVariants.id, order.variantId));
          
          // Get design approval if order has designApprovalId
          let designApproval = null;
          if (order.designApprovalId) {
            designApproval = await storage.getDesignApproval(order.designApprovalId);
          }
          
          return {
            ...order,
            product,
            variant,
            designApproval: designApproval || null,
          };
        })
      );
      
      res.json(enrichedOrders);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/seller/orders/:id/status", isAuthenticated, requireRole(["seller"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Check if seller owns this order
      if (order.sellerId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const { status } = req.body;
      
      const validStatuses = ["pending_payment", "paid", "processing", "shipped", "delivered", "cancelled"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      
      const allowedTransitions: Record<string, string[]> = {
        pending_payment: ["cancelled"], // Only admin can confirm payment
        paid: ["processing", "cancelled"],
        processing: ["cancelled"], // Seller cannot mark as shipped - admin does this via consolidation
        shipped: ["delivered"],
        delivered: [],
        cancelled: [],
      };
      
      const currentStatus = order.status;
      if (!allowedTransitions[currentStatus]?.includes(status)) {
        return res.status(400).json({ 
          message: `Cannot transition from ${currentStatus} to ${status}`,
          allowedTransitions: allowedTransitions[currentStatus] || []
        });
      }
      
      const updatedOrder = await storage.updateOrderStatus(req.params.id, status);
      res.json(updatedOrder);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/seller/orders/:id/ready-to-ship", isAuthenticated, requireRole(["seller"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Check if seller owns this order
      if (order.sellerId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // If already marked as ready to ship, return the order without error (idempotent)
      if (order.readyToShip) {
        return res.json(order);
      }
      
      // Only processing orders can be marked as ready to ship
      // Sellers must first move order from "paid" to "processing" before marking ready
      if (order.status !== "processing") {
        return res.status(400).json({ message: "Order must be in 'processing' status before marking as ready to ship. Please start processing this order first." });
      }
      
      // Update the order to mark as ready to ship
      const [updatedOrder] = await db
        .update(orders)
        .set({ readyToShip: true })
        .where(eq(orders.id, req.params.id))
        .returning();
      
      res.json(updatedOrder);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/seller/bookings", isAuthenticated, requireRole(["seller"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    try {
      const bookings = await storage.getBookings(undefined, userId);
      res.json(bookings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/seller/bookings/:id/status", isAuthenticated, requireRole(["seller"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      if (booking.sellerId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const { status } = req.body;
      
      const validStatuses = ["pending_confirmation", "confirmed", "pending_payment", "paid", "ongoing", "completed", "cancelled"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      
      const allowedTransitions: Record<string, string[]> = {
        pending_confirmation: ["confirmed", "cancelled"], // Seller confirms or cancels booking request
        confirmed: ["pending_payment", "cancelled"], // After seller confirms, booking moves to pending payment (payment link sent)
        pending_payment: ["cancelled"], // Only admin can confirm payment
        paid: ["ongoing", "cancelled"], // Seller starts service
        ongoing: ["completed", "cancelled"], // Seller completes service
        completed: [],
        cancelled: [],
      };
      
      // Auto-transition to pending_payment when seller confirms (payment link generation placeholder)
      if (status === "confirmed" && booking.status === "pending_confirmation") {
        // Generate placeholder payment link (in future: integrate with local bank IPG)
        const paymentLink = `https://payment-gateway.example.mv/pay/${booking.id}?amount=${booking.amount}`;
        
        await db.update(bookings)
          .set({ 
            status: "pending_payment", 
            paymentLink: paymentLink,
            updatedAt: new Date() 
          })
          .where(eq(bookings.id, req.params.id));
        
        return res.json({ 
          message: "Booking confirmed. Payment link sent to buyer.", 
          paymentLink 
        });
      }
      
      const currentStatus = booking.status;
      if (!allowedTransitions[currentStatus]?.includes(status)) {
        return res.status(400).json({ 
          message: `Cannot transition from ${currentStatus} to ${status}`,
          allowedTransitions: allowedTransitions[currentStatus] || []
        });
      }
      
      const updatedBooking = await storage.updateBookingStatus(req.params.id, status);
      
      // Trigger notification when booking is completed
      if (status === "completed") {
        try {
          // Fetch deliverables for this booking
          const deliverables = await storage.getBookingDeliverables(booking.id);
          
          // Get service name
          const service = await storage.getService(booking.serviceId);
          
          // Send notification with deliverables
          await notifyBookingCompleted({
            buyerId: booking.buyerId,
            bookingId: booking.id,
            serviceName: service?.name || "Service",
            deliverables: deliverables.map(d => ({
              id: d.id,
              fileName: d.fileName,
              fileUrl: d.fileUrl,
              fileSize: d.fileSize ?? 0,
              mimeType: d.mimeType ?? 'application/octet-stream'
            }))
          });
        } catch (notifyError: any) {
          // Log error but don't fail the booking status update
          console.error("Failed to send booking completion notification:", notifyError);
        }
      }
      
      res.json(updatedBooking);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // ====================================
  // BOOKING DELIVERABLES ROUTES
  // ====================================

  // Configure multer for deliverable uploads (memory storage)
  const deliverableUpload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
  });

  // Upload a deliverable file for a booking (seller only)
  app.post("/api/bookings/:bookingId/deliverables", isAuthenticated, requireRole(["seller"]), deliverableUpload.single("file"), async (req: AuthRequest, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      const { bookingId } = req.params;

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Verify seller owns this booking
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      if (booking.sellerId !== userId) {
        return res.status(403).json({ message: "Access denied - not your booking" });
      }

      // Get private object directory
      const privateObjectDir = objectStorageService.getPrivateObjectDir();
      
      // Create file path
      const fileName = `booking-deliverables/${bookingId}/${Date.now()}-${req.file.originalname}`;
      const fullPath = `${privateObjectDir}/${fileName}`;
      
      // Parse path to get bucket and object name
      const { parseObjectPath } = await import("./objectStorage");
      const { bucketName, objectName } = parseObjectPath(fullPath);
      
      // Upload file to storage
      const { objectStorageClient } = await import("./objectStorage");
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      
      await file.save(req.file.buffer, {
        contentType: req.file.mimetype,
        metadata: {
          metadata: {
            uploadedBy: userId,
            bookingId: bookingId,
          },
        },
      });

      // Create deliverable record in database
      const deliverable = await storage.createBookingDeliverable({
        bookingId,
        fileName: req.file.originalname,
        fileUrl: fullPath,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      });

      res.json(deliverable);
    } catch (error: any) {
      console.error("[DELIVERABLE] Error uploading deliverable:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get all deliverables for a booking (buyer or seller)
  app.get("/api/bookings/:bookingId/deliverables", isAuthenticated, async (req: AuthRequest, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      const { bookingId } = req.params;

      // Verify user is buyer or seller for this booking
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      if (booking.buyerId !== userId && booking.sellerId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const deliverables = await storage.getBookingDeliverables(bookingId);
      res.json(deliverables);
    } catch (error: any) {
      console.error("[DELIVERABLE] Error fetching deliverables:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Download object storage file (authenticated users only)
  app.get("/api/download-object", isAuthenticated, async (req: AuthRequest, res: Response) => {
    try {
      const { path } = req.query;
      
      if (!path || typeof path !== "string") {
        return res.status(400).json({ message: "File path is required" });
      }

      // Parse path to get bucket and object name
      const { parseObjectPath } = await import("./objectStorage");
      const { bucketName, objectName } = parseObjectPath(path);
      
      // Download file from storage
      const { objectStorageClient } = await import("./objectStorage");
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      
      // Check if file exists
      const [exists] = await file.exists();
      if (!exists) {
        return res.status(404).json({ message: "File not found" });
      }

      // Get file metadata
      const [metadata] = await file.getMetadata();
      
      // Set appropriate headers
      res.setHeader("Content-Type", metadata.contentType || "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(objectName.split('/').pop() || 'download')}"`);
      
      // Stream file to response
      file.createReadStream().pipe(res);
    } catch (error: any) {
      console.error("[DOWNLOAD] Error downloading file:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Delete a deliverable (seller only)
  app.delete("/api/bookings/:bookingId/deliverables/:deliverableId", isAuthenticated, requireRole(["seller"]), async (req: AuthRequest, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      const { bookingId, deliverableId } = req.params;

      // Verify seller owns this booking
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      if (booking.sellerId !== userId) {
        return res.status(403).json({ message: "Access denied - not your booking" });
      }

      // Get deliverable to find file URL before deleting
      const deliverables = await storage.getBookingDeliverables(bookingId);
      const deliverable = deliverables.find(d => d.id === deliverableId);
      
      if (!deliverable) {
        return res.status(404).json({ message: "Deliverable not found" });
      }

      // Delete file from object storage
      const { parseObjectPath } = await import("./objectStorage");
      const { bucketName, objectName } = parseObjectPath(deliverable.fileUrl);
      const { objectStorageClient } = await import("./objectStorage");
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      
      try {
        await file.delete();
      } catch (storageError) {
        console.warn("[DELIVERABLE] Error deleting file from storage:", storageError);
        // Continue with database deletion even if file deletion fails
      }

      // Delete from database
      await storage.deleteBookingDeliverable(deliverableId, bookingId);

      res.json({ message: "Deliverable deleted successfully" });
    } catch (error: any) {
      console.error("[DELIVERABLE] Error deleting deliverable:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Seller Return Requests
  app.get("/api/seller/return-requests", isAuthenticated, requireRole(["seller"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    try {
      const returnRequests = await storage.getReturnRequests({ sellerId: userId });
      
      // Use shared enrichment utility
      const enrichedRequests = await Promise.all(
        returnRequests.map(enrichReturnRequest)
      );

      res.json(enrichedRequests);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get return request history for a specific order (seller)
  app.get("/api/seller/orders/:orderId/return-history", isAuthenticated, requireRole(["seller"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    const { orderId } = req.params;

    try {
      // Verify seller fulfills this order
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      if (order.sellerId !== userId) {
        return res.status(403).json({ message: "Access denied - not your order" });
      }

      // Get all return requests for this order, ordered chronologically (oldest first)
      const returnRequests = await storage.getReturnRequests({ orderId });
      const sortedRequests = returnRequests.sort((a, b) => 
        new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()
      );

      // Enrich and add attempt numbers
      const enrichedHistory = await Promise.all(
        sortedRequests.map(async (request, index) => {
          const enriched = await enrichReturnRequest(request);
          return {
            ...enriched,
            attemptNumber: index + 1,
            totalAttempts: order.returnAttemptCount || 0,
          };
        })
      );

      res.json(enrichedHistory);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get return request history for a specific booking (seller)
  app.get("/api/seller/bookings/:bookingId/return-history", isAuthenticated, requireRole(["seller"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    const { bookingId } = req.params;

    try {
      // Verify seller fulfills this booking
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      if (booking.sellerId !== userId) {
        return res.status(403).json({ message: "Access denied - not your booking" });
      }

      // Get all return requests for this booking, ordered chronologically (oldest first)
      const returnRequests = await storage.getReturnRequests({ bookingId });
      const sortedRequests = returnRequests.sort((a, b) => 
        new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()
      );

      // Enrich and add attempt numbers
      const enrichedHistory = await Promise.all(
        sortedRequests.map(async (request, index) => {
          const enriched = await enrichReturnRequest(request);
          return {
            ...enriched,
            attemptNumber: index + 1,
            totalAttempts: sortedRequests.length,
          };
        })
      );

      res.json(enrichedHistory);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/seller/return-requests/:id/respond", isAuthenticated, requireRole(["seller"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    try {
      const responseSchema = z.object({
        sellerStatus: z.enum(["approved", "rejected"]),
        sellerResponse: z.string().min(10, "Please provide a response explaining your decision").max(1000),
        sellerProposedRefundAmount: z.number().positive().optional(),
      });

      const responseData = responseSchema.parse(req.body);

      // Get and validate return request
      const returnRequest = await storage.getReturnRequest(req.params.id);
      if (!returnRequest) {
        return res.status(404).json({ message: "Return request not found" });
      }

      // Verify seller owns this return request
      if (returnRequest.sellerId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Can only respond to requested or under_review status
      if (!["requested", "under_review"].includes(returnRequest.status)) {
        return res.status(400).json({ 
          message: `Cannot respond to return request with status: ${returnRequest.status}`,
          currentStatus: returnRequest.status
        });
      }

      // Move to under_review if currently requested
      if (returnRequest.status === "requested") {
        await storage.markReturnRequestUnderReview(req.params.id);
      }

      // Update seller response
      const updatedRequest = await storage.updateSellerResponse(req.params.id, responseData);

      res.json({
        message: "Response recorded successfully",
        returnRequest: updatedRequest
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Aramex Shipping Routes
  // Create shipment for an order
  app.post("/api/seller/orders/:orderId/shipment", isAuthenticated, requireRole(["seller"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    try {
      const order = await storage.getOrder(req.params.orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      if (order.sellerId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      if (order.status !== "paid" && order.status !== "processing") {
        return res.status(400).json({ message: "Order must be paid before creating shipment" });
      }
      
      // Get seller details
      const seller = await storage.getUser(userId);
      if (!seller) {
        return res.status(404).json({ message: "Seller not found" });
      }
      
      // Get product and variant details
      const product = await storage.getProduct(order.productId);
      const [variant] = await db.select().from(productVariants).where(eq(productVariants.id, order.variantId));
      
      if (!product || !variant) {
        return res.status(404).json({ message: "Product or variant not found" });
      }
      
      // Get buyer details
      const buyer = await storage.getUser(order.buyerId);
      if (!buyer) {
        return res.status(404).json({ message: "Buyer not found" });
      }
      
      // Parse shipment details from request
      const {
        shipperAddress,
        shipperCity,
        shipperCountry = "LK", // Sri Lanka default for sellers
        consigneePhone,
        weight,
        numberOfPieces = 1,
        productType = "EXP", // Express default
        descriptionOfGoods,
      } = req.body;
      
      // Create shipment via Aramex API
      const shipmentData = {
        Reference1: order.id,
        Reference2: product.name,
        ForeignHAWB: `VNY-${order.id.substring(0, 8)}`,
        Details: {
          ActualWeight: {
            Unit: 'KG' as const,
            Value: parseFloat(weight || '1'),
          },
          NumberOfPieces: parseInt(numberOfPieces),
          ProductGroup: productType,
          ProductType: productType,
          PaymentType: 'P', // Prepaid
          DescriptionOfGoods: descriptionOfGoods || `${product.name} - ${variant.name}`,
          Items: [
            {
              PackageType: 'Box',
              Quantity: order.quantity,
              Weight: {
                Unit: 'KG' as const,
                Value: parseFloat(weight || '1'),
              },
              Comments: `Order ${order.id}`,
            },
          ],
        },
        Shipper: {
          Reference1: seller.id,
          PartyAddress: aramex.formatAddress(
            shipperAddress || `${shipperCity}, ${shipperCountry}`,
            shipperCountry
          ),
          Contact: {
            PersonName: `${seller.firstName} ${seller.lastName}`,
            CompanyName: seller.firstName || 'Seller',
            PhoneNumber1: consigneePhone || '+94771234567',
            EmailAddress: seller.email,
          },
        },
        Consignee: {
          Reference1: buyer.id,
          PartyAddress: aramex.formatAddress(order.shippingAddress, 'MV'),
          Contact: {
            PersonName: `${buyer.firstName} ${buyer.lastName}`,
            CompanyName: buyer.firstName || 'Customer',
            PhoneNumber1: consigneePhone || '+9607123456',
            EmailAddress: buyer.email,
          },
        },
      };
      
      const aramexResponse = await aramex.createShipment(shipmentData, true);
      
      if (aramexResponse.HasErrors) {
        const errorMsg = aramexResponse.Notifications?.[0]?.Message || 'Failed to create shipment';
        return res.status(400).json({ message: errorMsg, notifications: aramexResponse.Notifications });
      }
      
      const processedShipment = aramexResponse.Shipments?.[0];
      if (!processedShipment) {
        return res.status(500).json({ message: 'No shipment data returned from Aramex' });
      }
      
      // Save shipment to database
      const [savedShipment] = await db.insert(aramexShipments).values({
        orderId: order.id,
        sellerId: userId,
        awbNumber: processedShipment.ID,
        foreignHawb: shipmentData.ForeignHAWB,
        status: 'created',
        productType: productType,
        shipperDetails: {
          name: shipmentData.Shipper.Contact.PersonName,
          company: shipmentData.Shipper.Contact.CompanyName,
          phone: shipmentData.Shipper.Contact.PhoneNumber1,
          email: shipmentData.Shipper.Contact.EmailAddress,
          address: shipmentData.Shipper.PartyAddress.Line1,
          city: shipmentData.Shipper.PartyAddress.City || shipperCity || 'Colombo',
          country: shipperCountry,
        },
        consigneeDetails: {
          name: shipmentData.Consignee.Contact.PersonName,
          company: shipmentData.Consignee.Contact.CompanyName,
          phone: shipmentData.Consignee.Contact.PhoneNumber1,
          email: shipmentData.Consignee.Contact.EmailAddress,
          address: shipmentData.Consignee.PartyAddress.Line1,
          city: shipmentData.Consignee.PartyAddress.City || 'Male',
          country: 'MV',
        },
        numberOfPieces: parseInt(numberOfPieces),
        actualWeight: weight,
        descriptionOfGoods: descriptionOfGoods || `${product.name} - ${variant.name}`,
        labelUrl: processedShipment.ShipmentLabel?.LabelURL,
        trackingUrl: aramex.getTrackingUrl(processedShipment.ID),
        aramexResponse: aramexResponse as any,
      }).returning();
      
      // Update order with shipment details
      await db.update(orders).set({
        aramexAwbNumber: processedShipment.ID,
        aramexLabelUrl: processedShipment.ShipmentLabel?.LabelURL,
        aramexTrackingUrl: aramex.getTrackingUrl(processedShipment.ID),
        status: 'processing',
      }).where(eq(orders.id, order.id));
      
      res.json({
        shipment: savedShipment,
        awbNumber: processedShipment.ID,
        labelUrl: processedShipment.ShipmentLabel?.LabelURL,
        trackingUrl: aramex.getTrackingUrl(processedShipment.ID),
      });
    } catch (error: any) {
      console.error('Create shipment error:', error);
      res.status(500).json({ message: error.message || 'Failed to create shipment' });
    }
  });

  // Get seller's shipments
  app.get("/api/seller/shipments", isAuthenticated, requireRole(["seller"]), async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    try {
      const shipments = await db.query.aramexShipments.findMany({
        where: eq(aramexShipments.sellerId, userId),
        with: {
          order: {
            with: {
              product: true,
              variant: true,
            },
          },
        },
      });
      
      res.json(shipments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });


  // Admin Routes
  app.get("/api/admin/dashboard-stats", isAuthenticated, requireRole(["admin"]), async (req: AuthRequest, res: Response) => {
    try {
      const allUsers = await storage.getAllUsers();
      const pendingVerifications = allUsers.filter(u => u.verificationStatus === "pending").length;
      const allOrders = await storage.getOrders();
      const allBookings = await storage.getBookings();
      const allProducts = await storage.getProducts();
      const allServices = await storage.getServices();
      
      // Calculate actual revenue and commissions from paid transactions only
      const allTransactions = await db.select().from(transactions);
      // Orders/bookings use escrow/released, boosts use "paid" status
      const paidTransactions = allTransactions.filter(tx => 
        tx.status === "escrow" || tx.status === "released" || tx.status === "paid"
      );
      
      // Separate boost transactions from order/booking transactions
      const boostTransactions = paidTransactions.filter(tx => tx.type === "boost");
      const orderBookingTransactions = paidTransactions.filter(tx => tx.type === "order" || tx.type === "booking");
      
      // Order/booking revenue
      const orderBookingRevenue = orderBookingTransactions
        .reduce((sum, tx) => sum + parseFloat(tx.amount || "0"), 0);
      
      // Boost revenue (full amount goes to platform)
      const boostRevenue = boostTransactions
        .reduce((sum, tx) => sum + parseFloat(tx.amount || "0"), 0);
      
      // Total revenue from all sources (orders + bookings + boosts)
      const totalRevenue = (orderBookingRevenue + boostRevenue).toFixed(2);
      
      // Commissions from orders/bookings (platform earnings from orders/bookings)
      const totalCommissions = orderBookingTransactions
        .reduce((sum, tx) => sum + parseFloat(tx.commissionAmount || "0"), 0)
        .toFixed(2);
      
      // Total platform earnings = commissions from orders/bookings + full boost revenue
      const totalPlatformEarnings = (
        parseFloat(totalCommissions) + boostRevenue
      ).toFixed(2);
      
      const stats = {
        totalUsers: allUsers.length,
        pendingVerifications,
        totalOrders: allOrders.length,
        totalBookings: allBookings.length,
        activeProducts: allProducts.length,
        activeServices: allServices.length,
        totalRevenue,
        totalCommissions,
        boostRevenue: boostRevenue.toFixed(2),
        totalPlatformEarnings,
      };
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get all orders with details for admin
  app.get("/api/admin/orders", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const allOrders = await storage.getOrders();
      
      // Enrich orders with buyer and item details
      const enrichedOrders = await Promise.all(
        allOrders.map(async (order) => {
          const buyer = await storage.getUser(order.buyerId);
          const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
          
          return {
            ...order,
            buyer: {
              id: buyer?.id,
              email: buyer?.email,
              firstName: buyer?.firstName,
              lastName: buyer?.lastName,
            },
            itemCount: items.length,
            items,
          };
        })
      );
      
      res.json(enrichedOrders);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get orders ready to ship for admin consolidation
  app.get("/api/admin/ready-to-ship-orders", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const readyOrders = await db.query.orders.findMany({
        where: and(
          eq(orders.readyToShip, true),
          or(eq(orders.status, "paid"), eq(orders.status, "processing")),
          isNull(orders.consolidatedShipmentId)
        ),
        with: {
          buyer: true,
          seller: true,
          product: true,
          variant: true,
          shippingAddressRef: true,
        },
      });
      
      // For each order, check if its checkout session has incomplete orders
      const enrichedOrders = await Promise.all(
        readyOrders.map(async (order) => {
          if (!order.checkoutSessionId) {
            return { ...order, checkoutSessionIncomplete: false, checkoutSessionOrders: [] };
          }
          
          // Get all orders from this checkout session
          const sessionOrders = await db.select({
            id: orders.id,
            readyToShip: orders.readyToShip,
            status: orders.status,
            sellerId: orders.sellerId,
          })
          .from(orders)
          .where(eq(orders.checkoutSessionId, order.checkoutSessionId));
          
          // Check if any NON-CANCELLED orders in the session are not ready to ship
          const hasIncompleteOrders = sessionOrders.some(o => 
            o.status !== "cancelled" && !o.readyToShip
          );
          
          return {
            ...order,
            checkoutSessionIncomplete: hasIncompleteOrders,
            checkoutSessionOrders: sessionOrders,
          };
        })
      );
      
      res.json(enrichedOrders);
    } catch (error: any) {
      console.error("Error fetching ready-to-ship orders:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get all consolidated shipments for admin shipment history
  app.get("/api/admin/consolidated-shipments", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const shipments = await db.query.consolidatedShipments.findMany({
        with: {
          buyer: true,
        },
        orderBy: (consolidatedShipments, { desc }) => [desc(consolidatedShipments.createdAt)],
      });
      
      res.json(shipments);
    } catch (error: any) {
      console.error("Error fetching consolidated shipments:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get orders for a specific consolidated shipment
  app.get("/api/admin/consolidated-shipments/:id/orders", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const shipmentOrders = await db.query.orders.findMany({
        where: eq(orders.consolidatedShipmentId, id),
        with: {
          product: true,
          variant: true,
        },
      });
      
      res.json(shipmentOrders);
    } catch (error: any) {
      console.error("Error fetching shipment orders:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Mark Aramex payment as paid
  app.put("/api/admin/consolidated-shipments/:id/mark-paid", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const [shipment] = await db
        .select()
        .from(consolidatedShipments)
        .where(eq(consolidatedShipments.id, id));
      
      if (!shipment) {
        return res.status(404).json({ message: "Consolidated shipment not found" });
      }
      
      if (shipment.aramexPaymentStatus === "paid") {
        return res.status(400).json({ message: "Aramex payment already marked as paid" });
      }
      
      // Update payment status
      const [updated] = await db
        .update(consolidatedShipments)
        .set({ 
          aramexPaymentStatus: "paid",
          aramexPaidAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(consolidatedShipments.id, id))
        .returning();
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error marking Aramex payment as paid:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Consolidate orders and create Aramex shipment
  app.post("/api/admin/consolidate-shipment", isAuthenticated, requireRole(["admin"]), async (req: AuthRequest, res: Response) => {
    const adminId = (req.user as any)?.id;
    try {
      const { orderIds, overrideIncomplete, overrideReason } = req.body;
      
      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({ message: "Order IDs are required" });
      }
      
      // Fetch all orders to consolidate with strict validation
      // Accept both "paid" and "processing" status (seller has marked ready to ship)
      const ordersToConsolidate = await db.query.orders.findMany({
        where: and(
          inArray(orders.id, orderIds),
          eq(orders.readyToShip, true),
          or(
            eq(orders.status, "paid"),
            eq(orders.status, "processing")
          ),
          isNull(orders.consolidatedShipmentId)
        ),
        with: {
          buyer: true,
          seller: true,
          product: true,
          variant: true,
          shippingAddressRef: true,
        },
      });
      
      if (ordersToConsolidate.length === 0) {
        return res.status(400).json({ message: "No valid orders found to consolidate" });
      }
      
      // Verify all provided orderIds were found and valid
      if (ordersToConsolidate.length !== orderIds.length) {
        return res.status(400).json({ 
          message: "Some orders are not eligible for consolidation (already consolidated, not ready to ship, or not in paid/processing status)",
          found: ordersToConsolidate.length,
          requested: orderIds.length
        });
      }
      
      // Verify all orders are from the same buyer and same destination
      const buyerIds = new Set(ordersToConsolidate.map(o => o.buyerId));
      const shippingAddressIds = new Set(ordersToConsolidate.map(o => o.shippingAddressId).filter(Boolean));
      
      if (buyerIds.size > 1) {
        return res.status(400).json({ message: "All orders must be from the same buyer" });
      }
      
      if (shippingAddressIds.size > 1) {
        return res.status(400).json({ message: "All orders must have the same shipping destination" });
      }
      
      // Check for incomplete checkout sessions
      const checkoutSessionIds = Array.from(new Set(ordersToConsolidate.map(o => o.checkoutSessionId).filter(Boolean)));
      const incompleteSessions: string[] = [];
      
      for (const sessionId of checkoutSessionIds) {
        // Get all orders from this checkout session
        const sessionOrders = await db.select()
          .from(orders)
          .where(eq(orders.checkoutSessionId, sessionId as string));
        
        // Check if any non-cancelled orders in the session are not ready to ship
        const hasIncompleteOrders = sessionOrders.some(o => 
          o.status !== "cancelled" && !o.readyToShip
        );
        
        if (hasIncompleteOrders) {
          incompleteSessions.push(sessionId as string);
        }
      }
      
      // Block consolidation if incomplete sessions found (unless admin override)
      if (incompleteSessions.length > 0 && !overrideIncomplete) {
        return res.status(400).json({ 
          message: "Cannot consolidate orders from incomplete checkout sessions. Some orders in the same checkout are not ready to ship.",
          incompleteSessions,
          requiresOverride: true,
        });
      }
      
      // Log admin override if used
      if (overrideIncomplete && incompleteSessions.length > 0) {
        console.log(`Admin ${adminId} overrode incomplete checkout session validation. Reason: ${overrideReason || 'No reason provided'}`);
        console.log(`Incomplete sessions: ${incompleteSessions.join(', ')}`);
      }
      
      const firstOrder = ordersToConsolidate[0];
      const buyer = firstOrder.buyer;
      
      // Calculate total weight and cost
      const totalWeight = ordersToConsolidate.reduce((sum, order) => {
        const weight = parseFloat(order.productWeight || "1.0");
        return sum + (weight * order.quantity);
      }, 0);
      
      const totalShippingCost = ordersToConsolidate.reduce((sum, order) => {
        return sum + parseFloat(order.shippingCost || "0");
      }, 0);
      
      // Create Aramex shipment before database transaction
      let aramexResult: any = null;
      let actualAramexCost: number | null = null;
      let aramexWarning: string | null = null;
      
      try {
        // Prepare shipment data for Aramex
        const shipmentData = {
          Reference1: `CONSOL-${Date.now()}`,
          Comments: `Consolidated shipment for ${ordersToConsolidate.length} orders`,
          Details: {
            ActualWeight: {
              Unit: 'KG' as const,
              Value: totalWeight,
            },
            NumberOfPieces: ordersToConsolidate.length,
            ProductGroup: 'EXP',
            ProductType: 'PPX',
            PaymentType: 'P', // Prepaid
            Items: ordersToConsolidate.map(order => ({
              PackageType: 'Box',
              Quantity: order.quantity,
              Weight: {
                Unit: 'KG' as const,
                Value: parseFloat(order.productWeight || "1.0"),
              },
              Reference: order.id,
            })),
          },
          Shipper: {
            Reference1: 'Vaaney Marketplace',
            PartyAddress: {
              Line1: 'Seller Location',
              City: 'Colombo',
              CountryCode: 'LK',
            },
            Contact: {
              PersonName: 'Vaaney Shipping',
              CompanyName: 'Vaaney',
              PhoneNumber1: '+94112345678',
              EmailAddress: 'shipping@vaaney.com',
            },
          },
          Consignee: {
            Reference1: buyer.id,
            PartyAddress: {
              Line1: firstOrder.shippingAddressRef?.streetAddress || firstOrder.shippingAddress?.split(',')[0] || 'Address',
              City: firstOrder.shippingAddressRef?.city || 'Male',
              CountryCode: firstOrder.shippingAddressRef?.country || 'MV',
            },
            Contact: {
              PersonName: `${buyer.firstName} ${buyer.lastName}`,
              CompanyName: buyer.firstName || 'Customer',
              PhoneNumber1: buyer.contactNumber || '+9607123456',
              EmailAddress: buyer.email,
            },
          },
        };
        
        aramexResult = await aramex.createShipment(shipmentData);
        
        if (aramexResult.HasErrors || !aramexResult.Shipments || aramexResult.Shipments.length === 0) {
          throw new Error(aramexResult.Notifications?.[0]?.Message || 'Failed to create Aramex shipment');
        }
        
        const processedShipment = aramexResult.Shipments[0];
        actualAramexCost = processedShipment.ShipmentCharges?.TotalAmount || null;
        
      } catch (aramexError: any) {
        console.error('Aramex shipment creation failed:', aramexError.message);
        aramexWarning = `Aramex integration failed: ${aramexError.message}. Consolidation created without AWB/tracking.`;
        // Continue without Aramex integration - admin can retry later
        // We'll create the consolidation record without AWB/cost
      }
      
      // Use transaction for atomic database operation
      const result = await db.transaction(async (tx) => {
        const processedShipment = aramexResult?.Shipments?.[0];
        
        // Create consolidated shipment record
        const [consolidatedShipment] = await tx.insert(consolidatedShipments).values({
          buyerId: firstOrder.buyerId,
          numberOfOrders: ordersToConsolidate.length,
          totalWeight: totalWeight.toFixed(2),
          totalShippingCost: totalShippingCost.toFixed(2),
          actualAramexCost: actualAramexCost ? actualAramexCost.toFixed(2) : null,
          awbNumber: processedShipment?.ID || null,
          labelUrl: processedShipment?.ShipmentLabel?.LabelURL || null,
          trackingUrl: processedShipment?.ID 
            ? `https://www.aramex.com/track/results?ShipmentNumber=${processedShipment.ID}`
            : null,
          status: processedShipment?.ID ? "picked_up" : "pending",
          aramexPaymentStatus: "unpaid", // Default to unpaid when shipment is created
          createdByAdminId: adminId,
        }).returning();
        
        // Update all orders to reference this consolidated shipment and mark as shipped
        // Also update individual orders with AWB and tracking info
        await tx.update(orders)
          .set({ 
            consolidatedShipmentId: consolidatedShipment.id,
            status: "shipped",
            aramexAwbNumber: processedShipment?.ID || null,
            aramexTrackingUrl: processedShipment?.ID 
              ? `https://www.aramex.com/track/results?ShipmentNumber=${processedShipment.ID}`
              : null,
            updatedAt: new Date()
          })
          .where(inArray(orders.id, orderIds));
        
        return consolidatedShipment;
      });
      
      // Send notifications for shipped orders
      for (const order of ordersToConsolidate) {
        await notifyOrderShipped({
          buyerId: order.buyerId,
          orderId: order.id,
          productName: order.product?.name || "Product",
          trackingNumber: result.awbNumber || undefined,
        });
      }
      
      res.json({
        message: "Orders consolidated successfully",
        consolidatedShipment: result,
        awbNumber: result.awbNumber || "Pending Aramex creation",
        collectedFromBuyers: totalShippingCost,
        actualAramexCost: actualAramexCost,
        shippingProfitLoss: actualAramexCost ? (totalShippingCost - actualAramexCost).toFixed(2) : null,
        warning: aramexWarning,
      });
    } catch (error: any) {
      console.error("Error consolidating shipment:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Sync delivery statuses from Aramex for shipped orders
  app.post("/api/admin/sync-aramex-deliveries", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      // Get all shipped orders with Aramex AWB numbers that aren't delivered yet
      const shippedOrders = await db.query.orders.findMany({
        where: and(
          eq(orders.status, "shipped"),
          isNotNull(orders.aramexAwbNumber)
        ),
      });

      if (shippedOrders.length === 0) {
        return res.json({ 
          message: "No shipped orders with Aramex tracking found",
          updatedCount: 0 
        });
      }

      // Get unique AWB numbers
      const awbSet = new Set(shippedOrders.map(o => o.aramexAwbNumber!).filter(Boolean));
      const awbNumbers = Array.from(awbSet);

      // Track all shipments via Aramex API
      const trackingResponse = await trackShipments(awbNumbers);

      if (trackingResponse.HasErrors) {
        throw new Error(trackingResponse.Error?.Message || "Aramex tracking API error");
      }

      // Update orders that are delivered according to Aramex
      let updatedCount = 0;
      const deliveredAwbs: string[] = [];

      for (const trackingResult of trackingResponse.TrackingResults) {
        if (isShipmentDelivered(trackingResult.UpdateCode)) {
          deliveredAwbs.push(trackingResult.WaybillNumber);
        }
      }

      // Update all orders with delivered AWB numbers
      if (deliveredAwbs.length > 0) {
        const result = await db.update(orders)
          .set({ 
            status: "delivered",
            updatedAt: new Date()
          })
          .where(
            and(
              inArray(orders.aramexAwbNumber, deliveredAwbs),
              eq(orders.status, "shipped")
            )
          )
          .returning();

        updatedCount = result.length;
        
        // Send notifications for delivered orders
        for (const order of result) {
          const [product] = await db.select().from(products).where(eq(products.id, order.productId));
          if (product) {
            await notifyOrderDelivered({
              buyerId: order.buyerId,
              orderId: order.id,
              productName: product.name,
            });
          }
        }
      }

      res.json({
        message: `Synced ${awbNumbers.length} shipments, marked ${updatedCount} orders as delivered`,
        checkedShipments: awbNumbers.length,
        updatedOrders: updatedCount,
        deliveredAwbs: deliveredAwbs,
      });
    } catch (error: any) {
      console.error("Error syncing Aramex deliveries:", error);
      // Fallback gracefully if Aramex API fails
      res.status(500).json({ 
        message: "Failed to sync delivery statuses from Aramex",
        error: error.message
      });
    }
  });

  // Get all bookings with details for admin
  // Admin confirms booking payment
  app.put("/api/admin/bookings/:id/confirm-payment", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const booking = await db.query.bookings.findFirst({
        where: eq(bookings.id, req.params.id),
      });

      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (booking.status !== "pending_payment") {
        return res.status(400).json({ message: "Booking is not awaiting payment confirmation" });
      }

      // Update booking status to paid
      await db.update(bookings)
        .set({ status: "paid", updatedAt: new Date() })
        .where(eq(bookings.id, req.params.id));

      // Update transaction status to escrow
      await db.update(transactions)
        .set({ status: "escrow" })
        .where(eq(transactions.bookingId, req.params.id));

      // Send notifications for paid booking
      const serviceData = await storage.getService(booking.serviceId);
      if (serviceData) {
        await notifyBookingPaid({
          buyerId: booking.buyerId,
          sellerId: booking.sellerId,
          bookingId: booking.id,
          serviceName: serviceData.name,
        });
      }

      res.json({ message: "Booking payment confirmed successfully" });
    } catch (error: any) {
      console.error("Confirm booking payment error:", error);
      res.status(500).json({ message: "Failed to confirm booking payment" });
    }
  });

  app.get("/api/admin/bookings", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const allBookings = await storage.getBookings();
      
      // Enrich bookings with customer and service details
      const enrichedBookings = await Promise.all(
        allBookings.map(async (booking) => {
          const customer = await storage.getUser(booking.buyerId);
          const service = await storage.getService(booking.serviceId);
          const servicePackage = booking.packageId 
            ? await db.select().from(servicePackages).where(eq(servicePackages.id, booking.packageId)).then(r => r[0])
            : null;
          
          return {
            ...booking,
            customer: {
              id: customer?.id,
              email: customer?.email,
              firstName: customer?.firstName,
              lastName: customer?.lastName,
            },
            service: {
              id: service?.id,
              name: service?.name,
              category: service?.category,
            },
            package: servicePackage ? {
              name: servicePackage.name,
              price: servicePackage.price,
            } : null,
          };
        })
      );
      
      res.json(enrichedBookings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/users", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    const { role, status } = req.query;
    try {
      const users = await storage.getAllUsers(role as string, status as string);
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/verification-document/:userId", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.params.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (!user.verificationDocumentUrl) {
        return res.status(404).json({ message: "No documents found" });
      }

      // Parse the stored document data
      const documents = JSON.parse(user.verificationDocumentUrl);
      res.json({ documents });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Allow users to view their own verification documents
  app.get("/api/my-verification-documents", isAuthenticated, async (req: AuthRequest, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (!user.verificationDocumentUrl) {
        return res.status(404).json({ message: "No documents found" });
      }

      // Parse the stored document data
      const documents = JSON.parse(user.verificationDocumentUrl);
      res.json({ documents });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/admin/users/:id/verification", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    const { status, rejectionReason } = req.body;
    try {
      const user = await storage.updateUserVerificationStatus(req.params.id, status, rejectionReason);
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/admin/users/:id/commission", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    const { commissionRate } = req.body;
    try {
      const user = await storage.updateUserCommission(req.params.id, commissionRate);
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/admin/transactions", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const allTransactions = await storage.getTransactions();
      
      // Enrich transactions with order/booking status and bank account details
      const enrichedTransactions = await Promise.all(
        allTransactions.map(async (tx) => {
          let orderStatus = null;
          let bookingStatus = null;
          let bankAccountDetails = null;
          let paymentMethod = null;
          let transferSlipObjectPath = null;
          
          if (tx.orderId) {
            const [order] = await db.select().from(orders).where(eq(orders.id, tx.orderId));
            orderStatus = order?.status || null;
            paymentMethod = order?.paymentMethod || null;
            
            // For orders, transfer slip is stored in checkout session
            if (order?.checkoutSessionId) {
              const [checkoutSession] = await db.select().from(checkoutSessions).where(eq(checkoutSessions.id, order.checkoutSessionId));
              transferSlipObjectPath = checkoutSession?.transferSlipObjectPath || null;
            }
          }
          
          if (tx.bookingId) {
            const [booking] = await db.select().from(bookings).where(eq(bookings.id, tx.bookingId));
            bookingStatus = booking?.status || null;
            paymentMethod = booking?.paymentMethod || null;
            transferSlipObjectPath = booking?.transferSlipObjectPath || null;
          }
          
          // Include bank account details if bank transfer was used
          if (tx.bankAccountId) {
            const [bankAccount] = await db.select().from(bankAccounts).where(eq(bankAccounts.id, tx.bankAccountId));
            if (bankAccount) {
              bankAccountDetails = {
                id: bankAccount.id,
                displayName: bankAccount.displayName,
                bankName: bankAccount.bankName,
                accountNumber: bankAccount.accountNumber,
                currency: bankAccount.currency,
              };
            }
          }
          
          return {
            ...tx,
            orderStatus,
            bookingStatus,
            paymentMethod,
            bankAccountDetails,
            transferSlipObjectPath,
          };
        })
      );
      
      res.json(enrichedTransactions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Mark payment as received (pending → escrow)
  app.put("/api/admin/transactions/:id/confirm-payment", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const [transaction] = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, req.params.id));
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      if (transaction.status !== "pending") {
        return res.status(400).json({ message: `Cannot confirm payment for transaction with status "${transaction.status}"` });
      }
      
      // Update transaction to escrow
      const [updated] = await db
        .update(transactions)
        .set({ status: "escrow", updatedAt: new Date() })
        .where(eq(transactions.id, req.params.id))
        .returning();
      
      // Update related order/booking to "paid" status
      if (transaction.orderId) {
        await db.update(orders).set({ status: "paid", updatedAt: new Date() }).where(eq(orders.id, transaction.orderId));
      } else if (transaction.bookingId) {
        await db.update(bookings).set({ status: "paid", updatedAt: new Date() }).where(eq(bookings.id, transaction.bookingId));
      }
      
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Release payment (escrow → released) - only if order shipped/delivered
  app.put("/api/admin/transactions/:id/release", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const [transaction] = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, req.params.id));
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      if (transaction.status !== "escrow") {
        return res.status(400).json({ message: `Cannot release transaction with status "${transaction.status}". Only escrow transactions can be released.` });
      }
      
      // Check if order/booking is shipped or delivered
      if (transaction.orderId) {
        const [order] = await db.select().from(orders).where(eq(orders.id, transaction.orderId));
        if (!order || (order.status !== "shipped" && order.status !== "delivered")) {
          return res.status(400).json({ message: "Order must be shipped or delivered before releasing payment" });
        }
      }
      
      const releasedTransaction = await storage.releaseTransaction(req.params.id);
      res.json(releasedTransaction);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Confirm payment - move order from pending_payment to paid
  app.put("/api/admin/orders/:id/confirm-payment", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const [order] = await db.select().from(orders).where(eq(orders.id, req.params.id));
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      if (order.status !== "pending_payment") {
        return res.status(400).json({ message: "Only pending_payment orders can be confirmed" });
      }
      
      // Update order status to paid
      await db.update(orders)
        .set({ status: "paid" })
        .where(eq(orders.id, req.params.id));
      
      // Update all related transactions to escrow
      await db.update(transactions)
        .set({ status: "escrow" })
        .where(eq(transactions.orderId, req.params.id));
      
      // Send notification to buyer
      await notifyOrderPaid({
        buyerId: order.buyerId,
        orderId: order.id,
      });
      
      res.json({ message: "Payment confirmed successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Cancel order
  app.put("/api/admin/orders/:id/cancel", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const [order] = await db.select().from(orders).where(eq(orders.id, req.params.id));
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      if (order.status === "delivered" || order.status === "cancelled") {
        return res.status(400).json({ message: "Cannot cancel delivered or already cancelled orders" });
      }
      
      // Update order status to cancelled
      await db.update(orders)
        .set({ status: "cancelled" })
        .where(eq(orders.id, req.params.id));
      
      // Update all related transactions to refunded
      await db.update(transactions)
        .set({ status: "refunded" })
        .where(eq(transactions.orderId, req.params.id));
      
      res.json({ message: "Order cancelled successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Release all payments for an order at once
  app.put("/api/admin/orders/:id/release-all-payments", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const [order] = await db.select().from(orders).where(eq(orders.id, req.params.id));
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Check if order is shipped or delivered
      if (order.status !== "shipped" && order.status !== "delivered") {
        return res.status(400).json({ message: "Order must be shipped or delivered before releasing payments" });
      }
      
      // Get all transactions for this order
      const orderTransactions = await db
        .select()
        .from(transactions)
        .where(eq(transactions.orderId, req.params.id));
      
      if (orderTransactions.length === 0) {
        return res.status(404).json({ message: "No transactions found for this order" });
      }
      
      // Release all transactions that are in escrow
      const releasedTransactions = [];
      for (const transaction of orderTransactions) {
        if (transaction.status === "escrow") {
          const released = await storage.releaseTransaction(transaction.id);
          releasedTransactions.push(released);
        }
      }
      
      res.json({ 
        message: `Released ${releasedTransactions.length} payment(s)`,
        transactions: releasedTransactions 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin Return Requests
  app.get("/api/admin/return-requests", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const { status, sellerId, buyerId, type } = req.query;
      
      const filters: any = {};
      if (status) filters.status = status as string;
      if (sellerId) filters.sellerId = sellerId as string;
      if (buyerId) filters.buyerId = buyerId as string;
      
      const returnRequests = await storage.getReturnRequests(filters);
      
      // Use shared enrichment utility
      const enrichedRequests = await Promise.all(
        returnRequests.map(enrichReturnRequest)
      );

      res.json(enrichedRequests);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get return request history for a specific order (admin)
  app.get("/api/admin/orders/:orderId/return-history", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    const { orderId } = req.params;

    try {
      // Admins don't need ownership validation
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Get all return requests for this order, ordered chronologically (oldest first)
      const returnRequests = await storage.getReturnRequests({ orderId });
      const sortedRequests = returnRequests.sort((a, b) => 
        new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()
      );

      // Enrich and add attempt numbers
      const enrichedHistory = await Promise.all(
        sortedRequests.map(async (request, index) => {
          const enriched = await enrichReturnRequest(request);
          return {
            ...enriched,
            attemptNumber: index + 1,
            totalAttempts: order.returnAttemptCount || 0,
          };
        })
      );

      res.json(enrichedHistory);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get return request history for a specific booking (admin)
  app.get("/api/admin/bookings/:bookingId/return-history", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    const { bookingId } = req.params;

    try {
      // Admins don't need ownership validation
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Get all return requests for this booking, ordered chronologically (oldest first)
      const returnRequests = await storage.getReturnRequests({ bookingId });
      const sortedRequests = returnRequests.sort((a, b) => 
        new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()
      );

      // Enrich and add attempt numbers
      const enrichedHistory = await Promise.all(
        sortedRequests.map(async (request, index) => {
          const enriched = await enrichReturnRequest(request);
          return {
            ...enriched,
            attemptNumber: index + 1,
            totalAttempts: sortedRequests.length,
          };
        })
      );

      res.json(enrichedHistory);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin endpoint to view booking transfer slip
  app.get("/api/admin/bookings/:id/transfer-slip", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const [booking] = await db.select().from(bookings).where(eq(bookings.id, req.params.id));
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      if (booking.paymentMethod !== "bank_transfer") {
        return res.status(400).json({ message: "This booking does not use bank transfer payment" });
      }
      
      if (!booking.transferSlipObjectPath) {
        return res.status(404).json({ message: "No transfer slip found for this booking" });
      }
      
      // Convert bucket path to /objects/ format
      // Path format: /bucket-name/.private/uploads/id → /objects/uploads/id
      let normalizedPath = booking.transferSlipObjectPath;
      if (booking.transferSlipObjectPath.includes("/.private/uploads/")) {
        const uploadId = booking.transferSlipObjectPath.split("/.private/uploads/")[1];
        normalizedPath = `/objects/uploads/${uploadId}`;
      }
      
      // Generate signed URL for the transfer slip
      const signedUrl = await objectStorageService.getObjectReadURL(normalizedPath);
      
      res.json({ url: signedUrl });
    } catch (error: any) {
      console.error("Error fetching booking transfer slip:", error);
      res.status(500).json({ message: "Failed to retrieve transfer slip" });
    }
  });

  // Admin endpoint to view order transfer slip (from checkout session)
  app.get("/api/admin/orders/:id/transfer-slip", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const [order] = await db.select().from(orders).where(eq(orders.id, req.params.id));
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      if (order.paymentMethod !== "bank_transfer") {
        return res.status(400).json({ message: "This order does not use bank transfer payment" });
      }
      
      if (!order.checkoutSessionId) {
        return res.status(404).json({ message: "No checkout session found for this order" });
      }
      
      // Get checkout session to retrieve transfer slip path
      const [checkoutSession] = await db.select().from(checkoutSessions).where(eq(checkoutSessions.id, order.checkoutSessionId));
      
      if (!checkoutSession || !checkoutSession.transferSlipObjectPath) {
        return res.status(404).json({ message: "No transfer slip found for this order" });
      }
      
      // Convert bucket path to /objects/ format
      // Path format: /bucket-name/.private/uploads/id → /objects/uploads/id
      let normalizedPath = checkoutSession.transferSlipObjectPath;
      if (checkoutSession.transferSlipObjectPath.includes("/.private/uploads/")) {
        const uploadId = checkoutSession.transferSlipObjectPath.split("/.private/uploads/")[1];
        normalizedPath = `/objects/uploads/${uploadId}`;
      }
      
      // Generate signed URL for the transfer slip
      const signedUrl = await objectStorageService.getObjectReadURL(normalizedPath);
      
      res.json({ url: signedUrl });
    } catch (error: any) {
      console.error("Error fetching order transfer slip:", error);
      res.status(500).json({ message: "Failed to retrieve transfer slip" });
    }
  });

  app.put("/api/admin/return-requests/:id/resolve", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user?.id;
      
      const resolutionSchema = z.object({
        status: z.enum(["admin_approved", "admin_rejected"]),
        approvedRefundAmount: z.number().positive().optional(),
        adminNotes: z.string().max(2000).optional(),
        adminOverride: z.boolean().optional(),
      });

      const resolutionData = resolutionSchema.parse(req.body);

      // Get and validate return request
      const returnRequest = await storage.getReturnRequest(req.params.id);
      if (!returnRequest) {
        return res.status(404).json({ message: "Return request not found" });
      }

      // Can resolve requests in seller_approved, seller_rejected, or under_review status
      if (!["seller_approved", "seller_rejected", "under_review"].includes(returnRequest.status)) {
        return res.status(400).json({ 
          message: `Cannot resolve return request with status: ${returnRequest.status}`,
          currentStatus: returnRequest.status
        });
      }

      // If approving, ensure refund amount is set
      if (resolutionData.status === "admin_approved" && !resolutionData.approvedRefundAmount) {
        return res.status(400).json({ 
          message: "Refund amount is required when approving a return request" 
        });
      }

      // Apply admin resolution
      const updatedRequest = await storage.applyAdminResolution(req.params.id, userId, resolutionData);

      res.json({
        message: `Return request ${resolutionData.status === "admin_approved" ? "approved" : "rejected"} successfully`,
        returnRequest: updatedRequest
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/return-requests/:id/process-refund", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      // Get and validate return request
      const returnRequest = await storage.getReturnRequest(req.params.id);
      if (!returnRequest) {
        return res.status(404).json({ message: "Return request not found" });
      }

      // Can only process refunds for admin_approved requests
      if (returnRequest.status !== "admin_approved") {
        return res.status(400).json({ 
          message: `Cannot process refund for return request with status: ${returnRequest.status}`,
          currentStatus: returnRequest.status,
          requiredStatus: "admin_approved"
        });
      }

      // Process the refund (updates transaction, commission, order/booking status)
      await storage.processReturnRequestRefund(req.params.id);

      res.json({
        message: "Refund processed successfully",
        returnRequestId: req.params.id
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update order status (for sellers and admins)
  app.put("/api/orders/:id/status", isAuthenticated, async (req: AuthRequest, res: Response) => {
    const userId = (req.user as any)?.id;
    const { status } = req.body;
    
    try {
      const [order] = await db.select().from(orders).where(eq(orders.id, req.params.id));
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check permissions: seller can update their own orders, admin can update any
      if (user.role !== "admin") {
        const [orderItem] = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id)).limit(1);
        if (!orderItem || orderItem.sellerId !== userId) {
          return res.status(403).json({ message: "Not authorized to update this order" });
        }
      }
      
      const [updated] = await db
        .update(orders)
        .set({ status, updatedAt: new Date() })
        .where(eq(orders.id, req.params.id))
        .returning();
      
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/banners", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const banners = await storage.getHomepageBanners(true);
      res.json(banners);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/banners", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const bannerData = insertHomepageBannerSchema.parse(req.body);
      const banner = await storage.createHomepageBanner(bannerData);
      res.json(banner);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/admin/banners/:id", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const banner = await storage.updateHomepageBanner(req.params.id, req.body);
      res.json(banner);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/admin/banners/:id", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      await storage.deleteHomepageBanner(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/admin/banners/:id/reorder", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const { direction } = req.body;
      if (direction !== "up" && direction !== "down") {
        return res.status(400).json({ message: "Invalid direction. Must be 'up' or 'down'" });
      }
      await storage.reorderBanner(req.params.id, direction);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Public Homepage Banners
  app.get("/api/banners", async (req: Request, res: Response) => {
    try {
      const banners = await storage.getHomepageBanners();
      res.json(banners);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ====================================
  // MESSAGING SYSTEM ROUTES
  // ====================================

  // Configure multer for message attachment uploads (memory storage)
  const messageAttachmentUpload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
  });

  // Configure multer for general file uploads (ratings, etc.)
  const generalUpload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit for ratings
  });

  // General upload endpoint for ratings and other uploads
  app.post("/api/upload", isAuthenticated, generalUpload.single("file"), async (req: AuthRequest, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { folder = "uploads" } = req.body;
      
      console.log(`[UPLOAD] Starting upload for user ${userId}, file: ${req.file.originalname}, folder: ${folder}`);

      // Get private object directory
      const privateObjectDir = objectStorageService.getPrivateObjectDir();
      
      // Create file path
      const fileName = `${folder}/${userId}/${Date.now()}-${req.file.originalname}`;
      const fullPath = `${privateObjectDir}/${fileName}`;
      
      // Parse path to get bucket and object name
      const { parseObjectPath } = await import("./objectStorage");
      const { bucketName, objectName } = parseObjectPath(fullPath);
      
      // Upload file directly to storage
      const { objectStorageClient } = await import("./objectStorage");
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      
      await file.save(req.file.buffer, {
        contentType: req.file.mimetype,
        metadata: {
          metadata: {
            uploadedBy: userId,
            folder: folder,
          },
        },
      });

      // Set ACL policy for public read (ratings are visible on product/service pages)
      const normalizedPath = `/objects/${fileName}`;
      const { setObjectAclPolicy } = await import("./objectAcl");
      const aclPolicy: ObjectAclPolicy = {
        owner: userId,
        visibility: "public",
        aclRules: [],
      };
      await setObjectAclPolicy(file, aclPolicy);

      // Generate full URL for the uploaded file
      const protocol = req.protocol;
      const host = req.get('host');
      const fullUrl = `${protocol}://${host}${normalizedPath}`;

      console.log(`[UPLOAD] Upload complete, returning URL: ${fullUrl}`);
      // Return the full object storage URL
      res.json({ url: fullUrl });
    } catch (error: any) {
      console.error("[UPLOAD] Error uploading file:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Upload message attachment to object storage
  app.post("/api/upload-message-attachment", isAuthenticated, messageAttachmentUpload.single("file"), async (req: AuthRequest, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { conversationId } = req.body;
      if (!conversationId) {
        return res.status(400).json({ message: "conversationId is required" });
      }

      // Verify user is a participant in the conversation
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      if (conversation.buyerId !== userId && conversation.sellerId !== userId) {
        return res.status(403).json({ message: "Not a participant in this conversation" });
      }

      console.log(`[UPLOAD] Starting upload for user ${userId}, file: ${req.file.originalname}, conversation: ${conversationId}`);

      // Get private object directory
      const privateObjectDir = objectStorageService.getPrivateObjectDir();
      console.log(`[UPLOAD] Private object dir: ${privateObjectDir}`);
      
      // Create file path
      const fileName = `message-attachments/${userId}/${Date.now()}-${req.file.originalname}`;
      const fullPath = `${privateObjectDir}/${fileName}`;
      console.log(`[UPLOAD] Full path: ${fullPath}`);
      
      // Parse path to get bucket and object name
      const { parseObjectPath } = await import("./objectStorage");
      const { bucketName, objectName } = parseObjectPath(fullPath);
      console.log(`[UPLOAD] Bucket: ${bucketName}, Object: ${objectName}`);
      
      // Upload file directly to storage
      const { objectStorageClient } = await import("./objectStorage");
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      
      console.log(`[UPLOAD] Saving file to GCS...`);
      await file.save(req.file.buffer, {
        contentType: req.file.mimetype,
        metadata: {
          metadata: {
            uploadedBy: userId,
            conversationId: conversationId,
          },
        },
      });
      console.log(`[UPLOAD] File saved successfully`);

      // Verify file exists
      const [exists] = await file.exists();
      console.log(`[UPLOAD] File exists check: ${exists}`);

      // Set ACL policy with conversation participants access
      const normalizedPath = `/objects/${fileName}`;
      const { ObjectAccessGroupType, setObjectAclPolicy } = await import("./objectAcl");
      const aclPolicy: ObjectAclPolicy = {
        owner: userId,
        visibility: "private",
        aclRules: [
          {
            group: {
              type: ObjectAccessGroupType.CONVERSATION_PARTICIPANTS,
              id: conversationId,
            },
            permission: ObjectPermission.READ,
          },
        ],
      };
      console.log(`[UPLOAD] Setting ACL for normalized path: ${normalizedPath} with conversation participants`);
      await setObjectAclPolicy(file, aclPolicy);
      console.log(`[UPLOAD] ACL set successfully`);

      console.log(`[UPLOAD] Upload complete, returning URL: ${normalizedPath}`);
      // Return the object storage URL
      res.json({ url: normalizedPath });
    } catch (error: any) {
      console.error("[UPLOAD] Error uploading message attachment:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get conversations for the current user
  app.get("/api/conversations", isAuthenticated, async (req: AuthRequest, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const conversations = await storage.getConversations(userId, user.role);
      res.json(conversations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get a specific conversation with messages
  app.get("/api/conversations/:id", isAuthenticated, async (req: AuthRequest, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      let conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Check if user has access to this conversation
      const hasAccess = user.role === "admin" || 
                        conversation.buyerId === userId || 
                        conversation.sellerId === userId;
      
      if (!hasAccess) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Auto-set workflow context for products/services that require design approval
      // This ensures the "Design Workflow" badge appears even before uploading
      // Check if "product" context is missing (not if there are no contexts at all)
      if (!conversation.workflowContexts.includes("product")) {
        if (conversation.productId) {
          const product = await storage.getProduct(conversation.productId);
          if (product?.requiresDesignApproval) {
            conversation = await storage.addWorkflowContext(conversation.id, "product");
          }
        } else if (conversation.serviceId) {
          const service = await storage.getService(conversation.serviceId);
          if (service?.requiresDesignApproval) {
            conversation = await storage.addWorkflowContext(conversation.id, "product");
          }
        }
      }
      
      const messages = await storage.getMessages(req.params.id);
      
      // Mark messages as read for the current user
      await storage.markConversationMessagesAsRead(req.params.id, userId);
      
      res.json({ conversation, messages });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Initialize a purchase workflow (design upload or quote request)
  // This endpoint finds/creates conversation and sets workflow context in one transaction
  app.post("/api/conversations/workflows", isAuthenticated, requireRole(["buyer"]), async (req: AuthRequest, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Validate request
      const schema = z.object({
        productId: z.string().optional(),
        serviceId: z.string().optional(),
        context: z.enum(["product", "quote"]),
        initialMessage: z.string().optional(),
      });
      
      const { productId, serviceId, context, initialMessage } = schema.parse(req.body);

      if (!productId && !serviceId) {
        return res.status(400).json({ message: "Either productId or serviceId is required" });
      }

      // Get the item (product or service) to determine seller
      let sellerId: string;
      let itemName: string;
      const type = productId ? "pre_purchase_product" : "pre_purchase_service";

      if (productId) {
        const product = await storage.getProduct(productId);
        if (!product) {
          return res.status(404).json({ message: "Product not found" });
        }
        sellerId = product.sellerId;
        itemName = product.name;
      } else {
        const service = await storage.getService(serviceId!);
        if (!service) {
          return res.status(404).json({ message: "Service not found" });
        }
        sellerId = service.sellerId;
        itemName = service.name;
      }

      // Find or create conversation
      let conversation = await storage.findExistingConversation({
        buyerId: userId,
        sellerId,
        type,
        productId: productId || null,
        serviceId: serviceId || null,
        orderId: null,
        bookingId: null,
      });

      if (!conversation) {
        // Create new conversation
        const subject = context === "quote" 
          ? `Custom Quote Request for ${itemName}`
          : `Design Upload for ${itemName}`;

        conversation = await storage.createConversation({
          type,
          subject,
          buyerId: userId,
          sellerId,
          productId,
          serviceId,
        } as any);
      }

      // Add workflow context (uses set semantics - won't duplicate)
      conversation = await storage.addWorkflowContext(conversation.id, context);

      // If quote context, create a quote request record with status="requested"
      if (context === "quote") {
        try {
          await storage.createQuote({
            conversationId: conversation.id,
            productId: productId || undefined,
            serviceId: serviceId || undefined,
            buyerId: userId,
            sellerId,
            status: "requested",
            quantity: 1,
            specifications: initialMessage, // Store buyer's initial message as specifications
          } as any);
        } catch (error: any) {
          // If quote already exists for this conversation, that's fine
          console.log("Quote may already exist for this conversation:", error.message);
        }
      }

      // Post initial message if provided
      if (initialMessage) {
        await storage.createMessage({
          conversationId: conversation.id,
          senderId: userId,
          senderRole: "buyer",
          content: initialMessage,
        });
      }

      res.json(conversation);
    } catch (error: any) {
      console.error("Error initializing workflow:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Create a new conversation
  app.post("/api/conversations", isAuthenticated, async (req: AuthRequest, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const conversationData = insertConversationSchema.parse(req.body);
      const conversationType = conversationData.type as unknown as string;
      const productId = conversationData.productId as unknown as string | undefined;
      const serviceId = conversationData.serviceId as unknown as string | undefined;
      const orderId = conversationData.orderId as unknown as string | undefined;
      const bookingId = conversationData.bookingId as unknown as string | undefined;
      
      // Validate that required foreign keys are present based on conversation type
      if (conversationType === "pre_purchase_product" && !productId) {
        return res.status(400).json({ message: "productId is required for pre-purchase product inquiries" });
      }
      if (conversationType === "pre_purchase_service" && !serviceId) {
        return res.status(400).json({ message: "serviceId is required for pre-purchase service inquiries" });
      }
      if (conversationType === "order" && !orderId) {
        return res.status(400).json({ message: "orderId is required for order conversations" });
      }
      if (conversationType === "booking" && !bookingId) {
        return res.status(400).json({ message: "bookingId is required for booking conversations" });
      }
      
      // Determine buyerId and sellerId based on user role and conversation type
      let buyerId: string | null = null;
      let sellerId: string | null = null;
      
      // Handle order and booking conversations - derive participants from the entity
      if (orderId) {
        const order = await storage.getOrder(orderId);
        if (!order) {
          return res.status(404).json({ message: "Order not found" });
        }
        
        // Get seller directly from order (variant-level order architecture)
        buyerId = order.buyerId;
        sellerId = order.sellerId;
        
        // Verify that current user is either buyer or seller for this order
        if (userId !== buyerId && userId !== sellerId && user.role !== "admin") {
          return res.status(403).json({ message: "You are not authorized to create a conversation for this order" });
        }
      } else if (bookingId) {
        const booking = await storage.getBooking(bookingId);
        if (!booking) {
          return res.status(404).json({ message: "Booking not found" });
        }
        
        const service = await storage.getService(booking.serviceId);
        if (!service) {
          return res.status(404).json({ message: "Service not found for booking" });
        }
        
        buyerId = booking.buyerId;
        sellerId = service.sellerId;
        
        // Verify that current user is either buyer or seller for this booking
        if (userId !== buyerId && userId !== sellerId && user.role !== "admin") {
          return res.status(403).json({ message: "You are not authorized to create a conversation for this booking" });
        }
      } else if (productId) {
        // Pre-purchase product inquiries - buyer asks about a product
        const product = await storage.getProduct(productId);
        if (!product) {
          return res.status(404).json({ message: "Product not found" });
        }
        sellerId = product.sellerId;
        buyerId = userId; // Current user is the buyer
      } else if (serviceId) {
        // Pre-purchase service inquiries - buyer asks about a service
        const service = await storage.getService(serviceId);
        if (!service) {
          return res.status(404).json({ message: "Service not found" });
        }
        sellerId = service.sellerId;
        buyerId = userId; // Current user is the buyer
      } else if (user.role === "seller" && (conversationType === "general_inquiry" || conversationType === "complaint")) {
        // Seller creating a general inquiry or complaint - seller-to-admin conversation
        sellerId = userId;
        buyerId = null;
      } else {
        // For all other cases (general inquiries, complaints, return/refunds by buyers)
        buyerId = userId;
      }
      
      // Final safety check: ensure sellerId was successfully derived for conversation types that require it
      const requiresSeller = ["pre_purchase_product", "pre_purchase_service", "order", "booking"];
      if (requiresSeller.includes(conversationType) && !sellerId) {
        return res.status(400).json({ message: "Unable to determine seller for this conversation" });
      }
      
      // Check if a conversation already exists with the same parameters
      // ONLY for entity-specific conversations (not general inquiries, complaints, or return/refunds)
      // Users should be able to create multiple general conversations with different subjects
      const allowMultipleConversations = ["general_inquiry", "complaint", "return_refund"];
      
      if (!allowMultipleConversations.includes(conversationType)) {
        const existingConversation = await storage.findExistingConversation({
          buyerId: buyerId || userId,
          sellerId: sellerId || null,
          type: conversationType as any,
          productId: productId || null,
          serviceId: serviceId || null,
          orderId: orderId || null,
          bookingId: bookingId || null,
        });
        
        if (existingConversation) {
          // Return the existing conversation instead of creating a new one
          return res.json(existingConversation);
        }
      }
      
      const conversation = await storage.createConversation({
        type: conversationType as any,
        subject: conversationData.subject,
        productId: productId || null,
        serviceId: serviceId || null,
        orderId: orderId || null,
        bookingId: bookingId || null,
        buyerId: buyerId || userId,
        sellerId: sellerId || null,
      } as any);
      
      res.json(conversation);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Update conversation status (participants can resolve, admin can do anything)
  app.put("/api/conversations/:id/status", isAuthenticated, async (req: AuthRequest, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Check permissions: admin can do anything, participants can only mark as resolved
      const isParticipant = conversation.buyerId === userId || conversation.sellerId === userId;
      const isAdmin = user.role === "admin";
      
      if (!isAdmin && !isParticipant) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const { status } = req.body;
      
      // Non-admins can only mark as resolved
      if (!isAdmin && status !== "resolved") {
        return res.status(403).json({ message: "Only admins can change status to anything other than resolved" });
      }
      
      const updatedConversation = await storage.updateConversationStatus(req.params.id, status);
      res.json(updatedConversation);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Send a message in a conversation
  app.post("/api/conversations/:id/messages", isAuthenticated, async (req: AuthRequest, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Check if user has access to this conversation
      const hasAccess = user.role === "admin" || 
                        conversation.buyerId === userId || 
                        conversation.sellerId === userId;
      
      if (!hasAccess) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage({
        content: messageData.content,
        isTemplate: messageData.isTemplate,
        conversationId: req.params.id,
        senderId: userId,
        senderRole: user.role,
      });
      
      // Handle attachments if provided
      const attachments = req.body.attachments as Array<{ url: string; filename: string; mimeType: string; size: number }> | undefined;
      if (attachments && attachments.length > 0) {
        for (const attachment of attachments) {
          await storage.createMessageAttachment({
            messageId: message.id,
            fileUrl: attachment.url,
            fileName: attachment.filename,
            fileType: attachment.mimeType,
            fileSize: attachment.size,
          });
        }
      }
      
      // Send notification to recipient (in-app only, no email spam)
      const recipientId = userId === conversation.buyerId ? conversation.sellerId : conversation.buyerId;
      if (recipientId) {
        const senderName = user.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "Someone";
        await notifyMessageReceived({
          recipientId,
          senderName,
          conversationId: req.params.id,
          messagePreview: messageData.content,
        });
      }
      
      res.json(message);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Get signed URL for message attachment download
  app.get("/api/message-attachments/:attachmentId/download", isAuthenticated, async (req: AuthRequest, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get the attachment
      const [attachment] = await db
        .select()
        .from(messageAttachments)
        .where(eq(messageAttachments.id, req.params.attachmentId));
      
      if (!attachment) {
        return res.status(404).json({ message: "Attachment not found" });
      }
      
      // Get the message to check conversation access
      const [message] = await db
        .select()
        .from(messages)
        .where(eq(messages.id, attachment.messageId));
      
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      // Get the conversation to check access
      const conversation = await storage.getConversation(message.conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Check if user has access to this conversation
      const hasAccess = user.role === "admin" || 
                        conversation.buyerId === userId || 
                        conversation.sellerId === userId;
      
      if (!hasAccess) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Get signed URL for the private object
      console.log("Getting signed URL for:", attachment.fileUrl);
      const signedUrl = await objectStorageService.getObjectReadURL(attachment.fileUrl);
      console.log("Generated signed URL, redirecting...");
      
      // Redirect to the signed URL
      res.redirect(signedUrl);
    } catch (error: any) {
      console.error("Error getting attachment download URL:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Upload message attachment
  app.post("/api/messages/:messageId/attachments", isAuthenticated, async (req: AuthRequest, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const attachmentData = insertMessageAttachmentSchema.parse(req.body);
      const attachment = await storage.createMessageAttachment({
        ...attachmentData,
        messageId: req.params.messageId,
      });
      
      res.json(attachment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Get attachments for a message
  app.get("/api/messages/:messageId/attachments", isAuthenticated, async (req: AuthRequest, res: Response) => {
    try {
      const attachments = await storage.getMessageAttachments(req.params.messageId);
      res.json(attachments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ====================================
  // ADMIN MESSAGE TEMPLATES
  // ====================================

  // Get all admin message templates
  app.get("/api/admin/message-templates", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const { category } = req.query;
      const templates = await storage.getAdminMessageTemplates(category as string);
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create a new admin message template
  app.post("/api/admin/message-templates", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const templateData = insertAdminMessageTemplateSchema.parse(req.body);
      const template = await storage.createAdminMessageTemplate(templateData);
      res.json(template);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Update an admin message template
  app.put("/api/admin/message-templates/:id", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const template = await storage.updateAdminMessageTemplate(req.params.id, req.body);
      res.json(template);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Delete an admin message template
  app.delete("/api/admin/message-templates/:id", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      await storage.deleteAdminMessageTemplate(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // ========== BOOST PACKAGES ROUTES ==========
  
  // Get all boost packages (public, but includes isActive filtering)
  app.get("/api/boost-packages", async (req: Request, res: Response) => {
    try {
      const includeInactive = req.query.includeInactive === "true";
      const packages = await storage.getBoostPackages(includeInactive);
      res.json(packages);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get single boost package
  app.get("/api/boost-packages/:id", async (req: Request, res: Response) => {
    try {
      const pkg = await storage.getBoostPackage(req.params.id);
      if (!pkg) {
        return res.status(404).json({ message: "Boost package not found" });
      }
      res.json(pkg);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create a boost package (admin only)
  app.post("/api/admin/boost-packages", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const packageData = insertBoostPackageSchema.parse(req.body);
      const pkg = await storage.createBoostPackage(packageData);
      res.json(pkg);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Update a boost package (admin only)
  app.put("/api/admin/boost-packages/:id", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const pkg = await storage.updateBoostPackage(req.params.id, req.body);
      res.json(pkg);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Delete a boost package (admin only)
  app.delete("/api/admin/boost-packages/:id", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      await storage.deleteBoostPackage(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // ========== BOOSTED ITEMS ROUTES ==========
  
  // Get all boosted items with optional filtering
  app.get("/api/boosted-items", async (req: Request, res: Response) => {
    try {
      const { itemType, activeOnly } = req.query;
      const items = await storage.getBoostedItems(
        itemType as any,
        activeOnly !== "false"
      );
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get boosted item by ID
  app.get("/api/boosted-items/:id", async (req: Request, res: Response) => {
    try {
      const item = await storage.getBoostedItem(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Boosted item not found" });
      }
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Check if specific item is boosted
  app.get("/api/boosted-items/check/:itemType/:itemId", async (req: Request, res: Response) => {
    try {
      const { itemType, itemId } = req.params;
      const item = await storage.getBoostedItemByItemId(itemId, itemType as any);
      res.json({ isBoosted: !!item, boostData: item || null });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create a boosted item (admin only)
  app.post("/api/admin/boosted-items", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const itemData = insertBoostedItemSchema.parse(req.body);
      const item = await storage.createBoostedItem(itemData);
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Delete a boosted item (admin only)
  app.delete("/api/admin/boosted-items/:id", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      await storage.deleteBoostedItem(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Expire old boosts (admin only - manual trigger or can be automated)
  app.post("/api/admin/boosted-items/expire", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      await storage.expireOldBoosts();
      res.json({ success: true, message: "Old boosts expired successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // ========== SELLER BOOST PURCHASE ROUTES ==========
  
  // Get seller's boost purchases
  app.get("/api/seller/boost-purchases", isAuthenticated, requireRole(["seller"]), async (req: AuthRequest, res: Response) => {
    try {
      const sellerId = (req.user as any)?.id;
      const status = req.query.status as any;
      const purchases = await storage.getBoostPurchases(sellerId, status);
      res.json(purchases);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get single boost purchase
  app.get("/api/seller/boost-purchases/:id", isAuthenticated, requireRole(["seller"]), async (req: AuthRequest, res: Response) => {
    try {
      const purchase = await storage.getBoostPurchase(req.params.id);
      if (!purchase) {
        return res.status(404).json({ message: "Boost purchase not found" });
      }
      const sellerId = (req.user as any)?.id;
      if (purchase.sellerId !== sellerId) {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(purchase);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Initiate a boost purchase
  app.post("/api/seller/boost-purchase", isAuthenticated, requireRole(["seller"]), async (req: AuthRequest, res: Response) => {
    try {
      const sellerId = (req.user as any)?.id;
      const { packageId, itemType, itemId, paymentMethod } = req.body;
      
      if (!packageId || !itemType || !itemId) {
        return res.status(400).json({ message: "Package ID, item type, and item ID are required" });
      }

      // Verify the package exists
      const boostPackage = await storage.getBoostPackage(packageId);
      if (!boostPackage || !boostPackage.isActive) {
        return res.status(404).json({ message: "Boost package not found or inactive" });
      }

      // Verify the item exists and belongs to the seller
      let itemExists = false;
      if (itemType === "product") {
        const product = await storage.getProduct(itemId);
        itemExists = product?.sellerId === sellerId;
      } else if (itemType === "service") {
        const service = await storage.getService(itemId);
        itemExists = service?.sellerId === sellerId;
      }

      if (!itemExists) {
        return res.status(404).json({ message: "Item not found or does not belong to you" });
      }

      // Check if item has an ACTIVE boost (expired boosts are OK to replace)
      const existingBoost = await storage.getBoostedItemByItemId(itemId, itemType);
      if (existingBoost) {
        const now = new Date();
        const endDate = new Date(existingBoost.endDate);
        
        // Only block if boost is still active
        if (endDate > now) {
          return res.status(400).json({ 
            message: "This item is already boosted until " + endDate.toLocaleDateString() + ". Please wait until it expires or contact admin to cancel it."
          });
        }
        // If boost expired, allow creating new one
      }

      // Check if there's already a pending purchase for this item
      const pendingPurchases = await db
        .select()
        .from(boostPurchases)
        .where(
          and(
            eq(boostPurchases.itemId, itemId),
            eq(boostPurchases.itemType, itemType),
            eq(boostPurchases.sellerId, sellerId),
            eq(boostPurchases.status, "pending")
          )
        );

      if (pendingPurchases.length > 0) {
        return res.status(400).json({ 
          message: "You already have a pending boost purchase for this item. Please complete or cancel it first."
        });
      }

      // Create boost purchase and transaction (like orders/bookings)
      const result = await db.transaction(async (tx) => {
        // Create the purchase record
        const [purchase] = await tx.insert(boostPurchases).values({
          sellerId,
          packageId,
          itemType,
          itemId,
          amount: boostPackage.price,
          status: "pending",
          paymentMethod: paymentMethod || "bank_transfer",
        }).returning();

        // Create transaction record (like orders/bookings do)
        const amount = parseFloat(boostPackage.price);
        await tx.insert(transactions).values({
          type: "boost",
          orderId: null,
          bookingId: null,
          boostPurchaseId: purchase.id,
          buyerId: sellerId, // For boosts, the seller is the "buyer"
          sellerId: sellerId,
          amount: amount.toFixed(2),
          commissionRate: "0",
          commissionAmount: "0",
          sellerPayout: "0", // Not applicable for boosts
          status: "pending",
          releasedAt: null,
        });

        return purchase;
      });

      // Get item name for notification
      let itemName = "your item";
      if (itemType === "product") {
        const product = await storage.getProduct(itemId);
        itemName = product?.name || itemName;
      } else if (itemType === "service") {
        const service = await storage.getService(itemId);
        itemName = service?.name || itemName;
      }

      // Send notification (in-app only, no email)
      await notifyBoostPurchaseCreated({
        sellerId,
        packageName: boostPackage.name,
        amount: boostPackage.price,
        itemName,
      });

      // If IPG payment, return redirect URL to payment gateway
      if (paymentMethod === "ipg") {
        const amount = parseFloat(boostPackage.price);
        
        const ipgUrl = new URL(`${req.protocol}://${req.get('host')}/mock-ipg`);
        ipgUrl.searchParams.set("transactionRef", result.id);
        ipgUrl.searchParams.set("amount", amount.toFixed(2));
        ipgUrl.searchParams.set("merchantId", "VAANEY_MERCHANT");
        ipgUrl.searchParams.set("transactionType", "boost");
        ipgUrl.searchParams.set("returnUrl", `${req.protocol}://${req.get('host')}/seller/boost`);
        
        return res.json({ 
          purchase: result,
          redirectUrl: ipgUrl.toString(),
          paymentMethod: "ipg",
          message: "Redirecting to payment gateway..." 
        });
      }

      res.json({ 
        purchase: result,
        message: "Boost purchase initiated. Admin will confirm payment shortly."
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Seller submits payment slip for boost purchase (bank transfer)
  app.post("/api/seller/boost-purchase/:id/confirm-payment", isAuthenticated, requireRole(["seller"]), async (req: AuthRequest, res: Response) => {
    try {
      const sellerId = (req.user as any)?.id;
      const { paymentSlipUrl, paymentReference } = req.body;
      
      // Accept either payment slip (new) or payment reference (old - backward compatibility)
      if ((!paymentSlipUrl || !paymentSlipUrl.trim()) && (!paymentReference || !paymentReference.trim())) {
        return res.status(400).json({ message: "Payment slip or payment reference is required" });
      }

      const purchase = await storage.getBoostPurchase(req.params.id);
      if (!purchase) {
        return res.status(404).json({ message: "Boost purchase not found" });
      }

      // Verify the seller owns this purchase
      if (purchase.sellerId !== sellerId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Verify payment method is bank transfer
      if (purchase.paymentMethod !== "bank_transfer") {
        return res.status(400).json({ message: "Only bank transfer purchases require payment confirmation" });
      }

      if (purchase.status !== "pending") {
        return res.status(400).json({ message: "Only pending boost purchases can have payment confirmation updated" });
      }

      // Update purchase with payment slip or reference (status stays pending for admin confirmation)
      const updateData: any = {};
      if (paymentSlipUrl && paymentSlipUrl.trim()) {
        updateData.paymentSlipUrl = paymentSlipUrl.trim();
      }
      if (paymentReference && paymentReference.trim()) {
        updateData.paymentReference = paymentReference.trim();
      }

      await db.update(boostPurchases)
        .set(updateData)
        .where(eq(boostPurchases.id, req.params.id));

      res.json({ message: "Payment confirmation submitted successfully. Admin will verify your payment shortly." });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Cancel a pending boost purchase
  app.delete("/api/seller/boost-purchases/:id", isAuthenticated, requireRole(["seller"]), async (req: AuthRequest, res: Response) => {
    try {
      const sellerId = (req.user as any)?.id;
      const purchase = await storage.getBoostPurchase(req.params.id);
      
      if (!purchase) {
        return res.status(404).json({ message: "Boost purchase not found" });
      }

      // Verify the seller owns this purchase
      if (purchase.sellerId !== sellerId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Only pending purchases can be cancelled
      if (purchase.status !== "pending") {
        return res.status(400).json({ message: "Only pending boost purchases can be cancelled" });
      }

      // Update purchase status to cancelled
      await db.update(boostPurchases)
        .set({ status: "cancelled" })
        .where(eq(boostPurchases.id, req.params.id));

      // Update associated transaction to refunded (closest valid status for cancelled)
      await db.update(transactions)
        .set({ status: "refunded" })
        .where(eq(transactions.boostPurchaseId, req.params.id));

      res.json({ message: "Boost purchase cancelled successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin confirms boost purchase payment (like orders/bookings)
  app.put("/api/admin/boost-purchases/:id/confirm-payment", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const purchase = await storage.getBoostPurchase(req.params.id);
      if (!purchase) {
        return res.status(404).json({ message: "Boost purchase not found" });
      }

      if (purchase.status !== "pending") {
        return res.status(400).json({ message: "Only pending boost purchases can be confirmed" });
      }

      // Get the boost package details
      const boostPackage = await storage.getBoostPackage(purchase.packageId);
      if (!boostPackage) {
        return res.status(404).json({ message: "Boost package not found" });
      }

      // Deactivate any existing active boosts for this item before creating new one
      await db.update(boostedItems)
        .set({ isActive: false })
        .where(and(
          eq(boostedItems.itemType, purchase.itemType),
          eq(boostedItems.itemId, purchase.itemId),
          eq(boostedItems.isActive, true)
        ));

      // Update purchase status to paid
      await db.update(boostPurchases)
        .set({ status: "paid", paidAt: new Date() })
        .where(eq(boostPurchases.id, req.params.id));

      // Update transaction to paid status (boosts don't use escrow - they activate immediately)
      await db.update(transactions)
        .set({ status: "paid" })
        .where(eq(transactions.boostPurchaseId, req.params.id));

      // Create and activate the boosted item
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + boostPackage.durationDays);

      const boostedItem = await storage.createBoostedItem({
        itemType: purchase.itemType,
        itemId: purchase.itemId,
        packageId: purchase.packageId,
        endDate,
        isActive: true,
      });

      // Link the purchase to the boosted item
      await storage.linkBoostPurchaseToBoost(purchase.id, boostedItem.id);

      // Get item name for notification
      let itemName = "your item";
      if (purchase.itemType === "product") {
        const product = await storage.getProduct(purchase.itemId);
        itemName = product?.name || itemName;
      } else if (purchase.itemType === "service") {
        const service = await storage.getService(purchase.itemId);
        itemName = service?.name || itemName;
      }

      // Send notification (with email - major event!)
      await notifyBoostPaymentConfirmed({
        sellerId: purchase.sellerId,
        packageName: boostPackage.name,
        itemName,
        boostDuration: `${boostPackage.durationDays} days`,
      });

      res.json({ message: "Boost payment confirmed and activated successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get all boost purchases (admin only - for revenue tracking)
  app.get("/api/admin/boost-purchases", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const allPurchases = await storage.getBoostPurchases();
      
      // Enrich purchases with seller, package, and item details
      const enrichedPurchases = await Promise.all(
        allPurchases.map(async (purchase) => {
          const seller = await storage.getUser(purchase.sellerId);
          const boostPackage = await storage.getBoostPackage(purchase.packageId);
          
          let itemName = "Unknown";
          if (purchase.itemType === "product") {
            const product = await storage.getProduct(purchase.itemId);
            itemName = product?.name || "Unknown Product";
          } else if (purchase.itemType === "service") {
            const service = await storage.getService(purchase.itemId);
            itemName = service?.name || "Unknown Service";
          }
          
          return {
            ...purchase,
            seller: {
              id: seller?.id,
              email: seller?.email,
              firstName: seller?.firstName,
              lastName: seller?.lastName,
            },
            packageName: boostPackage?.name || "Unknown Package",
            itemName,
          };
        })
      );
      
      res.json(enrichedPurchases);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Get payment slip for boost purchase (secure access to private uploaded documents)
  app.get("/api/admin/boost-purchase/:id/payment-slip", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      console.log(`[Payment Slip] Fetching for boost purchase: ${req.params.id}`);
      const purchase = await storage.getBoostPurchase(req.params.id);
      console.log(`[Payment Slip] Purchase found:`, purchase?.id, purchase?.paymentSlipUrl);
      
      if (!purchase || !purchase.paymentSlipUrl) {
        console.log(`[Payment Slip] Not found - purchase exists: ${!!purchase}, has URL: ${!!purchase?.paymentSlipUrl}`);
        return res.status(404).json({ message: "Payment slip not found" });
      }

      // Get signed URL for private object
      console.log(`[Payment Slip] Generating signed URL for: ${purchase.paymentSlipUrl}`);
      const signedUrl = await objectStorageService.getObjectReadURL(purchase.paymentSlipUrl);
      console.log(`[Payment Slip] Signed URL generated successfully`);
      res.json({ url: signedUrl });
    } catch (error: any) {
      console.error(`[Payment Slip] Error:`, error);
      res.status(500).json({ message: error.message });
    }
  });

  // IPG Webhook - Handle automatic payment confirmations from payment gateway
  app.post("/api/ipg/webhook", async (req: Request, res: Response) => {
    try {
      const {
        transactionId,
        paymentReference,
        transactionType, // "order", "booking", or "boost"
        entityId, // The ID of the order/booking/boost_purchase
        status, // Payment status from IPG
        amount,
        currency,
        ipgData, // Raw data from IPG for audit
      } = req.body;

      // Validate required fields
      if (!paymentReference || !transactionType || !entityId || !status) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Verify payment was successful
      if (status !== "success" && status !== "approved" && status !== "paid") {
        return res.status(400).json({ message: "Payment not successful" });
      }

      // Handle different transaction types
      if (transactionType === "order") {
        const order = await storage.getOrder(entityId);
        if (!order) {
          return res.status(404).json({ message: "Order not found" });
        }

        // Verify payment method is IPG
        if (order.paymentMethod !== "ipg") {
          return res.status(400).json({ message: "Order payment method is not IPG" });
        }

        // Update order to paid
        await db.update(orders)
          .set({ 
            status: "paid",
            paymentReference,
            updatedAt: new Date()
          })
          .where(eq(orders.id, entityId));

        // Update transaction to escrow
        await db.update(transactions)
          .set({ status: "escrow" })
          .where(eq(transactions.orderId, entityId));

        // Send notification to buyer
        await notifyOrderPaid({
          buyerId: order.buyerId,
          orderId: order.id,
        });

        return res.json({ message: "Order payment confirmed successfully" });
      }

      if (transactionType === "booking") {
        const booking = await storage.getBooking(entityId);
        if (!booking) {
          return res.status(404).json({ message: "Booking not found" });
        }

        // Verify payment method is IPG
        if (booking.paymentMethod !== "ipg") {
          return res.status(400).json({ message: "Booking payment method is not IPG" });
        }

        // Update booking to paid
        await db.update(bookings)
          .set({ 
            status: "paid",
            paymentReference,
            updatedAt: new Date()
          })
          .where(eq(bookings.id, entityId));

        // Update transaction to escrow
        await db.update(transactions)
          .set({ status: "escrow" })
          .where(eq(transactions.bookingId, entityId));

        // Send notification to buyer and seller
        const serviceData = await storage.getService(booking.serviceId);
        if (serviceData) {
          await notifyBookingPaid({
            buyerId: booking.buyerId,
            sellerId: booking.sellerId,
            bookingId: booking.id,
            serviceName: serviceData.name,
          });
        }

        return res.json({ message: "Booking payment confirmed successfully" });
      }

      if (transactionType === "boost") {
        const { boostPurchases } = await import("@shared/schema");
        
        const purchase = await storage.getBoostPurchase(entityId);
        if (!purchase) {
          return res.status(404).json({ message: "Boost purchase not found" });
        }

        // Verify payment method is IPG
        if (purchase.paymentMethod !== "ipg") {
          return res.status(400).json({ message: "Boost purchase payment method is not IPG" });
        }

        // Get the boost package details
        const boostPackage = await storage.getBoostPackage(purchase.packageId);
        if (!boostPackage) {
          return res.status(404).json({ message: "Boost package not found" });
        }

        // Update boost purchase to paid
        await db.update(boostPurchases)
          .set({ 
            status: "paid",
            paidAt: new Date(),
            paymentReference,
            paymentDetails: ipgData
          })
          .where(eq(boostPurchases.id, entityId));

        // Update transaction to escrow
        await db.update(transactions)
          .set({ status: "escrow" })
          .where(eq(transactions.boostPurchaseId, entityId));

        // Create and activate the boosted item
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + boostPackage.durationDays);

        const boostedItem = await storage.createBoostedItem({
          itemType: purchase.itemType,
          itemId: purchase.itemId,
          packageId: purchase.packageId,
          endDate,
          isActive: true,
        });

        // Link the purchase to the boosted item
        await storage.linkBoostPurchaseToBoost(purchase.id, boostedItem.id);

        // Get item name for notification
        let itemName = "your item";
        if (purchase.itemType === "product") {
          const product = await storage.getProduct(purchase.itemId);
          itemName = product?.name || itemName;
        } else if (purchase.itemType === "service") {
          const service = await storage.getService(purchase.itemId);
          itemName = service?.name || itemName;
        }

        // Send notification (with email - major event!)
        await notifyBoostPaymentConfirmed({
          sellerId: purchase.sellerId,
          packageName: boostPackage.name,
          itemName,
          boostDuration: `${boostPackage.durationDays} days`,
        });

        return res.json({ message: "Boost payment confirmed and activated successfully" });
      }

      return res.status(400).json({ message: "Invalid transaction type" });
    } catch (error: any) {
      console.error("IPG webhook error:", error);
      return res.status(500).json({ message: error.message });
    }
  });

  // Setup shipping address routes
  setupShippingRoutes(app);
  
  // Setup quote and design approval routes
  setupQuoteApprovalRoutes(app);

  // Setup notification routes
  app.use("/api/notifications", isAuthenticated, notificationRoutes);
  
  // Setup email verification routes
  app.use("/api/auth", emailVerificationRoutes);

  // ========================================
  // Bank Account Routes (for TT payments)
  // ========================================
  
  // Public route - Get public/buyer-facing bank accounts for checkout
  app.get("/api/bank-accounts", async (req: Request, res: Response) => {
    try {
      const currency = req.query.currency as string | undefined;
      let accounts = await storage.getPublicBankAccounts(); // Only public/buyer-facing accounts
      
      // Filter by currency if specified
      if (currency) {
        accounts = accounts.filter(account => account.currency === currency);
      }
      
      res.json(accounts);
    } catch (error: any) {
      console.error("Error fetching public bank accounts:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Admin routes - Bank account management
  
  app.get("/api/admin/bank-accounts", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const includeInactive = req.query.includeInactive === "true";
      const accounts = await storage.getBankAccounts(includeInactive);
      res.json(accounts);
    } catch (error: any) {
      console.error("Error fetching bank accounts:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/bank-accounts/:id", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const account = await storage.getBankAccount(id);
      
      if (!account) {
        return res.status(404).json({ message: "Bank account not found" });
      }
      
      res.json(account);
    } catch (error: any) {
      console.error("Error fetching bank account:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/bank-accounts", isAuthenticated, requireRole(["admin"]), async (req: AuthRequest, res: Response) => {
    try {
      const adminId = req.user!.id;
      const validatedData = insertBankAccountSchema.parse(req.body);
      
      const account = await storage.createBankAccount({
        ...validatedData,
        createdByAdminId: adminId,
      });
      
      res.status(201).json(account);
    } catch (error: any) {
      console.error("Error creating bank account:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/bank-accounts/:id", isAuthenticated, requireRole(["admin"]), async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const adminId = req.user!.id;
      const validatedData = updateBankAccountSchema.parse(req.body);
      
      const account = await storage.updateBankAccount(id, {
        ...validatedData,
        updatedByAdminId: adminId,
      });
      
      res.json(account);
    } catch (error: any) {
      console.error("Error updating bank account:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/bank-accounts/:id", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteBankAccount(id);
      res.json({ message: "Bank account deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting bank account:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/bank-accounts/:id/set-default", isAuthenticated, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const account = await storage.setDefaultBankAccount(id);
      res.json(account);
    } catch (error: any) {
      console.error("Error setting default bank account:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Admin initialization endpoint - creates admin user if none exists
  app.post("/api/admin/initialize", async (req: Request, res: Response) => {
    const timestamp = new Date().toISOString();
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    
    try {
      // Verify ADMIN_INIT_TOKEN environment variable is set
      const expectedToken = process.env.ADMIN_INIT_TOKEN;
      
      if (!expectedToken) {
        console.log(`[ADMIN INIT] FAILED - Missing ADMIN_INIT_TOKEN environment variable at ${timestamp} from IP ${clientIp}`);
        return res.status(500).json({ 
          message: "Server misconfigured: ADMIN_INIT_TOKEN environment variable is not set" 
        });
      }

      // Verify initialization token for security
      const { initToken } = req.body;
      
      if (initToken !== expectedToken) {
        console.log(`[ADMIN INIT] FAILED - Invalid token attempt at ${timestamp} from IP ${clientIp}`);
        return res.status(401).json({ 
          message: "Invalid initialization token" 
        });
      }

      // Check if any admin users exist
      const existingAdmins = await db.select()
        .from(users)
        .where(eq(users.role, "admin"));
      
      if (existingAdmins.length > 0) {
        console.log(`[ADMIN INIT] FAILED - Admin already exists, attempt at ${timestamp} from IP ${clientIp}`);
        return res.status(400).json({ 
          message: "Admin already exists. This endpoint can only be used when no admin exists." 
        });
      }

      // Import bcrypt for password hashing
      const bcrypt = await import("bcrypt");
      
      // Create admin user with predefined credentials
      const adminEmail = "ranuka.wijayapala@gmail.com";
      const adminPassword = "Admin@123"; // Default password - user should change after first login
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      const [adminUser] = await db.insert(users).values({
        email: adminEmail,
        password: hashedPassword,
        firstName: "Ranuka",
        lastName: "Wijayapala",
        role: "admin",
        emailVerified: true, // Admin is pre-verified
        verificationStatus: "approved",
      }).returning();

      // Log successful initialization for security audit
      console.log(`[ADMIN INIT] SUCCESS - Admin user created: ${adminEmail} at ${timestamp} from IP ${clientIp}`);

      res.json({ 
        message: "Admin user created successfully",
        email: adminEmail,
        defaultPassword: adminPassword,
        note: "IMPORTANT: Change the default password immediately after first login"
      });
    } catch (error: any) {
      console.error(`[ADMIN INIT] FAILED - Internal error at ${timestamp} from IP ${clientIp}:`, error);
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
