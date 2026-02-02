import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Building2, MapPin, Award, Wrench, Clock, Plus, Trash2, Edit, 
  Image as ImageIcon, Save, ExternalLink, Upload
} from "lucide-react";
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
  images: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

export default function ProfileManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<SellerProject | null>(null);
  const [newExpertise, setNewExpertise] = useState("");
  const [expertiseList, setExpertiseList] = useState<string[]>([]);

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

  useState(() => {
    if (user?.expertise) {
      setExpertiseList(user.expertise);
    }
  });

  const projectForm = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      title: "",
      description: "",
      year: new Date().getFullYear(),
      images: "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      const payload = {
        ...data,
        expertise: expertiseList,
        yearsExperience: data.yearsExperience || null,
      };
      return apiRequest("/api/seller/profile", {
        method: "PUT",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });
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
    mutationFn: async (data: ProjectFormValues) => {
      const payload = {
        ...data,
        images: data.images ? data.images.split(",").map(s => s.trim()).filter(Boolean) : [],
      };
      return apiRequest("/api/seller/projects", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      toast({ title: "Project added successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/projects"] });
      setIsProjectDialogOpen(false);
      projectForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "Failed to add project", description: error.message, variant: "destructive" });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProjectFormValues }) => {
      const payload = {
        ...data,
        images: data.images ? data.images.split(",").map(s => s.trim()).filter(Boolean) : [],
      };
      return apiRequest(`/api/seller/projects/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });
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
      return apiRequest(`/api/seller/projects/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast({ title: "Project deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/projects"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete project", description: error.message, variant: "destructive" });
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
      images: project.images?.join(", ") || "",
    });
    setIsProjectDialogOpen(true);
  };

  const handleProjectSubmit = (data: ProjectFormValues) => {
    if (editingProject) {
      updateProjectMutation.mutate({ id: editingProject.id, data });
    } else {
      createProjectMutation.mutate(data);
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

                        <FormField
                          control={projectForm.control}
                          name="images"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Image URLs (comma-separated)</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
                                  {...field}
                                  data-testid="input-project-images"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

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
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Gallery
              </CardTitle>
              <CardDescription>
                Upload images of your facilities, team, and work
              </CardDescription>
            </CardHeader>
            <CardContent>
              {galleryLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading gallery...</div>
              ) : gallery.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No gallery images yet. Gallery images can be added via the API.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {gallery.map((img) => (
                    <div key={img.id} className="aspect-square rounded-lg overflow-hidden bg-muted relative group">
                      <img src={img.imageUrl} alt={img.caption || "Gallery"} className="w-full h-full object-cover" />
                      {img.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
