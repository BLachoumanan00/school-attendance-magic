import { supabase } from "@/integrations/supabase/client";
import { Student, AttendanceRecord, AttendanceSummary, ClassSummary, ImportResult } from "./types";

// Student management
export const getStudents = async (): Promise<Student[]> => {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .order("last_name");
    
  if (error) {
    console.error("Error fetching students:", error);
    throw error;
  }
  
  return data.map(student => ({
    id: student.id,
    firstName: student.first_name,
    lastName: student.last_name,
    class: student.class,
    gradeLevel: student.grade_level,
    studentId: student.student_id,
    email: student.email,
    contactPhone: student.contact_phone
  }));
};

export const addStudents = async (students: Student[]): Promise<void> => {
  const formattedStudents = students.map(student => ({
    id: student.id,
    student_id: student.studentId,
    first_name: student.firstName,
    last_name: student.lastName,
    class: student.class,
    grade_level: student.gradeLevel,
    email: student.email,
    contact_phone: student.contactPhone
  }));
  
  const { error } = await supabase
    .from("students")
    .insert(formattedStudents);
    
  if (error) {
    console.error("Error adding students:", error);
    throw error;
  }
};

export const clearStudents = async (): Promise<void> => {
  // First delete all attendance records
  const { error: attendanceError } = await supabase
    .from("attendance_records")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000"); // Trick to delete all records
    
  if (attendanceError) {
    console.error("Error clearing attendance records:", attendanceError);
    throw attendanceError;
  }
  
  // Then delete all students
  const { error: studentsError } = await supabase
    .from("students")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000"); // Trick to delete all records
    
  if (studentsError) {
    console.error("Error clearing students:", studentsError);
    throw studentsError;
  }
};

// Attendance management
export const recordAttendance = async (record: Omit<AttendanceRecord, "id">): Promise<AttendanceRecord> => {
  // First we need to get the database ID for the student
  const { data: studentData, error: studentError } = await supabase
    .from("students")
    .select("id")
    .eq("id", record.studentId)
    .single();
    
  if (studentError) {
    console.error("Error finding student:", studentError);
    throw studentError;
  }
  
  const dbRecord = {
    student_id: studentData.id,
    date: record.date,
    status: record.status,
    notes: record.notes || ""
  };
  
  // Check if there's already a record for this student on this date
  const { data: existingData, error: existingError } = await supabase
    .from("attendance_records")
    .select("id")
    .eq("student_id", dbRecord.student_id)
    .eq("date", dbRecord.date);
    
  if (existingError) {
    console.error("Error checking existing attendance:", existingError);
    throw existingError;
  }
  
  let resultData;
  
  if (existingData && existingData.length > 0) {
    // Update existing record
    const { data, error } = await supabase
      .from("attendance_records")
      .update(dbRecord)
      .eq("id", existingData[0].id)
      .select()
      .single();
      
    if (error) {
      console.error("Error updating attendance record:", error);
      throw error;
    }
    
    resultData = data;
  } else {
    // Insert new record
    const { data, error } = await supabase
      .from("attendance_records")
      .insert(dbRecord)
      .select()
      .single();
      
    if (error) {
      console.error("Error inserting attendance record:", error);
      throw error;
    }
    
    resultData = data;
  }
  
  return {
    id: resultData.id,
    studentId: record.studentId,
    date: resultData.date,
    status: resultData.status as "present" | "absent" | "late" | "excused",
    notes: resultData.notes
  };
};

export const getAttendanceForDate = async (date: string): Promise<AttendanceRecord[]> => {
  const { data, error } = await supabase
    .from("attendance_records")
    .select("*, students(id)")
    .eq("date", date);
    
  if (error) {
    console.error("Error fetching attendance for date:", error);
    throw error;
  }
  
  return data.map(record => ({
    id: record.id,
    studentId: record.students.id,
    date: record.date,
    status: record.status as "present" | "absent" | "late" | "excused",
    notes: record.notes
  }));
};

export const getStudentAttendance = async (studentId: string): Promise<AttendanceRecord[]> => {
  const { data, error } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("student_id", studentId);
    
  if (error) {
    console.error("Error fetching student attendance:", error);
    throw error;
  }
  
  return data.map(record => ({
    id: record.id,
    studentId: studentId,
    date: record.date,
    status: record.status as "present" | "absent" | "late" | "excused",
    notes: record.notes
  }));
};

// Statistics and summaries
export const getAttendanceSummary = async (date: string): Promise<AttendanceSummary> => {
  // Get students count
  const { count: totalStudents, error: studentsError } = await supabase
    .from("students")
    .select("*", { count: "exact", head: true });
    
  if (studentsError) {
    console.error("Error counting students:", studentsError);
    throw studentsError;
  }
  
  // Get attendance records for the date
  const { data: records, error: recordsError } = await supabase
    .from("attendance_records")
    .select("status")
    .eq("date", date);
    
  if (recordsError) {
    console.error("Error fetching attendance records:", recordsError);
    throw recordsError;
  }
  
  const present = records.filter(r => r.status === 'present').length;
  const absent = records.filter(r => r.status === 'absent').length;
  const late = records.filter(r => r.status === 'late').length;
  const excused = records.filter(r => r.status === 'excused').length;
  
  return {
    date,
    present,
    absent,
    late,
    excused,
    total: totalStudents || 0
  };
};

export const getClassSummaries = async (): Promise<ClassSummary[]> => {
  // Get unique classes
  const { data: classData, error: classError } = await supabase
    .from("students")
    .select("class")
    .order("class");
    
  if (classError) {
    console.error("Error fetching classes:", classError);
    throw classError;
  }
  
  const uniqueClasses = Array.from(new Set(classData.map(c => c.class)));
  
  // Get attendance data for all classes
  const summaries: ClassSummary[] = [];
  
  for (const className of uniqueClasses) {
    // Count students in this class
    const { count: totalStudents, error: countError } = await supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("class", className);
      
    if (countError) {
      console.error(`Error counting students in class ${className}:`, countError);
      throw countError;
    }
    
    // Get student IDs for this class
    const { data: studentsInClass, error: studentsError } = await supabase
      .from("students")
      .select("id")
      .eq("class", className);
      
    if (studentsError) {
      console.error(`Error fetching students in class ${className}:`, studentsError);
      throw studentsError;
    }
    
    const studentIds = studentsInClass.map(s => s.id);
    
    // Get unique dates for attendance records
    const { data: dateData, error: dateError } = await supabase
      .from("attendance_records")
      .select("date")
      .order("date");
      
    if (dateError) {
      console.error("Error fetching attendance dates:", dateError);
      throw dateError;
    }
    
    const uniqueDates = Array.from(new Set(dateData.map(d => d.date)));
    
    // Count present or late records for students in this class
    let presentCount = 0;
    
    if (studentIds.length > 0 && uniqueDates.length > 0) {
      const { count, error: attendanceError } = await supabase
        .from("attendance_records")
        .select("*", { count: "exact", head: true })
        .in("student_id", studentIds)
        .in("status", ["present", "late"]);
        
      if (attendanceError) {
        console.error(`Error counting attendance for class ${className}:`, attendanceError);
        throw attendanceError;
      }
      
      presentCount = count || 0;
    }
    
    // Calculate attendance rate
    const totalPossibleRecords = totalStudents * (uniqueDates.length || 1);
    const attendanceRate = totalPossibleRecords > 0 
      ? (presentCount / totalPossibleRecords) * 100 
      : 100;
      
    summaries.push({
      className,
      totalStudents: totalStudents || 0,
      attendanceRate,
      presentCount: presentCount || 0
    });
  }
  
  return summaries;
};
