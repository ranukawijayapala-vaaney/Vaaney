// Referenced from javascript_log_in_with_replit and javascript_database blueprints
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - Required for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User roles enum
export type UserRole = "buyer" | "seller" | "admin";
export type VerificationStatus = "pending" | "approved" | "verified" | "rejected";
export type PaymentMethod = "bank_transfer" | "ipg";
export type OrderStatus = "pending_payment" | "paid" | "processing" | "shipped" | "delivered" | "cancelled";
export type AramexShipmentStatus = "pending" | "created" | "picked_up" | "in_transit" | "delivered" | "cancelled";
export type BookingStatus = "pending_confirmation" | "confirmed" | "pending_payment" | "paid" | "ongoing" | "completed" | "cancelled";
export type TransactionType = "order" | "booking" | "payout" | "boost";
export type TransactionStatus = "pending" | "escrow" | "paid" | "released" | "refunded";
export type ConversationType = "pre_purchase_product" | "pre_purchase_service" | "general_inquiry" | "complaint" | "order" | "booking";
export type ConversationStatus = "active" | "resolved" | "archived";
export type ReturnRequestStatus = "requested" | "under_review" | "seller_approved" | "seller_rejected" | "admin_approved" | "admin_rejected" | "refunded" | "completed" | "cancelled";
export type ReturnRequestReason = "defective" | "wrong_item" | "not_as_described" | "damaged" | "changed_mind" | "other";
export type SellerReturnStatus = "pending" | "approved" | "rejected";

// Users table - Required for authentication with role-based access
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  password: varchar("password", { length: 255 }),
  googleId: varchar("google_id", { length: 255 }).unique(), // Google OAuth subject ID
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { length: 20 }).notNull().$type<UserRole>(),
  verificationStatus: varchar("verification_status", { length: 20 }).notNull().default("pending").$type<VerificationStatus>(),
  verificationDocumentUrl: varchar("verification_document_url"),
  verificationRejectionReason: text("verification_rejection_reason"),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).default("20.00"), // Default 20%
  canSwitchRoles: boolean("can_switch_roles").notNull().default(false), // Persistent permission for role switching
  // Email verification fields
  emailVerified: boolean("email_verified").notNull().default(false),
  verificationToken: varchar("verification_token", { length: 255 }),
  verificationTokenExpiry: timestamp("verification_token_expiry"),
  // User contact number - for all users (admin contact purposes)
  userContactNumber: varchar("user_contact_number", { length: 50 }),
  // Seller profile fields
  contactNumber: varchar("contact_number", { length: 50 }),
  streetAddress: text("street_address"),
  city: varchar("city", { length: 100 }),
  postalCode: varchar("postal_code", { length: 20 }),
  country: varchar("country", { length: 100 }),
  // Bank details for seller payouts
  bankName: varchar("bank_name", { length: 255 }),
  bankAccountNumber: varchar("bank_account_number", { length: 100 }),
  bankAccountHolderName: varchar("bank_account_holder_name", { length: 255 }),
  bankSwiftCode: varchar("bank_swift_code", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  products: many(products),
  services: many(services),
  cartItems: many(cartItems),
  orders: many(orders),
  bookings: many(bookings),
  transactions: many(transactions),
  orderRatingsGiven: many(orderRatings, { relationName: "buyerOrderRatings" }),
  orderRatingsReceived: many(orderRatings, { relationName: "sellerOrderRatings" }),
  bookingRatingsGiven: many(bookingRatings, { relationName: "buyerBookingRatings" }),
  bookingRatingsReceived: many(bookingRatings, { relationName: "sellerBookingRatings" }),
  shippingAddresses: many(shippingAddresses),
  createdBankAccounts: many(bankAccounts, { relationName: "createdBankAccounts" }),
  updatedBankAccounts: many(bankAccounts, { relationName: "updatedBankAccounts" }),
}));

export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;

// Password Reset Tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

// Shipping Addresses table - for buyers to store multiple shipping addresses
export const shippingAddresses = pgTable("shipping_addresses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recipientName: varchar("recipient_name", { length: 255 }).notNull(),
  contactNumber: varchar("contact_number", { length: 50 }).notNull(),
  streetAddress: text("street_address").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  postalCode: varchar("postal_code", { length: 20 }).notNull(),
  country: varchar("country", { length: 100 }).notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const shippingAddressesRelations = relations(shippingAddresses, ({ one }) => ({
  user: one(users, {
    fields: [shippingAddresses.userId],
    references: [users.id],
  }),
}));

export const insertShippingAddressSchema = createInsertSchema(shippingAddresses, {
  recipientName: z.string().min(1, "Recipient name is required"),
  contactNumber: z.string().min(1, "Contact number is required"),
  streetAddress: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  country: z.string().min(1, "Country is required"),
}).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export type ShippingAddress = typeof shippingAddresses.$inferSelect;
export type InsertShippingAddress = z.infer<typeof insertShippingAddressSchema>;

// Products table
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 100 }),
  price: decimal("price", { precision: 10, scale: 2 }), // Base price for simple products
  stock: integer("stock").default(0), // Base stock quantity
  images: jsonb("images").notNull().$type<string[]>(),
  isActive: boolean("is_active").notNull().default(true),
  requiresQuote: boolean("requires_quote").notNull().default(false), // Custom products require quote first
  requiresDesignApproval: boolean("requires_design_approval").notNull().default(true), // Print products need design approval
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const productsRelations = relations(products, ({ one, many }) => ({
  seller: one(users, {
    fields: [products.sellerId],
    references: [users.id],
  }),
  variants: many(productVariants),
  orderItems: many(orderItems),
}));

export const insertProductSchema = createInsertSchema(products, {
  name: z.string().min(1, "Product name is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  images: z.array(z.string()).min(1, "At least one image is required"),
  price: z.union([z.number(), z.string(), z.null()]).transform(val => val === null || val === '' ? null : String(val)).optional(),
  stock: z.union([z.number(), z.string(), z.null()]).transform(val => val === null || val === '' ? 0 : (typeof val === 'string' ? parseInt(val, 10) : val)).optional(),
}).omit({ id: true, sellerId: true, createdAt: true, updatedAt: true });

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

// Product variants table
export const productVariants = pgTable("product_variants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(), // e.g., "A4 - Glossy", "Large - Blue"
  sku: varchar("sku", { length: 100 }),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  inventory: integer("inventory").notNull().default(0),
  attributes: jsonb("attributes").$type<Record<string, string>>(), // { "size": "A4", "finish": "Glossy" }
  imageUrls: text("image_urls").array().default(sql`ARRAY[]::text[]`), // Variant-specific images (GCS URLs)
  // Shipping dimensions
  weight: decimal("weight", { precision: 10, scale: 3 }), // Weight in KG (e.g., 1.500)
  length: decimal("length", { precision: 10, scale: 2 }), // Length in CM
  width: decimal("width", { precision: 10, scale: 2 }), // Width in CM
  height: decimal("height", { precision: 10, scale: 2 }), // Height in CM
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
}));

export const insertProductVariantSchema = createInsertSchema(productVariants, {
  name: z.string().min(1, "Variant name is required"),
  price: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseFloat(val) : val),
  inventory: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseInt(val, 10) : val),
  imageUrls: z.array(z.string()).default([]),
  weight: z.union([z.number(), z.string(), z.null()]).transform(val => val === null || val === '' ? null : (typeof val === 'string' ? parseFloat(val) : val)).optional(),
  length: z.union([z.number(), z.string(), z.null()]).transform(val => val === null || val === '' ? null : (typeof val === 'string' ? parseFloat(val) : val)).optional(),
  width: z.union([z.number(), z.string(), z.null()]).transform(val => val === null || val === '' ? null : (typeof val === 'string' ? parseFloat(val) : val)).optional(),
  height: z.union([z.number(), z.string(), z.null()]).transform(val => val === null || val === '' ? null : (typeof val === 'string' ? parseFloat(val) : val)).optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export type ProductVariant = typeof productVariants.$inferSelect;
export type InsertProductVariant = z.infer<typeof insertProductVariantSchema>;

// Services table
export const services = pgTable("services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 100 }),
  images: jsonb("images").notNull().$type<string[]>(),
  isActive: boolean("is_active").notNull().default(true),
  requiresQuote: boolean("requires_quote").notNull().default(false), // Custom services require quote first
  requiresDesignApproval: boolean("requires_design_approval").notNull().default(true), // Print services need design approval
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const servicesRelations = relations(services, ({ one, many }) => ({
  seller: one(users, {
    fields: [services.sellerId],
    references: [users.id],
  }),
  packages: many(servicePackages),
  bookings: many(bookings),
}));

export const insertServiceSchema = createInsertSchema(services, {
  name: z.string().min(1, "Service name is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  images: z.array(z.string()).min(1, "At least one image is required"),
}).omit({ id: true, sellerId: true, createdAt: true, updatedAt: true });

export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;

// Enriched service type with buyer-specific workflow status
export type EnrichedService = Service & {
  hasApprovedDesign?: boolean; // For buyers: Whether they have an approved design for this service
  hasAcceptedQuote?: boolean; // For buyers: Whether they have an accepted quote for this service
};

// Service packages table
export const servicePackages = pgTable("service_packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serviceId: varchar("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(), // e.g., "Basic", "Premium", "Enterprise"
  description: text("description").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  features: jsonb("features").notNull().$type<string[]>(),
  duration: integer("duration"), // in days or hours depending on service
  availability: integer("availability").notNull().default(999), // Available slots
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const servicePackagesRelations = relations(servicePackages, ({ one }) => ({
  service: one(services, {
    fields: [servicePackages.serviceId],
    references: [services.id],
  }),
}));

export const insertServicePackageSchema = createInsertSchema(servicePackages, {
  name: z.string().min(1, "Package name is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price format"),
  features: z.array(z.string()).min(1, "At least one feature is required"),
}).omit({ id: true, createdAt: true, updatedAt: true });

export type ServicePackage = typeof servicePackages.$inferSelect;
export type InsertServicePackage = z.infer<typeof insertServicePackageSchema>;

// Bookings table
export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buyerId: varchar("buyer_id").notNull().references(() => users.id),
  serviceId: varchar("service_id").notNull().references(() => services.id),
  packageId: varchar("package_id").references(() => servicePackages.id), // Nullable for custom quotes
  sellerId: varchar("seller_id").notNull().references(() => users.id),
  status: varchar("status", { length: 30 }).notNull().default("pending_confirmation").$type<BookingStatus>(),
  scheduledDate: timestamp("scheduled_date"), // Nullable for quote-based bookings
  scheduledTime: varchar("scheduled_time", { length: 20 }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  paymentMethod: varchar("payment_method", { length: 20 }).$type<PaymentMethod>(),
  paymentReference: varchar("payment_reference", { length: 255 }),
  paymentLink: text("payment_link"),
  transferSlipObjectPath: text("transfer_slip_object_path"),
  quoteId: varchar("quote_id").references(() => quotes.id, { onDelete: "set null" }), // For quote-based bookings
  designApprovalId: varchar("design_approval_id").references(() => designApprovals.id, { onDelete: "set null" }), // For bookings with design approval
  quantity: integer("quantity").notNull().default(1), // For quote-based bookings
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const bookingsRelations = relations(bookings, ({ one }) => ({
  buyer: one(users, {
    fields: [bookings.buyerId],
    references: [users.id],
  }),
  service: one(services, {
    fields: [bookings.serviceId],
    references: [services.id],
  }),
  package: one(servicePackages, {
    fields: [bookings.packageId],
    references: [servicePackages.id],
  }),
  seller: one(users, {
    fields: [bookings.sellerId],
    references: [users.id],
  }),
  transaction: one(transactions),
}));

export const insertBookingSchema = createInsertSchema(bookings, {
  scheduledDate: z.coerce.date().optional().nullable(), // Optional for quote-based bookings
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount"),
  notes: z.string().optional().nullable(),
}).omit({ id: true, buyerId: true, sellerId: true, createdAt: true, updatedAt: true });

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

// Booking ratings (for services)
export const bookingRatings = pgTable("booking_ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").notNull().unique().references(() => bookings.id, { onDelete: "cascade" }), // One rating per booking
  buyerId: varchar("buyer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sellerId: varchar("seller_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(), // 1-5 star rating
  comment: text("comment"), // Optional comment
  images: text("images").array(), // Optional photo evidence (GCS URLs)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const bookingRatingsRelations = relations(bookingRatings, ({ one }) => ({
  booking: one(bookings, {
    fields: [bookingRatings.bookingId],
    references: [bookings.id],
  }),
  buyer: one(users, {
    fields: [bookingRatings.buyerId],
    references: [users.id],
  }),
  seller: one(users, {
    fields: [bookingRatings.sellerId],
    references: [users.id],
  }),
}));

export const insertBookingRatingSchema = createInsertSchema(bookingRatings, {
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
  images: z.array(z.string().url()).max(5).optional(), // Max 5 images
}).omit({ id: true, buyerId: true, sellerId: true, bookingId: true, createdAt: true, updatedAt: true });

export type BookingRating = typeof bookingRatings.$inferSelect;
export type InsertBookingRating = z.infer<typeof insertBookingRatingSchema>;

// Conversations table - for messaging between buyers, sellers, and admin
export type WorkflowContext = "product" | "quote";

export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type", { length: 30 }).notNull().$type<ConversationType>(),
  status: varchar("status", { length: 20 }).notNull().default("active").$type<ConversationStatus>(),
  subject: varchar("subject", { length: 255 }).notNull(),
  
  // Workflow context tracking - tracks which purchase workflows are active in this conversation
  // Can contain 'product' (design for listed variant) and/or 'quote' (custom quote request)
  workflowContexts: varchar("workflow_contexts").array().notNull().default(sql`ARRAY[]::varchar[]`).$type<WorkflowContext[]>(),
  
  // Participants (both nullable to support buyer-to-admin and seller-to-admin conversations)
  buyerId: varchar("buyer_id").references(() => users.id, { onDelete: "cascade" }),
  sellerId: varchar("seller_id").references(() => users.id, { onDelete: "cascade" }),
  
  // Related entities (nullable - depends on conversation type)
  productId: varchar("product_id").references(() => products.id, { onDelete: "set null" }),
  serviceId: varchar("service_id").references(() => services.id, { onDelete: "set null" }),
  orderId: varchar("order_id").references(() => orders.id, { onDelete: "set null" }),
  bookingId: varchar("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  
  // Tracking
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  buyer: one(users, {
    fields: [conversations.buyerId],
    references: [users.id],
  }),
  seller: one(users, {
    fields: [conversations.sellerId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [conversations.productId],
    references: [products.id],
  }),
  service: one(services, {
    fields: [conversations.serviceId],
    references: [services.id],
  }),
  order: one(orders, {
    fields: [conversations.orderId],
    references: [orders.id],
  }),
  booking: one(bookings, {
    fields: [conversations.bookingId],
    references: [bookings.id],
  }),
  messages: many(messages),
}));

export const insertConversationSchema = createInsertSchema(conversations, {
  type: z.enum(["pre_purchase_product", "pre_purchase_service", "general_inquiry", "complaint", "order", "booking"]),
  subject: z.string().min(2, "Subject must be at least 2 characters"),
}).omit({ id: true, buyerId: true, sellerId: true, lastMessageAt: true, createdAt: true, updatedAt: true, status: true }).extend({
  productId: z.string().optional(),
  serviceId: z.string().optional(),
  orderId: z.string().optional(),
  bookingId: z.string().optional(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

// Messages table - individual messages within conversations
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  senderRole: varchar("sender_role", { length: 20 }).notNull().$type<UserRole>(),
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  isTemplate: boolean("is_template").notNull().default(false), // For admin templates
  createdAt: timestamp("created_at").defaultNow(),
});

export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  attachments: many(messageAttachments),
}));

export const insertMessageSchema = createInsertSchema(messages, {
  content: z.string().optional().default(""),
}).omit({ id: true, conversationId: true, senderId: true, senderRole: true, isRead: true, createdAt: true });

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// Message attachments table - for file uploads in messages
export const messageAttachments = pgTable("message_attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  fileUrl: text("file_url").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 100 }).notNull(),
  fileSize: integer("file_size").notNull(), // in bytes
  createdAt: timestamp("created_at").defaultNow(),
});

export const messageAttachmentsRelations = relations(messageAttachments, ({ one }) => ({
  message: one(messages, {
    fields: [messageAttachments.messageId],
    references: [messages.id],
  }),
}));

export const insertMessageAttachmentSchema = createInsertSchema(messageAttachments, {
  fileName: z.string().min(1, "File name is required"),
  fileUrl: z.string().url("Invalid file URL"),
  fileSize: z.number().int().positive("File size must be positive"),
}).omit({ id: true, messageId: true, createdAt: true });

export type MessageAttachment = typeof messageAttachments.$inferSelect;
export type InsertMessageAttachment = z.infer<typeof insertMessageAttachmentSchema>;

// Admin message templates table - for quick responses
export const adminMessageTemplates = pgTable("admin_message_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(), // e.g., "general", "complaint", "return"
  content: text("content").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAdminMessageTemplateSchema = createInsertSchema(adminMessageTemplates, {
  name: z.string().min(3, "Template name must be at least 3 characters"),
  content: z.string().min(10, "Template content must be at least 10 characters"),
}).omit({ id: true, createdAt: true, updatedAt: true });

export type AdminMessageTemplate = typeof adminMessageTemplates.$inferSelect;
export type InsertAdminMessageTemplate = z.infer<typeof insertAdminMessageTemplateSchema>;

// Quote and Design Approval System for Print Products Marketplace

// Status types for quotes and design approvals
// Quote statuses: requested (buyer initiated) -> sent (seller responds) -> accepted/rejected (buyer decision)
export type QuoteStatus = "requested" | "draft" | "sent" | "pending" | "accepted" | "rejected" | "expired" | "superseded";
export type DesignApprovalStatus = "pending" | "under_review" | "changes_requested" | "resubmitted" | "approved" | "rejected" | "superseded";
export type DesignApprovalContext = "product" | "quote";

// Quotes table - for custom product/service quotes
export const quotes = pgTable("quotes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  productId: varchar("product_id").references(() => products.id, { onDelete: "cascade" }),
  serviceId: varchar("service_id").references(() => services.id, { onDelete: "cascade" }),
  productVariantId: varchar("product_variant_id").references(() => productVariants.id, { onDelete: "cascade" }),
  servicePackageId: varchar("service_package_id").references(() => servicePackages.id, { onDelete: "cascade" }),
  designApprovalId: varchar("design_approval_id").references(() => designApprovals.id, { onDelete: "set null" }),
  buyerId: varchar("buyer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sellerId: varchar("seller_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  quotedPrice: decimal("quoted_price", { precision: 10, scale: 2 }), // Null when status="requested" (buyer initiated)
  quantity: integer("quantity").notNull().default(1),
  specifications: text("specifications"), // What was agreed upon or buyer's initial request details
  status: varchar("status", { length: 20 }).notNull().default("requested").$type<QuoteStatus>(),
  expiresAt: timestamp("expires_at"), // Null when status="requested", set by seller when sending quote
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_quotes_buyer").on(table.buyerId),
  index("idx_quotes_seller").on(table.sellerId),
  index("idx_quotes_status").on(table.status),
  index("idx_quotes_expires").on(table.expiresAt),
]);

export const quotesRelations = relations(quotes, ({ one }) => ({
  conversation: one(conversations, {
    fields: [quotes.conversationId],
    references: [conversations.id],
  }),
  product: one(products, {
    fields: [quotes.productId],
    references: [products.id],
  }),
  service: one(services, {
    fields: [quotes.serviceId],
    references: [services.id],
  }),
  buyer: one(users, {
    fields: [quotes.buyerId],
    references: [users.id],
  }),
  seller: one(users, {
    fields: [quotes.sellerId],
    references: [users.id],
  }),
}));

export const insertQuoteSchema = createInsertSchema(quotes, {
  quotedPrice: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'string' ? parseFloat(val) : val
  ).optional(),
  quantity: z.number().int().positive().default(1),
  specifications: z.string().optional(),
  expiresAt: z.union([z.string(), z.date()]).transform(val =>
    typeof val === 'string' ? new Date(val) : val
  ).optional(),
}).omit({
  id: true,
  buyerId: true,
  sellerId: true,
  acceptedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = z.infer<typeof insertQuoteSchema>;

// Design Approvals table - for buyer design file submissions
export const designApprovals = pgTable("design_approvals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  context: varchar("context", { length: 20 }).notNull().default("product").$type<DesignApprovalContext>(), // "product" for listed variants, "quote" for custom quotes
  quoteId: varchar("quote_id").references(() => quotes.id, { onDelete: "set null" }), // Links to quote if context="quote"
  productId: varchar("product_id").references(() => products.id, { onDelete: "cascade" }),
  serviceId: varchar("service_id").references(() => services.id, { onDelete: "cascade" }),
  variantId: varchar("variant_id").references(() => productVariants.id, { onDelete: "set null" }), // For standard products
  packageId: varchar("package_id").references(() => servicePackages.id, { onDelete: "set null" }), // For standard services
  buyerId: varchar("buyer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sellerId: varchar("seller_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  designFiles: jsonb("design_files").notNull().$type<Array<{
    url: string;
    filename: string;
    size: number;
    mimeType: string;
  }>>(), // Design files from GCS with metadata
  status: varchar("status", { length: 20 }).notNull().default("pending").$type<DesignApprovalStatus>(),
  sellerNotes: text("seller_notes"), // Rejection reason, change requests, or approval notes
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_design_approvals_buyer").on(table.buyerId),
  index("idx_design_approvals_seller").on(table.sellerId),
  index("idx_design_approvals_status").on(table.status),
  index("idx_design_approvals_context").on(table.context),
]);

export const designApprovalsRelations = relations(designApprovals, ({ one }) => ({
  conversation: one(conversations, {
    fields: [designApprovals.conversationId],
    references: [conversations.id],
  }),
  quote: one(quotes, {
    fields: [designApprovals.quoteId],
    references: [quotes.id],
  }),
  product: one(products, {
    fields: [designApprovals.productId],
    references: [products.id],
  }),
  service: one(services, {
    fields: [designApprovals.serviceId],
    references: [services.id],
  }),
  variant: one(productVariants, {
    fields: [designApprovals.variantId],
    references: [productVariants.id],
  }),
  package: one(servicePackages, {
    fields: [designApprovals.packageId],
    references: [servicePackages.id],
  }),
  buyer: one(users, {
    fields: [designApprovals.buyerId],
    references: [users.id],
  }),
  seller: one(users, {
    fields: [designApprovals.sellerId],
    references: [users.id],
  }),
}));

export const insertDesignApprovalSchema = createInsertSchema(designApprovals).omit({
  id: true,
  buyerId: true,
  sellerId: true,
  approvedAt: true,
  createdAt: true,
  updatedAt: true,
  status: true,
}).extend({
  conversationId: z.string().min(1, "Conversation ID is required"),
  quoteId: z.string().optional(),
  context: z.enum(["product", "quote"]).default("product"),
  designFiles: z.array(z.object({
    url: z.string().min(1, "URL is required"),
    filename: z.string().min(1, "Filename is required"),
    size: z.number().positive(),
    mimeType: z.string().min(1, "MIME type is required"),
  })).min(1, "At least one design file is required"),
  sellerNotes: z.string().optional(),
});

export type DesignApproval = typeof designApprovals.$inferSelect;
export type InsertDesignApproval = z.infer<typeof insertDesignApprovalSchema>;

// Cart items table
export const cartItems = pgTable("cart_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buyerId: varchar("buyer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productVariantId: varchar("product_variant_id").notNull().references(() => productVariants.id, { onDelete: "cascade" }),
  quoteId: varchar("quote_id").references(() => quotes.id, { onDelete: "set null" }),
  designApprovalId: varchar("design_approval_id").references(() => designApprovals.id, { onDelete: "set null" }),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  buyer: one(users, {
    fields: [cartItems.buyerId],
    references: [users.id],
  }),
  productVariant: one(productVariants, {
    fields: [cartItems.productVariantId],
    references: [productVariants.id],
  }),
  quote: one(quotes, {
    fields: [cartItems.quoteId],
    references: [quotes.id],
  }),
  designApproval: one(designApprovals, {
    fields: [cartItems.designApprovalId],
    references: [designApprovals.id],
  }),
}));

export const insertCartItemSchema = createInsertSchema(cartItems, {
  quantity: z.number().min(1, "Quantity must be at least 1"),
}).omit({ id: true, buyerId: true, createdAt: true, updatedAt: true });

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;

// Checkout sessions table - Groups multiple orders from single checkout
export const checkoutSessions = pgTable("checkout_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buyerId: varchar("buyer_id").notNull().references(() => users.id),
  paymentMethod: varchar("payment_method", { length: 20 }).notNull().$type<PaymentMethod>(),
  shippingAddress: text("shipping_address").notNull(),
  shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }).default("0.00"),
  notes: text("notes"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 30 }).notNull().default("pending_payment"),
  ipgRedirectUrl: text("ipg_redirect_url"),
  transferSlipObjectPath: text("transfer_slip_object_path"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCheckoutSessionSchema = createInsertSchema(checkoutSessions, {
  shippingAddress: z.string().min(10, "Shipping address is required"),
  totalAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount"),
  paymentMethod: z.enum(["bank_transfer", "ipg"]),
  notes: z.string().optional().nullable(),
}).omit({ id: true, buyerId: true, createdAt: true, updatedAt: true });

export type CheckoutSession = typeof checkoutSessions.$inferSelect;
export type InsertCheckoutSession = z.infer<typeof insertCheckoutSessionSchema>;

// Orders table - Each order represents a single product variant purchase
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buyerId: varchar("buyer_id").notNull().references(() => users.id),
  checkoutSessionId: varchar("checkout_session_id").references(() => checkoutSessions.id),
  sellerId: varchar("seller_id").notNull().references(() => users.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  variantId: varchar("variant_id").references(() => productVariants.id), // Nullable for custom quotes
  quoteId: varchar("quote_id").references(() => quotes.id, { onDelete: "set null" }), // If order was created from an accepted quote
  designApprovalId: varchar("design_approval_id").references(() => designApprovals.id, { onDelete: "set null" }), // If order was created from an approved design
  quantity: integer("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 30 }).notNull().default("pending_payment").$type<OrderStatus>(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  shippingAddress: text("shipping_address").notNull(),
  shippingAddressId: varchar("shipping_address_id").references(() => shippingAddresses.id),
  notes: text("notes"),
  paymentMethod: varchar("payment_method", { length: 20 }).$type<PaymentMethod>(),
  paymentReference: varchar("payment_reference", { length: 255 }),
  // Shipping cost fields
  shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }).default("0.00"), // Calculated shipping cost in USD
  productWeight: decimal("product_weight", { precision: 10, scale: 3 }), // Weight in KG
  productDimensions: jsonb("product_dimensions").$type<{ length: number; width: number; height: number }>(), // Dimensions in CM
  readyToShip: boolean("ready_to_ship").notNull().default(false), // Seller marks when ready
  consolidatedShipmentId: varchar("consolidated_shipment_id").references((): any => consolidatedShipments.id), // If part of consolidated shipment
  // Aramex shipping fields
  aramexAwbNumber: varchar("aramex_awb_number", { length: 50 }), // Aramex Airway Bill Number (primary tracking number)
  aramexLabelUrl: text("aramex_label_url"), // URL to shipping label PDF
  aramexTrackingUrl: text("aramex_tracking_url"), // Tracking page URL
  // Return request tracking
  returnAttemptCount: integer("return_attempt_count").notNull().default(0), // Tracks number of return requests submitted for this order
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const ordersRelations = relations(orders, ({ one, many }) => ({
  buyer: one(users, {
    fields: [orders.buyerId],
    references: [users.id],
  }),
  seller: one(users, {
    fields: [orders.sellerId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [orders.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [orders.variantId],
    references: [productVariants.id],
  }),
  quote: one(quotes, {
    fields: [orders.quoteId],
    references: [quotes.id],
  }),
  designApproval: one(designApprovals, {
    fields: [orders.designApprovalId],
    references: [designApprovals.id],
  }),
  checkoutSession: one(checkoutSessions, {
    fields: [orders.checkoutSessionId],
    references: [checkoutSessions.id],
  }),
  consolidatedShipment: one(consolidatedShipments, {
    fields: [orders.consolidatedShipmentId],
    references: [consolidatedShipments.id],
  }),
  shippingAddressRef: one(shippingAddresses, {
    fields: [orders.shippingAddressId],
    references: [shippingAddresses.id],
  }),
  items: many(orderItems),
  transaction: one(transactions),
}));

export const insertOrderSchema = createInsertSchema(orders, {
  shippingAddress: z.string().min(10, "Shipping address is required"),
  totalAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount"),
  unitPrice: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseFloat(val) : val),
  quantity: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseInt(val, 10) : val),
  notes: z.string().optional().nullable(),
}).omit({ id: true, buyerId: true, createdAt: true, updatedAt: true, returnAttemptCount: true });

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

// Order items table
export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: varchar("product_id").notNull().references(() => products.id),
  variantId: varchar("variant_id").references(() => productVariants.id), // Nullable for custom quotes
  quoteId: varchar("quote_id").references(() => quotes.id, { onDelete: "set null" }),
  designApprovalId: varchar("design_approval_id").references(() => designApprovals.id, { onDelete: "set null" }),
  quantity: integer("quantity").notNull(),
  pricePerUnit: decimal("price_per_unit", { precision: 10, scale: 2 }).notNull(),
  sellerId: varchar("seller_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
  seller: one(users, {
    fields: [orderItems.sellerId],
    references: [users.id],
  }),
  quote: one(quotes, {
    fields: [orderItems.quoteId],
    references: [quotes.id],
  }),
  designApproval: one(designApprovals, {
    fields: [orderItems.designApprovalId],
    references: [designApprovals.id],
  }),
}));

export type OrderItem = typeof orderItems.$inferSelect;

export const checkoutSessionsRelations = relations(checkoutSessions, ({ one, many }) => ({
  buyer: one(users, {
    fields: [checkoutSessions.buyerId],
    references: [users.id],
  }),
  orders: many(orders),
}));

// Transactions table (for escrow system)
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type", { length: 20 }).notNull().$type<TransactionType>(),
  orderId: varchar("order_id").references(() => orders.id),
  bookingId: varchar("booking_id").references(() => bookings.id),
  boostPurchaseId: varchar("boost_purchase_id").references(() => boostPurchases.id),
  buyerId: varchar("buyer_id").references(() => users.id),
  sellerId: varchar("seller_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull(),
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }).notNull(),
  sellerPayout: decimal("seller_payout", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending").$type<TransactionStatus>(),
  paymentReference: varchar("payment_reference", { length: 255 }),
  // Bank account used for bank transfer payments (nullable, only for bank_transfer payment method)
  bankAccountId: varchar("bank_account_id").references(() => bankAccounts.id),
  // Payment slip/receipt for bank transfer verification
  paymentSlipUrl: text("payment_slip_url"),
  releasedAt: timestamp("released_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const transactionsRelations = relations(transactions, ({ one }) => ({
  order: one(orders, {
    fields: [transactions.orderId],
    references: [orders.id],
  }),
  booking: one(bookings, {
    fields: [transactions.bookingId],
    references: [bookings.id],
  }),
  boostPurchase: one(boostPurchases, {
    fields: [transactions.boostPurchaseId],
    references: [boostPurchases.id],
  }),
  buyer: one(users, {
    fields: [transactions.buyerId],
    references: [users.id],
  }),
  seller: one(users, {
    fields: [transactions.sellerId],
    references: [users.id],
  }),
  bankAccount: one(bankAccounts, {
    fields: [transactions.bankAccountId],
    references: [bankAccounts.id],
  }),
}));

export type Transaction = typeof transactions.$inferSelect;

// Bank Accounts table - Admin-managed bank accounts for international TT payments
export const bankAccounts = pgTable("bank_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Display and organization
  displayName: varchar("display_name", { length: 100 }).notNull(), // Admin shorthand (e.g., "USD Primary", "EUR Business")
  sortOrder: integer("sort_order").notNull().default(0), // Control display order for buyers
  isDefault: boolean("is_default").notNull().default(false), // Primary account shown first
  isActive: boolean("is_active").notNull().default(true), // Whether account is enabled
  isPublic: boolean("is_public").notNull().default(true), // Whether account is visible to buyers for checkout (public=buyer-facing, false=internal/admin-only)
  
  // Basic bank information
  bankName: varchar("bank_name", { length: 255 }).notNull(),
  accountHolderName: varchar("account_holder_name", { length: 255 }).notNull(),
  accountNumber: varchar("account_number", { length: 100 }).notNull(), // Unique per country
  
  // International transfer codes - at least one required
  swiftCode: varchar("swift_code", { length: 20 }), // SWIFT/BIC for international transfers (8 or 11 chars)
  iban: varchar("iban", { length: 50 }), // IBAN for Europe/international
  routingNumber: varchar("routing_number", { length: 20 }), // For US banks (ABA routing)
  
  // Bank location details
  bankAddress: text("bank_address"),
  branchName: varchar("branch_name", { length: 255 }),
  branchCode: varchar("branch_code", { length: 50 }),
  city: varchar("city", { length: 100 }),
  country: varchar("country", { length: 100 }).notNull(),
  
  // Account details
  currency: varchar("currency", { length: 3 }).notNull().default("USD"), // ISO 4217 currency code
  accountType: varchar("account_type", { length: 50 }), // e.g., "Checking", "Business Savings"
  
  // Additional instructions for buyers
  transferInstructions: text("transfer_instructions"), // Special notes for TT (e.g., reference format)
  
  // Admin audit trail
  createdByAdminId: varchar("created_by_admin_id").references(() => users.id),
  updatedByAdminId: varchar("updated_by_admin_id").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const bankAccountsRelations = relations(bankAccounts, ({ one, many }) => ({
  createdByAdmin: one(users, {
    fields: [bankAccounts.createdByAdminId],
    references: [users.id],
    relationName: "createdBankAccounts",
  }),
  updatedByAdmin: one(users, {
    fields: [bankAccounts.updatedByAdminId],
    references: [users.id],
    relationName: "updatedBankAccounts",
  }),
  transactions: many(transactions),
}));

// Base Zod schema for bank account fields (before refinement)
const baseBankAccountSchema = createInsertSchema(bankAccounts, {
  displayName: z.string().min(1, "Display name is required").max(100),
  bankName: z.string().min(2, "Bank name is required").max(255),
  accountHolderName: z.string().min(2, "Account holder name is required").max(255),
  accountNumber: z.string().min(5, "Account number is required").max(100),
  country: z.string().min(2, "Country is required").max(100),
  currency: z.string().length(3, "Currency must be a 3-letter ISO code (e.g., USD, EUR)").regex(/^[A-Z]{3}$/, "Currency must be uppercase letters"),
  // SWIFT: 8 or 11 alphanumeric characters
  swiftCode: z.string().regex(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, "Invalid SWIFT code format (e.g., AAAABBCCXXX)").optional().or(z.literal("")),
  // IBAN: Basic validation (2-letter country + 2 digits + up to 30 alphanumeric)
  iban: z.string().regex(/^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/, "Invalid IBAN format").optional().or(z.literal("")),
  routingNumber: z.string().max(20).optional().or(z.literal("")),
  accountType: z.string().max(50).optional().or(z.literal("")),
  transferInstructions: z.string().optional().or(z.literal("")),
  bankAddress: z.string().optional().or(z.literal("")),
  branchName: z.string().max(255).optional().or(z.literal("")),
  branchCode: z.string().max(50).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  sortOrder: z.number().int().default(0),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  isPublic: z.boolean().default(true),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdByAdminId: true,
  updatedByAdminId: true,
});

// Insert schema with refinement for required international identifiers
export const insertBankAccountSchema = baseBankAccountSchema.refine(
  (data) => data.swiftCode || data.iban,
  {
    message: "At least one international identifier (SWIFT or IBAN) is required",
    path: ["swiftCode"],
  }
);

// Update schema (partial fields, no refinement since updates may be incomplete)
export const updateBankAccountSchema = baseBankAccountSchema.partial();

export type BankAccount = typeof bankAccounts.$inferSelect;
export type InsertBankAccount = z.infer<typeof insertBankAccountSchema>;
export type UpdateBankAccount = z.infer<typeof updateBankAccountSchema>;

// Comprehensive seller rating system - only after verified delivery/completion
// Order ratings (for physical products)
export const orderRatings = pgTable("order_ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().unique().references(() => orders.id, { onDelete: "cascade" }), // One rating per order
  buyerId: varchar("buyer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sellerId: varchar("seller_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(), // 1-5 star rating
  comment: text("comment"), // Optional comment
  images: text("images").array(), // Optional photo evidence (GCS URLs)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const orderRatingsRelations = relations(orderRatings, ({ one }) => ({
  order: one(orders, {
    fields: [orderRatings.orderId],
    references: [orders.id],
  }),
  buyer: one(users, {
    fields: [orderRatings.buyerId],
    references: [users.id],
  }),
  seller: one(users, {
    fields: [orderRatings.sellerId],
    references: [users.id],
  }),
}));

export const insertOrderRatingSchema = createInsertSchema(orderRatings, {
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
  images: z.array(z.string().url()).max(5).optional(), // Max 5 images
}).omit({ id: true, buyerId: true, sellerId: true, orderId: true, createdAt: true, updatedAt: true });

export type OrderRating = typeof orderRatings.$inferSelect;
export type InsertOrderRating = z.infer<typeof insertOrderRatingSchema>;

// Homepage banners table
export type BannerType = "hero" | "promotion" | "news";

export const homepageBanners = pgTable("homepage_banners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type", { length: 20 }).notNull().default("hero").$type<BannerType>(),
  imageUrl: varchar("image_url").notNull(),
  title: varchar("title", { length: 255 }),
  subtitle: text("subtitle"),
  description: text("description"),
  ctaText: varchar("cta_text", { length: 100 }),
  ctaLink: varchar("cta_link", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertHomepageBannerSchema = createInsertSchema(homepageBanners, {
  imageUrl: z.string().min(1, "Image URL is required"),
  title: z.string().optional(),
  type: z.enum(["hero", "promotion", "news"]).default("hero"),
  displayOrder: z.number().int().min(0).default(0),
}).omit({ id: true, createdAt: true, updatedAt: true });

export type HomepageBanner = typeof homepageBanners.$inferSelect;
export type InsertHomepageBanner = z.infer<typeof insertHomepageBannerSchema>;

// Boost packages table - defines boost packages that sellers can use
export const boostPackages = pgTable("boost_packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description").notNull(),
  durationDays: integer("duration_days").notNull(), // How many days the boost lasts
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  features: jsonb("features").$type<string[]>(), // Array of features like ["Homepage Featured", "Priority Search"]
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBoostPackageSchema = createInsertSchema(boostPackages, {
  name: z.string().min(1, "Package name is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  durationDays: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseInt(val, 10) : val),
  price: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseFloat(val) : val),
}).omit({ id: true, createdAt: true, updatedAt: true });

export type BoostPackage = typeof boostPackages.$inferSelect;
export type InsertBoostPackage = z.infer<typeof insertBoostPackageSchema>;

// Boosted items table - tracks which products/services are currently boosted
export type BoostedItemType = "product" | "service";

export const boostedItems = pgTable("boosted_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  itemType: varchar("item_type", { length: 20 }).notNull().$type<BoostedItemType>(),
  itemId: varchar("item_id").notNull(), // References either products.id or services.id
  packageId: varchar("package_id").references(() => boostPackages.id, { onDelete: "set null" }),
  startDate: timestamp("start_date").notNull().defaultNow(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const boostedItemsRelations = relations(boostedItems, ({ one }) => ({
  package: one(boostPackages, {
    fields: [boostedItems.packageId],
    references: [boostPackages.id],
  }),
}));

export const insertBoostedItemSchema = createInsertSchema(boostedItems, {
  itemType: z.enum(["product", "service"]),
  itemId: z.string().min(1, "Item ID is required"),
  endDate: z.union([z.string(), z.date()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
}).omit({ id: true, startDate: true, createdAt: true });

export type BoostedItem = typeof boostedItems.$inferSelect;
export type InsertBoostedItem = z.infer<typeof insertBoostedItemSchema>;

// Boost purchases table - tracks seller boost package purchases
export type BoostPurchaseStatus = "pending" | "processing" | "paid" | "failed" | "cancelled";

export const boostPurchases = pgTable("boost_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  packageId: varchar("package_id").notNull().references(() => boostPackages.id),
  itemType: varchar("item_type", { length: 20 }).notNull().$type<BoostedItemType>(),
  itemId: varchar("item_id").notNull(), // References either products.id or services.id
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  status: varchar("status", { length: 20 }).notNull().default("pending").$type<BoostPurchaseStatus>(),
  paymentMethod: varchar("payment_method", { length: 20 }).$type<PaymentMethod>(),
  paymentReference: varchar("payment_reference", { length: 255 }),
  paymentSlipUrl: text("payment_slip_url"), // URL to uploaded payment slip image
  paymentDetails: jsonb("payment_details"), // Store IPG response data
  boostedItemId: varchar("boosted_item_id").references(() => boostedItems.id), // Link to created boost
  createdAt: timestamp("created_at").defaultNow(),
  paidAt: timestamp("paid_at"),
});

export const boostPurchasesRelations = relations(boostPurchases, ({ one }) => ({
  seller: one(users, {
    fields: [boostPurchases.sellerId],
    references: [users.id],
  }),
  package: one(boostPackages, {
    fields: [boostPurchases.packageId],
    references: [boostPackages.id],
  }),
  boostedItem: one(boostedItems, {
    fields: [boostPurchases.boostedItemId],
    references: [boostedItems.id],
  }),
}));

export const insertBoostPurchaseSchema = createInsertSchema(boostPurchases, {
  amount: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'string' ? parseFloat(val) : val
  ),
  currency: z.string().length(3).default("USD"),
  status: z.enum(["pending", "paid", "failed", "cancelled"]).default("pending"),
}).omit({ id: true, createdAt: true });

export type BoostPurchase = typeof boostPurchases.$inferSelect;
export type InsertBoostPurchase = z.infer<typeof insertBoostPurchaseSchema>;

// Aramex Shipments table - Tracks Aramex shipment creation and status
export const aramexShipments = pgTable("aramex_shipments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  sellerId: varchar("seller_id").notNull().references(() => users.id),
  
  // Aramex identifiers
  awbNumber: varchar("awb_number", { length: 50 }).notNull(), // Airway Bill Number from Aramex
  foreignHawb: varchar("foreign_hawb", { length: 50 }), // Client's shipment reference
  
  // Shipment details
  status: varchar("status", { length: 30 }).notNull().default("created").$type<AramexShipmentStatus>(),
  productType: varchar("product_type", { length: 50 }), // e.g., "EXP" for Express, "DOM" for Domestic
  
  // Shipping addresses (stored as JSON for flexibility)
  shipperDetails: jsonb("shipper_details").$type<{
    name: string;
    company: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    country: string;
  }>(),
  consigneeDetails: jsonb("consignee_details").$type<{
    name: string;
    company?: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    country: string;
  }>(),
  
  // Package information
  numberOfPieces: integer("number_of_pieces").notNull().default(1),
  actualWeight: decimal("actual_weight", { precision: 10, scale: 2 }).notNull(), // in KG
  chargeableWeight: decimal("chargeable_weight", { precision: 10, scale: 2 }), // in KG
  descriptionOfGoods: text("description_of_goods"),
  goodsValue: decimal("goods_value", { precision: 10, scale: 2 }), // Declared value
  
  // Label information
  labelUrl: text("label_url"), // URL to download shipping label PDF
  labelFileContents: text("label_file_contents"), // Base64 encoded label if using file stream method
  
  // Tracking
  trackingUrl: text("tracking_url"),
  
  // Aramex response data
  aramexResponse: jsonb("aramex_response"), // Store full API response for reference
  
  // Pickup association
  pickupGuid: varchar("pickup_guid", { length: 100 }), // Aramex pickup GUID if associated
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const aramexShipmentsRelations = relations(aramexShipments, ({ one }) => ({
  order: one(orders, {
    fields: [aramexShipments.orderId],
    references: [orders.id],
  }),
  seller: one(users, {
    fields: [aramexShipments.sellerId],
    references: [users.id],
  }),
}));

export const insertAramexShipmentSchema = createInsertSchema(aramexShipments, {
  awbNumber: z.string().min(1, "AWB number is required"),
  actualWeight: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'string' ? parseFloat(val) : val
  ),
  numberOfPieces: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'string' ? parseInt(val, 10) : val
  ),
}).omit({ id: true, createdAt: true, updatedAt: true });

export type AramexShipment = typeof aramexShipments.$inferSelect;
export type InsertAramexShipment = z.infer<typeof insertAramexShipmentSchema>;

// Consolidated Shipments table - Tracks when admin combines multiple orders into one Aramex shipment
export const consolidatedShipments = pgTable("consolidated_shipments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buyerId: varchar("buyer_id").notNull().references(() => users.id),
  
  // Aramex shipment details
  awbNumber: varchar("awb_number", { length: 50 }), // Final AWB number after consolidation
  labelUrl: text("label_url"), // Shipping label for consolidated package
  trackingUrl: text("tracking_url"),
  
  // Consolidation details
  numberOfOrders: integer("number_of_orders").notNull().default(1), // How many orders combined
  totalWeight: decimal("total_weight", { precision: 10, scale: 2 }), // Combined weight in KG
  totalShippingCost: decimal("total_shipping_cost", { precision: 10, scale: 2 }), // What buyers paid for shipping
  actualAramexCost: decimal("actual_aramex_cost", { precision: 10, scale: 2 }), // What Aramex actually charged
  
  // Payment tracking - for admin to mark when they've paid Aramex
  aramexPaymentStatus: varchar("aramex_payment_status", { length: 20 }).notNull().default("unpaid"), // unpaid or paid
  aramexPaidAt: timestamp("aramex_paid_at"), // When admin marked Aramex as paid
  
  // Status tracking
  status: varchar("status", { length: 30 }).notNull().default("pending").$type<AramexShipmentStatus>(),
  
  // Admin who created the consolidation
  createdByAdminId: varchar("created_by_admin_id").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const consolidatedShipmentsRelations = relations(consolidatedShipments, ({ one, many }) => ({
  buyer: one(users, {
    fields: [consolidatedShipments.buyerId],
    references: [users.id],
  }),
  createdByAdmin: one(users, {
    fields: [consolidatedShipments.createdByAdminId],
    references: [users.id],
  }),
  orders: many(orders),
}));

export const insertConsolidatedShipmentSchema = createInsertSchema(consolidatedShipments, {
  numberOfOrders: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'string' ? parseInt(val, 10) : val
  ),
  totalWeight: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'string' ? parseFloat(val) : val
  ),
  totalShippingCost: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'string' ? parseFloat(val) : val
  ),
  actualAramexCost: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'string' ? parseFloat(val) : val
  ).optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export type ConsolidatedShipment = typeof consolidatedShipments.$inferSelect;
export type InsertConsolidatedShipment = z.infer<typeof insertConsolidatedShipmentSchema>;

// Return Requests table - Tracks buyer return/refund requests for orders and bookings
export const returnRequests = pgTable("return_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Participants
  buyerId: varchar("buyer_id").notNull().references(() => users.id),
  sellerId: varchar("seller_id").references(() => users.id), // Nullable for admin-to-buyer direct refunds
  
  // Related entity (one of these will be set)
  orderId: varchar("order_id").references(() => orders.id, { onDelete: "cascade" }),
  bookingId: varchar("booking_id").references(() => bookings.id, { onDelete: "cascade" }),
  
  // Request details
  type: varchar("type", { length: 20 }).notNull(), // "order" or "booking"
  status: varchar("status", { length: 30 }).notNull().default("requested").$type<ReturnRequestStatus>(),
  reason: varchar("reason", { length: 30 }).notNull().$type<ReturnRequestReason>(),
  description: text("description").notNull(), // Buyer's explanation
  evidenceUrls: text("evidence_urls").array(), // Photos/documents uploaded by buyer
  
  // Financial details
  requestedRefundAmount: decimal("requested_refund_amount", { precision: 10, scale: 2 }), // What buyer is asking for
  approvedRefundAmount: decimal("approved_refund_amount", { precision: 10, scale: 2 }), // What was approved (partial or full)
  commissionReversedAmount: decimal("commission_reversed_amount", { precision: 10, scale: 2 }), // Commission to be reversed
  
  // Seller response (separate from overall status)
  sellerStatus: varchar("seller_status", { length: 20 }).default("pending").$type<SellerReturnStatus>(), // pending, approved, rejected
  sellerResponse: text("seller_response"), // Seller's message to buyer
  sellerProposedRefundAmount: decimal("seller_proposed_refund_amount", { precision: 10, scale: 2 }), // Seller's counter-offer
  sellerResponseAt: timestamp("seller_response_at"),
  
  // Admin oversight
  adminReviewedById: varchar("admin_reviewed_by_id").references(() => users.id),
  adminNotes: text("admin_notes"),
  adminOverride: boolean("admin_override").default(false), // If admin overrode seller decision
  adminReviewedAt: timestamp("admin_reviewed_at"),
  
  // Resolution tracking (milestone timestamps)
  underReviewAt: timestamp("under_review_at"), // When moved to under_review
  resolvedAt: timestamp("resolved_at"), // When admin approved/rejected
  refundedAt: timestamp("refunded_at"), // When refund was actually processed
  completedAt: timestamp("completed_at"), // When fully closed
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const returnRequestsRelations = relations(returnRequests, ({ one }) => ({
  buyer: one(users, {
    fields: [returnRequests.buyerId],
    references: [users.id],
  }),
  seller: one(users, {
    fields: [returnRequests.sellerId],
    references: [users.id],
  }),
  order: one(orders, {
    fields: [returnRequests.orderId],
    references: [orders.id],
  }),
  booking: one(bookings, {
    fields: [returnRequests.bookingId],
    references: [bookings.id],
  }),
  adminReviewer: one(users, {
    fields: [returnRequests.adminReviewedById],
    references: [users.id],
  }),
}));

export const insertReturnRequestSchema = createInsertSchema(returnRequests, {
  reason: z.enum(["defective", "wrong_item", "not_as_described", "damaged", "changed_mind", "other"]),
  description: z.string().min(10, "Please provide at least 10 characters explaining the issue").max(2000, "Description too long"),
  requestedRefundAmount: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'string' ? parseFloat(val) : val
  ).optional(),
  evidenceUrls: z.array(z.string()).max(5, "Maximum 5 evidence files allowed").optional(),
}).omit({ 
  id: true, 
  buyerId: true, 
  sellerId: true,
  status: true,
  sellerStatus: true,
  sellerResponse: true,
  sellerProposedRefundAmount: true,
  sellerResponseAt: true,
  approvedRefundAmount: true,
  commissionReversedAmount: true,
  adminReviewedById: true,
  adminNotes: true,
  adminOverride: true,
  adminReviewedAt: true,
  underReviewAt: true,
  resolvedAt: true,
  refundedAt: true,
  completedAt: true,
  createdAt: true, 
  updatedAt: true 
});

export type ReturnRequest = typeof returnRequests.$inferSelect;
export type InsertReturnRequest = z.infer<typeof insertReturnRequestSchema>;

// Notification types enum
export type NotificationType = 
  | "order_created" 
  | "order_paid" 
  | "order_shipped" 
  | "order_delivered"
  | "booking_created"
  | "booking_confirmed"
  | "booking_paid"
  | "booking_completed"
  | "quote_received"
  | "quote_accepted"
  | "quote_rejected"
  | "design_submitted"
  | "design_approved"
  | "design_rejected"
  | "design_changes_requested"
  | "payment_confirmed"
  | "payment_required"
  | "return_requested"
  | "return_approved"
  | "return_rejected"
  | "refund_processed"
  | "message_received"
  | "deliverables_uploaded"
  | "seller_verification_approved"
  | "seller_verification_rejected"
  | "boost_purchase_created"
  | "boost_payment_confirmed"
  | "boost_payment_failed"
  // Welcome notification for new users
  | "welcome"
  // Admin notifications
  | "admin_new_user"
  | "admin_verification_pending"
  | "admin_order_pending_payment"
  | "admin_return_pending"
  | "admin_new_product"
  | "admin_new_service";

// Notifications table - for in-app notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull().$type<NotificationType>(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  metadata: jsonb("metadata"), // Store additional context (orderId, bookingId, etc.)
  link: varchar("link", { length: 500 }), // Internal app link to navigate to
  read: boolean("read").notNull().default(false),
  emailSent: boolean("email_sent").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// Booking Deliverables table - for storing files delivered by sellers
export const bookingDeliverables = pgTable("booking_deliverables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: varchar("file_url", { length: 1000 }).notNull(),
  fileSize: integer("file_size"), // in bytes
  mimeType: varchar("mime_type", { length: 100 }),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const bookingDeliverablesRelations = relations(bookingDeliverables, ({ one }) => ({
  booking: one(bookings, {
    fields: [bookingDeliverables.bookingId],
    references: [bookings.id],
  }),
}));

export type BookingDeliverable = typeof bookingDeliverables.$inferSelect;
export type InsertBookingDeliverable = typeof bookingDeliverables.$inferInsert;

// Chat Sessions table - for AI assistant conversation history
export const chatSessions = pgTable("chat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id", { length: 255 }).notNull(), // UUID for session tracking
  messages: jsonb("messages").notNull().default('[]'), // Array of {role: string, content: string, timestamp: string}
  context: jsonb("context"), // Page context, user role, relevant IDs
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const chatSessionsRelations = relations(chatSessions, ({ one }) => ({
  user: one(users, {
    fields: [chatSessions.userId],
    references: [users.id],
  }),
}));

export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = typeof chatSessions.$inferInsert;
