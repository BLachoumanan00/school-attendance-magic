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
  notificationPreference?: 'sms' | 'whatsapp' | 'email';
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
  studentId?: string;
  studentName?: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  absenceRate?: number;
  consecutiveAbsences?: number;
  needsAttention?: boolean;
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

export interface NotificationResult {
  success: boolean;
  message: string;
  channel?: 'sms' | 'whatsapp' | 'email';
  studentId?: string;
}
