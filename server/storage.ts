// Referenced from javascript_log_in_with_replit and javascript_database blueprints
import {
  users,
  products,
  productVariants,
  cartItems,
  services,
  servicePackages,
  orders,
  orderItems,
  bookings,
  transactions,
  orderRatings,
  bookingRatings,
  homepageBanners,
  conversations,
  messages,
  messageAttachments,
  adminMessageTemplates,
  type User,
  type UpsertUser,
  type Product,
  type InsertProduct,
  type ProductVariant,
  type InsertProductVariant,
  type CartItem,
  type InsertCartItem,
  type Service,
  type InsertService,
  type ServicePackage,
  type InsertServicePackage,
  type Order,
  type InsertOrder,
  type Booking,
  type InsertBooking,
  type Transaction,
  type OrderRating,
  type InsertOrderRating,
  type BookingRating,
  type InsertBookingRating,
  type HomepageBanner,
  type InsertHomepageBanner,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type MessageAttachment,
  type InsertMessageAttachment,
  type AdminMessageTemplate,
  type InsertAdminMessageTemplate,
  type UserRole,
  type VerificationStatus,
  type ConversationType,
  type ConversationStatus,
  type BannerType,
  boostPackages,
  boostedItems,
  boostPurchases,
  type BoostPackage,
  type InsertBoostPackage,
  type BoostedItem,
  type InsertBoostedItem,
  type BoostedItemType,
  type BoostPurchase,
  type InsertBoostPurchase,
  type BoostPurchaseStatus,
  returnRequests,
  type ReturnRequest,
  type InsertReturnRequest,
  type ReturnRequestStatus,
  type ReturnRequestReason,
  type SellerReturnStatus,
  quotes,
  designApprovals,
  type Quote,
  type InsertQuote,
  type QuoteStatus,
  type DesignApproval,
  type InsertDesignApproval,
  type DesignApprovalStatus,
  bankAccounts,
  type BankAccount,
  type InsertBankAccount,
  type UpdateBankAccount,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, lt, gte, inArray } from "drizzle-orm";

/**
 * Currency/Decimal Conversion Utilities
 * Drizzle ORM requires decimal columns to be string values, not numbers.
 * Use these helpers to safely convert numeric values for database storage.
 */

/**
 * Converts a numeric amount to a decimal string for database storage
 * @param amount - Number, string, null, or undefined representing a decimal value
 * @param precision - Number of decimal places (default: 2 for currency)
 * @returns String formatted to specified decimal places (e.g., "19.99"), or undefined if input is null/undefined
 * @throws Error if amount is NaN or Infinity
 */
function toDecimalString(amount: number | string | null | undefined, precision: number = 2): string | undefined {
  if (amount === null || amount === undefined) return undefined;
  if (typeof amount === 'string') return amount;
  if (!isFinite(amount)) {
    throw new Error(`Invalid decimal value: ${amount} (must be finite number)`);
  }
  return amount.toFixed(precision);
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(userId: string, role: UserRole, verificationDocumentUrl: string): Promise<User>;
  updateUserVerificationStatus(userId: string, status: VerificationStatus, rejectionReason?: string): Promise<User>;
  updateUserCommission(userId: string, rate: string): Promise<User>;
  getAllUsers(roleFilter?: string, statusFilter?: string): Promise<User[]>;
  
  createProduct(product: InsertProduct & { sellerId: string }): Promise<Product>;
  updateProduct(id: string, sellerId: string, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: string, sellerId: string): Promise<void>;
  getProducts(sellerId?: string): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  
  createProductVariant(variant: InsertProductVariant): Promise<ProductVariant>;
  getProductVariants(productId: string): Promise<ProductVariant[]>;
  updateProductVariant(id: string, sellerId: string, variant: Partial<InsertProductVariant>): Promise<ProductVariant>;
  deleteProductVariant(id: string, sellerId: string): Promise<void>;
  getProductVariantById(variantId: string): Promise<ProductVariant | undefined>;
  
  addToCart(buyerId: string, cartItem: InsertCartItem): Promise<CartItem>;
  getCartItems(buyerId: string): Promise<CartItem[]>;
  updateCartItem(id: string, buyerId: string, quantity: number): Promise<CartItem>;
  removeFromCart(id: string, buyerId: string): Promise<void>;
  clearCart(buyerId: string): Promise<void>;
  
  createService(service: InsertService & { sellerId: string }): Promise<Service>;
  getServices(sellerId?: string): Promise<Service[]>;
  getService(id: string): Promise<Service | undefined>;
  
  createServicePackage(pkg: InsertServicePackage): Promise<ServicePackage>;
  getServicePackages(serviceId: string): Promise<ServicePackage[]>;
  getServicePackageById(packageId: string): Promise<ServicePackage | undefined>;
  
  createOrder(order: InsertOrder & { buyerId: string }): Promise<Order>;
  getOrders(buyerId?: string, sellerId?: string): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  incrementOrderReturnAttempts(orderId: string): Promise<Order>;
  
  createBooking(booking: InsertBooking & { buyerId: string, sellerId: string }): Promise<Booking>;
  getBookings(buyerId?: string, sellerId?: string): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking | undefined>;
  
  createTransaction(transaction: Omit<Transaction, "id" | "createdAt" | "updatedAt">): Promise<Transaction>;
  getTransactions(sellerId?: string): Promise<Transaction[]>;
  releaseTransaction(transactionId: string): Promise<Transaction>;
  
  createHomepageBanner(banner: InsertHomepageBanner): Promise<HomepageBanner>;
  getHomepageBanners(includeInactive?: boolean, type?: BannerType): Promise<HomepageBanner[]>;
  updateHomepageBanner(id: string, banner: Partial<InsertHomepageBanner>): Promise<HomepageBanner>;
  deleteHomepageBanner(id: string): Promise<void>;
  reorderBanner(id: string, direction: "up" | "down"): Promise<void>;
  
  // Comprehensive rating system - only after verified delivery/completion
  createOrderRating(rating: InsertOrderRating & { buyerId: string; sellerId: string; orderId: string }): Promise<OrderRating>;
  createBookingRating(rating: InsertBookingRating & { buyerId: string; sellerId: string; bookingId: string }): Promise<BookingRating>;
  getOrderRating(orderId: string): Promise<OrderRating | undefined>;
  getBookingRating(bookingId: string): Promise<BookingRating | undefined>;
  getSellerRatings(sellerId: string): Promise<Array<{
    id: string;
    rating: number;
    comment: string | null;
    images: string[] | null;
    createdAt: Date;
    buyer: { firstName: string | null; lastName: string | null };
    order?: { id: string };
    booking?: { id: string };
  }>>;
  canRateOrder(orderId: string, buyerId: string): Promise<{ canRate: boolean; reason?: string }>;
  canRateBooking(bookingId: string, buyerId: string): Promise<{ canRate: boolean; reason?: string }>;
  
  // Messaging system
  createConversation(conversation: InsertConversation & { buyerId: string, sellerId?: string | null }): Promise<Conversation>;
  findExistingConversation(params: {
    buyerId: string;
    sellerId?: string | null;
    type: ConversationType;
    productId?: string | null;
    serviceId?: string | null;
    orderId?: string | null;
    bookingId?: string | null;
  }): Promise<Conversation | undefined>;
  getConversations(userId: string, userRole: UserRole): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  updateConversationStatus(id: string, status: ConversationStatus): Promise<Conversation>;
  addWorkflowContext(conversationId: string, context: "product" | "quote"): Promise<Conversation>;
  
  createMessage(message: InsertMessage & { senderId: string; senderRole: UserRole; conversationId: string }): Promise<Message>;
  getMessages(conversationId: string): Promise<Message[]>;
  markMessageAsRead(messageId: string): Promise<Message>;
  markConversationMessagesAsRead(conversationId: string, userId: string): Promise<void>;
  
  createMessageAttachment(attachment: InsertMessageAttachment & { messageId: string }): Promise<MessageAttachment>;
  getMessageAttachments(messageId: string): Promise<MessageAttachment[]>;
  
  createAdminMessageTemplate(template: InsertAdminMessageTemplate): Promise<AdminMessageTemplate>;
  getAdminMessageTemplates(category?: string): Promise<AdminMessageTemplate[]>;
  updateAdminMessageTemplate(id: string, template: Partial<InsertAdminMessageTemplate>): Promise<AdminMessageTemplate>;
  deleteAdminMessageTemplate(id: string): Promise<void>;
  
  // Boost packages
  createBoostPackage(pkg: InsertBoostPackage): Promise<BoostPackage>;
  getBoostPackages(includeInactive?: boolean): Promise<BoostPackage[]>;
  getBoostPackage(id: string): Promise<BoostPackage | undefined>;
  updateBoostPackage(id: string, pkg: Partial<InsertBoostPackage>): Promise<BoostPackage>;
  deleteBoostPackage(id: string): Promise<void>;
  
  // Boosted items
  createBoostedItem(item: InsertBoostedItem): Promise<BoostedItem>;
  getBoostedItems(itemType?: BoostedItemType, activeOnly?: boolean): Promise<BoostedItem[]>;
  getBoostedItem(id: string): Promise<BoostedItem | undefined>;
  getBoostedItemByItemId(itemId: string, itemType: BoostedItemType): Promise<BoostedItem | undefined>;
  deleteBoostedItem(id: string): Promise<void>;
  expireOldBoosts(): Promise<void>;
  
  // Boost purchases
  createBoostPurchase(purchaseData: InsertBoostPurchase): Promise<BoostPurchase>;
  getBoostPurchases(sellerId?: string, status?: BoostPurchaseStatus): Promise<BoostPurchase[]>;
  getBoostPurchase(id: string): Promise<BoostPurchase | undefined>;
  updateBoostPurchaseStatus(id: string, status: BoostPurchaseStatus, paymentReference?: string, paymentDetails?: any): Promise<BoostPurchase>;
  linkBoostPurchaseToBoost(purchaseId: string, boostedItemId: string): Promise<BoostPurchase>;
  
  // Return Requests
  createReturnRequest(data: InsertReturnRequest & { buyerId: string, sellerId?: string }): Promise<ReturnRequest>;
  getReturnRequests(filters?: { 
    buyerId?: string, 
    sellerId?: string, 
    orderId?: string,
    bookingId?: string,
    status?: ReturnRequestStatus 
  }): Promise<ReturnRequest[]>;
  getReturnRequest(id: string): Promise<ReturnRequest | undefined>;
  findReturnRequestForSource(filters: { 
    orderId?: string, 
    bookingId?: string,
    statusFilter?: ReturnRequestStatus[]
  }): Promise<ReturnRequest | undefined>;
  
  // Status transition helpers
  markReturnRequestUnderReview(id: string): Promise<ReturnRequest>;
  updateSellerResponse(id: string, response: {
    sellerStatus: SellerReturnStatus,
    sellerResponse: string,
    sellerProposedRefundAmount?: number
  }): Promise<ReturnRequest>;
  applyAdminResolution(id: string, adminId: string, resolution: {
    status: ReturnRequestStatus,
    approvedRefundAmount?: number,
    adminNotes?: string,
    adminOverride?: boolean
  }): Promise<ReturnRequest>;
  markReturnRequestRefunded(id: string): Promise<ReturnRequest>;
  markReturnRequestCompleted(id: string): Promise<ReturnRequest>;
  
  // Commission helpers
  calculateCommissionReversal(refundAmount: number, commissionRate: number): number;
  
  // Refund processing
  processReturnRequestRefund(returnRequestId: string): Promise<void>;
  
  // Quote management
  createQuote(quote: InsertQuote & { conversationId: string; buyerId: string; sellerId: string }): Promise<Quote>;
  updateQuote(id: string, updates: Partial<InsertQuote> & { status?: QuoteStatus; updatedAt?: Date }): Promise<Quote>;
  getQuote(id: string): Promise<Quote | undefined>;
  getQuotesByConversation(conversationId: string): Promise<Quote[]>;
  getQuotesByBuyer(buyerId: string, status?: QuoteStatus): Promise<Quote[]>;
  getQuotesBySeller(sellerId: string, status?: QuoteStatus): Promise<Quote[]>;
  acceptQuote(id: string, buyerId: string): Promise<Quote>;
  rejectQuote(id: string, buyerId: string, reason?: string): Promise<Quote>;
  supersedePreviousQuotes(conversationId: string, newQuoteId: string): Promise<void>;
  expireOldQuotes(): Promise<void>;
  getActiveQuoteForItem(buyerId: string, productId?: string, serviceId?: string): Promise<Quote | undefined>;
  getActiveQuoteForConversation(conversationId: string): Promise<Quote | undefined>;
  
  // Design approval management
  createDesignApproval(approval: InsertDesignApproval & { conversationId: string; buyerId: string; sellerId: string }): Promise<DesignApproval>;
  getDesignApproval(id: string): Promise<DesignApproval | undefined>;
  getDesignApprovalsByConversation(conversationId: string): Promise<DesignApproval[]>;
  getDesignApprovalsByBuyer(buyerId: string, status?: DesignApprovalStatus): Promise<DesignApproval[]>;
  getDesignApprovalsBySeller(sellerId: string, status?: DesignApprovalStatus): Promise<DesignApproval[]>;
  approveDesign(id: string, sellerId: string, notes?: string): Promise<DesignApproval>;
  rejectDesign(id: string, sellerId: string, notes: string): Promise<DesignApproval>;
  requestDesignChanges(id: string, sellerId: string, notes: string): Promise<DesignApproval>;
  copyDesignApprovalToTarget(sourceId: string, buyerId: string, targetVariantId?: string, targetPackageId?: string): Promise<DesignApproval>;
  getApprovedDesignForItem(buyerId: string, productId?: string, serviceId?: string, variantId?: string, packageId?: string): Promise<DesignApproval | undefined>;
  getApprovedDesignForConversation(conversationId: string): Promise<DesignApproval | undefined>;
  resubmitDesign(id: string, buyerId: string, newFiles: DesignApproval['designFiles']): Promise<DesignApproval>;
  getApprovedDesignsLibrary(buyerId: string): Promise<DesignApproval[]>;
  getProductApprovedVariants(productId: string, buyerId: string): Promise<{variantId: string | null, designApprovalId: string, status: string, approvedAt: Date | null}[]>;
  
  // Purchase requirement validation
  validatePurchaseRequirements(params: {
    kind: "product" | "service";
    itemId: string;
    buyerId: string;
    variantId?: string;
    packageId?: string;
  }): Promise<{
    canPurchase: boolean;
    requiresQuote: boolean;
    requiresDesignApproval: boolean;
    quoteStatus?: "none" | "pending" | "sent" | "accepted" | "rejected" | "expired" | "superseded";
    designStatus?: "none" | "pending" | "approved" | "rejected" | "changes_requested";
    blockingReasonCodes: ("item_not_found" | "quote_missing" | "quote_pending" | "quote_expired" | "quote_rejected" | "design_missing" | "design_pending" | "design_rejected" | "design_changes_requested")[];
    missingRequirements: string[];
  }>;
  
  // Bank Account management (for international TT payments)
  createBankAccount(account: InsertBankAccount & { createdByAdminId: string }): Promise<BankAccount>;
  getBankAccounts(includeInactive?: boolean): Promise<BankAccount[]>;
  getPublicBankAccounts(): Promise<BankAccount[]>; // Only public/buyer-facing accounts
  getBankAccount(id: string): Promise<BankAccount | undefined>;
  updateBankAccount(id: string, account: UpdateBankAccount & { updatedByAdminId: string }): Promise<BankAccount>;
  deleteBankAccount(id: string): Promise<void>;
  setDefaultBankAccount(id: string): Promise<BankAccount>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserRole(userId: string, role: UserRole, verificationDocumentUrl: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        role,
        verificationDocumentUrl,
        verificationStatus: "pending",
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserVerificationStatus(userId: string, status: VerificationStatus, rejectionReason?: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        verificationStatus: status,
        verificationRejectionReason: status === "rejected" ? rejectionReason : null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserCommission(userId: string, rate: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        commissionRate: rate,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getAllUsers(roleFilter?: string, statusFilter?: string): Promise<User[]> {
    let query = db.select().from(users);
    const conditions = [];
    if (roleFilter && roleFilter !== "all") {
      conditions.push(eq(users.role, roleFilter as UserRole));
    }
    if (statusFilter && statusFilter !== "all") {
      conditions.push(eq(users.verificationStatus, statusFilter as VerificationStatus));
    }
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    return await query;
  }

  async createProduct(productData: InsertProduct & { sellerId: string }): Promise<Product> {
    const [product] = await db.insert(products).values(productData).returning();
    return product;
  }

  async updateProduct(id: string, sellerId: string, productData: Partial<InsertProduct>): Promise<Product> {
    const [product] = await db
      .update(products)
      .set({ ...productData, updatedAt: new Date() })
      .where(and(eq(products.id, id), eq(products.sellerId, sellerId)))
      .returning();
    if (!product) {
      throw new Error("Product not found or unauthorized");
    }
    return product;
  }

  async deleteProduct(id: string, sellerId: string): Promise<void> {
    await db
      .delete(products)
      .where(and(eq(products.id, id), eq(products.sellerId, sellerId)));
  }

  async getProducts(sellerId?: string): Promise<Product[]> {
    if (sellerId) {
      return await db.select().from(products).where(eq(products.sellerId, sellerId));
    }
    return await db.select().from(products).where(eq(products.isActive, true));
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [result] = await db
      .select({
        product: products,
        seller: users,
      })
      .from(products)
      .leftJoin(users, eq(products.sellerId, users.id))
      .where(eq(products.id, id));
    
    if (!result) return undefined;
    
    return {
      ...result.product,
      seller: result.seller || undefined,
    } as any;
  }

  async createProductVariant(variantData: InsertProductVariant): Promise<ProductVariant> {
    const values: any = {
      ...variantData,
      price: toDecimalString(variantData.price)!,  // Required field, non-null assertion safe
    };
    
    // Optional decimal fields - only include if defined
    if (variantData.weight !== undefined) values.weight = toDecimalString(variantData.weight, 3);
    if (variantData.length !== undefined) values.length = toDecimalString(variantData.length, 2);
    if (variantData.width !== undefined) values.width = toDecimalString(variantData.width, 2);
    if (variantData.height !== undefined) values.height = toDecimalString(variantData.height, 2);
    
    const [variant] = await db.insert(productVariants).values(values).returning();
    return variant;
  }

  async getProductVariants(productId: string): Promise<ProductVariant[]> {
    return await db.select().from(productVariants).where(eq(productVariants.productId, productId));
  }

  async getProductVariantById(variantId: string): Promise<ProductVariant | undefined> {
    const [variant] = await db.select().from(productVariants).where(eq(productVariants.id, variantId));
    return variant;
  }

  async updateProductVariant(id: string, sellerId: string, variantData: Partial<InsertProductVariant>): Promise<ProductVariant> {
    // Verify the variant belongs to a product owned by this seller
    const [variant] = await db
      .select({ variant: productVariants, product: products })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(and(
        eq(productVariants.id, id),
        eq(products.sellerId, sellerId)
      ));

    if (!variant) {
      throw new Error("Variant not found or you don't have permission to update it");
    }

    const values: any = { ...variantData };
    
    // Convert decimal fields to strings if provided
    if (variantData.price !== undefined) values.price = toDecimalString(variantData.price)!;
    if (variantData.weight !== undefined) values.weight = toDecimalString(variantData.weight, 3);
    if (variantData.length !== undefined) values.length = toDecimalString(variantData.length, 2);
    if (variantData.width !== undefined) values.width = toDecimalString(variantData.width, 2);
    if (variantData.height !== undefined) values.height = toDecimalString(variantData.height, 2);

    const [updated] = await db
      .update(productVariants)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(productVariants.id, id))
      .returning();

    return updated;
  }

  async deleteProductVariant(id: string, sellerId: string): Promise<void> {
    // Verify the variant belongs to a product owned by this seller
    const [variant] = await db
      .select({ variant: productVariants, product: products })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(and(
        eq(productVariants.id, id),
        eq(products.sellerId, sellerId)
      ));

    if (!variant) {
      throw new Error("Variant not found or you don't have permission to delete it");
    }

    await db.delete(productVariants).where(eq(productVariants.id, id));
  }

  async addToCart(buyerId: string, cartItemData: InsertCartItem): Promise<CartItem> {
    // Build merge conditions based on what's being added
    const mergeConditions = [
      eq(cartItems.buyerId, buyerId),
      eq(cartItems.productVariantId, cartItemData.productVariantId)
    ];
    
    // For quotes and design approvals: only merge if the exact same ID matches
    // This preserves unique context while allowing quantity consolidation
    if (cartItemData.quoteId) {
      mergeConditions.push(eq(cartItems.quoteId, cartItemData.quoteId));
    } else {
      mergeConditions.push(sql`${cartItems.quoteId} IS NULL`);
    }
    
    if (cartItemData.designApprovalId) {
      mergeConditions.push(eq(cartItems.designApprovalId, cartItemData.designApprovalId));
    } else {
      mergeConditions.push(sql`${cartItems.designApprovalId} IS NULL`);
    }
    
    const existing = await db
      .select()
      .from(cartItems)
      .where(and(...mergeConditions));
    
    if (existing.length > 0) {
      const [updated] = await db
        .update(cartItems)
        .set({ 
          quantity: existing[0].quantity + cartItemData.quantity,
          updatedAt: new Date()
        })
        .where(eq(cartItems.id, existing[0].id))
        .returning();
      return updated;
    }
    
    const [cartItem] = await db
      .insert(cartItems)
      .values({ ...cartItemData, buyerId })
      .returning();
    return cartItem;
  }

  async getCartItems(buyerId: string): Promise<any[]> {
    const results = await db
      .select({
        cartItem: cartItems,
        variant: productVariants,
        product: products,
        quote: quotes,
        designApproval: designApprovals,
      })
      .from(cartItems)
      .innerJoin(productVariants, eq(cartItems.productVariantId, productVariants.id))
      .innerJoin(products, eq(productVariants.productId, products.id))
      .leftJoin(quotes, eq(cartItems.quoteId, quotes.id))
      .leftJoin(designApprovals, eq(cartItems.designApprovalId, designApprovals.id))
      .where(eq(cartItems.buyerId, buyerId))
      .orderBy(desc(cartItems.createdAt));

    // Enrich with effectiveUnitPrice (quote price if available, else variant price)
    return results.map(row => ({
      ...row.cartItem,
      variant: {
        ...row.variant,
        product: {
          id: row.product.id,
          name: row.product.name,
          images: row.product.images,
          sellerId: row.product.sellerId,
        }
      },
      quote: row.quote || undefined,
      designApproval: row.designApproval || undefined,
      effectiveUnitPrice: row.quote?.quotedPrice || row.variant.price,
    }));
  }

  async updateCartItem(id: string, buyerId: string, quantity: number): Promise<CartItem> {
    const [cartItem] = await db
      .update(cartItems)
      .set({ quantity, updatedAt: new Date() })
      .where(and(eq(cartItems.id, id), eq(cartItems.buyerId, buyerId)))
      .returning();
    return cartItem;
  }

  async removeFromCart(id: string, buyerId: string): Promise<void> {
    await db
      .delete(cartItems)
      .where(and(eq(cartItems.id, id), eq(cartItems.buyerId, buyerId)));
  }

  async clearCart(buyerId: string): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.buyerId, buyerId));
  }

  async createService(serviceData: InsertService & { sellerId: string }): Promise<Service> {
    const [service] = await db.insert(services).values(serviceData).returning();
    return service;
  }

  async getServices(sellerId?: string): Promise<Service[]> {
    if (sellerId) {
      return await db.select().from(services).where(eq(services.sellerId, sellerId));
    }
    return await db.select().from(services).where(eq(services.isActive, true));
  }

  async getService(id: string): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service;
  }

  async updateService(id: string, sellerId: string, serviceData: Partial<InsertService>): Promise<Service> {
    const [service] = await db
      .update(services)
      .set(serviceData)
      .where(and(eq(services.id, id), eq(services.sellerId, sellerId)))
      .returning();
    return service;
  }

  async deleteService(id: string, sellerId: string): Promise<void> {
    await db
      .delete(services)
      .where(and(eq(services.id, id), eq(services.sellerId, sellerId)));
  }

  async createServicePackage(pkgData: InsertServicePackage): Promise<ServicePackage> {
    const [pkg] = await db.insert(servicePackages).values(pkgData).returning();
    return pkg;
  }

  async getServicePackages(serviceId: string): Promise<ServicePackage[]> {
    return await db.select().from(servicePackages).where(eq(servicePackages.serviceId, serviceId));
  }

  async getServicePackageById(packageId: string): Promise<ServicePackage | undefined> {
    const [pkg] = await db.select().from(servicePackages).where(eq(servicePackages.id, packageId));
    return pkg;
  }

  async getServicePackage(packageId: string): Promise<ServicePackage | undefined> {
    const [pkg] = await db.select().from(servicePackages).where(eq(servicePackages.id, packageId));
    return pkg;
  }

  async updateServicePackage(packageId: string, pkgData: Partial<InsertServicePackage>): Promise<ServicePackage> {
    const [pkg] = await db.update(servicePackages)
      .set({ ...pkgData, updatedAt: new Date() })
      .where(eq(servicePackages.id, packageId))
      .returning();
    return pkg;
  }

  async deleteServicePackage(packageId: string): Promise<void> {
    await db.delete(servicePackages).where(eq(servicePackages.id, packageId));
  }

  async createOrder(orderData: InsertOrder & { buyerId: string }): Promise<Order> {
    const results = await db.insert(orders).values(orderData as any).returning().execute() as Order[];
    return results[0];
  }

  async getOrders(buyerId?: string, sellerId?: string): Promise<Order[]> {
    if (buyerId) {
      return await db.select().from(orders).where(eq(orders.buyerId, buyerId)).orderBy(desc(orders.createdAt));
    }
    if (sellerId) {
      return await db.select().from(orders).where(eq(orders.sellerId, sellerId)).orderBy(desc(orders.createdAt));
    }
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async updateOrderStatus(id: string, status: string): Promise<Order> {
    const [order] = await db
      .update(orders)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  async incrementOrderReturnAttempts(orderId: string): Promise<Order> {
    const [order] = await db
      .update(orders)
      .set({ 
        returnAttemptCount: sql`${orders.returnAttemptCount} + 1`,
        updatedAt: new Date() 
      })
      .where(eq(orders.id, orderId))
      .returning();
    return order;
  }

  async createBooking(bookingData: InsertBooking & { buyerId: string, sellerId: string }): Promise<Booking> {
    const [booking] = await db.insert(bookings).values({
      buyerId: bookingData.buyerId,
      sellerId: bookingData.sellerId,
      serviceId: bookingData.serviceId,
      packageId: bookingData.packageId,
      scheduledDate: bookingData.scheduledDate,
      amount: toDecimalString(bookingData.amount)!,
      status: bookingData.status,
      scheduledTime: bookingData.scheduledTime,
      notes: bookingData.notes,
      paymentMethod: bookingData.paymentMethod,
      paymentReference: bookingData.paymentReference,
      paymentLink: bookingData.paymentLink,
      quoteId: bookingData.quoteId,
      designApprovalId: bookingData.designApprovalId,
      quantity: bookingData.quantity,
    } as any).returning();
    return booking;
  }

  async getBookings(buyerId?: string, sellerId?: string): Promise<Booking[]> {
    if (buyerId) {
      return await db.select().from(bookings).where(eq(bookings.buyerId, buyerId)).orderBy(desc(bookings.createdAt));
    }
    if (sellerId) {
      return await db.select().from(bookings).where(eq(bookings.sellerId, sellerId)).orderBy(desc(bookings.createdAt));
    }
    return await db.select().from(bookings).orderBy(desc(bookings.createdAt));
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking;
  }

  async updateBookingStatus(id: string, status: string): Promise<Booking> {
    const [booking] = await db
      .update(bookings)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    return booking;
  }

  async createTransaction(transactionData: Omit<Transaction, "id" | "createdAt" | "updatedAt">): Promise<Transaction> {
    const [transaction] = await db.insert(transactions).values(transactionData).returning();
    return transaction;
  }

  async getTransactions(sellerId?: string): Promise<Transaction[]> {
    if (sellerId) {
      return await db.select().from(transactions).where(eq(transactions.sellerId, sellerId)).orderBy(desc(transactions.createdAt));
    }
    return await db.select().from(transactions).orderBy(desc(transactions.createdAt));
  }

  async releaseTransaction(transactionId: string): Promise<Transaction> {
    const [existingTransaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId));
    
    if (!existingTransaction) {
      throw new Error("Transaction not found");
    }
    
    if (existingTransaction.status !== "escrow") {
      throw new Error(`Cannot release transaction with status "${existingTransaction.status}". Only escrow transactions can be released.`);
    }
    
    const [transaction] = await db
      .update(transactions)
      .set({
        status: "released",
        releasedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, transactionId))
      .returning();
    
    return transaction;
  }

  async createHomepageBanner(bannerData: InsertHomepageBanner): Promise<HomepageBanner> {
    const [banner] = await db.insert(homepageBanners).values(bannerData).returning();
    return banner;
  }

  async getHomepageBanners(includeInactive: boolean = false, type?: BannerType): Promise<HomepageBanner[]> {
    const conditions = [];
    
    if (!includeInactive) {
      conditions.push(eq(homepageBanners.isActive, true));
    }
    
    if (type) {
      conditions.push(eq(homepageBanners.type, type));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(homepageBanners).where(and(...conditions)).orderBy(homepageBanners.displayOrder);
    }
    
    return await db.select().from(homepageBanners).orderBy(homepageBanners.displayOrder);
  }

  async updateHomepageBanner(id: string, bannerData: Partial<InsertHomepageBanner>): Promise<HomepageBanner> {
    const [banner] = await db
      .update(homepageBanners)
      .set({ ...bannerData, updatedAt: new Date() })
      .where(eq(homepageBanners.id, id))
      .returning();
    return banner;
  }

  async deleteHomepageBanner(id: string): Promise<void> {
    await db.delete(homepageBanners).where(eq(homepageBanners.id, id));
  }

  async reorderBanner(id: string, direction: "up" | "down"): Promise<void> {
    await db.transaction(async (tx) => {
      const [currentBanner] = await tx
        .select()
        .from(homepageBanners)
        .where(eq(homepageBanners.id, id));
      
      if (!currentBanner) {
        throw new Error("Banner not found");
      }

      const currentOrder = currentBanner.displayOrder;
      const targetOrder = direction === "up" ? currentOrder - 1 : currentOrder + 1;

      if (targetOrder < 0) {
        throw new Error("Cannot move banner above position 0");
      }

      const [targetBanner] = await tx
        .select()
        .from(homepageBanners)
        .where(eq(homepageBanners.displayOrder, targetOrder));
      
      if (!targetBanner) {
        throw new Error("No banner to swap with at target position");
      }

      await tx
        .update(homepageBanners)
        .set({ displayOrder: targetOrder, updatedAt: new Date() })
        .where(eq(homepageBanners.id, currentBanner.id));

      await tx
        .update(homepageBanners)
        .set({ displayOrder: currentOrder, updatedAt: new Date() })
        .where(eq(homepageBanners.id, targetBanner.id));
    });
  }

  // Comprehensive rating system implementation
  async createOrderRating(ratingData: InsertOrderRating & { buyerId: string; sellerId: string; orderId: string }): Promise<OrderRating> {
    // Verify order is delivered before allowing rating
    const canRate = await this.canRateOrder(ratingData.orderId, ratingData.buyerId);
    if (!canRate.canRate) {
      throw new Error(canRate.reason || "Cannot rate this order");
    }

    const [rating] = await db
      .insert(orderRatings)
      .values(ratingData)
      .returning();
    return rating;
  }

  async createBookingRating(ratingData: InsertBookingRating & { buyerId: string; sellerId: string; bookingId: string }): Promise<BookingRating> {
    // Verify booking is completed before allowing rating
    const canRate = await this.canRateBooking(ratingData.bookingId, ratingData.buyerId);
    if (!canRate.canRate) {
      throw new Error(canRate.reason || "Cannot rate this booking");
    }

    const [rating] = await db
      .insert(bookingRatings)
      .values(ratingData)
      .returning();
    return rating;
  }

  async getOrderRating(orderId: string): Promise<OrderRating | undefined> {
    const [rating] = await db
      .select()
      .from(orderRatings)
      .where(eq(orderRatings.orderId, orderId));
    return rating;
  }

  async getBookingRating(bookingId: string): Promise<BookingRating | undefined> {
    const [rating] = await db
      .select()
      .from(bookingRatings)
      .where(eq(bookingRatings.bookingId, bookingId));
    return rating;
  }

  async getSellerRatings(sellerId: string): Promise<Array<{
    id: string;
    rating: number;
    comment: string | null;
    images: string[] | null;
    createdAt: Date;
    buyer: { firstName: string | null; lastName: string | null };
    order?: { id: string };
    booking?: { id: string };
  }>> {
    // Fetch order ratings with buyer info
    const orderRatingsResult = await db
      .select({
        id: orderRatings.id,
        rating: orderRatings.rating,
        comment: orderRatings.comment,
        images: orderRatings.images,
        createdAt: orderRatings.createdAt,
        orderId: orderRatings.orderId,
        buyerFirstName: users.firstName,
        buyerLastName: users.lastName,
      })
      .from(orderRatings)
      .innerJoin(users, eq(orderRatings.buyerId, users.id))
      .where(eq(orderRatings.sellerId, sellerId));

    // Fetch booking ratings with buyer info
    const bookingRatingsResult = await db
      .select({
        id: bookingRatings.id,
        rating: bookingRatings.rating,
        comment: bookingRatings.comment,
        images: bookingRatings.images,
        createdAt: bookingRatings.createdAt,
        bookingId: bookingRatings.bookingId,
        buyerFirstName: users.firstName,
        buyerLastName: users.lastName,
      })
      .from(bookingRatings)
      .innerJoin(users, eq(bookingRatings.buyerId, users.id))
      .where(eq(bookingRatings.sellerId, sellerId));

    // Flatten and normalize the results
    const allRatings = [
      ...orderRatingsResult.map(r => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        images: r.images,
        createdAt: r.createdAt!,
        buyer: {
          firstName: r.buyerFirstName,
          lastName: r.buyerLastName,
        },
        order: { id: r.orderId },
      })),
      ...bookingRatingsResult.map(r => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        images: r.images,
        createdAt: r.createdAt!,
        buyer: {
          firstName: r.buyerFirstName,
          lastName: r.buyerLastName,
        },
        booking: { id: r.bookingId },
      })),
    ];

    // Sort by createdAt descending (most recent first)
    return allRatings.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async canRateOrder(orderId: string, buyerId: string): Promise<{ canRate: boolean; reason?: string }> {
    // Check if order exists and belongs to buyer
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) {
      return { canRate: false, reason: "Order not found" };
    }
    if (order.buyerId !== buyerId) {
      return { canRate: false, reason: "You did not place this order" };
    }

    // Check if order is delivered
    if (order.status !== "delivered") {
      return { canRate: false, reason: "Order must be delivered before you can rate it" };
    }

    // Check if already rated
    const existingRating = await this.getOrderRating(orderId);
    if (existingRating) {
      return { canRate: false, reason: "You have already rated this order" };
    }

    return { canRate: true };
  }

  async canRateBooking(bookingId: string, buyerId: string): Promise<{ canRate: boolean; reason?: string }> {
    // Check if booking exists and belongs to buyer
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
    if (!booking) {
      return { canRate: false, reason: "Booking not found" };
    }
    if (booking.buyerId !== buyerId) {
      return { canRate: false, reason: "You did not place this booking" };
    }

    // Check if booking is completed
    if (booking.status !== "completed") {
      return { canRate: false, reason: "Booking must be completed before you can rate it" };
    }

    // Check if already rated
    const existingRating = await this.getBookingRating(bookingId);
    if (existingRating) {
      return { canRate: false, reason: "You have already rated this booking" };
    }

    return { canRate: true };
  }

  // DEPRECATED: Old review method - keeping for backwards compatibility during migration
  async hasUserPurchasedProduct(buyerId: string, productId: string): Promise<{ hasPurchased: boolean; orderId?: string }> {
    const result = await db
      .select({ orderId: orders.id })
      .from(orders)
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .innerJoin(productVariants, eq(productVariants.id, orderItems.variantId))
      .where(
        and(
          eq(orders.buyerId, buyerId),
          eq(productVariants.productId, productId),
          eq(orders.status, "delivered")
        )
      )
      .limit(1);

    if (result.length > 0) {
      return { hasPurchased: true, orderId: result[0].orderId };
    }
    return { hasPurchased: false };
  }

  // Messaging system implementations
  async createConversation(conversationData: InsertConversation & { buyerId: string, sellerId?: string | null }): Promise<Conversation> {
    const results = await db
      .insert(conversations)
      .values({
        ...conversationData,
        sellerId: conversationData.sellerId || null,
      } as any)
      .returning()
      .execute() as Conversation[];
    return results[0];
  }

  async findExistingConversation(params: {
    buyerId: string;
    sellerId?: string | null;
    type: ConversationType;
    productId?: string | null;
    serviceId?: string | null;
    orderId?: string | null;
    bookingId?: string | null;
  }): Promise<Conversation | undefined> {
    const conditions = [
      eq(conversations.buyerId, params.buyerId),
      eq(conversations.type, params.type),
    ];

    // Add seller condition if provided
    if (params.sellerId) {
      conditions.push(eq(conversations.sellerId, params.sellerId));
    }

    // Add entity-specific conditions
    if (params.productId) {
      conditions.push(eq(conversations.productId, params.productId));
    }
    if (params.serviceId) {
      conditions.push(eq(conversations.serviceId, params.serviceId));
    }
    if (params.orderId) {
      conditions.push(eq(conversations.orderId, params.orderId));
    }
    if (params.bookingId) {
      conditions.push(eq(conversations.bookingId, params.bookingId));
    }

    const [conversation] = await db
      .select()
      .from(conversations)
      .where(and(...conditions))
      .orderBy(desc(conversations.createdAt))
      .limit(1);

    return conversation;
  }

  async getConversations(userId: string, userRole: UserRole): Promise<any[]> {
    let rawConversations: Conversation[];
    
    if (userRole === "admin") {
      // Admins can see all conversations
      rawConversations = await db
        .select()
        .from(conversations)
        .orderBy(desc(conversations.lastMessageAt));
    } else if (userRole === "seller") {
      // Sellers see conversations where they are the seller
      rawConversations = await db
        .select()
        .from(conversations)
        .where(eq(conversations.sellerId, userId))
        .orderBy(desc(conversations.lastMessageAt));
    } else {
      // Buyers see their own conversations
      rawConversations = await db
        .select()
        .from(conversations)
        .where(eq(conversations.buyerId, userId))
        .orderBy(desc(conversations.lastMessageAt));
    }

    // Batch-load related entities to avoid N+1 queries
    const orderIds = rawConversations.map(c => c.orderId).filter((id): id is string => !!id);
    const bookingIds = rawConversations.map(c => c.bookingId).filter((id): id is string => !!id);
    const productIds = rawConversations.map(c => c.productId).filter((id): id is string => !!id);
    const serviceIds = rawConversations.map(c => c.serviceId).filter((id): id is string => !!id);
    
    const [ordersMap, bookingsMap, productsMap, servicesMap] = await Promise.all([
      orderIds.length > 0 
        ? db.select().from(orders).where(inArray(orders.id, orderIds)).then(rows => 
            new Map(rows.map(r => [r.id, r]))
          )
        : Promise.resolve(new Map()),
      bookingIds.length > 0
        ? db.select().from(bookings).where(inArray(bookings.id, bookingIds)).then(rows =>
            new Map(rows.map(r => [r.id, r]))
          )
        : Promise.resolve(new Map()),
      productIds.length > 0
        ? db.select().from(products).where(inArray(products.id, productIds)).then(rows =>
            new Map(rows.map(r => [r.id, r]))
          )
        : Promise.resolve(new Map()),
      serviceIds.length > 0
        ? db.select().from(services).where(inArray(services.id, serviceIds)).then(rows =>
            new Map(rows.map(r => [r.id, r]))
          )
        : Promise.resolve(new Map()),
    ]);

    // Enrich conversations with user, product, service data, and context summaries
    const enrichedConversations = await Promise.all(
      rawConversations.map(async (conversation) => {
        const buyer = conversation.buyerId ? await this.getUser(conversation.buyerId) : null;
        const seller = conversation.sellerId ? await this.getUser(conversation.sellerId) : null;
        const product = conversation.productId ? productsMap.get(conversation.productId) : null;
        const service = conversation.serviceId ? servicesMap.get(conversation.serviceId) : null;

        // Build context summaries
        const contextSummaries: Array<{kind: string, label: string}> = [];
        
        // Add order context
        if (conversation.orderId) {
          const order = ordersMap.get(conversation.orderId);
          if (order) {
            contextSummaries.push({
              kind: "order",
              label: `Order #${order.orderNumber}`
            });
          }
        }
        
        // Add booking context
        if (conversation.bookingId) {
          const booking = bookingsMap.get(conversation.bookingId);
          if (booking) {
            contextSummaries.push({
              kind: "booking",
              label: `Booking #${booking.bookingNumber}`
            });
          }
        }
        
        // Add workflow contexts (design/quote) - simplified version without extra queries
        if (conversation.workflowContexts && conversation.workflowContexts.length > 0) {
          for (const context of conversation.workflowContexts) {
            if (context === "product") {
              contextSummaries.push({
                kind: "design_approval",
                label: "Design Workflow"
              });
            }
            if (context === "quote") {
              contextSummaries.push({
                kind: "custom_quote",
                label: "Quote Workflow"
              });
            }
          }
        }

        return {
          ...conversation,
          buyer: buyer ? {
            id: buyer.id,
            firstName: buyer.firstName,
            lastName: buyer.lastName,
            profileImageUrl: buyer.profileImageUrl,
          } : null,
          seller: seller ? {
            id: seller.id,
            firstName: seller.firstName,
            lastName: seller.lastName,
            profileImageUrl: seller.profileImageUrl,
          } : null,
          product: product ? {
            id: product.id,
            name: product.name,
          } : null,
          service: service ? {
            id: service.id,
            name: service.name,
          } : null,
          contextSummaries,
        };
      })
    );

    return enrichedConversations;
  }

  async getConversation(id: string): Promise<any | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
      
    if (!conversation) {
      return undefined;
    }

    // Enrich conversation with user, product, and service data
    const buyer = conversation.buyerId ? await this.getUser(conversation.buyerId) : null;
    const seller = conversation.sellerId ? await this.getUser(conversation.sellerId) : null;
    const product = conversation.productId ? await this.getProduct(conversation.productId) : null;
    const service = conversation.serviceId ? await this.getService(conversation.serviceId) : null;

    return {
      ...conversation,
      buyer: buyer ? {
        id: buyer.id,
        firstName: buyer.firstName,
        lastName: buyer.lastName,
        profileImageUrl: buyer.profileImageUrl,
      } : null,
      seller: seller ? {
        id: seller.id,
        firstName: seller.firstName,
        lastName: seller.lastName,
        profileImageUrl: seller.profileImageUrl,
      } : null,
      product: product ? {
        id: product.id,
        name: product.name,
      } : null,
      service: service ? {
        id: service.id,
        name: service.name,
      } : null,
    };
  }

  async updateConversationStatus(id: string, status: ConversationStatus): Promise<Conversation> {
    const [conversation] = await db
      .update(conversations)
      .set({ status, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return conversation;
  }

  async addWorkflowContext(conversationId: string, context: "product" | "quote"): Promise<Conversation> {
    // Get current conversation
    const current = await this.getConversation(conversationId);
    if (!current) {
      throw new Error("Conversation not found");
    }

    // Add context to array if not already present (set semantics)
    const currentContexts = current.workflowContexts || [];
    const newContexts = currentContexts.includes(context) 
      ? currentContexts 
      : [...currentContexts, context];

    // Update conversation with new contexts
    const [conversation] = await db
      .update(conversations)
      .set({ 
        workflowContexts: newContexts,
        updatedAt: new Date() 
      })
      .where(eq(conversations.id, conversationId))
      .returning();
    
    return conversation;
  }

  async createMessage(messageData: InsertMessage & { senderId: string; senderRole: UserRole; conversationId: string }): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(messageData)
      .returning();

    // Update conversation's lastMessageAt
    await db
      .update(conversations)
      .set({ lastMessageAt: new Date(), updatedAt: new Date() })
      .where(eq(conversations.id, messageData.conversationId));

    return message;
  }

  async getMessages(conversationId: string): Promise<any[]> {
    const messageList = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
    
    // Enrich messages with sender information and attachments
    const enrichedMessages = await Promise.all(
      messageList.map(async (message) => {
        const sender = message.senderId ? await this.getUser(message.senderId) : null;
        const attachments = await this.getMessageAttachments(message.id);
        
        return {
          ...message,
          sender: sender ? {
            id: sender.id,
            firstName: sender.firstName,
            lastName: sender.lastName,
            profileImageUrl: sender.profileImageUrl,
          } : null,
          attachments,
        };
      })
    );
    
    return enrichedMessages;
  }

  async markMessageAsRead(messageId: string): Promise<Message> {
    const [message] = await db
      .update(messages)
      .set({ isRead: true })
      .where(eq(messages.id, messageId))
      .returning();
    return message;
  }

  async markConversationMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    await db
      .update(messages)
      .set({ isRead: true })
      .where(
        and(
          eq(messages.conversationId, conversationId),
          sql`${messages.senderId} != ${userId}`
        )
      );
  }

  async createMessageAttachment(attachmentData: InsertMessageAttachment & { messageId: string }): Promise<MessageAttachment> {
    const [attachment] = await db
      .insert(messageAttachments)
      .values(attachmentData)
      .returning();
    return attachment;
  }

  async getMessageAttachments(messageId: string): Promise<MessageAttachment[]> {
    return await db
      .select()
      .from(messageAttachments)
      .where(eq(messageAttachments.messageId, messageId));
  }

  async createAdminMessageTemplate(templateData: InsertAdminMessageTemplate): Promise<AdminMessageTemplate> {
    const [template] = await db
      .insert(adminMessageTemplates)
      .values(templateData)
      .returning();
    return template;
  }

  async getAdminMessageTemplates(category?: string): Promise<AdminMessageTemplate[]> {
    if (category) {
      return await db
        .select()
        .from(adminMessageTemplates)
        .where(
          and(
            eq(adminMessageTemplates.category, category),
            eq(adminMessageTemplates.isActive, true)
          )
        )
        .orderBy(adminMessageTemplates.name);
    }
    return await db
      .select()
      .from(adminMessageTemplates)
      .where(eq(adminMessageTemplates.isActive, true))
      .orderBy(adminMessageTemplates.name);
  }

  async updateAdminMessageTemplate(id: string, templateData: Partial<InsertAdminMessageTemplate>): Promise<AdminMessageTemplate> {
    const [template] = await db
      .update(adminMessageTemplates)
      .set({ ...templateData, updatedAt: new Date() })
      .where(eq(adminMessageTemplates.id, id))
      .returning();
    return template;
  }

  async deleteAdminMessageTemplate(id: string): Promise<void> {
    await db
      .delete(adminMessageTemplates)
      .where(eq(adminMessageTemplates.id, id));
  }

  // Boost packages
  async createBoostPackage(packageData: InsertBoostPackage): Promise<BoostPackage> {
    const [pkg] = await db
      .insert(boostPackages)
      .values({
        name: packageData.name,
        description: packageData.description,
        durationDays: packageData.durationDays,
        price: toDecimalString(packageData.price)!,
        features: packageData.features,
        isActive: packageData.isActive,
      } as any)
      .returning();
    return pkg;
  }

  async getBoostPackages(includeInactive = false): Promise<BoostPackage[]> {
    if (includeInactive) {
      return await db
        .select()
        .from(boostPackages)
        .orderBy(boostPackages.durationDays);
    }
    return await db
      .select()
      .from(boostPackages)
      .where(eq(boostPackages.isActive, true))
      .orderBy(boostPackages.durationDays);
  }

  async getBoostPackage(id: string): Promise<BoostPackage | undefined> {
    const [pkg] = await db
      .select()
      .from(boostPackages)
      .where(eq(boostPackages.id, id));
    return pkg;
  }

  async updateBoostPackage(id: string, packageData: Partial<InsertBoostPackage>): Promise<BoostPackage> {
    const updateData: any = { ...packageData, updatedAt: new Date() };
    if (packageData.price !== undefined) {
      updateData.price = toDecimalString(packageData.price);
    }
    const [pkg] = await db
      .update(boostPackages)
      .set(updateData)
      .where(eq(boostPackages.id, id))
      .returning();
    return pkg;
  }

  async deleteBoostPackage(id: string): Promise<void> {
    await db
      .delete(boostPackages)
      .where(eq(boostPackages.id, id));
  }

  // Boosted items
  async createBoostedItem(itemData: InsertBoostedItem): Promise<BoostedItem> {
    const [item] = await db
      .insert(boostedItems)
      .values(itemData)
      .returning();
    return item;
  }

  async getBoostedItems(itemType?: BoostedItemType, activeOnly = true): Promise<BoostedItem[]> {
    const now = new Date();
    const conditions = [];
    
    if (itemType) {
      conditions.push(eq(boostedItems.itemType, itemType));
    }
    
    if (activeOnly) {
      conditions.push(eq(boostedItems.isActive, true));
      conditions.push(gte(boostedItems.endDate, now));
    }

    if (conditions.length === 0) {
      return await db
        .select()
        .from(boostedItems)
        .orderBy(desc(boostedItems.createdAt));
    }

    return await db
      .select()
      .from(boostedItems)
      .where(and(...conditions))
      .orderBy(desc(boostedItems.createdAt));
  }

  async getBoostedItem(id: string): Promise<BoostedItem | undefined> {
    const [item] = await db
      .select()
      .from(boostedItems)
      .where(eq(boostedItems.id, id));
    return item;
  }

  async getBoostedItemByItemId(itemId: string, itemType: BoostedItemType): Promise<BoostedItem | undefined> {
    const now = new Date();
    const [item] = await db
      .select()
      .from(boostedItems)
      .where(
        and(
          eq(boostedItems.itemId, itemId),
          eq(boostedItems.itemType, itemType),
          eq(boostedItems.isActive, true),
          gte(boostedItems.endDate, now)
        )
      )
      .orderBy(desc(boostedItems.createdAt));
    return item;
  }

  async deleteBoostedItem(id: string): Promise<void> {
    await db
      .delete(boostedItems)
      .where(eq(boostedItems.id, id));
  }

  async expireOldBoosts(): Promise<void> {
    const now = new Date();
    await db
      .update(boostedItems)
      .set({ isActive: false })
      .where(
        and(
          eq(boostedItems.isActive, true),
          lt(boostedItems.endDate, now)
        )
      );
  }

  // Boost purchases
  async createBoostPurchase(purchaseData: InsertBoostPurchase): Promise<BoostPurchase> {
    const [purchase] = await db
      .insert(boostPurchases)
      .values({
        sellerId: purchaseData.sellerId,
        packageId: purchaseData.packageId,
        itemType: purchaseData.itemType,
        itemId: purchaseData.itemId,
        amount: toDecimalString(purchaseData.amount)!,
        currency: purchaseData.currency,
        status: purchaseData.status,
        paymentMethod: purchaseData.paymentMethod,
        paymentReference: purchaseData.paymentReference,
        paidAt: purchaseData.paidAt,
      } as any)
      .returning();
    return purchase;
  }

  async getBoostPurchases(sellerId?: string, status?: BoostPurchaseStatus): Promise<BoostPurchase[]> {
    const conditions = [];
    
    if (sellerId) {
      conditions.push(eq(boostPurchases.sellerId, sellerId));
    }
    if (status) {
      conditions.push(eq(boostPurchases.status, status));
    }

    if (conditions.length === 0) {
      return await db
        .select()
        .from(boostPurchases)
        .orderBy(desc(boostPurchases.createdAt));
    }

    return await db
      .select()
      .from(boostPurchases)
      .where(and(...conditions))
      .orderBy(desc(boostPurchases.createdAt));
  }

  async getBoostPurchase(id: string): Promise<BoostPurchase | undefined> {
    const [purchase] = await db
      .select()
      .from(boostPurchases)
      .where(eq(boostPurchases.id, id));
    return purchase;
  }

  async updateBoostPurchaseStatus(
    id: string, 
    status: BoostPurchaseStatus, 
    paymentReference?: string, 
    paymentDetails?: any
  ): Promise<BoostPurchase> {
    const updateData: any = { status };
    
    if (paymentReference) {
      updateData.paymentReference = paymentReference;
    }
    if (paymentDetails) {
      updateData.paymentDetails = paymentDetails;
    }
    if (status === "paid") {
      updateData.paidAt = new Date();
    }

    const [purchase] = await db
      .update(boostPurchases)
      .set(updateData)
      .where(eq(boostPurchases.id, id))
      .returning();
    return purchase;
  }

  async linkBoostPurchaseToBoost(purchaseId: string, boostedItemId: string): Promise<BoostPurchase> {
    const [purchase] = await db
      .update(boostPurchases)
      .set({ boostedItemId })
      .where(eq(boostPurchases.id, purchaseId))
      .returning();
    return purchase;
  }

  // Return Requests
  async createReturnRequest(data: InsertReturnRequest & { buyerId: string, sellerId?: string }): Promise<ReturnRequest> {
    // Use transaction to atomically create return request and increment attempt counter
    return await db.transaction(async (tx) => {
      // Create the return request
      const [returnRequest] = await tx
        .insert(returnRequests)
        .values({
          ...data,
          requestedRefundAmount: toDecimalString(data.requestedRefundAmount),
          evidenceUrls: data.evidenceUrls || [],
        })
        .returning();

      // Increment attempt counter on parent order (bookings don't track return attempts in schema)
      if (data.orderId) {
        await tx
          .update(orders)
          .set({ returnAttemptCount: sql`COALESCE(${orders.returnAttemptCount}, 0) + 1` })
          .where(eq(orders.id, data.orderId));
      }
      // Note: Bookings table doesn't have returnAttemptCount column, so we skip for bookings

      return returnRequest;
    });
  }

  async getReturnRequests(filters?: { 
    buyerId?: string, 
    sellerId?: string, 
    orderId?: string,
    bookingId?: string,
    status?: ReturnRequestStatus 
  }): Promise<ReturnRequest[]> {
    const conditions = [];
    
    if (filters?.buyerId) {
      conditions.push(eq(returnRequests.buyerId, filters.buyerId));
    }
    if (filters?.sellerId) {
      conditions.push(eq(returnRequests.sellerId, filters.sellerId));
    }
    if (filters?.orderId) {
      conditions.push(eq(returnRequests.orderId, filters.orderId));
    }
    if (filters?.bookingId) {
      conditions.push(eq(returnRequests.bookingId, filters.bookingId));
    }
    if (filters?.status) {
      conditions.push(eq(returnRequests.status, filters.status));
    }

    if (conditions.length === 0) {
      return await db
        .select()
        .from(returnRequests)
        .orderBy(desc(returnRequests.createdAt));
    }

    return await db
      .select()
      .from(returnRequests)
      .where(and(...conditions))
      .orderBy(desc(returnRequests.createdAt));
  }

  async getReturnRequest(id: string): Promise<ReturnRequest | undefined> {
    const [returnRequest] = await db
      .select()
      .from(returnRequests)
      .where(eq(returnRequests.id, id));
    return returnRequest;
  }

  async findReturnRequestForSource(filters: { 
    orderId?: string, 
    bookingId?: string,
    statusFilter?: ReturnRequestStatus[]
  }): Promise<ReturnRequest | undefined> {
    const conditions = [];
    
    if (filters.orderId) {
      conditions.push(eq(returnRequests.orderId, filters.orderId));
    }
    if (filters.bookingId) {
      conditions.push(eq(returnRequests.bookingId, filters.bookingId));
    }
    
    // If statusFilter is provided, only look for requests in those statuses
    // This allows checking for "active" requests (e.g., not cancelled or completed)
    if (filters.statusFilter && filters.statusFilter.length > 0) {
      conditions.push(inArray(returnRequests.status, filters.statusFilter));
    }

    if (conditions.length === 0) {
      return undefined;
    }

    const [returnRequest] = await db
      .select()
      .from(returnRequests)
      .where(and(...conditions))
      .limit(1);
    
    return returnRequest;
  }

  async markReturnRequestUnderReview(id: string): Promise<ReturnRequest> {
    const [returnRequest] = await db
      .update(returnRequests)
      .set({
        status: "under_review",
        underReviewAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(returnRequests.id, id))
      .returning();
    return returnRequest;
  }

  async updateSellerResponse(id: string, response: {
    sellerStatus: SellerReturnStatus,
    sellerResponse: string,
    sellerProposedRefundAmount?: number
  }): Promise<ReturnRequest> {
    const updateData: any = {
      sellerStatus: response.sellerStatus,
      sellerResponse: response.sellerResponse,
      sellerResponseAt: new Date(),
      updatedAt: new Date(),
    };

    if (response.sellerProposedRefundAmount !== undefined) {
      updateData.sellerProposedRefundAmount = response.sellerProposedRefundAmount.toString();
    }

    // Update overall status based on seller response
    if (response.sellerStatus === "approved") {
      updateData.status = "seller_approved";
    } else if (response.sellerStatus === "rejected") {
      updateData.status = "seller_rejected";
    }

    const [returnRequest] = await db
      .update(returnRequests)
      .set(updateData)
      .where(eq(returnRequests.id, id))
      .returning();
    return returnRequest;
  }

  async applyAdminResolution(id: string, adminId: string, resolution: {
    status: ReturnRequestStatus,
    approvedRefundAmount?: number,
    adminNotes?: string,
    adminOverride?: boolean
  }): Promise<ReturnRequest> {
    const updateData: any = {
      status: resolution.status,
      adminReviewedById: adminId,
      adminReviewedAt: new Date(),
      resolvedAt: new Date(),
      updatedAt: new Date(),
    };

    if (resolution.approvedRefundAmount !== undefined) {
      updateData.approvedRefundAmount = resolution.approvedRefundAmount.toString();
    }
    if (resolution.adminNotes) {
      updateData.adminNotes = resolution.adminNotes;
    }
    if (resolution.adminOverride !== undefined) {
      updateData.adminOverride = resolution.adminOverride;
    }

    const [returnRequest] = await db
      .update(returnRequests)
      .set(updateData)
      .where(eq(returnRequests.id, id))
      .returning();
    return returnRequest;
  }

  async markReturnRequestRefunded(id: string): Promise<ReturnRequest> {
    const [returnRequest] = await db
      .update(returnRequests)
      .set({
        status: "refunded",
        refundedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(returnRequests.id, id))
      .returning();
    return returnRequest;
  }

  async markReturnRequestCompleted(id: string): Promise<ReturnRequest> {
    const [returnRequest] = await db
      .update(returnRequests)
      .set({
        status: "completed",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(returnRequests.id, id))
      .returning();
    return returnRequest;
  }

  calculateCommissionReversal(refundAmount: number, commissionRate: number): number {
    return (refundAmount * commissionRate) / 100;
  }

  async processReturnRequestRefund(returnRequestId: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Get return request details
      const [returnRequest] = await tx
        .select()
        .from(returnRequests)
        .where(eq(returnRequests.id, returnRequestId));

      if (!returnRequest) {
        throw new Error("Return request not found");
      }

      if (!returnRequest.approvedRefundAmount) {
        throw new Error("Refund amount not set");
      }

      const refundAmount = parseFloat(returnRequest.approvedRefundAmount);

      // Update related order or booking status
      if (returnRequest.orderId) {
        // Get order details to separate product amount from shipping
        const [order] = await tx
          .select()
          .from(orders)
          .where(eq(orders.id, returnRequest.orderId));
        
        if (!order) {
          throw new Error("Order not found");
        }

        const productAmount = parseFloat(order.totalAmount || "0");
        const shippingCost = parseFloat(order.shippingCost || "0");

        await tx
          .update(orders)
          .set({ status: "cancelled", updatedAt: new Date() }) // Mark order as cancelled when refunded
          .where(eq(orders.id, returnRequest.orderId));

        // Update related transactions to refunded
        await tx
          .update(transactions)
          .set({ status: "refunded", updatedAt: new Date() })
          .where(eq(transactions.orderId, returnRequest.orderId));

        // Create buyer refund transaction (negative amount showing money returned)
        // Buyer gets back full amount (product + shipping)
        await tx.insert(transactions).values({
          type: "order",
          status: "refunded",
          amount: (-refundAmount).toString(), // Negative amount for buyer refund (includes shipping)
          commissionRate: "0.00",
          commissionAmount: "0.00",
          sellerPayout: "0.00",
          buyerId: returnRequest.buyerId,
          sellerId: returnRequest.sellerId,
          orderId: returnRequest.orderId,
        } as any);

        // Get seller details for commission reversal
        // IMPORTANT: Commission reversal is calculated ONLY on product amount (excluding shipping)
        // Seller is not responsible for refunding shipping costs
        if (returnRequest.sellerId) {
          const [seller] = await tx.select().from(users).where(eq(users.id, returnRequest.sellerId));
          if (seller && seller.commissionRate) {
            const commissionRate = parseFloat(seller.commissionRate);
            
            // Only create reversal transaction if there's actual commission to reverse
            if (commissionRate > 0) {
              // Calculate commission reversal on PRODUCT AMOUNT only (not including shipping)
              const commissionReversal = this.calculateCommissionReversal(productAmount, commissionRate);

              // Create commission reversal transaction
              await tx.insert(transactions).values({
                type: "order",
                status: "refunded",
                amount: (-commissionReversal).toString(), // Negative amount for reversal
                commissionRate: commissionRate.toString(),
                commissionAmount: "0.00", // No commission on reversal transactions
                sellerPayout: (-commissionReversal).toString(), // Negative payout represents reversal
                buyerId: returnRequest.buyerId,  // Include buyerId for transaction record
                sellerId: returnRequest.sellerId,
                orderId: returnRequest.orderId,
              } as any);

              // Update return request with commission reversal amount
              await tx
                .update(returnRequests)
                .set({ 
                  commissionReversedAmount: commissionReversal.toString(),
                  updatedAt: new Date()
                })
                .where(eq(returnRequests.id, returnRequestId));
            }
          }
        }
      } else if (returnRequest.bookingId) {
        await tx
          .update(bookings)
          .set({ status: "cancelled", updatedAt: new Date() }) // Mark booking as cancelled when refunded
          .where(eq(bookings.id, returnRequest.bookingId));

        // Update related transactions to refunded
        await tx
          .update(transactions)
          .set({ status: "refunded", updatedAt: new Date() })
          .where(eq(transactions.bookingId, returnRequest.bookingId));

        // Create buyer refund transaction (negative amount showing money returned)
        await tx.insert(transactions).values({
          type: "booking",
          status: "refunded",
          amount: (-refundAmount).toString(), // Negative amount for buyer refund
          commissionRate: "0.00",
          commissionAmount: "0.00",
          sellerPayout: "0.00",
          buyerId: returnRequest.buyerId,
          sellerId: returnRequest.sellerId,
          bookingId: returnRequest.bookingId,
        } as any);

        // Get seller details for commission reversal
        if (returnRequest.sellerId) {
          const [seller] = await tx.select().from(users).where(eq(users.id, returnRequest.sellerId));
          if (seller && seller.commissionRate) {
            const commissionRate = parseFloat(seller.commissionRate);
            
            // Only create reversal transaction if there's actual commission to reverse
            if (commissionRate > 0) {
              const commissionReversal = this.calculateCommissionReversal(refundAmount, commissionRate);

              // Create commission reversal transaction
              await tx.insert(transactions).values({
                type: "booking",
                status: "refunded",
                amount: (-commissionReversal).toString(), // Negative amount for reversal
                commissionRate: commissionRate.toString(),
                commissionAmount: "0.00", // No commission on reversal transactions
                sellerPayout: (-commissionReversal).toString(), // Negative payout represents reversal
                buyerId: returnRequest.buyerId,  // Include buyerId for transaction record
                sellerId: returnRequest.sellerId,
                bookingId: returnRequest.bookingId,
              } as any);

              // Update return request with commission reversal amount
              await tx
                .update(returnRequests)
                .set({ 
                  commissionReversedAmount: commissionReversal.toString(),
                  updatedAt: new Date()
                })
                .where(eq(returnRequests.id, returnRequestId));
            }
          }
        }
      }

      // Mark return request as refunded
      await tx
        .update(returnRequests)
        .set({
          status: "refunded",
          refundedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(returnRequests.id, returnRequestId));
    });
  }

  // Quote Management Implementation
  
  async createQuote(quoteData: InsertQuote & { conversationId: string; buyerId: string; sellerId: string }): Promise<Quote> {
    const results = await db
      .insert(quotes)
      .values({
        ...quoteData,
        quotedPrice: typeof quoteData.quotedPrice === 'number' ? toDecimalString(quoteData.quotedPrice, 2) : quoteData.quotedPrice,
        status: (quoteData as any).status || "sent", // Respect provided status, default to "sent" for backward compatibility
      } as any)
      .returning()
      .execute() as Quote[];
    
    const quote = results[0];
    
    // Only auto-supersede if this is a seller-sent quote (not a buyer-requested quote)
    if (quote.status !== "requested") {
      await this.supersedePreviousQuotes(quoteData.conversationId, quote.id);
    }
    
    return quote;
  }

  async updateQuote(id: string, updates: Partial<InsertQuote> & { status?: QuoteStatus; updatedAt?: Date }): Promise<Quote> {
    const processedUpdates = {
      ...updates,
      quotedPrice: updates.quotedPrice !== undefined && typeof updates.quotedPrice === 'number' 
        ? toDecimalString(updates.quotedPrice, 2) 
        : updates.quotedPrice,
      updatedAt: updates.updatedAt || new Date(),
    };

    const [quote] = await db
      .update(quotes)
      .set(processedUpdates as any)
      .where(eq(quotes.id, id))
      .returning();
    
    if (!quote) {
      throw new Error("Quote not found");
    }
    
    return quote;
  }

  async getQuote(id: string): Promise<Quote | undefined> {
    const results = await db
      .select()
      .from(quotes)
      .where(eq(quotes.id, id))
      .execute();
    return results[0] ?? undefined;
  }

  async getQuotesByConversation(conversationId: string): Promise<Quote[]> {
    return await db
      .select()
      .from(quotes)
      .where(eq(quotes.conversationId, conversationId))
      .orderBy(desc(quotes.createdAt))
      .execute();
  }

  async getQuotesByBuyer(buyerId: string, status?: QuoteStatus): Promise<Quote[]> {
    const conditions = [eq(quotes.buyerId, buyerId)];
    if (status) {
      conditions.push(eq(quotes.status, status));
    }
    return await db
      .select()
      .from(quotes)
      .where(and(...conditions))
      .orderBy(desc(quotes.createdAt));
  }

  async getQuotesBySeller(sellerId: string, status?: QuoteStatus): Promise<Quote[]> {
    const conditions = [eq(quotes.sellerId, sellerId)];
    if (status) {
      conditions.push(eq(quotes.status, status));
    }
    return await db
      .select()
      .from(quotes)
      .where(and(...conditions))
      .orderBy(desc(quotes.createdAt));
  }

  async acceptQuote(id: string, buyerId: string): Promise<Quote> {
    return await db.transaction(async (tx) => {
      // Row-level lock to prevent concurrent accepts (critical for race condition prevention)
      const [quote] = await tx
        .select()
        .from(quotes)
        .where(eq(quotes.id, id))
        .for("update"); // SELECT FOR UPDATE - locks this row until transaction completes
      
      if (!quote) {
        throw new Error("Quote not found");
      }
      if (quote.buyerId !== buyerId) {
        throw new Error("You are not authorized to accept this quote");
      }
      // Check current status - if already accepted/expired/rejected, abort
      if (quote.status !== "sent" && quote.status !== "pending") {
        throw new Error(`This quote cannot be accepted (current status: ${quote.status})`);
      }
      // Check expiration (handle nullable expiresAt)
      if (quote.expiresAt && new Date() > new Date(quote.expiresAt)) {
        // Auto-expire if past expiration
        await tx
          .update(quotes)
          .set({ status: "expired", updatedAt: new Date() })
          .where(eq(quotes.id, id));
        throw new Error("This quote has expired");
      }

      // Validate design approval is still approved (if referenced)
      if (quote.designApprovalId) {
        const [design] = await tx.select().from(designApprovals).where(eq(designApprovals.id, quote.designApprovalId));
        if (!design || (design.status !== "approved" && design.status !== "resubmitted")) {
          throw new Error("Design approval is no longer valid");
        }
      }

      // Update quote status to accepted (row is locked, safe to update)
      const [updatedQuote] = await tx
        .update(quotes)
        .set({ 
          status: "accepted",
          acceptedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(quotes.id, id))
        .returning();
      
      // Auto-add to cart if product variant is specified (with quoteId to preserve pricing)
      if (quote.productVariantId) {
        await tx
          .insert(cartItems)
          .values({
            buyerId,
            productVariantId: quote.productVariantId,
            quoteId: quote.id,
            quantity: quote.quantity,
          });
      }
      
      return updatedQuote;
    });
  }

  async rejectQuote(id: string, buyerId: string, reason?: string): Promise<Quote> {
    const quote = await this.getQuote(id);
    if (!quote) {
      throw new Error("Quote not found");
    }
    if (quote.buyerId !== buyerId) {
      throw new Error("You are not authorized to reject this quote");
    }

    const [updatedQuote] = await db
      .update(quotes)
      .set({ 
        status: "rejected",
        updatedAt: new Date()
      })
      .where(eq(quotes.id, id))
      .returning();
    
    return updatedQuote;
  }

  async supersedePreviousQuotes(conversationId: string, newQuoteId: string): Promise<void> {
    await db
      .update(quotes)
      .set({ status: "superseded", updatedAt: new Date() })
      .where(
        and(
          eq(quotes.conversationId, conversationId),
          sql`${quotes.id} != ${newQuoteId}`,
          inArray(quotes.status, ["sent", "pending"])
        )
      );
  }

  async expireOldQuotes(): Promise<void> {
    await db
      .update(quotes)
      .set({ status: "expired", updatedAt: new Date() })
      .where(
        and(
          lt(quotes.expiresAt, new Date()),
          inArray(quotes.status, ["sent", "pending"])
        )
      );
  }

  async getActiveQuoteForItem(buyerId: string, productId?: string, serviceId?: string): Promise<Quote | undefined> {
    const conditions = [
      eq(quotes.buyerId, buyerId),
      eq(quotes.status, "accepted"),
      gte(quotes.expiresAt, new Date())
    ];
    
    if (productId) {
      conditions.push(eq(quotes.productId, productId));
    }
    if (serviceId) {
      conditions.push(eq(quotes.serviceId, serviceId));
    }

    const [quote] = await db
      .select()
      .from(quotes)
      .where(and(...conditions))
      .orderBy(desc(quotes.acceptedAt))
      .limit(1);
    
    return quote;
  }

  async getActiveQuoteForConversation(conversationId: string): Promise<Quote | undefined> {
    const results = await db
      .select()
      .from(quotes)
      .where(
        and(
          eq(quotes.conversationId, conversationId),
          inArray(quotes.status, ["sent", "pending", "accepted"]),
          gte(quotes.expiresAt, new Date())
        )
      )
      .orderBy(desc(quotes.createdAt))
      .limit(1)
      .execute();
    
    return results[0] ?? undefined;
  }

  // Design Approval Management Implementation

  async createDesignApproval(approvalData: InsertDesignApproval & { conversationId: string; buyerId: string; sellerId: string }): Promise<DesignApproval> {
    // Use transaction to ensure atomicity when marking old approvals as superseded and creating new one
    return await db.transaction(async (tx) => {
      // Mark any existing changes_requested approvals as superseded when buyer uploads a new design
      await tx
        .update(designApprovals)
        .set({ 
          status: "superseded",
          updatedAt: new Date()
        })
        .where(
          and(
            eq(designApprovals.conversationId, approvalData.conversationId),
            eq(designApprovals.status, "changes_requested")
          )
        );
      
      const [approval] = await tx
        .insert(designApprovals)
        .values({
          ...approvalData,
          status: "pending",
        })
        .returning();
      
      return approval;
    });
  }

  async getDesignApproval(id: string): Promise<DesignApproval | undefined> {
    const [approval] = await db
      .select()
      .from(designApprovals)
      .where(eq(designApprovals.id, id));
    return approval;
  }

  async getDesignApprovalsByConversation(conversationId: string): Promise<DesignApproval[]> {
    return await db
      .select()
      .from(designApprovals)
      .where(eq(designApprovals.conversationId, conversationId))
      .orderBy(desc(designApprovals.createdAt));
  }

  async getDesignApprovalsByBuyer(buyerId: string, status?: DesignApprovalStatus): Promise<DesignApproval[]> {
    const conditions = [eq(designApprovals.buyerId, buyerId)];
    if (status) {
      conditions.push(eq(designApprovals.status, status));
    }
    return await db
      .select()
      .from(designApprovals)
      .where(and(...conditions))
      .orderBy(desc(designApprovals.createdAt));
  }

  async getDesignApprovalsBySeller(sellerId: string, status?: DesignApprovalStatus): Promise<DesignApproval[]> {
    const conditions = [eq(designApprovals.sellerId, sellerId)];
    if (status) {
      conditions.push(eq(designApprovals.status, status));
    }
    return await db
      .select()
      .from(designApprovals)
      .where(and(...conditions))
      .orderBy(desc(designApprovals.createdAt));
  }

  async approveDesign(id: string, sellerId: string, notes?: string): Promise<DesignApproval> {
    const approval = await this.getDesignApproval(id);
    if (!approval) {
      throw new Error("Design approval not found");
    }
    if (approval.sellerId !== sellerId) {
      throw new Error("You are not authorized to approve this design");
    }
    if (approval.status === "approved") {
      throw new Error("This design is already approved");
    }

    // If linked to a quote, verify quote is accepted
    if (approval.quoteId) {
      const quote = await this.getQuote(approval.quoteId);
      if (!quote || quote.status !== "accepted") {
        throw new Error("Design cannot be approved until the associated quote is accepted");
      }
    }

    const [updatedApproval] = await db
      .update(designApprovals)
      .set({ 
        status: "approved",
        approvedAt: new Date(),
        sellerNotes: notes,
        updatedAt: new Date()
      })
      .where(eq(designApprovals.id, id))
      .returning();
    
    return updatedApproval;
  }

  async rejectDesign(id: string, sellerId: string, notes: string): Promise<DesignApproval> {
    const approval = await this.getDesignApproval(id);
    if (!approval) {
      throw new Error("Design approval not found");
    }
    if (approval.sellerId !== sellerId) {
      throw new Error("You are not authorized to reject this design");
    }

    const [updatedApproval] = await db
      .update(designApprovals)
      .set({ 
        status: "rejected",
        sellerNotes: notes,
        updatedAt: new Date()
      })
      .where(eq(designApprovals.id, id))
      .returning();
    
    return updatedApproval;
  }

  async requestDesignChanges(id: string, sellerId: string, notes: string): Promise<DesignApproval> {
    const approval = await this.getDesignApproval(id);
    if (!approval) {
      throw new Error("Design approval not found");
    }
    if (approval.sellerId !== sellerId) {
      throw new Error("You are not authorized to request changes to this design");
    }

    const [updatedApproval] = await db
      .update(designApprovals)
      .set({ 
        status: "changes_requested",
        sellerNotes: notes,
        updatedAt: new Date()
      })
      .where(eq(designApprovals.id, id))
      .returning();
    
    return updatedApproval;
  }

  async copyDesignApprovalToTarget(
    sourceId: string, 
    buyerId: string, 
    targetVariantId?: string, 
    targetPackageId?: string
  ): Promise<DesignApproval> {
    return await db.transaction(async (tx) => {
      // 1. Fetch and validate source approval
      const [sourceApproval] = await tx
        .select()
        .from(designApprovals)
        .where(eq(designApprovals.id, sourceId));
      
      if (!sourceApproval) {
        throw new Error("Source design approval not found");
      }
      
      if (sourceApproval.buyerId !== buyerId) {
        throw new Error("You are not authorized to copy this design");
      }
      
      if (sourceApproval.status !== "approved") {
        throw new Error("Only approved designs can be copied to other variants");
      }
      
      // 2. Validate target variant/package belongs to same product/service
      // CRITICAL: Properly set targetProductId/targetServiceId from the validated entities
      let targetProductId: string | null = null;
      let targetServiceId: string | null = null;
      let targetSellerId = sourceApproval.sellerId;
      
      if (targetVariantId) {
        const [variant] = await tx
          .select()
          .from(productVariants)
          .where(eq(productVariants.id, targetVariantId));
        
        if (!variant) {
          throw new Error("Target variant not found");
        }
        
        // Only check product match if source has a productId (not quote-context)
        if (sourceApproval.productId && variant.productId !== sourceApproval.productId) {
          throw new Error("Target variant must belong to the same product");
        }
        
        // Validate seller owns the product and set targetProductId
        const [product] = await tx
          .select()
          .from(products)
          .where(eq(products.id, variant.productId));
        
        if (!product) {
          throw new Error("Product not found");
        }
        
        if (product.sellerId !== sourceApproval.sellerId) {
          throw new Error("Target variant must belong to the same seller");
        }
        
        // Set the target IDs from validated entities
        targetProductId = product.id;
        targetServiceId = null;
      } else if (targetPackageId) {
        const [pkg] = await tx
          .select()
          .from(servicePackages)
          .where(eq(servicePackages.id, targetPackageId));
        
        if (!pkg) {
          throw new Error("Target package not found");
        }
        
        // Only check service match if source has a serviceId (not quote-context)
        if (sourceApproval.serviceId && pkg.serviceId !== sourceApproval.serviceId) {
          throw new Error("Target package must belong to the same service");
        }
        
        // Validate seller owns the service and set targetServiceId
        const [service] = await tx
          .select()
          .from(services)
          .where(eq(services.id, pkg.serviceId));
        
        if (!service) {
          throw new Error("Service not found");
        }
        
        if (service.sellerId !== sourceApproval.sellerId) {
          throw new Error("Target package must belong to the same seller");
        }
        
        // Set the target IDs from validated entities
        targetServiceId = service.id;
        targetProductId = null;
      } else {
        throw new Error("Either targetVariantId or targetPackageId must be provided");
      }
      
      // 3. Check for existing approval for this target using validated target IDs
      const existingConditions = [
        eq(designApprovals.buyerId, buyerId),
        eq(designApprovals.sellerId, targetSellerId),
        eq(designApprovals.context, sourceApproval.context), // Use source context
        sql`${designApprovals.quoteId} IS NULL`, // Ensure we don't match quote-context approvals
      ];
      
      // Use the validated target IDs for duplicate checking
      if (targetVariantId) {
        existingConditions.push(eq(designApprovals.variantId, targetVariantId));
        existingConditions.push(eq(designApprovals.productId, targetProductId!)); // Non-null after validation
        existingConditions.push(sql`${designApprovals.packageId} IS NULL`);
        existingConditions.push(sql`${designApprovals.serviceId} IS NULL`);
      } else if (targetPackageId) {
        existingConditions.push(eq(designApprovals.packageId, targetPackageId));
        existingConditions.push(eq(designApprovals.serviceId, targetServiceId!)); // Non-null after validation
        existingConditions.push(sql`${designApprovals.variantId} IS NULL`);
        existingConditions.push(sql`${designApprovals.productId} IS NULL`);
      }
      
      const [existingApproval] = await tx
        .select()
        .from(designApprovals)
        .where(and(...existingConditions));
      
      if (existingApproval && existingApproval.status === "approved") {
        // Return existing approved design instead of creating duplicate
        return existingApproval;
      }
      
      // 4. Create new conversation for the target variant (ALWAYS create fresh conversation)
      const conversationResults = await tx
        .insert(conversations)
        .values({
          buyerId,
          sellerId: targetSellerId,
          type: "design_approval" as ConversationType,
          subject: `Design Approval - Copied from another variant`,
          productId: targetProductId,  // Use validated target product ID
          serviceId: targetServiceId,  // Use validated target service ID
          workflowContexts: ["design_approval"],
        } as any)
        .returning()
        .execute() as typeof conversations.$inferSelect[];
      const newConversation = conversationResults[0];
      
      // 5. Create new design approval with status "approved" (NOT quote-scoped)
      const now = new Date();
      const approvalResults = await tx
        .insert(designApprovals)
        .values({
          conversationId: newConversation.id,
          context: "product", // Always use "product" context for reuse (not quote context)
          quoteId: null, // Explicitly set to null - this is NOT a quote-scoped approval
          productId: targetProductId,
          serviceId: targetServiceId,
          variantId: targetVariantId || null,
          packageId: targetPackageId || null,
          buyerId,
          sellerId: targetSellerId,
          designFiles: sourceApproval.designFiles,
          status: "approved",
          sellerNotes: `Design copied from approved design for another variant`,
          approvedAt: now,
          createdAt: now,
          updatedAt: now,
        } as any)
        .returning()
        .execute() as typeof designApprovals.$inferSelect[];
      
      return approvalResults[0];
    });
  }

  async getApprovedDesignForItem(buyerId: string, productId?: string, serviceId?: string, variantId?: string, packageId?: string): Promise<DesignApproval | undefined> {
    const conditions = [
      eq(designApprovals.buyerId, buyerId),
      eq(designApprovals.status, "approved"),
      // CRITICAL: Only return product-scoped designs for add-to-cart flow
      // Quote-scoped designs (context="quote") should NOT enable add-to-cart
      eq(designApprovals.context, "product")
    ];
    
    if (productId) {
      conditions.push(eq(designApprovals.productId, productId));
    }
    if (serviceId) {
      conditions.push(eq(designApprovals.serviceId, serviceId));
    }
    if (variantId) {
      conditions.push(eq(designApprovals.variantId, variantId));
    }
    if (packageId) {
      conditions.push(eq(designApprovals.packageId, packageId));
    }

    const [approval] = await db
      .select()
      .from(designApprovals)
      .where(and(...conditions))
      .orderBy(desc(designApprovals.approvedAt))
      .limit(1);
    
    return approval;
  }

  async getApprovedDesignForConversation(conversationId: string): Promise<DesignApproval | undefined> {
    const [approval] = await db
      .select()
      .from(designApprovals)
      .where(
        and(
          eq(designApprovals.conversationId, conversationId),
          eq(designApprovals.status, "approved")
        )
      )
      .orderBy(desc(designApprovals.approvedAt))
      .limit(1);
    
    return approval;
  }

  // Purchase Requirement Validation Implementation

  async validatePurchaseRequirements(params: {
    kind: "product" | "service";
    itemId: string;
    buyerId: string;
    variantId?: string;
    packageId?: string;
  }): Promise<{
    canPurchase: boolean;
    requiresQuote: boolean;
    requiresDesignApproval: boolean;
    quoteStatus?: "none" | "pending" | "sent" | "accepted" | "rejected" | "expired" | "superseded";
    designStatus?: "none" | "pending" | "approved" | "rejected" | "changes_requested";
    blockingReasonCodes: ("item_not_found" | "quote_missing" | "quote_pending" | "quote_expired" | "quote_rejected" | "design_missing" | "design_pending" | "design_rejected" | "design_changes_requested")[];
    missingRequirements: string[];
  }> {
    const { kind, itemId, buyerId } = params;
    const blockingReasonCodes: any[] = [];
    const missingRequirements: string[] = [];
    
    // Fetch the item (product or service)
    const item = kind === "product" 
      ? await this.getProduct(itemId)
      : await this.getService(itemId);
    
    if (!item) {
      return {
        canPurchase: false,
        requiresQuote: false,
        requiresDesignApproval: false,
        blockingReasonCodes: ["item_not_found"],
        missingRequirements: [`${kind === "product" ? "Product" : "Service"} not found`],
      };
    }

    const requiresQuote = item.requiresQuote || false;
    const requiresDesignApproval = item.requiresDesignApproval || false;
    let quoteStatus: "none" | "pending" | "sent" | "accepted" | "rejected" | "expired" | "superseded" | undefined;
    let designStatus: "none" | "pending" | "approved" | "rejected" | "changes_requested" | undefined;

    // Check quote requirement
    // Important: Products with requiresQuote=true support BOTH workflows:
    // 1. Product-context: Listed variants with design approval (NO quote needed)
    // 2. Quote-context: Custom specs with quote (quote required)
    // We only block purchase if there's no product-context design approval
    if (requiresQuote) {
      // First check if there's an approved product-context design for this specific variant/package
      const approvedProductDesign = await this.getApprovedDesignForItem(
        buyerId,
        kind === "product" ? itemId : undefined,
        kind === "service" ? itemId : undefined,
        params.variantId,
        params.packageId
      );

      // If there's an approved product-context design, skip quote requirement
      // This allows purchases of listed variants without needing a custom quote
      if (approvedProductDesign && approvedProductDesign.context === "product") {
        // Product-context workflow - no quote needed
        quoteStatus = undefined; // Not applicable for product-context purchases
      } else {
        // No product-context design - check if quote exists (quote-context workflow)
        const activeQuote = await this.getActiveQuoteForItem(
          buyerId,
          kind === "product" ? itemId : undefined,
          kind === "service" ? itemId : undefined
        );

        if (!activeQuote) {
          // No quote exists - check if there's a pending/rejected one
          const allQuotes = await db
            .select()
            .from(quotes)
            .where(and(
              eq(quotes.buyerId, buyerId),
              kind === "product" ? eq(quotes.productId, itemId) : eq(quotes.serviceId, itemId)
            ))
            .orderBy(desc(quotes.createdAt))
            .limit(1);

          if (allQuotes.length === 0) {
            quoteStatus = "none";
            blockingReasonCodes.push("quote_missing");
            missingRequirements.push("A custom quote is required for this item. Please request a quote from the seller.");
          } else {
            const latestQuote = allQuotes[0];
            quoteStatus = latestQuote.status as any;
            
            if (latestQuote.status === "sent" || latestQuote.status === "pending") {
              blockingReasonCodes.push("quote_pending");
              missingRequirements.push("Waiting for you to accept the seller's quote.");
            } else if (latestQuote.status === "rejected") {
              blockingReasonCodes.push("quote_rejected");
              missingRequirements.push("You rejected the seller's quote. Please request a new quote if interested.");
            } else if (latestQuote.status === "expired") {
              blockingReasonCodes.push("quote_expired");
              missingRequirements.push("The seller's quote has expired. Please request a new quote.");
            }
          }
        } else {
          quoteStatus = "accepted";
        }
      }
    }

    // Check design approval requirement
    if (requiresDesignApproval) {
      const approvedDesign = await this.getApprovedDesignForItem(
        buyerId,
        kind === "product" ? itemId : undefined,
        kind === "service" ? itemId : undefined,
        params.variantId,
        params.packageId
      );

      if (!approvedDesign) {
        // No approved design - check if there's a pending/rejected one
        const allDesigns = await db
          .select()
          .from(designApprovals)
          .where(and(
            eq(designApprovals.buyerId, buyerId),
            kind === "product" ? eq(designApprovals.productId, itemId) : eq(designApprovals.serviceId, itemId)
          ))
          .orderBy(desc(designApprovals.createdAt))
          .limit(1);

        if (allDesigns.length === 0) {
          designStatus = "none";
          blockingReasonCodes.push("design_missing");
          missingRequirements.push("Design approval is required for this item. Please upload your design files in the messages.");
        } else {
          const latestDesign = allDesigns[0];
          designStatus = latestDesign.status as any;
          
          if (latestDesign.status === "pending") {
            blockingReasonCodes.push("design_pending");
            missingRequirements.push("Waiting for the seller to approve your design.");
          } else if (latestDesign.status === "rejected") {
            blockingReasonCodes.push("design_rejected");
            missingRequirements.push("The seller rejected your design. Please upload a new design or make requested changes.");
          } else if (latestDesign.status === "changes_requested") {
            blockingReasonCodes.push("design_changes_requested");
            missingRequirements.push("The seller requested changes to your design. Please update and resubmit.");
          }
        }
      } else {
        designStatus = "approved";
      }
    }

    const canPurchase = blockingReasonCodes.length === 0;

    return {
      canPurchase,
      requiresQuote,
      requiresDesignApproval,
      quoteStatus,
      designStatus,
      blockingReasonCodes,
      missingRequirements,
    };
  }

  async resubmitDesign(id: string, buyerId: string, newFiles: DesignApproval['designFiles']): Promise<DesignApproval> {
    const approval = await this.getDesignApproval(id);
    if (!approval) {
      throw new Error("Design approval not found");
    }
    if (approval.buyerId !== buyerId) {
      throw new Error("You are not authorized to resubmit this design");
    }
    if (approval.status !== "changes_requested") {
      throw new Error("Can only resubmit designs that have changes requested");
    }

    const [updatedApproval] = await db
      .update(designApprovals)
      .set({ 
        status: "resubmitted",
        designFiles: newFiles,
        updatedAt: new Date()
      })
      .where(eq(designApprovals.id, id))
      .returning();
    
    return updatedApproval;
  }

  // Bank Account Management (for international TT payments)
  
  async createBankAccount(accountData: InsertBankAccount & { createdByAdminId: string }): Promise<BankAccount> {
    const [account] = await db
      .insert(bankAccounts)
      .values({
        ...accountData,
        createdByAdminId: accountData.createdByAdminId,
        updatedAt: new Date(),
      })
      .returning();
    
    return account;
  }

  async getBankAccounts(includeInactive: boolean = false): Promise<BankAccount[]> {
    const conditions = includeInactive ? [] : [eq(bankAccounts.isActive, true)];
    
    return await db
      .select()
      .from(bankAccounts)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(bankAccounts.isDefault), bankAccounts.sortOrder, bankAccounts.displayName);
  }

  async getPublicBankAccounts(): Promise<BankAccount[]> {
    // Returns only accounts marked as public and active for buyer checkout
    return await db
      .select()
      .from(bankAccounts)
      .where(and(
        eq(bankAccounts.isActive, true),
        eq(bankAccounts.isPublic, true)
      ))
      .orderBy(desc(bankAccounts.isDefault), bankAccounts.sortOrder, bankAccounts.displayName);
  }

  async getBankAccount(id: string): Promise<BankAccount | undefined> {
    const [account] = await db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.id, id));
    
    return account;
  }

  async updateBankAccount(id: string, accountData: UpdateBankAccount & { updatedByAdminId: string }): Promise<BankAccount> {
    const [account] = await db
      .update(bankAccounts)
      .set({
        ...accountData,
        updatedByAdminId: accountData.updatedByAdminId,
        updatedAt: new Date(),
      })
      .where(eq(bankAccounts.id, id))
      .returning();
    
    if (!account) {
      throw new Error("Bank account not found");
    }
    
    return account;
  }

  async deleteBankAccount(id: string): Promise<void> {
    await db
      .delete(bankAccounts)
      .where(eq(bankAccounts.id, id));
  }

  async setDefaultBankAccount(id: string): Promise<BankAccount> {
    // First, unset all other defaults
    await db
      .update(bankAccounts)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(bankAccounts.isDefault, true));
    
    // Then set this one as default
    const [account] = await db
      .update(bankAccounts)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(bankAccounts.id, id))
      .returning();
    
    if (!account) {
      throw new Error("Bank account not found");
    }
    
    return account;
  }

  async getApprovedDesignsLibrary(buyerId: string): Promise<DesignApproval[]> {
    return await db
      .select()
      .from(designApprovals)
      .where(
        and(
          eq(designApprovals.buyerId, buyerId),
          eq(designApprovals.status, "approved")
        )
      )
      .orderBy(desc(designApprovals.approvedAt));
  }

  async getProductApprovedVariants(productId: string, buyerId: string): Promise<{variantId: string | null, designApprovalId: string, status: string, approvedAt: Date | null}[]> {
    const approvals = await db
      .select()
      .from(designApprovals)
      .where(
        and(
          eq(designApprovals.productId, productId),
          eq(designApprovals.buyerId, buyerId),
          eq(designApprovals.status, "approved"),
          eq(designApprovals.context, "product")
        )
      );
    
    return approvals.map(a => ({ 
      variantId: a.variantId || null, // Include null variantIds for legacy data
      designApprovalId: a.id,
      status: a.status,
      approvedAt: a.approvedAt
    }));
  }
}

export const storage = new DatabaseStorage();
