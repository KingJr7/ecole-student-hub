
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
  className: string; // Ajout de la classe pour chaque élève
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
  currency: 'FCFA'; // La monnaie utilisée est le FCFA
}

export interface Grade {
  id: number;
  studentId: number;
  subject: string;
  score: number; // Note: sera maintenant sur 20 au lieu de 100
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
