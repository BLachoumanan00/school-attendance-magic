
import { Student, AttendanceRecord, AttendanceSummary, ClassSummary } from './types';

// Mock data storage - in a real app, this would connect to a database
let studentsData: Student[] = [];
let attendanceRecords: AttendanceRecord[] = [];

// Student management
export const getStudents = (): Student[] => {
  return [...studentsData];
};

export const addStudents = (students: Student[]): void => {
  studentsData = [...studentsData, ...students];
};

export const clearStudents = (): void => {
  studentsData = [];
  attendanceRecords = [];
};

// Attendance management
export const recordAttendance = (record: Omit<AttendanceRecord, 'id'>): AttendanceRecord => {
  const id = crypto.randomUUID();
  const newRecord = { ...record, id };
  
  // Check if there's already a record for this student on this date
  const existingIndex = attendanceRecords.findIndex(
    r => r.studentId === record.studentId && r.date === record.date
  );
  
  if (existingIndex >= 0) {
    // Update existing record
    attendanceRecords[existingIndex] = { ...record, id: attendanceRecords[existingIndex].id };
    return attendanceRecords[existingIndex];
  } else {
    // Add new record
    attendanceRecords.push(newRecord);
    return newRecord;
  }
};

export const getAttendanceForDate = (date: string): AttendanceRecord[] => {
  return attendanceRecords.filter(record => record.date === date);
};

export const getStudentAttendance = (studentId: string): AttendanceRecord[] => {
  return attendanceRecords.filter(record => record.studentId === studentId);
};

// Statistics and summaries
export const getAttendanceSummary = (date: string): AttendanceSummary => {
  const records = getAttendanceForDate(date);
  const total = studentsData.length;
  
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
    total
  };
};

export const getClassSummaries = (): ClassSummary[] => {
  // Group students by class
  const classes: Record<string, Student[]> = {};
  
  studentsData.forEach(student => {
    if (!classes[student.class]) {
      classes[student.class] = [];
    }
    classes[student.class].push(student);
  });
  
  // Calculate attendance rate for each class
  return Object.keys(classes).map(className => {
    const students = classes[className];
    const studentIds = students.map(s => s.id);
    
    // Count total attendance records that are present or late
    const presentCount = attendanceRecords.filter(
      r => studentIds.includes(r.studentId) && (r.status === 'present' || r.status === 'late')
    ).length;
    
    // Total possible attendance records
    const totalPossibleRecords = students.length * (new Set(attendanceRecords.map(r => r.date)).size || 1);
    
    // Calculate attendance rate
    const attendanceRate = totalPossibleRecords > 0 
      ? (presentCount / totalPossibleRecords) * 100 
      : 100; // Default to 100% if no records
      
    return {
      className,
      totalStudents: students.length,
      attendanceRate
    };
  });
};

// Initialize with sample data for demo purposes
export const initializeSampleData = () => {
  const sampleStudents: Student[] = [
    {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      class: '10A',
      gradeLevel: 10,
      studentId: '10001',
      email: 'john.doe@school.edu',
    },
    {
      id: '2',
      firstName: 'Jane',
      lastName: 'Smith',
      class: '10A',
      gradeLevel: 10,
      studentId: '10002',
      email: 'jane.smith@school.edu',
    },
    {
      id: '3',
      firstName: 'Michael',
      lastName: 'Johnson',
      class: '10B',
      gradeLevel: 10,
      studentId: '10003',
      email: 'michael.j@school.edu',
    },
    {
      id: '4',
      firstName: 'Emily',
      lastName: 'Williams',
      class: '10B',
      gradeLevel: 10,
      studentId: '10004',
      email: 'emily.w@school.edu',
    },
    {
      id: '5',
      firstName: 'David',
      lastName: 'Brown',
      class: '11A',
      gradeLevel: 11,
      studentId: '11001',
      email: 'david.b@school.edu',
    }
  ];
  
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  const sampleAttendance: AttendanceRecord[] = [
    { id: 'a1', studentId: '1', date: today, status: 'present' },
    { id: 'a2', studentId: '2', date: today, status: 'late', notes: 'Bus delay' },
    { id: 'a3', studentId: '3', date: today, status: 'absent', notes: 'No notification' },
    { id: 'a4', studentId: '4', date: today, status: 'excused', notes: 'Doctor appointment' },
    { id: 'a5', studentId: '5', date: today, status: 'present' },
    { id: 'a6', studentId: '1', date: yesterday, status: 'present' },
    { id: 'a7', studentId: '2', date: yesterday, status: 'present' },
    { id: 'a8', studentId: '3', date: yesterday, status: 'present' },
    { id: 'a9', studentId: '4', date: yesterday, status: 'late', notes: 'Traffic' },
    { id: 'a10', studentId: '5', date: yesterday, status: 'absent', notes: 'Sick' }
  ];
  
  studentsData = sampleStudents;
  attendanceRecords = sampleAttendance;
};
