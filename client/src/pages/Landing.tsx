import { 
  ArrowRight, ShieldCheck, DollarSign, Users, ShoppingBag,
  Globe, Sparkles, TrendingUp, CheckCircle2, 
  Printer, Code, Megaphone, PenTool, Video, FileText,
  Music, BarChart3, Leaf, Clock, Target, Award, Menu, X, ChevronLeft, ChevronRight,
  Search, Package, Filter, Store
} from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { HomepageBanner, BoostedItem, Product, Service } from "@shared/schema";
import printServiceImage from "@assets/stock_images/printing_press_comme_31325a01.jpg";
import digitalServiceImage from "@assets/stock_images/digital_marketing_te_924e1fd2.jpg";
import vaaneyLogo from "@assets/Vaaney logo (2)_1763908268914.png";

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all");

  // Fetch hero banners
  const { data: heroBanners = [], isLoading: isLoadingHero } = useQuery<HomepageBanner[]>({
    queryKey: ["/api/homepage-banners", { type: "hero" }],
    queryFn: async () => {
      const response = await fetch("/api/homepage-banners?type=hero", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch hero banners");
      return response.json();
    },
  });

  // Fetch promotion banners
  const { data: promotionBanners = [] } = useQuery<HomepageBanner[]>({
    queryKey: ["/api/homepage-banners", { type: "promotion" }],
    queryFn: async () => {
      const response = await fetch("/api/homepage-banners?type=promotion", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch promotion banners");
      return response.json();
    },
  });

  // Fetch news banners
  const { data: newsBanners = [] } = useQuery<HomepageBanner[]>({
    queryKey: ["/api/homepage-banners", { type: "news" }],
    queryFn: async () => {
      const response = await fetch("/api/homepage-banners?type=news", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch news banners");
      return response.json();
    },
  });

  // Fetch boosted items
  const { data: boostedItems = [] } = useQuery<BoostedItem[]>({
    queryKey: ["/api/boosted-items", { activeOnly: true }],
    queryFn: async () => {
      const response = await fetch("/api/boosted-items?activeOnly=true", {
        credentials: "include",
      });
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Fetch public shops for carousel
  const { data: publicShops = [] } = useQuery<Array<{ id: string; shopName: string | null; shopLogo: string | null }>>({
    queryKey: ["/api/public/shops"],
  });

  // Fetch all products (always fetch for marketplace section)
  const { data: allProducts = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Fetch all services (always fetch for marketplace section)
  const { data: allServices = [], isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  // Get unique categories from products and services
  const allCategories = [...new Set([
    ...allProducts.map(p => p.category).filter((c): c is string => !!c),
    ...allServices.map(s => s.category).filter((c): c is string => !!c)
  ])].sort();

  // Filter products based on search and category
  const filteredProducts = allProducts.filter((product) => {
    const matchesSearch = !searchQuery || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = category === "all" || 
      product.category === category;
    return matchesSearch && matchesCategory;
  });

  // Filter services based on search and category
  const filteredServices = allServices.filter((service) => {
    const matchesSearch = !searchQuery || 
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      service.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = category === "all" || 
      service.category === category;
    return matchesSearch && matchesCategory;
  });

  // Helper function to check if an item is boosted
  const isItemBoosted = (itemId: string, itemType: "product" | "service") => {
    return boostedItems.some(boost => boost.itemId === itemId && boost.itemType === itemType && boost.isActive);
  };

  // Get price display for product
  const getProductDisplayPrice = (product: Product): string | null => {
    const variants = (product as any).variants;
    if (variants && variants.length > 0) {
      const prices = variants
        .map((v: any) => parseFloat(v.price))
        .filter((p: number) => !isNaN(p) && p > 0);
      if (prices.length > 0) {
        return `From $${Math.min(...prices).toFixed(2)}`;
      }
    }
    if (product.price !== null && product.price !== undefined) {
      const price = parseFloat(String(product.price));
      if (!isNaN(price) && price > 0) {
        return `$${price.toFixed(2)}`;
      }
    }
    return null;
  };

  // Get price display for service
  const getServiceDisplayPrice = (service: Service): string | null => {
    const packages = (service as any).packages;
    if (packages && packages.length > 0) {
      const prices = packages
        .map((p: any) => parseFloat(p.price))
        .filter((p: number) => !isNaN(p) && p > 0);
      if (prices.length > 0) {
        return `From $${Math.min(...prices).toFixed(2)}`;
      }
    }
    return null;
  };

  // Filter boosted products and services
  const boostedProducts = boostedItems
    .filter(item => item.itemType === "product")
    .map(item => allProducts.find(p => p.id === item.itemId))
    .filter((p): p is Product => p !== undefined);

  const boostedServices = boostedItems
    .filter(item => item.itemType === "service")
    .map(item => allServices.find(s => s.id === item.itemId))
    .filter((s): s is Service => s !== undefined);

  // Hero Carousel
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 5000 })]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };

    emblaApi.on("select", onSelect);
    onSelect();

    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <a href="/" className="flex items-center hover-elevate active-elevate-2 rounded-md px-2 py-1 -ml-2 cursor-pointer" data-testid="link-home-logo">
              <img src={vaaneyLogo} alt="Vaaney" className="h-10" />
            </a>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <a
                href="/about"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                data-testid="nav-about"
              >
                About Us
              </a>
              <a
                href="/buyer-guidelines"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                data-testid="nav-buyer-guidelines"
              >
                Buyer Guidelines
              </a>
              <a
                href="/seller-guidelines"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                data-testid="nav-seller-guidelines"
              >
                Seller Guidelines
              </a>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <div className="hidden md:flex items-center gap-3">
                <Button
                  onClick={() => window.location.href = "/login"}
                  variant="outline"
                  size="sm"
                  data-testid="button-login"
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => window.location.href = "/signup"}
                  size="sm"
                  data-testid="button-get-started"
                >
                  Get Started
                </Button>
              </div>
              
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                data-testid="button-mobile-menu"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
          
          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t bg-background/95 backdrop-blur">
              <div className="px-4 py-4 space-y-3">
                <a
                  href="/about"
                  className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="mobile-nav-about"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  About Us
                </a>
                <a
                  href="/buyer-guidelines"
                  className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="mobile-nav-buyer-guidelines"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Buyer Guidelines
                </a>
                <a
                  href="/seller-guidelines"
                  className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="mobile-nav-seller-guidelines"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Seller Guidelines
                </a>
                <div className="pt-3 space-y-2">
                  <Button
                    onClick={() => window.location.href = "/login"}
                    variant="outline"
                    size="sm"
                    className="w-full"
                    data-testid="mobile-button-login"
                  >
                    Sign In
                  </Button>
                  <Button
                    onClick={() => window.location.href = "/signup"}
                    size="sm"
                    className="w-full"
                    data-testid="mobile-button-get-started"
                  >
                    Get Started
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      <main>
        {/* Hero Carousel Section */}
        <section className="relative overflow-hidden" data-testid="section-hero-carousel">
          {isLoadingHero ? (
            /* Loading skeleton while fetching data */
            <div className="relative h-[70vh] md:h-[80vh] bg-muted animate-pulse flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="h-12 w-64 bg-muted-foreground/10 rounded-lg mx-auto"></div>
                <div className="h-8 w-96 bg-muted-foreground/10 rounded-lg mx-auto"></div>
                <div className="h-4 w-80 bg-muted-foreground/10 rounded-lg mx-auto"></div>
              </div>
            </div>
          ) : heroBanners.length > 0 ? (
            <div className="relative">
              <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex">
                  {heroBanners.map((banner) => (
                    <div key={banner.id} className="flex-[0_0_100%] min-w-0 relative">
                      <div className="relative h-[70vh] md:h-[80vh] flex items-center">
                        {/* Banner Image with Dark Overlay */}
                        <div className="absolute inset-0 -z-10">
                          <img
                            src={banner.imageUrl}
                            alt={banner.title || "Hero banner"}
                            className="w-full h-full object-cover object-center"
                          />
                          {/* Dark wash gradient for text readability */}
                          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30"></div>
                        </div>

                        {/* Content */}
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
                          <div className="max-w-2xl space-y-6 text-white">
                            {banner.title && (
                              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-display tracking-tight">
                                {banner.title}
                              </h1>
                            )}
                            {banner.subtitle && (
                              <p className="text-lg sm:text-xl text-white/90 leading-relaxed">
                                {banner.subtitle}
                              </p>
                            )}
                            {banner.description && (
                              <p className="text-base text-white/80">
                                {banner.description}
                              </p>
                            )}
                            {banner.ctaText && banner.ctaLink && (
                              <div className="pt-4">
                                <Button
                                  size="lg"
                                  onClick={() => window.location.href = banner.ctaLink!}
                                  className="text-lg px-8 py-6"
                                  data-testid={`button-cta-${banner.id}`}
                                >
                                  {banner.ctaText}
                                  <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation Buttons */}
              {heroBanners.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={scrollPrev}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
                    data-testid="button-carousel-prev"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={scrollNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
                    data-testid="button-carousel-next"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>

                  {/* Dots Indicator */}
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-2">
                    {heroBanners.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => emblaApi && emblaApi.scrollTo(index)}
                        className={`h-2 rounded-full transition-all ${
                          index === selectedIndex ? "w-8 bg-white" : "w-2 bg-white/50 hover:bg-white/75"
                        }`}
                        data-testid={`button-dot-${index}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Fallback Static Hero if no banners */
            <div className="relative min-h-[90vh] flex items-center overflow-hidden">
              <div className="absolute inset-0 -z-10">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/20 to-background"></div>
                <div className="absolute inset-0 bg-gradient-to-tr from-background via-transparent to-accent/10"></div>
              </div>

              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32 w-full">
                <div className="text-center space-y-10">
                  <div className="relative inline-block">
                    <Badge variant="outline" className="border-primary/50 text-primary bg-background/80 backdrop-blur-sm px-6 py-2 text-sm font-medium">
                      <Sparkles className="inline-block w-4 h-4 mr-2" />
                      Cross-Border E-Marketplace
                    </Badge>
                  </div>

                  <div className="space-y-6">
                    <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold font-display tracking-tight">
                      Connecting Maldives with
                      <br />
                      <span className="relative inline-block">
                        <span className="relative z-10 bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                          Sri Lankan Excellence
                        </span>
                      </span>
                    </h1>
                    <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-4xl mx-auto leading-relaxed font-light">
                      A dynamic cross-border marketplace bridging Sri Lanka's creative and technical expertise with the Maldives' thriving hospitality, corporate, and consumer markets
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                    <Button
                      size="lg"
                      onClick={() => window.location.href = "/signup"}
                      data-testid="button-start-buying"
                      className="text-lg px-10 py-6"
                    >
                      Start Shopping
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => window.location.href = "/signup"}
                      data-testid="button-become-seller"
                      className="text-lg px-10 py-6"
                    >
                      Become a Seller
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Marketplace Section */}
        <section className="py-16 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl sm:text-4xl font-bold font-display mb-3">Browse Marketplace</h2>
              <p className="text-lg text-muted-foreground">
                Discover products and services from verified Sri Lankan sellers
              </p>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search products and services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full"
                  data-testid="input-landing-search"
                />
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-landing-category">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {allCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tabs for Products and Services */}
            <Tabs defaultValue="products" className="w-full">
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
                <TabsTrigger value="products" data-testid="tab-landing-products">
                  <Package className="h-4 w-4 mr-2" />
                  Products ({filteredProducts.length})
                </TabsTrigger>
                <TabsTrigger value="services" data-testid="tab-landing-services">
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Services ({filteredServices.length})
                </TabsTrigger>
              </TabsList>

              {/* Products Tab */}
              <TabsContent value="products">
                {productsLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <Card key={i}>
                        <Skeleton className="aspect-square w-full" />
                        <CardContent className="p-4 space-y-2">
                          <Skeleton className="h-5 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <Card>
                    <CardContent className="py-16 text-center">
                      <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No products found</h3>
                      <p className="text-muted-foreground">Try adjusting your search or filters</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredProducts.map((product) => (
                      <a
                        key={product.id}
                        href={`/product/${product.id}`}
                        className="block"
                        data-testid={`card-product-${product.id}`}
                      >
                        <Card className="h-full hover-elevate active-elevate-2 overflow-visible">
                          <div className="relative aspect-square overflow-hidden rounded-t-md bg-muted">
                            {product.images?.[0] ? (
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="h-12 w-12 text-muted-foreground" />
                              </div>
                            )}
                            {isItemBoosted(product.id, "product") && (
                              <Badge className="absolute top-2 right-2 bg-primary/90 backdrop-blur">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Featured
                              </Badge>
                            )}
                          </div>
                          <CardContent className="p-3">
                            <h4 className="font-semibold line-clamp-2 mb-1">{product.name}</h4>
                            <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                              {product.description}
                            </p>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-primary font-semibold">
                                {getProductDisplayPrice(product) || "Custom Quote"}
                              </span>
                              {product.category && (
                                <Badge variant="secondary" className="text-xs truncate max-w-20">
                                  {product.category}
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </a>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Services Tab */}
              <TabsContent value="services">
                {servicesLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <Card key={i}>
                        <Skeleton className="aspect-square w-full" />
                        <CardContent className="p-4 space-y-2">
                          <Skeleton className="h-5 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : filteredServices.length === 0 ? (
                  <Card>
                    <CardContent className="py-16 text-center">
                      <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No services found</h3>
                      <p className="text-muted-foreground">Try adjusting your search or filters</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredServices.map((service) => (
                      <a
                        key={service.id}
                        href={`/book-service/${service.id}`}
                        className="block"
                        data-testid={`card-service-${service.id}`}
                      >
                        <Card className="h-full hover-elevate active-elevate-2 overflow-visible">
                          <div className="relative aspect-square overflow-hidden rounded-t-md bg-muted">
                            {service.images?.[0] ? (
                              <img
                                src={service.images[0]}
                                alt={service.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ShoppingBag className="h-12 w-12 text-muted-foreground" />
                              </div>
                            )}
                            {isItemBoosted(service.id, "service") && (
                              <Badge className="absolute top-2 right-2 bg-primary/90 backdrop-blur">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Featured
                              </Badge>
                            )}
                          </div>
                          <CardContent className="p-3">
                            <h4 className="font-semibold line-clamp-2 mb-1">{service.name}</h4>
                            <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                              {service.description}
                            </p>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-primary font-semibold">
                                {getServiceDisplayPrice(service) || "Request Quote"}
                              </span>
                              {service.category && (
                                <Badge variant="secondary" className="text-xs truncate max-w-20">
                                  {service.category}
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </a>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* Featured Products & Services - keep for boosted items highlight */}
        {(boostedProducts.length > 0 || boostedServices.length > 0) && (
          <section className="py-16 bg-background hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Sparkles className="h-6 w-6 text-primary" />
                  <h2 className="text-3xl sm:text-4xl font-bold font-display">Featured Listings</h2>
                </div>
                <p className="text-lg text-muted-foreground">
                  Top-rated products and services from verified sellers
                </p>
              </div>

              {/* Featured Products */}
              {boostedProducts.length > 0 && (
                <div className="mb-12">
                  <div className="flex items-center gap-2 mb-6">
                    <ShoppingBag className="h-5 w-5 text-primary" />
                    <h3 className="text-2xl font-semibold">Featured Products</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {boostedProducts.map((product) => (
                      <Card
                        key={product.id}
                        className="group hover-elevate active-elevate-2 overflow-hidden"
                        data-testid={`featured-product-${product.id}`}
                      >
                        <div className="relative aspect-square overflow-hidden bg-muted">
                          {product.images?.[0] ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag className="h-16 w-16 text-muted-foreground/50" />
                            </div>
                          )}
                          <Badge className="absolute top-3 right-3 bg-primary/90 backdrop-blur">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Featured
                          </Badge>
                        </div>
                        <CardContent className="p-4">
                          <h4 className="font-semibold text-lg mb-2 line-clamp-1">{product.name}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {product.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <div>
                              {product.category && (
                                <Badge variant="secondary" className="text-xs">
                                  {product.category}
                                </Badge>
                              )}
                            </div>
                            <Button
                              size="sm"
                              onClick={() => window.location.href = "/signup"}
                              data-testid={`button-view-product-${product.id}`}
                            >
                              View Details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Featured Services */}
              {boostedServices.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h3 className="text-2xl font-semibold">Featured Services</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {boostedServices.map((service) => (
                      <Card
                        key={service.id}
                        className="group hover-elevate active-elevate-2 overflow-hidden"
                        data-testid={`featured-service-${service.id}`}
                      >
                        <div className="relative aspect-video overflow-hidden bg-muted">
                          {service.images?.[0] ? (
                            <img
                              src={service.images[0]}
                              alt={service.name}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Sparkles className="h-16 w-16 text-muted-foreground/50" />
                            </div>
                          )}
                          <Badge className="absolute top-3 right-3 bg-primary/90 backdrop-blur">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Featured
                          </Badge>
                        </div>
                        <CardContent className="p-4">
                          <h4 className="font-semibold text-lg mb-2 line-clamp-1">{service.name}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {service.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <div>
                              {service.category && (
                                <Badge variant="secondary" className="text-xs">
                                  {service.category}
                                </Badge>
                              )}
                            </div>
                            <Button
                              size="sm"
                              onClick={() => window.location.href = "/signup"}
                              data-testid={`button-view-service-${service.id}`}
                            >
                              View Details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Shop Profiles Carousel */}
        {publicShops.length > 0 && (
          <section className="py-12 bg-background" data-testid="section-shop-carousel">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold font-display">Our Sellers</h2>
                  <p className="text-muted-foreground mt-1">Browse shops from verified Sri Lankan sellers</p>
                </div>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-muted">
                {publicShops.map((shop) => (
                  <a
                    key={shop.id}
                    href={`/seller/${shop.id}`}
                    className="flex-shrink-0 hover-elevate active-elevate-2 rounded-lg transition-all"
                    data-testid={`link-shop-${shop.id}`}
                  >
                    <Card className="w-40 sm:w-48 overflow-hidden">
                      <CardContent className="p-4 flex flex-col items-center text-center space-y-3">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border">
                          {shop.shopLogo ? (
                            <img
                              src={shop.shopLogo}
                              alt={shop.shopName || "Shop"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Store className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
                          )}
                        </div>
                        <p className="font-medium text-sm line-clamp-2">{shop.shopName || "Shop"}</p>
                      </CardContent>
                    </Card>
                  </a>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* How It Works */}
        <section className="py-20 bg-muted/30">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold font-display mb-4">How to Get Started</h2>
              <p className="text-lg text-muted-foreground">
                Join in 3 simple steps—verified and ready to transact within 24-48 hours
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <Card>
                <CardContent className="p-6 space-y-3 text-center">
                  <div className="h-14 w-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">1</span>
                  </div>
                  <h3 className="text-xl font-semibold">Sign Up</h3>
                  <p className="text-sm text-muted-foreground">
                    Create your account and choose your role (Buyer or Seller)
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 space-y-3 text-center">
                  <div className="h-14 w-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">2</span>
                  </div>
                  <h3 className="text-xl font-semibold">Upload Documents</h3>
                  <p className="text-sm text-muted-foreground">
                    <strong>Buyers:</strong> Maldivian ID<br/>
                    <strong>Sellers:</strong> ID or Business Registration
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 space-y-3 text-center">
                  <div className="h-14 w-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">3</span>
                  </div>
                  <h3 className="text-xl font-semibold">Get Verified</h3>
                  <p className="text-sm text-muted-foreground">
                    Admin review within 24-48 hours, then start transacting
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <h2 className="text-4xl font-bold font-display">Ready to Get Started?</h2>
            <p className="text-lg opacity-90 max-w-2xl mx-auto">
              Join Vaaney today and experience seamless cross-border commerce built on quality, trust, and community
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <Button
                size="lg"
                variant="secondary"
                onClick={() => window.location.href = "/signup"}
                data-testid="button-join-now"
                className="text-lg px-8"
              >
                Join Vaaney Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => window.location.href = "/about"}
                data-testid="button-learn-more"
                className="text-lg px-8 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
              >
                Learn More
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-12 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-4">
              <div className="flex items-center">
                <img src={vaaneyLogo} alt="Vaaney" className="h-8" />
              </div>
              <p className="text-sm text-muted-foreground">
                Connecting Maldivian buyers with Sri Lankan sellers through a trusted, secure marketplace.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Buyers</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/buyer-guidelines" className="hover:text-foreground transition-colors">Buyer Guidelines</a></li>
                <li><a href="/signup" className="hover:text-foreground transition-colors">Start Shopping</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Sellers</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/seller-guidelines" className="hover:text-foreground transition-colors">Seller Guidelines</a></li>
                <li><a href="/signup" className="hover:text-foreground transition-colors">Become a Seller</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/about" className="hover:text-foreground transition-colors">About Us</a></li>
                <li><a href="/login" className="hover:text-foreground transition-colors">Sign In</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t text-center text-sm text-muted-foreground">
            <p>© 2024 Vaaney. Bridging Maldives and Sri Lanka through quality, trust, and community.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
