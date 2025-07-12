
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, ShoppingCart, FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  loadWarehouse, 
  loadClaims,
  loadDeposits,
  type WarehouseData,
  type Claim,
  type Deposit 
} from "@/utils/backendService";

interface DashboardProps {
  onNavigate: (view: string, itemId?: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { orgId } = useParams<{ orgId: string }>();
  const [warehouseData, setWarehouseData] = useState<WarehouseData>({});
  const [claims, setClaims] = useState<Claim[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (orgId) {
      loadData();
    }
  }, [orgId]);

  const loadData = async () => {
    if (!orgId) return;
    
    try {
      const [warehouse, claimsData, depositsData] = await Promise.all([
        loadWarehouse(orgId),
        loadClaims(orgId),
        loadDeposits(orgId)
      ]);
      setWarehouseData(warehouse);
      setClaims(claimsData);
      setDeposits(depositsData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = {
    requiredParts: Object.values(warehouseData).filter(item => item.inventoryStock < 0).length,
    pendingClaims: claims.filter(claim => claim.status === 'pending').length,
    pendingDeposits: deposits.filter(deposit => deposit.status === 'pending').length,
  };

  const recentActivity = [
    ...claims.slice(-3).reverse().map(claim => ({
      type: 'claim' as const,
      id: claim.id,
      description: `${claim.name}`,
      time: claim.createdAt,
      status: claim.status
    })),
    ...deposits.slice(-3).reverse().map(deposit => ({
      type: 'deposit' as const,
      id: deposit.id,
      description: `${deposit.name}`,
      time: deposit.createdAt,
      status: deposit.status
    }))
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);

  const negativeStockParts = Object.entries(warehouseData)
    .filter(([_, item]) => item.inventoryStock < 0)
    .slice(0, 3);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Alerts - only show for negative stock */}
      {negativeStockParts.length > 0 && (
        <Alert className="bg-red-100 border-red-600 dark:bg-red-900">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-600 dark:text-red-100">
            <strong>Negative Stock Alert:</strong> There are parts that need to be ordered immidiately to satisfy all approved Claims.
            <Button 
              variant="link" 
              className="text-red-100 p-0 ml-2 h-auto"
              onClick={() => onNavigate("shopping")}
            >
              View Shopping List →
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards - removed low stock tile */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate("shopping")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Required Parts</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.requiredParts}</div>
            <p className="text-xs text-muted-foreground">Parts with negative stock</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate("claims")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Claims</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingClaims}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate("deposits")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Deposits</CardTitle>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingDeposits}</div>
            <p className="text-xs text-muted-foreground">Awaiting processing</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest claims, deposits, and inventory changes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between py-2 border-b border-gray-100 cursor-pointer hover:bg-gray-50 rounded px-2"
                  onClick={() => onNavigate(activity.type === 'claim' ? 'claims' : 'deposits', activity.id)}
                >
                  <div className="flex items-center space-x-3">
                    <Badge variant={activity.type === 'claim' ? 'secondary' : 'outline'}>
                      {activity.type === 'claim' ? 'Claim' : 'Deposit'}
                    </Badge>
                    <span className="text-sm">{activity.description}</span>
                    <Badge 
                      className={
                        activity.status === 'approved' 
                          ? "bg-green-100 text-green-800 hover:bg-green-100" 
                          : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                      }
                    >
                      {activity.status}
                    </Badge>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(activity.time).toLocaleDateString()}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                No recent activity
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
