export interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  attendanceToday: {
    present: number;
    absent: number;
    late: number;
  };
  genderDistribution: { gender: string; count: number }[];
  monthlyPayments: { name: string; total: number }[];
  studentsPerClass: { name: string; students: number }[];
}

export interface Student {
  id: number;
  name: string;
  first_name: string;
  className?: string;
  registration_date?: string;
}

export interface Employee {
  id: number;
  name: string;
  first_name: string;
  email: string;
  phone: string;
  adress?: string;
  job_title: string;
  salary: number;
  matricule?: string;
  gender?: string;
}

export interface Settings {
  schoolName?: string;
  schoolAddress?: string;
}