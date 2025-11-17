import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FileCheck, FileX, Eye, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { VerificationDocumentDialog, type DocumentData } from "@/components/VerificationDocumentDialog";

export default function Verifications() {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [documentPreviewOpen, setDocumentPreviewOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [documents, setDocuments] = useState<DocumentData[]>([]);

  const { data: pendingUsers = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users", "pending"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users?status=pending");
      if (!response.ok) throw new Error("Failed to fetch pending verifications");
      return response.json();
    },
  });

  const updateVerificationMutation = useMutation({
    mutationFn: async (data: { userId: string; status: "approved" | "rejected"; rejectionReason?: string }) => {
      return await apiRequest("PUT", `/api/admin/users/${data.userId}/verification`, {
        status: data.status,
        rejectionReason: data.rejectionReason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Verification status updated successfully!" });
      setRejectDialogOpen(false);
      setSelectedUser(null);
      setRejectionReason("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update verification status", description: error.message, variant: "destructive" });
    },
  });

  const handleApprove = (user: User) => {
    setSelectedUser(user);
    updateVerificationMutation.mutate({
      userId: user.id,
      status: "approved",
    });
  };

  const handleRejectClick = (user: User) => {
    setSelectedUser(user);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (!selectedUser) return;

    if (!rejectionReason.trim()) {
      toast({ title: "Rejection reason required", description: "Please provide a reason for rejection", variant: "destructive" });
      return;
    }

    updateVerificationMutation.mutate({
      userId: selectedUser.id,
      status: "rejected",
      rejectionReason: rejectionReason,
    });
  };

  const handleViewDocument = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/verification-document/${userId}`);
      if (!response.ok) throw new Error("Failed to fetch document");
      const data = await response.json();
      setDocuments(data.documents);
      setDocumentPreviewOpen(true);
    } catch (error) {
      toast({
        title: "Failed to load document",
        description: "Could not retrieve the verification document",
        variant: "destructive",
      });
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "buyer": return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
      case "seller": return "bg-purple-500/10 text-purple-700 dark:text-purple-300";
      case "admin": return "bg-red-500/10 text-red-700 dark:text-red-300";
      default: return "bg-muted";
    }
  };

  const stats = {
    totalPending: pendingUsers.length,
    pendingSellers: pendingUsers.filter((u: User) => u.role === "seller").length,
    pendingAdmins: pendingUsers.filter((u: User) => u.role === "admin").length,
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">Verification Management</h1>
        <p className="text-muted-foreground">Review and approve pending verification requests</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-pending">{stats.totalPending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Pending Sellers</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-sellers">{stats.pendingSellers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Pending Admins</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-admins">{stats.pendingAdmins}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Verification Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="py-12 text-center">
              <FileCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No pending verifications</h3>
              <p className="text-muted-foreground">All verification requests have been processed</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Requested Role</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingUsers.map((user: User) => (
                    <TableRow key={user.id} data-testid={`row-verification-${user.id}`}>
                      <TableCell>
                        <div className="font-medium" data-testid={`text-user-name-${user.id}`}>
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getRoleColor(user.role || "")} data-testid={`badge-role-${user.id}`}>
                          {user.role || "none"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.verificationDocumentUrl ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDocument(user.id)}
                            data-testid={`button-view-document-${user.id}`}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Document
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">No document</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm" data-testid={`text-submitted-date-${user.id}`}>
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleApprove(user)}
                            disabled={updateVerificationMutation.isPending}
                            data-testid={`button-approve-${user.id}`}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRejectClick(user)}
                            disabled={updateVerificationMutation.isPending}
                            data-testid={`button-reject-${user.id}`}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent data-testid="dialog-reject-verification">
          <DialogHeader>
            <DialogTitle>Reject Verification Request</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting {selectedUser?.firstName} {selectedUser?.lastName}'s verification request
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejectionReason">Rejection Reason</Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a clear reason for the rejection..."
                rows={4}
                data-testid="textarea-rejection-reason"
              />
              <p className="text-sm text-muted-foreground">
                This reason will be shared with the user
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setSelectedUser(null);
                setRejectionReason("");
              }}
              data-testid="button-cancel-reject"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={updateVerificationMutation.isPending}
              data-testid="button-confirm-reject"
            >
              {updateVerificationMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VerificationDocumentDialog
        open={documentPreviewOpen}
        onOpenChange={setDocumentPreviewOpen}
        documents={documents}
        title="Verification Documents"
        description="Review the submitted verification documents"
        testIdPrefix="document"
      />
    </div>
  );
}
