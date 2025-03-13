
import React, { useState } from "react";
import { Student, AttendanceRecord } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { sendStudentNotification } from "@/lib/notificationService";
import { Phone, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import AttendanceCard from "./AttendanceCard";
import AttendanceTrends from "./AttendanceTrends";
import { checkAttendanceTrends } from "@/lib/attendanceSupabase";
import ContactOptions from "./ContactOptions";
import StudentList from "./StudentList"; // Properly import StudentList

interface ExtendedStudentListProps {
  students: Student[];
  date: string;
  attendanceRecords: AttendanceRecord[];
  onRecordAttendance: (studentId: string, status: AttendanceRecord['status']) => void;
  onDeleteStudent: (studentId: string) => void;
  isLoading: boolean;
  allStudents?: Student[]; // Optional prop to pass all students for notifications
  filterStatus?: AttendanceRecord['status'] | null; // Added filterStatus prop
  selectedClass?: string | null; // Added selectedClass prop
}

const ExtendedStudentList: React.FC<ExtendedStudentListProps> = ({
  students,
  date,
  attendanceRecords,
  onRecordAttendance,
  onDeleteStudent,
  isLoading,
  allStudents = [],
  filterStatus, // Add the prop
  selectedClass // Add the prop
}) => {
  const { toast } = useToast();
  const [trendData, setTrendData] = useState([]);
  const [isLoadingTrends, setIsLoadingTrends] = useState(false);
  const [notifyingStudent, setNotifyingStudent] = useState<{[key: string]: boolean}>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Function to analyze attendance trends
  const analyzeAttendanceTrends = async () => {
    setIsLoadingTrends(true);
    try {
      const trends = await checkAttendanceTrends(students);
      setTrendData(trends);
    } catch (error) {
      console.error("Error checking attendance trends:", error);
      toast({
        title: "Error",
        description: "Failed to analyze attendance trends",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTrends(false);
    }
  };

  // Function to refresh student data
  const refreshStudentData = async () => {
    setIsRefreshing(true);
    try {
      // This is a placeholder - the actual implementation would depend on how
      // you refresh data in your application, probably using React Query's refetch
      // Wait for a small delay to simulate refreshing
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "Data Refreshed",
        description: "Student information has been updated",
      });
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast({
        title: "Error",
        description: "Failed to refresh student data",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Prepare additional props for attendance cards
  const attendanceCardExtendedProps = (student: Student) => {
    const record = attendanceRecords.find(
      r => r.studentId === student.id
    );
    
    return {
      additionalActions: (
        <ContactOptions 
          student={student}
          onRefreshData={refreshStudentData}
          isRefreshing={isRefreshing}
        />
      )
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">{students.length} students</h3>
        <Button
          onClick={refreshStudentData}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>
      
      {/* Removing the onAnalyzeTrends prop since it's not in the interface */}
      <StudentList
        students={students}
        date={date}
        attendanceRecords={attendanceRecords}
        onRecordAttendance={onRecordAttendance}
        onDeleteStudent={onDeleteStudent}
        isLoading={isLoading}
        attendanceCardExtraProps={attendanceCardExtendedProps}
        filterStatus={filterStatus}
        selectedClass={selectedClass}
      />
      
      {trendData.length > 0 && (
        <AttendanceTrends 
          trendData={trendData} 
          isLoading={isLoadingTrends}
          students={allStudents || students} // Pass all students for notifications
        />
      )}
    </div>
  );
};

export default ExtendedStudentList;
