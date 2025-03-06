
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Student, AttendanceRecord } from "@/lib/types";
import { useState } from "react";
import { CheckCircle, XCircle, Clock, AlertCircle, Search, Download, Trash2, ArrowUpDown } from "lucide-react";

interface StudentListProps {
  students: Student[];
  isLoading: boolean;
  date?: string;
  attendanceRecords?: AttendanceRecord[];
  onRecordAttendance?: (studentId: string, status: AttendanceRecord['status']) => void;
  onDeleteStudent?: (studentId: string) => void;
}

const StudentList = ({ 
  students, 
  isLoading, 
  date, 
  attendanceRecords = [], 
  onRecordAttendance,
  onDeleteStudent
}: StudentListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<string>("lastName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  // Get attendance status for a student
  const getAttendanceStatus = (studentId: string): AttendanceRecord['status'] | null => {
    const record = attendanceRecords.find(r => r.studentId === studentId);
    return record ? record.status : null;
  };
  
  // Handle sort
  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortDirection("asc");
    }
  };
  
  // Filter students based on search term
  const filteredStudents = students.filter(student => 
    student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.studentId.includes(searchTerm) ||
    student.class.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort students
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (sortBy === "lastName") {
      return sortDirection === "asc" 
        ? a.lastName.localeCompare(b.lastName) 
        : b.lastName.localeCompare(a.lastName);
    } else if (sortBy === "firstName") {
      return sortDirection === "asc" 
        ? a.firstName.localeCompare(b.firstName) 
        : b.firstName.localeCompare(a.firstName);
    } else if (sortBy === "class") {
      return sortDirection === "asc" 
        ? a.class.localeCompare(b.class) 
        : b.class.localeCompare(a.class);
    } else if (sortBy === "studentId") {
      return sortDirection === "asc" 
        ? a.studentId.localeCompare(b.studentId) 
        : b.studentId.localeCompare(a.studentId);
    }
    return 0;
  });

  // Export student list as CSV
  const exportToCSV = () => {
    // Create CSV header
    const headers = ['Student ID', 'First Name', 'Last Name', 'Class', 'Grade Level', 'Email', 'Contact Phone'];
    
    // Create CSV rows
    const csvData = filteredStudents.map(student => [
      student.studentId,
      student.firstName,
      student.lastName,
      student.class,
      student.gradeLevel,
      student.email || '',
      student.contactPhone || ''
    ]);
    
    // Combine header and rows
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_list_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <div>Loading students...</div>;
  }

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 w-full"
          />
        </div>
        <Button 
          onClick={exportToCSV} 
          variant="outline" 
          className="w-full sm:w-auto"
          disabled={filteredStudents.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          Export to CSV
        </Button>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button 
                  variant="ghost" 
                  onClick={() => handleSort("studentId")} 
                  className="p-0 h-auto font-semibold flex items-center"
                >
                  Student ID
                  {sortBy === "studentId" && (
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  )}
                </Button>
              </TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  onClick={() => handleSort("lastName")} 
                  className="p-0 h-auto font-semibold flex items-center"
                >
                  Name
                  {sortBy === "lastName" && (
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  )}
                </Button>
              </TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  onClick={() => handleSort("class")} 
                  className="p-0 h-auto font-semibold flex items-center"
                >
                  Class
                  {sortBy === "class" && (
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  )}
                </Button>
              </TableHead>
              {onRecordAttendance && <TableHead>Attendance</TableHead>}
              {onDeleteStudent && <TableHead className="w-16">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedStudents.length > 0 ? (
              sortedStudents.map((student) => {
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
                    {onDeleteStudent && (
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => onDeleteStudent(student.id)}
                          title="Delete Student"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={onRecordAttendance && onDeleteStudent ? 5 : (onRecordAttendance || onDeleteStudent ? 4 : 3)} className="h-24 text-center">
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
