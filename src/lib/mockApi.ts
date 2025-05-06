
// Mock data for browser environment
import { Student, AttendanceRecord, Payment, Grade, DashboardStats, ClassResult, ParentInfo } from "../types";

// In-memory storage for mock data
const mockData = {
  classes: [
    { id: 1, name: "Terminale S", createdAt: new Date(), updatedAt: new Date() },
    { id: 2, name: "Première ES", createdAt: new Date(), updatedAt: new Date() }
  ],
  students: [
    {
      id: 1,
      firstName: "Marie",
      lastName: "Dupont",
      email: "marie.dupont@example.com",
      phone: "06 12 34 56 78",
      dateOfBirth: "2005-05-15",
      address: "123 Rue de Paris, 75001 Paris",
      enrollmentDate: "2022-09-01",
      status: "active" as const,
      className: "Terminale S",
      parentInfo: {
        fatherName: "Pierre Dupont",
        fatherPhone: "06 87 65 43 21",
        fatherEmail: "pierre.dupont@example.com",
        motherName: "Sophie Dupont",
        motherPhone: "06 76 54 32 10",
        motherEmail: "sophie.dupont@example.com"
      }
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
      status: "active" as const,
      className: "Première ES",
      parentInfo: {
        fatherName: "Jean Martin",
        fatherPhone: "06 12 34 56 78",
        fatherEmail: "jean.martin@example.com",
        motherName: "Marie Martin",
        motherPhone: "06 98 76 54 32",
        motherEmail: "marie.martin@example.com"
      }
    }
  ],
  attendance: [
    {
      id: 1,
      studentId: 1,
      date: "2023-11-06",
      status: "present" as const,
      notes: ""
    },
    {
      id: 2,
      studentId: 2,
      date: "2023-11-06", 
      status: "absent" as const,
      notes: "Maladie"
    }
  ],
  payments: [
    {
      id: 1,
      studentId: 1,
      amount: 500.0,
      date: "2023-10-05",
      type: "tuition" as const,
      status: "paid" as const,
      notes: "",
      currency: "FCFA" as const
    }
  ],
  grades: [
    {
      id: 1,
      studentId: 1,
      subject: "Mathématiques",
      score: 17,
      date: "2023-10-20",
      notes: "",
      evaluationType: "composition" as const,
      term: "1er trimestre" as const,
      coefficient: 4
    }
  ]
};

// Class operations
export const getClasses = async () => {
  return [...mockData.classes];
};

export const getClass = async (id: number) => {
  return mockData.classes.find(c => c.id === id) || null;
};

export const addClass = async (name: string) => {
  const newId = Math.max(0, ...mockData.classes.map(c => c.id)) + 1;
  const newClass = { 
    id: newId, 
    name, 
    createdAt: new Date(), 
    updatedAt: new Date() 
  };
  mockData.classes.push(newClass);
  return newClass;
};

export const updateClass = async (id: number, name: string) => {
  const classObj = mockData.classes.find(c => c.id === id);
  if (classObj) {
    classObj.name = name;
    classObj.updatedAt = new Date();
    return {...classObj};
  }
  throw new Error(`Class with id ${id} not found`);
};

export const deleteClass = async (id: number) => {
  const index = mockData.classes.findIndex(c => c.id === id);
  if (index !== -1) {
    const deleted = mockData.classes.splice(index, 1)[0];
    return deleted;
  }
  throw new Error(`Class with id ${id} not found`);
};

// Student operations
export const getStudents = async () => {
  return [...mockData.students];
};

export const getStudent = async (id: number) => {
  return mockData.students.find(s => s.id === id);
};

export const addStudent = async (student: Omit<Student, "id">) => {
  const newId = Math.max(0, ...mockData.students.map(s => s.id)) + 1;
  
  // Create a new student object with correct typing
  const newStudent: Student = { 
    id: newId,
    firstName: student.firstName,
    lastName: student.lastName,
    email: student.email,
    phone: student.phone,
    dateOfBirth: student.dateOfBirth,
    address: student.address,
    enrollmentDate: student.enrollmentDate,
    status: student.status,
    className: student.className,
    parentInfo: student.parentInfo
  };
  
  mockData.students.push(newStudent);
  return newStudent;
};

export const updateStudent = async (id: number, studentData: Partial<Student>) => {
  const student = mockData.students.find(s => s.id === id);
  if (student) {
    Object.assign(student, studentData);
    return {...student};
  }
  throw new Error(`Student with id ${id} not found`);
};

export const deleteStudent = async (id: number) => {
  const index = mockData.students.findIndex(s => s.id === id);
  if (index !== -1) {
    mockData.students.splice(index, 1);
    return true;
  }
  throw new Error(`Student with id ${id} not found`);
};

// Attendance operations
export const getAttendanceRecords = async () => {
  return [...mockData.attendance];
};

export const getStudentAttendance = async (studentId: number) => {
  return mockData.attendance.filter(a => a.studentId === studentId);
};

export const addAttendanceRecord = async (record: Omit<AttendanceRecord, "id">) => {
  const newId = Math.max(0, ...mockData.attendance.map(a => a.id)) + 1;
  
  // Create a new attendance record with explicit typing
  const newRecord = { 
    id: newId, 
    studentId: record.studentId,
    date: record.date,
    status: record.status,
    notes: record.notes || ""
  } as AttendanceRecord; // Use type assertion to fix the compatibility issue
  
  mockData.attendance.push(newRecord);
  return newRecord;
};

export const updateAttendanceRecord = async (id: number, data: Partial<AttendanceRecord>) => {
  const record = mockData.attendance.find(a => a.id === id);
  if (record) {
    Object.assign(record, data);
    return {...record};
  }
  throw new Error(`Attendance record with id ${id} not found`);
};

export const deleteAttendanceRecord = async (id: number) => {
  const index = mockData.attendance.findIndex(a => a.id === id);
  if (index !== -1) {
    mockData.attendance.splice(index, 1);
    return true;
  }
  throw new Error(`Attendance record with id ${id} not found`);
};

// Payment operations
export const getPayments = async () => {
  return [...mockData.payments];
};

export const getStudentPayments = async (studentId: number) => {
  return mockData.payments.filter(p => p.studentId === studentId);
};

export const addPayment = async (payment: Omit<Payment, "id">) => {
  const newId = Math.max(0, ...mockData.payments.map(p => p.id)) + 1;
  
  // Create a new payment with explicitly typed properties
  const newPayment: Payment = { 
    id: newId, 
    studentId: payment.studentId,
    amount: payment.amount,
    date: payment.date,
    type: payment.type,
    status: payment.status,
    notes: payment.notes || "",
    currency: payment.currency
  };
  
  mockData.payments.push(newPayment as any);
  return newPayment;
};

export const updatePayment = async (id: number, data: Partial<Payment>) => {
  const payment = mockData.payments.find(p => p.id === id);
  if (payment) {
    Object.assign(payment, data);
    return {...payment};
  }
  throw new Error(`Payment with id ${id} not found`);
};

export const deletePayment = async (id: number) => {
  const index = mockData.payments.findIndex(p => p.id === id);
  if (index !== -1) {
    mockData.payments.splice(index, 1);
    return true;
  }
  throw new Error(`Payment with id ${id} not found`);
};

// Grade operations
export const getGrades = async () => {
  return [...mockData.grades];
};

export const getStudentGrades = async (studentId: number) => {
  return mockData.grades.filter(g => g.studentId === studentId);
};

export const addGrade = async (grade: Omit<Grade, "id">) => {
  const newId = Math.max(0, ...mockData.grades.map(g => g.id)) + 1;
  
  // Create a new grade with explicitly typed properties
  const newGrade: Grade = { 
    id: newId, 
    studentId: grade.studentId,
    subject: grade.subject,
    score: grade.score,
    date: grade.date,
    notes: grade.notes || "", 
    evaluationType: grade.evaluationType || "composition",
    term: grade.term || "1er trimestre",
    coefficient: grade.coefficient || 1
  };
  
  mockData.grades.push(newGrade as any);
  return newGrade;
};

export const updateGrade = async (id: number, data: Partial<Grade>) => {
  const grade = mockData.grades.find(g => g.id === id);
  if (grade) {
    Object.assign(grade, data);
    return {...grade};
  }
  throw new Error(`Grade with id ${id} not found`);
};

export const deleteGrade = async (id: number) => {
  const index = mockData.grades.findIndex(g => g.id === id);
  if (index !== -1) {
    mockData.grades.splice(index, 1);
    return true;
  }
  throw new Error(`Grade with id ${id} not found`);
};

// Dashboard statistics
export const getDashboardStats = async (): Promise<DashboardStats> => {
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = new Date().toISOString().substring(0, 7);
  
  const totalStudents = mockData.students.length;
  
  const todayAttendance = mockData.attendance.filter(a => a.date === today);
  
  const present = todayAttendance.filter(record => record.status === 'present').length;
  const absent = todayAttendance.filter(record => record.status === 'absent').length;
  // Use type assertion to handle late status which might not be in the type definition
  const late = todayAttendance.filter(record => (record.status as string) === 'late').length;
  
  const paymentsThisMonth = mockData.payments
    .filter(p => p.date.startsWith(thisMonth))
    .reduce((sum, payment) => sum + payment.amount, 0);
  
  const recentGrades = mockData.grades.length;
  
  return {
    totalStudents,
    attendanceToday: {
      present,
      absent,
      late
    },
    paymentsThisMonth,
    recentGrades
  };
};

// Available classes
export const getAvailableClasses = async (): Promise<string[]> => {
  return mockData.classes.map(c => c.name);
};

// Class results
export const getClassResults = async (
  className: string, 
  term: '1er trimestre' | '2e trimestre' | '3e trimestre',
  useWeightedAverage: boolean = true
): Promise<ClassResult[]> => {
  // Find students in the class
  const students = mockData.students.filter(s => s.className === className);
  
  const results: ClassResult[] = [];
  
  // For each student, calculate average
  for (const student of students) {
    // Get composition grades for the term
    const studentGrades = mockData.grades.filter(g => 
      g.studentId === student.id && 
      g.evaluationType === 'composition' &&
      g.term === term
    );
    
    if (studentGrades.length === 0) continue;
    
    // Group grades by subject
    const subjectGrades: {[subject: string]: typeof studentGrades} = {};
    
    studentGrades.forEach(grade => {
      if (!subjectGrades[grade.subject]) {
        subjectGrades[grade.subject] = [];
      }
      subjectGrades[grade.subject].push(grade);
    });
    
    // Calculate average for each subject
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
      const coefficient = grades[0].coefficient || 1;
      
      subjectAverages[subject] = { average, coefficient };
      
      if (useWeightedAverage) {
        totalPoints += average * coefficient;
        totalCoefficients += coefficient;
      } else {
        totalPoints += average;
        totalCoefficients += 1;
      }
    });
    
    // Calculate overall average
    const average = totalCoefficients > 0 ? totalPoints / totalCoefficients : 0;
    
    // Add to results
    results.push({
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      average: parseFloat(average.toFixed(2)),
      rank: 0,
      status: average >= 10 ? 'admis' : 'échec',
      subjects: subjectAverages
    });
  }
  
  // Sort by average and assign ranks
  results.sort((a, b) => b.average - a.average);
  results.forEach((result, index) => {
    result.rank = index + 1;
  });
  
  return results;
};
