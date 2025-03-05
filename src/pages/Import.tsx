
import MainLayout from "@/components/layout/MainLayout";
import CSVImport from "@/components/attendance/CSVImport";
import { Button } from "@/components/ui/button";
import { ImportResult } from "@/lib/types";
import { addStudents, clearStudents } from "@/lib/supabaseService";
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
import { useAuth } from "@/contexts/AuthContext";

const Import = () => {
  const [importCount, setImportCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleImportSuccess = async (result: ImportResult) => {
    if (result.success && result.data) {
      try {
        setLoading(true);
        await addStudents(result.data);
        setImportCount(prevCount => prevCount + result.data.length);
        toast({
          title: "Import Successful",
          description: `Successfully imported ${result.data.length} students.`,
        });
      } catch (error: any) {
        toast({
          title: "Import Error",
          description: error.message || "An error occurred while importing students.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleClearData = async () => {
    try {
      setLoading(true);
      await clearStudents();
      setImportCount(0);
      toast({
        title: "Data cleared",
        description: "All student and attendance data has been removed",
      });
    } catch (error: any) {
      toast({
        title: "Error clearing data",
        description: error.message || "An error occurred while clearing data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
              <Button variant="destructive" size="sm" disabled={loading}>
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
                <AlertDialogAction onClick={handleClearData} disabled={loading}>
                  {loading ? "Processing..." : "Continue"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <CSVImport onImportSuccess={handleImportSuccess} isLoading={loading} />

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
