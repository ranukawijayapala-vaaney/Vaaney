import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertHomepageBannerSchema, type HomepageBanner, type BannerType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Image as ImageIcon, ArrowUp, ArrowDown, Upload, X, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";

const formSchema = insertHomepageBannerSchema.extend({
  imageUrl: z.string().min(1, "Image is required"),
});

export default function Banners() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<HomepageBanner | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"all" | BannerType>("all");
  const [currentObjectPath, setCurrentObjectPath] = useState<string>("");

  const { data: banners = [], isLoading } = useQuery<HomepageBanner[]>({
    queryKey: ["/api/admin/homepage-banners"],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      imageUrl: "",
      type: "hero",
      title: "",
      subtitle: "",
      description: "",
      ctaText: "",
      ctaLink: "",
      isActive: true,
      displayOrder: 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      return await apiRequest("POST", "/api/admin/homepage-banners", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/homepage-banners"] });
      toast({ title: "Banner created successfully!" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create banner", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<z.infer<typeof formSchema>> }) => {
      return await apiRequest("PUT", `/api/admin/homepage-banners/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/homepage-banners"] });
      toast({ title: "Banner updated successfully!" });
      setIsDialogOpen(false);
      setEditingBanner(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update banner", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/homepage-banners/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/homepage-banners"] });
      toast({ title: "Banner deleted successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete banner", description: error.message, variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return await apiRequest("PUT", `/api/admin/homepage-banners/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/homepage-banners"] });
      toast({ title: "Banner status updated!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update status", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (data: z.infer<typeof formSchema>) => {
    if (editingBanner) {
      updateMutation.mutate({ id: editingBanner.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (banner: HomepageBanner) => {
    setEditingBanner(banner);
    setUploadedImageUrl(banner.imageUrl);
    form.reset({
      imageUrl: banner.imageUrl,
      type: banner.type,
      title: banner.title ?? "",
      subtitle: banner.subtitle ?? "",
      description: banner.description ?? "",
      ctaText: banner.ctaText ?? "",
      ctaLink: banner.ctaLink ?? "",
      isActive: banner.isActive,
      displayOrder: banner.displayOrder,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this banner?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggleActive = (id: string, isActive: boolean) => {
    toggleActiveMutation.mutate({ id, isActive: !isActive });
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingBanner(null);
      setUploadedImageUrl("");
      setCurrentObjectPath("");
      form.reset();
    }
  };

  const getUploadUrl = async () => {
    const response = await fetch("/api/object-storage/upload-url", {
      method: "GET",
      credentials: "include",
    });
    const data = await response.json();
    
    // Store the objectPath for later use in finalize
    setCurrentObjectPath(data.objectPath);
    
    return {
      method: "PUT" as const,
      url: data.uploadUrl,
    };
  };

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      try {
        // Use the stored objectPath, not the uploadURL
        const response: any = await apiRequest("POST", "/api/object-storage/finalize-banner-upload", {
          objectPath: currentObjectPath,
        });
        
        setUploadedImageUrl(response.objectPath);
        form.setValue("imageUrl", response.objectPath);
        toast({
          title: "Image uploaded",
          description: "Banner image has been uploaded successfully.",
        });
      } catch (error) {
        console.error("Error saving image:", error);
        toast({
          title: "Upload failed",
          description: "Failed to save banner image.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/admin/dashboard")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold">Homepage Banners</h1>
          </div>
          <p className="text-muted-foreground mt-1 ml-12">Manage carousel banners on the homepage</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-banner">
              <Plus className="h-4 w-4 mr-2" />
              Create Banner
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingBanner ? "Edit Banner" : "Create New Banner"}</DialogTitle>
              <DialogDescription>
                {editingBanner ? "Update banner details" : "Add a new banner to the homepage carousel"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Banner Image</FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          <ObjectUploader
                            onGetUploadParameters={getUploadUrl}
                            onComplete={handleUploadComplete}
                            maxFileSize={10485760}
                            variant="outline"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            {uploadedImageUrl ? "Change Image" : "Upload Image"}
                          </ObjectUploader>
                          {uploadedImageUrl && (
                            <div className="mt-3 relative">
                              <img 
                                src={uploadedImageUrl} 
                                alt="Banner preview" 
                                className="w-full h-40 object-cover rounded border"
                                data-testid="img-banner-preview"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2"
                                onClick={() => {
                                  setUploadedImageUrl("");
                                  form.setValue("imageUrl", "");
                                }}
                                data-testid="button-remove-image"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                          <Input {...field} type="hidden" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Banner Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="hero">Hero</SelectItem>
                          <SelectItem value="promotion">Promotion</SelectItem>
                          <SelectItem value="news">News</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Banner title" data-testid="input-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subtitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subtitle (Optional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value ?? ""} placeholder="Banner subtitle" data-testid="input-subtitle" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value ?? ""} placeholder="Additional description" data-testid="input-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="ctaText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Button Text (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} placeholder="Shop Now" data-testid="input-cta-text" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ctaLink"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Button Link (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} placeholder="/products" data-testid="input-cta-link" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="displayOrder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Order</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            data-testid="input-display-order"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0 pt-8">
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-is-active" />
                        </FormControl>
                        <FormLabel className="!mt-0">Active</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-submit-banner"
                  >
                    {editingBanner ? "Update Banner" : "Create Banner"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all">All Banners</TabsTrigger>
          <TabsTrigger value="hero" data-testid="tab-hero">Hero</TabsTrigger>
          <TabsTrigger value="promotion" data-testid="tab-promotion">Promotions</TabsTrigger>
          <TabsTrigger value="news" data-testid="tab-news">News</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {activeTab === "all" ? "All Banners" : `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Banners`}
              </CardTitle>
              <CardDescription>
                {activeTab === "all" ? "All homepage banners (active and inactive)" : `Banners for ${activeTab} section`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading banners...</div>
              ) : (() => {
                const filteredBanners = activeTab === "all" ? banners : banners.filter(b => b.type === activeTab);
                return filteredBanners.length === 0 ? (
                  <div className="text-center py-8">
                    <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No banners yet. Create your first banner!</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">Order</TableHead>
                          <TableHead>Preview</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>CTA</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBanners.map((banner) => {
                          return (
                            <TableRow key={banner.id} data-testid={`row-banner-${banner.id}`}>
                              <TableCell>
                                <span className="font-mono text-sm" data-testid={`text-order-${banner.id}`}>
                                  {banner.displayOrder}
                                </span>
                              </TableCell>
                              <TableCell>
                                <img
                                  src={banner.imageUrl}
                                  alt={banner.title || "Banner"}
                                  className="w-32 h-20 object-cover rounded"
                                  data-testid={`img-preview-${banner.id}`}
                                />
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" data-testid={`badge-type-${banner.id}`}>
                                  {banner.type.charAt(0).toUpperCase() + banner.type.slice(1)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium" data-testid={`text-title-${banner.id}`}>
                                    {banner.title || "No title"}
                                  </div>
                                  {banner.subtitle && (
                                    <div className="text-sm text-muted-foreground line-clamp-1">{banner.subtitle}</div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {banner.ctaText ? (
                                  <div className="text-sm">
                                    <div className="font-medium">{banner.ctaText}</div>
                                    {banner.ctaLink && <div className="text-muted-foreground text-xs">{banner.ctaLink}</div>}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">No CTA</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={banner.isActive}
                                    onCheckedChange={() => handleToggleActive(banner.id, banner.isActive)}
                                    data-testid={`switch-active-${banner.id}`}
                                  />
                                  <Badge variant={banner.isActive ? "default" : "secondary"} data-testid={`badge-status-${banner.id}`}>
                                    {banner.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(banner)}
                                    data-testid={`button-edit-${banner.id}`}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(banner.id)}
                                    disabled={deleteMutation.isPending}
                                    data-testid={`button-delete-${banner.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
