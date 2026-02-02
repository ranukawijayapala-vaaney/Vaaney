import type { NotificationType } from "@shared/schema";

// Email service using Resend
// Note: Resend API key will be provided later and stored in RESEND_API_KEY environment variable

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface ResendEmailPayload {
  from: string;
  to: string[];
  subject: string;
  html: string;
}

async function sendEmailAttempt(
  options: EmailOptions,
  resendApiKey: string,
  attemptNumber: number,
  logPrefix: string
): Promise<boolean> {
  const fromEmail = process.env.FROM_EMAIL || "Vaaney <onboarding@resend.dev>";
  const payload: ResendEmailPayload = {
    from: fromEmail,
    to: [options.to],
    subject: options.subject,
    html: options.html,
  };

  console.log(`${logPrefix} Attempt ${attemptNumber}: Calling Resend API`, {
    from: fromEmail,
    to: options.to,
    subject: options.subject,
  });

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const responseData = await response.text();

  if (!response.ok) {
    console.error(`${logPrefix} Attempt ${attemptNumber} failed:`, {
      status: response.status,
      statusText: response.statusText,
      to: options.to,
      subject: options.subject,
      error: responseData,
    });
    return false;
  }

  let parsedResponse;
  try {
    parsedResponse = JSON.parse(responseData);
  } catch {
    parsedResponse = responseData;
  }

  console.log(`${logPrefix} ✅ Attempt ${attemptNumber} succeeded:`, {
    to: options.to,
    subject: options.subject,
    responseId: parsedResponse?.id || 'unknown',
    response: parsedResponse,
  });
  return true;
}

export async function sendEmail(options: EmailOptions, maxRetries: number = 3): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;
  
  const timestamp = new Date().toISOString();
  const logPrefix = `[EMAIL ${timestamp}]`;
  
  console.log(`${logPrefix} Attempting to send email:`, {
    to: options.to,
    subject: options.subject,
    timestamp,
    maxRetries,
  });
  
  if (!resendApiKey) {
    console.error(`${logPrefix} RESEND_API_KEY not configured. Email NOT sent:`, {
      to: options.to,
      subject: options.subject,
    });
    return false;
  }

  // Retry logic with exponential backoff
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const success = await sendEmailAttempt(options, resendApiKey, attempt, logPrefix);
      
      if (success) {
        if (attempt > 1) {
          console.log(`${logPrefix} ✅ Email sent successfully after ${attempt} attempts`);
        }
        return true;
      }
      
      // If not the last attempt, wait before retrying
      if (attempt < maxRetries) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
        console.log(`${logPrefix} Waiting ${delayMs}ms before retry ${attempt + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error(`${logPrefix} ❌ Attempt ${attempt} exception:`, {
        to: options.to,
        subject: options.subject,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      // If not the last attempt, wait before retrying
      if (attempt < maxRetries) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`${logPrefix} Waiting ${delayMs}ms before retry ${attempt + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  console.error(`${logPrefix} ❌ Failed to send email after ${maxRetries} attempts:`, {
    to: options.to,
    subject: options.subject,
  });
  return false;
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
    packageName?: string;
    itemName?: string;
    amount?: string;
    boostDuration?: string;
    reason?: string;
    link?: string;
    deliverables?: Array<{ fileName: string; fileUrl: string; fileSize: number }>;
    userRole?: string;
    userEmail?: string;
    meetingTitle?: string;
    meetingDate?: string;
    meetingTime?: string;
    meetingDuration?: number;
    meetingLink?: string;
    proposerName?: string;
  }
): { subject: string; html: string } {
  const baseUrl = process.env.PRODUCTION_URL || "https://vaaney.com";
  const brandColor = "#217588"; // Primary teal brand color
  const logoUrl = `${baseUrl}/vaaney-logo.png`;
  
  const emailHeader = `
    <div style="text-align: center; padding: 24px 0; background-color: #f9fafb; border-radius: 8px 8px 0 0;">
      <img src="${logoUrl}" alt="Vaaney" style="height: 50px; width: auto;" />
    </div>
  `;
  
  const emailFooter = `
    <div style="text-align: center; padding: 20px; margin-top: 24px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 13px;">
      <p style="margin: 0 0 8px 0;">&copy; ${new Date().getFullYear()} Vaaney Marketplace. All rights reserved.</p>
      <p style="margin: 0;">Connecting Maldivian buyers with trusted sellers.</p>
    </div>
  `;
  
  const wrapTemplate = (content: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      ${emailHeader}
      <div style="padding: 30px;">
        ${content}
      </div>
      ${emailFooter}
    </div>
  `;
  
  const templates: Record<NotificationType, { subject: string; html: string }> = {
    order_created: {
      subject: "Order Confirmation - Vaaney",
      html: wrapTemplate(`
        <h2 style="color: ${brandColor}; margin-top: 0;">Order Confirmed!</h2>
        <p>Hi ${data.recipientName || "there"},</p>
        <p>Your order <strong>#${data.orderId?.substring(0, 8)}</strong> has been successfully placed.</p>
        <p><strong>Product:</strong> ${data.productName}</p>
        <p>We'll notify you when your order is shipped.</p>
        <a href="${baseUrl}/orders" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">View Order</a>
      `),
    },
    order_paid: {
      subject: "Payment Confirmed - Vaaney",
      html: wrapTemplate(`
        <h2 style="color: ${brandColor}; margin-top: 0;">Payment Confirmed</h2>
        <p>Hi ${data.recipientName || "there"},</p>
        <p>We've confirmed your payment for order <strong>#${data.orderId?.substring(0, 8)}</strong>.</p>
        <p>Your order is now being processed and will be shipped soon.</p>
        <a href="${baseUrl}/orders" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Track Order</a>
      `),
    },
    order_shipped: {
      subject: "Your Order Has Shipped - Vaaney",
      html: wrapTemplate(`
        <h2 style="color: ${brandColor}; margin-top: 0;">Order Shipped!</h2>
        <p>Hi ${data.recipientName || "there"},</p>
        <p>Great news! Your order <strong>#${data.orderId?.substring(0, 8)}</strong> has been shipped.</p>
        ${data.trackingNumber ? `<p><strong>Tracking Number:</strong> ${data.trackingNumber}</p>` : ""}
        <a href="${baseUrl}/orders" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Track Shipment</a>
      `),
    },
    order_delivered: {
      subject: "Order Delivered - Vaaney",
      html: wrapTemplate(`
        <h2 style="color: ${brandColor}; margin-top: 0;">Order Delivered!</h2>
        <p>Hi ${data.recipientName || "there"},</p>
        <p>Your order <strong>#${data.orderId?.substring(0, 8)}</strong> has been delivered.</p>
        <p>We hope you love your purchase! Please consider leaving a review.</p>
        <a href="${baseUrl}/orders" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Rate Your Purchase</a>
      `),
    },
    booking_created: {
      subject: "Service Booking Request Received - Vaaney",
      html: wrapTemplate(`
        <h2 style="color: ${brandColor}; margin-top: 0;">Booking Request Received</h2>
        <p>Hi ${data.recipientName || "there"},</p>
        <p>Your booking request for <strong>${data.serviceName}</strong> has been received.</p>
        <p>Booking ID: <strong>#${data.bookingId?.substring(0, 8)}</strong></p>
        <p>The seller will review and confirm your booking soon.</p>
        <a href="${baseUrl}/bookings" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">View Booking</a>
      `),
    },
    booking_confirmed: {
      subject: "Service Booking Confirmed - Vaaney",
      html: wrapTemplate(`
        <h2 style="color: ${brandColor}; margin-top: 0;">Booking Confirmed!</h2>
        <p>Hi ${data.recipientName || "there"},</p>
        <p>Your booking <strong>#${data.bookingId?.substring(0, 8)}</strong> has been confirmed by the seller.</p>
        <p><strong>Service:</strong> ${data.serviceName}</p>
        <p>Please proceed with payment to secure your booking.</p>
        <a href="${baseUrl}/bookings" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Make Payment</a>
      `),
    },
    booking_paid: {
      subject: "Payment Confirmed for Service Booking - Vaaney",
      html: wrapTemplate(`
        <h2 style="color: ${brandColor}; margin-top: 0;">Payment Confirmed</h2>
        <p>Hi ${data.recipientName || "there"},</p>
        <p>Your payment for booking <strong>#${data.bookingId?.substring(0, 8)}</strong> has been confirmed.</p>
        <p>The service will begin as scheduled. The seller will be in touch soon!</p>
        <a href="${baseUrl}/bookings" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">View Booking</a>
      `),
    },
    booking_completed: {
      subject: "Service Completed - Vaaney",
      html: wrapTemplate(`
        <h2 style="color: ${brandColor}; margin-top: 0;">Service Completed!</h2>
        <p>Hi ${data.recipientName || "there"},</p>
        <p>The service for booking <strong>#${data.bookingId?.substring(0, 8)}</strong> has been marked as completed.</p>
        ${data.deliverables && data.deliverables.length > 0 ? `
          <div style="background: #f0f9ff; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; font-size: 16px;">Deliverable Files (${data.deliverables.length})</h3>
            <ul style="list-style: none; padding: 0; margin: 0;">
              ${data.deliverables.map((d: any) => `
                <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                  <a href="${baseUrl}/api/download-object?path=${encodeURIComponent(d.fileUrl)}" 
                     style="color: ${brandColor}; text-decoration: none; font-weight: 500;">
                    ${d.fileName}
                  </a>
                  <span style="color: #6b7280; font-size: 14px; margin-left: 8px;">
                    (${(d.fileSize / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </li>
              `).join('')}
            </ul>
          </div>
        ` : `
          <p>No deliverable files were uploaded for this service.</p>
        `}
        <p>Please consider leaving a review to help other buyers!</p>
        <a href="${baseUrl}/bookings" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">View Booking Details</a>
      `),
    },
    quote_received: {
      subject: "You've Received a Custom Quote - Vaaney",
      html: wrapTemplate(`
        <h2 style="color: ${brandColor}; margin-top: 0;">Custom Quote Received</h2>
        <p>Hi ${data.recipientName || "there"},</p>
        <p>You've received a custom quote for <strong>${data.productName || data.serviceName}</strong>.</p>
        <p><strong>Quoted Amount:</strong> $${data.quoteAmount}</p>
        <p>Review and accept the quote to proceed with your purchase.</p>
        <a href="${baseUrl}/quotes" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Review Quote</a>
      `),
    },
    quote_accepted: {
      subject: "Quote Accepted - Vaaney",
      html: wrapTemplate(`
        <h2 style="color: ${brandColor}; margin-top: 0;">Quote Accepted!</h2>
        <p>Hi ${data.recipientName || "there"},</p>
        <p>Great news! Your quote for <strong>${data.productName || data.serviceName}</strong> has been accepted.</p>
        <p><strong>Amount:</strong> $${data.quoteAmount}</p>
        <p>The buyer will proceed with payment shortly.</p>
        <a href="${baseUrl}/seller/quotes" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">View Quote</a>
      `),
    },
    quote_rejected: {
      subject: "Quote Declined - Vaaney",
      html: wrapTemplate(`
        <h2 style="color: #ef4444; margin-top: 0;">Quote Declined</h2>
        <p>Hi ${data.recipientName || "there"},</p>
        <p>The quote for <strong>${data.productName || data.serviceName}</strong> was not accepted by the buyer.</p>
        <p>You can reach out to the buyer to discuss alternative options.</p>
        <a href="${baseUrl}/messages" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Contact Buyer</a>
      `),
    },
    design_submitted: {
      subject: "New Design Submitted for Approval - Vaaney",
      html: wrapTemplate(`
        <h2 style="color: ${brandColor}; margin-top: 0;">Design Submitted</h2>
        <p>Hi ${data.recipientName || "there"},</p>
        <p>A new design has been submitted for your review for <strong>${data.productName || data.serviceName}</strong>.</p>
        <p>Please review and provide feedback as soon as possible.</p>
        <a href="${baseUrl}/seller/design-approvals" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Review Design</a>
      `),
    },
    design_approved: {
      subject: "Design Approved! - Vaaney",
      html: wrapTemplate(`
        <h2 style="color: ${brandColor}; margin-top: 0;">Design Approved!</h2>
        <p>Hi ${data.recipientName || "there"},</p>
        <p>Great news! Your design has been approved for <strong>${data.productName || data.serviceName}</strong>.</p>
        <p>You can now proceed with your order or request a custom quote.</p>
        <a href="${baseUrl}/design-approvals" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">View Design</a>
      `),
    },
    design_rejected: {
      subject: "Design Revision Needed - Vaaney",
      html: wrapTemplate(`
        <h2 style="color: #ef4444; margin-top: 0;">Design Requires Revision</h2>
        <p>Hi ${data.recipientName || "there"},</p>
        <p>Your design for <strong>${data.productName || data.serviceName}</strong> needs revisions.</p>
        ${data.rejectionReason ? `<p><strong>Feedback:</strong> ${data.rejectionReason}</p>` : ""}
        <p>Please review the feedback and submit an updated design.</p>
        <a href="${baseUrl}/design-approvals" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">View Feedback</a>
      `),
    },
    design_changes_requested: {
      subject: "Changes Requested for Your Design - Vaaney",
      html: wrapTemplate(`
        <h2 style="color: ${brandColor}; margin-top: 0;">Design Changes Requested</h2>
        <p>Hi ${data.recipientName || "there"},</p>
        <p>The seller has requested changes to your design for <strong>${data.productName || data.serviceName}</strong>.</p>
        ${data.rejectionReason ? `<p><strong>Requested Changes:</strong> ${data.rejectionReason}</p>` : ""}
        <a href="${baseUrl}/design-approvals" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Upload Revision</a>
      `),
    },
    payment_confirmed: {
      subject: "Payment Confirmed - Vaaney",
      html: wrapTemplate(`
        <h2 style="color: ${brandColor}; margin-top: 0;">Payment Confirmed</h2>
        <p>Hi ${data.recipientName || "there"},</p>
        <p>Your payment has been confirmed by our admin team.</p>
        <p>Your order/booking will now be processed.</p>
        <a href="${baseUrl}" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">View Dashboard</a>
      `),
    },
    payment_required: {
      subject: "Payment Required - Vaaney",
      html: wrapTemplate(`
        <h2 style="color: ${brandColor}; margin-top: 0;">Payment Required</h2>
        <p>Hi ${data.recipientName || "there"},</p>
        <p>Your order/booking is confirmed and awaiting payment.</p>
        <p>Please complete the payment to proceed.</p>
        <a href="${data.link || baseUrl}" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Make Payment</a>
      `),
    },
    return_requested: {
      subject: "Return Request Received - Vaaney",
      html: wrapTemplate(`
        <h2 style="color: ${brandColor}; margin-top: 0;">Return Request Received</h2>
        <p>Hi ${data.recipientName || "there"},</p>
        <p>A return request has been submitted for order <strong>#${data.orderId?.substring(0, 8)}</strong>.</p>
        <p>Please review and respond to the request.</p>
        <a href="${baseUrl}/seller/returns" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Review Request</a>
      `),
    },
    return_approved: {
      subject: "Return Request Approved - Vaaney",
      html: wrapTemplate(`
        <h2 style="color: ${brandColor}; margin-top: 0;">Return Approved</h2>
        <p>Hi ${data.recipientName || "there"},</p>
        <p>Your return request for order <strong>#${data.orderId?.substring(0, 8)}</strong> has been approved.</p>
        <p>Further instructions will be provided shortly.</p>
        <a href="${baseUrl}/orders" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">View Details</a>
      `),
    },
    return_rejected: {
      subject: "Return Request Update - Vaaney",
      html: wrapTemplate(`
        <h2 style="color: #ef4444; margin-top: 0;">Return Request Not Approved</h2>
        <p>Hi ${data.recipientName || "there"},</p>
        <p>Your return request for order <strong>#${data.orderId?.substring(0, 8)}</strong> was not approved.</p>
        ${data.rejectionReason ? `<p><strong>Reason:</strong> ${data.rejectionReason}</p>` : ""}
        <p>Please contact support if you have questions.</p>
        <a href="${baseUrl}/messages" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Contact Support</a>
      `),
    },
    refund_processed: {
      subject: "Refund Processed - Vaaney",
      html: wrapTemplate(`
        <h2 style="color: ${brandColor}; margin-top: 0;">Refund Processed</h2>
        <p>Hi ${data.recipientName || "there"},</p>
        <p>Your refund of <strong>$${data.refundAmount}</strong> has been processed.</p>
        <p>The amount will be credited to your account within 5-7 business days.</p>
        <a href="${baseUrl}/orders" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">View Order</a>
      `),
    },
    message_received: {
      subject: "New Message - Vaaney",
      html: wrapTemplate(`
        <h2 style="color: ${brandColor}; margin-top: 0;">New Message</h2>
        <p>Hi ${data.recipientName || "there"},</p>
        <p>You have received a new message on Vaaney.</p>
        <a href="${baseUrl}/messages" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">View Message</a>
      `),
    },
    deliverables_uploaded: {
      subject: "Service Deliverables Ready - Vaaney",
      html: wrapTemplate(`
        <h2 style="color: ${brandColor}; margin-top: 0;">Your Service Deliverables Are Ready!</h2>
        <p>Hi ${data.recipientName || "there"},</p>
        <p>The seller has uploaded ${data.deliverableCount || "your"} deliverable${(data.deliverableCount || 0) > 1 ? "s" : ""} for booking <strong>#${data.bookingId?.substring(0, 8)}</strong>.</p>
        <p>You can now download your files from the booking page.</p>
        <a href="${baseUrl}/bookings" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Download Files</a>
      `),
    },
    seller_verification_approved: {
      subject: "Seller Account Approved! - Vaaney",
      html: wrapTemplate(`
        <h2 style="color: ${brandColor}; margin-top: 0;">Congratulations!</h2>
        <p>Hi ${data.recipientName || "there"},</p>
        <p>Your seller account has been approved!</p>
        <p>You can now start listing products and services on Vaaney.</p>
        <a href="${baseUrl}/seller/dashboard" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Go to Dashboard</a>
      `),
    },
    seller_verification_rejected: {
      subject: "Seller Verification Update - Vaaney",
      html: wrapTemplate(`
        <h2 style="color: #ef4444; margin-top: 0;">Verification Not Approved</h2>
        <p>Hi ${data.recipientName || "there"},</p>
        <p>We were unable to approve your seller account at this time.</p>
        ${data.rejectionReason ? `<p><strong>Reason:</strong> ${data.rejectionReason}</p>` : ""}
        <p>You can resubmit your verification documents with the required information.</p>
        <a href="${baseUrl}/profile" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Update Profile</a>
      `),
    },
    boost_purchase_created: {
      subject: "Boost Purchase Initiated - Vaaney",
      html: wrapTemplate(`
        <h2 style="color: ${brandColor}; margin-top: 0;">Boost Purchase Created</h2>
        <p>Hi ${data.recipientName || "there"},</p>
        <p>You've successfully initiated a boost purchase for <strong>${data.productName || data.serviceName || "your item"}</strong>.</p>
        <p>Your item will be promoted once payment is confirmed by our admin team.</p>
        <a href="${baseUrl}/seller/boost" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">View Boost Status</a>
      `),
    },
    boost_payment_confirmed: {
      subject: "Boost Activated! - Vaaney",
      html: wrapTemplate(`
        <h2 style="color: ${brandColor}; margin-top: 0;">Your Boost is Live!</h2>
        <p>Hi ${data.recipientName || "there"},</p>
        <p>Great news! Your payment has been confirmed and your boost for <strong>${data.productName || data.serviceName || "your item"}</strong> is now active.</p>
        <p>Your item will receive increased visibility and priority placement in search results.</p>
        <a href="${baseUrl}/seller/boost" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Manage Boosts</a>
      `),
    },
    boost_payment_failed: {
      subject: "Boost Payment Issue - Vaaney",
      html: wrapTemplate(`
        <h2 style="color: #ef4444; margin-top: 0;">Boost Payment Could Not Be Confirmed</h2>
        <p>Hi ${data.recipientName || "there"},</p>
        <p>We were unable to confirm your boost payment for <strong>${data.productName || data.serviceName || "your item"}</strong>.</p>
        ${data.rejectionReason ? `<p><strong>Reason:</strong> ${data.rejectionReason}</p>` : ""}
        <p>Please review the payment details or contact our support team for assistance.</p>
        <a href="${baseUrl}/seller/boost" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Review Payment</a>
      `),
    },
    welcome: {
      subject: "Welcome to Vaaney!",
      html: wrapTemplate(`
        <h2 style="color: ${brandColor}; margin-top: 0;">Welcome to Vaaney!</h2>
        <p>Hi ${data.recipientName || "there"},</p>
        <p>Thank you for joining Vaaney - the premier marketplace connecting Maldivian buyers with Sri Lankan sellers!</p>
        <p>Here's what you can do next:</p>
        <ul style="color: #374151; padding-left: 20px;">
          <li>Browse our marketplace for amazing products and services</li>
          <li>Connect with verified sellers</li>
          <li>Enjoy secure payments and reliable shipping</li>
        </ul>
        <a href="${baseUrl}" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Start Exploring</a>
      `),
    },
    admin_new_user: {
      subject: "New User Registration - Vaaney Admin",
      html: wrapTemplate(`
        <h2 style="color: ${brandColor}; margin-top: 0;">New User Registered</h2>
        <p>Hi Admin,</p>
        <p>A new user has registered on Vaaney.</p>
        <div style="background: #f0f9ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Name:</strong> ${data.recipientName || "N/A"}</p>
          <p style="margin: 0 0 8px 0;"><strong>Role:</strong> ${(data as any).userRole || "N/A"}</p>
          <p style="margin: 0;"><strong>Email:</strong> ${(data as any).userEmail || "N/A"}</p>
        </div>
        <a href="${baseUrl}/admin/users" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">View Users</a>
      `),
    },
    admin_verification_pending: {
      subject: "Seller Verification Pending - Vaaney Admin",
      html: wrapTemplate(`
        <h2 style="color: ${brandColor}; margin-top: 0;">New Seller Verification Request</h2>
        <p>Hi Admin,</p>
        <p>A seller has submitted their documents for verification.</p>
        <div style="background: #f0f9ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0;"><strong>Seller:</strong> ${data.recipientName || "N/A"}</p>
        </div>
        <p>Please review and verify their account.</p>
        <a href="${baseUrl}/admin/verifications" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Review Verification</a>
      `),
    },
    admin_order_pending_payment: {
      subject: "Payment Verification Required - Vaaney Admin",
      html: wrapTemplate(`
        <h2 style="color: ${brandColor}; margin-top: 0;">Bank Transfer Payment Pending</h2>
        <p>Hi Admin,</p>
        <p>A new bank transfer payment requires verification.</p>
        <div style="background: #f0f9ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Order ID:</strong> #${data.orderId?.substring(0, 8) || "N/A"}</p>
          <p style="margin: 0;"><strong>Amount:</strong> $${data.amount || "N/A"}</p>
        </div>
        <p>Please verify the payment in the transactions panel.</p>
        <a href="${baseUrl}/admin/transactions" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Verify Payment</a>
      `),
    },
    admin_return_pending: {
      subject: "Return Request Needs Review - Vaaney Admin",
      html: wrapTemplate(`
        <h2 style="color: ${brandColor}; margin-top: 0;">Return Request Pending Review</h2>
        <p>Hi Admin,</p>
        <p>A return request requires admin review.</p>
        <div style="background: #f0f9ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Order ID:</strong> #${data.orderId?.substring(0, 8) || "N/A"}</p>
          <p style="margin: 0;"><strong>Product:</strong> ${data.productName || "N/A"}</p>
        </div>
        <p>Please review and take action on this return request.</p>
        <a href="${baseUrl}/admin/returns" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Review Return</a>
      `),
    },
    admin_new_product: {
      subject: "New Product Listed - Vaaney Admin",
      html: wrapTemplate(`
        <h2 style="color: ${brandColor}; margin-top: 0;">New Product Listed</h2>
        <p>Hi Admin,</p>
        <p>A seller has listed a new product on the marketplace.</p>
        <div style="background: #f0f9ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Product:</strong> ${data.productName || "N/A"}</p>
          <p style="margin: 0;"><strong>Seller:</strong> ${data.recipientName || "N/A"}</p>
        </div>
        <a href="${baseUrl}/admin/dashboard" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">View Dashboard</a>
      `),
    },
    admin_new_service: {
      subject: "New Service Listed - Vaaney Admin",
      html: wrapTemplate(`
        <h2 style="color: ${brandColor}; margin-top: 0;">New Service Listed</h2>
        <p>Hi Admin,</p>
        <p>A seller has listed a new service on the marketplace.</p>
        <div style="background: #f0f9ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Service:</strong> ${data.serviceName || "N/A"}</p>
          <p style="margin: 0;"><strong>Seller:</strong> ${data.recipientName || "N/A"}</p>
        </div>
        <a href="${baseUrl}/admin/dashboard" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">View Dashboard</a>
      `),
    },
    meeting_proposed: {
      subject: "Video Meeting Request - Vaaney",
      html: wrapTemplate(`
        <h2 style="color: ${brandColor}; margin-top: 0;">Video Meeting Request</h2>
        <p>Hi ${data.recipientName || "there"},</p>
        <p><strong>${data.proposerName || "Someone"}</strong> has requested a video meeting with you.</p>
        <div style="background: #f0f9ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
          ${data.meetingTitle ? `<p style="margin: 0 0 8px 0;"><strong>Topic:</strong> ${data.meetingTitle}</p>` : ""}
          <p style="margin: 0 0 8px 0;"><strong>Date:</strong> ${data.meetingDate || "TBD"}</p>
          <p style="margin: 0 0 8px 0;"><strong>Time:</strong> ${data.meetingTime || "TBD"}</p>
          <p style="margin: 0;"><strong>Duration:</strong> ${data.meetingDuration || 30} minutes</p>
        </div>
        <p>Please respond to confirm or reschedule the meeting.</p>
        <a href="${data.link || baseUrl + '/messages'}" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">View Request</a>
      `),
    },
    meeting_confirmed: {
      subject: "Video Meeting Confirmed - Vaaney",
      html: wrapTemplate(`
        <h2 style="color: ${brandColor}; margin-top: 0;">Meeting Confirmed!</h2>
        <p>Hi ${data.recipientName || "there"},</p>
        <p>Your video meeting has been confirmed.</p>
        <div style="background: #f0f9ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
          ${data.meetingTitle ? `<p style="margin: 0 0 8px 0;"><strong>Topic:</strong> ${data.meetingTitle}</p>` : ""}
          <p style="margin: 0 0 8px 0;"><strong>Date:</strong> ${data.meetingDate || "TBD"}</p>
          <p style="margin: 0 0 8px 0;"><strong>Time:</strong> ${data.meetingTime || "TBD"}</p>
          <p style="margin: 0;"><strong>Duration:</strong> ${data.meetingDuration || 30} minutes</p>
        </div>
        <p>You can join the meeting up to 15 minutes before the scheduled time.</p>
        <a href="${data.meetingLink || baseUrl + '/messages'}" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Join Meeting</a>
      `),
    },
    meeting_cancelled: {
      subject: "Video Meeting Cancelled - Vaaney",
      html: wrapTemplate(`
        <h2 style="color: #ef4444; margin-top: 0;">Meeting Cancelled</h2>
        <p>Hi ${data.recipientName || "there"},</p>
        <p>A scheduled video meeting has been cancelled.</p>
        <div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 16px 0;">
          ${data.meetingTitle ? `<p style="margin: 0 0 8px 0;"><strong>Topic:</strong> ${data.meetingTitle}</p>` : ""}
          <p style="margin: 0 0 8px 0;"><strong>Originally Scheduled:</strong> ${data.meetingDate || "N/A"} at ${data.meetingTime || "N/A"}</p>
          ${data.reason ? `<p style="margin: 0;"><strong>Reason:</strong> ${data.reason}</p>` : ""}
        </div>
        <p>You can propose a new meeting time if needed.</p>
        <a href="${data.link || baseUrl + '/messages'}" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Send Message</a>
      `),
    },
  };

  return templates[type] || {
    subject: "Notification - Vaaney",
    html: wrapTemplate(`
      <h2 style="color: ${brandColor}; margin-top: 0;">New Notification</h2>
      <p>Hi ${data.recipientName || "there"},</p>
      <p>You have a new notification on Vaaney.</p>
      <a href="${baseUrl}" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">View Dashboard</a>
    `),
  };
}
