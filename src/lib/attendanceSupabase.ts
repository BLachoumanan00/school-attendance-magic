
import { supabase } from "@/integrations/supabase/client";
import { Student, AttendanceSummary, ClassSummary } from "./types";

// Get total absences for all students
export const getTotalAbsences = async (students: Student[]): Promise<number> => {
  const { count, error } = await supabase
    .from("attendance_records")
    .select("*", { count: "exact", head: true })
    .eq("status", "absent");
    
  if (error) {
    console.error("Error counting absences:", error);
    throw error;
  }
  
  return count || 0;
};

// Get total presences for all students
export const getTotalPresences = async (students: Student[]): Promise<number> => {
  const { count, error } = await supabase
    .from("attendance_records")
    .select("*", { count: "exact", head: true })
    .eq("status", "present");
    
  if (error) {
    console.error("Error counting presences:", error);
    throw error;
  }
  
  return count || 0;
};

// Get attendance for today
export const getTodayAttendance = async (students: Student[]): Promise<number> => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
  const { count, error } = await supabase
    .from("attendance_records")
    .select("*", { count: "exact", head: true })
    .eq("date", today)
    .eq("status", "present");
    
  if (error) {
    console.error("Error counting today's attendance:", error);
    throw error;
  }
  
  return count || 0;
};

// Get attendance by class
export const getTotalAttendanceByClass = async (students: Student[]): Promise<ClassSummary[]> => {
  // Group students by class
  const classes: Record<string, Student[]> = {};
  
  students.forEach(student => {
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
