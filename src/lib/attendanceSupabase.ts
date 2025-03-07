import { supabase } from "@/integrations/supabase/client";
import { Student, AttendanceSummary, ClassSummary } from "./types";
import { toast } from "@/components/ui/use-toast";

// Get total absences for all students
export const getTotalAbsences = async (students: Student[]): Promise<number> => {
  // Filter to get only active student IDs
  const activeStudentIds = students
    .filter(student => !student.deletedAt)
    .map(student => student.id);
  
  if (activeStudentIds.length === 0) return 0;
  
  const { count, error } = await supabase
    .from("attendance_records")
    .select("*", { count: "exact", head: true })
    .eq("status", "absent")
    .in("student_id", activeStudentIds);
    
  if (error) {
    console.error("Error counting absences:", error);
    throw error;
  }
  
  return count || 0;
};

// Get total presences for all students for today only
export const getTotalPresences = async (students: Student[]): Promise<number> => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
  // Filter to get only active student IDs
  const activeStudentIds = students
    .filter(student => !student.deletedAt)
    .map(student => student.id);
  
  if (activeStudentIds.length === 0) return 0;
  
  const { count, error } = await supabase
    .from("attendance_records")
    .select("*", { count: "exact", head: true })
    .eq("status", "present")
    .eq("date", today)
    .in("student_id", activeStudentIds);
    
  if (error) {
    console.error("Error counting presences:", error);
    throw error;
  }
  
  return count || 0;
};

// Get attendance for today
export const getTodayAttendance = async (students: Student[]): Promise<number> => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
  // Filter to get only active student IDs
  const activeStudentIds = students
    .filter(student => !student.deletedAt)
    .map(student => student.id);
  
  if (activeStudentIds.length === 0) return 0;
  
  const { count, error } = await supabase
    .from("attendance_records")
    .select("*", { count: "exact", head: true })
    .eq("date", today)
    .eq("status", "present")
    .in("student_id", activeStudentIds);
    
  if (error) {
    console.error("Error counting today's attendance:", error);
    throw error;
  }
  
  return count || 0;
};

// Get attendance by class
export const getTotalAttendanceByClass = async (students: Student[]): Promise<ClassSummary[]> => {
  // Group students by class (only active students)
  const classes: Record<string, Student[]> = {};
  
  students
    .filter(student => !student.deletedAt)
    .forEach(student => {
      if (!classes[student.class]) {
        classes[student.class] = [];
      }
      classes[student.class].push(student);
    });
  
  // Calculate attendance data for each class
  const summaries: ClassSummary[] = await Promise.all(
    Object.keys(classes).map(async (className) => {
      const studentsInClass = classes[className];
      const studentIds = studentsInClass.map(s => s.id);
      
      // Count present students for this class today
      const today = new Date().toISOString().split('T')[0];
      const { count: presentToday, error: countError } = await supabase
        .from("attendance_records")
        .select("*", { count: "exact", head: true })
        .in("student_id", studentIds)
        .eq("date", today)
        .eq("status", "present");
        
      if (countError) {
        console.error(`Error counting present students in ${className}:`, countError);
        throw countError;
      }
      
      // Calculate overall attendance rate
      const { count: totalPresent, error: rateError } = await supabase
        .from("attendance_records")
        .select("*", { count: "exact", head: true })
        .in("student_id", studentIds)
        .eq("status", "present");
        
      if (rateError) {
        console.error(`Error calculating attendance rate for ${className}:`, rateError);
        throw rateError;
      }
      
      // Get total number of attendance records for this class
      const { count: totalRecords, error: recordsError } = await supabase
        .from("attendance_records")
        .select("*", { count: "exact", head: true })
        .in("student_id", studentIds);
        
      if (recordsError) {
        console.error(`Error counting total records for ${className}:`, recordsError);
        throw recordsError;
      }
      
      const attendanceRate = totalRecords && totalRecords > 0 
        ? (totalPresent || 0) / totalRecords * 100 
        : 0;
        
      return {
        className,
        totalStudents: studentsInClass.length,
        attendanceRate,
        presentCount: presentToday || 0
      };
    })
  );
  
  return summaries;
};

// Check for attendance trends and send notifications
export const checkAttendanceTrends = async (students: Student[]): Promise<AttendanceSummary[]> => {
  // Filter to get only active students
  const activeStudents = students.filter(student => !student.deletedAt);
  
  if (activeStudents.length === 0) return [];

  // Get attendance records for the past 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const fromDate = thirtyDaysAgo.toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];

  const attendanceSummaries: AttendanceSummary[] = [];

  for (const student of activeStudents) {
    // Get all attendance records for this student in last 30 days
    const { data: records, error } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("student_id", student.id)
      .gte("date", fromDate)
      .lte("date", today)
      .order("date", { ascending: false });

    if (error) {
      console.error(`Error fetching attendance for student ${student.id}:`, error);
      continue;
    }

    // Calculate attendance metrics
    const totalRecords = records.length;
    const absences = records.filter(r => r.status === 'absent').length;
    const absenceRate = totalRecords > 0 ? (absences / totalRecords) * 100 : 0;

    // Check for concerning patterns
    let shouldNotify = false;
    let notificationMsg = '';

    // Consecutive absences (3 or more)
    let consecutiveAbsences = 0;
    let maxConsecutiveAbsences = 0;

    // Sort records by date (newest first)
    const sortedRecords = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    for (const record of sortedRecords) {
      if (record.status === 'absent') {
        consecutiveAbsences++;
        maxConsecutiveAbsences = Math.max(maxConsecutiveAbsences, consecutiveAbsences);
      } else {
        consecutiveAbsences = 0;
      }
    }

    if (maxConsecutiveAbsences >= 3) {
      shouldNotify = true;
      notificationMsg = `${student.firstName} ${student.lastName} has been absent for ${maxConsecutiveAbsences} consecutive days`;
    }

    // High absence rate (over 20%)
    if (absenceRate > 20 && totalRecords >= 5) {
      shouldNotify = true;
      notificationMsg = `${student.firstName} ${student.lastName} has missed ${absenceRate.toFixed(1)}% of classes in the last 30 days`;
    }
    
    // Handle notification if needed
    if (shouldNotify) {
      console.log(`ATTENDANCE ALERT: ${notificationMsg}`);
      
      // Show notification in UI
      toast({
        title: "Attendance Alert",
        description: notificationMsg,
        variant: "destructive",
      });
      
      // In a real app, this would send an email/SMS to parents
      // sendAttendanceAlert(student, notificationMsg);
    }

    attendanceSummaries.push({
      date: today,
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      absenceRate: absenceRate,
      consecutiveAbsences: maxConsecutiveAbsences,
      present: records.filter(r => r.status === 'present').length,
      absent: absences,
      late: records.filter(r => r.status === 'late').length,
      excused: records.filter(r => r.status === 'excused').length,
      total: totalRecords,
      needsAttention: shouldNotify
    });
  }

  return attendanceSummaries;
};

// Get all attendance records in a date range
export const getAttendanceInRange = async (
  fromDate: string, 
  toDate: string,
  studentId?: string
): Promise<any[]> => {
  let query = supabase
    .from("attendance_records")
    .select("*, students!inner(*)")
    .gte("date", fromDate)
    .lte("date", toDate);
    
  if (studentId) {
    query = query.eq("student_id", studentId);
  }
    
  const { data, error } = await query;
    
  if (error) {
    console.error("Error fetching attendance records:", error);
    throw error;
  }
  
  return data.map(record => ({
    id: record.id,
    date: record.date,
    status: record.status,
    notes: record.notes,
    student: {
      id: record.students.id,
      firstName: record.students.first_name,
      lastName: record.students.last_name,
      class: record.students.class,
      studentId: record.students.student_id
    }
  }));
};
