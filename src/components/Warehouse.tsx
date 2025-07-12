
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, ExternalLink, Package, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { 
  loadWarehouse, 
  loadVexParts,
  addItemToWarehouse,
  removeItemFromWarehouse,
  type WarehouseData,
  type VexPartsData 
} from "@/utils/backendService";
import { AddPartsDialog } from "./AddPartsDialog";

export function Warehouse() {
  const { orgId } = useParams<{ orgId: string }>();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [warehouseData, setWarehouseData] = useState<WarehouseData>({});
  const [vexPartsData, setVexPartsData] = useState<VexPartsData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showAddPartsDialog, setShowAddPartsDialog] = useState(false);
  const [processingItems, setProcessingItems] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    if (orgId) {
      loadData();
    }
  }, [orgId]);

  const loadData = async () => {
    if (!orgId) return;
    
    try {
      const [warehouse, vexParts] = await Promise.all([
        loadWarehouse(orgId),
        loadVexParts()
      ]);
      setWarehouseData(warehouse);
      setVexPartsData(vexParts);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        title: "Error",
        description: "Failed to load warehouse data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddParts = async (parts: Array<{sku: string; quantity?: number}>) => {
    if (!orgId) return;

    try {
      for (const part of parts) {
        const quantity = part.quantity || 1;
        await addItemToWarehouse(orgId, part.sku, quantity);
      }
      
      await loadData();
      toast({
        title: "Success",
        description: `Added ${parts.length} part(s) to warehouse`
      });
    } catch (error) {
      console.error('Failed to add parts:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add parts",
        variant: "destructive"
      });
    }
  };

  const handleRemoveItem = async (sku: string) => {
    if (!orgId) return;

    setProcessingItems(prev => new Set(prev).add(sku));
    
    try {
      await removeItemFromWarehouse(orgId, sku);
      await loadData();
      toast({
        title: "Success",
        description: "Item removed from warehouse"
      });
    } catch (error) {
      console.error('Failed to remove item:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove item",
        variant: "destructive"
      });
    } finally {
      setProcessingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(sku);
        return newSet;
      });
    }
  };

  const filteredItems = Object.entries(warehouseData).filter(([sku, item]) => {
    const matchesSearch = sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === "all" || item.type === selectedType;
    return matchesSearch && matchesType;
  });

  const getStockStatus = (stock: number) => {
    if (stock < 0) return "negative";
    if (stock === 0) return "zero";
    return "positive";
  };

  const getStockColor = (status: string) => {
    switch (status) {
      case "negative": return "stock-negative";
      case "zero": return "stock-zero";
      default: return "stock-positive";
    }
  };

  const types = [...new Set(Object.values(warehouseData).map(item => item.type || "none"))];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg text-foreground">Loading warehouse data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Warehouse</h2>
          <p className="text-muted-foreground">Manage your part inventory</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => setShowAddPartsDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Parts
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by SKU or part name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All Types</option>
          {types.map(type => (
            <option key={type} value={type}>{type === "none" ? "None" : type}</option>
          ))}
        </select>
      </div>

      {/* Parts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredItems.map(([sku, item]) => {
          const status = getStockStatus(item.inventoryStock);
          const canRemove = item.inventoryStock === 0;
          const isProcessing = processingItems.has(sku);
          
          return (
            <Card key={sku} className={cn("relative", getStockColor(status))}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-bold">{item.name}</CardTitle>
                    <CardDescription className="text-sm line-clamp-2 font-mono">VEX-{sku}</CardDescription>
                  </div>
                  {canRemove && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleRemoveItem(sku)}
                      disabled={isProcessing}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-3xl font-bold">{item.inventoryStock}</div>
                    <div className="text-sm text-muted-foreground">Stock</div>
                  </div>
                  <Badge variant="secondary" className="w-full justify-center text-xs">
                    {item.type || "None"}
                  </Badge>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{item.price}</span>
                    <div className="flex items-center space-x-2">
                      {item.stock ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">In Stock</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">Out of Stock</Badge>
                      )}
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
                        <a href={item.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No parts found</h3>
          <p className="text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      )}

      <AddPartsDialog
        isOpen={showAddPartsDialog}
        onClose={() => setShowAddPartsDialog(false)}
        vexPartsData={vexPartsData}
        onAddParts={handleAddParts}
      />
    </div>
  );
}
