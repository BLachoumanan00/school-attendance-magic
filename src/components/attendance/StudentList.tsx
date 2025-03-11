import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Student, AttendanceRecord } from "@/lib/types";
import { useState } from "react";
import { CheckCircle, XCircle, Clock, AlertCircle, Search, Download, Trash2, ArrowUpDown, BellRing, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface StudentListProps {
  students: Student[];
  isLoading: boolean;
  date?: string;
  attendanceRecords?: AttendanceRecord[];
  onRecordAttendance?: (studentId: string, status: AttendanceRecord['status']) => void;
  onDeleteStudent?: (studentId: string) => void;
  filterStatus?: AttendanceRecord['status'] | null;
  selectedClass?: string | null;
}

const StudentList = ({ 
  students, 
  isLoading, 
  date, 
  attendanceRecords = [], 
  onRecordAttendance,
  onDeleteStudent,
  filterStatus,
  selectedClass
}: StudentListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<string>("lastName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [notificationInProgress, setNotificationInProgress] = useState<{[key: string]: boolean}>({});
  const { toast } = useToast();
  
  const getAttendanceStatus = (studentId: string): AttendanceRecord['status'] | null => {
    const record = attendanceRecords.find(r => r.studentId === studentId);
    return record ? record.status : null;
  };
  
  const sendAbsenceNotification = async (student: Student) => {
    if (!student.email) {
      toast({
        title: "No Email Address",
        description: `${student.firstName} ${student.lastName} has no email address registered.`,
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    setNotificationInProgress(prev => ({ ...prev, [student.id]: true }));
    
    try {
      const { data, error } = await supabase.functions.invoke('send-absence-notification', {
        body: {
          studentId: student.id,
          date: date || new Date().toISOString().split('T')[0],
          notificationType: 'email'
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      toast({
        title: "Email Notification Sent",
        description: `Parents of ${student.firstName} ${student.lastName} have been notified of their absence via email.`,
        duration: 3000,
      });
      
      console.log("Email notification sent:", data);
    } catch (error) {
      console.error("Failed to send email notification:", error);
      
      toast({
        title: "Email Notification Failed",
        description: `Failed to send email notification to parents of ${student.firstName} ${student.lastName}: ${error.message}`,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setNotificationInProgress(prev => ({ ...prev, [student.id]: false }));
    }
  };
  
  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortDirection("asc");
    }
  };
  
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentId.includes(searchTerm) ||
      student.class.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !filterStatus || getAttendanceStatus(student.id) === filterStatus;
    
    const matchesClass = !selectedClass || student.class === selectedClass;
    
    return matchesSearch && matchesStatus && matchesClass;
  });

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

  const exportToCSV = () => {
    const includeAttendance = date && attendanceRecords.length > 0;
    
    let headers = ['Student ID', 'First Name', 'Last Name', 'Class', 'Grade Level', 'Email', 'Contact Phone'];
    
    if (includeAttendance) {
      headers.push(`Attendance (${date})`);
    }
    
    const csvData = filteredStudents.map(student => {
      const row = [
        student.studentId,
        student.firstName,
        student.lastName,
        student.class,
        student.gradeLevel,
        student.email || '',
        student.contactPhone || ''
      ];
      
      if (includeAttendance) {
        const status = getAttendanceStatus(student.id);
        row.push(status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Not recorded');
      }
      
      return row;
    });
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_list_${date || new Date().toISOString().split('T')[0]}.csv`;
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
              <TableHead>Contact</TableHead>
              <TableHead>Actions</TableHead>
              {onRecordAttendance && <TableHead>Attendance</TableHead>}
              {onDeleteStudent && <TableHead className="w-16">Delete</TableHead>}
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
                    <TableCell>
                      {student.contactPhone ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3" />
                          {student.contactPhone}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No contact</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {status === 'absent' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 text-green-600 border-green-600 hover:bg-green-100 hover:text-green-700"
                          onClick={() => sendAbsenceNotification(student)}
                          disabled={notificationInProgress[student.id]}
                          title={student.email ? "Send Email Notification" : "No email address"}
                        >
                          {notificationInProgress[student.id] ? (
                            <>
                              <span className="animate-pulse mr-1">Sending...</span>
                            </>
                          ) : (
                            <>
                              <BellRing className="h-4 w-4 mr-1" />
                              Email
                            </>
                          )}
                        </Button>
                      )}
                    </TableCell>
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
                <TableCell colSpan={onRecordAttendance && onDeleteStudent ? 7 : (onRecordAttendance || onDeleteStudent ? 6 : 5)} className="h-24 text-center">
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
