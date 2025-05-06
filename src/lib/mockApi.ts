
import { Student, AttendanceRecord, Payment, Grade, Subject, Teacher, Schedule, ClassWithDetails } from '@/types';

// Mock data store
let students: Student[] = [];
let attendanceRecords: AttendanceRecord[] = [];
let payments: Payment[] = [];
let grades: Grade[] = [];
let subjects: Subject[] = [];
let teachers: Teacher[] = [];
let schedules: Schedule[] = [];

// Mock API functions

// STUDENTS
export const getStudents = (): Student[] => {
  return [...students];
};

export const getStudent = (id: number): Student | undefined => {
  return students.find(student => student.id === id);
};

export const addStudent = (student: Omit<Student, "id">): Student => {
  const newStudent = {
    ...student,
    id: Math.max(0, ...students.map(s => s.id)) + 1
  };
  students.push(newStudent);
  return newStudent;
};

export const updateStudent = (id: number, data: Partial<Student>): Student => {
  const index = students.findIndex(student => student.id === id);
  if (index === -1) throw new Error('Student not found');
  
  students[index] = { ...students[index], ...data };
  return students[index];
};

export const deleteStudent = (id: number): void => {
  students = students.filter(student => student.id !== id);
  
  // Also clean up related data
  attendanceRecords = attendanceRecords.filter(record => record.studentId !== id);
  payments = payments.filter(payment => payment.studentId !== id);
  grades = grades.filter(grade => grade.studentId !== id);
};

// ATTENDANCE
export const getAttendanceRecords = (): AttendanceRecord[] => {
  return [...attendanceRecords];
};

export const getStudentAttendance = (studentId: number): AttendanceRecord[] => {
  return attendanceRecords.filter(record => record.studentId === studentId);
};

export const addAttendanceRecord = (record: Omit<AttendanceRecord, "id">): AttendanceRecord => {
  const newRecord = {
    ...record,
    id: Math.max(0, ...attendanceRecords.map(r => r.id)) + 1
  };
  attendanceRecords.push(newRecord);
  return newRecord;
};

export const updateAttendanceRecord = (id: number, data: Partial<AttendanceRecord>): AttendanceRecord => {
  const index = attendanceRecords.findIndex(record => record.id === id);
  if (index === -1) throw new Error('Attendance record not found');
  
  attendanceRecords[index] = { ...attendanceRecords[index], ...data };
  return attendanceRecords[index];
};

export const deleteAttendanceRecord = (id: number): void => {
  attendanceRecords = attendanceRecords.filter(record => record.id !== id);
};

// PAYMENTS
export const getPayments = (): Payment[] => {
  return [...payments];
};

export const getStudentPayments = (studentId: number): Payment[] => {
  return payments.filter(payment => payment.studentId === studentId);
};

export const addPayment = (payment: Omit<Payment, "id">): Payment => {
  const newPayment = {
    ...payment,
    id: Math.max(0, ...payments.map(p => p.id)) + 1
  };
  payments.push(newPayment);
  return newPayment;
};

export const updatePayment = (id: number, data: Partial<Payment>): Payment => {
  const index = payments.findIndex(payment => payment.id === id);
  if (index === -1) throw new Error('Payment not found');
  
  payments[index] = { ...payments[index], ...data };
  return payments[index];
};

export const deletePayment = (id: number): void => {
  payments = payments.filter(payment => payment.id !== id);
};

// GRADES
export const getGrades = (): Grade[] => {
  return [...grades];
};

export const getStudentGrades = (studentId: number): Grade[] => {
  return grades.filter(grade => grade.studentId === studentId);
};

export const addGrade = (grade: Omit<Grade, "id">): Grade => {
  const newGrade = {
    ...grade,
    id: Math.max(0, ...grades.map(g => g.id)) + 1
  };
  grades.push(newGrade);
  return newGrade;
};

export const updateGrade = (id: number, data: Partial<Grade>): Grade => {
  const index = grades.findIndex(grade => grade.id === id);
  if (index === -1) throw new Error('Grade not found');
  
  grades[index] = { ...grades[index], ...data };
  return grades[index];
};

export const deleteGrade = (id: number): void => {
  grades = grades.filter(grade => grade.id !== id);
};

// TEACHERS
export const getTeachers = (): Teacher[] => {
  return [...teachers];
};

export const getTeacher = (id: number): Teacher | undefined => {
  return teachers.find(teacher => teacher.id === id);
};

export const addTeacher = (teacher: Omit<Teacher, "id">): Teacher => {
  const newTeacher = {
    ...teacher,
    id: Math.max(0, ...teachers.map(t => t.id)) + 1
  };
  teachers.push(newTeacher);
  return newTeacher;
};

export const updateTeacher = (id: number, data: Partial<Teacher>): Teacher => {
  const index = teachers.findIndex(teacher => teacher.id === id);
  if (index === -1) throw new Error('Teacher not found');
  
  teachers[index] = { ...teachers[index], ...data };
  return teachers[index];
};

export const deleteTeacher = (id: number): void => {
  teachers = teachers.filter(teacher => teacher.id !== id);
  
  // Update subjects that had this teacher
  subjects = subjects.map(subject => 
    subject.teacherId === id 
      ? { ...subject, teacherId: 0 } // Set to 0 or handle differently
      : subject
  );
};

// SUBJECTS
export const getSubjects = (): Subject[] => {
  return [...subjects];
};

export const getSubject = (id: number): Subject | undefined => {
  return subjects.find(subject => subject.id === id);
};

export const getSubjectsByClass = (className: string): Subject[] => {
  const classIdMap: Record<string, number> = {
    'Terminale A': 1,
    'Terminale C': 2,
    'Terminale D': 3,
    'Première A': 4,
    'Première C': 5,
    'Première D': 6,
    'Seconde A': 7,
    'Seconde C': 8,
  };
  
  const classId = classIdMap[className] || 0;
  return subjects.filter(subject => subject.classId === classId);
};

export const getAllSubjects = (): Subject[] => {
  return [...subjects];
};

export const addSubject = (subject: Omit<Subject, "id">): Subject => {
  const newSubject = {
    ...subject,
    id: Math.max(0, ...subjects.map(s => s.id)) + 1
  };
  subjects.push(newSubject);
  return newSubject;
};

export const updateSubject = (id: number, data: Partial<Subject>): Subject => {
  const index = subjects.findIndex(subject => subject.id === id);
  if (index === -1) throw new Error('Subject not found');
  
  subjects[index] = { ...subjects[index], ...data };
  return subjects[index];
};

export const deleteSubject = (id: number): void => {
  subjects = subjects.filter(subject => subject.id !== id);
  
  // Also delete schedules for this subject
  schedules = schedules.filter(schedule => schedule.subjectId !== id);
};

// SCHEDULES
export const getSchedules = (): Schedule[] => {
  return [...schedules];
};

export const getSubjectSchedules = (subjectId: number): Schedule[] => {
  return schedules.filter(schedule => schedule.subjectId === subjectId);
};

export const addSchedule = (schedule: Omit<Schedule, "id">): Schedule => {
  const newSchedule = {
    ...schedule,
    id: Math.max(0, ...schedules.map(s => s.id)) + 1
  };
  schedules.push(newSchedule);
  return newSchedule;
};

export const updateSchedule = (id: number, data: Partial<Schedule>): Schedule => {
  const index = schedules.findIndex(schedule => schedule.id === id);
  if (index === -1) throw new Error('Schedule not found');
  
  schedules[index] = { ...schedules[index], ...data };
  return schedules[index];
};

export const deleteSchedule = (id: number): void => {
  schedules = schedules.filter(schedule => schedule.id !== id);
};

// CLASS OPERATIONS
export const getClassDetails = (className: string): ClassWithDetails | undefined => {
  const classIdMap: Record<string, number> = {
    'Terminale A': 1,
    'Terminale C': 2,
    'Terminale D': 3,
    'Première A': 4,
    'Première C': 5,
    'Première D': 6,
    'Seconde A': 7,
    'Seconde C': 8,
  };
  
  const classId = classIdMap[className];
  if (!classId) return undefined;
  
  const classSubjects = subjects.filter(subject => subject.classId === classId);
  
  // Attach teacher details to each subject
  const subjectsWithDetails = classSubjects.map(subject => {
    const teacher = teachers.find(t => t.id === subject.teacherId);
    const subjectSchedules = schedules.filter(s => s.subjectId === subject.id);
    return {
      ...subject,
      teacher,
      schedules: subjectSchedules
    };
  });
  
  return {
    id: classId,
    name: className,
    subjects: subjectsWithDetails
  };
};

export const getAvailableClasses = (): string[] => {
  return [
    'Terminale A',
    'Terminale C',
    'Terminale D',
    'Première A',
    'Première C',
    'Première D',
    'Seconde A',
    'Seconde C',
  ];
};

// Helper function to get the students in a specific class
export const getStudentsByClass = (className: string): Student[] => {
  return students.filter(student => student.className === className);
};

// Function to calculate class results
export const getClassResults = (className: string, term: '1er trimestre' | '2e trimestre' | '3e trimestre', useWeightedAverage: boolean = true) => {
  const classStudents = getStudentsByClass(className);
  const classSubjects = getSubjectsByClass(className);
  
  return classStudents.map(student => {
    const studentGrades = grades.filter(
      grade => grade.studentId === student.id && grade.term === term
    );
    
    // Group grades by subject
    const subjectGrades = studentGrades.reduce((acc, grade) => {
      if (!acc[grade.subject]) {
        acc[grade.subject] = [];
      }
      acc[grade.subject].push(grade);
      return acc;
    }, {} as Record<string, Grade[]>);
    
    // Calculate average for each subject
    const subjectAverages = {} as Record<string, { average: number; coefficient: number }>;
    
    for (const subject of classSubjects) {
      const subjectName = subject.name;
      const gradesForSubject = subjectGrades[subjectName] || [];
      
      if (gradesForSubject.length > 0) {
        // Calculate the average for this subject
        let sum = 0;
        let weightSum = 0;
        
        for (const grade of gradesForSubject) {
          const weight = grade.coefficient || 1;
          sum += grade.score * weight;
          weightSum += weight;
        }
        
        const average = weightSum > 0 ? sum / weightSum : 0;
        
        subjectAverages[subjectName] = {
          average,
          coefficient: subject.coefficient
        };
      }
    }
    
    // Calculate overall average
    let overallSum = 0;
    let overallWeightSum = 0;
    
    Object.entries(subjectAverages).forEach(([subjectName, { average, coefficient }]) => {
      if (useWeightedAverage) {
        overallSum += average * coefficient;
        overallWeightSum += coefficient;
      } else {
        overallSum += average;
        overallWeightSum += 1;
      }
    });
    
    const overallAverage = overallWeightSum > 0 ? overallSum / overallWeightSum : 0;
    
    return {
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      average: overallAverage,
      subjects: subjectAverages,
      // These will be filled in after sorting
      rank: 0,
      status: overallAverage >= 10 ? 'admis' as const : 'échec' as const
    };
  })
  .filter(result => Object.keys(result.subjects).length > 0)
  .sort((a, b) => b.average - a.average)
  .map((result, index) => ({
    ...result,
    rank: index + 1
  }));
};

// INITIALIZATION
export const initializeMockData = () => {
  // Initialize teachers
  teachers = [
    { id: 1, firstName: "Jean", lastName: "Dupont", email: "jean.dupont@email.com", phone: "0123456789" },
    { id: 2, firstName: "Marie", lastName: "Laurent", email: "marie.laurent@email.com", phone: "0234567891" },
    { id: 3, firstName: "Philippe", lastName: "Martin", email: "philippe.martin@email.com", phone: "0345678912" },
    { id: 4, firstName: "Sophie", lastName: "Bernard", email: "sophie.bernard@email.com", phone: "0456789123" },
    { id: 5, firstName: "Thomas", lastName: "Petit", email: "thomas.petit@email.com", phone: "0567891234" },
  ];

  // Initialize subjects with coefficient
  subjects = [
    { id: 1, name: "Mathématiques", classId: 2, teacherId: 1, coefficient: 4 },
    { id: 2, name: "Physique", classId: 2, teacherId: 2, coefficient: 3 },
    { id: 3, name: "Français", classId: 2, teacherId: 3, coefficient: 2 },
    { id: 4, name: "Histoire-Géo", classId: 2, teacherId: 4, coefficient: 2 },
    { id: 5, name: "Anglais", classId: 2, teacherId: 5, coefficient: 2 },
    { id: 6, name: "Philosophie", classId: 1, teacherId: 3, coefficient: 4 },
    { id: 7, name: "Littérature", classId: 1, teacherId: 3, coefficient: 3 },
    { id: 8, name: "SVT", classId: 3, teacherId: 5, coefficient: 3 },
  ];

  // Initialize students
  students = [
    {
      id: 1,
      firstName: "Adam",
      lastName: "Diop",
      email: "adam.diop@email.com",
      phone: "0600000001",
      dateOfBirth: "2005-03-15",
      address: "123 Rue Principale, Dakar",
      enrollmentDate: "2023-09-01",
      status: "active",
      className: "Terminale C",
      parentInfo: {
        fatherName: "Mohamed Diop",
        fatherPhone: "0600000002",
        fatherEmail: "mohamed.diop@email.com",
        motherName: "Fatou Diop",
        motherPhone: "0600000003",
        motherEmail: "fatou.diop@email.com"
      }
    },
    {
      id: 2,
      firstName: "Aminata",
      lastName: "Sow",
      email: "aminata.sow@email.com",
      phone: "0600000004",
      dateOfBirth: "2006-05-22",
      address: "456 Avenue Centrale, Dakar",
      enrollmentDate: "2023-09-01",
      status: "active",
      className: "Première A",
      parentInfo: {
        fatherName: "Ibrahima Sow",
        fatherPhone: "0600000005",
        fatherEmail: "ibrahima.sow@email.com",
        motherName: "Mariama Sow",
        motherPhone: "0600000006",
        motherEmail: "mariama.sow@email.com"
      }
    },
    {
      id: 3,
      firstName: "Omar",
      lastName: "Ndiaye",
      email: "omar.ndiaye@email.com",
      phone: "0600000007",
      dateOfBirth: "2005-11-10",
      address: "789 Boulevard du Commerce, Dakar",
      enrollmentDate: "2022-09-01",
      status: "active",
      className: "Terminale C",
      parentInfo: {
        fatherName: "Mamadou Ndiaye",
        fatherPhone: "0600000008",
        fatherEmail: "mamadou.ndiaye@email.com",
        motherName: "Aïssatou Ndiaye",
        motherPhone: "0600000009",
        motherEmail: "aissatou.ndiaye@email.com"
      }
    },
    {
      id: 4,
      firstName: "Fatima",
      lastName: "Ba",
      email: "fatima.ba@email.com",
      phone: "0600000010",
      dateOfBirth: "2007-02-18",
      address: "101 Rue de l'École, Dakar",
      enrollmentDate: "2023-09-01",
      status: "active",
      className: "Seconde C",
      parentInfo: {
        fatherName: "Abdoulaye Ba",
        fatherPhone: "0600000011",
        fatherEmail: "abdoulaye.ba@email.com",
        motherName: "Rama Ba",
        motherPhone: "0600000012",
        motherEmail: "rama.ba@email.com"
      }
    }
  ];

  // Initialize attendance records
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  attendanceRecords = [
    {
      id: 1,
      studentId: 1,
      date: today.toISOString().split('T')[0],
      status: "present",
      notes: "Arrivé à l'heure"
    },
    {
      id: 2,
      studentId: 2,
      date: today.toISOString().split('T')[0],
      status: "absent",
      notes: "Absent sans justificatif"
    },
    {
      id: 3,
      studentId: 3,
      date: today.toISOString().split('T')[0],
      status: "late",
      notes: "Retard de 15 minutes"
    },
    {
      id: 4,
      studentId: 4,
      date: today.toISOString().split('T')[0],
      status: "present",
      notes: ""
    },
    {
      id: 5,
      studentId: 1,
      date: yesterday.toISOString().split('T')[0],
      status: "present",
      notes: ""
    },
    {
      id: 6,
      studentId: 2,
      date: yesterday.toISOString().split('T')[0],
      status: "present",
      notes: ""
    },
    {
      id: 7,
      studentId: 3,
      date: yesterday.toISOString().split('T')[0],
      status: "excused",
      notes: "Rendez-vous médical"
    },
    {
      id: 8,
      studentId: 4,
      date: yesterday.toISOString().split('T')[0],
      status: "present",
      notes: ""
    }
  ];

  // Initialize payments
  payments = [
    {
      id: 1,
      studentId: 1,
      amount: 150000,
      date: "2023-09-05",
      type: "tuition",
      status: "paid",
      currency: "FCFA"
    },
    {
      id: 2,
      studentId: 1,
      amount: 25000,
      date: "2023-09-10",
      type: "books",
      status: "paid",
      currency: "FCFA"
    },
    {
      id: 3,
      studentId: 2,
      amount: 150000,
      date: "2023-09-03",
      type: "tuition",
      status: "paid",
      currency: "FCFA"
    },
    {
      id: 4,
      studentId: 3,
      amount: 150000,
      date: "2023-09-15",
      type: "tuition",
      status: "paid",
      currency: "FCFA"
    },
    {
      id: 5,
      studentId: 4,
      amount: 150000,
      date: "2023-10-05",
      type: "tuition",
      status: "overdue",
      notes: "Rappel envoyé",
      currency: "FCFA"
    }
  ];

  // Initialize grades
  grades = [
    {
      id: 1,
      studentId: 1,
      subject: "Mathématiques",
      score: 16,
      date: "2023-10-15",
      notes: "Excellent travail",
      evaluationType: "devoir",
      term: "1er trimestre",
      coefficient: 2
    },
    {
      id: 2,
      studentId: 1,
      subject: "Physique",
      score: 14,
      date: "2023-10-20",
      evaluationType: "devoir",
      term: "1er trimestre",
      coefficient: 1
    },
    {
      id: 3,
      studentId: 2,
      subject: "Philosophie",
      score: 12,
      date: "2023-10-10",
      evaluationType: "devoir",
      term: "1er trimestre",
      coefficient: 1
    },
    {
      id: 4,
      studentId: 3,
      subject: "Mathématiques",
      score: 15,
      date: "2023-10-15",
      evaluationType: "composition",
      term: "1er trimestre",
      coefficient: 4
    },
    {
      id: 5,
      studentId: 4,
      subject: "SVT",
      score: 18,
      date: "2023-10-18",
      notes: "Très bon travail",
      evaluationType: "devoir",
      term: "1er trimestre",
      coefficient: 1
    }
  ];

  // Initialize schedules
  schedules = [
    {
      id: 1,
      subjectId: 1,
      dayOfWeek: "Lundi",
      startTime: "08:00",
      endTime: "10:00"
    },
    {
      id: 2,
      subjectId: 2,
      dayOfWeek: "Lundi",
      startTime: "10:15",
      endTime: "12:15"
    },
    {
      id: 3,
      subjectId: 3,
      dayOfWeek: "Mardi",
      startTime: "08:00",
      endTime: "10:00"
    },
    {
      id: 4,
      subjectId: 4,
      dayOfWeek: "Mardi",
      startTime: "10:15",
      endTime: "12:15"
    }
  ];
};

// Initialize the mock data
initializeMockData();
