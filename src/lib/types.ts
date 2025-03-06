export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  class: string;
  gradeLevel: number;
  studentId: string;
  email?: string;
  contactPhone?: string;
  deletedAt?: string | null;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string; // ISO string format
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
}

export interface AttendanceSummary {
  date: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
}

export interface ClassSummary {
  className: string;
  totalStudents: number;
  attendanceRate: number;
  presentCount: number; // Added this field for present students count
}

export interface ImportResult {
  success: boolean;
  message: string;
  data?: Student[];
  errors?: string[];
}
