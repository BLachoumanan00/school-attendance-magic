
// This file is read-only, so we can't modify it directly.
// Let's create a wrapper component that extends the functionality

import React, { useState } from "react";
import { Student, AttendanceRecord } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { sendStudentNotification } from "@/lib/notificationService";
import { Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import AttendanceCard from "./AttendanceCard";
import AttendanceTrends from "./AttendanceTrends";
import { checkAttendanceTrends } from "@/lib/attendanceSupabase";

interface ExtendedStudentListProps {
  students: Student[];
  date: string;
  attendanceRecords: AttendanceRecord[];
  onRecordAttendance: (studentId: string, status: AttendanceRecord['status']) => void;
  onDeleteStudent: (studentId: string) => void;
  isLoading: boolean;
  allStudents?: Student[]; // Optional prop to pass all students for notifications
  filterStatus?: AttendanceRecord['status']; // Added filterStatus prop
  selectedClass?: string; // Added selectedClass prop
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
  
  // Function to send direct notification for absence
  const sendAbsenceNotification = async (student: Student, notificationType: 'sms' | 'email' = 'sms') => {
    if (!student) return;
    
    setNotifyingStudent(prev => ({ ...prev, [student.id]: true }));
    
    try {
      const message = `This is an automated notification from the school attendance system. ${student.firstName} ${student.lastName} was marked absent on ${new Date(date).toLocaleDateString()}. Please contact the school for more information.`;
      
      await sendStudentNotification(student, message, notificationType);
    } catch (error) {
      console.error("Failed to send notification:", error);
      
      toast({
        title: "Notification Failed",
        description: `Could not send notification: ${error.message}`,
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setNotifyingStudent(prev => ({ ...prev, [student.id]: false }));
    }
  };

  // Prepare additional props for attendance cards
  const attendanceCardExtendedProps = (student: Student) => {
    const record = attendanceRecords.find(
      r => r.studentId === student.id
    );
    
    // Only show notification buttons for absent students
    const isAbsent = record?.status === 'absent';
    
    return {
      additionalActions: isAbsent ? (
        <div className="flex space-x-2 mt-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2 text-orange-600 border-orange-600 hover:bg-orange-100 hover:text-orange-700"
            onClick={(e) => {
              e.stopPropagation();
              sendAbsenceNotification(student, 'sms');
            }}
            disabled={notifyingStudent[student.id]}
          >
            {notifyingStudent[student.id] ? (
              <span className="animate-pulse">Sending...</span>
            ) : (
              <>
                <Phone className="h-4 w-4 mr-1" />
                SMS
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2 text-green-600 border-green-600 hover:bg-green-100 hover:text-green-700"
            onClick={(e) => {
              e.stopPropagation();
              sendAbsenceNotification(student, 'email');
            }}
            disabled={notifyingStudent[student.id]}
          >
            {notifyingStudent[student.id] ? (
              <span className="animate-pulse">Sending...</span>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-1" />
                Email
              </>
            )}
          </Button>
        </div>
      ) : null
    };
  };

  // Use the original StudentList component
  const StudentListOriginal = require('./StudentList').default;
  
  return (
    <div className="space-y-6">
      <StudentListOriginal
        students={students}
        date={date}
        attendanceRecords={attendanceRecords}
        onRecordAttendance={onRecordAttendance}
        onDeleteStudent={onDeleteStudent}
        isLoading={isLoading}
        onAnalyzeTrends={analyzeAttendanceTrends}
        attendanceCardExtraProps={attendanceCardExtendedProps}
        filterStatus={filterStatus} // Pass the prop
        selectedClass={selectedClass} // Pass the prop
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
