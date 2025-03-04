
import MainLayout from "@/components/layout/MainLayout";
import StudentList from "@/components/attendance/StudentList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getStudents, getAttendanceForDate, recordAttendance } from "@/lib/attendance";
import { AttendanceRecord } from "@/lib/types";
import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const Students = () => {
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState(getStudents());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Update the list of students and attendance records when the component mounts or the date changes
    setStudents(getStudents());
    setAttendanceRecords(getAttendanceForDate(date));
  }, [date]);

  const handleRecordAttendance = (studentId: string, status: AttendanceRecord['status']) => {
    const newRecord = recordAttendance({
      studentId,
      date,
      status,
      notes: ""
    });

    setAttendanceRecords((prev) => {
      const exists = prev.some(record => record.id === newRecord.id);
      if (exists) {
        return prev.map(record => record.id === newRecord.id ? newRecord : record);
      } else {
        return [...prev, newRecord];
      }
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
            <StudentList
              students={students}
              date={date}
              attendanceRecords={attendanceRecords}
              onRecordAttendance={handleRecordAttendance}
            />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Students;
