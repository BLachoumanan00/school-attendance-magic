
import MainLayout from "@/components/layout/MainLayout";
import StudentList from "@/components/attendance/StudentList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getStudents, getAttendanceForDate, recordAttendance } from "@/lib/supabaseService";
import { AttendanceRecord, Student } from "@/lib/types";
import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const Students = () => {
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch students
  const { 
    data: students = [], 
    isLoading: isLoadingStudents,
    error: studentsError
  } = useQuery({
    queryKey: ['students'],
    queryFn: getStudents
  });

  // Fetch attendance records for the selected date
  const { 
    data: attendanceRecords = [], 
    isLoading: isLoadingAttendance,
    error: attendanceError 
  } = useQuery({
    queryKey: ['attendance', date],
    queryFn: () => getAttendanceForDate(date),
    enabled: !!date
  });

  // Mutation for recording attendance
  const recordAttendanceMutation = useMutation({
    mutationFn: (data: Omit<AttendanceRecord, 'id'>) => recordAttendance(data),
    onSuccess: () => {
      // Invalidate the attendance query to refetch the data
      queryClient.invalidateQueries({ queryKey: ['attendance', date] });
    },
    onError: (error: any) => {
      toast({
        title: "Error recording attendance",
        description: error.message || "There was a problem updating the attendance record.",
        variant: "destructive",
      });
    }
  });

  const handleRecordAttendance = (studentId: string, status: AttendanceRecord['status']) => {
    recordAttendanceMutation.mutate({
      studentId,
      date,
      status,
      notes: ""
    });

    const statusMessages = {
      present: "Present",
      absent: "Absent",
      late: "Late",
      excused: "Excused"
    };

    toast({
      title: `Marked as ${statusMessages[status]}`,
      description: `Student attendance updated for ${new Date(date).toLocaleDateString()}`,
    });
  };

  // Show error if there's an issue fetching data
  useEffect(() => {
    if (studentsError) {
      toast({
        title: "Error fetching students",
        description: (studentsError as Error).message || "Could not load student data",
        variant: "destructive",
      });
    }

    if (attendanceError) {
      toast({
        title: "Error fetching attendance",
        description: (attendanceError as Error).message || "Could not load attendance data",
        variant: "destructive",
      });
    }
  }, [studentsError, attendanceError, toast]);

  const isLoading = isLoadingStudents || isLoadingAttendance || recordAttendanceMutation.isPending;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1">Student Attendance</h1>
            <p className="text-muted-foreground">
              View and manage student attendance records
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

        <Card>
          <CardHeader>
            <CardTitle>Attendance Sheet</CardTitle>
            <CardDescription>
              {new Date(date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : (
              <StudentList
                students={students}
                date={date}
                attendanceRecords={attendanceRecords}
                onRecordAttendance={handleRecordAttendance}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Students;
