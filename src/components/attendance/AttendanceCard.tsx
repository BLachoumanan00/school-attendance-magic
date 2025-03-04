
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AttendanceSummary } from "@/lib/types";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface AttendanceCardProps {
  summary: AttendanceSummary;
  className?: string;
}

const AttendanceCard = ({ summary, className }: AttendanceCardProps) => {
  const presentPercentage = summary.total > 0 
    ? Math.round((summary.present / summary.total) * 100) 
    : 0;
    
  const absentPercentage = summary.total > 0 
    ? Math.round((summary.absent / summary.total) * 100) 
    : 0;
    
  const latePercentage = summary.total > 0 
    ? Math.round((summary.late / summary.total) * 100) 
    : 0;
    
  const excusedPercentage = summary.total > 0 
    ? Math.round((summary.excused / summary.total) * 100) 
    : 0;

  return (
    <Card className={cn("transition-all-200 overflow-hidden", className)}>
      <CardHeader>
        <CardTitle className="text-xl">Attendance Summary</CardTitle>
        <CardDescription>
          {new Date(summary.date).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Present</span>
            <span className="font-medium">{summary.present} ({presentPercentage}%)</span>
          </div>
          <Progress value={presentPercentage} className="h-2 bg-secondary" />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Absent</span>
            <span className="font-medium">{summary.absent} ({absentPercentage}%)</span>
          </div>
          <Progress value={absentPercentage} className="h-2 bg-secondary" />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Late</span>
            <span className="font-medium">{summary.late} ({latePercentage}%)</span>
          </div>
          <Progress value={latePercentage} className="h-2 bg-secondary" />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Excused</span>
            <span className="font-medium">{summary.excused} ({excusedPercentage}%)</span>
          </div>
          <Progress value={excusedPercentage} className="h-2 bg-secondary" />
        </div>
        
        <div className="pt-2 text-sm text-muted-foreground">
          Total students: {summary.total}
        </div>
      </CardContent>
    </Card>
  );
};

export default AttendanceCard;
