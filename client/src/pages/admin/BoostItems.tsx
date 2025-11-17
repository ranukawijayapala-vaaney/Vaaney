import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBoostedItemSchema, type BoostPackage, type BoostedItem, type Product, type Service, type InsertBoostedItem } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Package, Wrench, TrendingUp, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

export default function BoostItems() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedItemType, setSelectedItemType] = useState<"product" | "service">("product");
  const [selectedItemId, setSelectedItemId] = useState("");
  const { toast } = useToast();

  const { data: packages } = useQuery<BoostPackage[]>({
    queryKey: ["/api/boost-packages"],
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: services } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: boostedItems, isLoading } = useQuery<BoostedItem[]>({
    queryKey: ["/api/boosted-items", { activeOnly: false }],
    queryFn: async () => {
      const res = await fetch("/api/boosted-items?activeOnly=false");
      if (!res.ok) throw new Error("Failed to fetch boosted items");
      return res.json();
    },
  });

  const form = useForm({
    resolver: zodResolver(insertBoostedItemSchema),
    defaultValues: {
      itemType: "product" as const,
      itemId: "",
      packageId: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { itemType: "product" | "service"; itemId: string; packageId: string }) => {
      const pkg = packages?.find(p => p.id === data.packageId);
      if (!pkg) throw new Error("Package not found");

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + pkg.durationDays);

      return apiRequest("POST", "/api/admin/boosted-items", {
        itemType: data.itemType,
        itemId: data.itemId,
        packageId: data.packageId,
        startDate,
        endDate,
        isActive: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boosted-items"] });
      toast({ title: "Item boosted successfully" });
      setIsDialogOpen(false);
      form.reset();
      setSelectedItemId("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/boosted-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boosted-items"] });
      toast({ title: "Boost removed successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const expireMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/boosted-items/expire");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boosted-items"] });
      toast({ title: "Expired boosts cleaned up successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: { itemType: "product" | "service"; itemId: string; packageId: string }) => {
    createMutation.mutate(data);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to remove this boost?")) {
      deleteMutation.mutate(id);
    }
  };

  const getItemName = (item: BoostedItem) => {
    if (item.itemType === "product") {
      const product = products?.find(p => p.id === item.itemId);
      return product?.name || `Product ${item.itemId}`;
    } else {
      const service = services?.find(s => s.id === item.itemId);
      return service?.name || `Service ${item.itemId}`;
    }
  };

  const getPackageName = (packageId: string | null) => {
    if (!packageId) return "Unknown Package";
    const pkg = packages?.find(p => p.id === packageId);
    return pkg?.name || "Unknown Package";
  };

  const isExpired = (endDate: Date) => {
    return new Date(endDate) < new Date();
  };

  const activeBoosts = boostedItems?.filter(item => item.isActive && !isExpired(item.endDate)) || [];
  const expiredBoosts = boostedItems?.filter(item => !item.isActive || isExpired(item.endDate)) || [];

  const activeProducts = activeBoosts.filter(item => item.itemType === "product");
  const activeServices = activeBoosts.filter(item => item.itemType === "service");

  if (isLoading) {
    return <div className="p-6">Loading boosted items...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-boost-items">Boost Products & Services</h1>
          <p className="text-muted-foreground">Manage boosted products and services</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => expireMutation.mutate()}
            disabled={expireMutation.isPending}
            data-testid="button-expire-old"
          >
            Clean Up Expired
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-boost-item">
                <Plus className="w-4 h-4 mr-2" />
                Boost Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Boost Product or Service</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="itemType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Item Type</FormLabel>
                        <Select 
                          value={field.value} 
                          onValueChange={(value) => {
                            field.onChange(value);
                            setSelectedItemType(value as "product" | "service");
                            form.setValue("itemId", "");
                            setSelectedItemId("");
                          }}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-item-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="product">Product</SelectItem>
                            <SelectItem value="service">Service</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="itemId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {selectedItemType === "product" ? "Product" : "Service"}
                        </FormLabel>
                        <Select 
                          value={field.value} 
                          onValueChange={(value) => {
                            field.onChange(value);
                            setSelectedItemId(value);
                          }}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-item">
                              <SelectValue placeholder={`Select ${selectedItemType}`} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {selectedItemType === "product"
                              ? products?.map((product) => (
                                  <SelectItem key={product.id} value={product.id}>
                                    {product.name}
                                  </SelectItem>
                                ))
                              : services?.map((service) => (
                                  <SelectItem key={service.id} value={service.id}>
                                    {service.name}
                                  </SelectItem>
                                ))
                            }
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="packageId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Boost Package</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-package">
                              <SelectValue placeholder="Select package" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {packages
                              ?.filter(pkg => pkg.isActive)
                              .map((pkg) => (
                                <SelectItem key={pkg.id} value={pkg.id}>
                                  {pkg.name} - ${pkg.price} ({pkg.durationDays} days)
                                </SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2 pt-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createMutation.isPending}
                      data-testid="button-save-boost"
                    >
                      {createMutation.isPending ? "Boosting..." : "Apply Boost"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active" data-testid="tab-active">
            Active Boosts ({activeBoosts.length})
          </TabsTrigger>
          <TabsTrigger value="expired" data-testid="tab-expired">
            Expired ({expiredBoosts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Products ({activeProducts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No boosted products</p>
              ) : (
                <div className="space-y-3">
                  {activeProducts.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                      data-testid={`boost-item-${item.id}`}
                    >
                      <div className="flex-1">
                        <p className="font-medium" data-testid={`text-name-${item.id}`}>
                          {getItemName(item)}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            {getPackageName(item.packageId)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Expires {format(new Date(item.endDate), "MMM d, yyyy")}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-remove-${item.id}`}
                      >
                        <Trash2 className="w-3 h-3 mr-2" />
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                Services ({activeServices.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeServices.length === 0 ? (
                <p className="text-sm text-muted-foreground">No boosted services</p>
              ) : (
                <div className="space-y-3">
                  {activeServices.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                      data-testid={`boost-item-${item.id}`}
                    >
                      <div className="flex-1">
                        <p className="font-medium" data-testid={`text-name-${item.id}`}>
                          {getItemName(item)}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            {getPackageName(item.packageId)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Expires {format(new Date(item.endDate), "MMM d, yyyy")}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-remove-${item.id}`}
                      >
                        <Trash2 className="w-3 h-3 mr-2" />
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expired" className="space-y-4">
          {expiredBoosts.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">No expired boosts</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {expiredBoosts.map((item) => (
                <Card key={item.id} data-testid={`expired-boost-${item.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{getItemName(item)}</p>
                          <Badge variant="secondary">
                            {item.itemType === "product" ? "Product" : "Service"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span>{getPackageName(item.packageId)}</span>
                          <span>Ended {format(new Date(item.endDate), "MMM d, yyyy")}</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-${item.id}`}
                      >
                        <Trash2 className="w-3 h-3 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
