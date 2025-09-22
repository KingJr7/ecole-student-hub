import prisma from './prisma';
import { Student, AttendanceRecord, Payment, Grade, DashboardStats, ClassResult, Teacher, Subject, Schedule, ClassWithDetails, TeacherWorkHours, TeacherStats, Employee, Settings } from "../types";

// Import mock implementations for client-side
import * as mockApi from './mockApi';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Settings operations
export const getSettings = async (): Promise<Settings | null> => {
  if (isBrowser) {
    
    return window.api.invoke('db:settings:get');
  } else {
    return Promise.resolve(mockApi.getSettings());
  }
};

// Employee operations
export const getEmployees = async (): Promise<Employee[]> => {
  if (isBrowser) {
    
    return window.api.invoke('db:employees:getAll');
  } else {
    return Promise.resolve(mockApi.getEmployees());
  }
};

export const addEmployee = async (employee: Omit<Employee, 'id' | 'matricule'>): Promise<Employee> => {
  if (isBrowser) {
    
    return window.api.invoke('db:employees:create', employee);
  } else {
    return Promise.resolve(mockApi.addEmployee(employee));
  }
};

export const updateEmployee = async (id: number, data: Partial<Employee>): Promise<Employee> => {
  if (isBrowser) {
    
    return window.api.invoke('db:employees:update', { id, data });
  } else {
    return Promise.resolve(mockApi.updateEmployee(id, data));
  }
};

export const deleteEmployee = async (id: number): Promise<void> => {
  if (isBrowser) {
    
    return window.api.invoke('db:employees:delete', id);
  } else {
    return Promise.resolve(mockApi.deleteEmployee(id));
  }
};

export const paySalary = async (data: { employee_id: number; base_salary: number; bonus_amount: number; payment_date: string; notes?: string }): Promise<void> => {
  if (isBrowser) {
    
    return window.api.invoke('db:employees:paySalary', data);
  } else {
    return Promise.resolve();
  }
};

export const getSalaryHistory = async (employeeId: number): Promise<any[]> => {
  if (isBrowser) {
    
    return window.api.invoke('db:employees:getSalaryHistory', employeeId);
  } else {
    return Promise.resolve([]);
  }
};

export const getEmployeeStats = async (): Promise<{ totalEmployees: number; monthlyPayroll: number; }> => {
  if (isBrowser) {
    
    return window.api.invoke('db:employees:getStats');
  } else {
    return Promise.resolve({ totalEmployees: 0, monthlyPayroll: 0 });
  }
};


// Class operations
export const getClasses = async () => {
  if (isBrowser) {
    return Promise.resolve(mockApi.getClasses());
  } else {
    return await prisma.class.findMany();
  }
};

export const getClassWithDetails = async (className: string) => {
  if (isBrowser) {
    return Promise.resolve(mockApi.getClassDetails(className));
  } else {
    const classObj = await prisma.class.findFirst({
      where: { name: className },
      include: {
        subjects: {
          include: {
            teacher: true,
            schedules: true
          }
        },
        students: true
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
        teacherName: subject.teacher ? `${subject.teacher.firstName} ${subject.teacher.lastName}` : '',
        coefficient: subject.coefficient || 1,
        schedules: subject.schedules.map(schedule => ({
          id: schedule.id,
          subjectId: schedule.subjectId,
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime
        }))
      })),
      students: classObj.students.map(student => ({
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        enrollmentDate: student.enrollmentDate
      }))
    };
  }
};

export const getClass = async (id: number) => {
  if (isBrowser) {
    return Promise.resolve(mockApi.getClass(id));
  } else {
    return await prisma.class.findUnique({
      where: { id }
    });
  }
};

export const addClass = async (name: string) => {
  if (isBrowser) {
    return Promise.resolve(mockApi.addClass(name));
  } else {
    return await prisma.class.create({
      data: { name }
    });
  }
};

export const updateClass = async (id: number, name: string) => {
  if (isBrowser) {
    return Promise.resolve(mockApi.updateClass(id, name));
  } else {
    return await prisma.class.update({
      where: { id },
      data: { name }
    });
  }
};

export const deleteClass = async (id: number) => {
  if (isBrowser) {
    return Promise.resolve(mockApi.deleteClass(id));
  } else {
    return await prisma.class.delete({
      where: { id }
    });
  }
};

// Teacher operations
export const getTeachers = async () => {
  if (isBrowser) {
    // Utiliser l'API Electron via IPC
    
    try {
      const teachers = await window.api.invoke('db:teachers:getAll');
      return teachers;
    } catch (error) {
      console.error('Erreur lors de la récupération des professeurs:', error);
      return [];
    }
  } else {
    return Promise.resolve(mockApi.getTeachers());
  }
};

export const getTeacher = async (id: number) => {
  if (isBrowser) {
    
    try {
      return await window.api.invoke('db:teachers:getById', id);
    } catch (error) {
      console.error(`Erreur lors de la récupération du professeur id=${id}:`, error);
      return null;
    }
  } else {
    return Promise.resolve(mockApi.getTeacher(id));
  }
};

export const addTeacher = async (teacher: Omit<Teacher, "id">) => {
  if (isBrowser) {
    
    try {
      const newTeacher = await window.api.invoke('db:teachers:create', teacher);
      return newTeacher;
    } catch (error) {
      console.error('Erreur lors de la création du professeur:', error);
      throw error;
    }
  } else {
    return Promise.resolve(mockApi.addTeacher(teacher));
  }
};

export const updateTeacher = async (id: number, data: Partial<Teacher>) => {
  if (isBrowser) {
    
    try {
      return await window.api.invoke('db:teachers:update', { id, data });
    } catch (error) {
      console.error(`Erreur lors de la mise à jour du professeur id=${id}:`, error);
      throw error;
    }
  } else {
    return Promise.resolve(mockApi.updateTeacher(id, data));
  }
};

export const deleteTeacher = async (id: number) => {
  if (isBrowser) {
    
    try {
      await window.api.invoke('db:teachers:delete', id);
      return true;
    } catch (error) {
      console.error(`Erreur lors de la suppression du professeur id=${id}:`, error);
      throw error;
    }
  } else {
    return Promise.resolve(mockApi.deleteTeacher(id));
  }
};

export const getTeacherSubjects = async (teacherId: number) => {
  if (isBrowser) {
    
    try {
      return await window.api.invoke('db:teachers:getSubjects', teacherId);
    } catch (error) {
      console.error(`Erreur lors de la récupération des matières du professeur id=${teacherId}:`, error);
      return [];
    }
  } else {
    return Promise.resolve([]); // Mock API à implémenter si nécessaire
  }
};

export const calculateTeacherSalary = async (teacherId: number, month: string, year: string) => {
  if (isBrowser) {
    
    try {
      return await window.api.invoke('db:teachers:calculateSalary', teacherId, month, year);
    } catch (error) {
      console.error(`Erreur lors du calcul du salaire du professeur id=${teacherId}:`, error);
      return {
        teacherId,
        totalHours: 0,
        hourlyRate: 0,
        totalSalary: 0
      };
    }
  } else {
    return Promise.resolve({
      teacherId,
      totalHours: 0,
      hourlyRate: 0,
      totalSalary: 0
    });
  }
};

// Teacher Work Hours operations
export const getTeacherWorkHours = async (teacherId: number) => {
  if (isBrowser) {
    
    try {
      return await window.api.invoke('db:teacherWorkHours:getByTeacherId', teacherId);
    } catch (error) {
      console.error(`Erreur lors de la récupération des heures de travail du professeur id=${teacherId}:`, error);
      return [];
    }
  } else {
    return Promise.resolve([]);
  }
};

export const getTeacherWorkHoursToday = async (teacherId: number) => {
  if (isBrowser) {
    try {
      const today = new Date();
      const dateString = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
      return await window.api.invoke('db:teacherWorkHours:getTodayByTeacherId', teacherId, dateString);
    } catch (error) {
      console.error(`Erreur lors de la récupération des heures de travail du professeur pour aujourd'hui id=${teacherId}:`, error);
      return [];
    }
  } else {
    return Promise.resolve([]);
  }
};

export const addTeacherWorkHours = async (workHours: Omit<TeacherWorkHours, "id">) => {
  if (isBrowser) {
    
    try {
      return await window.api.invoke('db:teacherWorkHours:create', workHours);
    } catch (error) {
      console.error('Erreur lors de l\'ajout des heures de travail:', error);
      throw error;
    }
  } else {
    return Promise.resolve({ id: 0, ...workHours });
  }
};

export const updateTeacherWorkHours = async (id: number, data: Partial<TeacherWorkHours>) => {
  if (isBrowser) {
    
    try {
      return await window.api.invoke('db:teacherWorkHours:update', id, data);
    } catch (error) {
      console.error(`Erreur lors de la mise à jour des heures de travail id=${id}:`, error);
      throw error;
    }
  } else {
    return Promise.resolve({ id, ...data } as TeacherWorkHours);
  }
};

export const deleteTeacherWorkHours = async (id: number) => {
  if (isBrowser) {
    
    try {
      await window.api.invoke('db:teacherWorkHours:delete', id);
      return true;
    } catch (error) {
      console.error(`Erreur lors de la suppression des heures de travail id=${id}:`, error);
      throw error;
    }
  } else {
    return Promise.resolve(true);
  }
};

export const getTeacherSchedule = async (teacherId: number): Promise<Schedule[]> => {
  if (isBrowser) {
    try {
      const schedule = await window.api.invoke('db:teachers:getSchedule', teacherId);
      return schedule;
    } catch (error) {
      console.error(`Erreur lors de la récupération de l'emploi du temps du professeur id=${teacherId}:`, error);
      throw error;
    }
  } else {
    return Promise.resolve([]);
  }
};

export const getTeacherStats = async (teacherId: number, month: string, year: string): Promise<TeacherStats> => {
  if (isBrowser) {
    
    try {
      const stats = await window.api.invoke('db:teacherWorkHours:getStats', teacherId, month, year);
      return stats;
    } catch (error) {
      console.error(`Erreur lors de la récupération des statistiques du professeur id=${teacherId}:`, error);
      return {
        totalHoursThisMonth: 0,
        totalEarningsThisMonth: 0,
        hourlyRate: 0,
        subjectHours: []
      };
    }
  } else {
    return Promise.resolve({
      totalHoursThisMonth: 0,
      totalEarningsThisMonth: 0,
      hourlyRate: 0,
      subjectHours: []
    });
  }
};

// Subject operations
export const getSubjects = async (teacherId?: number) => {
  if (isBrowser) {
    
    try {
      // Si un teacherId est fourni, récupérer seulement les matières de ce professeur
      if (teacherId) {
        const subjects = await window.api.invoke('db:subjects:getByTeacherId', teacherId);
        return subjects;
      } else {
        // Sinon récupérer toutes les matières avec informations détaillées
        const subjects = await window.api.invoke('db:subjects:getAllDetailed');
        return subjects || [];
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des matières:', error);
      return [];
    }
  } else {
    // Version côté serveur (pour l'environnement de développement)
    if (teacherId) {
      return await prisma.subject.findMany({
        where: { teacherId },
        include: { teacher: true }
      });
    } else {
      return await prisma.subject.findMany({
        include: { teacher: true }
      });
    }
  }
};

export const getClassSubjects = async (classId: number) => {
  if (isBrowser) {
    // Utiliser l'API Electron via IPC
    
    try {
      // Appeler le gestionnaire IPC pour obtenir les matières d'une classe
      // Utiliser l'ancien gestionnaire qui renvoie les données de class_subjects
      const subjects = await window.api.invoke('db:classSubjects:getAll', classId);
      return subjects;
    } catch (error) {
      console.error(`Erreur lors de la récupération des matières pour la classe ${classId}:`, error);
      return [];
    }
  } else {
    return await prisma.subject.findMany({
      where: { classId },
      include: { teacher: true }
    });
  }
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
export const getStudents = async (limit?: number): Promise<Student[]> => {
  if (isBrowser) {
    
    try {
      if (limit) {
        // Utiliser getRecent si on spécifie une limite
        return await window.api.invoke('db:students:getRecent', limit);
      } else {
        // Sinon utiliser la fonction getAllStudents existante
        return await window.api.invoke('db:students:getAll');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des étudiants:', error);
      return [];
    }
  } else {
    // Code existant pour l'environnement non-browser
    return Promise.resolve(mockApi.getStudents());
  }
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
    
    if (!classObj) throw new Error(`Class "${student.className}" not found`);
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
export const getDashboardStats = async (): Promise<DashboardStats> => {
  if (isBrowser) {
    // Dans un environnement navigateur, on utilise l'API Electron via IPC
    
    try {
      const stats = await window.api.invoke('db:dashboard:getStats');
      return stats;
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques du dashboard:', error);
      // En cas d'erreur, retourne des données par défaut
      return {
        totalStudents: 0,
        attendanceToday: {
          present: 0,
          absent: 0,
          late: 0,
        },
        paymentsThisMonth: 0,
        recentGrades: 0,
      };
    }
  } else {
    // Conserver le code prisma existant pour le rendu côté serveur si nécessaire
    // Cette partie est probablement inutilisée dans une application Electron
    return Promise.resolve(mockApi.getDashboardStats());
  }
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
    // Get ALL grades for the term (both devoirs and compositions)
    const studentGrades = await prisma.grade.findMany({
      where: {
        studentId: student.id,
        term: term
      }
    });
    
    if (studentGrades.length === 0) continue;
    
    // Group grades by subject and by type (devoir/composition)
    const subjectGradesByType: {
      [subject: string]: {
        devoirs: typeof studentGrades,
        compositions: typeof studentGrades,
        coefficient: number
      }
    } = {};
    
    // Get subjects to use their coefficients
    const allSubjects = await prisma.subject.findMany();
    
    studentGrades.forEach(grade => {
      const subjectInfo = allSubjects.find(s => s.id === grade.subjectId);
      const subjectName = subjectInfo ? subjectInfo.name : `Matière ID ${grade.subjectId}`;
      
      if (!subjectGradesByType[subjectName]) {
        subjectGradesByType[subjectName] = {
          devoirs: [],
          compositions: [],
          coefficient: subjectInfo?.coefficient || 1
        };
      }
      
      if (grade.evaluationType === 'devoir') {
        subjectGradesByType[subjectName].devoirs.push(grade);
      } else { // composition
        subjectGradesByType[subjectName].compositions.push(grade);
      }
    });
    
    // Calculate average for each subject using 40/60 weighting for devoirs/compositions
    const subjectAverages: {
      [subject: string]: {
        average: number;
        coefficient: number;
      }
    } = {};
    
    let totalWeightedAverage = 0;
    let totalCoefficient = 0;
    
    Object.keys(subjectGradesByType).forEach(subjectName => {
      const subject = subjectGradesByType[subjectName];
      
        // Calculer la moyenne en prenant toutes les notes (devoirs et compositions)
      // Utiliser la formule somme(chaque_note × son_coefficient) / somme(coefficients)
      const allGrades = [...subject.devoirs, ...subject.compositions];
      
      let subjectAverage = 0;
      
      if (allGrades.length > 0) {
        let totalWeightedGrades = 0;
        let totalCoefficients = 0;
        
        allGrades.forEach(grade => {
          // Le coefficient de la note
          const noteCoefficient = grade.coefficient || 1;
          totalWeightedGrades += grade.value * noteCoefficient;
          totalCoefficients += noteCoefficient;
        });
        
        subjectAverage = totalCoefficients > 0 ? totalWeightedGrades / totalCoefficients : 0;
      }
      
      subjectAverages[subjectName] = { 
        average: subjectAverage, 
        coefficient: subject.coefficient 
      };
      
      if (useWeightedAverage) {
        totalWeightedAverage += subjectAverage * subject.coefficient;
        totalCoefficient += subject.coefficient;
      } else {
        totalWeightedAverage += subjectAverage;
        totalCoefficient += 1;
      }
    });
    
    // Calculate overall average
    const average = totalCoefficient > 0 ? totalWeightedAverage / totalCoefficient : 0;
    
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