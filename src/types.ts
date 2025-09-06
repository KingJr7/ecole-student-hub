// Types globaux pour l'app (ajouté car il n'existait pas)

export interface Subject {
  id: string;
  sqlite_id?: number;
  supabase_id?: string;
  name: string;
  coefficient: number;
  teacherId?: string;
  classId?: string;
  subjectName?: string;
  is_synced?: boolean;
  is_deleted?: boolean;
  last_modified?: string;
}

export interface Grade {
  id: number;
  studentId: number;
  subjectId: number;
  subjectName?: string;
  value: number;
  coefficient: number;
  date: string;
  evaluationType: 'devoir' | 'composition';
  term: '1er trimestre' | '2e trimestre' | '3e trimestre';
  notes?: string;
}

export interface Student {
  id: number;
  firstName: string;
  lastName: string;
  classId: number;
  className?: string;
}

export interface ClassResult {
  studentId: string;
  studentName: string;
  average: number;
  rank: number;
  status: string;
  subjects: Record<string, { average: number; coefficient: number }>;
}

export interface FrequentLatePayer {
  id: number;
  name: string;
  className?: string;
  latePaymentCount: number;
}

export interface Payment {
  id: number;
  registration_id?: number;
  fee_id?: number;
  amount: number;
  date: string;
  method: string;
  reference?: string;
  type?: 'Étudiant' | 'Salaire';
  person_name?: string;
  details?: string;
  registration?: Registration;
}

export interface Fee {
  id: number;
  name: string;
  amount: number;
  due_date: string;
  school_year?: string;
  level?: string;
}

export interface Registration {
  id: number;
  student_id: number;
  class_id: number;
  school_year: string;
  state: string;
  registration_date: string;
  student?: Student;
  class?: Class;
}

export interface Student {
  id: number;
  name: string;
  first_name: string;
  genre?: string;
  birth_date?: string;
  picture_url?: string;
  className?: string;
  classId?: number;
  classLevel?: string;
  parentInfo?: { father?: Parent; mother?: Parent };
  registration_date?: string;
}

export interface Parent {
  id: number;
  name: string;
  first_name: string;
  phone?: string;
  email?: string;
  adress?: string;
  gender?: string;
  profession?: string;
  relation?: string;
}

export interface Class {
  id: number;
  name: string;
  level?: string;
}

export interface Subject {
  id: number;
  name: string;
  coefficient?: number;
  class_id: number;
  school_year?: string;
}

export interface Lesson {
  id: number;
  subject_id: number;
  teacher_id?: number;
  class_id: number;
  school_year?: string;
  subject?: Subject;
  teacher?: Teacher;
  class?: Class;
  subjectName?: string;
  teacherFirstName?: string;
  teacherLastName?: string;
  className?: string;
}

export interface Teacher {
  id: number;
  name: string;
  first_name: string;
  phone?: string;
  email?: string;
  adress?: string;
  speciality?: string;
  matricule?: string;
  hourlyRate?: number;
}

export interface Employee {
  id: number;
  name: string;
  first_name: string;
  phone?: string;
  email?: string;
  adress?: string;
  gender?: string;
  job_title?: string;
  salary?: number;
  matricule?: string;
}

export interface SalaryPayment {
  id: number;
  employee_id: number;
  base_salary: number;
  bonus_amount: number;
  total_amount: number;
  payment_date: string;
  notes?: string;
  employee?: Employee;
}

export interface AttendanceRecord {
  id: number;
  student_id: number;
  date: string;
  state: string;
  justification?: string;
  student?: Student;
  firstName?: string;
  lastName?: string;
}

export interface Note {
  id: number;
  student_id: number;
  lesson_id: number;
  value?: number;
  type?: string;
  quarter?: number;
  student?: Student;
  lesson?: Lesson;
  firstName?: string;
  lastName?: string;
  subjectName?: string;
}

export interface DashboardStats {
  totalStudents?: number;
  totalTeachers?: number;
  totalClasses?: number;
  attendanceToday?: {
    present: number;
    absent: number;
    late: number;
  };
  genderDistribution?: {
    gender: string;
    count: number;
  }[];
  monthlyPayments?: {
    name: string;
    total: number;
  }[];
  studentsPerClass?: {
    name: string;
    students: number;
  }[];
}

export interface ClassResult {
  studentId: number;
  studentName: string;
  average: number;
  rank: number;
  subjects: { [key: string]: { average: number | null; coefficient: number } };
  status: string;
}

export interface TeacherStats {
  totalHoursThisMonth: number;
  totalEarningsThisMonth: number;
  subjectHours: { name: string; hours: number }[];
}

export interface Settings {
  id: number;
  schoolName?: string;
  schoolAddress?: string;
  printerName?: string;
  loggedIn?: number;
  userRole?: string;
  schoolId?: string;
  userToken?: string;
  last_sync?: Date;
}

