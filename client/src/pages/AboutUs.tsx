import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, ShieldCheck, Target, Users, Globe, Award, Zap, Palette, FileText, Mail, MessageSquare } from "lucide-react";

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
            Connecting Maldivian buyers with verified Sri Lankan sellers through a secure, transparent marketplace.
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
                Vaaney was created to bridge the gap between Maldivian buyers and Sri Lankan sellers, providing a trusted platform for print products and digital services. We believe in building economic connections across the region through secure, transparent transactions.
              </p>
              <p className="text-muted-foreground">
                Our mission is to empower small businesses and entrepreneurs by providing them with the tools and infrastructure needed to reach new markets while ensuring buyers have access to quality products and services with complete peace of mind.
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
                Cross-border commerce in the region faced challenges: lack of trust, payment security concerns, and difficulty verifying legitimate sellers. Vaaney addresses these pain points through:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li><strong>Dual Authentication:</strong> Buyers can use Google sign-in or email/password, while sellers use verified email accounts</li>
                <li><strong>Seller Verification:</strong> All sellers must complete document verification to ensure legitimacy</li>
                <li><strong>Escrow Protection:</strong> Payments are held securely until orders are completed and services delivered</li>
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
                  Maldivian buyers gain access to:
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
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
                  Sri Lankan sellers benefit from:
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Verified seller accounts with document verification for trust</span>
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
                      <p className="font-medium">Sign Up</p>
                      <p className="text-sm text-muted-foreground">Buyers: Use Google or email/password (email verification only). Sellers: Email/password with document verification</p>
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
