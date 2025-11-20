import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, ShieldCheck, DollarSign, Package, FileCheck, TrendingUp, AlertCircle, Palette, FileText, MessageSquare, Mail } from "lucide-react";

export default function SellerGuidelines() {
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
          <h1 className="text-4xl font-bold mb-4" data-testid="text-page-title">Seller Guidelines</h1>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about selling on Vaaney marketplace.
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-6 w-6 text-primary mt-1" />
                <div>
                  <CardTitle>Getting Started as a Seller</CardTitle>
                  <CardDescription>Account creation and verification</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium mb-2">Account Setup:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Sellers must sign up using email and password</li>
                  <li>Verify your email address through the verification link</li>
                  <li>Complete seller verification process to start selling</li>
                </ul>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900 dark:text-amber-100">Seller Verification Required</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      All sellers must be verified before listing products or services on Vaaney.
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Verification Documents Required:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Valid business registration or trade license</li>
                  <li>Government-issued ID (passport, national ID card)</li>
                  <li>Proof of address (utility bill, bank statement)</li>
                  <li>Bank account details for payouts</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Verification Process:</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Create seller account and verify your email</li>
                  <li>Upload required verification documents</li>
                  <li>Admin reviews your documents (typically 24-48 hours)</li>
                  <li>Receive approval notification via email</li>
                  <li>Start listing products and services</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <Package className="h-6 w-6 text-primary mt-1" />
                <div>
                  <CardTitle>Listing Products & Services</CardTitle>
                  <CardDescription>How to create and manage your listings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium mb-2">Product Listings:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Add detailed product descriptions with clear images</li>
                  <li>Create product variants (sizes, colors, options)</li>
                  <li>Set competitive prices in USD</li>
                  <li>Manage stock levels and inventory</li>
                  <li>Update product information as needed</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Service Listings:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Create service descriptions with pricing details</li>
                  <li>Define service packages and options</li>
                  <li>Set availability and booking schedules</li>
                  <li>Manage service bookings from your dashboard</li>
                  <li>Confirm or decline booking requests</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Best Practices:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Use high-quality product images (multiple angles)</li>
                  <li>Write clear, accurate descriptions</li>
                  <li>Keep inventory levels updated</li>
                  <li>Respond promptly to booking requests</li>
                  <li>Maintain competitive pricing</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <Palette className="h-6 w-6 text-primary mt-1" />
                <div>
                  <CardTitle>Design Approval Management</CardTitle>
                  <CardDescription>Review and approve buyer designs for print products</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium mb-2">How Design Approval Works:</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Buyers upload designs for your print products (business cards, banners, etc.)</li>
                  <li>You receive notification when designs are submitted</li>
                  <li>Review designs in your Design Approvals dashboard</li>
                  <li>Approve, reject, or request changes with feedback</li>
                  <li>Buyers can revise and resubmit designs</li>
                  <li>Once approved, buyers can add to cart and purchase</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium mb-2">Review Actions:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>Approve:</strong> Design meets print quality standards</li>
                  <li><strong>Request Changes:</strong> Issues need to be fixed (provide detailed feedback)</li>
                  <li><strong>Reject:</strong> Design cannot be printed (explain why)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Design Reuse:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Buyers can reuse approved designs for different variants</li>
                  <li>You'll receive notification when a design is reused</li>
                  <li>Previously approved designs don't need re-approval for same buyer</li>
                </ul>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex gap-2">
                  <Palette className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-100">Quality Control</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Design approval ensures print quality and reduces errors before production.
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
                  <CardTitle>Custom Quote Management</CardTitle>
                  <CardDescription>Create custom pricing for unique buyer requests</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium mb-2">When Buyers Request Quotes:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Custom sizes or specifications not listed</li>
                  <li>Bulk quantity pricing</li>
                  <li>Special materials or options</li>
                  <li>Personalized service packages</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Quote Creation Process:</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Receive quote request from buyer via messaging</li>
                  <li>Review buyer's custom requirements</li>
                  <li>Create quote in your Quotes dashboard</li>
                  <li>Set custom price, quantity, and optional specifications</li>
                  <li>Optionally link to an approved design</li>
                  <li>Send quote to buyer</li>
                  <li>Buyer accepts or rejects the quote</li>
                  <li>If accepted, buyer purchases directly</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium mb-2">Quote + Design Workflow:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Buyers can upload custom designs separately from quote requests</li>
                  <li>Link approved designs to custom quotes</li>
                  <li>Custom specs flow through to final order/booking</li>
                </ul>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex gap-2">
                  <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900 dark:text-amber-100">Flexible Pricing</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      Custom quotes let you serve unique customer needs and increase sales opportunities.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <Mail className="h-6 w-6 text-primary mt-1" />
                <div>
                  <CardTitle>Digital Service Delivery</CardTitle>
                  <CardDescription>Deliver service outputs via email</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium mb-2">How Digital Delivery Works:</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Complete the service work for your customer</li>
                  <li>Navigate to the booking in your dashboard</li>
                  <li>Click "Mark as Completed"</li>
                  <li>Upload deliverable files (designs, documents, etc.)</li>
                  <li>System automatically sends files to buyer via email</li>
                  <li>Buyer can also download from their Service History</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium mb-2">Deliverable Files:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Upload up to 50MB per file</li>
                  <li>Supported formats: PDF, PNG, JPG, AI, PSD, DOC, XLS, ZIP, etc.</li>
                  <li>Multiple files can be uploaded per service</li>
                  <li>Files are stored securely and accessible to buyer</li>
                </ul>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex gap-2">
                  <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-100">Automatic Email Delivery</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      When you upload deliverables, buyers receive instant email notification with download links.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <MessageSquare className="h-6 w-6 text-primary mt-1" />
                <div>
                  <CardTitle>Messaging System</CardTitle>
                  <CardDescription>Communicate with buyers and admin</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium mb-2">3-Way Communication:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Message buyers about their orders, bookings, and custom requests</li>
                  <li>Admins can join conversations when issues need escalation or support</li>
                  <li>View full conversation history with buyers</li>
                  <li>Share files and images in messages</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Conversation Management:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Conversations automatically created when buyers message you</li>
                  <li>Categorized by type (Product, Service, Design, Quote, Support)</li>
                  <li>Mark conversations as resolved when complete</li>
                  <li>Mobile-friendly interface for messaging on the go</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Best Practices:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Respond to buyer messages within 24 hours</li>
                  <li>Use messaging to clarify custom requirements</li>
                  <li>Provide updates on order/service progress</li>
                  <li>Maintain professional communication</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <DollarSign className="h-6 w-6 text-primary mt-1" />
                <div>
                  <CardTitle>Commission & Pricing</CardTitle>
                  <CardDescription>Understanding platform fees and earnings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex gap-2">
                  <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-100">Default Commission Rate</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Standard platform commission is 20% per transaction. Custom rates may be negotiated with admin.
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">How It Works:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Set your product/service prices (gross amount)</li>
                  <li>Platform commission is automatically deducted from each sale</li>
                  <li>You receive the net amount (price minus commission)</li>
                  <li>View commission rates in your seller dashboard</li>
                  <li>Contact admin to discuss custom commission arrangements</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Pricing Guidelines:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>All prices must be in USD</li>
                  <li>Factor commission into your pricing strategy</li>
                  <li>Keep prices competitive with market rates</li>
                  <li>Clearly communicate any additional fees to buyers</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <TrendingUp className="h-6 w-6 text-primary mt-1" />
                <div>
                  <CardTitle>Payment & Payout System</CardTitle>
                  <CardDescription>How you receive your earnings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium mb-2">Escrow Protection:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Buyer payments are held in escrow for security</li>
                  <li>Funds are released after order/service completion</li>
                  <li>This protects both buyers and sellers</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Payment Flow:</h4>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                  <li><strong>Order Placed:</strong> Buyer submits order or booking</li>
                  <li><strong>Payment Made:</strong> Buyer completes bank transfer</li>
                  <li><strong>Admin Confirms:</strong> Payment verified and moved to escrow</li>
                  <li><strong>Fulfill Order:</strong> Process and deliver the product/service</li>
                  <li><strong>Mark as Complete:</strong> Update order status upon completion</li>
                  <li><strong>Payment Released:</strong> Escrow funds moved to your available balance</li>
                  <li><strong>Request Payout:</strong> Request transfer to your bank account</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium mb-2">Dashboard Overview:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>Total Revenue:</strong> All completed transactions (net of commission)</li>
                  <li><strong>Available Payout:</strong> Funds ready for withdrawal</li>
                  <li><strong>In Escrow:</strong> Funds held for ongoing orders</li>
                  <li>Track all transactions and payouts in real-time</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Commission & Payouts:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Default commission rate: 20% per transaction (customizable by admin)</li>
                  <li>Commission automatically deducted from each sale</li>
                  <li>You receive net amount (price minus commission)</li>
                  <li>Request payouts when funds are available</li>
                  <li>Commission reversed automatically on refunds</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <FileCheck className="h-6 w-6 text-primary mt-1" />
                <div>
                  <CardTitle>Order Management</CardTitle>
                  <CardDescription>Handling customer orders efficiently</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium mb-2">Product Order Workflow:</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Receive order notification</li>
                  <li>Wait for payment confirmation:
                    <ul className="list-disc list-inside ml-6 mt-1">
                      <li><strong>IPG:</strong> Instant automatic confirmation</li>
                      <li><strong>Bank Transfer:</strong> Admin manually verifies payment first</li>
                    </ul>
                  </li>
                  <li>Once payment is confirmed, begin processing</li>
                  <li>Update status to "Processing" then "Shipped"</li>
                  <li>Provide tracking information if available</li>
                  <li>Mark as "Delivered" upon confirmation</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium mb-2">Service Booking Workflow:</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Receive booking request from buyer</li>
                  <li>Review date, time, and service details</li>
                  <li>Confirm or decline the booking</li>
                  <li>Wait for buyer payment:
                    <ul className="list-disc list-inside ml-6 mt-1">
                      <li><strong>IPG:</strong> Instant automatic confirmation</li>
                      <li><strong>Bank Transfer:</strong> Admin manually verifies payment first</li>
                    </ul>
                  </li>
                  <li>Deliver the service on scheduled date</li>
                  <li>Mark booking as "Completed" and upload deliverables</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium mb-2">Seller Responsibilities:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Respond to bookings within 24 hours</li>
                  <li>Process paid orders promptly</li>
                  <li>Maintain accurate inventory levels</li>
                  <li>Communicate shipping delays to buyers</li>
                  <li>Provide quality products and services</li>
                  <li>Handle customer inquiries professionally</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <AlertCircle className="h-6 w-6 text-primary mt-1" />
                <div>
                  <CardTitle>Seller Policies</CardTitle>
                  <CardDescription>Important rules and guidelines</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Maintain honest and accurate product/service descriptions</li>
                <li>Do not list prohibited or illegal items</li>
                <li>Honor all confirmed orders and bookings</li>
                <li>Provide refunds according to your stated policies</li>
                <li>Maintain professional communication with buyers</li>
                <li>Report any suspicious activity to admin</li>
                <li>Keep your account and payment information updated</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-6 w-6 text-primary mt-1" />
                <div>
                  <CardTitle>Ready to Start Selling?</CardTitle>
                  <CardDescription>Join Vaaney's trusted seller community</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Get verified, list your products or services, and start earning on the Maldives' trusted e-commerce marketplace.
              </p>
              <div className="flex gap-3">
                <Link href="/signup">
                  <Button data-testid="button-signup">
                    Create Seller Account
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" data-testid="button-login">
                    Login to Dashboard
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
