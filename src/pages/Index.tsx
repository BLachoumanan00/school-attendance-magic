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
  const [selectedFilter, setSelectedFilter] = useState<{
    type: "status" | "class" | null;
    value: string | null;
  }>({ type: null, value: null });

  const today = new Date().toISOString().split('T')[0];

  const { data: students = [], isLoading: isLoadingStudents } = useQuery({
    queryKey: ['students-dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .is('deleted_at', null); // Only fetch active students
      
      if (error) throw error;
      
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

  const { data: todayAttendanceRecords = [], isLoading: isLoadingTodayAttendance } = useQuery({
    queryKey: ['today-attendance-records'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_records")
        .select("*, students(id)")
        .eq("date", today);
        
      if (error) {
        console.error("Error fetching today's attendance records:", error);
        throw error;
      }
      
      return data.map(record => ({
        id: record.id,
        studentId: record.students.id,
        date: record.date,
        status: record.status as "present" | "absent" | "late" | "excused",
        notes: record.notes
      }));
    },
    enabled: students.length > 0
  });

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['students-dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['attendance-summary'] });
      await queryClient.invalidateQueries({ queryKey: ['class-summaries'] });
      await queryClient.invalidateQueries({ queryKey: ['today-attendance-records'] });
      
      setSelectedFilter({ type: null, value: null });
      
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

  const handleStatClick = (type: "status" | "class", value: string) => {
    if (selectedFilter.type === type && selectedFilter.value === value) {
      setSelectedFilter({ type: null, value: null });
    } else {
      setSelectedFilter({ type, value });
    }
  };

  const getFilterTitle = () => {
    if (!selectedFilter.type) return "Student List";
    
    if (selectedFilter.type === "status") {
      switch (selectedFilter.value) {
        case "present": return "Students Present Today";
        case "absent": return "Students Absent Today";
        case "late": return "Students Late Today";
        case "excused": return "Students Excused Today";
        case "attendance": return "Attendance Overview";
        default: return "Student List";
      }
    }
    
    if (selectedFilter.type === "class") {
      return `${selectedFilter.value} Class Attendance`;
    }
    
    return "Student List";
  };

  const isLoading = isLoadingStudents || isLoadingAttendance || isLoadingClasses || isLoadingTodayAttendance || isRefreshing;

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
          <div onClick={() => setSelectedFilter({ type: null, value: null })}>
            <StatCard
              title="Total Students"
              value={attendanceSummary?.total || 0}
              icon={<Users className="h-5 w-5" />}
              isLoading={isLoading}
            />
          </div>
          <div onClick={() => handleStatClick("status", "present")}>
            <StatCard
              title="Present Today"
              value={attendanceSummary?.presentToday || 0}
              icon={<Check className="h-5 w-5" />}
              isLoading={isLoading}
            />
          </div>
          <div onClick={() => handleStatClick("status", "attendance")}>
            <StatCard
              title="Attendance %"
              value={`${attendanceSummary?.presentPercentage || 0}%`}
              icon={<Percent className="h-5 w-5" />}
              isLoading={isLoading}
            />
          </div>
          <div onClick={() => handleStatClick("status", "present")}>
            <StatCard
              title="Total Presences"
              value={attendanceSummary?.totalPresences || 0}
              icon={<Calendar className="h-5 w-5" />}
              isLoading={isLoading}
            />
          </div>
          <div onClick={() => handleStatClick("status", "absent")}>
            <StatCard
              title="Total Absences"
              value={attendanceSummary?.totalAbsences || 0}
              icon={<XCircle className="h-5 w-5" />}
              isLoading={isLoading}
            />
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">Today is {formatDate(currentDate)}</h2>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-3">Attendance by Class</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classSummaries.map((classSummary) => (
              <div 
                key={classSummary.className} 
                onClick={() => handleStatClick("class", classSummary.className)}
              >
                <StatCard
                  title={classSummary.className}
                  value={classSummary.presentCount || 0}
                  icon={<Users className="h-5 w-5" />}
                  description={`${classSummary.presentCount || 0} / ${classSummary.totalStudents} Present`}
                  isLoading={isLoading}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-3">{getFilterTitle()}</h2>
          {students.length > 0 ? (
            <StudentList 
              students={students} 
              isLoading={isLoading}
              date={today}
              attendanceRecords={todayAttendanceRecords}
              filterStatus={selectedFilter.type === "status" && selectedFilter.value !== "attendance" ? 
                (selectedFilter.value as "present" | "absent" | "late" | "excused" | null) : 
                null}
              selectedClass={selectedFilter.type === "class" ? selectedFilter.value : null}
            />
          ) : (
            <p>No students found. Import students first.</p>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
