import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { AttendanceSummary } from "@/lib/types";
import { AlertCircle, TrendingDown, AlertTriangle, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AttendanceTrendsProps {
  trendData: AttendanceSummary[];
  isLoading: boolean;
}

const AttendanceTrends: React.FC<AttendanceTrendsProps> = ({ trendData, isLoading }) => {
  const { toast } = useToast();
  const [notifyingAll, setNotifyingAll] = useState(false);
  const [notifyingStudent, setNotifyingStudent] = useState<{[key: string]: boolean}>({});
  
  // Filter for students that need attention
  const studentsNeedingAttention = trendData.filter(summary => summary.needsAttention);
  
  // Sort by absence rate (highest first)
  const sortedData = [...trendData].sort((a, b) => 
    (b.absenceRate || 0) - (a.absenceRate || 0)
  ).slice(0, 5); // Top 5 highest absence rates
  
  // Send notification to all students with attendance issues
  const notifyAllStudents = async () => {
    if (studentsNeedingAttention.length === 0) return;
    
    setNotifyingAll(true);
    
    try {
      // Get all student IDs that need attention
      const studentIds = studentsNeedingAttention
        .filter(s => s.studentId)
        .map(s => s.studentId!);
      
      if (studentIds.length === 0) {
        throw new Error("No valid student IDs to notify");
      }
      
      // Call the Edge Function to send notifications in bulk
      const { data, error } = await supabase.functions.invoke('send-bulk-notifications', {
        body: {
          studentIds,
          date: new Date().toISOString().split('T')[0],
          notificationType: 'email'
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      // Show success toast
      toast({
        title: "Notifications Sent",
        description: data.message || `Sent attendance alerts to parents of ${studentIds.length} students with attendance issues.`,
        duration: 5000,
      });
      
      console.log("Bulk notifications sent:", data);
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
  const notifyStudent = async (student: AttendanceSummary) => {
    if (!student.studentId) {
      toast({
        title: "Notification Failed",
        description: "Missing student ID for notification",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    // Set student-specific notification state
    setNotifyingStudent(prev => ({ ...prev, [student.studentId!]: true }));
    
    try {
      // Call the Edge Function to send the notification
      const { data, error } = await supabase.functions.invoke('send-absence-notification', {
        body: {
          studentId: student.studentId,
          date: new Date().toISOString().split('T')[0],
          notificationType: 'email',
          message: student.consecutiveAbsences && student.consecutiveAbsences >= 3
            ? `This is an important notification from the school attendance system. ${student.studentName} has been absent for ${student.consecutiveAbsences} consecutive days. Please contact the school immediately.`
            : `This is a notification from the school attendance system. ${student.studentName} has missed ${student.absenceRate?.toFixed(1)}% of classes in the last 30 days.`
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      toast({
        title: "Notification Sent",
        description: `Parents of ${student.studentName} have been alerted about attendance issues via ${data.channel || 'email'}.`,
        duration: 3000,
      });
      
      console.log("Individual notification sent:", data);
    } catch (error) {
      console.error("Failed to send notification:", error);
      
      toast({
        title: "Notification Failed",
        description: `Failed to send notification to parents of ${student.studentName}: ${error.message}`,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setNotifyingStudent(prev => ({ ...prev, [student.studentId!]: false }));
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
            <Button 
              onClick={notifyAllStudents}
              variant="outline"
              size="sm"
              className="flex items-center gap-1 text-amber-600 border-amber-600 hover:bg-amber-100 hover:text-amber-700"
              disabled={notifyingAll}
            >
              {notifyingAll ? (
                <span className="animate-pulse">Sending Notifications...</span>
              ) : (
                <>
                  <BellRing className="h-4 w-4" />
                  Notify All Parents
                </>
              )}
            </Button>
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
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-4 mt-1 h-8 px-2 text-amber-600 border-amber-600 hover:bg-amber-100 hover:text-amber-700"
                    onClick={() => notifyStudent(summary)}
                    disabled={notifyingStudent[summary.studentId!]}
                  >
                    {notifyingStudent[summary.studentId!] ? (
                      <span className="animate-pulse">Sending...</span>
                    ) : (
                      <>
                        <BellRing className="h-4 w-4 mr-1" />
                        Notify
                      </>
                    )}
                  </Button>
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
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 text-amber-600 border-amber-600 hover:bg-amber-100 hover:text-amber-700"
                          onClick={() => notifyStudent(summary)}
                          disabled={notifyingStudent[summary.studentId!]}
                        >
                          {notifyingStudent[summary.studentId!] ? (
                            <span className="animate-pulse">Sending...</span>
                          ) : (
                            <>
                              <BellRing className="h-4 w-4 mr-1" />
                              Notify
                            </>
                          )}
                        </Button>
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
