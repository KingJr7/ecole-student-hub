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
      where: { class_id: id, is_deleted: false },
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
      orderBy: [{ name: 'asc' }, { first_name: 'asc' }],
    }).then(students => 
      students.map(s => ({
        ...s,
        className: s.registrations[0]?.class.name,
      }))
    );
  });

  // Dans students:create et update, ajouter picture_url
ipcMain.handle('db:students:create', async (event, studentData) => {
  const { name, first_name, birth_date, genre, picture_url } = studentData;
  return prisma.students.create({
    data: {
      name,
      first_name,
      birth_date,
      genre,
      picture_url, // Ajouté
      needs_sync: true,
      last_modified: new Date(),
    },
  });
});

ipcMain.handle('db:students:update', async (event, { id, data }) => {
  const { name, first_name, birth_date, genre, picture_url } = data;
  return prisma.students.update({
    where: { id },
    data: {
      name,
      first_name,
      birth_date,
      genre,
      picture_url, // Ajouté
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
        where: { student_id: id },
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

  // Dans la partie Teachers
ipcMain.handle('db:teachers:create', async (event, teacherData) => {
  console.log("Données reçues par le backend:", teacherData);
  const { name, first_name, email, phone, speciality, adress, gender, hourlyRate } = teacherData;

  // Vérifier si l'email existe déjà
  const existingTeacher = await prisma.teachers.findUnique({
    where: { email },
  });

  if (existingTeacher) {
    throw new Error('Un professeur avec cette adresse e-mail existe déjà.');
  }

  // 1. Récupérer le nom de l'école
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const schoolName = settings?.schoolName || 'SCHOOL';

  // 2. Générer le matricule
  const initials = schoolName.substring(0, 3).toUpperCase();
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  const matricule = `${initials}-${randomDigits}`;

  return prisma.teachers.create({
    data: {
      name,
      first_name,
      email,
      phone,
      matricule, // Matricule généré
      speciality,
      adress,
      gender,
      hourlyRate,
      needs_sync: true,
      last_modified: new Date(),
    },
  });
});

// De même pour update
ipcMain.handle('db:teachers:update', async (event, { id, data }) => {
  const { name, first_name, email, phone, speciality, adress, gender, hourlyRate } = data;
  return prisma.teachers.update({
    where: { id },
    data: {
      name,
      first_name,
      email,
      phone,
      speciality,
      adress,
      gender,
      hourlyRate,
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

  // #region TeacherWorkHours
  ipcMain.handle('db:teacherWorkHours:getByTeacherId', async (event, teacherId) => {
    return prisma.teacherWorkHours.findMany({
      where: { teacher_id: teacherId, is_deleted: false },
      orderBy: { date: 'desc' },
    });
  });

  ipcMain.handle('db:teacherWorkHours:create', async (event, workHoursData) => {
    const { teacher_id, subject_id, hours, date, notes } = workHoursData;
    return prisma.teacherWorkHours.create({
      data: {
        teacher_id,
        subject_id,
        hours,
        date: new Date(date),
        notes,
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:teacherWorkHours:getStats', async (event, teacherId) => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const workHours = await prisma.teacherWorkHours.findMany({
      where: {
        teacher_id: teacherId,
        is_deleted: false,
        date: { gte: startOfMonth },
      },
      include: { subject: true },
    });

    const teacher = await prisma.teachers.findUnique({ where: { id: teacherId } });
    const hourlyRate = teacher?.hourlyRate || 0;

    const totalHoursThisMonth = workHours.reduce((acc, record) => acc + record.hours, 0);
    const totalEarningsThisMonth = totalHoursThisMonth * hourlyRate;

    const subjectHoursMap = new Map();
    workHours.forEach(record => {
      const subjectName = record.subject?.name || 'Non spécifié';
      const currentHours = subjectHoursMap.get(subjectName) || 0;
      subjectHoursMap.set(subjectName, currentHours + record.hours);
    });

    const subjectHours = Array.from(subjectHoursMap.entries()).map(([name, hours]) => ({ name, hours }));

    return { totalHoursThisMonth, totalEarningsThisMonth, subjectHours };
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
        firstName: p.registration?.student.first_name,
        lastName: p.registration?.student.name,
        className: p.registration?.class.name,
      }))
    );
  });

  // Supprimer le champ month qui n'existe pas dans le schéma
ipcMain.handle('db:payments:create', async (event, paymentData) => {
  const { registration_id, amount, date, method, reference } = paymentData;
  return prisma.payments.create({
    data: {
      registration_id,
      amount,
      date,
      method,
      reference,
      // Supprimer month
      needs_sync: true,
      last_modified: new Date(),
    },
  });
});

// De même pour update
ipcMain.handle('db:payments:update', async (event, { id, data }) => {
  const { registration_id, amount, date, method, reference } = data;
  return prisma.payments.update({
    where: { id },
    data: {
      registration_id,
      amount,
      date,
      method,
      reference,
      // Supprimer month
      needs_sync: true,
      last_modified: new Date(),
    },
  });
});

// Supprimer ou adapter la fonction getAvailableMonths qui n'a plus de sens
ipcMain.handle('db:payments:getAvailableMonths', async () => {
  return []; // Ou supprimer complètement ce handler
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
  // #endregion

  // #region Subjects
  ipcMain.handle('db:subjects:getAll', async () => {
    return prisma.subjects.findMany({
      where: { is_deleted: false },
      orderBy: { name: 'asc' },
    });
  });

  ipcMain.handle('db:subjects:create', async (event, subjectData) => {
  const { name, coefficient, class_id, school_year, teacher_id } = subjectData;

  // Utiliser une transaction pour garantir que la matière et la leçon sont créées ensemble
  return prisma.$transaction(async (tx) => {
    // 1. Créer la matière (Subject)
    const newSubject = await tx.subjects.create({
      data: {
        name,
        coefficient,
        class_id,
        school_year,
        needs_sync: true,
        last_modified: new Date(),
      },
    });

    // 2. Créer la leçon (Lesson) pour lier le professeur, la matière et la classe
    await tx.lessons.create({
      data: {
        teacher_id,
        class_id,
        subject_id: newSubject.id,
        school_year,
        needs_sync: true,
        last_modified: new Date(),
      },
    });

    return newSubject;
  });
});

  ipcMain.handle('db:subjects:update', async (event, { id, data }) => {
    const { name, coefficient, class_id, school_year } = data;
    return prisma.subjects.update({
      where: { id },
      data: {
        name,
        coefficient,
        class_id,
        school_year,
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:subjects:delete', async (event, id) => {
    const lessonCount = await prisma.lessons.count({
      where: { subject_id: id, is_deleted: false },
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
        class_id: classId,
        is_deleted: false,
      },
      include: {
        subject: true,
        teacher: true,
      },
    });
  });

  ipcMain.handle('db:subjects:getByTeacherId', async (event, teacherId) => {
    return prisma.subjects.findMany({
      where: {
        lessons: {
          some: { teacher_id: teacherId },
        },
        is_deleted: false,
      },
      include: {
        class: true,
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
        firstName: a.student.first_name,
        lastName: a.student.name,
      }))
    );
  });

  ipcMain.handle('db:attendances:create', async (event, attendanceData) => {
    const { student_id, date, state, justification } = attendanceData;
    return prisma.attendances.create({
      data: {
        student_id,
        date,
        state,
        justification,
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:attendances:update', async (event, { id, data }) => {
    const { student_id, date, state, justification } = data;
    return prisma.attendances.update({
      where: { id },
      data: {
        student_id,
        date,
        state,
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

  // Ajouter tous les champs manquants pour les parents
ipcMain.handle('db:parents:create', async (event, parentData) => {
  const { name, first_name, phone, email, adress, gender, profession } = parentData;
  return prisma.parents.create({
    data: {
      name,
      first_name,
      phone,
      email,
      adress,
      gender,
      profession,
      needs_sync: true,
      last_modified: new Date(),
    },
  });
});

ipcMain.handle('db:parents:update', async (event, { id, data }) => {
  const { name, first_name, phone, email, adress, gender, profession } = data;
  return prisma.parents.update({
    where: { id },
    data: {
      name,
      first_name,
      phone,
      email,
      adress,
      gender,
      profession,
      needs_sync: true,
      last_modified: new Date(),
    },
  });
});

  ipcMain.handle('db:parents:delete', async (event, id) => {
    const linkCount = await prisma.studentParents.count({
      where: { parent_id: id, is_deleted: false },
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
        firstName: r.student.first_name,
        lastName: r.student.name,
        classId: r.class.id,
        className: r.class.name,
      }))
    );
  });

  ipcMain.handle('db:registrations:create', async (event, regData) => {
    const { student_id, class_id, school_year, state, registration_date } = regData;
    return prisma.registrations.create({
      data: {
        student_id,
        class_id,
        school_year,
        state,
        registration_date,
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:registrations:update', async (event, { id, data }) => {
    const { student_id, class_id, school_year, state, registration_date } = data;
    return prisma.registrations.update({
      where: { id },
      data: {
        student_id,
        class_id,
        school_year,
        state,
        registration_date,
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:registrations:delete', async (event, id) => {
    const paymentCount = await prisma.payments.count({
      where: { registration_id: id, is_deleted: false },
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
        student_id: studentId,
        is_deleted: false,
        parent: { is_deleted: false },
      },
      include: { parent: true },
    }).then(links => links.map(l => l.parent));
  });

  ipcMain.handle('db:studentParents:link', async (event, { studentId, parentId }) => {
    return prisma.studentParents.create({
      data: {
        student_id: studentId,
        parent_id: parentId,
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:studentParents:unlink', async (event, { studentId, parentId }) => {
    return prisma.studentParents.updateMany({
      where: { 
        student_id: studentId,
        parent_id: parentId,
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
        teacherFirstName: l.teacher?.first_name,
        teacherLastName: l.teacher?.name,
        className: l.class.name,
      }))
    );
  });

  ipcMain.handle('db:lessons:create', async (event, lessonData) => {
    const { subject_id, teacher_id, class_id, school_year } = lessonData;
    return prisma.lessons.create({
      data: {
        subject_id,
        teacher_id,
        class_id,
        school_year,
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:lessons:update', async (event, { id, data }) => {
    const { subject_id, teacher_id, class_id, school_year } = data;
    return prisma.lessons.update({
      where: { id },
      data: {
        subject_id,
        teacher_id,
        class_id,
        school_year,
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:lessons:delete', async (event, id) => {
    const noteCount = await prisma.notes.count({
      where: { lesson_id: id, is_deleted: false },
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
        registrations: { some: { class_id: classId, is_deleted: false } },
        is_deleted: false,
      },
    });

    const subjects = await prisma.subjects.findMany({
      where: {
        lessons: { some: { class_id: classId, is_deleted: false } },
        is_deleted: false,
      },
    });

    if (students.length === 0) return [];

    const studentIds = students.map(s => s.id);
    const notes = await prisma.notes.findMany({
      where: {
        student_id: { in: studentIds },
        quarter: quarter,
        is_deleted: false,
        lesson: { class_id: classId },
      },
      include: { lesson: true },
    });

    const results = students.map(student => {
      const studentNotes = notes.filter(n => n.student_id === student.id);
      let totalPoints = 0;
      let totalCoef = 0;
      const subjectResults = {};

      subjects.forEach(subject => {
        const subjectNotes = studentNotes.filter(n => n.lesson.subject_id === subject.id);
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
        studentName: `${student.first_name} ${student.name}`,
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

// Corriger le format des heures (string au lieu de time)
ipcMain.handle('db:schedules:create', async (event, scheduleData) => {
  const { lesson_id, day_of_week, start_time, end_time } = scheduleData;
  return prisma.schedules.create({
    data: {
      lesson_id,
      day_of_week,
      start_time: start_time.toString(), // Conversion en string
      end_time: end_time.toString(),     // Conversion en string
      needs_sync: true,
      last_modified: new Date(),
    },
  });
});

  ipcMain.handle('db:schedules:update', async (event, { id, data }) => {
    const { lesson_id, day_of_week, start_time, end_time } = data;
    return prisma.schedules.update({
      where: { id },
      data: {
        lesson_id,
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
        firstName: n.student.first_name,
        lastName: n.student.name,
        subjectName: n.lesson.subject.name,
      }))
    );
  });

// Ajouter le champ quarter manquant
ipcMain.handle('db:notes:create', async (event, noteData) => {
  const { student_id, lesson_id, value, type, quarter } = noteData;
  return prisma.notes.create({
    data: {
      student_id,
      lesson_id,
      value,
      type,
      quarter, // Ajouté
      needs_sync: true,
      last_modified: new Date(),
    },
  });
});

  ipcMain.handle('db:notes:update', async (event, { id, data }) => {
    const { student_id, lesson_id, value, type, quarter } = data;
    return prisma.notes.update({
      where: { id },
      data: {
        student_id,
        lesson_id,
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

  // #region employees
  // Ajouter la gestion des employés manquante
ipcMain.handle('db:employees:getAll', async () => {
  return prisma.employees.findMany({ where: { is_deleted: false } });
});

ipcMain.handle('db:employees:create', async (event, employeeData) => {
  const { name, first_name, phone, email, adress, gender, job_title, salary, matricule } = employeeData;
  return prisma.employees.create({
    data: {
      name,
      first_name,
      phone,
      email,
      adress,
      gender,
      job_title,
      salary,
      matricule,
      needs_sync: true,
      last_modified: new Date(),
    },
  });
});

ipcMain.handle('db:employees:update', async (event, { id, data }) => {
  const { name, first_name, phone, email, adress, gender, job_title, salary, matricule } = data;
  return prisma.employees.update({
    where: { id },
    data: {
      name,
      first_name,
      phone,
      email,
      adress,
      gender,
      job_title,
      salary,
      matricule,
      needs_sync: true,
      last_modified: new Date(),
    },
  });
});

ipcMain.handle('db:employees:delete', async (event, id) => {
  return prisma.employees.update({
    where: { id },
    data: { 
      is_deleted: true, 
      needs_sync: true,
      last_modified: new Date(),
    },
  });
});
  // #endregion

  // #region fees
  // Ajouter la gestion des frais manquante
ipcMain.handle('db:fees:getAll', async () => {
  return prisma.fees.findMany({ where: { is_deleted: false } });
});

ipcMain.handle('db:fees:create', async (event, feeData) => {
  const { name, amount, due_date, school_year } = feeData;
  return prisma.fees.create({
    data: {
      name,
      amount,
      due_date,
      school_year,
      needs_sync: true,
      last_modified: new Date(),
    },
  });
});

ipcMain.handle('db:fees:update', async (event, { id, data }) => {
  const { name, amount, due_date, school_year } = data;
  return prisma.fees.update({
    where: { id },
    data: {
      name,
      amount,
      due_date,
      school_year,
      needs_sync: true,
      last_modified: new Date(),
    },
  });
});

ipcMain.handle('db:fees:delete', async (event, id) => {
  return prisma.fees.update({
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
