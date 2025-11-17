import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, ShieldCheck, DollarSign, Package, FileCheck, TrendingUp, AlertCircle } from "lucide-react";

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
                  <CardTitle>Seller Verification Requirements</CardTitle>
                  <CardDescription>Mandatory verification for all sellers</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900 dark:text-amber-100">Required for All Sellers</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      Verification is mandatory before you can list products or services on Vaaney.
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
                  <li>Upload required documents during signup</li>
                  <li>Admin reviews your documents (typically 24-48 hours)</li>
                  <li>Receive approval notification</li>
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
                  <li>Wait for payment confirmation from admin</li>
                  <li>Process and pack the order</li>
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
                  <li>Wait for buyer payment (admin confirms)</li>
                  <li>Deliver the service on scheduled date</li>
                  <li>Mark booking as "Completed"</li>
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
