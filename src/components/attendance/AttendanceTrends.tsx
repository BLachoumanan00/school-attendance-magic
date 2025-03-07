
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { AttendanceSummary } from "@/lib/types";
import { AlertCircle, TrendingDown, AlertTriangle } from "lucide-react";

interface AttendanceTrendsProps {
  trendData: AttendanceSummary[];
  isLoading: boolean;
}

const AttendanceTrends: React.FC<AttendanceTrendsProps> = ({ trendData, isLoading }) => {
  // Filter for students that need attention
  const studentsNeedingAttention = trendData.filter(summary => summary.needsAttention);
  
  // Sort by absence rate (highest first)
  const sortedData = [...trendData].sort((a, b) => 
    (b.absenceRate || 0) - (a.absenceRate || 0)
  ).slice(0, 5); // Top 5 highest absence rates
  
  if (isLoading) {
    return <div className="w-full p-8 text-center">Loading attendance trends...</div>;
  }

  return (
    <div className="space-y-6">
      {studentsNeedingAttention.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Attendance Alerts</h3>
          <div className="grid gap-4">
            {studentsNeedingAttention.map((summary) => (
              <Alert key={summary.studentId} variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Attendance Warning</AlertTitle>
                <AlertDescription>
                  {summary.consecutiveAbsences && summary.consecutiveAbsences >= 3 ? (
                    <span>{summary.studentName} has been absent for {summary.consecutiveAbsences} consecutive days.</span>
                  ) : (
                    <span>{summary.studentName} has missed {summary.absenceRate?.toFixed(1)}% of classes in the last 30 days.</span>
                  )}
                </AlertDescription>
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
