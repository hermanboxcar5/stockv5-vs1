import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Plus, Download, ExternalLink, Trash2, Package, Upload } from "lucide-react";
import { 
  loadShoppingLists, 
  saveShoppingLists, 
  loadClaims,
  loadWarehouse,
  loadVexParts,
  loadDeposits,
  saveDeposits,
  type ShoppingList,
  type Claim,
  type WarehouseData,
  type VexPartsData,
  type Deposit 
} from "@/utils/fileSystemManager";

interface ShoppingListsProps {
  onNavigate?: (view: string, itemId?: string) => void;
}

export function ShoppingLists({ onNavigate }: ShoppingListsProps) {
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [warehouseData, setWarehouseData] = useState<WarehouseData>({});
  const [vexPartsData, setVexPartsData] = useState<VexPartsData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListDescription, setNewListDescription] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSku, setSelectedSku] = useState("");
  const [quantity, setQuantity] = useState("");
  const [newListItems, setNewListItems] = useState<Array<{sku: string, name: string, quantity: number, price: string, url: string, stock: boolean}>>([]);

  useEffect(() => {
    loadData();
  }, []);

  const parsePrice = (priceString: string): number => {
    return parseFloat(priceString.replace(/[$,]/g, '')) || 0;
  };

  const loadData = async () => {
    try {
      const [lists, claimsData, warehouse, vexParts, depositsData] = await Promise.all([
        loadShoppingLists(),
        loadClaims(),
        loadWarehouse(),
        loadVexParts(),
        loadDeposits()
      ]);
      
      // Generate required parts list from negative stock items
      const requiredParts: Record<string, number> = {};
      
      Object.entries(warehouse).forEach(([sku, item]) => {
        if (item.inventoryStock < 0) {
          requiredParts[sku] = Math.abs(item.inventoryStock);
        }
      });

      const requiredList: ShoppingList = {
        id: "default",
        name: "Required Parts (Auto-generated)",
        description: "Parts with negative stock that need to be ordered",
        isDefault: true,
        items: Object.entries(requiredParts).map(([sku, quantity]) => {
          const part = vexParts[sku];
          return {
            sku,
            name: part?.name || "Unknown Part",
            quantity,
            price: part?.price || "$0.00",
            url: part?.url || "",
            stock: part?.stock || false
          };
        }),
        totalCost: Object.entries(requiredParts).reduce((total, [sku, quantity]) => {
          const part = vexParts[sku];
          const price = parsePrice(part?.price || '$0');
          return total + (price * quantity);
        }, 0)
      };

      const customLists = lists.filter(list => !list.isDefault);
      const allLists = requiredList.items.length > 0 ? [requiredList, ...customLists] : customLists;
      
      setShoppingLists(allLists);
      setClaims(claimsData);
      setDeposits(depositsData);
      setWarehouseData(warehouse);
      setVexPartsData(vexParts);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredParts = Object.entries(vexPartsData).filter(([sku, part]) => 
    searchTerm && (
      sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  ).slice(0, 10);

  const addItemToList = () => {
    if (selectedSku && quantity && parseInt(quantity) > 0) {
      const part = vexPartsData[selectedSku];
      if (part) {
        setNewListItems([...newListItems, {
          sku: selectedSku,
          name: part.name,
          quantity: parseInt(quantity),
          price: part.price,
          url: part.url,
          stock: part.stock
        }]);
        setSelectedSku("");
        setQuantity("");
        setSearchTerm("");
      }
    }
  };

  const removeItemFromList = (index: number) => {
    setNewListItems(newListItems.filter((_, i) => i !== index));
  };

  const updateItemQuantity = (index: number, newQuantity: number) => {
    if (newQuantity > 0) {
      setNewListItems(newListItems.map((item, i) => 
        i === index ? { ...item, quantity: newQuantity } : item
      ));
    }
  };

  const createList = async () => {
    if (newListName && newListItems.length > 0) {
      const totalCost = newListItems.reduce((total, item) => {
        return total + (parsePrice(item.price) * item.quantity);
      }, 0);

      const newList: ShoppingList = {
        id: `LIST-${String(shoppingLists.length + 1).padStart(3, '0')}`,
        name: newListName,
        description: newListDescription,
        isDefault: false,
        items: newListItems,
        totalCost
      };
      
      const customLists = shoppingLists.filter(list => !list.isDefault);
      const updatedLists = [...customLists, newList];
      await saveShoppingLists(updatedLists);
      
      setShowCreateForm(false);
      setNewListName("");
      setNewListDescription("");
      setNewListItems([]);
      loadData(); // Reload to include the new list
    }
  };

  const handleExportCSV = (listId: string) => {
    const list = shoppingLists.find(l => l.id === listId);
    if (!list) return;

    const csvContent = [
      "SKU,QTY",
      ...list.items.map(item => `${item.sku},${item.quantity}`)
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${list.name.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCSV = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const items: Array<{sku: string, name: string, quantity: number, price: string, url: string, stock: boolean}> = [];
      
      // Skip header line
      for (let i = 1; i < lines.length; i++) {
        const [sku, qty] = lines[i].split(',');
        if (sku && qty && vexPartsData[sku]) {
          const part = vexPartsData[sku];
          items.push({
            sku,
            name: part.name,
            quantity: parseInt(qty) || 1,
            price: part.price,
            url: part.url,
            stock: part.stock
          });
        }
      }
      
      if (items.length > 0) {
        const totalCost = items.reduce((total, item) => {
          return total + (parsePrice(item.price) * item.quantity);
        }, 0);

        const today = new Date().toLocaleDateString();
        const existingImportsToday = shoppingLists.filter(list => 
          list.name && list.name.includes(`Imported List ${today}`)
        ).length;

        const newList: ShoppingList = {
          id: `LIST-${String(shoppingLists.length + 1).padStart(3, '0')}`,
          name: `Imported List ${today} ${existingImportsToday + 1}`,
          description: "Imported from CSV",
          isDefault: false,
          items,
          totalCost
        };
        
        const customLists = shoppingLists.filter(list => !list.isDefault);
        const updatedLists = [...customLists, newList];
        await saveShoppingLists(updatedLists);
        loadData();
      }
    };
    
    input.click();
  };

  const handleCreateDeposit = async (listId: string) => {
    const list = shoppingLists.find(l => l.id === listId);
    if (!list) return;

    const newDeposit: Deposit = {
      id: `DEP-${String(deposits.length + 1).padStart(3, '0')}`,
      teamName: "Purchase Order",
      submittedDate: new Date().toISOString().split('T')[0],
      status: 'pending',
      items: list.items.map(item => ({
        sku: item.sku,
        name: item.name,
        quantity: item.quantity
      }))
    };
    
    const updatedDeposits = [...deposits, newDeposit];
    setDeposits(updatedDeposits);
    await saveDeposits(updatedDeposits);
    
    if (onNavigate) {
      onNavigate('deposits', newDeposit.id);
    }
  };

  const handleDeleteList = async (listId: string) => {
    const updatedLists = shoppingLists.filter(list => list.id !== listId && !list.isDefault);
    await saveShoppingLists(updatedLists);
    loadData();
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12">Loading shopping lists...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Shopping Lists</h2>
          <p className="text-gray-600">Manage shopping lists for VEX parts</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleImportCSV}>
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create List
          </Button>
        </div>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Shopping List</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="List Name"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
            />
            <Input
              placeholder="Description (optional)"
              value={newListDescription}
              onChange={(e) => setNewListDescription(e.target.value)}
            />
            
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <Input
                  placeholder="Search by SKU or part name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {filteredParts.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                    {filteredParts.map(([sku, part]) => (
                      <div
                        key={sku}
                        className="p-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => {
                          setSelectedSku(sku);
                          setSearchTerm(`VEX-${sku} - ${part.name}`);
                        }}
                      >
                        <div className="font-mono text-sm">VEX-{sku}</div>
                        <div className="text-sm text-gray-600">{part.name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Input
                type="number"
                placeholder="Quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-24"
              />
              <Button onClick={addItemToList}>Add</Button>
            </div>

            {newListItems.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Items in List:</h4>
                {newListItems.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span><span className="font-mono">VEX-{item.sku}</span> - {item.name}</span>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 0)}
                        className="w-20"
                        min="1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItemFromList(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex space-x-2">
              <Button onClick={createList} disabled={!newListName || newListItems.length === 0}>
                Create List
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shopping Lists */}
      <div className="space-y-6">
        {shoppingLists.map((list) => (
          <Card key={list.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="flex items-center space-x-2">
                      <CardTitle className="text-lg">{list.name}</CardTitle>
                      {list.isDefault && (
                        <Badge variant="secondary" className="text-xs">Auto-generated</Badge>
                      )}
                    </div>
                    <CardDescription>{list.description}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="text-2xl font-bold">${list.totalCost.toFixed(2)}</div>
                    <div className="text-sm text-gray-500">{list.items.length} items</div>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleExportCSV(list.id)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Export CSV
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open('https://www.vexrobotics.com/quickorder/', '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      VEX Quick Order
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleCreateDeposit(list.id)}
                    >
                      <Package className="h-4 w-4 mr-1" />
                      Create Deposit
                    </Button>
                    {!list.isDefault && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteList(list.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Part Name</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">VEX-{item.sku}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                      <TableCell className="text-right">{item.price}</TableCell>
                      <TableCell className="text-right font-medium">
                        ${(parsePrice(item.price) * item.quantity).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {item.stock ? (
                          <Badge className="bg-green-100 text-green-800 text-xs">In Stock</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">Out of Stock</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
                          <a href={item.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>

      {shoppingLists.length === 0 && (
        <div className="text-center py-12">
          <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No shopping lists found</h3>
          <p className="text-gray-500">Create your first shopping list to get started</p>
        </div>
      )}
    </div>
  );
}
