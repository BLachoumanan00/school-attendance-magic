import React, { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import StatCard from "@/components/dashboard/StatCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Students as StudentsGrid } from "@/components/attendance/StudentList";
import { Calendar, Check, Users, XCircle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { 
  getTotalAbsences, 
  getTotalAttendanceByClass, 
  getTotalPresences, 
  getTodayAttendance 
} from "@/lib/attendance";
import { AttendanceSummary, ClassSummary, Student } from "@/lib/types";

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
};

const Index = () => {
  const [currentDate] = useState(new Date());

  // Fetch all students
  const { data: students = [], isLoading: isLoadingStudents } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase.from('students').select('*');
      if (error) throw error;
      return data as Student[];
    },
    onSuccess: () => {
      console.log('Students loaded successfully');
    },
    onError: (error: any) => {
      toast({
        title: "Error loading students",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Fetch attendance summary
  const { data: attendanceSummary, isLoading: isLoadingAttendance } = useQuery({
    queryKey: ['attendance-summary'],
    queryFn: async (): Promise<AttendanceSummary> => {
      const totalStudents = students.length;
      const presentToday = await getTodayAttendance(students);
      const totalPresences = await getTotalPresences(students);
      const totalAbsences = await getTotalAbsences(students);
      
      return {
        totalStudents,
        presentToday,
        totalPresences,
        totalAbsences,
      };
    },
    enabled: students.length > 0,
    onSuccess: () => {
      console.log('Attendance summary loaded successfully');
    },
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
    queryFn: async (): Promise<ClassSummary[]> => {
      return await getTotalAttendanceByClass(students);
    },
    enabled: students.length > 0,
    onSuccess: () => {
      console.log('Class summaries loaded successfully');
    },
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

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard
            title="Total Students"
            value={attendanceSummary?.totalStudents || 0}
            icon={Users}
            isLoading={isLoadingStudents || isLoadingAttendance}
          />
          <StatCard
            title="Present Today"
            value={attendanceSummary?.presentToday || 0}
            icon={Check}
            isLoading={isLoadingStudents || isLoadingAttendance}
          />
          <StatCard
            title="Total Presences"
            value={attendanceSummary?.totalPresences || 0}
            icon={Calendar}
            isLoading={isLoadingStudents || isLoadingAttendance}
          />
          <StatCard
            title="Total Absences"
            value={attendanceSummary?.totalAbsences || 0}
            icon={XCircle}
            isLoading={isLoadingStudents || isLoadingAttendance}
          />
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">Today is {formatDate(currentDate)}</h2>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-3">Attendance by Class</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classSummaries.map((classSummary) => (
              <StatCard
                key={classSummary.className}
                title={classSummary.className}
                value={classSummary.presentStudents}
                isLoading={isLoadingClasses}
                description={`${classSummary.presentStudents} / ${classSummary.totalStudents} Present`}
              />
            ))}
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-3">Student List</h2>
          <StudentsGrid students={students} isLoading={isLoadingStudents} />
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
