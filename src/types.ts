// Types globaux pour l'app (ajouté car il n'existait pas)

export interface Subject {
  id: number;
  name: string;
  coefficient: number;
  teacherId?: number;
  classId?: number;
  subjectName?: string; // pour compatibilité
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
  studentId: number;
  studentName: string;
  average: number;
  rank: number;
  status: string;
  subjects: Record<string, { average: number; coefficient: number }>;
}
