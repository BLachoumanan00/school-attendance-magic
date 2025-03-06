
import MainLayout from "@/components/layout/MainLayout";
import StudentList from "@/components/attendance/StudentList";
import RecycleBin from "@/components/students/RecycleBin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getStudents, getDeletedStudents, getAttendanceForDate, recordAttendance, moveStudentToBin, restoreStudent, deleteStudent } from "@/lib/supabaseService";
import { AttendanceRecord, Student } from "@/lib/types";
import { useState, useEffect } from "react";
import { Calendar, Trash } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Students = () => {
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [studentToPermanentlyDelete, setStudentToPermanentlyDelete] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState<string>("active");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { 
    data: students = [], 
    isLoading: isLoadingStudents,
    error: studentsError
  } = useQuery({
    queryKey: ['students', activeTab === 'active'],
    queryFn: () => getStudents(activeTab !== 'active')
  });

  const { 
    data: deletedStudents = [], 
    isLoading: isLoadingDeletedStudents,
    error: deletedStudentsError
  } = useQuery({
    queryKey: ['deleted-students'],
    queryFn: getDeletedStudents,
    enabled: activeTab === 'bin'
  });

  const { 
    data: attendanceRecords = [], 
    isLoading: isLoadingAttendance,
    error: attendanceError 
  } = useQuery({
    queryKey: ['attendance', date],
    queryFn: () => getAttendanceForDate(date),
    enabled: !!date && activeTab === 'active'
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

  const moveStudentToBinMutation = useMutation({
    mutationFn: (studentId: string) => moveStudentToBin(studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', true] });
      queryClient.invalidateQueries({ queryKey: ['deleted-students'] });
      toast({
        title: "Student moved to bin",
        description: "The student has been moved to the recycle bin.",
      });
      setStudentToDelete(null);
    },
    onError: (error: any) => {
      console.error("Delete error:", error);
      toast({
        title: "Error moving student to bin",
        description: error.message || "There was a problem moving the student to bin.",
        variant: "destructive",
      });
      setStudentToDelete(null);
    }
  });

  const restoreStudentMutation = useMutation({
    mutationFn: (studentId: string) => restoreStudent(studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', true] });
      queryClient.invalidateQueries({ queryKey: ['deleted-students'] });
      toast({
        title: "Student restored",
        description: "The student has been restored from the recycle bin.",
      });
    },
    onError: (error: any) => {
      console.error("Restore error:", error);
      toast({
        title: "Error restoring student",
        description: error.message || "There was a problem restoring the student.",
        variant: "destructive",
      });
    }
  });

  const deleteStudentMutation = useMutation({
    mutationFn: (studentId: string) => deleteStudent(studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deleted-students'] });
      toast({
        title: "Student permanently deleted",
        description: "The student has been permanently removed from the system.",
      });
      setStudentToPermanentlyDelete(null);
    },
    onError: (error: any) => {
      console.error("Delete error:", error);
      toast({
        title: "Error deleting student",
        description: error.message || "There was a problem permanently deleting the student.",
        variant: "destructive",
      });
      setStudentToPermanentlyDelete(null);
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
    console.log("Preparing to move student to bin:", studentId);
    const student = students.find(s => s.id === studentId);
    if (student) {
      console.log("Found student to move to bin:", student);
      setStudentToDelete(student);
    } else {
      console.error("Student not found with ID:", studentId);
      toast({
        title: "Error",
        description: "Could not find student to move to bin.",
        variant: "destructive",
      });
    }
  };

  const handleRestoreStudent = (studentId: string) => {
    console.log("Restoring student with ID:", studentId);
    restoreStudentMutation.mutate(studentId);
  };

  const handlePermanentDeleteStudent = (studentId: string) => {
    console.log("Preparing to permanently delete student:", studentId);
    const student = deletedStudents.find(s => s.id === studentId);
    if (student) {
      console.log("Found student to permanently delete:", student);
      setStudentToPermanentlyDelete(student);
    } else {
      console.error("Deleted student not found with ID:", studentId);
      toast({
        title: "Error",
        description: "Could not find deleted student to permanently delete.",
        variant: "destructive",
      });
    }
  };

  const confirmMoveStudentToBin = () => {
    if (studentToDelete) {
      console.log("Confirming moving student to bin:", studentToDelete.id);
      moveStudentToBinMutation.mutate(studentToDelete.id);
    }
  };

  const confirmPermanentDelete = () => {
    if (studentToPermanentlyDelete) {
      console.log("Confirming permanent deletion of student:", studentToPermanentlyDelete.id);
      deleteStudentMutation.mutate(studentToPermanentlyDelete.id);
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

    if (deletedStudentsError) {
      toast({
        title: "Error fetching deleted students",
        description: (deletedStudentsError as Error).message || "Could not load deleted student data",
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
  }, [studentsError, deletedStudentsError, attendanceError, toast]);

  const isLoading = isLoadingStudents || 
    isLoadingDeletedStudents || 
    isLoadingAttendance || 
    recordAttendanceMutation.isPending || 
    moveStudentToBinMutation.isPending || 
    restoreStudentMutation.isPending || 
    deleteStudentMutation.isPending;

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
          {activeTab === 'active' && (
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
          )}
        </div>

        <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="active">Active Students</TabsTrigger>
            <TabsTrigger value="bin" className="flex items-center gap-1">
              <Trash className="h-4 w-4" />
              Recycle Bin
              {deletedStudents.length > 0 && (
                <span className="ml-1 bg-primary/20 text-primary px-1.5 rounded-full text-xs">
                  {deletedStudents.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="active" className="pt-4">
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
                    students={students.filter(s => !s.deletedAt)}
                    date={date}
                    attendanceRecords={attendanceRecords}
                    onRecordAttendance={handleRecordAttendance}
                    onDeleteStudent={handleDeleteStudent}
                    isLoading={isLoading}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="bin" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Recycle Bin</CardTitle>
                <CardDescription>
                  Students in the recycle bin will be automatically deleted after 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                  </div>
                ) : (
                  <RecycleBin
                    students={deletedStudents}
                    isLoading={isLoading}
                    onRestoreStudent={handleRestoreStudent}
                    onDeletePermanently={handlePermanentDeleteStudent}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={!!studentToDelete} onOpenChange={(open) => !open && setStudentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move student to recycle bin?</AlertDialogTitle>
            <AlertDialogDescription>
              {studentToDelete && (
                <>
                  You are about to move <strong>{studentToDelete.firstName} {studentToDelete.lastName}</strong> (ID: {studentToDelete.studentId}) to the recycle bin.
                  The student will be automatically deleted after 30 days, or you can restore them from the recycle bin.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={moveStudentToBinMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmMoveStudentToBin} 
              className="bg-destructive hover:bg-destructive/90"
              disabled={moveStudentToBinMutation.isPending}
            >
              {moveStudentToBinMutation.isPending ? 'Moving to bin...' : 'Move to bin'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!studentToPermanentlyDelete} onOpenChange={(open) => !open && setStudentToPermanentlyDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete this student?</AlertDialogTitle>
            <AlertDialogDescription>
              {studentToPermanentlyDelete && (
                <>
                  You are about to permanently delete <strong>{studentToPermanentlyDelete.firstName} {studentToPermanentlyDelete.lastName}</strong> (ID: {studentToPermanentlyDelete.studentId}).
                  This action cannot be undone and will remove all attendance records for this student.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteStudentMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmPermanentDelete} 
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteStudentMutation.isPending}
            >
              {deleteStudentMutation.isPending ? 'Deleting...' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default Students;
