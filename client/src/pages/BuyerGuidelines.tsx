import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, ShieldCheck, CreditCard, Package, Clock, FileText, AlertCircle } from "lucide-react";

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
                <ShieldCheck className="h-6 w-6 text-primary mt-1" />
                <div>
                  <CardTitle>Account Verification</CardTitle>
                  <CardDescription>All buyers must be verified before making purchases</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium mb-2">Verification Process:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Upload a valid ID document (passport, national ID card) during signup</li>
                  <li>Wait for admin verification (typically within 24-48 hours)</li>
                  <li>You'll receive notification once your account is approved</li>
                  <li>Only verified buyers can make purchases on Vaaney</li>
                </ul>
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
                <h4 className="font-medium mb-2">Service Bookings:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Browse available services and service packages</li>
                  <li>Select your preferred date and time for the service</li>
                  <li>Submit booking request to the seller</li>
                  <li>Wait for seller confirmation before proceeding to payment</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <CreditCard className="h-6 w-6 text-primary mt-1" />
                <div>
                  <CardTitle>Payment & Escrow System</CardTitle>
                  <CardDescription>Safe and secure payment processing</CardDescription>
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
                <h4 className="font-medium mb-2">How Payment Works:</h4>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                  <li><strong>Place Order:</strong> Submit your order or service booking</li>
                  <li><strong>Make Payment:</strong> Complete payment via local bank transfer</li>
                  <li><strong>Click "I Have Made the Payment":</strong> Notify the admin that payment is complete</li>
                  <li><strong>Admin Confirmation:</strong> Admin verifies and confirms your payment</li>
                  <li><strong>Escrow Protection:</strong> Your payment is held securely until order completion</li>
                  <li><strong>Order Fulfillment:</strong> Seller processes and ships your order</li>
                  <li><strong>Payment Release:</strong> Funds are released to seller after delivery confirmation</li>
                </ol>
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
                  <li><strong>Confirmed:</strong> Seller has accepted your booking</li>
                  <li><strong>Pending Payment:</strong> Payment link available, awaiting your payment</li>
                  <li><strong>Paid:</strong> Payment confirmed, service scheduled</li>
                  <li><strong>Ongoing:</strong> Service is in progress</li>
                  <li><strong>Completed:</strong> Service delivered successfully</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <FileText className="h-6 w-6 text-primary mt-1" />
                <div>
                  <CardTitle>Policies & Terms</CardTitle>
                  <CardDescription>Important information about using Vaaney</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>All purchases are subject to seller terms and conditions</li>
                <li>Prices are in USD and may vary based on product variants</li>
                <li>Shipping costs and delivery times vary by seller and location</li>
                <li>Returns and refunds are handled according to seller policies</li>
                <li>Contact support for any issues with orders or payments</li>
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
