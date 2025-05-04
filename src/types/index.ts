
export interface Student {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  enrollmentDate: string;
  status: 'active' | 'inactive' | 'graduated';
}

export interface AttendanceRecord {
  id: number;
  studentId: number;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
}

export interface Payment {
  id: number;
  studentId: number;
  amount: number;
  date: string;
  type: 'tuition' | 'books' | 'activities' | 'other';
  status: 'paid' | 'pending' | 'overdue';
  notes?: string;
}

export interface Grade {
  id: number;
  studentId: number;
  subject: string;
  score: number;
  date: string;
  notes?: string;
}

export interface DashboardStats {
  totalStudents: number;
  attendanceToday: {
    present: number;
    absent: number;
    late: number;
  };
  paymentsThisMonth: number;
  recentGrades: number;
}
