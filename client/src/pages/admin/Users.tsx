import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, UserCheck, Users as UsersIcon, DollarSign, Edit2, FileSpreadsheet, Mail, Phone, MapPin, Building2, Calendar, FileText, Eye } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { VerificationDocumentDialog, type DocumentData } from "@/components/VerificationDocumentDialog";

export default function Users() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [commissionDialogOpen, setCommissionDialogOpen] = useState(false);
  const [commissionRate, setCommissionRate] = useState("");
  const [documentPreviewOpen, setDocumentPreviewOpen] = useState(false);
  const [documents, setDocuments] = useState<DocumentData[]>([]);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users", roleFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (roleFilter !== "all") params.append("role", roleFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);
      const queryString = params.toString();
      const url = `/api/admin/users${queryString ? `?${queryString}` : ""}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });

  const { data: verificationDocuments, isLoading: isLoadingDocuments } = useQuery<{ documents: DocumentData[] }>({
    queryKey: ["/api/admin/verification-document", selectedUser?.id],
    queryFn: async () => {
      const response = await fetch(`/api/admin/verification-document/${selectedUser?.id}`);
      if (!response.ok) throw new Error("Failed to fetch verification documents");
      return response.json();
    },
    enabled: !!selectedUser?.id && !!selectedUser?.verificationDocumentUrl,
    retry: false,
  });

  const updateCommissionMutation = useMutation({
    mutationFn: async (data: { userId: string; commissionRate: string }) => {
      return await apiRequest("PUT", `/api/admin/users/${data.userId}/commission`, { commissionRate: data.commissionRate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Commission rate updated successfully!" });
      setCommissionDialogOpen(false);
      setSelectedUser(null);
      setCommissionRate("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update commission", description: error.message, variant: "destructive" });
    },
  });

  const handleViewProfile = (user: User) => {
    setSelectedUser(user);
    setProfileDialogOpen(true);
  };

  const handleEditCommission = (user: User, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedUser(user);
    setCommissionRate(user.commissionRate || "20.00");
    setCommissionDialogOpen(true);
  };

  const handleSaveCommission = () => {
    if (!selectedUser) return;
    
    const rate = parseFloat(commissionRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast({ title: "Invalid commission rate", description: "Rate must be between 0 and 100", variant: "destructive" });
      return;
    }

    updateCommissionMutation.mutate({
      userId: selectedUser.id,
      commissionRate: commissionRate,
    });
  };

  const handleViewDocuments = () => {
    if (verificationDocuments?.documents) {
      setDocuments(verificationDocuments.documents);
      setDocumentPreviewOpen(true);
    }
  };

  const exportToExcel = () => {
    try {
      const exportData = filteredUsers.map((user: User) => {
        const baseData = {
          "User ID": user.id,
          "First Name": user.firstName || "N/A",
          "Last Name": user.lastName || "N/A",
          "Email": user.email,
          "Role": user.role || "none",
          "Verification Status": user.verificationStatus || "none",
        };
        
        // Only include commission rate for sellers
        if (user.role === "seller") {
          return {
            ...baseData,
            "Commission Rate (%)": user.commissionRate || "20.00",
            "Created Date": user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A",
            "Created Time": user.createdAt ? new Date(user.createdAt).toLocaleTimeString() : "N/A",
          };
        }
        
        return {
          ...baseData,
          "Created Date": user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A",
          "Created Time": user.createdAt ? new Date(user.createdAt).toLocaleTimeString() : "N/A",
        };
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Column widths vary based on whether sellers are in the export
      const hasSellers = filteredUsers.some((u: User) => u.role === "seller");
      ws['!cols'] = hasSellers ? [
        { wch: 38 }, // User ID (full UUID)
        { wch: 18 }, // First Name
        { wch: 18 }, // Last Name
        { wch: 30 }, // Email
        { wch: 12 }, // Role
        { wch: 20 }, // Verification Status
        { wch: 20 }, // Commission Rate (sellers only)
        { wch: 15 }, // Created Date
        { wch: 15 }, // Created Time
      ] : [
        { wch: 38 }, // User ID (full UUID)
        { wch: 18 }, // First Name
        { wch: 18 }, // Last Name
        { wch: 30 }, // Email
        { wch: 12 }, // Role
        { wch: 20 }, // Verification Status
        { wch: 15 }, // Created Date
        { wch: 15 }, // Created Time
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Users");

      const date = new Date().toISOString().split('T')[0];
      const filename = `Vaaney_Users_${date}.xlsx`;

      XLSX.writeFile(wb, filename);
      
      toast({ 
        title: "Export successful", 
        description: `Exported ${exportData.length} user(s) to ${filename}` 
      });
    } catch (error: any) {
      console.error("Excel export error:", error);
      toast({ 
        title: "Export failed", 
        description: error.message || "Failed to generate Excel file", 
        variant: "destructive" 
      });
    }
  };

  const filteredUsers = users.filter((user: User) => {
    const matchesSearch = 
      user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case "buyer": return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
      case "seller": return "bg-purple-500/10 text-purple-700 dark:text-purple-300";
      case "admin": return "bg-red-500/10 text-red-700 dark:text-red-300";
      default: return "bg-muted";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": 
      case "verified": return "bg-green-500/10 text-green-700 dark:text-green-300";
      case "pending": return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300";
      case "rejected": return "bg-red-500/10 text-red-700 dark:text-red-300";
      default: return "bg-muted";
    }
  };

  const stats = {
    totalUsers: users.length,
    buyers: users.filter((u: User) => u.role === "buyer").length,
    sellers: users.filter((u: User) => u.role === "seller").length,
    pendingVerifications: users.filter((u: User) => u.verificationStatus === "pending").length,
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">User Management</h1>
        <p className="text-muted-foreground">Manage users, roles, and commission rates</p>
      </div>

      <div className="grid gap-6 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-users">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Buyers</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-buyers">{stats.buyers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Sellers</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-sellers">{stats.sellers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Pending Verifications</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-verifications">{stats.pendingVerifications}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-users"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-role-filter">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="buyer">Buyers</SelectItem>
                  <SelectItem value="seller">Sellers</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={exportToExcel}
                disabled={filteredUsers.length === 0}
                data-testid="button-export-excel"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export to Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center">
              <UsersIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No users found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Commission Rate</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user: User) => (
                    <TableRow 
                      key={user.id} 
                      data-testid={`row-user-${user.id}`}
                      className="cursor-pointer hover-elevate"
                      onClick={() => handleViewProfile(user)}
                    >
                      <TableCell>
                        <div className="font-medium" data-testid={`text-user-name-${user.id}`}>
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                        <div className="text-xs text-muted-foreground">ID: {user.id.slice(0, 8)}...</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getRoleColor(user.role || "")} data-testid={`badge-role-${user.id}`}>
                          {user.role || "none"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getStatusColor(user.verificationStatus || "")} data-testid={`badge-status-${user.id}`}>
                          {user.verificationStatus || "none"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.role === "seller" ? (
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span data-testid={`text-commission-${user.id}`}>{user.commissionRate || "20.00"}%</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.role === "seller" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleEditCommission(user, e)}
                            data-testid={`button-edit-commission-${user.id}`}
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit Commission
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-user-profile">
          <DialogHeader>
            <DialogTitle>User Profile</DialogTitle>
            <DialogDescription>
              View detailed information about {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Full Name</Label>
                    <p className="font-medium" data-testid="text-profile-name">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
                    <p className="font-medium" data-testid="text-profile-email">{selectedUser.email}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Role</Label>
                    <Badge variant="secondary" className={getRoleColor(selectedUser.role || "")} data-testid="badge-profile-role">
                      {selectedUser.role || "none"}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Verification Status</Label>
                    <Badge variant="secondary" className={getStatusColor(selectedUser.verificationStatus || "")} data-testid="badge-profile-status">
                      {selectedUser.verificationStatus || "none"}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Buyer Contact Information */}
              {selectedUser.role === "buyer" && selectedUser.userContactNumber && (
                <>
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Buyer Contact Number
                    </h3>
                    <p className="font-medium" data-testid="text-profile-buyer-contact">
                      {selectedUser.userContactNumber}
                    </p>
                  </div>
                  <Separator />
                </>
              )}

              {/* Seller Information */}
              {selectedUser.role === "seller" && (
                <>
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-muted-foreground">Business Contact Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedUser.contactNumber && (
                        <div className="space-y-1">
                          <Label className="text-muted-foreground flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            Contact Number
                          </Label>
                          <p className="font-medium" data-testid="text-profile-contact">{selectedUser.contactNumber}</p>
                        </div>
                      )}
                      {selectedUser.streetAddress && (
                        <div className="space-y-1 col-span-2">
                          <Label className="text-muted-foreground flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Address
                          </Label>
                          <p className="font-medium" data-testid="text-profile-address">
                            {selectedUser.streetAddress}
                            {selectedUser.city && <><br />{selectedUser.city}, {selectedUser.postalCode}</>}
                            {selectedUser.country && <><br />{selectedUser.country}</>}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {(selectedUser.bankName || selectedUser.bankAccountNumber) && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Bank Details
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          {selectedUser.bankName && (
                            <div className="space-y-1">
                              <Label className="text-muted-foreground">Bank Name</Label>
                              <p className="font-medium" data-testid="text-profile-bank-name">{selectedUser.bankName}</p>
                            </div>
                          )}
                          {selectedUser.bankAccountHolderName && (
                            <div className="space-y-1">
                              <Label className="text-muted-foreground">Account Holder</Label>
                              <p className="font-medium" data-testid="text-profile-account-holder">{selectedUser.bankAccountHolderName}</p>
                            </div>
                          )}
                          {selectedUser.bankAccountNumber && (
                            <div className="space-y-1">
                              <Label className="text-muted-foreground">Account Number</Label>
                              <p className="font-medium" data-testid="text-profile-account-number">{selectedUser.bankAccountNumber}</p>
                            </div>
                          )}
                          {selectedUser.bankSwiftCode && (
                            <div className="space-y-1">
                              <Label className="text-muted-foreground">SWIFT Code</Label>
                              <p className="font-medium" data-testid="text-profile-swift-code">{selectedUser.bankSwiftCode}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  <Separator />
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Commission
                    </h3>
                    <div className="flex items-center justify-between">
                      <p className="font-medium" data-testid="text-profile-commission">
                        {selectedUser.commissionRate || "20.00"}%
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setProfileDialogOpen(false);
                          setCommissionRate(selectedUser.commissionRate || "20.00");
                          setCommissionDialogOpen(true);
                        }}
                        data-testid="button-edit-commission-from-profile"
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit Commission
                      </Button>
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* System Information */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground">System Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">User ID</Label>
                    <p className="font-mono text-xs" data-testid="text-profile-id">{selectedUser.id}</p>
                  </div>
                  {selectedUser.createdAt && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Created At
                      </Label>
                      <p className="font-medium text-sm" data-testid="text-profile-created">
                        {new Date(selectedUser.createdAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Verification Documents */}
              {selectedUser.verificationDocumentUrl && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Verification Documents
                    </h3>
                    
                    {isLoadingDocuments ? (
                      <p className="text-sm text-muted-foreground">Loading documents...</p>
                    ) : verificationDocuments?.documents ? (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          {verificationDocuments.documents.length} document(s) on file
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {verificationDocuments.documents.map((doc, index) => (
                            <Badge key={index} variant="secondary" data-testid={`badge-user-document-${index}`}>
                              {doc.name}
                            </Badge>
                          ))}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleViewDocuments}
                          data-testid="button-view-user-documents"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Documents
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No documents available</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setProfileDialogOpen(false);
                setSelectedUser(null);
              }}
              data-testid="button-close-profile"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={commissionDialogOpen} onOpenChange={setCommissionDialogOpen}>
        <DialogContent data-testid="dialog-edit-commission">
          <DialogHeader>
            <DialogTitle>Edit Commission Rate</DialogTitle>
            <DialogDescription>
              Update the commission rate for {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="commissionRate">Commission Rate (%)</Label>
              <Input
                id="commissionRate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                placeholder="20.00"
                data-testid="input-commission-rate"
              />
              <p className="text-sm text-muted-foreground">
                Enter a value between 0 and 100. Default is 20%.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCommissionDialogOpen(false);
                setSelectedUser(null);
                setCommissionRate("");
              }}
              data-testid="button-cancel-commission"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCommission}
              disabled={updateCommissionMutation.isPending}
              data-testid="button-save-commission"
            >
              {updateCommissionMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VerificationDocumentDialog
        open={documentPreviewOpen}
        onOpenChange={setDocumentPreviewOpen}
        documents={documents}
        title="User Verification Documents"
        description={`Verification documents for ${selectedUser?.firstName} ${selectedUser?.lastName}`}
        testIdPrefix="user-document"
      />
    </div>
  );
}
