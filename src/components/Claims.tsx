import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Upload, Check, X, Trash2, Edit, Minus, Loader2 } from "lucide-react";
import { 
  loadClaims,
  createClaim,
  modifyClaim,
  approveClaim,
  deleteClaim,
  loadWarehouse,
  loadVexParts,
  type Claim,
  type WarehouseData,
  type VexPartsData 
} from "@/utils/backendService";
import { useImportCsv } from '../hooks/use-import-csv';

interface ClaimsProps {
  highlightedClaim?: string;
  onNavigate?: (path: string) => void;
  onWarehouseUpdate?: () => void;
}

export function Claims({ highlightedClaim, onNavigate, onWarehouseUpdate }: ClaimsProps) {
  const { orgId } = useParams<{ orgId: string }>();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [warehouseData, setWarehouseData] = useState<WarehouseData>({});
  const [vexPartsData, setVexPartsData] = useState<VexPartsData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [processingClaims, setProcessingClaims] = useState<Set<string>>(new Set());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingClaim, setEditingClaim] = useState<string | null>(null);
  const [newClaimTeam, setNewClaimTeam] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSku, setSelectedSku] = useState("");
  const [quantity, setQuantity] = useState("");
  const [newClaimItems, setNewClaimItems] = useState<Array<{sku: string, name: string, quantity: number}>>([]);
  const [csvType, setCsvType] = useState("");

  useEffect(() => {
    if (orgId) {
      loadData();
    }
  }, [orgId]);

  const loadData = async () => {
    if (!orgId) return;
    
    try {
      const [claimsData, warehouse, vexParts] = await Promise.all([
        loadClaims(orgId),
        loadWarehouse(orgId),
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

  const importClaims = useImportCsv<Claim>({
    prefix: 'Claim',
    list: claims,
    setList: setClaims,
    saveList: async () => {}, // Not used anymore
    partData: vexPartsData,
    stockData: warehouseData,
    csvType: csvType as 'stockv5' | 'onshape' | 'default',
    createRecord: async (name: string, data: any) => {
      if (!orgId) throw new Error('No organization ID');
      await createClaim(orgId, name, data);
      // Reload data after creating
      await loadData();
    }
  });

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

  const createNewClaim = async () => {
    if (!orgId || !newClaimTeam || newClaimItems.length === 0) return;

    const claimData = {
      teamName: newClaimTeam,
      submittedDate: new Date().toISOString().split('T')[0],
      items: newClaimItems,
      canFulfill: newClaimItems.every(item => 
        warehouseData[item.sku] && warehouseData[item.sku].inventoryStock >= item.quantity
      )
    };

    await createClaim(orgId, `Claim by ${newClaimTeam}`, claimData);
    
    setShowCreateForm(false);
    setNewClaimTeam("");
    setNewClaimItems([]);
    loadData();
  };

  const handleApproveClaim = async (claimId: string) => {
    if (!orgId || processingClaims.has(claimId)) return;

    setProcessingClaims(prev => new Set(prev).add(claimId));

    try {
      await approveClaim(orgId, claimId);
      await loadData();
      // Notify parent component that warehouse was updated
      if (onWarehouseUpdate) {
        onWarehouseUpdate();
      }
    } catch (error) {
      console.error('Failed to approve claim:', error);
    } finally {
      setProcessingClaims(prev => {
        const newSet = new Set(prev);
        newSet.delete(claimId);
        return newSet;
      });
    }
  };

  const handleReject = async (claimId: string) => {
    if (!orgId || processingClaims.has(claimId)) return;

    setProcessingClaims(prev => new Set(prev).add(claimId));

    try {
      await deleteClaim(orgId, claimId);
      await loadData();
    } catch (error) {
      console.error('Failed to reject claim:', error);
    } finally {
      setProcessingClaims(prev => {
        const newSet = new Set(prev);
        newSet.delete(claimId);
        return newSet;
      });
    }
  };

  const getStockColor = (stock: number) => {
    if (stock < 0) return "text-red-600 dark:text-red-400";
    if (stock === 0) return "text-yellow-600 dark:text-yellow-400";
    return "text-foreground";
  };

  const pendingClaims = claims.filter(claim => claim.status === 'pending');
  const approvedClaims = claims.filter(claim => claim.status === 'approved');

  if (isLoading) {
    return <div className="flex items-center justify-center py-12">Loading claims...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Claims</h2>
          <p className="text-gray-600">Process part requests and inventory claims</p>
        </div>
        <div className="flex space-x-2">

    	  <Select value={csvType} onValueChange={setCsvType}>
      	    <SelectTrigger>
              <SelectValue placeholder="Choose a CSV Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stockv5">StockV5</SelectItem>
              <SelectItem value="onshape">Onshape</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={importClaims}>
            <Upload className="h-4 w-4 mr-2" />
            Import Claims CSV
          </Button>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Claim
          </Button>
        </div>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Claim</CardTitle>
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
              <Button onClick={addItemToClaim}>Add</Button>
            </div>

            {newClaimItems.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Items in Claim:</h4>
                {newClaimItems.map((item, index) => (
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
                onClick={createNewClaim} 
                disabled={!newClaimTeam || newClaimItems.length === 0}
              >
                Create Claim
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
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
          {pendingClaims.map((claim) => {
            const isProcessing = processingClaims.has(claim.id);
            return (
              <Card key={claim.id} className={highlightedClaim === claim.id ? "ring-2 ring-blue-500" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Minus className="h-5 w-5 text-red-600" />
                      <div>
                        <CardTitle className="text-lg">{claim.name}</CardTitle>
                        <CardDescription>
                          {claim.data.teamName} • Submitted {new Date(claim.data.submittedDate).toLocaleDateString()}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge variant="secondary">Pending</Badge>
                      {claim.data.canFulfill ? (
                        <Badge className="bg-green-100 text-green-800">Can Fulfill</Badge>
                      ) : (
                        <Badge variant="destructive">Will Create Negative Stock</Badge>
                      )}
                      <div className="flex space-x-2">
                        
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleReject(claim.id)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <X className="h-4 w-4 mr-1" />
                          )}
                          Reject
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleApproveClaim(claim.id)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 mr-1" />
                          )}
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
                        <TableHead className="text-right">Available</TableHead>
                        <TableHead className="text-right">Requested</TableHead>
                        <TableHead className="text-right">After Approval</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {claim.data.items.map((item, index) => {
                        const currentAvailable = warehouseData[item.sku]?.inventoryStock || 0;
                        const afterApproval = currentAvailable - item.quantity;
                        
                        return (
                          <TableRow key={index}>
                            <TableCell className="font-mono text-sm">VEX-{item.sku}</TableCell>
                            <TableCell>{item.name}</TableCell>
                            <TableCell className={`text-right font-medium ${getStockColor(currentAvailable)}`}>
                              {currentAvailable}
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
            );
          })}
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
                    <Minus className="h-5 w-5 text-red-600" />
                    <div>
                      <CardTitle className="text-lg">{claim.name}</CardTitle>
                      <CardDescription>
                        {claim.data.teamName} • Submitted {new Date(claim.data.submittedDate).toLocaleDateString()}
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
                    {claim.data.items.map((item, index) => (
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
          <Minus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No claims found</h3>
          <p className="text-gray-500">Create a new claim to get started</p>
        </div>
      )}
    </div>
  );
}
