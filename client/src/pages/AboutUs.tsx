import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, ShieldCheck, Target, Users, Globe, Award, Zap, Palette, FileText, Mail, MessageSquare, Bot, Star, Bell, Plane, TrendingUp, RotateCcw } from "lucide-react";

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back-home">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>

        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4" data-testid="text-page-title">About Vaaney</h1>
          <p className="text-lg text-muted-foreground">
            A secure, transparent e-commerce marketplace for the Maldivian market connecting buyers with verified sellers of products and digital services.
          </p>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <Target className="h-6 w-6 text-primary mt-1" />
                <div>
                  <CardTitle>Our Mission</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Vaaney was created to provide a trusted e-commerce platform for the Maldivian market, connecting buyers with verified sellers of print products and digital services. We believe in building economic connections through secure, transparent transactions backed by cutting-edge technology.
              </p>
              <p className="text-muted-foreground">
                Our mission is to empower small businesses and entrepreneurs by providing them with the tools and infrastructure needed to succeed online while ensuring buyers have access to quality products and services with complete peace of mind, all powered by AI-assisted support and comprehensive workflow automation.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-6 w-6 text-primary mt-1" />
                <div>
                  <CardTitle>Why We Built Vaaney</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                E-commerce in the Maldivian market faced challenges: lack of trust, payment security concerns, difficulty verifying legitimate sellers, and manual processes. Vaaney addresses these pain points through:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li><strong>AI Assistant:</strong> Context-aware help available 24/7 on every page for instant support</li>
                <li><strong>Dual Authentication:</strong> Buyers can use Google sign-in or email/password, while sellers use verified email accounts</li>
                <li><strong>Seller Verification:</strong> All sellers must complete document verification to ensure legitimacy</li>
                <li><strong>Escrow Protection:</strong> Payments are held securely until orders are completed and services delivered</li>
                <li><strong>Design Workflows:</strong> Pre-purchase design approval for print products with reusable design library</li>
                <li><strong>Custom Quotes:</strong> Request and accept custom pricing for unique specifications</li>
                <li><strong>Digital Delivery:</strong> Automated email delivery of service deliverables with secure file storage</li>
                <li><strong>Ratings & Reviews:</strong> Verified post-transaction ratings to build trust</li>
                <li><strong>Notifications:</strong> In-app and email notifications for all major events</li>
                <li><strong>Aramex Shipping:</strong> International shipping with tracking and consolidation</li>
                <li><strong>Returns & Refunds:</strong> Comprehensive return workflow with admin resolution</li>
                <li><strong>Seller Boost:</strong> Promotional packages to feature products and services</li>
                <li><strong>Transparent Pricing:</strong> Clear commission structure starting at 20%, customizable per seller</li>
                <li><strong>Flexible Payment Options:</strong> Instant online payment gateway (IPG) or manual bank transfer</li>
              </ul>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <Users className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <CardTitle>For Buyers</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Buyers gain access to:
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>AI assistant for instant help on every page</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Easy sign-up with Google or email/password (no document verification required)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Design approval workflow for print products before purchase</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Custom quote requests for unique specifications</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Digital service delivery via email with downloadable files</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>WhatsApp-style mobile messaging for seller communication</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Design library to reuse approved designs across variants</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Rating system to share feedback and build trust</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>In-app and email notifications for all updates</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Aramex international shipping with tracking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Returns and refunds with admin resolution</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Secure escrow payment with flexible options (IPG or bank transfer)</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <Award className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <CardTitle>For Sellers</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Sellers benefit from:
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>AI assistant for business support and guidance</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Verified seller accounts with document verification for trust</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Workflow configuration (design approval and/or quote requirements)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Design approval dashboard to review buyer designs before production</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Custom quote creation for unique buyer requirements</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Digital deliverable uploads for completed services (automatic email delivery)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>3-way messaging with buyers and admin support</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Rating management and performance tracking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>In-app and email notifications for business activity</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Seller boost promotions to increase visibility</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Returns and refunds workflow with seller approval</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Transparent commission structure (20% default, customizable by admin)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Real-time dashboard tracking revenue, escrow, and available payouts</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <Zap className="h-6 w-6 text-primary mt-1" />
                <div>
                  <CardTitle>How Vaaney Works</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium mb-3">The Vaaney Process:</h4>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">1</span>
                    </div>
                    <div>
                      <p className="font-medium">Sign Up & Get AI Help</p>
                      <p className="text-sm text-muted-foreground">Buyers: Use Google or email/password (email verification only). Sellers: Email/password with document verification. AI assistant available on every page</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">2</span>
                    </div>
                    <div>
                      <p className="font-medium">Browse & Message</p>
                      <p className="text-sm text-muted-foreground">Buyers explore products/services, message sellers for questions, request custom quotes</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">3</span>
                    </div>
                    <div>
                      <p className="font-medium">Design Approval (Print Products)</p>
                      <p className="text-sm text-muted-foreground">Upload designs for seller approval before purchasing print products</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">4</span>
                    </div>
                    <div>
                      <p className="font-medium">Purchase & Pay</p>
                      <p className="text-sm text-muted-foreground">Choose payment method (instant IPG or bank transfer). Funds held in escrow for protection</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">5</span>
                    </div>
                    <div>
                      <p className="font-medium">Delivery & Release</p>
                      <p className="text-sm text-muted-foreground">Products shipped or services delivered via email. Funds released to seller after confirmation</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <Bot className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <CardTitle>AI Assistant</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Context-aware help throughout the platform:
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Available 24/7 on every page via chat button</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Understands your current page and context</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Provides role-specific answers for buyers and sellers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Remembers conversation history during session</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <Palette className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <CardTitle>Design Approval Workflow</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  For print products like business cards, banners, and flyers:
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Upload designs before purchasing</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Sellers review for print quality</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Reuse approved designs across variants</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Reduces production errors and returns</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <FileText className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <CardTitle>Custom Quote Requests</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  For unique specifications and bulk orders:
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Request pricing for custom sizes and materials</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Sellers create tailored quotes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Accept and purchase directly from quote</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Perfect for bulk and specialized orders</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <Mail className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <CardTitle>Digital Service Delivery</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  All services are digital with automated delivery:
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Sellers upload deliverable files when complete</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Automatic email delivery to buyers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Download from dashboard or email</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Secure file storage and access</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <CardTitle>Mobile-Friendly Messaging</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  WhatsApp-style communication experience:
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>3-way messaging (buyer, seller, admin)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Mobile-optimized interface</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>File and image sharing</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Admin support when needed</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <Star className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <CardTitle>Ratings & Reviews</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Build trust through verified feedback:
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>1-5 star ratings with comments and photos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Only verified buyers can leave ratings</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Ratings visible on products and seller profiles</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Helps buyers make informed decisions</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <Bell className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <CardTitle>Comprehensive Notifications</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Stay updated on all platform activity:
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>In-app bell icon for real-time updates</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Email notifications for major events</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Order, booking, message, and payment alerts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Never miss important business activity</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <Plane className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <CardTitle>Aramex International Shipping</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Fast, reliable delivery worldwide:
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Automatic shipping cost calculation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Real-time tracking information</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Order consolidation for multiple items</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>5-7 business days delivery to Maldives</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <RotateCcw className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <CardTitle>Returns & Refunds</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Buyer protection with fair resolution:
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Buyers request returns with detailed reasons</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Sellers review and approve/reject requests</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Admin resolves disputes if needed</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Automatic commission reversal on refunds</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <CardTitle>Seller Boost Promotions</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Increase visibility and sales:
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Feature products/services on homepage</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Higher placement in search results</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Flexible promotion durations (7, 14, 30 days)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Track performance in seller dashboard</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <Globe className="h-6 w-6 text-primary mt-1" />
                <div>
                  <CardTitle>Our Commitment</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                At Vaaney, we're committed to building a marketplace that prioritizes trust, security, and fairness. Every feature we build is designed with three core principles:
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Security First</h4>
                  <p className="text-sm text-muted-foreground">
                    Mandatory verification, escrow payments, and secure transaction processing
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Transparency</h4>
                  <p className="text-sm text-muted-foreground">
                    Clear pricing, visible commission rates, and complete transaction history
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Fairness</h4>
                  <p className="text-sm text-muted-foreground">
                    Equal protection for buyers and sellers, customizable commission rates
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Join Vaaney Today</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-6">
                Whether you're a buyer looking for quality products and services, or a seller wanting to expand into the Maldivian market, Vaaney provides the secure infrastructure you need.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/signup">
                  <Button data-testid="button-get-started">
                    Get Started
                  </Button>
                </Link>
                <Link href="/buyer-guidelines">
                  <Button variant="outline" data-testid="button-buyer-guidelines">
                    Buyer Guidelines
                  </Button>
                </Link>
                <Link href="/seller-guidelines">
                  <Button variant="outline" data-testid="button-seller-guidelines">
                    Seller Guidelines
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
