
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Student, AttendanceRecord } from "@/lib/types";
import { useState } from "react";
import { CheckCircle, XCircle, Clock, AlertCircle, Search } from "lucide-react";

interface StudentListProps {
  students: Student[];
  isLoading: boolean;
  date?: string;
  attendanceRecords?: AttendanceRecord[];
  onRecordAttendance?: (studentId: string, status: AttendanceRecord['status']) => void;
}

const StudentList = ({ 
  students, 
  isLoading, 
  date, 
  attendanceRecords = [], 
  onRecordAttendance 
}: StudentListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  
  // Get attendance status for a student
  const getAttendanceStatus = (studentId: string): AttendanceRecord['status'] | null => {
    const record = attendanceRecords.find(r => r.studentId === studentId);
    return record ? record.status : null;
  };
  
  // Filter students based on search term
  const filteredStudents = students.filter(student => 
    student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.studentId.includes(searchTerm) ||
    student.class.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <div>Loading students...</div>;
  }

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search students..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Class</TableHead>
              {onRecordAttendance && <TableHead>Attendance</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student) => {
                const status = getAttendanceStatus(student.id);
                
                return (
                  <TableRow key={student.id} className="group transition-all-200">
                    <TableCell className="font-medium">{student.studentId}</TableCell>
                    <TableCell>{student.lastName}, {student.firstName}</TableCell>
                    <TableCell>{student.class}</TableCell>
                    {onRecordAttendance && (
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant={status === 'present' ? 'default' : 'outline'}
                            className="h-8 w-8 p-0 rounded-full"
                            onClick={() => onRecordAttendance(student.id, 'present')}
                            title="Present"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={status === 'absent' ? 'default' : 'outline'}
                            className="h-8 w-8 p-0 rounded-full"
                            onClick={() => onRecordAttendance(student.id, 'absent')}
                            title="Absent"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={status === 'late' ? 'default' : 'outline'}
                            className="h-8 w-8 p-0 rounded-full"
                            onClick={() => onRecordAttendance(student.id, 'late')}
                            title="Late"
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={status === 'excused' ? 'default' : 'outline'}
                            className="h-8 w-8 p-0 rounded-full"
                            onClick={() => onRecordAttendance(student.id, 'excused')}
                            title="Excused"
                          >
                            <AlertCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={onRecordAttendance ? 4 : 3} className="h-24 text-center">
                  No students found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default StudentList;
