
import MainLayout from "@/components/layout/MainLayout";
import StatCard from "@/components/dashboard/StatCard";
import AttendanceCard from "@/components/attendance/AttendanceCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAttendanceSummary, getClassSummaries, getStudents } from "@/lib/supabaseService";
import { useState } from "react";
import { Users, UserCheck, UserX, Clock, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";

const Index = () => {
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const { toast } = useToast();

  // Fetch total students count
  const { 
    data: students = [],
    isLoading: isLoadingStudents
  } = useQuery({
    queryKey: ['students'],
    queryFn: getStudents,
    onError: (error: any) => {
      toast({
        title: "Error fetching students",
        description: error.message || "Could not load student data",
        variant: "destructive",
      });
    }
  });

  // Fetch attendance summary for the selected date
  const { 
    data: attendanceSummary,
    isLoading: isLoadingAttendance 
  } = useQuery({
    queryKey: ['attendanceSummary', date],
    queryFn: () => getAttendanceSummary(date),
    onError: (error: any) => {
      toast({
        title: "Error fetching attendance summary",
        description: error.message || "Could not load attendance data",
        variant: "destructive",
      });
    },
    placeholderData: {
      date,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      total: 0
    }
  });

  // Fetch class summaries
  const { 
    data: classSummaries = [],
    isLoading: isLoadingClassSummaries 
  } = useQuery({
    queryKey: ['classSummaries'],
    queryFn: getClassSummaries,
    onError: (error: any) => {
      toast({
        title: "Error fetching class summaries",
        description: error.message || "Could not load class data",
        variant: "destructive",
      });
    }
  });

  const isLoading = isLoadingStudents || isLoadingAttendance || isLoadingClassSummaries;
  const totalStudents = students.length;

  return (
    <MainLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1">Dashboard</h1>
            <p className="text-muted-foreground">
              Manage and track student attendance records
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-auto"
              disabled={isLoading}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Students"
                value={totalStudents}
                icon={<Users className="h-4 w-4" />}
                description="Enrolled students"
                className="animate-slide-up [animation-delay:100ms]"
              />
              <StatCard
                title="Present Today"
                value={attendanceSummary?.present || 0}
                icon={<UserCheck className="h-4 w-4" />}
                description={`${Math.round(((attendanceSummary?.present || 0) / totalStudents) * 100) || 0}% attendance rate`}
                className="animate-slide-up [animation-delay:200ms]"
              />
              <StatCard
                title="Absent Today"
                value={attendanceSummary?.absent || 0}
                icon={<UserX className="h-4 w-4" />}
                description={`${Math.round(((attendanceSummary?.absent || 0) / totalStudents) * 100) || 0}% absence rate`}
                className="animate-slide-up [animation-delay:300ms]"
              />
              <StatCard
                title="Late Arrivals"
                value={attendanceSummary?.late || 0}
                icon={<Clock className="h-4 w-4" />}
                description={`${Math.round(((attendanceSummary?.late || 0) / totalStudents) * 100) || 0}% tardiness rate`}
                className="animate-slide-up [animation-delay:400ms]"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {attendanceSummary && (
                <AttendanceCard summary={attendanceSummary} className="lg:col-span-1 animate-slide-up [animation-delay:500ms]" />
              )}
              
              <Card className="lg:col-span-2 animate-slide-up [animation-delay:600ms]">
                <CardHeader>
                  <CardTitle>Class Attendance Overview</CardTitle>
                  <CardDescription>Attendance rates by class</CardDescription>
                </CardHeader>
                <CardContent>
                  {classSummaries.length > 0 ? (
                    <div className="space-y-6">
                      {classSummaries.map((classSummary) => (
                        <div key={classSummary.className} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="font-medium">{classSummary.className}</h3>
                              <p className="text-sm text-muted-foreground">
                                {classSummary.totalStudents} students
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-lg font-bold">
                                {classSummary.attendanceRate.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary transition-all duration-300"
                              style={{ width: `${classSummary.attendanceRate}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No class data available</p>
                    </div>
                  )}
                  
                  <div className="mt-6 flex justify-center">
                    <Link to="/students">
                      <Button>
                        Take Attendance
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default Index;
