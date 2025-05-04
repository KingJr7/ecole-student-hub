import { Student, AttendanceRecord, Payment, Grade, DashboardStats, ClassResult } from "../types";

// Demo data
let students: Student[] = [
  {
    id: 1,
    firstName: "Marie",
    lastName: "Dupont",
    email: "marie.dupont@example.com",
    phone: "06 12 34 56 78",
    dateOfBirth: "2005-05-15",
    address: "123 Rue de Paris, 75001 Paris",
    enrollmentDate: "2022-09-01",
    status: "active",
    className: "Terminale S"
  },
  {
    id: 2,
    firstName: "Thomas",
    lastName: "Martin",
    email: "thomas.martin@example.com",
    phone: "07 23 45 67 89",
    dateOfBirth: "2004-08-22",
    address: "456 Avenue Victor Hugo, 69002 Lyon",
    enrollmentDate: "2021-09-01",
    status: "active",
    className: "Première ES"
  },
  {
    id: 3,
    firstName: "Sophie",
    lastName: "Bernard",
    email: "sophie.bernard@example.com",
    phone: "06 34 56 78 90",
    dateOfBirth: "2005-03-10",
    address: "789 Boulevard Voltaire, 13001 Marseille",
    enrollmentDate: "2022-09-01",
    status: "active",
    className: "Terminale S"
  }
];

let attendance: AttendanceRecord[] = [
  {
    id: 1,
    studentId: 1,
    date: "2023-11-06",
    status: "present",
  },
  {
    id: 2,
    studentId: 2,
    date: "2023-11-06",
    status: "absent",
    notes: "Maladie"
  },
  {
    id: 3,
    studentId: 3,
    date: "2023-11-06",
    status: "present",
  },
  {
    id: 4,
    studentId: 1,
    date: "2023-11-07",
    status: "present",
  },
  {
    id: 5,
    studentId: 2,
    date: "2023-11-07",
    status: "present",
  },
  {
    id: 6,
    studentId: 3,
    date: "2023-11-07",
    status: "late",
    notes: "10 minutes de retard"
  }
];

let payments: Payment[] = [
  {
    id: 1,
    studentId: 1,
    amount: 500.00,
    date: "2023-10-05",
    type: "tuition",
    status: "paid",
    currency: "FCFA"
  },
  {
    id: 2,
    studentId: 2,
    amount: 500.00,
    date: "2023-10-10",
    type: "tuition",
    status: "paid",
    currency: "FCFA"
  },
  {
    id: 3,
    studentId: 3,
    amount: 500.00,
    date: "2023-10-15",
    type: "tuition",
    status: "overdue",
    notes: "Rappel envoyé",
    currency: "FCFA"
  }
];

// Conversion des notes sur 20 au lieu de 100
let grades: Grade[] = [
  {
    id: 1,
    studentId: 1,
    subject: "Mathématiques",
    score: 17, // 85/100 → ~17/20
    date: "2023-10-20",
  },
  {
    id: 2,
    studentId: 1,
    subject: "Français",
    score: 15.5, // 78/100 → ~15.5/20
    date: "2023-10-22",
  },
  {
    id: 3,
    studentId: 2,
    subject: "Mathématiques",
    score: 18.5, // 92/100 → ~18.5/20
    date: "2023-10-20",
  },
  {
    id: 4,
    studentId: 2,
    subject: "Français",
    score: 13.5, // 68/100 → ~13.5/20
    date: "2023-10-22",
  },
  {
    id: 5,
    studentId: 3,
    subject: "Mathématiques",
    score: 15, // 75/100 → 15/20
    date: "2023-10-20",
  },
  {
    id: 6,
    studentId: 3,
    subject: "Français",
    score: 17.5, // 88/100 → ~17.5/20
    date: "2023-10-22",
    notes: "Excellente rédaction"
  }
];

// Student functions
export const getStudents = (): Student[] => {
  return [...students];
};

export const getStudent = (id: number): Student | undefined => {
  return students.find(student => student.id === id);
};

export const addStudent = (student: Omit<Student, "id">): Student => {
  const newId = students.length > 0 ? Math.max(...students.map(s => s.id)) + 1 : 1;
  const newStudent = { ...student, id: newId };
  students.push(newStudent);
  return newStudent;
};

export const updateStudent = (id: number, studentData: Partial<Student>): Student | undefined => {
  const index = students.findIndex(student => student.id === id);
  if (index !== -1) {
    students[index] = { ...students[index], ...studentData };
    return students[index];
  }
  return undefined;
};

export const deleteStudent = (id: number): boolean => {
  const initialLength = students.length;
  students = students.filter(student => student.id !== id);
  return students.length !== initialLength;
};

// Attendance functions
export const getAttendanceRecords = (): AttendanceRecord[] => {
  return [...attendance];
};

export const getStudentAttendance = (studentId: number): AttendanceRecord[] => {
  return attendance.filter(record => record.studentId === studentId);
};

export const addAttendanceRecord = (record: Omit<AttendanceRecord, "id">): AttendanceRecord => {
  const newId = attendance.length > 0 ? Math.max(...attendance.map(a => a.id)) + 1 : 1;
  const newRecord = { ...record, id: newId };
  attendance.push(newRecord);
  return newRecord;
};

export const updateAttendanceRecord = (id: number, data: Partial<AttendanceRecord>): AttendanceRecord | undefined => {
  const index = attendance.findIndex(record => record.id === id);
  if (index !== -1) {
    attendance[index] = { ...attendance[index], ...data };
    return attendance[index];
  }
  return undefined;
};

export const deleteAttendanceRecord = (id: number): boolean => {
  const initialLength = attendance.length;
  attendance = attendance.filter(record => record.id !== id);
  return attendance.length !== initialLength;
};

// Payment functions
export const getPayments = (): Payment[] => {
  return [...payments];
};

export const getStudentPayments = (studentId: number): Payment[] => {
  return payments.filter(payment => payment.studentId === studentId);
};

export const addPayment = (payment: Omit<Payment, "id">): Payment => {
  const newId = payments.length > 0 ? Math.max(...payments.map(p => p.id)) + 1 : 1;
  const newPayment = { ...payment, id: newId };
  payments.push(newPayment);
  return newPayment;
};

export const updatePayment = (id: number, data: Partial<Payment>): Payment | undefined => {
  const index = payments.findIndex(payment => payment.id === id);
  if (index !== -1) {
    payments[index] = { ...payments[index], ...data };
    return payments[index];
  }
  return undefined;
};

export const deletePayment = (id: number): boolean => {
  const initialLength = payments.length;
  payments = payments.filter(payment => payment.id !== id);
  return payments.length !== initialLength;
};

// Grade functions
export const getGrades = (): Grade[] => {
  return [...grades];
};

export const getStudentGrades = (studentId: number): Grade[] => {
  return grades.filter(grade => grade.studentId === studentId);
};

export const addGrade = (grade: Omit<Grade, "id">): Grade => {
  const newId = grades.length > 0 ? Math.max(...grades.map(g => g.id)) + 1 : 1;
  const newGrade = { ...grade, id: newId };
  grades.push(newGrade);
  return newGrade;
};

export const updateGrade = (id: number, data: Partial<Grade>): Grade | undefined => {
  const index = grades.findIndex(grade => grade.id === id);
  if (index !== -1) {
    grades[index] = { ...grades[index], ...data };
    return grades[index];
  }
  return undefined;
};

export const deleteGrade = (id: number): boolean => {
  const initialLength = grades.length;
  grades = grades.filter(grade => grade.id !== id);
  return grades.length !== initialLength;
};

// Dashboard statistics
export const getDashboardStats = (): DashboardStats => {
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = new Date().toISOString().substring(0, 7);
  
  const todayAttendance = attendance.filter(record => record.date === today);
  const present = todayAttendance.filter(record => record.status === 'present').length;
  const absent = todayAttendance.filter(record => record.status === 'absent').length;
  const late = todayAttendance.filter(record => record.status === 'late').length;
  
  const paymentsThisMonth = payments
    .filter(payment => payment.date.startsWith(thisMonth))
    .reduce((sum, payment) => sum + payment.amount, 0);
  
  const recentGrades = grades.length;
  
  return {
    totalStudents: students.length,
    attendanceToday: {
      present,
      absent,
      late
    },
    paymentsThisMonth,
    recentGrades
  };
};

// Nouvelle fonction pour obtenir toutes les classes disponibles
export const getAvailableClasses = (): string[] => {
  const classSet = new Set<string>();
  students.forEach(student => {
    if (student.className) {
      classSet.add(student.className);
    }
  });
  return Array.from(classSet).sort();
};

// Nouvelles fonctions pour calculer les résultats d'une classe
export const getClassResults = (
  className: string, 
  term: '1er trimestre' | '2e trimestre' | '3e trimestre',
  useWeightedAverage: boolean = true
): ClassResult[] => {
  // Récupérer tous les étudiants de cette classe
  const classStudents = students.filter(student => student.className === className);
  
  // Initialiser le tableau des résultats
  const results: ClassResult[] = [];
  
  // Pour chaque étudiant, calculer sa moyenne
  for (const student of classStudents) {
    // Récupérer toutes les notes de composition de l'étudiant pour ce trimestre
    const studentGrades = grades.filter(
      grade => grade.studentId === student.id && 
              grade.evaluationType === 'composition' && 
              grade.term === term
    );
    
    // Si l'étudiant n'a pas de notes pour ce trimestre, continuer au suivant
    if (studentGrades.length === 0) continue;
    
    // Regrouper les notes par matière
    const subjectGrades: {[subject: string]: Grade[]} = {};
    
    studentGrades.forEach(grade => {
      if (!subjectGrades[grade.subject]) {
        subjectGrades[grade.subject] = [];
      }
      subjectGrades[grade.subject].push(grade);
    });
    
    // Calculer la moyenne pour chaque matière
    const subjectAverages: {
      [subject: string]: {
        average: number;
        coefficient: number;
      }
    } = {};
    
    let totalPoints = 0;
    let totalCoefficients = 0;
    
    Object.keys(subjectGrades).forEach(subject => {
      const grades = subjectGrades[subject];
      const average = grades.reduce((sum, grade) => sum + grade.score, 0) / grades.length;
      const coefficient = grades[0].coefficient || 1; // Utiliser le coefficient de la première note si disponible
      
      subjectAverages[subject] = { average, coefficient };
      
      if (useWeightedAverage) {
        totalPoints += average * coefficient;
        totalCoefficients += coefficient;
      } else {
        totalPoints += average;
        totalCoefficients += 1;
      }
    });
    
    // Calculer la moyenne générale
    const average = totalCoefficients > 0 ? totalPoints / totalCoefficients : 0;
    
    // Ajouter aux résultats
    results.push({
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      average: parseFloat(average.toFixed(2)),
      rank: 0, // Sera déterminé plus tard
      status: average >= 10 ? 'admis' : 'échec',
      subjects: subjectAverages
    });
  }
  
  // Trier les résultats par moyenne décroissante et attribuer les rangs
  results.sort((a, b) => b.average - a.average);
  
  results.forEach((result, index) => {
    result.rank = index + 1;
  });
  
  return results;
};
