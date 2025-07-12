
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, AlertCircle } from "lucide-react";

interface UploadArchiveProps {
  onArchiveLoaded: (preset: any) => void;
}

export function UploadArchive({ onArchiveLoaded }: UploadArchiveProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "application/json") {
      setFile(selectedFile);
      setError("");
    } else {
      setError("Please select a valid JSON file");
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Read the file content
      const fileContent = await file.text();
      const preset = JSON.parse(fileContent);

      // Pass the preset data to the parent component
      onArchiveLoaded(preset);
      
      setIsOpen(false);
      setFile(null);
    } catch (error) {
      console.error('Upload error:', error);
      setError('Failed to process archive file');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Upload Archive
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Organization Archive</DialogTitle>
          <DialogDescription>
            Select a JSON archive file to load organization data
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Input
            type="file"
            accept=".json"
            onChange={handleFileChange}
            disabled={isLoading}
          />
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpload}
            disabled={isLoading || !file}
          >
            {isLoading ? "Loading..." : "Load Archive"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
