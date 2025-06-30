
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Folder, CheckCircle, AlertCircle } from "lucide-react";
import { requestDirectoryAccess, hasDirectoryAccess } from "@/utils/fileSystemManager";
import { ThemeToggle } from "./ThemeToggle";

interface SetupDialogProps {
  onComplete: () => void;
}

export function SetupDialog({ onComplete }: SetupDialogProps) {
  const [directorySelected, setDirectorySelected] = useState(hasDirectoryAccess());
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectDirectory = async () => {
    setIsLoading(true);
    const success = await requestDirectoryAccess();
    if (success) {
      setDirectorySelected(true);
    } else {
      alert('Failed to access directory. Make sure your browser supports the File System Access API.');
    }
    setIsLoading(false);
  };

  const canContinue = directorySelected;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <CardHeader>
          <CardTitle>StockV5 Setup</CardTitle>
          <CardDescription>
            Set up your inventory management system by selecting a storage folder.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This app uses local file storage. Your browser must support the File System Access API.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Folder className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-medium">Select Storage Folder</div>
                  <div className="text-sm text-gray-500">Choose where to store your data</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {directorySelected && <CheckCircle className="h-5 w-5 text-green-600" />}
                <Button 
                  variant={directorySelected ? "outline" : "default"}
                  size="sm"
                  onClick={handleSelectDirectory}
                  disabled={isLoading}
                >
                  {directorySelected ? "Selected" : "Select"}
                </Button>
              </div>
            </div>
          </div>

          <Button 
            className="w-full" 
            onClick={onComplete}
            disabled={!canContinue || isLoading}
          >
            Continue to Inventory System
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
