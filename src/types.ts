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

export interface Payment {
  id: string;
  sqlite_id?: number;
  supabase_id?: string;
  studentId: string;
  amount: number;
  date: string;
  type: string;
  status: string;
  notes?: string;
  currency: string;
  printCount?: number;
  month?: string;
  created_at?: string;
  is_synced?: boolean;
  is_deleted?: boolean;
  last_modified?: string;
}
