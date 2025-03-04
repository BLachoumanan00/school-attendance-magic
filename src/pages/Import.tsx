
import MainLayout from "@/components/layout/MainLayout";
import CSVImport from "@/components/attendance/CSVImport";
import { Button } from "@/components/ui/button";
import { ImportResult } from "@/lib/types";
import { addStudents, clearStudents } from "@/lib/attendance";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";

const Import = () => {
  const [importCount, setImportCount] = useState(0);
  const { toast } = useToast();

  const handleImportSuccess = (result: ImportResult) => {
    if (result.success && result.data) {
      addStudents(result.data);
      setImportCount(prevCount => prevCount + result.data.length);
    }
  };

  const handleClearData = () => {
    clearStudents();
    setImportCount(0);
    toast({
      title: "Data cleared",
      description: "All student and attendance data has been removed",
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1">Import Students</h1>
            <p className="text-muted-foreground">
              Import student data from CSV files
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all student and attendance data. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearData}>
                  Continue
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <CSVImport onImportSuccess={handleImportSuccess} />

        {importCount > 0 && (
          <div className="text-center text-sm text-muted-foreground animate-fade-in">
            You have imported {importCount} students in this session.
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Import;
