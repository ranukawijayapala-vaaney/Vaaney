import type { NotificationType } from "@shared/schema";

// Email service using Resend
// Note: Resend API key will be provided later and stored in RESEND_API_KEY environment variable

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

interface ResendEmailPayload {
  from: string;
  to: string[];
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (!resendApiKey) {
    console.warn("RESEND_API_KEY not configured. Email not sent:", options.subject);
    return false;
  }

  try {
    const payload: ResendEmailPayload = {
      from: process.env.FROM_EMAIL || "Vaaney <noreply@vaaney.com>",
      to: [options.to],
      subject: options.subject,
      html: options.html,
    };

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to send email:", error);
      return false;
    }

    console.log("Email sent successfully:", options.subject);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

// Email template generator based on notification type
export function generateEmailTemplate(
  type: NotificationType,
  data: {
    recipientName?: string;
    orderId?: string;
    bookingId?: string;
    quoteAmount?: string;
    productName?: string;
    serviceName?: string;
    trackingNumber?: string;
    rejectionReason?: string;
    refundAmount?: string;
    deliverableCount?: number;
    link?: string;
  }
): { subject: string; html: string } {
  const baseUrl = process.env.REPLIT_DOMAINS?.split(",")[0] || "https://vaaney.com";
  const brandColor = "#0ea5e9"; // Primary brand color
  
  const templates: Record<NotificationType, { subject: string; html: string }> = {
    order_created: {
      subject: "Order Confirmation - Vaaney",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${brandColor};">Order Confirmed!</h2>
          <p>Hi ${data.recipientName || "there"},</p>
          <p>Your order <strong>#${data.orderId?.substring(0, 8)}</strong> has been successfully placed.</p>
          <p><strong>Product:</strong> ${data.productName}</p>
          <p>We'll notify you when your order is shipped.</p>
          <a href="${baseUrl}/orders" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">View Order</a>
          <p style="color: #666; font-size: 14px; margin-top: 24px;">Thank you for shopping with Vaaney!</p>
        </div>
      `,
    },
    order_paid: {
      subject: "Payment Confirmed - Vaaney",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${brandColor};">Payment Confirmed</h2>
          <p>Hi ${data.recipientName || "there"},</p>
          <p>We've confirmed your payment for order <strong>#${data.orderId?.substring(0, 8)}</strong>.</p>
          <p>Your order is now being processed and will be shipped soon.</p>
          <a href="${baseUrl}/orders" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Track Order</a>
        </div>
      `,
    },
    order_shipped: {
      subject: "Your Order Has Shipped - Vaaney",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${brandColor};">Order Shipped!</h2>
          <p>Hi ${data.recipientName || "there"},</p>
          <p>Great news! Your order <strong>#${data.orderId?.substring(0, 8)}</strong> has been shipped.</p>
          ${data.trackingNumber ? `<p><strong>Tracking Number:</strong> ${data.trackingNumber}</p>` : ""}
          <a href="${baseUrl}/orders" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Track Shipment</a>
        </div>
      `,
    },
    order_delivered: {
      subject: "Order Delivered - Vaaney",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${brandColor};">Order Delivered!</h2>
          <p>Hi ${data.recipientName || "there"},</p>
          <p>Your order <strong>#${data.orderId?.substring(0, 8)}</strong> has been delivered.</p>
          <p>We hope you love your purchase! Please consider leaving a review.</p>
          <a href="${baseUrl}/orders" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Rate Your Purchase</a>
        </div>
      `,
    },
    booking_created: {
      subject: "Service Booking Request Received - Vaaney",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${brandColor};">Booking Request Received</h2>
          <p>Hi ${data.recipientName || "there"},</p>
          <p>Your booking request for <strong>${data.serviceName}</strong> has been received.</p>
          <p>Booking ID: <strong>#${data.bookingId?.substring(0, 8)}</strong></p>
          <p>The seller will review and confirm your booking soon.</p>
          <a href="${baseUrl}/bookings" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">View Booking</a>
        </div>
      `,
    },
    booking_confirmed: {
      subject: "Service Booking Confirmed - Vaaney",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${brandColor};">Booking Confirmed!</h2>
          <p>Hi ${data.recipientName || "there"},</p>
          <p>Your booking <strong>#${data.bookingId?.substring(0, 8)}</strong> has been confirmed by the seller.</p>
          <p><strong>Service:</strong> ${data.serviceName}</p>
          <p>Please proceed with payment to secure your booking.</p>
          <a href="${baseUrl}/bookings" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Make Payment</a>
        </div>
      `,
    },
    booking_paid: {
      subject: "Payment Confirmed for Service Booking - Vaaney",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${brandColor};">Payment Confirmed</h2>
          <p>Hi ${data.recipientName || "there"},</p>
          <p>Your payment for booking <strong>#${data.bookingId?.substring(0, 8)}</strong> has been confirmed.</p>
          <p>The service will begin as scheduled. The seller will be in touch soon!</p>
          <a href="${baseUrl}/bookings" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">View Booking</a>
        </div>
      `,
    },
    booking_completed: {
      subject: "Service Completed - Vaaney",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${brandColor};">Service Completed!</h2>
          <p>Hi ${data.recipientName || "there"},</p>
          <p>The service for booking <strong>#${data.bookingId?.substring(0, 8)}</strong> has been marked as completed.</p>
          <p>Please check your booking for any deliverables and consider leaving a review!</p>
          <a href="${baseUrl}/bookings" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">View Details</a>
        </div>
      `,
    },
    quote_received: {
      subject: "You've Received a Custom Quote - Vaaney",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${brandColor};">Custom Quote Received</h2>
          <p>Hi ${data.recipientName || "there"},</p>
          <p>You've received a custom quote for <strong>${data.productName || data.serviceName}</strong>.</p>
          <p><strong>Quoted Amount:</strong> $${data.quoteAmount}</p>
          <p>Review and accept the quote to proceed with your purchase.</p>
          <a href="${baseUrl}/quotes" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Review Quote</a>
        </div>
      `,
    },
    quote_accepted: {
      subject: "Quote Accepted - Vaaney",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${brandColor};">Quote Accepted!</h2>
          <p>Hi ${data.recipientName || "there"},</p>
          <p>Great news! Your quote for <strong>${data.productName || data.serviceName}</strong> has been accepted.</p>
          <p><strong>Amount:</strong> $${data.quoteAmount}</p>
          <p>The buyer will proceed with payment shortly.</p>
          <a href="${baseUrl}/seller/quotes" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">View Quote</a>
        </div>
      `,
    },
    quote_rejected: {
      subject: "Quote Declined - Vaaney",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ef4444;">Quote Declined</h2>
          <p>Hi ${data.recipientName || "there"},</p>
          <p>The quote for <strong>${data.productName || data.serviceName}</strong> was not accepted by the buyer.</p>
          <p>You can reach out to the buyer to discuss alternative options.</p>
          <a href="${baseUrl}/messages" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Contact Buyer</a>
        </div>
      `,
    },
    design_submitted: {
      subject: "New Design Submitted for Approval - Vaaney",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${brandColor};">Design Submitted</h2>
          <p>Hi ${data.recipientName || "there"},</p>
          <p>A new design has been submitted for your review for <strong>${data.productName || data.serviceName}</strong>.</p>
          <p>Please review and provide feedback as soon as possible.</p>
          <a href="${baseUrl}/seller/design-approvals" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Review Design</a>
        </div>
      `,
    },
    design_approved: {
      subject: "Design Approved! - Vaaney",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${brandColor};">Design Approved!</h2>
          <p>Hi ${data.recipientName || "there"},</p>
          <p>Great news! Your design has been approved for <strong>${data.productName || data.serviceName}</strong>.</p>
          <p>You can now proceed with your order or request a custom quote.</p>
          <a href="${baseUrl}/design-approvals" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">View Design</a>
        </div>
      `,
    },
    design_rejected: {
      subject: "Design Revision Needed - Vaaney",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ef4444;">Design Requires Revision</h2>
          <p>Hi ${data.recipientName || "there"},</p>
          <p>Your design for <strong>${data.productName || data.serviceName}</strong> needs revisions.</p>
          ${data.rejectionReason ? `<p><strong>Feedback:</strong> ${data.rejectionReason}</p>` : ""}
          <p>Please review the feedback and submit an updated design.</p>
          <a href="${baseUrl}/design-approvals" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">View Feedback</a>
        </div>
      `,
    },
    design_changes_requested: {
      subject: "Changes Requested for Your Design - Vaaney",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${brandColor};">Design Changes Requested</h2>
          <p>Hi ${data.recipientName || "there"},</p>
          <p>The seller has requested changes to your design for <strong>${data.productName || data.serviceName}</strong>.</p>
          ${data.rejectionReason ? `<p><strong>Requested Changes:</strong> ${data.rejectionReason}</p>` : ""}
          <a href="${baseUrl}/design-approvals" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Upload Revision</a>
        </div>
      `,
    },
    payment_confirmed: {
      subject: "Payment Confirmed - Vaaney",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${brandColor};">Payment Confirmed</h2>
          <p>Hi ${data.recipientName || "there"},</p>
          <p>Your payment has been confirmed by our admin team.</p>
          <p>Your order/booking will now be processed.</p>
          <a href="${baseUrl}" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">View Dashboard</a>
        </div>
      `,
    },
    payment_required: {
      subject: "Payment Required - Vaaney",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${brandColor};">Payment Required</h2>
          <p>Hi ${data.recipientName || "there"},</p>
          <p>Your order/booking is confirmed and awaiting payment.</p>
          <p>Please complete the payment to proceed.</p>
          <a href="${data.link || baseUrl}" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Make Payment</a>
        </div>
      `,
    },
    return_requested: {
      subject: "Return Request Received - Vaaney",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${brandColor};">Return Request Received</h2>
          <p>Hi ${data.recipientName || "there"},</p>
          <p>A return request has been submitted for order <strong>#${data.orderId?.substring(0, 8)}</strong>.</p>
          <p>Please review and respond to the request.</p>
          <a href="${baseUrl}/seller/returns" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Review Request</a>
        </div>
      `,
    },
    return_approved: {
      subject: "Return Request Approved - Vaaney",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${brandColor};">Return Approved</h2>
          <p>Hi ${data.recipientName || "there"},</p>
          <p>Your return request for order <strong>#${data.orderId?.substring(0, 8)}</strong> has been approved.</p>
          <p>Further instructions will be provided shortly.</p>
          <a href="${baseUrl}/orders" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">View Details</a>
        </div>
      `,
    },
    return_rejected: {
      subject: "Return Request Update - Vaaney",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ef4444;">Return Request Not Approved</h2>
          <p>Hi ${data.recipientName || "there"},</p>
          <p>Your return request for order <strong>#${data.orderId?.substring(0, 8)}</strong> was not approved.</p>
          ${data.rejectionReason ? `<p><strong>Reason:</strong> ${data.rejectionReason}</p>` : ""}
          <p>Please contact support if you have questions.</p>
          <a href="${baseUrl}/messages" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Contact Support</a>
        </div>
      `,
    },
    refund_processed: {
      subject: "Refund Processed - Vaaney",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${brandColor};">Refund Processed</h2>
          <p>Hi ${data.recipientName || "there"},</p>
          <p>Your refund of <strong>$${data.refundAmount}</strong> has been processed.</p>
          <p>The amount will be credited to your account within 5-7 business days.</p>
          <a href="${baseUrl}/orders" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">View Order</a>
        </div>
      `,
    },
    message_received: {
      subject: "New Message - Vaaney",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${brandColor};">New Message</h2>
          <p>Hi ${data.recipientName || "there"},</p>
          <p>You have received a new message on Vaaney.</p>
          <a href="${baseUrl}/messages" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">View Message</a>
        </div>
      `,
    },
    deliverables_uploaded: {
      subject: "Service Deliverables Ready - Vaaney",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${brandColor};">Your Service Deliverables Are Ready!</h2>
          <p>Hi ${data.recipientName || "there"},</p>
          <p>The seller has uploaded ${data.deliverableCount || "your"} deliverable${(data.deliverableCount || 0) > 1 ? "s" : ""} for booking <strong>#${data.bookingId?.substring(0, 8)}</strong>.</p>
          <p>You can now download your files from the booking page.</p>
          <a href="${baseUrl}/bookings" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Download Files</a>
        </div>
      `,
    },
    seller_verification_approved: {
      subject: "Seller Account Approved! - Vaaney",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${brandColor};">Congratulations!</h2>
          <p>Hi ${data.recipientName || "there"},</p>
          <p>Your seller account has been approved!</p>
          <p>You can now start listing products and services on Vaaney.</p>
          <a href="${baseUrl}/seller/dashboard" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Go to Dashboard</a>
        </div>
      `,
    },
    seller_verification_rejected: {
      subject: "Seller Verification Update - Vaaney",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ef4444;">Verification Not Approved</h2>
          <p>Hi ${data.recipientName || "there"},</p>
          <p>We were unable to approve your seller account at this time.</p>
          ${data.rejectionReason ? `<p><strong>Reason:</strong> ${data.rejectionReason}</p>` : ""}
          <p>You can resubmit your verification documents with the required information.</p>
          <a href="${baseUrl}/profile" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Update Profile</a>
        </div>
      `,
    },
  };

  return templates[type] || {
    subject: "Notification - Vaaney",
    html: `<p>You have a new notification on Vaaney.</p>`,
  };
}
