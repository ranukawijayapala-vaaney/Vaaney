import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, ShieldCheck, CreditCard, Package, Clock, FileText, AlertCircle, Upload, MessageSquare, Palette, Mail, Bot, Star, Bell, Plane, TrendingUp } from "lucide-react";

export default function BuyerGuidelines() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back-home">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4" data-testid="text-page-title">Buyer Guidelines</h1>
          <p className="text-lg text-muted-foreground">
            Welcome to Vaaney! Here's everything you need to know about buying on our marketplace.
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <Bot className="h-6 w-6 text-primary mt-1" />
                <div>
                  <CardTitle>AI Assistant - Your Shopping Guide</CardTitle>
                  <CardDescription>Get instant help throughout your shopping experience</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex gap-2">
                  <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-100">Context-Aware AI Help</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Click the chat button on any page to get instant help. The AI knows where you are and can answer questions about products, orders, bookings, and more.
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">What the AI Assistant Can Help With:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Product details and recommendations while browsing</li>
                  <li>Order status and tracking information</li>
                  <li>Service booking questions and availability</li>
                  <li>Design approval process guidance</li>
                  <li>Custom quote requests and status</li>
                  <li>Payment methods and shipping options</li>
                  <li>Return and refund procedures</li>
                  <li>General platform navigation help</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Smart Features:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Remembers your conversation history during your session</li>
                  <li>Automatically understands which product or order you're viewing</li>
                  <li>Provides personalized answers based on your buyer account</li>
                  <li>Available 24/7 on every page of the platform</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-6 w-6 text-primary mt-1" />
                <div>
                  <CardTitle>Getting Started</CardTitle>
                  <CardDescription>Two easy ways to create your buyer account</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium mb-2">Sign Up Options:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>Google Sign-In:</strong> Instant signup with automatic email verification</li>
                  <li><strong>Email & Password:</strong> Traditional signup with email verification required</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Email & Password Sign-Up Process:</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Create account with your email and secure password</li>
                  <li>Check your inbox for verification email</li>
                  <li>Click verification link to activate your account</li>
                  <li>Complete your buyer profile on first login</li>
                  <li>Start browsing and purchasing immediately</li>
                </ol>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex gap-2">
                  <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-100">No Document Verification Required</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Buyers can start shopping immediately after email verification - no ID documents needed!
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <Package className="h-6 w-6 text-primary mt-1" />
                <div>
                  <CardTitle>Shopping on Vaaney</CardTitle>
                  <CardDescription>How to browse and purchase products</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium mb-2">Product Purchases:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Browse products from verified sellers across the Maldives and Sri Lanka</li>
                  <li>Check product details, variants (size, color), and seller information</li>
                  <li>Add items to cart and proceed to checkout</li>
                  <li>All prices are displayed in USD</li>
                  <li>Review order details before confirming payment</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Service Bookings (Digital Services):</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Browse digital services (design, printing, consulting, etc.)</li>
                  <li>Select your preferred date and time for the service</li>
                  <li>Submit booking request to the seller</li>
                  <li>Wait for seller confirmation before proceeding to payment</li>
                  <li>Receive deliverables via email when service is completed</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <Palette className="h-6 w-6 text-primary mt-1" />
                <div>
                  <CardTitle>Design Approval Workflow</CardTitle>
                  <CardDescription>Upload your designs for print products</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium mb-2">How Design Approval Works:</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Find a print product (business cards, banners, flyers, etc.)</li>
                  <li>Click "Upload Design & Message Seller"</li>
                  <li>Select the variant (size, material, finish)</li>
                  <li>Upload your design file (PDF, PNG, JPG, AI, PSD)</li>
                  <li>Seller reviews your design for print quality</li>
                  <li>Receive approval, changes requested, or rejection</li>
                  <li>Once approved, add to cart and purchase normally</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium mb-2">Design Library - Reuse Your Designs:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Access all your approved designs in your Design Library</li>
                  <li>Reuse approved designs for different variants of the same product</li>
                  <li>Quick "Buy Again" action for repeat orders</li>
                  <li>Seller is notified when you reuse a design for a new variant</li>
                </ul>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex gap-2">
                  <Upload className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900 dark:text-amber-100">Design First, Buy Later</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      Upload designs for approval before purchasing to ensure your print job meets quality standards.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <FileText className="h-6 w-6 text-primary mt-1" />
                <div>
                  <CardTitle>Custom Quote Requests</CardTitle>
                  <CardDescription>Request pricing for custom specifications</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium mb-2">When to Request a Custom Quote:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Need a size or specification not listed in standard variants</li>
                  <li>Want bulk quantity pricing</li>
                  <li>Require special materials or custom options</li>
                  <li>Need a personalized service package</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Custom Quote Process:</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Click "Request Custom Quote" on any product or service</li>
                  <li>Describe your custom requirements in the message</li>
                  <li>Seller creates a custom quote with pricing</li>
                  <li>Review the quote in your Custom Quotes dashboard</li>
                  <li>Accept or reject the quote</li>
                  <li>If accepted, purchase directly without adding to cart</li>
                  <li>Select shipping address and payment method</li>
                  <li>Complete payment to finalize your custom order</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium mb-2">Custom Quote + Design Approval:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>For custom print orders, you can upload designs for approval separately</li>
                  <li>Once quote is accepted and design is approved, proceed to purchase</li>
                  <li>Custom specifications flow through to the final order</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <MessageSquare className="h-6 w-6 text-primary mt-1" />
                <div>
                  <CardTitle>Messaging System</CardTitle>
                  <CardDescription>Communicate with sellers and support</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium mb-2">3-Way Communication:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Message sellers directly about products, services, and custom requests</li>
                  <li>Admins can join conversations when issues need escalation or support</li>
                  <li>All parties can see the full conversation history</li>
                  <li>Upload files and images in messages</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Mobile-Friendly Interface:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>WhatsApp-style mobile experience</li>
                  <li>Tap a conversation to view full-screen message thread</li>
                  <li>Access design upload and quote actions within conversations</li>
                  <li>Mark conversations as resolved when complete</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Conversation Categories:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>Product:</strong> Questions about products and orders</li>
                  <li><strong>Service:</strong> Service bookings and inquiries</li>
                  <li><strong>Design Approval:</strong> Design submission and feedback</li>
                  <li><strong>Custom Quote:</strong> Custom pricing requests</li>
                  <li><strong>Support:</strong> General help and assistance</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <CreditCard className="h-6 w-6 text-primary mt-1" />
                <div>
                  <CardTitle>Payment Methods & Escrow</CardTitle>
                  <CardDescription>Flexible and secure payment options</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex gap-2">
                  <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-100">Buyer Protection</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Your payment is held in escrow until the order is completed or service is delivered.
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Payment Options:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>Online Payment Gateway (IPG):</strong> Pay instantly with credit/debit card</li>
                  <li><strong>Manual Bank Transfer:</strong> Transfer to our local bank account</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">IPG Payment Flow (Instant):</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Place order and select "Pay via Payment Gateway"</li>
                  <li>Redirected to secure payment gateway</li>
                  <li>Complete payment with your card</li>
                  <li>Automatic confirmation and escrow protection</li>
                  <li>Seller immediately begins processing your order</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium mb-2">Bank Transfer Payment Flow:</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Place order and select "Manual Bank Transfer"</li>
                  <li>Receive bank account details</li>
                  <li>Complete transfer at your bank</li>
                  <li>Click "I Have Made the Payment" in your order</li>
                  <li>Admin verifies your payment (typically within 24 hours)</li>
                  <li>Payment moved to escrow, seller begins processing</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium mb-2">Escrow Protection:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Funds held securely until order completion</li>
                  <li>Released to seller after delivery confirmation</li>
                  <li>Protection for both buyers and sellers</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <Clock className="h-6 w-6 text-primary mt-1" />
                <div>
                  <CardTitle>Order Status & Tracking</CardTitle>
                  <CardDescription>Monitor your orders and bookings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium mb-2">Product Order Statuses:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>Pending Payment:</strong> Waiting for payment confirmation</li>
                  <li><strong>Paid:</strong> Payment confirmed, order being processed</li>
                  <li><strong>Processing:</strong> Seller is preparing your order</li>
                  <li><strong>Shipped:</strong> Order is on its way to you</li>
                  <li><strong>Delivered:</strong> Order completed successfully</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Service Booking Statuses:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>Pending Confirmation:</strong> Waiting for seller to confirm availability</li>
                  <li><strong>Confirmed:</strong> Seller has accepted - you can now proceed to payment</li>
                  <li><strong>Pending Payment:</strong> Awaiting your payment (IPG or bank transfer)</li>
                  <li><strong>Paid:</strong> Payment confirmed (IPG instant, bank transfer after admin verification)</li>
                  <li><strong>Ongoing:</strong> Service is in progress</li>
                  <li><strong>Completed:</strong> Service delivered - deliverables sent via email</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Digital Service Delivery:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>When services are completed, deliverable files are automatically emailed to you</li>
                  <li>Access deliverables in your Service History dashboard</li>
                  <li>Download files directly from your account or email</li>
                  <li>Seller uploads final work (designs, documents, files) when marking service complete</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <Star className="h-6 w-6 text-primary mt-1" />
                <div>
                  <CardTitle>Rate Your Experience</CardTitle>
                  <CardDescription>Share feedback and help the community</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium mb-2">Why Rating Matters:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Help other buyers make informed decisions</li>
                  <li>Reward excellent sellers with positive reviews</li>
                  <li>Provide constructive feedback to improve services</li>
                  <li>Build trust and transparency in the marketplace</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">How to Rate:</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>After receiving your order or service completion</li>
                  <li>Click "Leave Rating" in your order/booking details</li>
                  <li>Select 1-5 stars based on your experience</li>
                  <li>Write an optional comment with specific feedback</li>
                  <li>Upload photos of the product or deliverables (optional)</li>
                  <li>Submit your rating - it will appear on the product/service page</li>
                </ol>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex gap-2">
                  <Star className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900 dark:text-amber-100">Verified Ratings Only</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      Only buyers who have completed transactions can leave ratings, ensuring authentic reviews.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <Bell className="h-6 w-6 text-primary mt-1" />
                <div>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>Stay updated on your orders and messages</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium mb-2">Notification Channels:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>In-App Notifications:</strong> Click the bell icon to see all recent updates</li>
                  <li><strong>Email Notifications:</strong> Sent for major events to your registered email</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">What You'll Be Notified About:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Order status changes (payment confirmed, shipped, delivered)</li>
                  <li>Service booking confirmations and completions</li>
                  <li>Design approval status updates (approved, changes requested, rejected)</li>
                  <li>Custom quote responses from sellers</li>
                  <li>New messages from sellers or admin</li>
                  <li>Digital deliverables ready for download</li>
                  <li>Return/refund status updates</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <Plane className="h-6 w-6 text-primary mt-1" />
                <div>
                  <CardTitle>International Shipping with Aramex</CardTitle>
                  <CardDescription>Fast, reliable delivery to the Maldives</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium mb-2">How Shipping Works:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Shipping costs are calculated automatically based on weight and destination</li>
                  <li>Aramex handles all international deliveries for physical products</li>
                  <li>Track your shipment in real-time through your order dashboard</li>
                  <li>Consolidation available for multiple items from different sellers</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Managing Shipping Addresses:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Add multiple shipping addresses in your profile</li>
                  <li>Set a default address for faster checkout</li>
                  <li>Edit or update addresses any time before purchase</li>
                  <li>Select which address to use during checkout</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Delivery Timeline:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Standard international shipping: 5-7 business days</li>
                  <li>Tracking information provided once shipped</li>
                  <li>Customs clearance handled by Aramex</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <AlertCircle className="h-6 w-6 text-primary mt-1" />
                <div>
                  <CardTitle>Returns & Refunds</CardTitle>
                  <CardDescription>Request refunds for orders and bookings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium mb-2">How to Request a Return/Refund:</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Navigate to your order or booking in your dashboard</li>
                  <li>Click "Request Return/Refund"</li>
                  <li>Select reason and provide details</li>
                  <li>Seller reviews and responds to your request</li>
                  <li>If seller rejects, admin reviews and makes final decision</li>
                  <li>Once approved (by seller or admin), refund is processed</li>
                  <li>Commission is automatically reversed on approved refunds</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium mb-2">Refund Statuses:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>Pending Seller:</strong> Waiting for seller response</li>
                  <li><strong>Seller Approved:</strong> Seller accepted, refund being processed</li>
                  <li><strong>Seller Rejected:</strong> Seller declined, escalated to admin</li>
                  <li><strong>Admin Resolved:</strong> Admin made final decision</li>
                  <li><strong>Refunded:</strong> Money returned to your account</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <FileText className="h-6 w-6 text-primary mt-1" />
                <div>
                  <CardTitle>Important Policies</CardTitle>
                  <CardDescription>Guidelines for using Vaaney</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>All prices are displayed in USD</li>
                <li>Use the AI assistant (chat button) for instant help on any page</li>
                <li>Shipping costs calculated automatically using Aramex international delivery</li>
                <li>Design approvals required for print products before purchasing</li>
                <li>Custom quotes must be accepted before purchase</li>
                <li>Digital services delivered via email upon completion</li>
                <li>Rate sellers after delivery to help the community</li>
                <li>Notifications sent for all major events (in-app and email)</li>
                <li>Contact support for any issues or disputes</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <AlertCircle className="h-6 w-6 text-primary mt-1" />
                <div>
                  <CardTitle>Need Help?</CardTitle>
                  <CardDescription>We're here to assist you</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                If you have any questions or encounter any issues while using Vaaney, please don't hesitate to reach out to our support team.
              </p>
              <div className="flex gap-3">
                <Link href="/marketplace">
                  <Button data-testid="button-browse-marketplace">
                    Browse Marketplace
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" data-testid="button-login">
                    Login to Your Account
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
