
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";

interface VexPart {
  name: string;
  price: string;
  url: string;
  stock: boolean;
  thumbnail: string;
  type: string;
}

interface AddPartsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  vexPartsData: Record<string, VexPart>;
  onAddParts: (parts: Array<{sku: string, totalStock: number, available: number}>) => void;
}

export function AddPartsDialog({ isOpen, onClose, vexPartsData, onAddParts }: AddPartsDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedParts, setSelectedParts] = useState<Array<{sku: string, name: string, totalStock: number, available: number}>>([]);

  if (!isOpen) return null;

  const filteredParts = Object.entries(vexPartsData).filter(([sku, part]) => 
    searchTerm && (
      sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  ).slice(0, 10);

  const addPart = (sku: string, part: VexPart) => {
    if (!selectedParts.find(p => p.sku === sku)) {
      setSelectedParts([...selectedParts, {
        sku,
        name: part.name,
        totalStock: 0,
        available: 0
      }]);
    }
    setSearchTerm("");
  };

  const updatePartQuantity = (sku: string, field: 'totalStock' | 'available', value: number) => {
    setSelectedParts(selectedParts.map(part => 
      part.sku === sku ? { ...part, [field]: value } : part
    ));
  };

  const removePart = (sku: string) => {
    setSelectedParts(selectedParts.filter(part => part.sku !== sku));
  };

  const handleSubmit = () => {
    const validParts = selectedParts.filter(part => part.totalStock > 0 && part.available >= 0 && part.available <= part.totalStock);
    if (validParts.length > 0) {
      onAddParts(validParts);
      setSelectedParts([]);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Add Parts to Warehouse</CardTitle>
              <CardDescription>Search and add VEX parts to your inventory</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
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
                    onClick={() => addPart(sku, part)}
                  >
                    <div className="font-mono text-sm">{sku}</div>
                    <div className="text-sm text-gray-600">{part.name}</div>
                    <div className="text-xs text-gray-500">{part.type} • {part.price}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedParts.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Selected Parts:</h4>
              {selectedParts.map((part) => (
                <div key={part.sku} className="flex items-center space-x-3 p-3 bg-gray-50 rounded">
                  <div className="flex-1">
                    <div className="font-mono text-sm">{part.sku}</div>
                    <div className="text-sm text-gray-600">{part.name}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-xs text-gray-500">Total:</div>
                    <Input
                      type="number"
                      min="0"
                      value={part.totalStock}
                      onChange={(e) => updatePartQuantity(part.sku, 'totalStock', parseInt(e.target.value) || 0)}
                      className="w-20"
                    />
                    <div className="text-xs text-gray-500">Available:</div>
                    <Input
                      type="number"
                      min="0"
                      max={part.totalStock}
                      value={part.available}
                      onChange={(e) => updatePartQuantity(part.sku, 'available', parseInt(e.target.value) || 0)}
                      className="w-20"
                    />
                    <Button variant="ghost" size="sm" onClick={() => removePart(part.sku)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex space-x-2">
            <Button 
              onClick={handleSubmit} 
              disabled={selectedParts.length === 0 || !selectedParts.every(p => p.totalStock > 0 && p.available >= 0 && p.available <= p.totalStock)}
            >
              Add Parts
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
