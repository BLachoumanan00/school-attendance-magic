
import MainLayout from "@/components/layout/MainLayout";
import StatCard from "@/components/dashboard/StatCard";
import AttendanceCard from "@/components/attendance/AttendanceCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAttendanceSummary, getClassSummaries, getStudents } from "@/lib/attendance";
import { useState, useEffect } from "react";
import { Users, UserCheck, UserX, Clock, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [attendanceSummary, setAttendanceSummary] = useState(getAttendanceSummary(date));
  const [classSummaries, setClassSummaries] = useState(getClassSummaries());
  const [totalStudents, setTotalStudents] = useState(getStudents().length);

  // Update dashboard data when date changes
  useEffect(() => {
    setAttendanceSummary(getAttendanceSummary(date));
    setClassSummaries(getClassSummaries());
    setTotalStudents(getStudents().length);
  }, [date]);

  return (
    <MainLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1">Dashboard</h1>
            <p className="text-muted-foreground">
              Manage and track student attendance records
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Students"
            value={totalStudents}
            icon={<Users className="h-4 w-4" />}
            description="Enrolled students"
            className="animate-slide-up [animation-delay:100ms]"
          />
          <StatCard
            title="Present Today"
            value={attendanceSummary.present}
            icon={<UserCheck className="h-4 w-4" />}
            description={`${Math.round((attendanceSummary.present / totalStudents) * 100) || 0}% attendance rate`}
            className="animate-slide-up [animation-delay:200ms]"
          />
          <StatCard
            title="Absent Today"
            value={attendanceSummary.absent}
            icon={<UserX className="h-4 w-4" />}
            description={`${Math.round((attendanceSummary.absent / totalStudents) * 100) || 0}% absence rate`}
            className="animate-slide-up [animation-delay:300ms]"
          />
          <StatCard
            title="Late Arrivals"
            value={attendanceSummary.late}
            icon={<Clock className="h-4 w-4" />}
            description={`${Math.round((attendanceSummary.late / totalStudents) * 100) || 0}% tardiness rate`}
            className="animate-slide-up [animation-delay:400ms]"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <AttendanceCard summary={attendanceSummary} className="lg:col-span-1 animate-slide-up [animation-delay:500ms]" />
          
          <Card className="lg:col-span-2 animate-slide-up [animation-delay:600ms]">
            <CardHeader>
              <CardTitle>Class Attendance Overview</CardTitle>
              <CardDescription>Attendance rates by class</CardDescription>
            </CardHeader>
            <CardContent>
              {classSummaries.length > 0 ? (
                <div className="space-y-6">
                  {classSummaries.map((classSummary) => (
                    <div key={classSummary.className} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">{classSummary.className}</h3>
                          <p className="text-sm text-muted-foreground">
                            {classSummary.totalStudents} students
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold">
                            {classSummary.attendanceRate.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${classSummary.attendanceRate}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No class data available</p>
                </div>
              )}
              
              <div className="mt-6 flex justify-center">
                <Link to="/students">
                  <Button>
                    Take Attendance
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
