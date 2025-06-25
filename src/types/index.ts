export interface Student {
  id: string;
  sqlite_id?: number;
  supabase_id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  enrollmentDate: string;
  status: 'active' | 'inactive' | 'graduated';
  classId: string;
  className?: string;
  parentInfo: ParentInfo;
  is_synced?: boolean;
  is_deleted?: boolean;
  last_modified?: string;
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
  id: string;
  sqlite_id?: number;
  supabase_id?: string;
  studentId: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
  is_synced?: boolean;
  is_deleted?: boolean;
  last_modified?: string;
}

export interface Payment {
  id: string;
  sqlite_id?: number;
  supabase_id?: string;
  studentId: string;
  amount: number;
  date: string;
  type: 'tuition' | 'books' | 'activities' | 'other';
  status: 'paid' | 'pending' | 'overdue';
  notes?: string;
  currency: 'FCFA'; // La monnaie utilisée est le FCFA
  printCount?: number;
  month?: string;
  is_synced?: boolean;
  is_deleted?: boolean;
  last_modified?: string;
}

export interface Grade {
  id: number;
  studentId: number;
  subject: string;
  subjectId?: number; // ID de la matière dans la table subjects
  value?: number; // Valeur de la note
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
  id: string;
  sqlite_id?: number;
  supabase_id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  hourlyRate?: number;
  speciality?: string;
  is_synced?: boolean;
  is_deleted?: boolean;
  last_modified?: string;
}

export interface Subject {
  id: string;
  sqlite_id?: number;
  supabase_id?: string;
  name: string;
  classId: string;
  teacherId?: string;
  teacherName?: string;
  coefficient: number;
  schedules?: Schedule[];
  hoursPerWeek?: number;
  is_synced?: boolean;
  is_deleted?: boolean;
  last_modified?: string;
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

export interface TeacherWorkHours {
  id: number;
  teacherId: number;
  hours: number;
  date: string;
  subjectId?: number;
  subjectName?: string;
  notes?: string;
}

export interface TeacherStats {
  totalHoursThisMonth: number;
  totalEarningsThisMonth: number;
  hourlyRate: number;
  subjectHours: Array<{
    id: number;
    name: string;
    hours: number;
  }>;
}

// Interfaces pour les bulletins de notes
export interface SubjectGrade {
  subjectId: number;
  subjectName?: string;
  coefficient: number;
  devoirs: Array<{ value: number; date: string; notes?: string }>;
  compositions: Array<{ value: number; date: string; notes?: string }>;
  average: number;
}

export interface StudentBulletin {
  student: Student;
  className: string;
  term: string;
  rank: number;
  isAdmitted: boolean;
  generalAverage: number;
  subjectGrades: Record<string, SubjectGrade>;
}

export interface Class {
  id: string;
  sqlite_id?: number;
  supabase_id?: string;
  name: string;
  level?: string;
  school_id?: string;
  is_synced?: boolean;
  is_deleted?: boolean;
  last_modified?: string;
}
