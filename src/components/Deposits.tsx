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
import { Plus, Upload, Check, X, Trash2, Edit, Loader2 } from "lucide-react";
import { 
  loadDeposits,
  createDeposit,
  modifyDeposit,
  approveDeposit,
  deleteDeposit,
  loadWarehouse,
  loadVexParts,
  type Deposit,
  type WarehouseData,
  type VexPartsData 
} from "@/utils/backendService";
import { useImportCsv } from '../hooks/use-import-csv';

interface DepositsProps {
  highlightedDeposit?: string;
  onNavigate?: (path: string) => void;
  onWarehouseUpdate?: () => void;
}

export function Deposits({ highlightedDeposit, onNavigate, onWarehouseUpdate }: DepositsProps) {
  const { orgId } = useParams<{ orgId: string }>();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [warehouseData, setWarehouseData] = useState<WarehouseData>({});
  const [vexPartsData, setVexPartsData] = useState<VexPartsData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [processingDeposits, setProcessingDeposits] = useState<Set<string>>(new Set());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingDeposit, setEditingDeposit] = useState<string | null>(null);
  const [newDepositTeam, setNewDepositTeam] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSku, setSelectedSku] = useState("");
  const [quantity, setQuantity] = useState("");
  const [newDepositItems, setNewDepositItems] = useState<Array<{sku: string, name: string, quantity: number}>>([]);
  const [csvType, setCsvType] = useState("");

  useEffect(() => {
    if (orgId) {
      loadData();
    }
  }, [orgId]);

  const loadData = async () => {
    if (!orgId) return;
    
    try {
      const [depositsData, warehouse, vexParts] = await Promise.all([
        loadDeposits(orgId),
        loadWarehouse(orgId),
        loadVexParts()
      ]);
      setDeposits(depositsData);
      setWarehouseData(warehouse);
      setVexPartsData(vexParts);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const importDeposits = useImportCsv<Deposit>({
    prefix: 'Deposit',
    list: deposits,
    setList: setDeposits,
    saveList: async () => {}, // Not used anymore
    partData: vexPartsData,
    csvType: csvType as 'stockv5' | 'onshape' | 'default',
    createRecord: async (name: string, data: any) => {
      if (!orgId) throw new Error('No organization ID');
      await createDeposit(orgId, name, data);
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

  const addItemToDeposit = () => {
    if (selectedSku && quantity && parseInt(quantity) > 0) {
      const part = vexPartsData[selectedSku];
      if (part) {
        setNewDepositItems([...newDepositItems, {
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

  const removeItemFromDeposit = (index: number) => {
    setNewDepositItems(newDepositItems.filter((_, i) => i !== index));
  };

  const updateItemQuantity = (index: number, newQuantity: number) => {
    if (newQuantity > 0) {
      setNewDepositItems(newDepositItems.map((item, i) => 
        i === index ? { ...item, quantity: newQuantity } : item
      ));
    }
  };

  const createNewDeposit = async () => {
    if (!orgId || !newDepositTeam || newDepositItems.length === 0) return;

    const depositData = {
      teamName: newDepositTeam,
      submittedDate: new Date().toISOString().split('T')[0],
      items: newDepositItems
    };

    await createDeposit(orgId, `Deposit by ${newDepositTeam}`, depositData);
    
    setShowCreateForm(false);
    setNewDepositTeam("");
    setNewDepositItems([]);
    loadData();
  };

  const startEdit = (depositId: string) => {
    const deposit = deposits.find(d => d.id === depositId);
    if (deposit && deposit.status === 'pending') {
      setEditingDeposit(depositId);
      setNewDepositTeam(deposit.data.teamName);
      setNewDepositItems([...deposit.data.items]);
    }
  };

  const saveEdit = async () => {
    if (!orgId || !editingDeposit || !newDepositTeam || newDepositItems.length === 0) return;

    const depositData = {
      teamName: newDepositTeam,
      submittedDate: new Date().toISOString().split('T')[0],
      items: newDepositItems
    };

    await modifyDeposit(orgId, editingDeposit, depositData);
    
    setEditingDeposit(null);
    setNewDepositTeam("");
    setNewDepositItems([]);
    loadData();
  };

  const cancelEdit = () => {
    setEditingDeposit(null);
    setNewDepositTeam("");
    setNewDepositItems([]);
  };

  const handleApproveDeposit = async (depositId: string) => {
    if (!orgId || processingDeposits.has(depositId)) return;

    setProcessingDeposits(prev => new Set(prev).add(depositId));

    try {
      await approveDeposit(orgId, depositId);
      await loadData();
      // Notify parent component that warehouse was updated
      if (onWarehouseUpdate) {
        onWarehouseUpdate();
      }
    } catch (error) {
      console.error('Failed to approve deposit:', error);
    } finally {
      setProcessingDeposits(prev => {
        const newSet = new Set(prev);
        newSet.delete(depositId);
        return newSet;
      });
    }
  };

  const handleReject = async (depositId: string) => {
    if (!orgId || processingDeposits.has(depositId)) return;

    setProcessingDeposits(prev => new Set(prev).add(depositId));

    try {
      await deleteDeposit(orgId, depositId);
      await loadData();
    } catch (error) {
      console.error('Failed to reject deposit:', error);
    } finally {
      setProcessingDeposits(prev => {
        const newSet = new Set(prev);
        newSet.delete(depositId);
        return newSet;
      });
    }
  };

  const getStockColor = (stock: number) => {
    if (stock < 0) return "text-red-600 dark:text-red-400";
    if (stock === 0) return "text-yellow-600 dark:text-yellow-400";
    return "text-foreground";
  };

  const pendingDeposits = deposits.filter(deposit => deposit.status === 'pending');
  const approvedDeposits = deposits.filter(deposit => deposit.status === 'approved');

  if (isLoading) {
    return <div className="flex items-center justify-center py-12">Loading deposits...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Deposits</h2>
          <p className="text-gray-600">Process returned parts and inventory additions</p>
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
          <Button variant="outline" onClick={importDeposits}>
            <Upload className="h-4 w-4 mr-2" />
            Import Deposits CSV
          </Button>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Deposit
          </Button>
        </div>
      </div>

      {(showCreateForm || editingDeposit) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingDeposit ? 'Edit Deposit' : 'Create New Deposit'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Team Name"
              value={newDepositTeam}
              onChange={(e) => setNewDepositTeam(e.target.value)}
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
              <Button onClick={addItemToDeposit}>Add</Button>
            </div>

            {newDepositItems.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Items in Deposit:</h4>
                {newDepositItems.map((item, index) => (
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
                        onClick={() => removeItemFromDeposit(index)}
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
                onClick={editingDeposit ? saveEdit : createNewDeposit} 
                disabled={!newDepositTeam || newDepositItems.length === 0}
              >
                {editingDeposit ? 'Save Changes' : 'Create Deposit'}
              </Button>
              <Button 
                variant="outline" 
                onClick={editingDeposit ? cancelEdit : () => setShowCreateForm(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Deposits */}
      {pendingDeposits.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Pending Deposits</h3>
          {pendingDeposits.map((deposit) => {
            const isProcessing = processingDeposits.has(deposit.id);
            return (
              <Card key={deposit.id} className={highlightedDeposit === deposit.id ? "ring-2 ring-blue-500" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Plus className="h-5 w-5 text-green-600" />
                      <div>
                        <CardTitle className="text-lg">{deposit.name}</CardTitle>
                        <CardDescription>
                          {deposit.data.teamName} • Submitted {new Date(deposit.data.submittedDate).toLocaleDateString()}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge variant="secondary">Pending</Badge>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => startEdit(deposit.id)}
                          disabled={editingDeposit === deposit.id || isProcessing}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleReject(deposit.id)}
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
                          onClick={() => handleApproveDeposit(deposit.id)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 mr-1" />
                          )}
                          Process
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
                        <TableHead className="text-right">Deposit Quantity</TableHead>
                        <TableHead className="text-right">After Processing</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deposit.data.items.map((item, index) => {
                        const currentAvailable = warehouseData[item.sku]?.inventoryStock || 0;
                        const afterProcessing = currentAvailable + item.quantity;
                        return (
                          <TableRow key={index}>
                            <TableCell className="font-mono text-sm">VEX-{item.sku}</TableCell>
                            <TableCell>{item.name}</TableCell>
                            <TableCell className={`text-right font-medium ${getStockColor(currentAvailable)}`}>
                              {currentAvailable}
                            </TableCell>
                            <TableCell className="text-right font-medium text-green-600">+{item.quantity}</TableCell>
                            <TableCell className={`text-right font-medium ${getStockColor(afterProcessing)}`}>
                              {afterProcessing}
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

      {/* Approved Deposits */}
      {approvedDeposits.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Processed Deposits</h3>
          {approvedDeposits.map((deposit) => (
            <Card key={deposit.id} className={highlightedDeposit === deposit.id ? "ring-2 ring-blue-500" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Plus className="h-5 w-5 text-green-600" />
                    <div>
                      <CardTitle className="text-lg">{deposit.name}</CardTitle>
                      <CardDescription>
                        {deposit.data.teamName} • Submitted {new Date(deposit.data.submittedDate).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Processed</Badge>
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
                    {deposit.data.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm">VEX-{item.sku}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-right font-medium text-green-600">+{item.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {deposits.length === 0 && (
        <div className="text-center py-12">
          <Plus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No deposits found</h3>
          <p className="text-gray-500">Create a new deposit or import from CSV</p>
        </div>
      )}
    </div>
  );
}
