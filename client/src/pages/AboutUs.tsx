import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, ShieldCheck, Target, Users, Globe, Award, Zap } from "lucide-react";

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
                <li><strong>Mandatory Verification:</strong> All users, both buyers and sellers, must verify their identity before transacting</li>
                <li><strong>Escrow Protection:</strong> Payments are held securely until orders are completed and services delivered</li>
                <li><strong>Transparent Pricing:</strong> Clear commission structure starting at 20%, with no hidden fees</li>
                <li><strong>Local Payment Processing:</strong> Integration with Maldivian and Sri Lankan banking systems</li>
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
                    <span>Verified Sri Lankan sellers offering quality products and services</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Secure escrow payment protection</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Wide range of print products with custom variants</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Professional digital services with flexible packages</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Complete order and booking tracking</span>
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
                    <span>Access to Maldivian market with verified buyers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Secure payment processing with escrow protection</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Flexible product and service listing tools</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Transparent commission structure (customizable per seller)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Dashboard with real-time revenue and payout tracking</span>
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
                      <p className="font-medium">Sign Up & Verify</p>
                      <p className="text-sm text-muted-foreground">All users create accounts and upload verification documents</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">2</span>
                    </div>
                    <div>
                      <p className="font-medium">Admin Approval</p>
                      <p className="text-sm text-muted-foreground">Our team reviews and approves all accounts within 24-48 hours</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">3</span>
                    </div>
                    <div>
                      <p className="font-medium">Browse & Transact</p>
                      <p className="text-sm text-muted-foreground">Buyers shop from verified sellers, sellers list products and services</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">4</span>
                    </div>
                    <div>
                      <p className="font-medium">Secure Payments</p>
                      <p className="text-sm text-muted-foreground">All payments held in escrow until order completion or service delivery</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">5</span>
                    </div>
                    <div>
                      <p className="font-medium">Complete & Release</p>
                      <p className="text-sm text-muted-foreground">Funds released to sellers after successful delivery confirmation</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

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
