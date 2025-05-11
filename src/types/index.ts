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
  classId: number;
  className?: string;
  parentInfo: ParentInfo;
}

export interface ParentInfo {
  fatherName: string;
  fatherPhone: string;
  fatherEmail: string;
  motherName: string;
  motherPhone: string;
  motherEmail: string;
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
  evaluationType?: 'devoir' | 'composition';  // Nouveau: type d'évaluation
  term?: '1er trimestre' | '2e trimestre' | '3e trimestre'; // Nouveau: trimestre
  coefficient?: number; // Nouveau: coefficient pour les calculs de moyenne
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

// Interface pour les résultats de classe
export interface ClassResult {
  studentId: number;
  studentName: string;
  average: number;
  rank: number;
  status: 'admis' | 'échec';
  subjects: {
    [subject: string]: {
      average: number;
      coefficient: number;
    }
  }
}

// Nouvelles interfaces pour les matières, professeurs et emploi du temps
export interface Teacher {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface Subject {
  id: number;
  name: string;
  classId: string;
  teacherId?: number;
  teacherName: string;
  coefficient: number;
  schedules?: Schedule[];
}

export interface Schedule {
  id: number;
  subjectId: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

export interface ClassWithDetails {
  id: number;
  name: string;
  subjects: Subject[];
  students: Student[];
}
