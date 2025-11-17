import { useState } from "react";
import { Plus, Edit, Trash2, Package, Search, Eye, Power } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Product, ProductVariant } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { MultiImageUploader } from "@/components/MultiImageUploader";

const productFormSchema = z.object({
  name: z.string().min(3, "Product name must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().min(1, "Category is required"),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Price must be a valid number (e.g., 29.99)"),
  stock: z.string().regex(/^\d+$/, "Stock must be a whole number"),
  images: z.array(z.string()).min(1, "At least one image is required").max(10, "Maximum 10 images allowed"),
  isActive: z.boolean().default(true),
  requiresQuote: z.boolean().default(false),
  requiresDesignApproval: z.boolean().default(false),
  // Optional shipping dimensions for default variant (decimals stay as strings)
  weight: z.string().optional().transform(val => val === "" || val === undefined ? undefined : val),
  length: z.string().optional().transform(val => val === "" || val === undefined ? undefined : val),
  width: z.string().optional().transform(val => val === "" || val === undefined ? undefined : val),
  height: z.string().optional().transform(val => val === "" || val === undefined ? undefined : val),
});

const variantFormSchema = z.object({
  name: z.string().min(1, "Variant name is required"),
  sku: z.string().min(1, "SKU is required"),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price format"),
  inventory: z.string().regex(/^\d+$/, "Inventory must be a number"),
  imageUrls: z.array(z.string()).optional().default([]),
  // Optional shipping fields (decimals stay as strings)
  weight: z.string().optional().transform(val => val === "" || val === undefined ? undefined : val),
  length: z.string().optional().transform(val => val === "" || val === undefined ? undefined : val),
  width: z.string().optional().transform(val => val === "" || val === undefined ? undefined : val),
  height: z.string().optional().transform(val => val === "" || val === undefined ? undefined : val),
});

type ProductForm = z.infer<typeof productFormSchema>;
type VariantForm = z.infer<typeof variantFormSchema>;

export default function Products() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showVariantDialog, setShowVariantDialog] = useState(false);
  const [showVariantsListDialog, setShowVariantsListDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [isEditingVariant, setIsEditingVariant] = useState(false);
  const [variantToDelete, setVariantToDelete] = useState<ProductVariant | null>(null);
  const { toast} = useToast();

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/seller/products"],
  });

  const productForm = useForm<ProductForm>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      price: "",
      stock: "",
      images: [],
      isActive: true,
      requiresQuote: false,
      requiresDesignApproval: false,
      weight: "",
      length: "",
      width: "",
      height: "",
    },
  });

  const variantForm = useForm<VariantForm>({
    resolver: zodResolver(variantFormSchema),
    defaultValues: {
      name: "",
      sku: "",
      price: "",
      inventory: "",
      imageUrls: [],
      weight: "",
      length: "",
      width: "",
      height: "",
    },
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: ProductForm) => {
      return await apiRequest("POST", "/api/seller/products", data);
    },
    onSuccess: () => {
      toast({ title: "Product created", description: "Your product has been created successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/products"] });
      setShowProductDialog(false);
      productForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Creation failed", description: error.message, variant: "destructive" });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProductForm }) => {
      return await apiRequest("PUT", `/api/seller/products/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Product updated", description: "Your product has been updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/products"] });
      setShowProductDialog(false);
      setSelectedProduct(null);
      productForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const toggleProductStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return await apiRequest("PUT", `/api/seller/products/${id}`, { isActive });
    },
    onSuccess: (_, variables) => {
      toast({ 
        title: variables.isActive ? "Product activated" : "Product deactivated",
        description: variables.isActive 
          ? "Your product is now visible to buyers" 
          : "Your product is hidden from buyers"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/products"] });
    },
    onError: (error: Error) => {
      toast({ title: "Status update failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/seller/products/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Product deleted", description: "Product has been deleted successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/products"] });
    },
    onError: (error: Error) => {
      toast({ title: "Deletion failed", description: error.message, variant: "destructive" });
    },
  });

  const createVariantMutation = useMutation({
    mutationFn: async (data: VariantForm & { productId: string }) => {
      return await apiRequest("POST", "/api/seller/product-variants", data);
    },
    onSuccess: () => {
      toast({ title: "Variant created", description: "Product variant has been created successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/products"] });
      setShowVariantDialog(false);
      setSelectedProduct(null);
      setIsEditingVariant(false);
      setSelectedVariant(null);
      variantForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Creation failed", description: error.message, variant: "destructive" });
    },
  });

  const updateVariantMutation = useMutation({
    mutationFn: async (data: VariantForm & { variantId: string }) => {
      const { variantId, ...variantData } = data;
      return await apiRequest("PUT", `/api/seller/product-variants/${variantId}`, variantData);
    },
    onSuccess: async () => {
      toast({ title: "Variant updated", description: "Product variant has been updated successfully." });
      
      // Refetch queries and wait for completion
      await queryClient.refetchQueries({ queryKey: ["/api/seller/products"] });
      
      // Update selectedProduct with fresh data
      if (selectedProduct) {
        const updatedProducts = queryClient.getQueryData<Product[]>(["/api/seller/products"]);
        const updatedProduct = updatedProducts?.find(p => p.id === selectedProduct.id);
        if (updatedProduct) {
          setSelectedProduct(updatedProduct);
        }
      }
      
      setShowVariantDialog(false);
      setIsEditingVariant(false);
      setSelectedVariant(null);
      variantForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteVariantMutation = useMutation({
    mutationFn: async (variantId: string) => {
      return await apiRequest("DELETE", `/api/seller/product-variants/${variantId}`);
    },
    onSuccess: async () => {
      toast({ title: "Variant deleted", description: "Product variant has been deleted successfully." });
      
      // Refetch queries and wait for completion
      await queryClient.refetchQueries({ queryKey: ["/api/seller/products"] });
      
      // Update selectedProduct with fresh data
      if (selectedProduct) {
        const updatedProducts = queryClient.getQueryData<Product[]>(["/api/seller/products"]);
        const updatedProduct = updatedProducts?.find(p => p.id === selectedProduct.id);
        if (updatedProduct) {
          setSelectedProduct(updatedProduct);
        }
      }
      
      setVariantToDelete(null);
    },
    onError: (error: Error) => {
      toast({ title: "Deletion failed", description: error.message, variant: "destructive" });
    },
  });

  const handleProductSubmit = (data: ProductForm) => {
    if (data.images.length === 0) {
      toast({
        title: "Missing images",
        description: "Please upload at least one product image",
        variant: "destructive",
      });
      return;
    }

    const submitData = {
      name: data.name,
      description: data.description,
      category: data.category,
      price: data.price,
      stock: data.stock,
      images: data.images,
      isActive: data.isActive,
      requiresQuote: data.requiresQuote,
      requiresDesignApproval: data.requiresDesignApproval,
      // Include optional shipping dimensions for default variant
      weight: data.weight || undefined,
      length: data.length || undefined,
      width: data.width || undefined,
      height: data.height || undefined,
    };
    
    if (selectedProduct) {
      updateProductMutation.mutate({ id: selectedProduct.id, data: submitData });
    } else {
      createProductMutation.mutate(submitData);
    }
  };

  const handleVariantSubmit = (data: VariantForm) => {
    if (isEditingVariant && selectedVariant) {
      updateVariantMutation.mutate({ 
        ...data, 
        variantId: selectedVariant.id,
        price: data.price,
        inventory: data.inventory,
      });
    } else if (selectedProduct) {
      createVariantMutation.mutate({ 
        ...data, 
        productId: selectedProduct.id,
        price: data.price,
        inventory: data.inventory,
      });
    }
  };

  const openVariantDialog = (product: Product, variant?: ProductVariant) => {
    setSelectedProduct(product);
    if (variant) {
      setIsEditingVariant(true);
      setSelectedVariant(variant);
      variantForm.reset({
        name: variant.name,
        sku: variant.sku || "",
        price: variant.price?.toString() || "",
        inventory: variant.inventory?.toString() || "0",
        imageUrls: variant.imageUrls || [],
        weight: variant.weight?.toString() || "",
        length: variant.length?.toString() || "",
        width: variant.width?.toString() || "",
        height: variant.height?.toString() || "",
      });
    } else {
      setIsEditingVariant(false);
      setSelectedVariant(null);
      variantForm.reset({
        name: "",
        sku: "",
        price: "",
        inventory: "",
        imageUrls: [],
        weight: "",
        length: "",
        width: "",
        height: "",
      });
    }
    setShowVariantDialog(true);
  };

  const handleDeleteVariant = (variant: ProductVariant) => {
    setVariantToDelete(variant);
  };

  const confirmDeleteVariant = () => {
    if (variantToDelete) {
      deleteVariantMutation.mutate(variantToDelete.id);
    }
  };

  const openProductDialog = (product?: Product) => {
    if (product) {
      setSelectedProduct(product);
      productForm.reset({
        name: product.name,
        description: product.description,
        category: product.category || "",
        price: product.price || "",
        stock: product.stock?.toString() || "",
        images: product.images || [],
        isActive: product.isActive,
        requiresQuote: product.requiresQuote || false,
        requiresDesignApproval: product.requiresDesignApproval || false,
        // Weight/dimensions belong to variants - edit via variant form
        weight: "",
        length: "",
        width: "",
        height: "",
      });
    } else {
      setSelectedProduct(null);
      productForm.reset({
        name: "",
        description: "",
        category: "",
        price: "",
        stock: "",
        images: [],
        isActive: true,
        requiresQuote: false,
        requiresDesignApproval: false,
        weight: "",
        length: "",
        width: "",
        height: "",
      });
    }
    setShowProductDialog(true);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold font-display">Products</h1>
          <p className="text-muted-foreground mt-2">Manage your product listings</p>
        </div>
        <Button onClick={() => openProductDialog()} data-testid="button-create-product">
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-products"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="p-0">
                <Skeleton className="h-48 w-full rounded-t-md" />
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No products found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "Try a different search term" : "Create your first product to get started"}
            </p>
            {!searchQuery && (
              <Button onClick={() => openProductDialog()} data-testid="button-create-first-product">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Product
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="overflow-hidden">
              <CardHeader className="p-0">
                {product.images && product.images.length > 0 ? (
                  <img
                    src={product.images[0]}
                    alt={product.name}
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
                  <h3 className="font-semibold text-lg" data-testid={`text-product-name-${product.id}`}>
                    {product.name}
                  </h3>
                  <Badge variant={product.isActive ? "default" : "secondary"} data-testid={`badge-status-${product.id}`}>
                    {product.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" data-testid={`badge-category-${product.id}`}>{product.category}</Badge>
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0 flex flex-col gap-2">
                <div className="flex gap-2 w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/product/${product.id}`, '_blank')}
                    className="flex-1"
                    data-testid={`button-preview-${product.id}`}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openVariantDialog(product)}
                    className="flex-1"
                    data-testid={`button-add-variant-${product.id}`}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Variant
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedProduct(product);
                      setShowVariantsListDialog(true);
                    }}
                    className="flex-1"
                    data-testid={`button-manage-variants-${product.id}`}
                  >
                    <Package className="h-4 w-4 mr-1" />
                    Manage
                  </Button>
                </div>
                <div className="flex gap-2 w-full">
                  <Button
                    variant={product.isActive ? "outline" : "default"}
                    size="sm"
                    onClick={() => toggleProductStatusMutation.mutate({ 
                      id: product.id, 
                      isActive: !product.isActive 
                    })}
                    className="flex-1"
                    data-testid={`button-toggle-status-${product.id}`}
                  >
                    <Power className="h-4 w-4 mr-1" />
                    {product.isActive ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openProductDialog(product)}
                    data-testid={`button-edit-${product.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this product?")) {
                        deleteProductMutation.mutate(product.id);
                      }
                    }}
                    data-testid={`button-delete-${product.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedProduct ? "Edit Product" : "Create New Product"}</DialogTitle>
          </DialogHeader>
          <Form {...productForm}>
            <form onSubmit={productForm.handleSubmit(handleProductSubmit)} className="space-y-4">
              <FormField
                control={productForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Business Cards" {...field} data-testid="input-product-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={productForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your product..."
                        {...field}
                        rows={4}
                        data-testid="input-product-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={productForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="printing">Printing</SelectItem>
                        <SelectItem value="promotional">Promotional Items</SelectItem>
                        <SelectItem value="packaging">Packaging</SelectItem>
                        <SelectItem value="signage">Signage</SelectItem>
                        <SelectItem value="apparel">Apparel</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-4 border-t pt-4">
                <div>
                  <h4 className="text-sm font-semibold">Pricing & Inventory</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    These fields are required for all products. If you plan to add variants (sizes, colors, materials, etc.), 
                    you can enter a placeholder price here and then manage specific pricing per variant after creating the product.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={productForm.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Price (USD)</FormLabel>
                        <FormControl>
                          <Input placeholder="29.99" {...field} data-testid="input-product-price" />
                        </FormControl>
                        <FormDescription>Add variants later for different pricing options</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={productForm.control}
                    name="stock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Stock Quantity</FormLabel>
                        <FormControl>
                          <Input placeholder="10" {...field} data-testid="input-product-stock" />
                        </FormControl>
                        <FormDescription>Manage stock per variant after creation</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <FormField
                control={productForm.control}
                name="images"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Images</FormLabel>
                    <FormControl>
                      <MultiImageUploader
                        maxImages={10}
                        maxFileSize={5242880}
                        onImagesChange={(urls) => field.onChange(urls)}
                        initialImages={field.value}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-4 border-t pt-4">
                <h4 className="text-sm font-semibold">Default Variant Shipping Dimensions (Optional)</h4>
                <p className="text-xs text-muted-foreground">
                  These dimensions apply to the default product variant. You can add more variants with different dimensions later.
                  Leave blank to use default (1 KG per item).
                </p>
                
                <FormField
                  control={productForm.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight (KG)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 1.5" {...field} data-testid="input-product-weight" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-3 gap-2">
                  <FormField
                    control={productForm.control}
                    name="length"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Length (CM)</FormLabel>
                        <FormControl>
                          <Input placeholder="30" {...field} data-testid="input-product-length" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={productForm.control}
                    name="width"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Width (CM)</FormLabel>
                        <FormControl>
                          <Input placeholder="20" {...field} data-testid="input-product-width" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={productForm.control}
                    name="height"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Height (CM)</FormLabel>
                        <FormControl>
                          <Input placeholder="10" {...field} data-testid="input-product-height" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <h4 className="text-sm font-semibold">Purchase Requirements</h4>
                <p className="text-xs text-muted-foreground">
                  Configure special requirements for buyers before they can purchase this product.
                </p>
                
                <FormField
                  control={productForm.control}
                  name="requiresQuote"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-requires-quote"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Requires Custom Quote</FormLabel>
                        <FormDescription>
                          Buyers must request and accept a custom quote before they can purchase. Useful for bulk orders or custom pricing.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={productForm.control}
                  name="requiresDesignApproval"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-requires-design-approval"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Requires Design Approval</FormLabel>
                        <FormDescription>
                          Buyers must upload design files and receive your approval before they can purchase. Essential for custom print products.
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
                  onClick={() => setShowProductDialog(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createProductMutation.isPending || updateProductMutation.isPending}
                  data-testid="button-submit-product"
                >
                  {selectedProduct ? "Update Product" : "Create Product"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={showVariantDialog} onOpenChange={setShowVariantDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Product Variant</DialogTitle>
          </DialogHeader>
          <Form {...variantForm}>
            <form onSubmit={variantForm.handleSubmit(handleVariantSubmit)} className="space-y-4">
              <FormField
                control={variantForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Variant Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Large - Glossy" {...field} data-testid="input-variant-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={variantForm.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., BC-LG-GL" {...field} data-testid="input-variant-sku" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={variantForm.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (USD)</FormLabel>
                    <FormControl>
                      <Input placeholder="29.99" {...field} data-testid="input-variant-price" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={variantForm.control}
                name="inventory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inventory Quantity</FormLabel>
                    <FormControl>
                      <Input placeholder="100" {...field} data-testid="input-variant-inventory" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-4 border-t pt-4">
                <h4 className="text-sm font-semibold">Variant Images (Optional)</h4>
                <p className="text-xs text-muted-foreground">
                  Upload images specific to this variant to help buyers visualize the exact option they're selecting. 
                  Variant images significantly improve buyer confidence and conversion rates. 
                  If no images are uploaded, the product's main images will be displayed.
                </p>
                <FormField
                  control={variantForm.control}
                  name="imageUrls"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <MultiImageUploader
                          initialImages={field.value || []}
                          onImagesChange={field.onChange}
                          maxImages={10}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="space-y-4 border-t pt-4">
                <h4 className="text-sm font-semibold">Shipping Dimensions (Optional)</h4>
                <p className="text-xs text-muted-foreground">
                  Provide weight and dimensions for accurate shipping cost calculation. 
                  Leave blank to use default (1 KG per item).
                </p>
                
                <FormField
                  control={variantForm.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight (KG)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 1.5" {...field} data-testid="input-variant-weight" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-3 gap-2">
                  <FormField
                    control={variantForm.control}
                    name="length"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Length (CM)</FormLabel>
                        <FormControl>
                          <Input placeholder="30" {...field} data-testid="input-variant-length" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={variantForm.control}
                    name="width"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Width (CM)</FormLabel>
                        <FormControl>
                          <Input placeholder="20" {...field} data-testid="input-variant-width" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={variantForm.control}
                    name="height"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Height (CM)</FormLabel>
                        <FormControl>
                          <Input placeholder="10" {...field} data-testid="input-variant-height" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowVariantDialog(false)}
                  data-testid="button-cancel-variant"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createVariantMutation.isPending || updateVariantMutation.isPending}
                  data-testid="button-submit-variant"
                >
                  {isEditingVariant ? "Update Variant" : "Add Variant"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={showVariantsListDialog} onOpenChange={setShowVariantsListDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Variants - {selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {selectedProduct && 'variants' in selectedProduct && (selectedProduct as any).variants && (selectedProduct as any).variants.length > 0 ? (
              (selectedProduct as any).variants.map((variant: ProductVariant) => (
                <Card key={variant.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold" data-testid={`text-variant-name-${variant.id}`}>{variant.name}</h4>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span data-testid={`text-variant-sku-${variant.id}`}>SKU: {variant.sku || "N/A"}</span>
                          <span data-testid={`text-variant-price-${variant.id}`}>Price: ${variant.price}</span>
                          <span data-testid={`text-variant-inventory-${variant.id}`}>Stock: {variant.inventory}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowVariantsListDialog(false);
                            openVariantDialog(selectedProduct, variant);
                          }}
                          data-testid={`button-edit-variant-${variant.id}`}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteVariant(variant)}
                          data-testid={`button-delete-variant-${variant.id}`}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2" />
                <p>No variants yet. Click "Add Variant" to create one.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!variantToDelete} onOpenChange={(open) => !open && setVariantToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete the variant "{variantToDelete?.name}"? This action cannot be undone.</p>
          <div className="flex gap-2 justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setVariantToDelete(null)}
              data-testid="button-cancel-delete-variant"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteVariant}
              disabled={deleteVariantMutation.isPending}
              data-testid="button-confirm-delete-variant"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
