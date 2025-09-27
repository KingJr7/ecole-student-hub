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

export interface Schedule {
  id: number;
  lesson_id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  lesson: Lesson;
}

export interface Event {
  id: number;
  title: string;
  description?: string;
  date: string; // ISO string
  location?: string;
  image_url?: string;
}