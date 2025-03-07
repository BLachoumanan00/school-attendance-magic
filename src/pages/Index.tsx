
import React, { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import StatCard from "@/components/dashboard/StatCard";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import StudentList from "@/components/attendance/StudentList";
import { Calendar, Check, Users, XCircle, Percent, RefreshCw } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  getTotalAbsences, 
  getTotalAttendanceByClass, 
  getTotalPresences, 
  getTodayAttendance 
} from "@/lib/attendanceSupabase";
import { AttendanceSummary, ClassSummary, Student } from "@/lib/types";

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
};

const Index = () => {
  const [currentDate] = useState(new Date());
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch all active students (not deleted)
  const { data: students = [], isLoading: isLoadingStudents } = useQuery({
    queryKey: ['students-dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .is('deleted_at', null); // Only fetch active students
      
      if (error) throw error;
      
      // Transform the data to match our Student type
      return data.map(student => ({
        id: student.id,
        firstName: student.first_name,
        lastName: student.last_name,
        class: student.class,
        gradeLevel: student.grade_level,
        studentId: student.student_id,
        email: student.email,
        contactPhone: student.contact_phone,
        deletedAt: student.deleted_at
      })) as Student[];
    },
    meta: {
      onError: (error: any) => {
        toast({
          title: "Error loading students",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  });

  // Fetch attendance summary
  const { data: attendanceSummary, isLoading: isLoadingAttendance } = useQuery({
    queryKey: ['attendance-summary'],
    queryFn: async (): Promise<{
      total: number;
      presentToday: number;
      totalPresences: number;
      totalAbsences: number;
      presentPercentage: number;
    }> => {
      if (!students.length) return { total: 0, presentToday: 0, totalPresences: 0, totalAbsences: 0, presentPercentage: 0 };
      
      const totalStudents = students.length;
      const presentToday = await getTodayAttendance(students);
      const totalPresences = await getTotalPresences(students);
      const totalAbsences = await getTotalAbsences(students);
      
      // Calculate percentage of students present today
      const presentPercentage = totalStudents > 0 
        ? Math.round((presentToday / totalStudents) * 100) 
        : 0;
      
      return {
        total: totalStudents,
        presentToday,
        totalPresences,
        totalAbsences,
        presentPercentage,
      };
    },
    enabled: students.length > 0,
    meta: {
      onError: (error: any) => {
        toast({
          title: "Error loading attendance summary",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  });

  // Fetch class summaries
  const { data: classSummaries = [], isLoading: isLoadingClasses } = useQuery({
    queryKey: ['class-summaries'],
    queryFn: async () => {
      if (!students.length) return [];
      return await getTotalAttendanceByClass(students);
    },
    enabled: students.length > 0,
    meta: {
      onError: (error: any) => {
        toast({
          title: "Error loading class summaries",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  });

  // Refresh all data
  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['students-dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['attendance-summary'] });
      await queryClient.invalidateQueries({ queryKey: ['class-summaries'] });
      
      toast({
        title: "Data refreshed",
        description: "The dashboard data has been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error refreshing data",
        description: error.message || "An error occurred while refreshing data.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const isLoading = isLoadingStudents || isLoadingAttendance || isLoadingClasses || isRefreshing;

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button 
            onClick={refreshData} 
            variant="outline" 
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
          <Link to="/students" className="block">
            <StatCard
              title="Total Students"
              value={attendanceSummary?.total || 0}
              icon={<Users className="h-5 w-5" />}
              isLoading={isLoading}
            />
          </Link>
          <Link to="/students" className="block">
            <StatCard
              title="Present Today"
              value={attendanceSummary?.presentToday || 0}
              icon={<Check className="h-5 w-5" />}
              isLoading={isLoading}
            />
          </Link>
          <Link to="/students" className="block">
            <StatCard
              title="Attendance %"
              value={`${attendanceSummary?.presentPercentage || 0}%`}
              icon={<Percent className="h-5 w-5" />}
              isLoading={isLoading}
            />
          </Link>
          <Link to="/students" className="block">
            <StatCard
              title="Total Presences"
              value={attendanceSummary?.totalPresences || 0}
              icon={<Calendar className="h-5 w-5" />}
              isLoading={isLoading}
            />
          </Link>
          <Link to="/students" className="block">
            <StatCard
              title="Total Absences"
              value={attendanceSummary?.totalAbsences || 0}
              icon={<XCircle className="h-5 w-5" />}
              isLoading={isLoading}
            />
          </Link>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">Today is {formatDate(currentDate)}</h2>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-3">Attendance by Class</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classSummaries.map((classSummary) => (
              <Link to="/students" key={classSummary.className} className="block">
                <StatCard
                  key={classSummary.className}
                  title={classSummary.className}
                  value={classSummary.presentCount || 0}
                  icon={<Users className="h-5 w-5" />}
                  description={`${classSummary.presentCount || 0} / ${classSummary.totalStudents} Present`}
                  isLoading={isLoading}
                />
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-3">Student List</h2>
          {students.length > 0 ? (
            <StudentList students={students} isLoading={isLoading} />
          ) : (
            <p>No students found. Import students first.</p>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
