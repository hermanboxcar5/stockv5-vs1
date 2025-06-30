import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Plus, Upload, Check, X, Trash2, Edit } from "lucide-react";
import { 
  loadClaims, 
  saveClaims, 
  loadWarehouse,
  saveWarehouse,
  loadVexParts,
  type Claim,
  type WarehouseData,
  type VexPartsData 
} from "@/utils/fileSystemManager";

interface ClaimsProps {
  highlightedClaim?: string;
  onNavigate?: (path: string) => void;
}

export function Claims({ highlightedClaim, onNavigate }: ClaimsProps) {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [warehouseData, setWarehouseData] = useState<WarehouseData>({});
  const [vexPartsData, setVexPartsData] = useState<VexPartsData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingClaim, setEditingClaim] = useState<string | null>(null);
  const [newClaimTeam, setNewClaimTeam] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSku, setSelectedSku] = useState("");
  const [quantity, setQuantity] = useState("");
  const [newClaimItems, setNewClaimItems] = useState<Array<{sku: string, name: string, quantity: number}>>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [claimsData, warehouse, vexParts] = await Promise.all([
        loadClaims(),
        loadWarehouse(),
        loadVexParts()
      ]);
      setClaims(claimsData);
      setWarehouseData(warehouse);
      setVexPartsData(vexParts);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
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
      const claimItems: Array<{sku: string, name: string, quantity: number}> = [];
      
      // Skip header line, process all data lines
      for (let i = 1; i < lines.length; i++) {
        const [sku, qty, team] = lines[i].split(',').map(s => s.trim());
        if (sku && qty && vexPartsData[sku]) {
          const part = vexPartsData[sku];
          claimItems.push({
            sku,
            name: part.name,
            quantity: parseInt(qty) || 1
          });
        }
      }
      
      if (claimItems.length > 0) {
        const today = new Date().toLocaleDateString();
        const existingImportsToday = claims.filter(c => 
          c.teamName && c.teamName.includes(`Imported Claim ${today}`)
        ).length;
        
        const newClaim: Claim = {
          id: `CLM-${String(claims.length + 1).padStart(3, '0')}`,
          teamName: `Imported Claim ${today} ${existingImportsToday + 1}`,
          submittedDate: new Date().toISOString().split('T')[0],
          status: 'pending',
          items: claimItems,
          canFulfill: claimItems.every(item => 
            (warehouseData[item.sku]?.inventoryStock || 0) >= item.quantity
          )
        };
        
        const updatedClaims = [...claims, newClaim];
        setClaims(updatedClaims);
        await saveClaims(updatedClaims);
      }
    };
    
    input.click();
  };

  const filteredParts = Object.entries(vexPartsData).filter(([sku, part]) => 
    searchTerm && (
      sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  ).slice(0, 10);

  const addItemToClaim = () => {
    if (selectedSku && quantity && parseInt(quantity) > 0) {
      const part = vexPartsData[selectedSku];
      if (part) {
        setNewClaimItems([...newClaimItems, {
          sku: selectedSku,
          name: part.name,
          quantity: parseInt(quantity)
        }]);
        setSelectedSku("");
        setQuantity("");
        setSearchTerm("");
      }
    }
  };

  const removeItemFromClaim = (index: number) => {
    setNewClaimItems(newClaimItems.filter((_, i) => i !== index));
  };

  const updateItemQuantity = (index: number, newQuantity: number) => {
    if (newQuantity > 0) {
      setNewClaimItems(newClaimItems.map((item, i) => 
        i === index ? { ...item, quantity: newQuantity } : item
      ));
    }
  };

  const createClaim = async () => {
    if (newClaimTeam && newClaimItems.length > 0) {
      const newClaim: Claim = {
        id: `CLM-${String(claims.length + 1).padStart(3, '0')}`,
        teamName: newClaimTeam,
        submittedDate: new Date().toISOString().split('T')[0],
        status: 'pending',
        items: newClaimItems,
        canFulfill: newClaimItems.every(item => 
          (warehouseData[item.sku]?.inventoryStock || 0) >= item.quantity
        )
      };
      
      const updatedClaims = [...claims, newClaim];
      setClaims(updatedClaims);
      await saveClaims(updatedClaims);
      
      setShowCreateForm(false);
      setNewClaimTeam("");
      setNewClaimItems([]);
    }
  };

  const startEdit = (claimId: string) => {
    const claim = claims.find(c => c.id === claimId);
    if (claim && claim.status === 'pending') {
      setEditingClaim(claimId);
      setNewClaimTeam(claim.teamName);
      setNewClaimItems([...claim.items]);
    }
  };

  const saveEdit = async () => {
    if (editingClaim && newClaimTeam && newClaimItems.length > 0) {
      const updatedClaims = claims.map(claim => 
        claim.id === editingClaim 
          ? {
              ...claim,
              teamName: newClaimTeam,
              items: newClaimItems,
              canFulfill: newClaimItems.every(item => 
                (warehouseData[item.sku]?.inventoryStock || 0) >= item.quantity
              )
            }
          : claim
      );
      
      setClaims(updatedClaims);
      await saveClaims(updatedClaims);
      
      setEditingClaim(null);
      setNewClaimTeam("");
      setNewClaimItems([]);
    }
  };

  const cancelEdit = () => {
    setEditingClaim(null);
    setNewClaimTeam("");
    setNewClaimItems([]);
  };

  const handleApproveClaim = async (claimId: string) => {
    const claim = claims.find(c => c.id === claimId);
    if (!claim) return;

    const updatedWarehouse = { ...warehouseData };
    claim.items.forEach(item => {
      if (updatedWarehouse[item.sku]) {
        updatedWarehouse[item.sku].inventoryStock -= item.quantity;
      } else {
        const vexPart = vexPartsData[item.sku];
        if (vexPart) {
          updatedWarehouse[item.sku] = {
            ...vexPart,
            inventoryStock: -item.quantity
          };
        }
      }
    });

    const updatedClaims = claims.map(c => 
      c.id === claimId ? { ...c, status: 'approved' as const } : c
    );

    setWarehouseData(updatedWarehouse);
    setClaims(updatedClaims);
    await Promise.all([
      saveWarehouse(updatedWarehouse),
      saveClaims(updatedClaims)
    ]);
  };

  const handleReject = async (claimId: string) => {
    const updatedClaims = claims.filter(c => c.id !== claimId);
    setClaims(updatedClaims);
    await saveClaims(updatedClaims);
  };

  const getStockColor = (stock: number) => {
    if (stock < 0) return "text-red-600 dark:text-red-400";
    if (stock === 0) return "text-yellow-600 dark:text-yellow-400";
    return "text-foreground";
  };

  const pendingClaims = claims.filter(claim => claim.status === 'pending');
  const approvedClaims = claims.filter(claim => claim.status === 'approved');

  if (isLoading) {
    return <div className="flex items-center justify-center py-12 text-foreground">Loading claims...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Claims</h2>
          <p className="text-muted-foreground">Review and manage team part requests</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleImportCSV}>
            <Upload className="h-4 w-4 mr-2" />
            Import Claims CSV
          </Button>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Claim
          </Button>
        </div>
      </div>

      {(showCreateForm || editingClaim) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingClaim ? 'Edit Claim' : 'Create New Claim'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Team Name"
              value={newClaimTeam}
              onChange={(e) => setNewClaimTeam(e.target.value)}
            />
            
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <Input
                  placeholder="Search by SKU or part name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {filteredParts.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-popover border border-border rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                    {filteredParts.map(([sku, part]) => (
                      <div
                        key={sku}
                        className="p-2 hover:bg-accent cursor-pointer text-popover-foreground"
                        onClick={() => {
                          setSelectedSku(sku);
                          setSearchTerm(`VEX-${sku} - ${part.name}`);
                        }}
                      >
                        <div className="font-mono text-sm">VEX-{sku}</div>
                        <div className="text-sm text-muted-foreground">{part.name}</div>
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
              <Button onClick={addItemToClaim}>Add</Button>
            </div>

            {newClaimItems.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">Items in Claim:</h4>
                {newClaimItems.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="text-foreground"><span className="font-mono">VEX-{item.sku}</span> - {item.name}</span>
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
                        onClick={() => removeItemFromClaim(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex space-x-2">
              <Button 
                onClick={editingClaim ? saveEdit : createClaim} 
                disabled={!newClaimTeam || newClaimItems.length === 0}
              >
                {editingClaim ? 'Save Changes' : 'Create Claim'}
              </Button>
              <Button 
                variant="outline" 
                onClick={editingClaim ? cancelEdit : () => setShowCreateForm(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Claims */}
      {pendingClaims.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Pending Claims</h3>
          {pendingClaims.map((claim) => (
            <Card key={claim.id} className={highlightedClaim === claim.id ? "ring-2 ring-blue-500" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                      <CardTitle className="text-lg">{claim.id}</CardTitle>
                      <CardDescription>
                        {claim.teamName} • Submitted {new Date(claim.submittedDate).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {!claim.canFulfill && (
                      <Badge variant="destructive" className="text-xs">
                        Insufficient Stock
                      </Badge>
                    )}
                    <Badge variant="secondary">Pending</Badge>
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => startEdit(claim.id)}
                        disabled={editingClaim === claim.id}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleReject(claim.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleApproveClaim(claim.id)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
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
                      <TableHead className="text-right">Current Stock</TableHead>
                      <TableHead className="text-right">Requested</TableHead>
                      <TableHead className="text-right">After Approval</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {claim.items.map((item, index) => {
                      const currentStock = warehouseData[item.sku]?.inventoryStock || 0;
                      const afterApproval = currentStock - item.quantity;
                      return (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-sm">VEX-{item.sku}</TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell className={`text-right font-medium ${getStockColor(currentStock)}`}>
                            {currentStock}
                          </TableCell>
                          <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                          <TableCell className={`text-right font-medium ${getStockColor(afterApproval)}`}>
                            {afterApproval}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Approved Claims */}
      {approvedClaims.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Approved Claims</h3>
          {approvedClaims.map((claim) => (
            <Card key={claim.id} className={highlightedClaim === claim.id ? "ring-2 ring-blue-500" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-green-600" />
                    <div>
                      <CardTitle className="text-lg">{claim.id}</CardTitle>
                      <CardDescription>
                        {claim.teamName} • Submitted {new Date(claim.submittedDate).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Approved</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Part Name</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {claim.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm">VEX-{item.sku}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {claims.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No claims found</h3>
          <p className="text-muted-foreground">Create a new claim or import from CSV</p>
        </div>
      )}
    </div>
  );
}
