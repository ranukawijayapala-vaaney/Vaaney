import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { User, KeyRound, Mail, Shield, Phone, MapPin, Building2, Edit, X, Plus, Trash2, Star, FileText, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { ShippingAddress } from "@shared/schema";
import { BankAccountManagement } from "@/components/admin/BankAccountManagement";
import { VerificationDocumentDialog, type DocumentData } from "@/components/VerificationDocumentDialog";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const sellerProfileSchema = z.object({
  contactNumber: z.string().min(1, "Contact number is required"),
  streetAddress: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  country: z.string().min(1, "Country is required"),
  bankName: z.string().min(1, "Bank name is required"),
  bankAccountNumber: z.string().min(1, "Account number is required"),
  bankAccountHolderName: z.string().min(1, "Account holder name is required"),
  bankSwiftCode: z.string().optional(),
});

const shippingAddressSchema = z.object({
  recipientName: z.string().min(1, "Recipient name is required"),
  contactNumber: z.string().min(1, "Contact number is required"),
  streetAddress: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  country: z.string().min(1, "Country is required"),
  isDefault: z.boolean().optional(),
});

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
type SellerProfileFormData = z.infer<typeof sellerProfileSchema>;
type ShippingAddressFormData = z.infer<typeof shippingAddressSchema>;

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  
  // Contact number state
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [contactNumber, setContactNumber] = useState(user?.userContactNumber || "");
  
  // Shipping address state
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<ShippingAddress | null>(null);
  const [deleteAddressId, setDeleteAddressId] = useState<string | null>(null);
  
  // Verification documents state
  const [documentPreviewOpen, setDocumentPreviewOpen] = useState(false);
  const [documents, setDocuments] = useState<DocumentData[]>([]);

  const passwordForm = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const profileForm = useForm<SellerProfileFormData>({
    resolver: zodResolver(sellerProfileSchema),
    defaultValues: {
      contactNumber: user?.contactNumber || "",
      streetAddress: user?.streetAddress || "",
      city: user?.city || "",
      postalCode: user?.postalCode || "",
      country: user?.country || "",
      bankName: user?.bankName || "",
      bankAccountNumber: user?.bankAccountNumber || "",
      bankAccountHolderName: user?.bankAccountHolderName || "",
      bankSwiftCode: user?.bankSwiftCode || "",
    },
  });

  const addressForm = useForm<ShippingAddressFormData>({
    resolver: zodResolver(shippingAddressSchema),
    defaultValues: {
      recipientName: "",
      contactNumber: "",
      streetAddress: "",
      city: "",
      postalCode: "",
      country: "",
      isDefault: false,
    },
  });

  // Fetch shipping addresses for buyers
  const { data: shippingAddresses, isLoading: isLoadingAddresses } = useQuery<ShippingAddress[]>({
    queryKey: ["/api/shipping-addresses"],
    enabled: user?.role === "buyer",
  });

  // Fetch verification documents for sellers
  const { data: verificationDocuments, isLoading: isLoadingDocuments } = useQuery<{ documents: DocumentData[] }>({
    queryKey: ["/api/my-verification-documents"],
    enabled: user?.role === "seller" && !!user?.verificationDocumentUrl,
    retry: false,
  });

  // Add shipping address mutation
  const addAddressMutation = useMutation({
    mutationFn: async (data: ShippingAddressFormData) => {
      return await apiRequest("POST", "/api/shipping-addresses", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipping-addresses"] });
      toast({ title: "Address added successfully!" });
      setIsAddressDialogOpen(false);
      addressForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add address",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update shipping address mutation
  const updateAddressMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ShippingAddressFormData }) => {
      return await apiRequest("PATCH", `/api/shipping-addresses/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipping-addresses"] });
      toast({ title: "Address updated successfully!" });
      setIsAddressDialogOpen(false);
      setEditingAddress(null);
      addressForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update address",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete shipping address mutation
  const deleteAddressMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/shipping-addresses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipping-addresses"] });
      toast({ title: "Address deleted successfully!" });
      setDeleteAddressId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete address",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Set default address mutation
  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/shipping-addresses/${id}/set-default`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipping-addresses"] });
      toast({ title: "Default address updated!" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to set default address",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update user contact number mutation
  const updateContactMutation = useMutation({
    mutationFn: async (userContactNumber: string) => {
      return await apiRequest("POST", "/api/update-user-contact", { userContactNumber });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Contact number updated successfully!" });
      setIsEditingContact(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update contact number",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveContact = () => {
    updateContactMutation.mutate(contactNumber);
  };

  const handleCancelContact = () => {
    setContactNumber(user?.userContactNumber || "");
    setIsEditingContact(false);
  };

  const onChangePassword = async (data: ChangePasswordFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to change password");
      }

      toast({ 
        title: "Password changed successfully!",
        description: "Your password has been updated"
      });
      
      passwordForm.reset();
    } catch (error: any) {
      toast({
        title: "Failed to change password",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onUpdateProfile = async (data: SellerProfileFormData) => {
    setIsUpdatingProfile(true);
    try {
      const response = await fetch("/api/update-seller-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update profile");
      }

      // Invalidate user cache to refetch updated data
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });

      toast({ 
        title: "Profile updated successfully!",
        description: "Your information has been updated"
      });
      
      setIsEditingProfile(false);
    } catch (error: any) {
      toast({
        title: "Failed to update profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Helper functions for shipping address management
  const handleOpenAddressDialog = (address?: ShippingAddress) => {
    if (address) {
      setEditingAddress(address);
      addressForm.reset({
        recipientName: address.recipientName,
        contactNumber: address.contactNumber,
        streetAddress: address.streetAddress,
        city: address.city,
        postalCode: address.postalCode,
        country: address.country,
        isDefault: address.isDefault,
      });
    } else {
      setEditingAddress(null);
      addressForm.reset({
        recipientName: "",
        contactNumber: "",
        streetAddress: "",
        city: "",
        postalCode: "",
        country: "",
        isDefault: false,
      });
    }
    setIsAddressDialogOpen(true);
  };

  const handleSaveAddress = (data: ShippingAddressFormData) => {
    if (editingAddress) {
      updateAddressMutation.mutate({ id: editingAddress.id, data });
    } else {
      addAddressMutation.mutate(data);
    }
  };

  const handleViewDocuments = () => {
    if (verificationDocuments?.documents) {
      setDocuments(verificationDocuments.documents);
      setDocumentPreviewOpen(true);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Profile Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your account information and security</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card data-testid="card-account-info">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Information
            </CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Name</span>
              </div>
              <p className="font-medium" data-testid="text-user-name">
                {user.firstName} {user.lastName}
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>Email</span>
              </div>
              <p className="font-medium" data-testid="text-user-email">{user.email}</p>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Role</span>
              </div>
              <div>
                <Badge variant={user.role === "admin" ? "destructive" : user.role === "seller" ? "secondary" : "default"} data-testid="badge-user-role">
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Verification Status</span>
              </div>
              <div>
                <Badge
                  variant={
                    user.verificationStatus === "approved"
                      ? "default"
                      : user.verificationStatus === "rejected"
                      ? "destructive"
                      : "secondary"
                  }
                  data-testid="badge-verification-status"
                >
                  {user.verificationStatus.charAt(0).toUpperCase() + user.verificationStatus.slice(1)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {user.role === "buyer" && (
          <Card data-testid="card-contact-number">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Contact Number
              </CardTitle>
              <CardDescription>Your contact number for delivery coordination</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isEditingContact ? (
                <>
                  <div className="space-y-2">
                    <p className="font-medium" data-testid="text-contact-number">
                      {user.userContactNumber || "No contact number provided"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingContact(true)}
                    data-testid="button-edit-contact"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    {user.userContactNumber ? "Edit" : "Add"} Contact Number
                  </Button>
                </>
              ) : (
                <div className="space-y-4">
                  <Input
                    type="tel"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="+960 XXX XXXX"
                    data-testid="input-contact-number"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveContact}
                      disabled={updateContactMutation.isPending}
                      data-testid="button-save-contact"
                    >
                      {updateContactMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelContact}
                      disabled={updateContactMutation.isPending}
                      data-testid="button-cancel-contact"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {user.role === "seller" && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card data-testid="card-contact-info">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Contact Information
                </CardTitle>
                <CardDescription>Your contact details</CardDescription>
              </div>
              {!isEditingProfile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingProfile(true)}
                  data-testid="button-edit-profile"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {!isEditingProfile ? (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>Contact Number</span>
                    </div>
                    <p className="font-medium" data-testid="text-contact-number">
                      {user.contactNumber || "Not provided"}
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>Address</span>
                    </div>
                    <p className="font-medium" data-testid="text-address">
                      {user.streetAddress || "Not provided"}
                      {user.city && <><br />{user.city}, {user.postalCode}</>}
                      {user.country && <><br />{user.country}</>}
                    </p>
                  </div>
                </>
              ) : (
                <Form {...profileForm}>
                  <form className="space-y-4">
                    <FormField
                      control={profileForm.control}
                      name="contactNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Number</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="+94 11 234 5678"
                              {...field} 
                              data-testid="input-edit-contact-number" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="streetAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street Address</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="123 Galle Road"
                              {...field} 
                              data-testid="input-edit-street-address" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={profileForm.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Colombo"
                                {...field} 
                                data-testid="input-edit-city" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="postalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postal Code</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="00100"
                                {...field} 
                                data-testid="input-edit-postal-code" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={profileForm.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Sri Lanka"
                              {...field} 
                              data-testid="input-edit-country" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-bank-details">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Bank Details
              </CardTitle>
              <CardDescription>For receiving payments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isEditingProfile ? (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span>Bank Name</span>
                    </div>
                    <p className="font-medium" data-testid="text-bank-name">
                      {user.bankName || "Not provided"}
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>Account Holder</span>
                    </div>
                    <p className="font-medium" data-testid="text-account-holder">
                      {user.bankAccountHolderName || "Not provided"}
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Shield className="h-4 w-4" />
                      <span>Account Number</span>
                    </div>
                    <p className="font-medium" data-testid="text-account-number">
                      {user.bankAccountNumber || "Not provided"}
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Shield className="h-4 w-4" />
                      <span>SWIFT Code</span>
                    </div>
                    <p className="font-medium" data-testid="text-swift-code">
                      {user.bankSwiftCode || "Not provided"}
                    </p>
                  </div>
                </>
              ) : (
                <Form {...profileForm}>
                  <form className="space-y-4">
                    <FormField
                      control={profileForm.control}
                      name="bankName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bank Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Bank of Ceylon"
                              {...field} 
                              data-testid="input-edit-bank-name" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="bankAccountHolderName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Holder Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Nimal Perera"
                              {...field} 
                              data-testid="input-edit-account-holder" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="bankAccountNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Number</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="1234567890"
                              {...field} 
                              data-testid="input-edit-account-number" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="bankSwiftCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SWIFT Code (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="BCEYLKLX"
                              {...field} 
                              data-testid="input-edit-swift-code" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {user.role === "seller" && isEditingProfile && (
        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={() => {
              setIsEditingProfile(false);
              profileForm.reset();
            }}
            data-testid="button-cancel-edit"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={profileForm.handleSubmit(onUpdateProfile)}
            disabled={isUpdatingProfile}
            data-testid="button-save-profile"
          >
            {isUpdatingProfile ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      )}

      {/* Verification Documents Section for Sellers */}
      {user.role === "seller" && user.verificationDocumentUrl && (
        <Card data-testid="card-verification-documents">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Verification Documents
            </CardTitle>
            <CardDescription>View your submitted verification documents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingDocuments ? (
              <p className="text-muted-foreground">Loading documents...</p>
            ) : verificationDocuments?.documents ? (
              <>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    You have {verificationDocuments.documents.length} document(s) on file
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {verificationDocuments.documents.map((doc, index) => (
                      <Badge key={index} variant="secondary" data-testid={`badge-document-${index}`}>
                        {doc.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleViewDocuments}
                  data-testid="button-view-documents"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Documents
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground">No documents available</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Shipping Addresses Section for Buyers */}
      {user.role === "buyer" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Shipping Addresses</h2>
              <p className="text-muted-foreground">Manage your shipping addresses (maximum 10)</p>
            </div>
            <Button
              onClick={() => handleOpenAddressDialog()}
              disabled={(shippingAddresses?.length || 0) >= 10}
              data-testid="button-add-address"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Address
            </Button>
          </div>

          {isLoadingAddresses ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">Loading addresses...</p>
              </CardContent>
            </Card>
          ) : !shippingAddresses || shippingAddresses.length === 0 ? (
            <Card data-testid="card-no-addresses">
              <CardContent className="pt-6 text-center">
                <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No shipping addresses yet</p>
                <Button onClick={() => handleOpenAddressDialog()} data-testid="button-add-first-address">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Address
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {shippingAddresses.map((address) => (
                <Card key={address.id} data-testid={`card-address-${address.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        {address.isDefault && (
                          <Badge variant="default" data-testid={`badge-default-${address.id}`}>
                            <Star className="h-3 w-3 mr-1" />
                            Default
                          </Badge>
                        )}
                        {!address.isDefault && <span className="text-muted-foreground">Shipping Address</span>}
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenAddressDialog(address)}
                          data-testid={`button-edit-address-${address.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteAddressId(address.id)}
                          data-testid={`button-delete-address-${address.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="font-medium" data-testid={`text-recipient-${address.id}`}>{address.recipientName}</p>
                      <p className="text-sm text-muted-foreground" data-testid={`text-contact-${address.id}`}>
                        {address.contactNumber}
                      </p>
                    </div>
                    <Separator />
                    <div className="text-sm">
                      <p data-testid={`text-street-${address.id}`}>{address.streetAddress}</p>
                      <p data-testid={`text-city-${address.id}`}>
                        {address.city}, {address.postalCode}
                      </p>
                      <p data-testid={`text-country-${address.id}`}>{address.country}</p>
                    </div>
                    {!address.isDefault && (
                      <>
                        <Separator />
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => setDefaultMutation.mutate(address.id)}
                          disabled={setDefaultMutation.isPending}
                          data-testid={`button-set-default-${address.id}`}
                        >
                          <Star className="h-4 w-4 mr-2" />
                          Set as Default
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bank Account Management for Admins */}
      {user.role === "admin" && (
        <BankAccountManagement />
      )}

      {/* Change Password Section */}
      <Card data-testid="card-change-password">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>
            Update your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        data-testid="input-current-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        data-testid="input-new-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        data-testid="input-confirm-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-change-password"
              >
                {isLoading ? "Changing password..." : "Change Password"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Add/Edit Address Dialog */}
      <Dialog open={isAddressDialogOpen} onOpenChange={setIsAddressDialogOpen}>
        <DialogContent data-testid="dialog-address-form">
          <DialogHeader>
            <DialogTitle>{editingAddress ? "Edit Address" : "Add New Address"}</DialogTitle>
            <DialogDescription>
              {editingAddress ? "Update your shipping address details" : "Add a new shipping address for deliveries"}
            </DialogDescription>
          </DialogHeader>
          <Form {...addressForm}>
            <form onSubmit={addressForm.handleSubmit(handleSaveAddress)} className="space-y-4">
              <FormField
                control={addressForm.control}
                name="recipientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipient Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-recipient-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={addressForm.control}
                name="contactNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Number</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-address-contact" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={addressForm.control}
                name="streetAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-address-street" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addressForm.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-address-city" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addressForm.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal Code</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-address-postal" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={addressForm.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-address-country" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddressDialogOpen(false);
                    setEditingAddress(null);
                    addressForm.reset();
                  }}
                  data-testid="button-cancel-address"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addAddressMutation.isPending || updateAddressMutation.isPending}
                  data-testid="button-save-address"
                >
                  {addAddressMutation.isPending || updateAddressMutation.isPending
                    ? "Saving..."
                    : editingAddress
                    ? "Update Address"
                    : "Add Address"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteAddressId} onOpenChange={() => setDeleteAddressId(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shipping Address</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this shipping address? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteAddressId) {
                  deleteAddressMutation.mutate(deleteAddressId);
                }
              }}
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Verification Document Preview Dialog */}
      <VerificationDocumentDialog
        open={documentPreviewOpen}
        onOpenChange={setDocumentPreviewOpen}
        documents={documents}
        title="Verification Documents"
        description="Your submitted verification documents"
        testIdPrefix="document"
      />
    </div>
  );
}
