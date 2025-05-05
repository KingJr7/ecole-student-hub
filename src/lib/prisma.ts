
// This is a mock implementation for browser environments
// In a real application, you would use an API layer to communicate with the server

// Create in-memory data stores
const inMemoryData = {
  classes: [],
  students: [],
  attendanceRecords: [],
  payments: [],
  grades: []
};

// Create a mock PrismaClient for browser environment
const createMockPrismaClient = () => {
  return {
    class: {
      findMany: async () => [...inMemoryData.classes],
      findFirst: async (query) => {
        if (!query?.where?.name) return null;
        return inMemoryData.classes.find(c => c.name === query.where.name) || null;
      },
      findUnique: async (query) => {
        if (!query?.where?.id) return null;
        return inMemoryData.classes.find(c => c.id === query.where.id) || null;
      },
      create: async (data) => {
        const newClass = {
          ...data.data,
          id: inMemoryData.classes.length > 0 ? Math.max(...inMemoryData.classes.map(c => c.id)) + 1 : 1,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        inMemoryData.classes.push(newClass);
        return newClass;
      },
      update: async (data) => {
        const index = inMemoryData.classes.findIndex(c => c.id === data.where.id);
        if (index === -1) return null;
        
        inMemoryData.classes[index] = {
          ...inMemoryData.classes[index],
          ...data.data,
          updatedAt: new Date()
        };
        
        return inMemoryData.classes[index];
      },
      delete: async (query) => {
        const index = inMemoryData.classes.findIndex(c => c.id === query.where.id);
        if (index === -1) return null;
        
        const deletedClass = inMemoryData.classes[index];
        inMemoryData.classes.splice(index, 1);
        return deletedClass;
      },
      count: async () => inMemoryData.classes.length
    },
    student: {
      findMany: async (query) => {
        let students = [...inMemoryData.students];
        
        if (query?.where?.classId) {
          students = students.filter(s => s.classId === query.where.classId);
        }
        
        if (query?.include?.class) {
          students = students.map(student => ({
            ...student,
            class: inMemoryData.classes.find(c => c.id === student.classId) || { name: 'Unknown' }
          }));
        }
        
        return students;
      },
      findFirst: async (query) => null,
      findUnique: async (query) => {
        if (!query?.where?.id) return null;
        
        const student = inMemoryData.students.find(s => s.id === query.where.id);
        if (!student) return null;
        
        if (query?.include?.class) {
          return {
            ...student,
            class: inMemoryData.classes.find(c => c.id === student.classId) || { name: 'Unknown' }
          };
        }
        
        return student;
      },
      create: async (data) => {
        const newStudent = {
          ...data.data,
          id: inMemoryData.students.length > 0 ? Math.max(...inMemoryData.students.map(s => s.id)) + 1 : 1,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        inMemoryData.students.push(newStudent);
        
        if (data.include?.class) {
          return {
            ...newStudent,
            class: inMemoryData.classes.find(c => c.id === newStudent.classId) || { name: 'Unknown' }
          };
        }
        
        return newStudent;
      },
      update: async (data) => {
        const index = inMemoryData.students.findIndex(s => s.id === data.where.id);
        if (index === -1) return null;
        
        inMemoryData.students[index] = {
          ...inMemoryData.students[index],
          ...data.data,
          updatedAt: new Date()
        };
        
        if (data.include?.class) {
          return {
            ...inMemoryData.students[index],
            class: inMemoryData.classes.find(c => c.id === inMemoryData.students[index].classId) || { name: 'Unknown' }
          };
        }
        
        return inMemoryData.students[index];
      },
      delete: async (query) => {
        const index = inMemoryData.students.findIndex(s => s.id === query.where.id);
        if (index === -1) return null;
        
        const deletedStudent = inMemoryData.students[index];
        inMemoryData.students.splice(index, 1);
        return deletedStudent;
      },
      count: async () => inMemoryData.students.length
    },
    attendanceRecord: {
      findMany: async (query) => {
        let records = [...inMemoryData.attendanceRecords];
        
        if (query?.where?.studentId) {
          records = records.filter(r => r.studentId === query.where.studentId);
        }
        
        if (query?.where?.date) {
          records = records.filter(r => r.date === query.where.date);
        }
        
        return records;
      },
      create: async (data) => {
        const newRecord = {
          ...data.data,
          id: inMemoryData.attendanceRecords.length > 0 ? Math.max(...inMemoryData.attendanceRecords.map(r => r.id)) + 1 : 1,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        inMemoryData.attendanceRecords.push(newRecord);
        return newRecord;
      },
      createMany: async (data) => {
        const newRecords = data.data.map((record, index) => ({
          ...record,
          id: (inMemoryData.attendanceRecords.length > 0 ? Math.max(...inMemoryData.attendanceRecords.map(r => r.id)) : 0) + index + 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }));
        
        inMemoryData.attendanceRecords.push(...newRecords);
        return { count: newRecords.length };
      },
      update: async (data) => {
        const index = inMemoryData.attendanceRecords.findIndex(r => r.id === data.where.id);
        if (index === -1) return null;
        
        inMemoryData.attendanceRecords[index] = {
          ...inMemoryData.attendanceRecords[index],
          ...data.data,
          updatedAt: new Date()
        };
        
        return inMemoryData.attendanceRecords[index];
      },
      delete: async (query) => {
        const index = inMemoryData.attendanceRecords.findIndex(r => r.id === query.where.id);
        if (index === -1) return null;
        
        const deletedRecord = inMemoryData.attendanceRecords[index];
        inMemoryData.attendanceRecords.splice(index, 1);
        return deletedRecord;
      }
    },
    payment: {
      findMany: async (query) => {
        let payments = [...inMemoryData.payments];
        
        if (query?.where?.studentId) {
          payments = payments.filter(p => p.studentId === query.where.studentId);
        }
        
        if (query?.where?.date?.startsWith) {
          payments = payments.filter(p => p.date.startsWith(query.where.date.startsWith));
        }
        
        return payments;
      },
      create: async (data) => {
        const newPayment = {
          ...data.data,
          id: inMemoryData.payments.length > 0 ? Math.max(...inMemoryData.payments.map(p => p.id)) + 1 : 1,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        inMemoryData.payments.push(newPayment);
        return newPayment;
      },
      createMany: async (data) => {
        const newPayments = data.data.map((payment, index) => ({
          ...payment,
          id: (inMemoryData.payments.length > 0 ? Math.max(...inMemoryData.payments.map(p => p.id)) : 0) + index + 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }));
        
        inMemoryData.payments.push(...newPayments);
        return { count: newPayments.length };
      },
      update: async (data) => {
        const index = inMemoryData.payments.findIndex(p => p.id === data.where.id);
        if (index === -1) return null;
        
        inMemoryData.payments[index] = {
          ...inMemoryData.payments[index],
          ...data.data,
          updatedAt: new Date()
        };
        
        return inMemoryData.payments[index];
      },
      delete: async (query) => {
        const index = inMemoryData.payments.findIndex(p => p.id === query.where.id);
        if (index === -1) return null;
        
        const deletedPayment = inMemoryData.payments[index];
        inMemoryData.payments.splice(index, 1);
        return deletedPayment;
      }
    },
    grade: {
      findMany: async (query) => {
        let grades = [...inMemoryData.grades];
        
        if (query?.where?.studentId) {
          grades = grades.filter(g => g.studentId === query.where.studentId);
        }
        
        if (query?.where?.evaluationType) {
          grades = grades.filter(g => g.evaluationType === query.where.evaluationType);
        }
        
        if (query?.where?.term) {
          grades = grades.filter(g => g.term === query.where.term);
        }
        
        return grades;
      },
      count: async () => inMemoryData.grades.length,
      create: async (data) => {
        const newGrade = {
          ...data.data,
          id: inMemoryData.grades.length > 0 ? Math.max(...inMemoryData.grades.map(g => g.id)) + 1 : 1,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        inMemoryData.grades.push(newGrade);
        return newGrade;
      },
      createMany: async (data) => {
        const newGrades = data.data.map((grade, index) => ({
          ...grade,
          id: (inMemoryData.grades.length > 0 ? Math.max(...inMemoryData.grades.map(g => g.id)) : 0) + index + 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }));
        
        inMemoryData.grades.push(...newGrades);
        return { count: newGrades.length };
      },
      update: async (data) => {
        const index = inMemoryData.grades.findIndex(g => g.id === data.where.id);
        if (index === -1) return null;
        
        inMemoryData.grades[index] = {
          ...inMemoryData.grades[index],
          ...data.data,
          updatedAt: new Date()
        };
        
        return inMemoryData.grades[index];
      },
      delete: async (query) => {
        const index = inMemoryData.grades.findIndex(g => g.id === query.where.id);
        if (index === -1) return null;
        
        const deletedGrade = inMemoryData.grades[index];
        inMemoryData.grades.splice(index, 1);
        return deletedGrade;
      }
    }
  };
};

// Export a mock Prisma client for browser environments
// In a real application, this would be replaced with API calls
const prisma = createMockPrismaClient();

// Add some initial data for testing
(async () => {
  // Add some classes
  const classes = [
    { name: 'Terminale S' },
    { name: 'Terminale ES' },
    { name: 'Première S' },
    { name: 'Seconde' }
  ];
  
  for (const cls of classes) {
    await prisma.class.create({ data: cls });
  }
})();

export default prisma;
