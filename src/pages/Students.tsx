import MainLayout from "@/components/layout/MainLayout";
import StudentList from "@/components/attendance/StudentList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getStudents, getAttendanceForDate, recordAttendance, deleteStudent } from "@/lib/supabaseService";
import { AttendanceRecord, Student } from "@/lib/types";
import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const Students = () => {
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { 
    data: students = [], 
    isLoading: isLoadingStudents,
    error: studentsError
  } = useQuery({
    queryKey: ['students'],
    queryFn: getStudents
  });

  const { 
    data: attendanceRecords = [], 
    isLoading: isLoadingAttendance,
    error: attendanceError 
  } = useQuery({
    queryKey: ['attendance', date],
    queryFn: () => getAttendanceForDate(date),
    enabled: !!date
  });

  const recordAttendanceMutation = useMutation({
    mutationFn: (data: Omit<AttendanceRecord, 'id'>) => recordAttendance(data),
    onSuccess: () => {
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

  const deleteStudentMutation = useMutation({
    mutationFn: (studentId: string) => deleteStudent(studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast({
        title: "Student deleted",
        description: "The student has been removed from the system.",
      });
      setStudentToDelete(null);
    },
    onError: (error: any) => {
      console.error("Delete error:", error);
      toast({
        title: "Error deleting student",
        description: error.message || "There was a problem deleting the student.",
        variant: "destructive",
      });
      setStudentToDelete(null);
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

  const handleDeleteStudent = (studentId: string) => {
    console.log("Preparing to delete student:", studentId);
    const student = students.find(s => s.id === studentId);
    if (student) {
      console.log("Found student to delete:", student);
      setStudentToDelete(student);
    } else {
      console.error("Student not found with ID:", studentId);
      toast({
        title: "Error",
        description: "Could not find student to delete.",
        variant: "destructive",
      });
    }
  };

  const confirmDeleteStudent = () => {
    if (studentToDelete) {
      console.log("Confirming deletion of student:", studentToDelete.id);
      deleteStudentMutation.mutate(studentToDelete.id);
    }
  };

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

  const isLoading = isLoadingStudents || isLoadingAttendance || recordAttendanceMutation.isPending || deleteStudentMutation.isPending;

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
                onDeleteStudent={handleDeleteStudent}
                isLoading={isLoading}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!studentToDelete} onOpenChange={(open) => !open && setStudentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this student?</AlertDialogTitle>
            <AlertDialogDescription>
              {studentToDelete && (
                <>
                  You are about to delete <strong>{studentToDelete.firstName} {studentToDelete.lastName}</strong> (ID: {studentToDelete.studentId}).
                  This action cannot be undone and will remove all attendance records for this student.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteStudentMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteStudent} 
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteStudentMutation.isPending}
            >
              {deleteStudentMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default Students;
