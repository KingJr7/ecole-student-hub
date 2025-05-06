
import prisma from './prisma';
import { Student, AttendanceRecord, Payment, Grade, DashboardStats, ClassResult, Teacher, Subject, Schedule, ClassWithDetails } from "../types";

// Import mock implementations for client-side
import * as mockApi from './mockApi';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Class operations
export const getClasses = isBrowser ? mockApi.getClasses : async () => {
  return await prisma.class.findMany();
};

export const getClassWithDetails = isBrowser ? mockApi.getClassWithDetails : async (id: number) => {
  const classObj = await prisma.class.findUnique({
    where: { id },
    include: {
      subjects: {
        include: {
          teacher: true,
          schedules: true
        }
      }
    }
  });
  
  if (!classObj) return null;
  
  return {
    id: classObj.id,
    name: classObj.name,
    subjects: classObj.subjects.map(subject => ({
      id: subject.id,
      name: subject.name,
      classId: subject.classId,
      teacherId: subject.teacherId,
      teacher: subject.teacher ? {
        id: subject.teacher.id,
        firstName: subject.teacher.firstName,
        lastName: subject.teacher.lastName,
        email: subject.teacher.email,
        phone: subject.teacher.phone
      } : undefined,
      schedules: subject.schedules.map(schedule => ({
        id: schedule.id,
        subjectId: schedule.subjectId,
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime
      }))
    }))
  };
};

export const getClass = isBrowser ? mockApi.getClass : async (id: number) => {
  return await prisma.class.findUnique({
    where: { id }
  });
};

export const addClass = isBrowser ? mockApi.addClass : async (name: string) => {
  return await prisma.class.create({
    data: { name }
  });
};

export const updateClass = isBrowser ? mockApi.updateClass : async (id: number, name: string) => {
  return await prisma.class.update({
    where: { id },
    data: { name }
  });
};

export const deleteClass = isBrowser ? mockApi.deleteClass : async (id: number) => {
  return await prisma.class.delete({
    where: { id }
  });
};

// Teacher operations
export const getTeachers = isBrowser ? mockApi.getTeachers : async () => {
  return await prisma.teacher.findMany();
};

export const getTeacher = isBrowser ? mockApi.getTeacher : async (id: number) => {
  return await prisma.teacher.findUnique({
    where: { id }
  });
};

export const addTeacher = isBrowser ? mockApi.addTeacher : async (teacher: Omit<Teacher, "id">) => {
  return await prisma.teacher.create({
    data: {
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      email: teacher.email,
      phone: teacher.phone
    }
  });
};

export const updateTeacher = isBrowser ? mockApi.updateTeacher : async (id: number, data: Partial<Teacher>) => {
  return await prisma.teacher.update({
    where: { id },
    data
  });
};

export const deleteTeacher = isBrowser ? mockApi.deleteTeacher : async (id: number) => {
  await prisma.teacher.delete({
    where: { id }
  });
  return true;
};

// Subject operations
export const getSubjects = isBrowser ? mockApi.getSubjects : async () => {
  return await prisma.subject.findMany({
    include: { teacher: true }
  });
};

export const getClassSubjects = isBrowser ? mockApi.getClassSubjects : async (classId: number) => {
  return await prisma.subject.findMany({
    where: { classId },
    include: { teacher: true }
  });
};

export const addSubject = isBrowser ? mockApi.addSubject : async (subject: Omit<Subject, "id">) => {
  return await prisma.subject.create({
    data: {
      name: subject.name,
      classId: subject.classId,
      teacherId: subject.teacherId,
      coefficient: subject.coefficient || 1
    }
  });
};

export const updateSubject = isBrowser ? mockApi.updateSubject : async (id: number, data: Partial<Subject>) => {
  return await prisma.subject.update({
    where: { id },
    data
  });
};

export const deleteSubject = isBrowser ? mockApi.deleteSubject : async (id: number) => {
  await prisma.subject.delete({
    where: { id }
  });
  return true;
};

// Get all available subjects
export const getAllSubjects = isBrowser ? mockApi.getAllSubjects : async () => {
  return await prisma.subject.findMany({
    include: { teacher: true }
  });
};

// Get subjects for a specific class by class name
export const getSubjectsByClass = isBrowser ? mockApi.getSubjectsByClass : async (className: string) => {
  const classObj = await prisma.class.findFirst({
    where: { name: className }
  });
  
  if (!classObj) return [];
  
  return await prisma.subject.findMany({
    where: { classId: classObj.id },
    include: { teacher: true }
  });
};

// Schedule operations
export const getSchedules = isBrowser ? mockApi.getSchedules : async () => {
  return await prisma.schedule.findMany();
};

export const getSubjectSchedules = isBrowser ? mockApi.getSubjectSchedules : async (subjectId: number) => {
  return await prisma.schedule.findMany({
    where: { subjectId }
  });
};

export const addSchedule = isBrowser ? mockApi.addSchedule : async (schedule: Omit<Schedule, "id">) => {
  return await prisma.schedule.create({
    data: {
      subjectId: schedule.subjectId,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime
    }
  });
};

export const updateSchedule = isBrowser ? mockApi.updateSchedule : async (id: number, data: Partial<Schedule>) => {
  return await prisma.schedule.update({
    where: { id },
    data
  });
};

export const deleteSchedule = isBrowser ? mockApi.deleteSchedule : async (id: number) => {
  await prisma.schedule.delete({
    where: { id }
  });
  return true;
};

// Student operations
export const getStudents = isBrowser ? mockApi.getStudents : async () => {
  const students = await prisma.student.findMany({
    include: { class: true }
  });
  
  return students.map(student => ({
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    email: student.email,
    phone: student.phone,
    dateOfBirth: student.dateOfBirth,
    address: student.address,
    enrollmentDate: student.enrollmentDate,
    status: student.status as 'active' | 'inactive' | 'graduated',
    className: student.class.name
  }));
};

export const getStudent = isBrowser ? mockApi.getStudent : async (id: number) => {
  const student = await prisma.student.findUnique({
    where: { id },
    include: { class: true }
  });
  
  if (!student) return undefined;
  
  return {
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    email: student.email,
    phone: student.phone,
    dateOfBirth: student.dateOfBirth,
    address: student.address,
    enrollmentDate: student.enrollmentDate,
    status: student.status as 'active' | 'inactive' | 'graduated',
    className: student.class.name
  };
};

export const addStudent = isBrowser ? mockApi.addStudent : async (student: Omit<Student, "id">) => {
  const classObj = await prisma.class.findFirst({
    where: { name: student.className }
  });
  
  if (!classObj) throw new Error(`Class "${student.className}" not found`);
  
  const newStudent = await prisma.student.create({
    data: {
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      phone: student.phone,
      dateOfBirth: student.dateOfBirth,
      address: student.address,
      enrollmentDate: student.enrollmentDate,
      status: student.status,
      classId: classObj.id
    },
    include: { class: true }
  });
  
  return {
    id: newStudent.id,
    firstName: newStudent.firstName,
    lastName: newStudent.lastName,
    email: newStudent.email,
    phone: newStudent.phone,
    dateOfBirth: newStudent.dateOfBirth,
    address: newStudent.address,
    enrollmentDate: newStudent.enrollmentDate,
    status: newStudent.status as 'active' | 'inactive' | 'graduated',
    className: newStudent.class.name
  };
};

export const updateStudent = isBrowser ? mockApi.updateStudent : async (id: number, studentData: Partial<Student>) => {
  let classId: number | undefined;
  
  if (studentData.className) {
    const classObj = await prisma.class.findFirst({
      where: { name: studentData.className }
    });
    
    if (!classObj) throw new Error(`Class "${studentData.className}" not found`);
    classId = classObj.id;
  }
  
  const data: any = { ...studentData };
  delete data.className;
  
  if (classId) {
    data.classId = classId;
  }
  
  const updatedStudent = await prisma.student.update({
    where: { id },
    data,
    include: { class: true }
  });
  
  return {
    id: updatedStudent.id,
    firstName: updatedStudent.firstName,
    lastName: updatedStudent.lastName,
    email: updatedStudent.email,
    phone: updatedStudent.phone,
    dateOfBirth: updatedStudent.dateOfBirth,
    address: updatedStudent.address,
    enrollmentDate: updatedStudent.enrollmentDate,
    status: updatedStudent.status as 'active' | 'inactive' | 'graduated',
    className: updatedStudent.class.name
  };
};

export const deleteStudent = isBrowser ? mockApi.deleteStudent : async (id: number) => {
  await prisma.student.delete({
    where: { id }
  });
  return true;
};

// Attendance operations
export const getAttendanceRecords = isBrowser ? mockApi.getAttendanceRecords : async () => {
  const records = await prisma.attendanceRecord.findMany();
  
  return records.map(record => ({
    id: record.id,
    studentId: record.studentId,
    date: record.date,
    status: record.status as 'present' | 'absent' | 'late' | 'excused',
    notes: record.notes || undefined
  }));
};

export const getStudentAttendance = isBrowser ? mockApi.getStudentAttendance : async (studentId: number) => {
  const records = await prisma.attendanceRecord.findMany({
    where: { studentId }
  });
  
  return records.map(record => ({
    id: record.id,
    studentId: record.studentId,
    date: record.date,
    status: record.status as 'present' | 'absent' | 'late' | 'excused',
    notes: record.notes || undefined
  }));
};

export const addAttendanceRecord = isBrowser ? mockApi.addAttendanceRecord : async (record: Omit<AttendanceRecord, "id">) => {
  const newRecord = await prisma.attendanceRecord.create({
    data: {
      studentId: record.studentId,
      date: record.date,
      status: record.status,
      notes: record.notes
    }
  });
  
  return {
    id: newRecord.id,
    studentId: newRecord.studentId,
    date: newRecord.date,
    status: newRecord.status as 'present' | 'absent' | 'late' | 'excused',
    notes: newRecord.notes || undefined
  };
};

export const updateAttendanceRecord = isBrowser ? mockApi.updateAttendanceRecord : async (id: number, data: Partial<AttendanceRecord>) => {
  const updatedRecord = await prisma.attendanceRecord.update({
    where: { id },
    data
  });
  
  return {
    id: updatedRecord.id,
    studentId: updatedRecord.studentId,
    date: updatedRecord.date,
    status: updatedRecord.status as 'present' | 'absent' | 'late' | 'excused',
    notes: updatedRecord.notes || undefined
  };
};

export const deleteAttendanceRecord = isBrowser ? mockApi.deleteAttendanceRecord : async (id: number) => {
  await prisma.attendanceRecord.delete({
    where: { id }
  });
  return true;
};

// Payment operations
export const getPayments = isBrowser ? mockApi.getPayments : async () => {
  const payments = await prisma.payment.findMany();
  
  return payments.map(payment => ({
    id: payment.id,
    studentId: payment.studentId,
    amount: payment.amount,
    date: payment.date,
    type: payment.type as 'tuition' | 'books' | 'activities' | 'other',
    status: payment.status as 'paid' | 'pending' | 'overdue',
    notes: payment.notes || undefined,
    currency: payment.currency as 'FCFA'
  }));
};

export const getStudentPayments = isBrowser ? mockApi.getStudentPayments : async (studentId: number) => {
  const payments = await prisma.payment.findMany({
    where: { studentId }
  });
  
  return payments.map(payment => ({
    id: payment.id,
    studentId: payment.studentId,
    amount: payment.amount,
    date: payment.date,
    type: payment.type as 'tuition' | 'books' | 'activities' | 'other',
    status: payment.status as 'paid' | 'pending' | 'overdue',
    notes: payment.notes || undefined,
    currency: payment.currency as 'FCFA'
  }));
};

export const addPayment = isBrowser ? mockApi.addPayment : async (payment: Omit<Payment, "id">) => {
  const newPayment = await prisma.payment.create({
    data: {
      studentId: payment.studentId,
      amount: payment.amount,
      date: payment.date,
      type: payment.type,
      status: payment.status,
      notes: payment.notes,
      currency: payment.currency
    }
  });
  
  return {
    id: newPayment.id,
    studentId: newPayment.studentId,
    amount: newPayment.amount,
    date: newPayment.date,
    type: newPayment.type as 'tuition' | 'books' | 'activities' | 'other',
    status: newPayment.status as 'paid' | 'pending' | 'overdue',
    notes: newPayment.notes || undefined,
    currency: newPayment.currency as 'FCFA'
  };
};

export const updatePayment = isBrowser ? mockApi.updatePayment : async (id: number, data: Partial<Payment>) => {
  const updatedPayment = await prisma.payment.update({
    where: { id },
    data
  });
  
  return {
    id: updatedPayment.id,
    studentId: updatedPayment.studentId,
    amount: updatedPayment.amount,
    date: updatedPayment.date,
    type: updatedPayment.type as 'tuition' | 'books' | 'activities' | 'other',
    status: updatedPayment.status as 'paid' | 'pending' | 'overdue',
    notes: updatedPayment.notes || undefined,
    currency: updatedPayment.currency as 'FCFA'
  };
};

export const deletePayment = isBrowser ? mockApi.deletePayment : async (id: number) => {
  await prisma.payment.delete({
    where: { id }
  });
  return true;
};

// Grade operations
export const getGrades = isBrowser ? mockApi.getGrades : async () => {
  const grades = await prisma.grade.findMany();
  
  return grades.map(grade => ({
    id: grade.id,
    studentId: grade.studentId,
    subject: grade.subject,
    score: grade.score,
    date: grade.date,
    notes: grade.notes || undefined,
    evaluationType: grade.evaluationType as 'devoir' | 'composition' | undefined,
    term: grade.term as '1er trimestre' | '2e trimestre' | '3e trimestre' | undefined,
    coefficient: grade.coefficient || 1
  }));
};

export const getStudentGrades = isBrowser ? mockApi.getStudentGrades : async (studentId: number) => {
  const grades = await prisma.grade.findMany({
    where: { studentId }
  });
  
  return grades.map(grade => ({
    id: grade.id,
    studentId: grade.studentId,
    subject: grade.subject,
    score: grade.score,
    date: grade.date,
    notes: grade.notes || undefined,
    evaluationType: grade.evaluationType as 'devoir' | 'composition' | undefined,
    term: grade.term as '1er trimestre' | '2e trimestre' | '3e trimestre' | undefined,
    coefficient: grade.coefficient || 1
  }));
};

export const addGrade = isBrowser ? mockApi.addGrade : async (grade: Omit<Grade, "id">) => {
  const newGrade = await prisma.grade.create({
    data: {
      studentId: grade.studentId,
      subject: grade.subject,
      score: grade.score,
      date: grade.date,
      notes: grade.notes,
      evaluationType: grade.evaluationType,
      term: grade.term,
      coefficient: grade.coefficient
    }
  });
  
  return {
    id: newGrade.id,
    studentId: newGrade.studentId,
    subject: newGrade.subject,
    score: newGrade.score,
    date: newGrade.date,
    notes: newGrade.notes || undefined,
    evaluationType: newGrade.evaluationType as 'devoir' | 'composition' | undefined,
    term: newGrade.term as '1er trimestre' | '2e trimestre' | '3e trimestre' | undefined,
    coefficient: newGrade.coefficient || 1
  };
};

export const updateGrade = isBrowser ? mockApi.updateGrade : async (id: number, data: Partial<Grade>) => {
  const updatedGrade = await prisma.grade.update({
    where: { id },
    data
  });
  
  return {
    id: updatedGrade.id,
    studentId: updatedGrade.studentId,
    subject: updatedGrade.subject,
    score: updatedGrade.score,
    date: updatedGrade.date,
    notes: updatedGrade.notes || undefined,
    evaluationType: updatedGrade.evaluationType as 'devoir' | 'composition' | undefined,
    term: updatedGrade.term as '1er trimestre' | '2e trimestre' | '3e trimestre' | undefined,
    coefficient: updatedGrade.coefficient || 1
  };
};

export const deleteGrade = isBrowser ? mockApi.deleteGrade : async (id: number) => {
  await prisma.grade.delete({
    where: { id }
  });
  return true;
};

// Dashboard statistics
export const getDashboardStats = isBrowser ? mockApi.getDashboardStats : async (): Promise<DashboardStats> => {
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = new Date().toISOString().substring(0, 7);
  
  const totalStudents = await prisma.student.count({});
  
  const todayAttendance = await prisma.attendanceRecord.findMany({
    where: { date: today }
  });
  
  const present = todayAttendance.filter(record => record.status === 'present').length;
  const absent = todayAttendance.filter(record => record.status === 'absent').length;
  const late = todayAttendance.filter(record => record.status === 'late').length;
  
  const payments = await prisma.payment.findMany({
    where: {
      date: {
        startsWith: thisMonth
      }
    }
  });
  
  const paymentsThisMonth = payments.reduce((sum, payment) => sum + payment.amount, 0);
  
  const recentGrades = await prisma.grade.count({});
  
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
export const getAvailableClasses = isBrowser ? mockApi.getAvailableClasses : async (): Promise<string[]> => {
  const classes = await prisma.class.findMany();
  
  return classes.map(c => c.name);
};

// Class results
export const getClassResults = isBrowser ? mockApi.getClassResults : async (
  className: string, 
  term: '1er trimestre' | '2e trimestre' | '3e trimestre',
  useWeightedAverage: boolean = true
): Promise<ClassResult[]> => {
  // Find the class
  const classObject = await prisma.class.findFirst({
    where: { name: className }
  });
  
  if (!classObject) return [];
  
  // Get students in the class
  const students = await prisma.student.findMany({
    where: { classId: classObject.id }
  });
  
  const results: ClassResult[] = [];
  
  // For each student, calculate average
  for (const student of students) {
    // Get composition grades for the term
    const studentGrades = await prisma.grade.findMany({
      where: {
        studentId: student.id,
        evaluationType: 'composition',
        term: term
      }
    });
    
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
