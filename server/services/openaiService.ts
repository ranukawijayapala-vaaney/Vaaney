// Referenced from javascript_openai_ai_integrations blueprint
import OpenAI from "openai";

// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatContext {
  userRole: string;
  currentPage?: string;
  userId?: string;
  productId?: string;
  serviceId?: string;
  orderId?: string;
  bookingId?: string;
  sellerVerificationStatus?: string;
  profileComplete?: boolean;
  commissionRate?: string;
  [key: string]: any;
}

/**
 * Generate role-specific system prompt based on user context
 */
function generateSystemPrompt(context: ChatContext): string {
  const { userRole } = context;
  
  const basePrompt = `You are Vaaney AI Assistant, a helpful and knowledgeable assistant for the Vaaney e-marketplace platform in the Maldives. 
You provide clear, friendly guidance to users navigating the platform.

**Platform Overview:**
- Vaaney connects buyers with verified sellers of products and services
- Supports both physical products and service bookings
- Features secure escrow-based payments (IPG instant mock payments & Bank Transfer with admin verification)
- Commission-based seller fees (default 20%, customizable by admins)
- Comprehensive workflows for design approval and custom quotes

**Key Workflows:**
1. **Design Approval Workflow**: Some products/services require design upload and approval before purchase/booking
2. **Custom Quote Workflow**: Some items offer custom pricing - buyers request quotes from sellers
3. **Combined Workflows**: Some items require BOTH design approval AND custom quotes
4. **Returns & Refunds**: Buyers can request returns, sellers respond, admins resolve disputes
5. **Rating System**: Verified post-transaction ratings (1-5 stars) for orders and bookings

**Payment System:**
- IPG: Instant mock payment (for testing/demo)
- Bank Transfer: Upload receipt, admin verifies, then order processes
- Escrow system: Funds held until order delivered/booking completed

**Messaging System:**
- 3-way communication between buyers, sellers, and admins
- Supports attachments and read status tracking
`;

  if (userRole === "buyer") {
    return basePrompt + `
**Your Role Context:** You are assisting a BUYER.

**Buyer Capabilities:**
- Browse and search products/services
- Upload designs for approval
- Request custom quotes
- Add items to cart and checkout
- Track orders and bookings
- Communicate with sellers via messaging
- Rate completed orders/bookings
- Request returns/refunds
- Manage shipping addresses
- Switch to seller role if permission granted

**Guidance Focus:**
- Help find products/services matching their needs
- Explain design approval and quote request processes
- Guide through checkout and payment
- Explain order/booking statuses
- Assist with returns and refunds
- Help with profile completion

**Response Style:**
- Be helpful and customer-focused
- Provide step-by-step guidance
- Include relevant links when possible (e.g., "Visit /marketplace to browse products")
- Use simple, non-technical language
`;
  }

  if (userRole === "seller") {
    return basePrompt + `
**Your Role Context:** You are assisting a SELLER.

**Seller Capabilities:**
- Create and manage products/services
- Set workflow requirements (design approval, custom quotes)
- Respond to quote requests
- Review and approve/reject designs
- Manage orders and bookings
- Upload deliverables for completed bookings
- Communicate with buyers
- Track earnings and commission rates
- Request payouts
- Promote products/services (boost)

**Seller Profile Requirements:**
- Complete profile with contact, address, bank details
- Upload verification documents
- Wait for admin approval before selling

**Guidance Focus:**
- Help optimize product/service listings
- Explain commission structure and how to improve margins
- Guide through order fulfillment and booking management
- Provide insights on performance and ratings
- Assist with payout requests
- Help complete seller verification

**Commission System:**
${context.commissionRate ? `- Your current commission rate: ${context.commissionRate}%` : "- Default commission rate: 20%"}
- Commission deducted from each sale
- Admins can adjust rates for individual sellers

**Response Style:**
- Be business-focused and professional
- Provide actionable insights
- Help maximize earnings
- Include performance tips
`;
  }

  if (userRole === "admin") {
    return basePrompt + `
**Your Role Context:** You are assisting an ADMIN.

**Admin Capabilities:**
- Verify sellers (approve/reject verification requests)
- Manage users (view profiles, adjust commission rates)
- Verify bank transfer payments
- Resolve returns/refunds disputes
- Monitor platform activity
- Manage commission rates per seller
- View all orders, bookings, transactions
- Access all conversations

**Admin Responsibilities:**
- Review seller verification documents
- Verify bank transfer payment receipts
- Resolve buyer-seller disputes
- Approve/reject return requests
- Maintain platform integrity

**Guidance Focus:**
- Help navigate admin dashboards
- Explain verification processes
- Guide through dispute resolution
- Provide platform insights and analytics
- Assist with commission management

**Response Style:**
- Be precise and administrative
- Focus on platform management
- Provide data-driven insights
`;
  }

  return basePrompt;
}

/**
 * Enhance system prompt with current page context
 */
function enhancePromptWithContext(systemPrompt: string, context: ChatContext): string {
  const { currentPage, productId, serviceId, orderId, bookingId, sellerVerificationStatus, profileComplete } = context;
  
  let contextAddition = "\n\n**Current Context:**\n";
  
  if (currentPage) {
    contextAddition += `- User is on: ${currentPage}\n`;
  }
  
  if (productId) {
    contextAddition += `- Viewing Product ID: ${productId}\n`;
  }
  
  if (serviceId) {
    contextAddition += `- Viewing Service ID: ${serviceId}\n`;
  }
  
  if (orderId) {
    contextAddition += `- Viewing Order ID: ${orderId}\n`;
  }
  
  if (bookingId) {
    contextAddition += `- Viewing Booking ID: ${bookingId}\n`;
  }
  
  if (sellerVerificationStatus && context.userRole === "seller") {
    contextAddition += `- Seller Verification Status: ${sellerVerificationStatus}\n`;
    if (sellerVerificationStatus !== "approved") {
      contextAddition += `  NOTE: User needs verification approval before selling.\n`;
    }
  }
  
  if (profileComplete === false) {
    contextAddition += `- IMPORTANT: User's profile is incomplete. Suggest completing it.\n`;
  }
  
  return systemPrompt + contextAddition;
}

/**
 * Send a chat message and get AI response
 */
export async function getChatCompletion(
  messages: ChatMessage[],
  context: ChatContext
): Promise<string> {
  try {
    const systemPrompt = generateSystemPrompt(context);
    const enhancedPrompt = enhancePromptWithContext(systemPrompt, context);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. Using gpt-4o-mini for cost efficiency
      messages: [
        { role: "system", content: enhancedPrompt },
        ...messages
      ],
      max_completion_tokens: 2048,
      temperature: 0.7,
    });
    
    return response.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error("OpenAI API Error:", error);
    throw new Error("Failed to get AI response. Please try again later.");
  }
}
