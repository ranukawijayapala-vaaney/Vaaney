import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Search, Edit, Trash2, Package, Eye } from "lucide-react";
import { z } from "zod";
import type { Service, ServicePackage } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MultiImageUploader } from "@/components/MultiImageUploader";

const serviceFormSchema = z.object({
  name: z.string().min(3, "Service name must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().min(1, "Category is required"),
  images: z.array(z.string()).min(1, "At least one image is required").max(10, "Maximum 10 images allowed"),
  isActive: z.boolean().default(true),
  requiresQuote: z.boolean().default(false),
  requiresDesignApproval: z.boolean().default(false),
});

const packageFormSchema = z.object({
  name: z.string().min(1, "Package name is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.string().min(1, "Price is required"),
  duration: z.string().min(1, "Duration is required"),
  availability: z.string().min(1, "Availability is required"),
  features: z.string().min(1, "Features are required (comma separated)"),
});

type ServiceForm = z.infer<typeof serviceFormSchema>;
type PackageForm = z.infer<typeof packageFormSchema>;

export default function Services() {
  const { toast } = useToast();
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [showPackageDialog, setShowPackageDialog] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteServiceId, setDeleteServiceId] = useState<string | null>(null);
  const [deletePackageId, setDeletePackageId] = useState<string | null>(null);
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);

  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ["/api/seller/services"],
  });

  // Fetch packages for expanded service
  const { data: packages = [] } = useQuery<ServicePackage[]>({
    queryKey: ["/api/seller/services", expandedServiceId, "packages"],
    queryFn: async () => {
      if (!expandedServiceId) return [];
      const response = await fetch(`/api/services/${expandedServiceId}/packages`);
      return response.json();
    },
    enabled: !!expandedServiceId,
  });

  const serviceForm = useForm<ServiceForm>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      images: [],
      isActive: true,
      requiresQuote: false,
      requiresDesignApproval: false,
    },
  });

  const packageForm = useForm<PackageForm>({
    resolver: zodResolver(packageFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      duration: "",
      availability: "",
      features: "",
    },
  });

  const createServiceMutation = useMutation({
    mutationFn: async (data: ServiceForm) => {
      return await apiRequest("POST", "/api/seller/services", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seller/services"] });
      toast({ title: "Service created successfully" });
      setShowServiceDialog(false);
      serviceForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Creation failed", description: error.message, variant: "destructive" });
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PUT", `/api/seller/services/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seller/services"] });
      toast({ title: "Service updated successfully" });
      setShowServiceDialog(false);
      serviceForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return await apiRequest("PUT", `/api/seller/services/${id}`, { isActive });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/seller/services"] });
      toast({ 
        title: variables.isActive ? "Service activated" : "Service deactivated",
        description: variables.isActive 
          ? "Your service is now visible to buyers" 
          : "Your service is hidden from buyers"
      });
    },
    onError: (error: Error) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/seller/services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seller/services"] });
      toast({ title: "Service deleted successfully" });
      setDeleteServiceId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Deletion failed", description: error.message, variant: "destructive" });
    },
  });

  const createPackageMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/seller/service-packages", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seller/services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/services", expandedServiceId, "packages"] });
      toast({ title: "Package created successfully" });
      setShowPackageDialog(false);
      packageForm.reset();
      setSelectedPackage(null);
    },
    onError: (error: Error) => {
      toast({ title: "Creation failed", description: error.message, variant: "destructive" });
    },
  });

  const updatePackageMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PUT", `/api/seller/service-packages/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seller/services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/services", expandedServiceId, "packages"] });
      toast({ title: "Package updated successfully" });
      setShowPackageDialog(false);
      packageForm.reset();
      setSelectedPackage(null);
    },
    onError: (error: Error) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const deletePackageMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/seller/service-packages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seller/services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/services", expandedServiceId, "packages"] });
      toast({ title: "Package deleted successfully" });
      setDeletePackageId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Deletion failed", description: error.message, variant: "destructive" });
    },
  });

  const handleServiceSubmit = (data: ServiceForm) => {
    if (selectedService) {
      updateServiceMutation.mutate({ id: selectedService.id, data });
    } else {
      createServiceMutation.mutate(data);
    }
  };

  const handlePackageSubmit = (data: PackageForm) => {
    const packageData = {
      serviceId: selectedService?.id,
      name: data.name,
      description: data.description,
      price: data.price,
      duration: parseInt(data.duration),
      availability: parseInt(data.availability),
      features: data.features.split(',').map(f => f.trim()),
    };

    if (selectedPackage) {
      updatePackageMutation.mutate({ id: selectedPackage.id, data: packageData });
    } else {
      createPackageMutation.mutate(packageData);
    }
  };

  const handleToggleActive = (service: Service) => {
    toggleActiveMutation.mutate({ 
      id: service.id, 
      isActive: !service.isActive 
    });
  };

  const handlePreview = (serviceId: string) => {
    window.open(`/book-service/${serviceId}`, '_blank');
  };

  const togglePackages = (serviceId: string) => {
    if (expandedServiceId === serviceId) {
      setExpandedServiceId(null);
    } else {
      setExpandedServiceId(serviceId);
    }
  };

  const openServiceDialog = (service?: Service) => {
    if (service) {
      setSelectedService(service);
      serviceForm.reset({
        name: service.name,
        description: service.description,
        category: service.category || "",
        images: service.images || [],
        isActive: service.isActive,
        requiresQuote: service.requiresQuote || false,
        requiresDesignApproval: service.requiresDesignApproval || false,
      });
    } else {
      setSelectedService(null);
      serviceForm.reset({
        name: "",
        description: "",
        category: "",
        images: [],
        isActive: true,
        requiresQuote: false,
        requiresDesignApproval: false,
      });
    }
    setShowServiceDialog(true);
  };

  const openPackageDialog = (service: Service, pkg?: ServicePackage) => {
    setSelectedService(service);
    
    if (pkg) {
      setSelectedPackage(pkg);
      packageForm.reset({
        name: pkg.name,
        description: pkg.description,
        price: pkg.price.toString(),
        duration: pkg.duration?.toString() || "",
        availability: pkg.availability.toString(),
        features: Array.isArray(pkg.features) ? pkg.features.join(', ') : "",
      });
    } else {
      setSelectedPackage(null);
      packageForm.reset({
        name: "",
        description: "",
        price: "",
        duration: "",
        availability: "",
        features: "",
      });
    }
    setShowPackageDialog(true);
  };

  const filteredServices = services.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.category && s.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">My Services</h1>
        <Button onClick={() => openServiceDialog()} data-testid="button-create-service">
          <Plus className="h-4 w-4 mr-2" />
          Create Service
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search services..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-search"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="p-0">
                <Skeleton className="h-48 w-full" />
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredServices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2" data-testid="text-empty-state">No services found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "Try adjusting your search" : "Create your first service to get started"}
            </p>
            {!searchQuery && (
              <Button onClick={() => openServiceDialog()} data-testid="button-empty-create">
                <Plus className="h-4 w-4 mr-2" />
                Create Service
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <div key={service.id} className="space-y-3">
              <Card className="overflow-hidden">
                <CardHeader className="p-0">
                  {service.images && service.images.length > 0 ? (
                    <img
                      src={service.images[0]}
                      alt={service.name}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-muted flex items-center justify-center">
                      <Package className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-lg" data-testid={`text-service-name-${service.id}`}>
                      {service.name}
                    </h3>
                    <Badge variant={service.isActive ? "default" : "secondary"} data-testid={`badge-status-${service.id}`}>
                      {service.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {service.category && (
                    <Badge variant="outline" data-testid={`badge-category-${service.id}`}>{service.category}</Badge>
                  )}
                  <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-description-${service.id}`}>
                    {service.description}
                  </p>
                  <div className="flex gap-2 pt-2 flex-wrap">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handlePreview(service.id)}
                      data-testid={`button-preview-${service.id}`}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Preview
                    </Button>
                    <Button 
                      variant={service.isActive ? "outline" : "default"}
                      size="sm"
                      onClick={() => handleToggleActive(service)}
                      disabled={toggleActiveMutation.isPending}
                      data-testid={`button-toggle-active-${service.id}`}
                    >
                      {service.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => togglePackages(service.id)}
                      data-testid={`button-view-packages-${service.id}`}
                    >
                      <Package className="h-3 w-3 mr-1" />
                      Packages
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openServiceDialog(service)}
                      data-testid={`button-edit-${service.id}`}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setDeleteServiceId(service.id)}
                      data-testid={`button-delete-${service.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              {/* Packages list - shown when expanded */}
              {expandedServiceId === service.id && (
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Packages</h4>
                      <Button 
                        size="sm" 
                        onClick={() => openPackageDialog(service)}
                        data-testid={`button-add-package-${service.id}`}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Package
                      </Button>
                    </div>
                    {packages.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No packages yet. Add your first package!
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {packages.map((pkg) => (
                          <div 
                            key={pkg.id} 
                            className="flex items-center justify-between p-3 border rounded-lg"
                            data-testid={`package-item-${pkg.id}`}
                          >
                            <div className="flex-1">
                              <div className="font-medium">{pkg.name}</div>
                              <div className="text-sm text-muted-foreground">${pkg.price}</div>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => openPackageDialog(service, pkg)}
                                data-testid={`button-edit-package-${pkg.id}`}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setDeletePackageId(pkg.id)}
                                data-testid={`button-delete-package-${pkg.id}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={showServiceDialog} onOpenChange={setShowServiceDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="dialog-service">
          <DialogHeader>
            <DialogTitle>{selectedService ? "Edit Service" : "Create Service"}</DialogTitle>
          </DialogHeader>
          <Form {...serviceForm}>
            <form onSubmit={serviceForm.handleSubmit(handleServiceSubmit)} className="space-y-4">
              <FormField
                control={serviceForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Logo Design" {...field} data-testid="input-service-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={serviceForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe your service..." 
                        {...field} 
                        rows={4}
                        data-testid="input-service-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={serviceForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Graphic Design" {...field} data-testid="input-service-category" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={serviceForm.control}
                name="images"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Images</FormLabel>
                    <FormControl>
                      <MultiImageUploader
                        initialImages={field.value}
                        onImagesChange={field.onChange}
                        maxImages={10}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={serviceForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <FormLabel>Active Status</FormLabel>
                      <p className="text-sm text-muted-foreground">Make this service visible to buyers</p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-service-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <div className="space-y-4 border-t pt-4">
                <h4 className="text-sm font-semibold">Purchase Requirements</h4>
                <p className="text-xs text-muted-foreground">
                  Configure special requirements for buyers before they can purchase this service.
                </p>
                
                <FormField
                  control={serviceForm.control}
                  name="requiresQuote"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-service-requires-quote"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Requires Custom Quote</FormLabel>
                        <FormDescription>
                          Buyers must request and accept a custom quote before they can book. Useful for custom projects or variable pricing.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={serviceForm.control}
                  name="requiresDesignApproval"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-service-requires-design-approval"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Requires Design Approval</FormLabel>
                        <FormDescription>
                          Buyers must upload design files and receive your approval before they can book. Essential for custom design services.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowServiceDialog(false)}
                  data-testid="button-cancel-service"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createServiceMutation.isPending || updateServiceMutation.isPending}
                  data-testid="button-submit-service"
                >
                  {createServiceMutation.isPending || updateServiceMutation.isPending ? "Saving..." : "Save Service"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={showPackageDialog} onOpenChange={setShowPackageDialog}>
        <DialogContent data-testid="dialog-package">
          <DialogHeader>
            <DialogTitle>
              {selectedPackage ? "Edit Package" : `Add Package to ${selectedService?.name}`}
            </DialogTitle>
          </DialogHeader>
          <Form {...packageForm}>
            <form onSubmit={packageForm.handleSubmit(handlePackageSubmit)} className="space-y-4">
              <FormField
                control={packageForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Package Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Basic, Premium, Enterprise" {...field} data-testid="input-package-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={packageForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe what's included..." 
                        {...field} 
                        rows={3}
                        data-testid="input-package-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={packageForm.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (USD)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="99.99" {...field} data-testid="input-package-price" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={packageForm.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (days)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="7" {...field} data-testid="input-package-duration" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={packageForm.control}
                name="availability"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Available Slots</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="10" {...field} data-testid="input-package-availability" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={packageForm.control}
                name="features"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Features (comma separated)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="e.g., 3 revisions, Source files, Commercial license" 
                        {...field} 
                        rows={3}
                        data-testid="input-package-features"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPackageDialog(false)}
                  data-testid="button-cancel-package"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createPackageMutation.isPending || updatePackageMutation.isPending}
                  data-testid="button-submit-package"
                >
                  {createPackageMutation.isPending || updatePackageMutation.isPending 
                    ? "Saving..." 
                    : selectedPackage ? "Update Package" : "Create Package"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteServiceId} onOpenChange={() => setDeleteServiceId(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the service and all its packages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteServiceId && deleteServiceMutation.mutate(deleteServiceId)}
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletePackageId} onOpenChange={() => setDeletePackageId(null)}>
        <AlertDialogContent data-testid="dialog-delete-package-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Package?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this package.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-package">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePackageId && deletePackageMutation.mutate(deletePackageId)}
              data-testid="button-confirm-delete-package"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
