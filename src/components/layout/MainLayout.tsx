
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import Header from "@/components/layout/Header";
import { useEffect } from "react";
import { initializeSampleData } from "@/lib/attendance";

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const { toast } = useToast();

  useEffect(() => {
    // Initialize sample data on first load
    initializeSampleData();
    
    // Show welcome toast
    toast({
      title: "Welcome to Attendance Manager",
      description: "Sample data has been loaded for demonstration purposes.",
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300">
      <Header />
      <main className="flex-1 container mx-auto px-4 pb-12 animate-fade-in">
        {children}
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} School Attendance Manager</p>
      </footer>
      <Toaster />
    </div>
  );
};

export default MainLayout;
