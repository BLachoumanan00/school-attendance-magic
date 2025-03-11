
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { AttendanceSummary } from "@/lib/types";
import { AlertCircle, TrendingDown, AlertTriangle, BellRing, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Student } from "@/lib/types";
import { sendStudentNotification, sendBulkNotifications } from "@/lib/notificationService";

interface AttendanceTrendsProps {
  trendData: AttendanceSummary[];
  isLoading: boolean;
  students: Student[];
}

const AttendanceTrends: React.FC<AttendanceTrendsProps> = ({ trendData, isLoading, students }) => {
  const { toast } = useToast();
  const [notifyingAll, setNotifyingAll] = useState(false);
  const [notifyingStudent, setNotifyingStudent] = useState<{[key: string]: boolean}>({});
  
  // Filter for students that need attention
  const studentsNeedingAttention = trendData.filter(summary => summary.needsAttention);
  
  // Sort by absence rate (highest first)
  const sortedData = [...trendData].sort((a, b) => 
    (b.absenceRate || 0) - (a.absenceRate || 0)
  ).slice(0, 5); // Top 5 highest absence rates
  
  // Find full student objects for students needing attention
  const findStudentById = (studentId: string): Student | undefined => {
    return students.find(s => s.id === studentId);
  };
  
  // Send notification to all students with attendance issues
  const notifyAllStudents = async (notificationType: 'sms' | 'email' = 'sms') => {
    if (studentsNeedingAttention.length === 0) return;
    
    setNotifyingAll(true);
    
    try {
      const studentsToNotify: Student[] = [];
      
      // Find the full student objects for each student that needs attention
      for (const summary of studentsNeedingAttention) {
        if (summary.studentId) {
          const student = findStudentById(summary.studentId);
          if (student) {
            studentsToNotify.push(student);
          }
        }
      }
      
      if (studentsToNotify.length === 0) {
        throw new Error("No valid students to notify");
      }
      
      // Generate appropriate messages for each student
      await sendBulkNotifications(
        studentsToNotify,
        "This is an important notification from the school attendance system regarding attendance issues. Please contact the school as soon as possible.",
        notificationType
      );
      
    } catch (error) {
      console.error("Failed to send bulk notifications:", error);
      
      toast({
        title: "Notification Failed",
        description: `Failed to send bulk notifications: ${error.message}`,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setNotifyingAll(false);
    }
  };
  
  // Send notification to a specific student
  const notifyStudent = async (summary: AttendanceSummary, notificationType: 'sms' | 'email' = 'sms') => {
    if (!summary.studentId) {
      toast({
        title: "Notification Failed",
        description: "Missing student ID for notification",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    // Find the full student object
    const student = findStudentById(summary.studentId);
    if (!student) {
      toast({
        title: "Notification Failed",
        description: "Could not find student details",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    // Set student-specific notification state
    setNotifyingStudent(prev => ({ ...prev, [summary.studentId!]: true }));
    
    try {
      // Create appropriate message based on attendance issues
      const message = summary.consecutiveAbsences && summary.consecutiveAbsences >= 3
        ? `This is an important notification from the school attendance system. ${summary.studentName} has been absent for ${summary.consecutiveAbsences} consecutive days. Please contact the school immediately.`
        : `This is a notification from the school attendance system. ${summary.studentName} has missed ${summary.absenceRate?.toFixed(1)}% of classes in the last 30 days.`;
      
      // Send the notification
      await sendStudentNotification(student, message, notificationType);
      
    } catch (error) {
      console.error("Failed to send notification:", error);
      
      toast({
        title: "Notification Failed",
        description: `Failed to send notification to parents of ${summary.studentName}: ${error.message}`,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setNotifyingStudent(prev => ({ ...prev, [summary.studentId!]: false }));
    }
  };
  
  if (isLoading) {
    return <div className="w-full p-8 text-center">Loading attendance trends...</div>;
  }

  return (
    <div className="space-y-6">
      {studentsNeedingAttention.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Attendance Alerts</h3>
            <div className="flex gap-2">
              <Button 
                onClick={() => notifyAllStudents('sms')}
                variant="outline"
                size="sm"
                className="flex items-center gap-1 text-orange-600 border-orange-600 hover:bg-orange-100 hover:text-orange-700"
                disabled={notifyingAll}
              >
                {notifyingAll ? (
                  <span className="animate-pulse">Sending...</span>
                ) : (
                  <>
                    <Phone className="h-4 w-4" />
                    SMS All
                  </>
                )}
              </Button>
              <Button 
                onClick={() => notifyAllStudents('email')}
                variant="outline"
                size="sm"
                className="flex items-center gap-1 text-green-600 border-green-600 hover:bg-green-100 hover:text-green-700"
                disabled={notifyingAll}
              >
                {notifyingAll ? (
                  <span className="animate-pulse">Sending...</span>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    Email All
                  </>
                )}
              </Button>
            </div>
          </div>
          <div className="grid gap-4">
            {studentsNeedingAttention.map((summary) => (
              <Alert key={summary.studentId} variant="destructive">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Attendance Warning</AlertTitle>
                    <AlertDescription>
                      {summary.consecutiveAbsences && summary.consecutiveAbsences >= 3 ? (
                        <span>{summary.studentName} has been absent for {summary.consecutiveAbsences} consecutive days.</span>
                      ) : (
                        <span>{summary.studentName} has missed {summary.absenceRate?.toFixed(1)}% of classes in the last 30 days.</span>
                      )}
                    </AlertDescription>
                  </div>
                  <div className="flex gap-2 ml-4 mt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2 text-orange-600 border-orange-600 hover:bg-orange-100 hover:text-orange-700"
                      onClick={() => notifyStudent(summary, 'sms')}
                      disabled={notifyingStudent[summary.studentId!]}
                    >
                      {notifyingStudent[summary.studentId!] ? (
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
                      onClick={() => notifyStudent(summary, 'email')}
                      disabled={notifyingStudent[summary.studentId!]}
                    >
                      {notifyingStudent[summary.studentId!] ? (
                        <span className="animate-pulse">Sending...</span>
                      ) : (
                        <>
                          <Mail className="h-4 w-4 mr-1" />
                          Email
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        </div>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingDown className="mr-2 h-5 w-5 text-destructive" />
            Attendance Concerns
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedData.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Absence Rate</TableHead>
                  <TableHead>Consecutive Absences</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((summary) => (
                  <TableRow key={summary.studentId}>
                    <TableCell>{summary.studentName}</TableCell>
                    <TableCell>{summary.absenceRate?.toFixed(1)}%</TableCell>
                    <TableCell>{summary.consecutiveAbsences || 0}</TableCell>
                    <TableCell>
                      {summary.needsAttention ? (
                        <span className="inline-flex items-center text-destructive">
                          <AlertTriangle className="mr-1 h-4 w-4" />
                          Needs Attention
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Normal</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {summary.needsAttention && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 text-orange-600 border-orange-600 hover:bg-orange-100 hover:text-orange-700"
                            onClick={() => notifyStudent(summary, 'sms')}
                            disabled={notifyingStudent[summary.studentId!]}
                          >
                            {notifyingStudent[summary.studentId!] ? (
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
                            onClick={() => notifyStudent(summary, 'email')}
                            disabled={notifyingStudent[summary.studentId!]}
                          >
                            {notifyingStudent[summary.studentId!] ? (
                              <span className="animate-pulse">Sending...</span>
                            ) : (
                              <>
                                <Mail className="h-4 w-4 mr-1" />
                                Email
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-4">No attendance concerns at this time.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceTrends;
