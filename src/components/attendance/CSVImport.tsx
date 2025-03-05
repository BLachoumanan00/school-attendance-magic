
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { parseCSV, downloadCSVTemplate } from "@/lib/importUtils";
import { ImportResult } from "@/lib/types";
import { useState, useRef } from "react";
import { Upload, Download, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface CSVImportProps {
  onImportSuccess: (result: ImportResult) => void;
  isLoading?: boolean;
}

const CSVImport = ({ onImportSuccess, isLoading = false }: CSVImportProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [localLoading, setLocalLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    setImportResult(null);
  };

  const handleImport = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to import",
        variant: "destructive",
      });
      return;
    }

    try {
      setLocalLoading(true);
      const text = await file.text();
      const result = parseCSV(text);
      setImportResult(result);
      
      if (result.success) {
        onImportSuccess(result);
      } else {
        toast({
          title: "Import failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error reading file:", error);
      toast({
        title: "Import failed",
        description: "Error reading the CSV file",
        variant: "destructive",
      });
    } finally {
      setLocalLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    downloadCSVTemplate();
    toast({
      title: "Template downloaded",
      description: "CSV template has been downloaded to your device",
    });
  };

  const loading = isLoading || localLoading;

  return (
    <Card className="w-full max-w-3xl mx-auto animate-slide-up">
      <CardHeader>
        <CardTitle>Import Students from CSV</CardTitle>
        <CardDescription>
          Upload a CSV file with student data or download a template to get started.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="col-span-2">
              <Input 
                ref={fileInputRef}
                type="file" 
                accept=".csv" 
                onChange={handleFileChange}
                className="cursor-pointer"
                disabled={loading}
              />
            </div>
            <div className="flex space-x-2">
              <Button 
                onClick={handleImport} 
                disabled={!file || loading}
                className="flex-1"
              >
                {loading ? (
                  <span className="flex items-center">
                    <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                    Importing...
                  </span>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import
                  </>
                )}
              </Button>
            </div>
          </div>
          
          <div className="flex justify-center">
            <Button variant="outline" onClick={handleDownloadTemplate} disabled={loading}>
              <Download className="mr-2 h-4 w-4" />
              Download CSV Template
            </Button>
          </div>
        </div>

        {importResult && (
          <Alert variant={importResult.success ? "default" : "destructive"}>
            <div className="flex items-center gap-2">
              {importResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>{importResult.success ? "Success" : "Error"}</AlertTitle>
            </div>
            <AlertDescription>{importResult.message}</AlertDescription>
            
            {importResult.errors && importResult.errors.length > 0 && (
              <div className="mt-2 max-h-32 overflow-y-auto text-sm">
                <p className="font-medium">Errors:</p>
                <ul className="list-disc list-inside">
                  {importResult.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </Alert>
        )}
        
        <div className="rounded border p-4 bg-muted/30">
          <h3 className="font-medium mb-2">Required CSV Format</h3>
          <p className="text-sm mb-2">
            Your CSV file must include these required headers:
          </p>
          <ul className="text-sm list-disc list-inside">
            <li><code>studentId</code> - A unique identifier</li>
            <li><code>firstName</code> - Student's first name</li>
            <li><code>lastName</code> - Student's last name</li>
            <li><code>class</code> - Class/section (e.g., "10A")</li>
            <li><code>gradeLevel</code> - Numeric grade level (e.g., 10)</li>
          </ul>
          <p className="text-sm mt-2">
            Optional fields: <code>email</code>, <code>contactPhone</code>
          </p>
        </div>
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        All imported data is stored securely in a database and only accessible by authorized users.
      </CardFooter>
    </Card>
  );
};

export default CSVImport;
