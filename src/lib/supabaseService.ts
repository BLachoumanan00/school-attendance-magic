import { supabase } from "@/integrations/supabase/client";
import { Student, AttendanceRecord, AttendanceSummary, ClassSummary, ImportResult } from "./types";

// Student management
export const getStudents = async (includeDeleted = false): Promise<Student[]> => {
  let query = supabase
    .from("students")
    .select("*")
    .order("last_name");
  
  // Only include non-deleted students by default
  if (!includeDeleted) {
    query = query.is("deleted_at", null);
  }
    
  const { data, error } = await query;
    
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
    contactPhone: student.contact_phone,
    deletedAt: student.deleted_at
  }));
};

export const getDeletedStudents = async (): Promise<Student[]> => {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
    
  if (error) {
    console.error("Error fetching deleted students:", error);
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
    contactPhone: student.contact_phone,
    deletedAt: student.deleted_at
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
  const { error: attendanceError } = await supabase
    .from("attendance_records")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
    
  if (attendanceError) {
    console.error("Error clearing attendance records:", attendanceError);
    throw attendanceError;
  }
  
  const { error: studentsError } = await supabase
    .from("students")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
    
  if (studentsError) {
    console.error("Error clearing students:", studentsError);
    throw studentsError;
  }
};

export const moveStudentToBin = async (studentId: string): Promise<void> => {
  console.log("Moving student to bin with ID:", studentId);
  
  try {
    // Mark the student as deleted with current timestamp
    const { error: studentError } = await supabase
      .from("students")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", studentId);
      
    if (studentError) {
      console.error("Error moving student to bin:", studentError);
      throw new Error(`Failed to move student to bin: ${studentError.message}`);
    }
    
    console.log("Student moved to bin successfully");
  } catch (error) {
    console.error("Move to bin operation failed:", error);
    throw error; // Re-throw to handle in UI
  }
};

export const restoreStudent = async (studentId: string): Promise<void> => {
  console.log("Restoring student with ID:", studentId);
  
  try {
    // Unmark the deleted flag
    const { error: studentError } = await supabase
      .from("students")
      .update({ deleted_at: null })
      .eq("id", studentId);
      
    if (studentError) {
      console.error("Error restoring student:", studentError);
      throw new Error(`Failed to restore student: ${studentError.message}`);
    }
    
    console.log("Student restored successfully");
  } catch (error) {
    console.error("Restore operation failed:", error);
    throw error; // Re-throw to handle in UI
  }
};

export const deleteStudent = async (studentId: string): Promise<void> => {
  console.log("Permanently deleting student with ID:", studentId);
  
  try {
    // First delete the attendance records
    console.log("Deleting attendance records for student:", studentId);
    const { error: attendanceError } = await supabase
      .from("attendance_records")
      .delete()
      .eq("student_id", studentId);
      
    if (attendanceError) {
      console.error("Error deleting attendance records:", attendanceError);
      throw new Error(`Failed to delete attendance records: ${attendanceError.message}`);
    }
    
    // Then delete the student
    console.log("Deleting student record with ID:", studentId);
    const { error: studentError } = await supabase
      .from("students")
      .delete()
      .eq("id", studentId);
      
    if (studentError) {
      console.error("Error deleting student:", studentError);
      throw new Error(`Failed to delete student: ${studentError.message}`);
    }
    
    console.log("Student and attendance records deleted successfully");
  } catch (error) {
    console.error("Delete operation failed:", error);
    throw error; // Re-throw to handle in UI
  }
};

export const cleanupDeletedStudents = async (daysOld = 30): Promise<void> => {
  try {
    // Calculate the cutoff date (30 days ago by default)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoffDateString = cutoffDate.toISOString();
    
    // Get students to delete
    const { data: studentsToDelete, error: fetchError } = await supabase
      .from("students")
      .select("id")
      .lt("deleted_at", cutoffDateString);
      
    if (fetchError) {
      console.error("Error fetching old deleted students:", fetchError);
      throw fetchError;
    }
    
    if (!studentsToDelete || studentsToDelete.length === 0) {
      console.log("No old deleted students to clean up");
      return;
    }
    
    console.log(`Found ${studentsToDelete.length} students to permanently delete`);
    
    // Permanently delete each student
    for (const student of studentsToDelete) {
      await deleteStudent(student.id);
    }
    
    console.log(`Successfully cleaned up ${studentsToDelete.length} old deleted students`);
  } catch (error) {
    console.error("Cleanup operation failed:", error);
    throw error;
  }
};

// Attendance management
export const recordAttendance = async (record: Omit<AttendanceRecord, "id">): Promise<AttendanceRecord> => {
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
  const { count: totalStudents, error: studentsError } = await supabase
    .from("students")
    .select("*", { count: "exact", head: true });
    
  if (studentsError) {
    console.error("Error counting students:", studentsError);
    throw studentsError;
  }
  
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
  const { data: classData, error: classError } = await supabase
    .from("students")
    .select("class")
    .order("class");
    
  if (classError) {
    console.error("Error fetching classes:", classError);
    throw classError;
  }
  
  const uniqueClasses = Array.from(new Set(classData.map(c => c.class)));
  
  const summaries: ClassSummary[] = [];
  
  for (const className of uniqueClasses) {
    const { count: totalStudents, error: countError } = await supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("class", className);
      
    if (countError) {
      console.error(`Error counting students in class ${className}:`, countError);
      throw countError;
    }
    
    const { data: studentsInClass, error: studentsError } = await supabase
      .from("students")
      .select("id")
      .eq("class", className);
      
    if (studentsError) {
      console.error(`Error fetching students in class ${className}:`, studentsError);
      throw studentsError;
    }
    
    const studentIds = studentsInClass.map(s => s.id);
    
    const { data: dateData, error: dateError } = await supabase
      .from("attendance_records")
      .select("date")
      .order("date");
      
    if (dateError) {
      console.error("Error fetching attendance dates:", dateError);
      throw dateError;
    }
    
    const uniqueDates = Array.from(new Set(dateData.map(d => d.date)));
    
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
