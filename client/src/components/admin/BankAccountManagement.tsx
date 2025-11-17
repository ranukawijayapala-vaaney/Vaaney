import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Building2, Star, ArrowUp, ArrowDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { insertBankAccountSchema, updateBankAccountSchema, type BankAccount } from "@shared/schema";
import { z } from "zod";

type BankAccountFormData = z.infer<typeof insertBankAccountSchema>;

export function BankAccountManagement() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [deleteAccountId, setDeleteAccountId] = useState<string | null>(null);

  const form = useForm<BankAccountFormData>({
    resolver: zodResolver(insertBankAccountSchema),
    defaultValues: {
      displayName: "",
      accountHolderName: "",
      accountNumber: "",
      bankName: "",
      bankAddress: "",
      swiftCode: "",
      iban: "",
      routingNumber: "",
      currency: "USD",
      country: "US",
      sortOrder: 0,
      isActive: true,
      isPublic: true,
      isDefault: false,
      transferInstructions: "",
    },
  });

  const { data: bankAccounts, isLoading } = useQuery<BankAccount[]>({
    queryKey: ["/api/admin/bank-accounts"],
    queryFn: async () => {
      const response = await fetch("/api/admin/bank-accounts?includeInactive=true");
      if (!response.ok) throw new Error("Failed to fetch bank accounts");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: BankAccountFormData) => {
      return await apiRequest("POST", "/api/admin/bank-accounts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bank-accounts"] });
      toast({ title: "Bank account created successfully!" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create bank account",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BankAccountFormData> }) => {
      return await apiRequest("PATCH", `/api/admin/bank-accounts/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bank-accounts"] });
      toast({ title: "Bank account updated successfully!" });
      setIsDialogOpen(false);
      setEditingAccount(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update bank account",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/bank-accounts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bank-accounts"] });
      toast({ title: "Bank account deleted successfully!" });
      setDeleteAccountId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete bank account",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/admin/bank-accounts/${id}/set-default`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bank-accounts"] });
      toast({ title: "Default bank account updated!" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to set default",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = (account?: BankAccount) => {
    if (account) {
      setEditingAccount(account);
      form.reset({
        displayName: account.displayName,
        accountHolderName: account.accountHolderName,
        accountNumber: account.accountNumber,
        bankName: account.bankName,
        bankAddress: account.bankAddress || "",
        swiftCode: account.swiftCode || "",
        iban: account.iban || "",
        routingNumber: account.routingNumber || "",
        currency: account.currency,
        country: account.country,
        sortOrder: account.sortOrder,
        isActive: account.isActive,
        isPublic: account.isPublic,
        isDefault: account.isDefault,
        transferInstructions: account.transferInstructions || "",
      });
    } else {
      setEditingAccount(null);
      form.reset({
        displayName: "",
        accountHolderName: "",
        accountNumber: "",
        bankName: "",
        bankAddress: "",
        swiftCode: "",
        iban: "",
        routingNumber: "",
        currency: "USD",
        country: "US",
        sortOrder: bankAccounts ? bankAccounts.length : 0,
        isActive: true,
        isPublic: true,
        isDefault: false,
        transferInstructions: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (data: BankAccountFormData) => {
    if (editingAccount) {
      updateMutation.mutate({ id: editingAccount.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const sortedAccounts = bankAccounts?.sort((a, b) => a.sortOrder - b.sortOrder) || [];

  return (
    <>
      <Card data-testid="card-bank-accounts">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Bank Accounts for TT Payments
              </CardTitle>
              <CardDescription>
                Manage bank accounts that buyers can use for international Telegraphic Transfer payments
              </CardDescription>
            </div>
            <Button 
              onClick={() => handleOpenDialog()} 
              size="sm"
              data-testid="button-add-account"
            >
              <Plus className="h-4 w-4" />
              Add Account
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading bank accounts...</div>
          ) : sortedAccounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No bank accounts configured. Add your first account to enable TT payments.
            </div>
          ) : (
            <div className="space-y-4">
              {sortedAccounts.map((account) => (
                <Card key={account.id} data-testid={`card-bank-account-${account.id}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold" data-testid={`text-account-name-${account.id}`}>
                            {account.displayName}
                          </h3>
                          {account.isDefault && (
                            <Badge variant="default" data-testid={`badge-default-${account.id}`}>
                              <Star className="h-3 w-3" />
                              Default
                            </Badge>
                          )}
                          {!account.isActive && (
                            <Badge variant="secondary" data-testid={`badge-inactive-${account.id}`}>
                              Inactive
                            </Badge>
                          )}
                          <Badge variant="outline" data-testid={`badge-currency-${account.id}`}>
                            {account.currency}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Bank: </span>
                            <span data-testid={`text-bank-name-${account.id}`}>{account.bankName}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Account Holder: </span>
                            <span data-testid={`text-account-holder-${account.id}`}>{account.accountHolderName}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Account #: </span>
                            <span data-testid={`text-account-number-${account.id}`}>{account.accountNumber}</span>
                          </div>
                          {account.swiftCode && (
                            <div>
                              <span className="text-muted-foreground">SWIFT: </span>
                              <span data-testid={`text-swift-${account.id}`}>{account.swiftCode}</span>
                            </div>
                          )}
                          {account.iban && (
                            <div>
                              <span className="text-muted-foreground">IBAN: </span>
                              <span data-testid={`text-iban-${account.id}`}>{account.iban}</span>
                            </div>
                          )}
                          {account.routingNumber && (
                            <div>
                              <span className="text-muted-foreground">Routing: </span>
                              <span data-testid={`text-routing-${account.id}`}>{account.routingNumber}</span>
                            </div>
                          )}
                        </div>
                        
                        {account.transferInstructions && (
                          <p className="text-sm text-muted-foreground" data-testid={`text-transfer-instructions-${account.id}`}>
                            {account.transferInstructions}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        {!account.isDefault && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDefaultMutation.mutate(account.id)}
                            disabled={setDefaultMutation.isPending}
                            data-testid={`button-set-default-${account.id}`}
                          >
                            <Star className="h-4 w-4" />
                            Set Default
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleOpenDialog(account)}
                          data-testid={`button-edit-${account.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setDeleteAccountId(account.id)}
                          data-testid={`button-delete-${account.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-bank-account-form">
          <DialogHeader>
            <DialogTitle data-testid="title-dialog">
              {editingAccount ? "Edit Bank Account" : "Add Bank Account"}
            </DialogTitle>
            <DialogDescription>
              Configure bank account details for international TT payments. All fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="e.g., US Dollar Account - Bank of America"
                        data-testid="input-display-name"
                      />
                    </FormControl>
                    <FormDescription>
                      Short name shown to admins for easy identification
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="accountHolderName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Holder Name *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Full legal name"
                          data-testid="input-account-holder"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Number *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Bank account number"
                          data-testid="input-account-number"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Name *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Full bank name"
                        data-testid="input-bank-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bankAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Address</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Full bank address including city, state, country"
                        rows={2}
                        data-testid="input-bank-address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="swiftCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SWIFT/BIC Code</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="e.g., BOFAUS3N"
                          data-testid="input-swift"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="iban"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IBAN</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="International format"
                          data-testid="input-iban"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="routingNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Routing/ABA Number</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="9-digit code"
                          data-testid="input-routing"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-currency">
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="USD">USD - US Dollar</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                          <SelectItem value="GBP">GBP - British Pound</SelectItem>
                          <SelectItem value="MVR">MVR - Maldivian Rufiyaa</SelectItem>
                          <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                          <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="2-letter code (US, GB)"
                          data-testid="input-country"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Order</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-sort-order"
                        />
                      </FormControl>
                      <FormDescription>
                        Lower numbers appear first
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="transferInstructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transfer Instructions</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Special instructions for buyers making TT payments (e.g., reference format, additional details)"
                        rows={2}
                        data-testid="input-transfer-instructions"
                      />
                    </FormControl>
                    <FormDescription>
                      These instructions will be shown to buyers during checkout
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4">
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4 flex-1">
                      <div className="space-y-0.5">
                        <FormLabel>Active Status</FormLabel>
                        <FormDescription>
                          Account is enabled in the system
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-is-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isPublic"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4 flex-1">
                      <div className="space-y-0.5">
                        <FormLabel>Public for Checkout</FormLabel>
                        <FormDescription>
                          Visible to buyers during checkout
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-is-public"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isDefault"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4 flex-1">
                      <div className="space-y-0.5">
                        <FormLabel>Default Account</FormLabel>
                        <FormDescription>
                          Pre-selected during checkout
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-is-default"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingAccount(null);
                    form.reset();
                  }}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit"
                >
                  {createMutation.isPending || updateMutation.isPending 
                    ? "Saving..." 
                    : editingAccount 
                      ? "Update Account" 
                      : "Create Account"
                  }
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteAccountId} onOpenChange={() => setDeleteAccountId(null)}>
        <AlertDialogContent data-testid="dialog-confirm-delete">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bank Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this bank account? This action cannot be undone. 
              Existing transactions will retain their bank account information.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAccountId && deleteMutation.mutate(deleteAccountId)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
