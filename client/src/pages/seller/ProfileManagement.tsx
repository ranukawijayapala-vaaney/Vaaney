import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Building2, MapPin, Award, Wrench, Clock, Plus, Trash2, Edit, 
  Image as ImageIcon, Save, ExternalLink, Upload, Loader2
} from "lucide-react";
import { ImageUploader } from "@/components/ImageUploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Link } from "wouter";
import type { User, SellerProject, SellerGalleryImage } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

function GalleryImageUploader({ 
  onUploadComplete, 
  isLoading,
  resetTrigger
}: { 
  onUploadComplete: (imageUrl: string) => void; 
  isLoading: boolean;
  resetTrigger?: number;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    setUploadedUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [resetTrigger]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file", variant: "destructive" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 10MB", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const result = await apiRequest(
        "POST",
        "/api/object-storage/upload-url",
        { fileName: file.name, contentType: file.type }
      ) as { uploadUrl: string; objectPath: string };

      const uploadResponse = await fetch(result.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadResponse.ok) throw new Error("Upload failed");

      await apiRequest("POST", "/api/object-storage/finalize-upload", {
        objectPath: result.objectPath,
        visibility: "public",
      });

      const normalizedPath = result.objectPath.startsWith("/")
        ? `/objects${result.objectPath.split(".private")[1] || result.objectPath}`
        : result.objectPath;
      
      setUploadedUrl(normalizedPath);
      onUploadComplete(normalizedPath);
    } catch (error) {
      toast({ 
        title: "Upload failed", 
        description: error instanceof Error ? error.message : "An error occurred", 
        variant: "destructive" 
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      {uploadedUrl ? (
        <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
          <img src={uploadedUrl} alt="Uploaded" className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="text-white text-sm">Image uploaded successfully</span>
          </div>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover-elevate bg-muted/50">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {isUploading ? (
              <>
                <Loader2 className="w-8 h-8 mb-2 text-muted-foreground animate-spin" />
                <p className="text-sm text-muted-foreground">Uploading...</p>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Click to upload an image</p>
              </>
            )}
          </div>
          <input 
            ref={fileInputRef}
            type="file" 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileSelect}
            disabled={isUploading || isLoading}
            data-testid="input-gallery-upload"
          />
        </label>
      )}
    </div>
  );
}

const profileFormSchema = z.object({
  shopName: z.string().min(1, "Shop name is required").max(255),
  location: z.string().max(255).optional(),
  expertise: z.string().optional(),
  aboutUs: z.string().optional(),
  yearsExperience: z.coerce.number().min(0).max(100).optional(),
  facilities: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const projectFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  year: z.coerce.number().min(1900).max(new Date().getFullYear()).optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

export default function ProfileManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [isGalleryDialogOpen, setIsGalleryDialogOpen] = useState(false);
  const [galleryResetTrigger, setGalleryResetTrigger] = useState(0);
  const [editingProject, setEditingProject] = useState<SellerProject | null>(null);
  const [newExpertise, setNewExpertise] = useState("");
  const [expertiseList, setExpertiseList] = useState<string[]>([]);
  const [projectImages, setProjectImages] = useState<string[]>([]);
  const [galleryCaption, setGalleryCaption] = useState("");
  const [shopLogo, setShopLogo] = useState<string | null>(null);
  const [shopBackgroundImage, setShopBackgroundImage] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);

  const { data: projects = [], isLoading: projectsLoading } = useQuery<SellerProject[]>({
    queryKey: ["/api/seller/projects"],
  });

  const { data: gallery = [], isLoading: galleryLoading } = useQuery<SellerGalleryImage[]>({
    queryKey: ["/api/seller/gallery"],
  });

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      shopName: user?.shopName || "",
      location: user?.location || "",
      expertise: "",
      aboutUs: user?.aboutUs || "",
      yearsExperience: user?.yearsExperience || undefined,
      facilities: user?.facilities || "",
    },
  });

  useEffect(() => {
    if (user?.expertise) {
      setExpertiseList(user.expertise);
    }
    if (user?.shopLogo) {
      setShopLogo(user.shopLogo);
    }
    if (user?.shopBackgroundImage) {
      setShopBackgroundImage(user.shopBackgroundImage);
    }
  }, [user]);

  const projectForm = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      title: "",
      description: "",
      year: new Date().getFullYear(),
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      const payload = {
        ...data,
        expertise: expertiseList,
        yearsExperience: data.yearsExperience || null,
        shopLogo,
        shopBackgroundImage,
      };
      return apiRequest("PUT", "/api/seller/profile", payload);
    },
    onSuccess: () => {
      toast({ title: "Profile updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update profile", description: error.message, variant: "destructive" });
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: { title: string; description?: string; year?: number; images: string[] }) => {
      return apiRequest("POST", "/api/seller/projects", data);
    },
    onSuccess: () => {
      toast({ title: "Project added successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/projects"] });
      setIsProjectDialogOpen(false);
      setProjectImages([]);
      projectForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "Failed to add project", description: error.message, variant: "destructive" });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { title: string; description?: string; year?: number; images: string[] } }) => {
      return apiRequest("PUT", `/api/seller/projects/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Project updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/projects"] });
      setIsProjectDialogOpen(false);
      setEditingProject(null);
      projectForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "Failed to update project", description: error.message, variant: "destructive" });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/seller/projects/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Project deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/projects"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete project", description: error.message, variant: "destructive" });
    },
  });

  const addGalleryImageMutation = useMutation({
    mutationFn: async (data: { imageUrl: string; caption?: string }) => {
      return apiRequest("POST", "/api/seller/gallery", data);
    },
    onSuccess: () => {
      toast({ title: "Image added to gallery" });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/gallery"] });
      setGalleryCaption("");
      setIsGalleryDialogOpen(false);
      setGalleryResetTrigger(prev => prev + 1);
    },
    onError: (error: any) => {
      toast({ title: "Failed to add image", description: error.message, variant: "destructive" });
    },
  });

  const deleteGalleryImageMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/seller/gallery/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Image removed from gallery" });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/gallery"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to remove image", description: error.message, variant: "destructive" });
    },
  });

  const handleAddExpertise = () => {
    if (newExpertise.trim() && !expertiseList.includes(newExpertise.trim())) {
      setExpertiseList([...expertiseList, newExpertise.trim()]);
      setNewExpertise("");
    }
  };

  const handleRemoveExpertise = (exp: string) => {
    setExpertiseList(expertiseList.filter(e => e !== exp));
  };

  const handleEditProject = (project: SellerProject) => {
    setEditingProject(project);
    projectForm.reset({
      title: project.title,
      description: project.description || "",
      year: project.year || new Date().getFullYear(),
    });
    setProjectImages(project.images || []);
    setIsProjectDialogOpen(true);
  };

  const handleProjectSubmit = (data: ProjectFormValues) => {
    const payload = {
      title: data.title,
      description: data.description,
      year: data.year,
      images: projectImages,
    };
    if (editingProject) {
      updateProjectMutation.mutate({ id: editingProject.id, data: payload });
    } else {
      createProjectMutation.mutate(payload);
    }
  };

  const handleImageUpload = async (
    file: File,
    setUploading: (val: boolean) => void,
    setUrl: (url: string | null) => void
  ) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 10MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const result = await apiRequest(
        "POST",
        "/api/object-storage/upload-url",
        { fileName: file.name, contentType: file.type }
      ) as { uploadUrl: string; objectPath: string };

      const uploadResponse = await fetch(result.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadResponse.ok) throw new Error("Upload failed");

      await apiRequest("POST", "/api/object-storage/finalize-upload", {
        objectPath: result.objectPath,
        visibility: "public",
      });

      const normalizedPath = result.objectPath.startsWith("/")
        ? `/objects${result.objectPath.split(".private")[1] || result.objectPath}`
        : result.objectPath;
      
      setUrl(normalizedPath);
      toast({ title: "Image uploaded successfully" });
    } catch (error) {
      toast({ 
        title: "Upload failed", 
        description: error instanceof Error ? error.message : "An error occurred", 
        variant: "destructive" 
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Profile Management</h1>
          <p className="text-muted-foreground">Manage your public seller profile</p>
        </div>
        {user?.id && (
          <Link href={`/seller/${user.id}`}>
            <Button variant="outline" data-testid="button-preview-profile">
              <ExternalLink className="w-4 h-4 mr-2" />
              Preview Public Profile
            </Button>
          </Link>
        )}
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" data-testid="tab-profile">Profile Details</TabsTrigger>
          <TabsTrigger value="projects" data-testid="tab-projects">Past Projects ({projects.length})</TabsTrigger>
          <TabsTrigger value="gallery" data-testid="tab-gallery">Gallery ({gallery.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Shop Information
              </CardTitle>
              <CardDescription>
                This information will be displayed on your public profile page
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-6">
                  {/* Branding Section */}
                  <div className="space-y-4">
                    <Label className="text-base font-medium">Shop Branding</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Logo Upload */}
                      <div className="space-y-2">
                        <Label>Shop Logo</Label>
                        <p className="text-sm text-muted-foreground">
                          A square logo works best (recommended: 200x200px)
                        </p>
                        <div className="relative">
                          {shopLogo ? (
                            <div className="relative w-32 h-32 rounded-lg border overflow-hidden bg-muted">
                              <img src={shopLogo} alt="Shop logo" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setShopLogo(null)}
                                className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground"
                                data-testid="button-remove-logo"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed rounded-lg cursor-pointer hover-elevate bg-muted/50">
                              <div className="flex flex-col items-center justify-center p-2">
                                {isUploadingLogo ? (
                                  <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                                ) : (
                                  <>
                                    <ImageIcon className="w-6 h-6 mb-1 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground text-center">Upload Logo</span>
                                  </>
                                )}
                              </div>
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                disabled={isUploadingLogo}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleImageUpload(file, setIsUploadingLogo, setShopLogo);
                                }}
                                data-testid="input-upload-logo"
                              />
                            </label>
                          )}
                        </div>
                      </div>

                      {/* Background Image Upload */}
                      <div className="space-y-2">
                        <Label>Header Background Image</Label>
                        <p className="text-sm text-muted-foreground">
                          Wide image for your profile header (recommended: 1200x400px)
                        </p>
                        <div className="relative">
                          {shopBackgroundImage ? (
                            <div className="relative w-full h-24 rounded-lg border overflow-hidden bg-muted">
                              <img src={shopBackgroundImage} alt="Background" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setShopBackgroundImage(null)}
                                className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground"
                                data-testid="button-remove-background"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover-elevate bg-muted/50">
                              <div className="flex flex-col items-center justify-center p-2">
                                {isUploadingBackground ? (
                                  <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                                ) : (
                                  <>
                                    <ImageIcon className="w-6 h-6 mb-1 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground text-center">Upload Background</span>
                                  </>
                                )}
                              </div>
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                disabled={isUploadingBackground}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleImageUpload(file, setIsUploadingBackground, setShopBackgroundImage);
                                }}
                                data-testid="input-upload-background"
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={profileForm.control}
                      name="shopName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Shop Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your shop name" {...field} data-testid="input-shop-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Colombo, Sri Lanka" {...field} data-testid="input-location" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="yearsExperience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Years of Experience</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" max="100" placeholder="10" {...field} data-testid="input-years-experience" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div>
                    <Label>Expertise Areas</Label>
                    <div className="flex gap-2 mt-2 mb-2">
                      <Input
                        placeholder="Add expertise (e.g., Printing, Design)"
                        value={newExpertise}
                        onChange={(e) => setNewExpertise(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddExpertise();
                          }
                        }}
                        data-testid="input-add-expertise"
                      />
                      <Button type="button" onClick={handleAddExpertise} variant="outline" data-testid="button-add-expertise">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {expertiseList.map((exp, idx) => (
                        <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                          {exp}
                          <button
                            type="button"
                            onClick={() => handleRemoveExpertise(exp)}
                            className="ml-1 hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <FormField
                    control={profileForm.control}
                    name="aboutUs"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>About Us</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell buyers about your business, your story, and what makes you unique..."
                            className="min-h-32"
                            {...field}
                            data-testid="input-about-us"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="facilities"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Facilities & Equipment</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your facilities, equipment, and production capabilities..."
                            className="min-h-24"
                            {...field}
                            data-testid="input-facilities"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    disabled={updateProfileMutation.isPending}
                    data-testid="button-save-profile"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Past Projects
                  </CardTitle>
                  <CardDescription>
                    Showcase your major projects and achievements
                  </CardDescription>
                </div>
                <Dialog open={isProjectDialogOpen} onOpenChange={(open) => {
                  setIsProjectDialogOpen(open);
                  if (!open) {
                    setEditingProject(null);
                    projectForm.reset();
                    setProjectImages([]);
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-project">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Project
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingProject ? "Edit Project" : "Add New Project"}</DialogTitle>
                      <DialogDescription>
                        Share details about your past major projects
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...projectForm}>
                      <form onSubmit={projectForm.handleSubmit(handleProjectSubmit)} className="space-y-4">
                        <FormField
                          control={projectForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Project Title</FormLabel>
                              <FormControl>
                                <Input placeholder="Project name" {...field} data-testid="input-project-title" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={projectForm.control}
                          name="year"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Year</FormLabel>
                              <FormControl>
                                <Input type="number" min="1900" max={new Date().getFullYear()} {...field} data-testid="input-project-year" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={projectForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Describe the project..."
                                  className="min-h-24"
                                  {...field}
                                  data-testid="input-project-description"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="space-y-2">
                          <Label>Project Images</Label>
                          <ImageUploader
                            images={projectImages}
                            onImagesChange={setProjectImages}
                            maxImages={10}
                            disabled={createProjectMutation.isPending || updateProjectMutation.isPending}
                          />
                        </div>

                        <DialogFooter>
                          <Button 
                            type="submit" 
                            disabled={createProjectMutation.isPending || updateProjectMutation.isPending}
                            data-testid="button-submit-project"
                          >
                            {editingProject ? "Update Project" : "Add Project"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {projectsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading projects...</div>
              ) : projects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No projects added yet. Add your first project to showcase your work.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {projects.map((project) => (
                    <Card key={project.id} data-testid={`card-project-${project.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{project.title}</h3>
                              {project.year && (
                                <Badge variant="outline">{project.year}</Badge>
                              )}
                            </div>
                            {project.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                            )}
                            {project.images && project.images.length > 0 && (
                              <div className="flex gap-2 mt-2">
                                {project.images.slice(0, 3).map((img, idx) => (
                                  <div key={idx} className="w-16 h-16 rounded overflow-hidden bg-muted">
                                    <img src={img} alt="" className="w-full h-full object-cover" />
                                  </div>
                                ))}
                                {project.images.length > 3 && (
                                  <div className="w-16 h-16 rounded bg-muted flex items-center justify-center text-sm text-muted-foreground">
                                    +{project.images.length - 3}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleEditProject(project)}
                              data-testid={`button-edit-project-${project.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => deleteProjectMutation.mutate(project.id)}
                              disabled={deleteProjectMutation.isPending}
                              data-testid={`button-delete-project-${project.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gallery">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Gallery
                  </CardTitle>
                  <CardDescription>
                    Upload images of your facilities, team, and work
                  </CardDescription>
                </div>
                <Dialog open={isGalleryDialogOpen} onOpenChange={(open) => {
                  setIsGalleryDialogOpen(open);
                  if (!open) {
                    setGalleryCaption("");
                    setGalleryResetTrigger(prev => prev + 1);
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-gallery-image">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Image
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add Gallery Image</DialogTitle>
                      <DialogDescription>
                        Upload an image to your gallery
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <GalleryImageUploader
                        onUploadComplete={(imageUrl) => {
                          addGalleryImageMutation.mutate({ 
                            imageUrl, 
                            caption: galleryCaption || undefined 
                          });
                        }}
                        isLoading={addGalleryImageMutation.isPending}
                        resetTrigger={galleryResetTrigger}
                      />
                      <div className="space-y-2">
                        <Label htmlFor="gallery-caption">Caption (optional)</Label>
                        <Input
                          id="gallery-caption"
                          placeholder="Describe this image..."
                          value={galleryCaption}
                          onChange={(e) => setGalleryCaption(e.target.value)}
                          data-testid="input-gallery-caption"
                        />
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {galleryLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading gallery...</div>
              ) : gallery.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No gallery images yet. Click "Add Image" to upload your first image.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {gallery.map((img) => (
                    <div key={img.id} className="aspect-square rounded-lg overflow-visible bg-muted relative group" data-testid={`gallery-image-${img.id}`}>
                      <img src={img.imageUrl} alt={img.caption || "Gallery"} className="w-full h-full object-cover rounded-lg" />
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteGalleryImageMutation.mutate(img.id)}
                        disabled={deleteGalleryImageMutation.isPending}
                        data-testid={`button-delete-gallery-${img.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                      {img.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                          {img.caption}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
