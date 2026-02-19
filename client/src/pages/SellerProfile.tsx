import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { 
  MapPin, Clock, Star, Award, Wrench, Building2, 
  ArrowLeft, ShoppingBag, Briefcase, Image as ImageIcon,
  Calendar, ExternalLink, ChevronLeft, ChevronRight, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { User, Product, Service, SellerProject, SellerGalleryImage } from "@shared/schema";

function ImageCarousel({ images, altPrefix, onImageClick }: { images: string[]; altPrefix: string; onImageClick?: (index: number) => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (images.length === 0) return null;

  return (
    <div
      className="relative aspect-video rounded-md overflow-hidden bg-muted group/carousel"
      onClick={() => onImageClick?.(currentIndex)}
    >
      <img
        src={images[currentIndex]}
        alt={`${altPrefix} ${currentIndex + 1}`}
        className="w-full h-full object-cover cursor-pointer"
      />
      {images.length > 1 && (
        <>
          <Button
            size="icon"
            variant="secondary"
            className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full opacity-0 group-hover/carousel:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
            }}
            data-testid="button-carousel-prev"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full opacity-0 group-hover/carousel:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
            }}
            data-testid="button-carousel-next"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === currentIndex ? "bg-white" : "bg-white/50"
                }`}
                data-testid={`carousel-dot-${idx}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ImageLightbox({
  images,
  initialIndex,
  onClose,
}: {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
      onClick={onClose}
      data-testid="lightbox-overlay"
    >
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-4 right-4 text-white z-[101]"
        onClick={onClose}
        data-testid="button-lightbox-close"
      >
        <X className="w-6 h-6" />
      </Button>

      <div
        className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={images[currentIndex]}
          alt={`Image ${currentIndex + 1}`}
          className="max-w-full max-h-[85vh] object-contain rounded-md"
          data-testid="img-lightbox"
        />

        {images.length > 1 && (
          <>
            <Button
              size="icon"
              variant="secondary"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full"
              onClick={handlePrev}
              data-testid="button-lightbox-prev"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full"
              onClick={handleNext}
              data-testid="button-lightbox-next"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/70 text-sm">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
}

interface SellerProfileData {
  seller: User;
  projects: SellerProject[];
  gallery: SellerGalleryImage[];
  products: Product[];
  services: Service[];
  ratings: Array<{
    id: string;
    rating: number;
    comment: string | null;
    images: string[] | null;
    createdAt: string;
    buyer: { firstName: string | null; lastName: string | null };
  }>;
}

export default function SellerProfile() {
  const { sellerId } = useParams<{ sellerId: string }>();
  const [lightboxImages, setLightboxImages] = useState<string[] | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openLightbox = useCallback((images: string[], index: number) => {
    setLightboxImages(images);
    setLightboxIndex(index);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxImages(null);
  }, []);

  const { data: profile, isLoading, error } = useQuery<SellerProfileData>({
    queryKey: ["/api/sellers", sellerId, "profile"],
    queryFn: async () => {
      const response = await fetch(`/api/sellers/${sellerId}/profile`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to load seller profile");
      return response.json();
    },
    enabled: !!sellerId,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Skeleton className="h-64 w-full mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48 md:col-span-2" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-xl font-semibold mb-2">Seller Not Found</h2>
            <p className="text-muted-foreground mb-4">This seller profile could not be found.</p>
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { seller, projects, gallery, products, services, ratings } = profile;
  
  const shopName = seller.shopName || `${seller.firstName || ""} ${seller.lastName || ""}`.trim() || "Seller";
  const averageRating = ratings.length > 0 
    ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
    : null;

  return (
    <div className="min-h-screen bg-background">
      <div 
        className="relative border-b bg-gradient-to-r from-primary/10 to-primary/5"
        style={seller.shopBackgroundImage ? {
          backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.5)), url(${seller.shopBackgroundImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        } : undefined}
      >
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <Link href="/">
            <Button 
              variant={seller.shopBackgroundImage ? "secondary" : "ghost"} 
              size="sm" 
              className="mb-4"
              data-testid="button-back-home"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Marketplace
            </Button>
          </Link>
          
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <Avatar className="w-24 h-24 md:w-32 md:h-32 border-4 border-background shadow-lg">
              <AvatarImage src={seller.shopLogo || seller.profileImageUrl || undefined} alt={shopName} />
              <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
                {shopName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 
                  className={`text-2xl md:text-3xl font-bold ${seller.shopBackgroundImage ? "text-white drop-shadow-lg" : ""}`}
                  data-testid="text-shop-name"
                >
                  {shopName}
                </h1>
                {seller.verificationStatus === "verified" && (
                  <Badge 
                    variant="secondary" 
                    className={seller.shopBackgroundImage 
                      ? "bg-green-600/80 text-white border-green-400/50" 
                      : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    }
                  >
                    Verified Seller
                  </Badge>
                )}
              </div>
              
              <div className={`flex flex-wrap gap-4 mb-4 ${seller.shopBackgroundImage ? "text-white/90" : "text-muted-foreground"}`}>
                {seller.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span data-testid="text-location">{seller.location}</span>
                  </div>
                )}
                {seller.yearsExperience && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{seller.yearsExperience} years experience</span>
                  </div>
                )}
                {averageRating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>{averageRating} ({ratings.length} reviews)</span>
                  </div>
                )}
              </div>
              
              {seller.expertise && seller.expertise.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {seller.expertise.map((exp, idx) => (
                    <Badge 
                      key={idx} 
                      variant="outline" 
                      className={`text-sm ${seller.shopBackgroundImage ? "border-white/50 text-white bg-white/10" : ""}`}
                    >
                      {exp}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Tabs defaultValue="about" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 gap-1">
            <TabsTrigger value="about" data-testid="tab-about">About</TabsTrigger>
            <TabsTrigger value="products" data-testid="tab-products">
              Products ({products.length})
            </TabsTrigger>
            <TabsTrigger value="services" data-testid="tab-services">
              Services ({services.length})
            </TabsTrigger>
            <TabsTrigger value="projects" data-testid="tab-projects">
              Projects ({projects.length})
            </TabsTrigger>
            <TabsTrigger value="reviews" data-testid="tab-reviews">
              Reviews ({ratings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="about" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {seller.aboutUs && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        About Us
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground whitespace-pre-wrap" data-testid="text-about-us">
                        {seller.aboutUs}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {seller.facilities && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Wrench className="w-5 h-5" />
                        Facilities & Equipment
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground whitespace-pre-wrap mb-4" data-testid="text-facilities">
                        {seller.facilities}
                      </p>
                      {seller.facilityImages && seller.facilityImages.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {seller.facilityImages.map((img, idx) => (
                            <div
                              key={idx}
                              className="aspect-video rounded-md overflow-hidden bg-muted cursor-pointer"
                              onClick={() => openLightbox(seller.facilityImages!, idx)}
                              data-testid={`img-facility-${idx}`}
                            >
                              <img 
                                src={img} 
                                alt={`Facility ${idx + 1}`} 
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {gallery.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ImageIcon className="w-5 h-5" />
                        Gallery
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ImageCarousel
                        images={gallery.map((g) => g.imageUrl)}
                        altPrefix="Gallery"
                        onImageClick={(idx) => openLightbox(gallery.map((g) => g.imageUrl), idx)}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="w-5 h-5" />
                      Quick Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Products</span>
                      <span className="font-semibold">{products.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Services</span>
                      <span className="font-semibold">{services.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Projects</span>
                      <span className="font-semibold">{projects.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Reviews</span>
                      <span className="font-semibold">{ratings.length}</span>
                    </div>
                    {averageRating && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Rating</span>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-semibold">{averageRating}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {seller.city && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        Location
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        {[seller.streetAddress, seller.city, seller.country].filter(Boolean).join(", ")}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="products">
            {products.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Products Yet</h3>
                  <p className="text-muted-foreground">This seller hasn't added any products yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((product) => (
                  <Link key={product.id} href={`/product/${product.id}`}>
                    <Card className="hover-elevate cursor-pointer h-full" data-testid={`card-product-${product.id}`}>
                      <div className="aspect-square overflow-hidden rounded-t-lg bg-muted">
                        {product.images && product.images[0] ? (
                          <img 
                            src={product.images[0]} 
                            alt={product.name} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold line-clamp-2 mb-1">{product.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{product.description}</p>
                        <p className="font-bold text-primary">
                          {product.currency} {product.basePrice}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="services">
            {services.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Services Yet</h3>
                  <p className="text-muted-foreground">This seller hasn't added any services yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map((service) => (
                  <Link key={service.id} href={`/book-service/${service.id}`}>
                    <Card className="hover-elevate cursor-pointer h-full" data-testid={`card-service-${service.id}`}>
                      <div className="aspect-video overflow-hidden rounded-t-lg bg-muted">
                        {service.images && service.images[0] ? (
                          <img 
                            src={service.images[0]} 
                            alt={service.name} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Briefcase className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <Badge variant="outline" className="mb-2">{service.category}</Badge>
                        <h3 className="font-semibold line-clamp-2 mb-1">{service.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">{service.description}</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="projects">
            {projects.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Award className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Projects Showcased</h3>
                  <p className="text-muted-foreground">This seller hasn't added any past projects yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {projects.map((project) => (
                  <Card key={project.id} data-testid={`card-project-${project.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{project.title}</h3>
                          {project.year && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                              <Calendar className="w-4 h-4" />
                              <span>{project.year}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {project.description && (
                        <p className="text-muted-foreground mb-4">{project.description}</p>
                      )}
                      {project.images && project.images.length > 0 && (
                        <div data-testid={`img-project-carousel-${project.id}`}>
                          <ImageCarousel
                            images={project.images}
                            altPrefix={project.title}
                            onImageClick={(idx) => openLightbox(project.images!, idx)}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviews">
            {ratings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Star className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Reviews Yet</h3>
                  <p className="text-muted-foreground">This seller hasn't received any reviews yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {ratings.map((rating) => (
                  <Card key={rating.id} data-testid={`card-review-${rating.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>
                              {(rating.buyer.firstName?.[0] || "?").toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">
                              {rating.buyer.firstName} {rating.buyer.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(rating.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= rating.rating 
                                  ? "fill-yellow-400 text-yellow-400" 
                                  : "text-muted-foreground"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {rating.comment && (
                        <p className="text-muted-foreground text-sm">{rating.comment}</p>
                      )}
                      {rating.images && rating.images.length > 0 && (
                        <div className="flex gap-2 mt-3">
                          {rating.images.map((img, idx) => (
                            <div key={idx} className="w-16 h-16 rounded overflow-hidden bg-muted">
                              <img src={img} alt="" className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {lightboxImages && (
        <ImageLightbox
          images={lightboxImages}
          initialIndex={lightboxIndex}
          onClose={closeLightbox}
        />
      )}
    </div>
  );
}
