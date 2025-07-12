const { ipcMain } = require('electron');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

let isDatabaseIpcSetup = false;
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${path.join(__dirname, '../../database.sqlite')}`,
    },
  },
});

function setupDatabaseIPC() {
  if (isDatabaseIpcSetup) {
    return;
  }
  isDatabaseIpcSetup = true;

  // Handler pour récupérer les settings
  ipcMain.handle('db:settings:get', async () => {
    let settings = await prisma.settings.findUnique({ where: { id: 1 } });
    if (settings && settings.paymentMonths) {
      try {
        settings.paymentMonths = JSON.parse(settings.paymentMonths);
      } catch {
        settings.paymentMonths = [];
      }
    }
    return settings;
  });

  // Handler pour mettre à jour les settings
  ipcMain.handle('db:settings:update', async (event, data) => {
    const { schoolName, paymentMonths } = data;
    return prisma.settings.upsert({
      where: { id: 1 },
      update: { schoolName, paymentMonths: JSON.stringify(paymentMonths) },
      create: { id: 1, schoolName, paymentMonths: JSON.stringify(paymentMonths) },
    });
  });

  // #region Classes
  ipcMain.handle('db:classes:getAll', async () => {
    return prisma.classes.findMany({
      where: { is_deleted: false },
      orderBy: { name: 'asc' },
    });
  });

  ipcMain.handle('db:classes:create', async (event, classData) => {
    const { name, level } = classData;
    return prisma.classes.create({
      data: { 
        name, 
        level, 
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:classes:update', async (event, { id, data }) => {
    const { name, level } = data;
    return prisma.classes.update({
      where: { id },
      data: { 
        name, 
        level, 
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:classes:delete', async (event, id) => {
    const registrationCount = await prisma.registrations.count({
      where: { classId: id, is_deleted: false },
    });

    if (registrationCount > 0) {
      throw new Error('Impossible de supprimer une classe qui contient des étudiants inscrits');
    }

    return prisma.classes.update({
      where: { id },
      data: { 
        is_deleted: true, 
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });
  // #endregion

  // #region Students
  ipcMain.handle('db:students:getAll', async () => {
    return prisma.students.findMany({
      where: { is_deleted: false },
      include: {
        registrations: {
          where: { is_deleted: false },
          orderBy: { id: 'desc' }, // Assuming higher ID is newer
          take: 1,
          include: {
            class: true,
          },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    }).then(students => 
      students.map(s => ({
        ...s,
        className: s.registrations[0]?.class.name,
      }))
    );
  });

  ipcMain.handle('db:students:create', async (event, studentData) => {
    const { firstName, lastName, birth_date, genre, matricul } = studentData;
    return prisma.students.create({
      data: {
        firstName,
        lastName,
        birth_date,
        genre,
        matricul,
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:students:update', async (event, { id, data }) => {
    const { firstName, lastName, birth_date, genre, matricul } = data;
    return prisma.students.update({
      where: { id },
      data: {
        firstName,
        lastName,
        birth_date,
        genre,
        matricul,
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:students:delete', async (event, id) => {
    return prisma.$transaction(async (tx) => {
      await tx.students.update({
        where: { id },
        data: { 
          is_deleted: true, 
          needs_sync: true,
          last_modified: new Date(),
        },
      });
      await tx.registrations.updateMany({
        where: { studentId: id },
        data: { 
          is_deleted: true, 
          needs_sync: true,
          last_modified: new Date(),
        },
      });
      return { id };
    });
  });

  ipcMain.handle('db:students:getRecent', async () => {
    return prisma.students.findMany({
      where: { is_deleted: false },
      orderBy: { id: 'desc' },
      take: 5,
    });
  });
  // #endregion

  // #region Teachers
  ipcMain.handle('db:teachers:getAll', async () => {
    return prisma.teachers.findMany({ where: { is_deleted: false } });
  });

  ipcMain.handle('db:teachers:create', async (event, teacherData) => {
    const { firstName, lastName, email, phone, matricule, specialty } = teacherData;
    return prisma.teachers.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        matricule,
        specialty,
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:teachers:update', async (event, { id, data }) => {
    const { firstName, lastName, email, phone, matricule, specialty } = data;
    return prisma.teachers.update({
      where: { id },
      data: {
        firstName,
        lastName,
        email,
        phone,
        matricule,
        specialty,
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:teachers:delete', async (event, id) => {
    return prisma.teachers.update({
      where: { id },
      data: { 
        is_deleted: true, 
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });
  // #endregion

  // #region Payments
  ipcMain.handle('db:payments:getAll', async () => {
    return prisma.payments.findMany({
      where: { is_deleted: false },
      include: {
        registration: {
          include: {
            student: true,
            class: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    }).then(payments => 
      payments.map(p => ({
        ...p,
        firstName: p.registration?.student.firstName,
        lastName: p.registration?.student.lastName,
        className: p.registration?.class.name,
      }))
    );
  });

  ipcMain.handle('db:payments:create', async (event, paymentData) => {
    const { registrationId, amount, date, method, reference, month } = paymentData;
    return prisma.payments.create({
      data: {
        registrationId,
        amount,
        date,
        method,
        reference,
        month,
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:payments:update', async (event, { id, data }) => {
    const { registrationId, amount, date, method, reference, month } = data;
    return prisma.payments.update({
      where: { id },
      data: {
        registrationId,
        amount,
        date,
        method,
        reference,
        month,
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:payments:delete', async (event, id) => {
    return prisma.payments.update({
      where: { id },
      data: { 
        is_deleted: true, 
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:payments:getAvailableMonths', async () => {
    const payments = await prisma.payments.findMany({
      where: { is_deleted: false, month: { not: null } },
      distinct: ['month'],
      orderBy: { month: 'desc' },
      select: { month: true },
    });
    return payments.map(p => p.month);
  });
  // #endregion

  // #region Subjects
  ipcMain.handle('db:subjects:getAll', async () => {
    return prisma.subjects.findMany({
      where: { is_deleted: false },
      orderBy: { name: 'asc' },
    });
  });

  ipcMain.handle('db:subjects:create', async (event, subjectData) => {
    const { name, coefficient } = subjectData;
    return prisma.subjects.create({
      data: {
        name,
        coefficient,
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:subjects:update', async (event, { id, data }) => {
    const { name, coefficient } = data;
    return prisma.subjects.update({
      where: { id },
      data: {
        name,
        coefficient,
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:subjects:delete', async (event, id) => {
    const lessonCount = await prisma.lessons.count({
      where: { subjectId: id, is_deleted: false },
    });

    if (lessonCount > 0) {
      throw new Error('Impossible de supprimer une matière enseignée dans des leçons.');
    }

    return prisma.subjects.update({
      where: { id },
      data: { 
        is_deleted: true, 
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:classSubjects:getAll', async (event, classId) => {
    return prisma.lessons.findMany({
      where: {
        classId: classId,
        is_deleted: false,
      },
      include: {
        subject: true,
        teacher: true,
      },
    });
  });
  // #endregion

  // #region Attendances
  ipcMain.handle('db:attendances:getAll', async () => {
    return prisma.attendances.findMany({
      where: { is_deleted: false },
      include: { student: true },
      orderBy: { date: 'desc' },
    }).then(attendances => 
      attendances.map(a => ({
        ...a,
        firstName: a.student.firstName,
        lastName: a.student.lastName,
      }))
    );
  });

  ipcMain.handle('db:attendances:create', async (event, attendanceData) => {
    const { studentId, date, status, justification } = attendanceData;
    return prisma.attendances.create({
      data: {
        studentId,
        date,
        status,
        justification,
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:attendances:update', async (event, { id, data }) => {
    const { studentId, date, status, justification } = data;
    return prisma.attendances.update({
      where: { id },
      data: {
        studentId,
        date,
        status,
        justification,
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:attendances:delete', async (event, id) => {
    return prisma.attendances.update({
      where: { id },
      data: { 
        is_deleted: true, 
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });
  // #endregion

  // #region Parents
  ipcMain.handle('db:parents:getAll', async () => {
    return prisma.parents.findMany({ where: { is_deleted: false } });
  });

  ipcMain.handle('db:parents:create', async (event, parentData) => {
    const { firstName, lastName, phone, email, profession } = parentData;
    return prisma.parents.create({
      data: {
        firstName,
        lastName,
        phone,
        email,
        profession,
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:parents:update', async (event, { id, data }) => {
    const { firstName, lastName, phone, email, profession } = data;
    return prisma.parents.update({
      where: { id },
      data: {
        firstName,
        lastName,
        phone,
        email,
        profession,
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:parents:delete', async (event, id) => {
    const linkCount = await prisma.studentParents.count({
      where: { parentId: id, is_deleted: false },
    });

    if (linkCount > 0) {
      throw new Error('Ce parent est lié à un ou plusieurs étudiants et ne peut pas être supprimé.');
    }

    return prisma.parents.update({
      where: { id },
      data: { 
        is_deleted: true, 
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });
  // #endregion

  // #region Registrations
  ipcMain.handle('db:registrations:getAll', async () => {
    return prisma.registrations.findMany({
      where: { is_deleted: false },
      include: {
        student: true,
        class: true,
      },
    }).then(registrations => 
      registrations.map(r => ({
        ...r,
        studentId: r.student.id,
        firstName: r.student.firstName,
        lastName: r.student.lastName,
        classId: r.class.id,
        className: r.class.name,
      }))
    );
  });

  ipcMain.handle('db:registrations:create', async (event, regData) => {
    const { studentId, classId, schoolYear, state, registration_date } = regData;
    return prisma.registrations.create({
      data: {
        studentId,
        classId,
        schoolYear,
        state,
        registration_date,
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:registrations:update', async (event, { id, data }) => {
    const { studentId, classId, schoolYear, state, registration_date } = data;
    return prisma.registrations.update({
      where: { id },
      data: {
        studentId,
        classId,
        schoolYear,
        state,
        registration_date,
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:registrations:delete', async (event, id) => {
    const paymentCount = await prisma.payments.count({
      where: { registrationId: id, is_deleted: false },
    });

    if (paymentCount > 0) {
      throw new Error('Cette inscription est liée à des paiements et ne peut pas être supprimée.');
    }

    return prisma.registrations.update({
      where: { id },
      data: { 
        is_deleted: true, 
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });
  // #endregion

  // #region Student-Parents
  ipcMain.handle('db:studentParents:getByStudent', async (event, studentId) => {
    return prisma.studentParents.findMany({
      where: {
        studentId: studentId,
        is_deleted: false,
        parent: { is_deleted: false },
      },
      include: { parent: true },
    }).then(links => links.map(l => l.parent));
  });

  ipcMain.handle('db:studentParents:link', async (event, { studentId, parentId }) => {
    return prisma.studentParents.create({
      data: {
        studentId,
        parentId,
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:studentParents:unlink', async (event, { studentId, parentId }) => {
    return prisma.studentParents.updateMany({
      where: { 
        studentId: studentId,
        parentId: parentId,
      },
      data: { 
        is_deleted: true, 
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });
  // #endregion

  // #region Lessons
  ipcMain.handle('db:lessons:getAll', async () => {
    return prisma.lessons.findMany({
      where: { is_deleted: false },
      include: {
        subject: true,
        teacher: true,
        class: true,
      },
    }).then(lessons => 
      lessons.map(l => ({
        ...l,
        subjectName: l.subject.name,
        teacherFirstName: l.teacher?.firstName,
        teacherLastName: l.teacher?.lastName,
        className: l.class.name,
      }))
    );
  });

  ipcMain.handle('db:lessons:create', async (event, lessonData) => {
    const { subjectId, teacherId, classId, schoolYear } = lessonData;
    return prisma.lessons.create({
      data: {
        subjectId,
        teacherId,
        classId,
        schoolYear,
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:lessons:update', async (event, { id, data }) => {
    const { subjectId, teacherId, classId, schoolYear } = data;
    return prisma.lessons.update({
      where: { id },
      data: {
        subjectId,
        teacherId,
        classId,
        schoolYear,
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:lessons:delete', async (event, id) => {
    const noteCount = await prisma.notes.count({
      where: { lessonId: id, is_deleted: false },
    });

    if (noteCount > 0) {
      throw new Error('Cette leçon est liée à des notes et ne peut pas être supprimée.');
    }

    return prisma.lessons.update({
      where: { id },
      data: { 
        is_deleted: true, 
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });
  // #endregion

  // #region Dashboard & Reports
  ipcMain.handle('db:dashboard:getStats', async () => {
    const students = await prisma.students.count({ where: { is_deleted: false } });
    const teachers = await prisma.teachers.count({ where: { is_deleted: false } });
    const classes = await prisma.classes.count({ where: { is_deleted: false } });
    return { students, teachers, classes };
  });

  ipcMain.handle('db:reports:getClassResults', async (event, { classId, quarter }) => {
    const students = await prisma.students.findMany({
      where: {
        registrations: { some: { classId: classId, is_deleted: false } },
        is_deleted: false,
      },
    });

    const subjects = await prisma.subjects.findMany({
      where: {
        lessons: { some: { classId: classId, is_deleted: false } },
        is_deleted: false,
      },
    });

    if (students.length === 0) return [];

    const studentIds = students.map(s => s.id);
    const notes = await prisma.notes.findMany({
      where: {
        studentId: { in: studentIds },
        quarter: quarter,
        is_deleted: false,
        lesson: { classId: classId },
      },
      include: { lesson: true },
    });

    const results = students.map(student => {
      const studentNotes = notes.filter(n => n.studentId === student.id);
      let totalPoints = 0;
      let totalCoef = 0;
      const subjectResults = {};

      subjects.forEach(subject => {
        const subjectNotes = studentNotes.filter(n => n.lesson.subjectId === subject.id);
        if (subjectNotes.length > 0) {
          const sum = subjectNotes.reduce((acc, note) => acc + note.value, 0);
          const avg = sum / subjectNotes.length;
          subjectResults[subject.name] = { average: avg, coefficient: subject.coefficient };
          totalPoints += avg * subject.coefficient;
          totalCoef += subject.coefficient;
        } else {
          subjectResults[subject.name] = { average: null, coefficient: subject.coefficient };
        }
      });

      const generalAverage = totalCoef > 0 ? totalPoints / totalCoef : 0;
      return { 
        studentId: student.id, 
        studentName: `${student.firstName} ${student.lastName}`, 
        average: generalAverage, 
        rank: 0, 
        subjects: subjectResults, 
        status: generalAverage >= 10 ? 'Admis' : 'Non admis' 
      };
    });

    results.sort((a, b) => b.average - a.average);
    let currentRank = 0, prevAverage = -1;
    results.forEach((result, index) => {
      if (result.average !== prevAverage) {
        currentRank = index + 1;
        prevAverage = result.average;
      }
      result.rank = currentRank;
    });

    return results;
  });
  // #endregion

  // #region Schedules
  ipcMain.handle('db:schedules:getAll', async () => {
    return prisma.schedules.findMany();
  });

  ipcMain.handle('db:schedules:create', async (event, scheduleData) => {
    const { lessonId, day_of_week, start_time, end_time } = scheduleData;
    return prisma.schedules.create({
      data: {
        lessonId,
        day_of_week,
        start_time,
        end_time,
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:schedules:update', async (event, { id, data }) => {
    const { lessonId, day_of_week, start_time, end_time } = data;
    return prisma.schedules.update({
      where: { id },
      data: {
        lessonId,
        day_of_week,
        start_time,
        end_time,
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:schedules:delete', async (event, id) => {
    return prisma.schedules.update({
      where: { id },
      data: { 
        is_deleted: true, 
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });
  // #endregion

  // #region Notes
  ipcMain.handle('db:notes:getAll', async () => {
    return prisma.notes.findMany({
      where: { is_deleted: false },
      include: {
        student: true,
        lesson: {
          include: {
            subject: true,
          },
        },
      },
    }).then(notes => 
      notes.map(n => ({
        ...n,
        firstName: n.student.firstName,
        lastName: n.student.lastName,
        subjectName: n.lesson.subject.name,
      }))
    );
  });

  ipcMain.handle('db:notes:create', async (event, noteData) => {
    const { studentId, lessonId, value, type, quarter } = noteData;
    return prisma.notes.create({
      data: {
        studentId,
        lessonId,
        value,
        type,
        quarter,
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:notes:update', async (event, { id, data }) => {
    const { studentId, lessonId, value, type, quarter } = data;
    return prisma.notes.update({
      where: { id },
      data: {
        studentId,
        lessonId,
        value,
        type,
        quarter,
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:notes:delete', async (event, id) => {
    return prisma.notes.update({
      where: { id },
      data: { 
        is_deleted: true, 
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });
  // #endregion
}

module.exports = { setupDatabaseIPC, prisma }; // Exporter prisma pour la synchro
