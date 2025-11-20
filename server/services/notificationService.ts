import { db } from "../db";
import { notifications, users } from "@shared/schema";
import type { NotificationType, InsertNotification } from "@shared/schema";
import { sendEmail, generateEmailTemplate } from "./emailService";
import { eq } from "drizzle-orm";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
  sendEmailNotification?: boolean;
}

/**
 * Creates an in-app notification and optionally sends an email
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  const {
    userId,
    type,
    title,
    message,
    link,
    metadata,
    sendEmailNotification = true,
  } = params;

  try {
    // Create in-app notification
    const [notification] = await db.insert(notifications).values({
      userId,
      type,
      title,
      message,
      link,
      metadata: metadata || {},
      read: false,
      emailSent: false,
    }).returning();

    // Send email if requested
    if (sendEmailNotification) {
      // Get user email
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      
      if (user?.email) {
        const recipientName = user.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : undefined;
        
        const emailTemplate = generateEmailTemplate(type, {
          recipientName,
          ...metadata,
        });

        const emailSent = await sendEmail({
          to: user.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
        });

        // Update notification to mark email as sent
        if (emailSent) {
          await db.update(notifications)
            .set({ emailSent: true })
            .where(eq(notifications.id, notification.id));
        }
      }
    }
  } catch (error) {
    console.error("Error creating notification:", error);
    // Don't throw - we don't want notification failures to break main business logic
  }
}

/**
 * Helper functions for common notification scenarios
 */

export async function notifyOrderCreated(params: {
  buyerId: string;
  orderId: string;
  productName: string;
}) {
  await createNotification({
    userId: params.buyerId,
    type: "order_created",
    title: "Order Confirmed",
    message: `Your order for ${params.productName} has been successfully placed.`,
    link: `/orders`,
    metadata: {
      orderId: params.orderId,
      productName: params.productName,
    },
  });
}

export async function notifyOrderPaid(params: {
  buyerId: string;
  sellerId: string;
  orderId: string;
  productName: string;
}) {
  // Notify buyer
  await createNotification({
    userId: params.buyerId,
    type: "order_paid",
    title: "Payment Confirmed",
    message: `Your payment for order #${params.orderId.substring(0, 8)} has been confirmed.`,
    link: `/orders`,
    metadata: { orderId: params.orderId, productName: params.productName },
  });

  // Notify seller
  await createNotification({
    userId: params.sellerId,
    type: "order_paid",
    title: "New Order Received",
    message: `You received a new paid order for ${params.productName}.`,
    link: `/seller/orders`,
    metadata: { orderId: params.orderId, productName: params.productName },
  });
}

export async function notifyOrderShipped(params: {
  buyerId: string;
  orderId: string;
  productName: string;
  trackingNumber?: string;
}) {
  await createNotification({
    userId: params.buyerId,
    type: "order_shipped",
    title: "Order Shipped",
    message: `Your order #${params.orderId.substring(0, 8)} has been shipped.`,
    link: `/orders`,
    metadata: {
      orderId: params.orderId,
      productName: params.productName,
      trackingNumber: params.trackingNumber,
    },
  });
}

export async function notifyOrderDelivered(params: {
  buyerId: string;
  orderId: string;
  productName: string;
}) {
  await createNotification({
    userId: params.buyerId,
    type: "order_delivered",
    title: "Order Delivered",
    message: `Your order for ${params.productName} has been delivered!`,
    link: `/orders`,
    metadata: { orderId: params.orderId, productName: params.productName },
  });
}

export async function notifyBookingCreated(params: {
  buyerId: string;
  sellerId: string;
  bookingId: string;
  serviceName: string;
}) {
  // Notify buyer
  await createNotification({
    userId: params.buyerId,
    type: "booking_created",
    title: "Booking Request Received",
    message: `Your booking request for ${params.serviceName} has been received.`,
    link: `/bookings`,
    metadata: { bookingId: params.bookingId, serviceName: params.serviceName },
  });

  // Notify seller
  await createNotification({
    userId: params.sellerId,
    type: "booking_created",
    title: "New Booking Request",
    message: `You have a new booking request for ${params.serviceName}.`,
    link: `/seller/bookings`,
    metadata: { bookingId: params.bookingId, serviceName: params.serviceName },
  });
}

export async function notifyBookingConfirmed(params: {
  buyerId: string;
  bookingId: string;
  serviceName: string;
}) {
  await createNotification({
    userId: params.buyerId,
    type: "booking_confirmed",
    title: "Booking Confirmed",
    message: `Your booking for ${params.serviceName} has been confirmed. Please proceed with payment.`,
    link: `/bookings`,
    metadata: { bookingId: params.bookingId, serviceName: params.serviceName },
  });
}

export async function notifyBookingPaid(params: {
  buyerId: string;
  sellerId: string;
  bookingId: string;
  serviceName: string;
}) {
  // Notify buyer
  await createNotification({
    userId: params.buyerId,
    type: "booking_paid",
    title: "Payment Confirmed",
    message: `Your payment for ${params.serviceName} booking has been confirmed.`,
    link: `/bookings`,
    metadata: { bookingId: params.bookingId, serviceName: params.serviceName },
  });

  // Notify seller
  await createNotification({
    userId: params.sellerId,
    type: "booking_paid",
    title: "Booking Paid",
    message: `Payment confirmed for ${params.serviceName} booking. You can start the service.`,
    link: `/seller/bookings`,
    metadata: { bookingId: params.bookingId, serviceName: params.serviceName },
  });
}

export async function notifyBookingCompleted(params: {
  buyerId: string;
  bookingId: string;
  serviceName: string;
  deliverables?: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  }>;
}) {
  await createNotification({
    userId: params.buyerId,
    type: "booking_completed",
    title: "Service Completed",
    message: params.deliverables && params.deliverables.length > 0
      ? `The service for ${params.serviceName} has been completed with ${params.deliverables.length} deliverable file(s)!`
      : `The service for ${params.serviceName} has been completed.`,
    link: `/bookings`,
    metadata: { 
      bookingId: params.bookingId, 
      serviceName: params.serviceName,
      deliverables: params.deliverables || []
    },
  });
}

export async function notifyQuoteReceived(params: {
  buyerId: string;
  quoteId: string;
  itemName: string;
  quoteAmount: string;
}) {
  await createNotification({
    userId: params.buyerId,
    type: "quote_received",
    title: "Custom Quote Received",
    message: `You've received a quote of $${params.quoteAmount} for ${params.itemName}.`,
    link: `/quotes`,
    metadata: { quoteId: params.quoteId, quoteAmount: params.quoteAmount, productName: params.itemName },
  });
}

export async function notifyQuoteAccepted(params: {
  sellerId: string;
  quoteId: string;
  itemName: string;
  quoteAmount: string;
}) {
  await createNotification({
    userId: params.sellerId,
    type: "quote_accepted",
    title: "Quote Accepted",
    message: `Your quote for ${params.itemName} ($${params.quoteAmount}) has been accepted!`,
    link: `/seller/quotes`,
    metadata: { quoteId: params.quoteId, quoteAmount: params.quoteAmount, productName: params.itemName },
  });
}

export async function notifyQuoteRejected(params: {
  sellerId: string;
  quoteId: string;
  itemName: string;
}) {
  await createNotification({
    userId: params.sellerId,
    type: "quote_rejected",
    title: "Quote Declined",
    message: `Your quote for ${params.itemName} was not accepted.`,
    link: `/seller/quotes`,
    metadata: { quoteId: params.quoteId, productName: params.itemName },
  });
}

export async function notifyDesignSubmitted(params: {
  sellerId: string;
  designApprovalId: string;
  itemName: string;
}) {
  await createNotification({
    userId: params.sellerId,
    type: "design_submitted",
    title: "New Design for Approval",
    message: `A new design has been submitted for ${params.itemName}.`,
    link: `/seller/design-approvals`,
    metadata: { designApprovalId: params.designApprovalId, productName: params.itemName },
  });
}

export async function notifyDesignApproved(params: {
  buyerId: string;
  designApprovalId: string;
  itemName: string;
}) {
  await createNotification({
    userId: params.buyerId,
    type: "design_approved",
    title: "Design Approved",
    message: `Your design for ${params.itemName} has been approved!`,
    link: `/design-approvals`,
    metadata: { designApprovalId: params.designApprovalId, productName: params.itemName },
  });
}

export async function notifyDesignRejected(params: {
  buyerId: string;
  designApprovalId: string;
  itemName: string;
  rejectionReason?: string;
}) {
  await createNotification({
    userId: params.buyerId,
    type: "design_rejected",
    title: "Design Requires Revision",
    message: `Your design for ${params.itemName} needs revisions.`,
    link: `/design-approvals`,
    metadata: { 
      designApprovalId: params.designApprovalId, 
      productName: params.itemName,
      rejectionReason: params.rejectionReason,
    },
  });
}

export async function notifyDesignChangesRequested(params: {
  buyerId: string;
  designApprovalId: string;
  itemName: string;
  feedback?: string;
}) {
  await createNotification({
    userId: params.buyerId,
    type: "design_changes_requested",
    title: "Design Changes Requested",
    message: `The seller has requested changes to your design for ${params.itemName}.`,
    link: `/design-approvals`,
    metadata: { 
      designApprovalId: params.designApprovalId, 
      productName: params.itemName,
      rejectionReason: params.feedback,
    },
  });
}

export async function notifyPaymentConfirmed(params: {
  userId: string;
  itemType: "order" | "booking";
  itemId: string;
}) {
  await createNotification({
    userId: params.userId,
    type: "payment_confirmed",
    title: "Payment Confirmed",
    message: `Your payment has been confirmed by our admin team.`,
    link: params.itemType === "order" ? `/orders` : `/bookings`,
    metadata: { [params.itemType === "order" ? "orderId" : "bookingId"]: params.itemId },
  });
}

export async function notifyDeliverablesUploaded(params: {
  buyerId: string;
  bookingId: string;
  serviceName: string;
  deliverableCount: number;
}) {
  await createNotification({
    userId: params.buyerId,
    type: "deliverables_uploaded",
    title: "Service Deliverables Ready",
    message: `${params.deliverableCount} deliverable${params.deliverableCount > 1 ? "s" : ""} uploaded for ${params.serviceName}.`,
    link: `/bookings`,
    metadata: { 
      bookingId: params.bookingId, 
      serviceName: params.serviceName,
      deliverableCount: params.deliverableCount,
    },
  });
}

export async function notifyReturnRequested(params: {
  sellerId: string;
  orderId: string;
  productName: string;
}) {
  await createNotification({
    userId: params.sellerId,
    type: "return_requested",
    title: "Return Request Received",
    message: `A return request has been submitted for ${params.productName}.`,
    link: `/seller/returns`,
    metadata: { orderId: params.orderId, productName: params.productName },
  });
}

export async function notifyReturnApproved(params: {
  buyerId: string;
  orderId: string;
  productName: string;
}) {
  await createNotification({
    userId: params.buyerId,
    type: "return_approved",
    title: "Return Approved",
    message: `Your return request for ${params.productName} has been approved.`,
    link: `/orders`,
    metadata: { orderId: params.orderId, productName: params.productName },
  });
}

export async function notifyReturnRejected(params: {
  buyerId: string;
  orderId: string;
  productName: string;
  rejectionReason?: string;
}) {
  await createNotification({
    userId: params.buyerId,
    type: "return_rejected",
    title: "Return Request Update",
    message: `Your return request for ${params.productName} was not approved.`,
    link: `/orders`,
    metadata: { 
      orderId: params.orderId, 
      productName: params.productName,
      rejectionReason: params.rejectionReason,
    },
  });
}

export async function notifyRefundProcessed(params: {
  buyerId: string;
  orderId: string;
  productName: string;
  refundAmount: string;
}) {
  await createNotification({
    userId: params.buyerId,
    type: "refund_processed",
    title: "Refund Processed",
    message: `Your refund of $${params.refundAmount} has been processed.`,
    link: `/orders`,
    metadata: { 
      orderId: params.orderId, 
      productName: params.productName,
      refundAmount: params.refundAmount,
    },
  });
}

export async function notifySellerVerificationApproved(params: {
  sellerId: string;
}) {
  await createNotification({
    userId: params.sellerId,
    type: "seller_verification_approved",
    title: "Seller Account Approved",
    message: "Congratulations! Your seller account has been approved. You can now start listing products and services.",
    link: `/seller/dashboard`,
    metadata: {},
  });
}

export async function notifySellerVerificationRejected(params: {
  sellerId: string;
  rejectionReason?: string;
}) {
  await createNotification({
    userId: params.sellerId,
    type: "seller_verification_rejected",
    title: "Seller Verification Update",
    message: "Your seller verification was not approved. Please review the feedback and resubmit.",
    link: `/profile`,
    metadata: { rejectionReason: params.rejectionReason },
  });
}
