import { useState } from "react";
import { DollarSign, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import type { Transaction } from "@shared/schema";

export default function Payouts() {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: transactions = [], isLoading } = useQuery<(Transaction & { buyer?: any; order?: any; booking?: any })[]>({
    queryKey: ["/api/seller/transactions"],
  });

  const filteredTransactions = transactions.filter(tx => {
    if (statusFilter === "all") return true;
    return tx.status === statusFilter;
  });

  const stats = {
    totalEarnings: transactions
      .filter(t => t.status === "released")
      .reduce((sum, t) => sum + parseFloat(t.sellerPayout), 0),
    pendingPayout: transactions
      .filter(t => t.status === "escrow")
      .reduce((sum, t) => sum + parseFloat(t.sellerPayout), 0),
    totalCommission: transactions
      .filter(t => t.status === "released")
      .reduce((sum, t) => sum + parseFloat(t.commissionAmount), 0),
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "released":
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Released</Badge>;
      case "escrow":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />In Escrow</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "refunded":
        return <Badge variant="destructive">Refunded</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold font-display">Payouts</h1>
        <p className="text-muted-foreground mt-2">Track your earnings and transaction history</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary" data-testid="text-total-earnings">
              ${stats.totalEarnings.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Released payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Payout</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600" data-testid="text-pending-payout">
              ${stats.pendingPayout.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">In escrow</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Platform Commission</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-total-commission">
              ${stats.totalCommission.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Lifetime total</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="grid w-full max-w-md grid-cols-4 mb-4">
              <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
              <TabsTrigger value="released" data-testid="tab-released">Released</TabsTrigger>
              <TabsTrigger value="escrow" data-testid="tab-escrow">Escrow</TabsTrigger>
              <TabsTrigger value="pending" data-testid="tab-pending">Pending</TabsTrigger>
            </TabsList>

            <TabsContent value={statusFilter} className="space-y-4">
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="border rounded-md p-4 space-y-3">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No transactions found</h3>
                  <p className="text-muted-foreground">
                    {statusFilter === "all" 
                      ? "You haven't received any payments yet"
                      : `No ${statusFilter} transactions`}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="border rounded-md p-4 hover-elevate transition-all"
                      data-testid={`transaction-${tx.id}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold capitalize">{tx.type}</span>
                            {getStatusBadge(tx.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {tx.type === "order" && `Order #${tx.orderId?.slice(-8)}`}
                            {tx.type === "booking" && `Booking #${tx.bookingId?.slice(-8)}`}
                          </p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground">
                              Amount: <span className="font-medium text-foreground">${parseFloat(tx.amount).toFixed(2)}</span>
                            </span>
                            <span className="text-muted-foreground">
                              Commission: <span className="font-medium text-foreground">{tx.commissionRate}% (${parseFloat(tx.commissionAmount).toFixed(2)})</span>
                            </span>
                            <span className="text-muted-foreground">
                              Your Payout: <span className="font-medium text-primary">${parseFloat(tx.sellerPayout).toFixed(2)}</span>
                            </span>
                          </div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <div>{new Date(tx.createdAt || "").toLocaleDateString()}</div>
                          {tx.releasedAt && tx.status === "released" && (
                            <div className="text-xs">Released: {new Date(tx.releasedAt).toLocaleDateString()}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
