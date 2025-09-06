const { app, ipcMain, BrowserWindow } = require('electron');
const { PrismaClient } = require('../../src/generated/prisma');
const bcrypt = require('bcryptjs');

// Le client Prisma lira automatiquement le DATABASE_URL depuis .env
// Plus besoin de construire les chemins manuellement.
let prisma;
let isDatabaseIpcSetup = false;

function initializePrisma() {
  console.log("Initialisation du client Prisma à partir de .env...");
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

async function getUserSchoolId(event) {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const schoolId = settings?.schoolId;

  if (!schoolId) {
    throw new Error("Utilisateur non authentifié ou ID d'école non trouvé.");
  }
  
  return schoolId;
}

async function calculateClassResults(classId, quarter) {
  console.log('Calculating results for class:', classId, 'and quarter:', quarter, 'type:', typeof quarter);

  const studentsInClass = await prisma.registrations.findMany({
    where: {
      class_id: classId,
      is_deleted: false,
    },
    include: {
      student: true,
    },
  });

  if (studentsInClass.length === 0) return [];

  const studentIds = studentsInClass.map(reg => reg.student_id);

  const lessonsInClass = await prisma.lessons.findMany({
    where: {
      class_id: classId,
      is_deleted: false,
    },
    include: {
      subject: true,
    },
  });

  const subjectIds = lessonsInClass.map(l => l.subject_id);
  const subjects = await prisma.subjects.findMany({
    where: { id: { in: subjectIds } },
  });

  const notesWhere = {
    student_id: { in: studentIds },
    is_deleted: false,
    lesson: {
      class_id: classId,
    },
  };
  if (quarter && !isNaN(parseInt(quarter, 10))) {
    notesWhere.quarter = parseInt(quarter, 10);
  }

  const notes = await prisma.notes.findMany({
    where: notesWhere,
    include: {
      lesson: {
        include: {
          subject: true,
        },
      },
    },
  });

  const results = studentsInClass.map(({ student }) => {
    let totalPoints = 0;
    let totalCoef = 0;
    const subjectResults = {};

    subjects.forEach(subject => {
      const subjectNotes = notes.filter(
        n => n.student_id === student.id && n.lesson.subject_id === subject.id
      );

      let avg = null;
      if (subjectNotes.length > 0) {
        const sum = subjectNotes.reduce((acc, note) => acc + (note.value || 0), 0);
        avg = sum / subjectNotes.length;
        totalPoints += avg * (subject.coefficient || 1);
        totalCoef += subject.coefficient || 1;
      }
      subjectResults[subject.name] = { average: avg, coefficient: subject.coefficient || 1 };
    });

    const generalAverage = totalCoef > 0 ? totalPoints / totalCoef : 0;
    return {
      studentId: student.id,
      studentName: `${student.first_name} ${student.name}`,
      average: generalAverage,
      rank: 0,
      subjects: subjectResults,
      status: generalAverage >= 10 ? 'Admis' : 'Non admis',
    };
  });

  results.sort((a, b) => b.average - a.average);
  results.forEach((result, index) => {
    result.rank = index + 1;
  });

  return results;
}

function setupDatabaseIPC(prismaClient) {
  if (isDatabaseIpcSetup) {
    return;
  }
  isDatabaseIpcSetup = true;

  prisma = prismaClient;

  // Handler pour récupérer les settings
  ipcMain.handle('db:settings:get', async () => {
    let settings = await prisma.settings.findUnique({ where: { id: 1 } });
    return settings;
  });

  // Handler pour mettre à jour les settings
  ipcMain.handle('db:settings:update', async (event, data) => {
    const { schoolName, schoolAddress, printerName } = data;
    return prisma.settings.upsert({
      where: { id: 1 },
      update: { schoolName, schoolAddress, printerName },
      create: { schoolName, schoolAddress, printerName },
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
    const schoolId = await getUserSchoolId(event);
    const { name, level } = classData;
    return prisma.classes.create({
      data: { 
        name, 
        level, 
        school_id: schoolId,
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:classes:update', async (event, { id, data }) => {
    const schoolId = await getUserSchoolId(event);
    const classToUpdate = await prisma.classes.findUnique({ where: { id } });

    if (!classToUpdate || classToUpdate.school_id !== schoolId) {
      throw new Error("Accès non autorisé ou classe non trouvée.");
    }

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
    const schoolId = await getUserSchoolId(event);

    const classToDelete = await prisma.classes.findUnique({ where: { id } });

    if (!classToDelete || classToDelete.school_id !== schoolId) {
      throw new Error("Accès non autorisé ou classe non trouvée.");
    }

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
  ipcMain.handle('db:students:getAll', async (event, args) => {
    const schoolYear = args?.schoolYear;
    const registrationWhere = { is_deleted: false };
    if (schoolYear) {
      registrationWhere.school_year = schoolYear;
    }

    const students = await prisma.students.findMany({
      where: { is_deleted: false },
      include: {
        registrations: {
          where: registrationWhere,
          orderBy: { id: 'desc' },
          take: 1,
          include: {
            class: true,
          },
        },
        student_parents: {
          where: { is_deleted: false },
          include: {
            parent: true,
          },
        },
      },
      orderBy: [{ name: 'asc' }, { first_name: 'asc' }],
    });

    return students.map(s => {
      const father = s.student_parents.find(sp => sp.relation === 'père')?.parent;
      const mother = s.student_parents.find(sp => sp.relation === 'mère')?.parent;
      
      return {
        ...s,
        className: s.registrations[0]?.class.name,
        classLevel: s.registrations[0]?.class.level,
        parentInfo: { father, mother },
      };
    });
  });

  const findOrCreateParent = async (tx, parentData) => {
  // Un parent n'est valide que s'il a un ID ou au moins un prénom ou un numéro de téléphone
  if (!parentData || (!parentData.id && !parentData.first_name && !parentData.phone)) {
    return null;
  }

  if (parentData.id) {
    return tx.parents.update({
      where: { id: parentData.id },
      data: {
        name: parentData.name,
        first_name: parentData.first_name,
        phone: parentData.phone,
        email: parentData.email,
        adress: parentData.adress,
        gender: parentData.gender,
        profession: parentData.profession,
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  }

  if (parentData.phone) {
    const existingParent = await tx.parents.findFirst({
      where: { phone: parentData.phone, is_deleted: false },
    });
    if (existingParent) {
      return tx.parents.update({
        where: { id: existingParent.id },
        data: {
          name: parentData.name,
          first_name: parentData.first_name,
          email: parentData.email,
          adress: parentData.adress,
          gender: parentData.gender,
          profession: parentData.profession,
          needs_sync: true,
          last_modified: new Date(),
        },
      });
    }
  }

  return tx.parents.create({
    data: {
      name: parentData.name,
      first_name: parentData.first_name,
      phone: parentData.phone,
      email: parentData.email,
      adress: parentData.adress,
      gender: parentData.gender,
      profession: parentData.profession,
      needs_sync: true,
      last_modified: new Date(),
    },
  });
};

ipcMain.handle('db:students:create', async (event, { studentData, parentsData }) => {
  return prisma.$transaction(async (tx) => {
    // Génération du matricule
    const year = new Date().getFullYear().toString().slice(-2);
    const prefix = `STU-${year}-`;

    // 1. Trouver le dernier matricule pour l'année en cours
    const lastStudent = await tx.students.findFirst({
      where: {
        matricul: {
          startsWith: prefix,
        },
      },
      orderBy: {
        matricul: 'desc',
      },
    });

    let nextIdNumber = 1;
    if (lastStudent) {
      // 2. Extraire le numéro, l'incrémenter
      const lastId = parseInt(lastStudent.matricul.replace(prefix, ''), 10);
      nextIdNumber = lastId + 1;
    }

    // 3. Formater le nouveau matricule
    const nextId = nextIdNumber.toString().padStart(4, '0');
    const matricule = `${prefix}${nextId}`;

    const newStudent = await tx.students.create({
      data: {
        ...studentData,
        matricul: matricule, // Assigner le matricule généré
        needs_sync: true,
        last_modified: new Date(),
      },
    });

    if (parentsData) {
      const { father, mother } = parentsData;
      
      // On force le genre ici pour garantir la cohérence
      if (father) father.gender = 'Masculin';
      if (mother) mother.gender = 'Féminin';

      const fatherRecord = await findOrCreateParent(tx, father);
      const motherRecord = await findOrCreateParent(tx, mother);

      if (fatherRecord) {
        await tx.studentParents.create({
          data: { student_id: newStudent.id, parent_id: fatherRecord.id, relation: 'père', needs_sync: true, last_modified: new Date() },
        });
      }
      if (motherRecord) {
        await tx.studentParents.create({
          data: { student_id: newStudent.id, parent_id: motherRecord.id, relation: 'mère', needs_sync: true, last_modified: new Date() },
        });
      }
    }
    
    // Re-fetch the student with all relations to return to the frontend
    const fullNewStudent = await tx.students.findUnique({
      where: { id: newStudent.id },
      include: {
        registrations: {
          where: { is_deleted: false },
          orderBy: { id: 'desc' },
          take: 1,
          include: {
            class: true,
          },
        },
        student_parents: {
          where: { is_deleted: false },
          include: {
            parent: true,
          },
        },
      },
    });

    const father = fullNewStudent.student_parents.find(sp => sp.relation === 'père')?.parent;
    const mother = fullNewStudent.student_parents.find(sp => sp.relation === 'mère')?.parent;

    return {
      ...fullNewStudent,
      className: fullNewStudent.registrations[0]?.class.name,
      classLevel: fullNewStudent.registrations[0]?.class.level,
      parentInfo: { father, mother },
    };
  });
});

ipcMain.handle('db:students:update', async (event, { id, studentData, parentsData }) => {
  return prisma.$transaction(async (tx) => {
    await tx.students.update({
      where: { id },
      data: {
        ...studentData,
        needs_sync: true,
        last_modified: new Date(),
      },
    });

    if (parentsData) {
      const { father, mother } = parentsData;
      
      // On force le genre ici pour garantir la cohérence
      if (father) father.gender = 'Masculin';
      if (mother) mother.gender = 'Féminin';

      const fatherRecord = await findOrCreateParent(tx, father);
      const motherRecord = await findOrCreateParent(tx, mother);

      await tx.studentParents.updateMany({
        where: { student_id: id },
        data: { is_deleted: true, needs_sync: true, last_modified: new Date() },
      });

      if (fatherRecord) {
        await tx.studentParents.upsert({
          where: { student_id_parent_id_unique: { student_id: id, parent_id: fatherRecord.id } },
          update: { is_deleted: false, relation: 'père', needs_sync: true, last_modified: new Date() },
          create: { student_id: id, parent_id: fatherRecord.id, relation: 'père', needs_sync: true, last_modified: new Date() },
        });
      }
      if (motherRecord) {
        await tx.studentParents.upsert({
          where: { student_id_parent_id_unique: { student_id: id, parent_id: motherRecord.id } },
          update: { is_deleted: false, relation: 'mère', needs_sync: true, last_modified: new Date() },
          create: { student_id: id, parent_id: motherRecord.id, relation: 'mère', needs_sync: true, last_modified: new Date() },
        });
      }
    }
    return { id };
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
      include: {
        registrations: {
          where: { is_deleted: false },
          orderBy: { id: 'desc' },
          take: 1,
          include: {
            class: true,
          },
        },
      },
    }).then(students => 
      students.map(s => ({
        ...s,
        className: s.registrations[0]?.class.name,
        registration_date: s.registrations[0]?.registration_date,
      }))
    );
  });
  // #endregion

  // #region Teachers
  ipcMain.handle('db:teachers:getAll', async () => {
    return prisma.teachers.findMany({ where: { is_deleted: false } });
  });

  // Dans la partie Teachers
ipcMain.handle('db:teachers:create', async (event, teacherData) => {
  const schoolId = await getUserSchoolId(event);
  console.log("Données reçues par le backend:", teacherData);
  const { name, first_name, email, phone, speciality, adress, hourlyRate, password } = teacherData;

  // Vérifier si l'email existe déjà
  const existingTeacher = await prisma.teachers.findUnique({
    where: { email },
  });

  if (existingTeacher) {
    throw new Error('Un professeur avec cette adresse e-mail existe déjà.');
  }

  // Hacher le mot de passe
  const password_hash = bcrypt.hashSync(password, 10);

  // Génération du matricule
  const year = new Date().getFullYear().toString().slice(-2);
  const prefix = `TEA-${year}-`;

  const lastTeacher = await prisma.teachers.findFirst({
    where: {
      matricul: {
        startsWith: prefix,
      },
    },
    orderBy: {
      matricul: 'desc',
    },
  });

  let nextIdNumber = 1;
  if (lastTeacher) {
    const lastId = parseInt(lastTeacher.matricul.replace(prefix, ''), 10);
    nextIdNumber = lastId + 1;
  }

  const nextId = nextIdNumber.toString().padStart(4, '0');
  const matricule = `${prefix}${nextId}`;

  return prisma.teachers.create({
    data: {
      name,
      first_name,
      email,
      phone,
      password_hash, // Utiliser le mot de passe haché
      matricule, // Matricule généré
      speciality,
      adress,
      hourlyRate,
      school_id: schoolId,
      needs_sync: true,
      last_modified: new Date(),
    },
  });
});

// De même pour update
ipcMain.handle('db:teachers:update', async (event, { id, data }) => {
  const schoolId = await getUserSchoolId(event);
  const teacherToUpdate = await prisma.teachers.findUnique({ where: { id } });

  if (!teacherToUpdate || teacherToUpdate.school_id !== schoolId) {
    throw new Error("Accès non autorisé ou professeur non trouvé.");
  }

  const { name, first_name, email, phone, speciality, adress, hourlyRate } = data;
  return prisma.teachers.update({
    where: { id },
    data: {
      name,
      first_name,
      email,
      phone,
      speciality,
      adress,
      hourlyRate,
      needs_sync: true,
      last_modified: new Date(),
    },
  });
});

  ipcMain.handle('db:teachers:delete', async (event, id) => {
    const schoolId = await getUserSchoolId(event);
    const teacherToDelete = await prisma.teachers.findUnique({ where: { id } });

    if (!teacherToDelete || teacherToDelete.school_id !== schoolId) {
      throw new Error("Accès non autorisé ou professeur non trouvé.");
    }

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
    const schoolId = await getUserSchoolId(event);
    const teacher = await prisma.teachers.findUnique({ where: { id: teacherId } });

    if (!teacher || teacher.school_id !== schoolId) {
        throw new Error("Accès non autorisé ou professeur non trouvé.");
    }

    return prisma.teacherWorkHours.findMany({
      where: { teacher_id: teacherId, is_deleted: false },
      orderBy: { date: 'desc' },
    });
  });

  ipcMain.handle('db:teacherWorkHours:create', async (event, workHoursData) => {
    const schoolId = await getUserSchoolId(event);
    const { teacher_id, subject_id, date, start_time, end_time, notes } = workHoursData;

    const teacher = await prisma.teachers.findUnique({ where: { id: teacher_id } });
    if (!teacher || teacher.school_id !== schoolId) {
      throw new Error("Accès non autorisé: le professeur spécifié n'appartient pas à votre école.");
    }

    // Calculer la durée en heures
    const start = new Date(`${date}T${start_time}`);
    const end = new Date(`${date}T${end_time}`);
    const durationMs = end.getTime() - start.getTime();
    const hours = durationMs / (1000 * 60 * 60);

    if (hours <= 0) {
      throw new Error("L'heure de fin doit être après l'heure de début.");
    }

    return prisma.teacherWorkHours.create({
      data: {
        teacher_id,
        subject_id,
        date,
        start_time,
        end_time,
        hours,
        notes,
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:teacherWorkHours:getStats', async (event, teacherId) => {
    const schoolId = await getUserSchoolId(event);
    const teacher = await prisma.teachers.findUnique({ where: { id: teacherId } });

    if (!teacher || teacher.school_id !== schoolId) {
      throw new Error("Accès non autorisé ou professeur non trouvé.");
    }

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfMonthString = startOfMonth.toISOString().split('T')[0]; // Format YYYY-MM-DD

    const workHours = await prisma.teacherWorkHours.findMany({
      where: {
        teacher_id: teacherId,
        is_deleted: false,
        date: { gte: startOfMonthString },
      },
      include: { subject: true },
    });

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

  ipcMain.handle('db:teacherWorkHours:update', async (event, { id, data }) => {
    const schoolId = await getUserSchoolId(event);
    const { teacher_id, subject_id, date, start_time, end_time, notes } = data;

    const workHourToUpdate = await prisma.teacherWorkHours.findUnique({
      where: { id },
      include: { teacher: true }
    });

    if (!workHourToUpdate || workHourToUpdate.teacher.school_id !== schoolId) {
      throw new Error("Accès non autorisé ou enregistrement non trouvé.");
    }

    if (teacher_id && teacher_id !== workHourToUpdate.teacher_id) {
      const newTeacher = await prisma.teachers.findUnique({ where: { id: teacher_id } });
      if (!newTeacher || newTeacher.school_id !== schoolId) {
        throw new Error("Accès non autorisé: le nouveau professeur n'appartient pas à votre école.");
      }
    }

    const start = new Date(`${date}T${start_time}`);
    const end = new Date(`${date}T${end_time}`);
    const durationMs = end.getTime() - start.getTime();
    const hours = durationMs / (1000 * 60 * 60);

    if (hours <= 0) {
      throw new Error("L'heure de fin doit être après l'heure de début.");
    }

    return prisma.teacherWorkHours.update({
      where: { id },
      data: {
        teacher_id,
        subject_id,
        date,
        start_time,
        end_time,
        hours,
        notes,
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:teacherWorkHours:delete', async (event, id) => {
    const schoolId = await getUserSchoolId(event);
    const workHourToDelete = await prisma.teacherWorkHours.findUnique({
      where: { id },
      include: { teacher: true }
    });

    if (!workHourToDelete || workHourToDelete.teacher.school_id !== schoolId) {
      throw new Error("Accès non autorisé ou enregistrement non trouvé.");
    }

    return prisma.teacherWorkHours.update({
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
  ipcMain.handle('db:payments:getAll', async (event) => {
    const schoolId = await getUserSchoolId(event);

    // 1. Récupérer les paiements des étudiants
    const studentPayments = await prisma.payments.findMany({
      where: { 
        is_deleted: false, 
        registration: { 
          isNot: null,
          class: {
            school_id: schoolId
          }
        } 
      },
      include: {
        fee: true, // Inclure les détails du frais payé
        registration: {
          include: {
            student: true,
            class: true,
          },
        },
      },
    });

    // 2. Récupérer les paiements de salaires
    const salaryPayments = await prisma.salaryPayments.findMany({
      where: { 
        is_deleted: false,
        employee: {
          school_id: schoolId
        }
      },
      include: {
        employee: true,
      },
    });

    // 3. Mapper les paiements des étudiants dans un format commun
    const mappedStudentPayments = studentPayments
      .filter(p => p.registration && p.registration.student) // S'assurer que les relations existent
      .map(p => ({
        ...p,
        type: 'Étudiant',
        person_name: `${p.registration.student.first_name} ${p.registration.student.name}`,
        details: p.fee?.name || p.registration.class.name, // Prioriser le nom du frais
      }));

    // 4. Mapper les paiements de salaires dans le même format
    const mappedSalaryPayments = salaryPayments
      .filter(p => p.employee) // S'assurer que la relation existe
      .map(p => ({
        id: p.id, // Assurer un ID unique pour la clé React
        type: 'Salaire',
        person_name: `${p.employee.first_name} ${p.employee.name}`,
        details: p.employee.job_title,
        date: p.payment_date,
        amount: p.total_amount,
        method: 'N/A', // La méthode n'est pas définie pour les salaires
        registration_id: null, // Pas de registration_id pour les salaires
      }));

    // 5. Combiner et trier les deux listes
    const allPayments = [...mappedStudentPayments, ...mappedSalaryPayments];
    allPayments.sort((a, b) => new Date(b.date) - new Date(a.date));

    return allPayments;
  });

  ipcMain.handle('db:payments:getLatePayments', async (event) => {
    const schoolId = await getUserSchoolId(event);

    const allStudents = await prisma.students.findMany({
      where: { 
        is_deleted: false,
        registrations: {
          some: {
            is_deleted: false,
            class: {
              school_id: schoolId
            }
          }
        }
      },
      include: {
        registrations: {
          where: { is_deleted: false },
          orderBy: { id: 'desc' },
          take: 1,
          include: {
            class: true,
          },
        },
      },
    });

    const allFees = await prisma.fees.findMany({
      where: { is_deleted: false },
    });

    const allPayments = await prisma.payments.findMany({
      where: { is_deleted: false },
    });

    const latePayments = [];

    for (const student of allStudents) {
      if (!student.registrations || student.registrations.length === 0) continue;

      const registration = student.registrations[0];
      const studentLevel = registration.class?.level;

      const applicableFeesForStudent = allFees.filter(fee => {
        if (fee.is_deleted) return false;
        if (fee.level === null || fee.level.toLowerCase() === 'all') return true;
        if (studentLevel && fee.level.toLowerCase() === studentLevel.toLowerCase()) return true;
        return false;
      });

      const paymentsForStudent = allPayments.filter(p => p.registration_id === registration.id);

      for (const fee of applicableFeesForStudent) {
        const totalPaidForFee = paymentsForStudent
          .filter(p => p.fee_id === fee.id)
          .reduce((sum, p) => sum + (p.amount || 0), 0);
        
        const balance = (fee.amount || 0) - totalPaidForFee;

        if (balance > 0 && fee.due_date) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const dueDateParts = fee.due_date.split('-').map(part => parseInt(part, 10));
          if (dueDateParts.length === 3) {
              const dueDateThisYear = new Date(today.getFullYear(), dueDateParts[1] - 1, dueDateParts[2]);
              dueDateThisYear.setHours(0, 0, 0, 0);

              if (today > dueDateThisYear) {
                  latePayments.push({
                    studentId: student.id,
                    studentName: `${student.first_name} ${student.name}`,
                    className: registration.class?.name || 'N/A',
                    feeName: fee.name,
                    feeAmount: fee.amount,
                    dueDate: fee.due_date,
                    balance: balance,
                  });
              }
          }
        }
      }
    }

    return latePayments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  });

  // Supprimer le champ month qui n'existe pas dans le schéma
  ipcMain.handle('db:payments:create', async (event, { registration_id, fee_id, amount, date, method, reference }) => {
    const schoolId = await getUserSchoolId(event);

    const registration = await prisma.registrations.findUnique({
        where: { id: registration_id },
        include: { class: true }
    });

    if (!registration || registration.class.school_id !== schoolId) {
        throw new Error("Accès non autorisé: l'inscription spécifiée n'appartient pas à votre école.");
    }

    return prisma.$transaction(async (tx) => {
      // Étape 1: Créer le paiement de l'étudiant
      const payment = await tx.payments.create({
        data: {
          registration_id,
          fee_id,
          amount,
          date,
          method,
          reference,
          needs_sync: true,
          last_modified: new Date(),
        },
        include: {
          fee: true,
          registration: {
            include: {
              student: true,
            },
          },
        },
      });
  
      // Étape 2: Trouver ou créer la catégorie de revenu correspondante
      const feeName = payment.fee?.name || 'Revenu scolaire';
      let incomeCategory = await tx.financialCategory.findFirst({
        where: { name: feeName, type: 'income', school_id: schoolId },
      });
  
      if (!incomeCategory) {
        incomeCategory = await tx.financialCategory.create({
          data: {
            name: feeName,
            type: 'income',
            school_id: schoolId,
            needs_sync: true,
            last_modified: new Date(),
          },
        });
      }
  
      // Étape 3: Créer la transaction financière
      const studentName = `${payment.registration.student.first_name} ${payment.registration.student.name}`;
      await tx.financialTransaction.create({
        data: {
          date: new Date(date),
          description: `Paiement de ${feeName} par ${studentName}`,
          amount: amount,
          type: 'income',
          category_id: incomeCategory.id,
          school_id: schoolId,
          needs_sync: true,
          last_modified: new Date(),
        },
      });
  
      return payment;
    });
  });

// De même pour update
ipcMain.handle('db:payments:update', async (event, { id, data }) => {
  const schoolId = await getUserSchoolId(event);
  const paymentToUpdate = await prisma.payments.findUnique({
    where: { id },
    include: { registration: { include: { class: true } } }
  });

  if (!paymentToUpdate || !paymentToUpdate.registration || paymentToUpdate.registration.class.school_id !== schoolId) {
    throw new Error("Accès non autorisé ou paiement non trouvé.");
  }

  const { registration_id, amount, date, method, reference } = data;

  if (registration_id && registration_id !== paymentToUpdate.registration_id) {
    const newRegistration = await prisma.registrations.findUnique({
      where: { id: registration_id },
      include: { class: true }
    });
    if (!newRegistration || newRegistration.class.school_id !== schoolId) {
      throw new Error("Accès non autorisé: la nouvelle inscription n'appartient pas à votre école.");
    }
  }

  return prisma.payments.update({
    where: { id },
    data: {
      registration_id,
      amount,
      date,
      method,
      reference,
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
    const schoolId = await getUserSchoolId(event);
    const paymentToDelete = await prisma.payments.findUnique({
      where: { id },
      include: { registration: { include: { class: true } } }
    });

    if (!paymentToDelete || !paymentToDelete.registration || paymentToDelete.registration.class.school_id !== schoolId) {
      throw new Error("Accès non autorisé ou paiement non trouvé.");
    }

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
  ipcMain.handle('db:subjects:getAll', async (event) => {
    const schoolId = await getUserSchoolId(event);
    return prisma.subjects.findMany({
      where: { 
        is_deleted: false,
        class: {
            school_id: schoolId
        }
      },
      orderBy: { name: 'asc' },
    });
  });

  ipcMain.handle('db:subjects:create', async (event, subjectData) => {
  const schoolId = await getUserSchoolId(event);
  const { name, coefficient, class_id, school_year, teacher_id } = subjectData;

  const classToLink = await prisma.classes.findUnique({ where: { id: class_id } });
  if (!classToLink || classToLink.school_id !== schoolId) {
    throw new Error("Accès non autorisé: la classe spécifiée n'appartient pas à votre école.");
  }

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

    // S'assurer que les IDs sont des nombres entiers
    const numeric_teacher_id = parseInt(teacher_id, 10);
    const numeric_class_id = parseInt(class_id, 10);

    if (isNaN(numeric_teacher_id) || isNaN(numeric_class_id)) {
      throw new Error("L'ID du professeur ou de la classe est invalide.");
    }

    // 2. Créer la leçon (Lesson) pour lier le professeur, la matière et la classe
    await tx.lessons.create({
      data: {
        teacher_id: numeric_teacher_id,
        class_id: numeric_class_id,
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
    const schoolId = await getUserSchoolId(event);

    const subjectToUpdate = await prisma.subjects.findUnique({ 
      where: { id },
      include: { class: true } 
    });

    if (!subjectToUpdate || subjectToUpdate.class.school_id !== schoolId) {
      throw new Error("Accès non autorisé ou matière non trouvée.");
    }

    const { name, coefficient, class_id, school_year } = data;
    
    if (class_id && class_id !== subjectToUpdate.class_id) {
        const newClass = await prisma.classes.findUnique({ where: { id: class_id } });
        if (!newClass || newClass.school_id !== schoolId) {
            throw new Error("Accès non autorisé: la nouvelle classe spécifiée n'appartient pas à votre école.");
        }
    }

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
    const schoolId = await getUserSchoolId(event);

    const subjectToDelete = await prisma.subjects.findUnique({
      where: { id },
      include: { class: true }
    });

    if (!subjectToDelete || subjectToDelete.class.school_id !== schoolId) {
        throw new Error("Accès non autorisé ou matière non trouvée.");
    }

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
    const schoolId = await getUserSchoolId(event);
    const classToCheck = await prisma.classes.findUnique({ where: { id: classId } });

    if (!classToCheck || classToCheck.school_id !== schoolId) {
        throw new Error("Accès non autorisé ou classe non trouvée.");
    }

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
    const schoolId = await getUserSchoolId(event);
    const teacher = await prisma.teachers.findUnique({ where: { id: teacherId } });

    if (!teacher || teacher.school_id !== schoolId) {
        throw new Error("Accès non autorisé ou professeur non trouvé.");
    }

    return prisma.subjects.findMany({
      where: {
        lessons: {
          some: { teacher_id: teacherId },
        },
        is_deleted: false,
        class: {
            school_id: schoolId
        }
      },
      include: {
        class: true,
      },
    });
  });
  // #endregion

  // #region Attendances
  ipcMain.handle('db:attendances:getAll', async (event, args) => {
    const schoolId = await getUserSchoolId(event);
    const date = args?.date;
    const whereClause = { 
        is_deleted: false,
        student: {
            registrations: {
                some: {
                    is_deleted: false,
                    class: {
                        school_id: schoolId
                    }
                }
            }
        }
    };
    if (date) {
      whereClause.date = date;
    }

    return prisma.attendances.findMany({
      where: whereClause,
      include: { student: true },
      orderBy: { id: 'desc' },
    }).then(attendances =>
      attendances.map(a => ({
        ...a,
        firstName: a.student.first_name,
        lastName: a.student.name,
      }))
    );
  });

  ipcMain.handle('db:attendances:create', async (event, attendanceData) => {
    const schoolId = await getUserSchoolId(event);
    const { student_id, date, state, justification } = attendanceData;

    const registration = await prisma.registrations.findFirst({
        where: { student_id: student_id, is_deleted: false },
        orderBy: { id: 'desc' },
        include: { class: true }
    });

    if (!registration || registration.class.school_id !== schoolId) {
        throw new Error("Accès non autorisé: l'étudiant spécifié n'appartient pas à votre école.");
    }

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
    const schoolId = await getUserSchoolId(event);
    const { student_id, date, state, justification } = data;

    const attendanceToUpdate = await prisma.attendances.findUnique({
      where: { id },
      include: { student: { include: { registrations: { include: { class: true }, where: { is_deleted: false }, orderBy: { id: 'desc' }, take: 1 } } } }
    });

    if (!attendanceToUpdate || !attendanceToUpdate.student.registrations.length || attendanceToUpdate.student.registrations[0].class.school_id !== schoolId) {
      throw new Error("Accès non autorisé ou présence non trouvée.");
    }

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
    const schoolId = await getUserSchoolId(event);
    const attendanceToDelete = await prisma.attendances.findUnique({
      where: { id },
      include: { student: { include: { registrations: { include: { class: true }, where: { is_deleted: false }, orderBy: { id: 'desc' }, take: 1 } } } }
    });

    if (!attendanceToDelete || !attendanceToDelete.student.registrations.length || attendanceToDelete.student.registrations[0].class.school_id !== schoolId) {
      throw new Error("Accès non autorisé ou présence non trouvée.");
    }

    return prisma.attendances.update({
      where: { id },
      data: { 
        is_deleted: true, 
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:attendances:getByStudentId', async (event, studentId) => {
    const schoolId = await getUserSchoolId(event);
    const registration = await prisma.registrations.findFirst({
        where: { student_id: studentId, is_deleted: false },
        orderBy: { id: 'desc' },
        include: { class: true }
    });

    if (!registration || registration.class.school_id !== schoolId) {
        throw new Error("Accès non autorisé: l'étudiant spécifié n'appartient pas à votre école.");
    }

    return prisma.attendances.findMany({
      where: { student_id: studentId, is_deleted: false },
      orderBy: { date: 'desc' },
      take: 5, // On limite aux 5 plus récents pour ne pas surcharger
    });
  });
  // #endregion

  // #region Parents
  ipcMain.handle('db:parents:getAll', async () => {
    return prisma.parents.findMany({ where: { is_deleted: false } });
  });

  // Ajouter tous les champs manquants pour les parents
ipcMain.handle('db:parents:create', async (event, parentData) => {
  const schoolId = await getUserSchoolId(event);
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
      school_id: schoolId,
      needs_sync: true,
      last_modified: new Date(),
    },
  });
});

ipcMain.handle('db:parents:update', async (event, { id, data }) => {
  const schoolId = await getUserSchoolId(event);
  const parentToUpdate = await prisma.parents.findUnique({ where: { id } });

  if (!parentToUpdate || parentToUpdate.school_id !== schoolId) {
    throw new Error("Accès non autorisé ou parent non trouvé.");
  }

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
    const schoolId = await getUserSchoolId(event);
    const parentToDelete = await prisma.parents.findUnique({ where: { id } });

    if (!parentToDelete || parentToDelete.school_id !== schoolId) {
      throw new Error("Accès non autorisé ou parent non trouvé.");
    }

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

  ipcMain.handle('db:parents:findByPhone', async (event, phone) => {
    if (!phone) return null;
    return prisma.parents.findFirst({ where: { phone, is_deleted: false } });
  });
  // #endregion

  // #region Registrations
  ipcMain.handle('db:registrations:getAll', async (event) => {
    const schoolId = await getUserSchoolId(event);
    return prisma.registrations.findMany({
      where: { 
        is_deleted: false,
        class: {
          school_id: schoolId
        }
      },
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
    const schoolId = await getUserSchoolId(event);
    const { student_id, class_id, school_year, state, registration_date } = regData;

    const classToLink = await prisma.classes.findUnique({ where: { id: class_id } });
    if (!classToLink || classToLink.school_id !== schoolId) {
        throw new Error("Accès non autorisé: la classe spécifiée n'appartient pas à votre école.");
    }

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
    const schoolId = await getUserSchoolId(event);
    const { student_id, class_id, school_year, state, registration_date } = data;

    const registrationToUpdate = await prisma.registrations.findUnique({
      where: { id },
      include: { class: true }
    });

    if (!registrationToUpdate || registrationToUpdate.class.school_id !== schoolId) {
      throw new Error("Accès non autorisé ou inscription non trouvée.");
    }

    if (class_id && class_id !== registrationToUpdate.class_id) {
      const newClass = await prisma.classes.findUnique({ where: { id: class_id } });
      if (!newClass || newClass.school_id !== schoolId) {
        throw new Error("Accès non autorisé: la nouvelle classe n'appartient pas à votre école.");
      }
    }

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
    const schoolId = await getUserSchoolId(event);
    const registrationToDelete = await prisma.registrations.findUnique({
      where: { id },
      include: { class: true }
    });

    if (!registrationToDelete || registrationToDelete.class.school_id !== schoolId) {
      throw new Error("Accès non autorisé ou inscription non trouvée.");
    }

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

  ipcMain.handle('db:registrations:getLatestForStudent', async (event, { studentId }) => {
    const schoolId = await getUserSchoolId(event);
    if (!studentId) return null;

    const registration = await prisma.registrations.findFirst({
        where: {
            student_id: studentId,
            is_deleted: false,
        },
        orderBy: {
            id: 'desc',
        },
        include: {
            class: true
        }
    });

    if (!registration || registration.class.school_id !== schoolId) {
        return null;
    }

    return registration;
  });
  // #endregion

  // #region Student-Parents
  ipcMain.handle('db:studentParents:getByStudent', async (event, studentId) => {
    const schoolId = await getUserSchoolId(event);

    const registration = await prisma.registrations.findFirst({
        where: { student_id: studentId, is_deleted: false },
        orderBy: { id: 'desc' },
        include: { class: true }
    });
    if (!registration || registration.class.school_id !== schoolId) {
        throw new Error("Accès non autorisé: l'étudiant spécifié n'appartient pas à votre école.");
    }

    return prisma.studentParents.findMany({
      where: {
        student_id: studentId,
        is_deleted: false,
        parent: { is_deleted: false },
      },
      include: { parent: true },
    }).then(links => links.map(l => l.parent));
  });

  ipcMain.handle('db:studentParents:link', async (event, { studentId, parentId, relation }) => {
    const schoolId = await getUserSchoolId(event);

    const registration = await prisma.registrations.findFirst({
        where: { student_id: studentId, is_deleted: false },
        orderBy: { id: 'desc' },
        include: { class: true }
    });
    if (!registration || registration.class.school_id !== schoolId) {
        throw new Error("Accès non autorisé: l'étudiant spécifié n'appartient pas à votre école.");
    }

    const parent = await prisma.parents.findUnique({ where: { id: parentId } });
    if (!parent || parent.school_id !== schoolId) {
        throw new Error("Accès non autorisé: le parent spécifié n'appartient pas à votre école.");
    }

    return prisma.studentParents.create({
      data: {
        student_id: studentId,
        parent_id: parentId,
        relation: relation,
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:studentParents:unlink', async (event, { studentId, parentId }) => {
    const schoolId = await getUserSchoolId(event);

    const registration = await prisma.registrations.findFirst({
        where: { student_id: studentId, is_deleted: false },
        orderBy: { id: 'desc' },
        include: { class: true }
    });
    if (!registration || registration.class.school_id !== schoolId) {
        throw new Error("Accès non autorisé: l'étudiant spécifié n'appartient pas à votre école.");
    }

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
  ipcMain.handle('db:lessons:getAll', async (event) => {
    const schoolId = await getUserSchoolId(event);
    return prisma.lessons.findMany({
      where: { 
        is_deleted: false,
        class: {
          school_id: schoolId
        }
      },
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
    const schoolId = await getUserSchoolId(event);
    const { subject_id, teacher_id, class_id, school_year } = lessonData;

    const classToLink = await prisma.classes.findUnique({ where: { id: class_id } });
    if (!classToLink || classToLink.school_id !== schoolId) {
      throw new Error("Accès non autorisé: la classe spécifiée n'appartient pas à votre école.");
    }

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
    const schoolId = await getUserSchoolId(event);
    const { subject_id, teacher_id, class_id, school_year } = data;

    const lessonToUpdate = await prisma.lessons.findUnique({ 
      where: { id },
      include: { class: true }
    });

    if (!lessonToUpdate || lessonToUpdate.class.school_id !== schoolId) {
      throw new Error("Accès non autorisé ou leçon non trouvée.");
    }

    if (class_id && class_id !== lessonToUpdate.class_id) {
      const newClass = await prisma.classes.findUnique({ where: { id: class_id } });
      if (!newClass || newClass.school_id !== schoolId) {
          throw new Error("Accès non autorisé: la nouvelle classe spécifiée n'appartient pas à votre école.");
      }
    }

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
    const schoolId = await getUserSchoolId(event);
    const lessonToDelete = await prisma.lessons.findUnique({
      where: { id },
      include: { class: true }
    });

    if (!lessonToDelete || lessonToDelete.class.school_id !== schoolId) {
      throw new Error("Accès non autorisé ou leçon non trouvée.");
    }

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
    const totalStudents = await prisma.students.count({ where: { is_deleted: false } });
    const totalTeachers = await prisma.teachers.count({ where: { is_deleted: false } });
    const totalClasses = await prisma.classes.count({ where: { is_deleted: false } });

    const today = new Date().toISOString().split('T')[0];
    const attendanceToday = await prisma.attendances.findMany({
      where: { date: today, is_deleted: false },
    });

    const present = attendanceToday.filter(a => a.state === 'present').length;
    const absent = attendanceToday.filter(a => a.state === 'absent').length;
    const late = attendanceToday.filter(a => a.state === 'late').length;

    // Répartition par genre
    const genderData = await prisma.students.groupBy({
      by: ['genre'],
      _count: {
        id: true,
      },
      where: { is_deleted: false },
    });
    const genderDistribution = genderData.map(g => ({ 
      gender: g.genre || 'Non défini',
      count: g._count.id 
    }));

    // Paiements des 6 derniers mois
    const monthlyPayments = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const month = d.toLocaleString('fr-FR', { month: 'short' });
      const year = d.getFullYear();
      const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];

      const payments = await prisma.payments.aggregate({
        _sum: { amount: true },
        where: {
          date: { gte: firstDay, lte: lastDay },
          is_deleted: false,
        },
      });
      monthlyPayments.push({ name: month, total: payments._sum.amount || 0 });
    }

    // Répartition des élèves par classe
    const classRegistrations = await prisma.registrations.groupBy({
        by: ['class_id'],
        _count: {
            student_id: true
        },
        where: { is_deleted: false }
    });
    const classes = await prisma.classes.findMany({ where: { id: { in: classRegistrations.map(c => c.class_id) } } });
    const studentsPerClass = classRegistrations.map(reg => ({
        name: classes.find(c => c.id === reg.class_id)?.name || 'N/A',
        students: reg._count.student_id
    }));

    return {
      totalStudents,
      totalTeachers,
      totalClasses,
      attendanceToday: { present, absent, late },
      genderDistribution,
      monthlyPayments,
      studentsPerClass
    };
  });

  ipcMain.handle('db:reports:getClassResults', async (event, { classId, quarter }) => {
    return calculateClassResults(classId, quarter);
  });

  ipcMain.handle('db:reports:getAllClassesPerformance', async (event, { quarter }) => {
    const classes = await prisma.classes.findMany({
      where: { is_deleted: false },
    });
  
    const performancePromises = classes.map(async (c) => {
      const results = await calculateClassResults(c.id, quarter);
  
      if (!results || results.length === 0) {
        return {
          classId: c.id,
          className: c.name,
          studentCount: 0,
          averageGrade: 0,
          passRate: 0,
        };
      }
  
      const totalAverage = results.reduce((acc, r) => acc + r.average, 0) / results.length;
      const passingStudents = results.filter((r) => r.status === "Admis").length;
      const passRate = (passingStudents / results.length) * 100;
  
      return {
        classId: c.id,
        className: c.name,
        studentCount: results.length,
        averageGrade: totalAverage,
        passRate: passRate,
      };
    });
  
    const data = await Promise.all(performancePromises);
    
    // Sort from best to worst
    data.sort((a, b) => b.averageGrade - a.averageGrade);
  
    return data;
  });

  ipcMain.handle('db:reports:getClassTrend', async (event, { classId }) => {
    const trend = [];
    for (const quarter of [1, 2, 3]) {
      const results = await calculateClassResults(classId, quarter);
      if (results && results.length > 0) {
        const classAverage = results.reduce((acc, r) => acc + r.average, 0) / results.length;
        trend.push({ quarter: `Trimestre ${quarter}`, average: classAverage });
      } else {
        trend.push({ quarter: `Trimestre ${quarter}`, average: 0 });
      }
    }
    return trend;
  });

  ipcMain.handle('db:reports:getFrequentLatePayers', async () => {
    const latePaymentThreshold = 2; // Define what "frequently" means

    const allStudents = await prisma.students.findMany({
      where: { is_deleted: false },
      include: {
        registrations: {
          where: { is_deleted: false },
          orderBy: { id: 'desc' },
          take: 1,
          include: {
            class: true,
          },
        },
      },
    });

    const allFees = await prisma.fees.findMany({
      where: { is_deleted: false },
    });

    const allPayments = await prisma.payments.findMany({
      where: { is_deleted: false },
    });

    const frequentLatePayers = [];

    for (const student of allStudents) {
      if (!student.registrations || student.registrations.length === 0) continue;

      const registration = student.registrations[0];
      const studentLevel = registration.class?.level; // Get the actual level

      const orConditions = [
        { level: null },
        { level: { equals: 'all', mode: 'insensitive' } }
      ];
      if (studentLevel) {
        orConditions.push({ level: { equals: studentLevel, mode: 'insensitive' } });
      }

      const applicableFeesForStudent = allFees.filter(fee => {
        // Re-use the fee applicability logic
        if (fee.is_deleted) return false; // Ensure only active fees
        if (fee.level === null) return true;
        if (fee.level.toLowerCase() === 'all') return true;
        if (studentLevel && fee.level.toLowerCase() === studentLevel.toLowerCase()) return true;
        return false;
      });

      const paymentsForStudent = allPayments.filter(p => p.registration_id === registration.id);

      let latePaymentCount = 0;

      for (const fee of applicableFeesForStudent) {
        const totalPaidForFee = paymentsForStudent
          .filter(p => p.fee_id === fee.id)
          .reduce((sum, p) => sum + (p.amount || 0), 0);
        
        const balance = (fee.amount || 0) - totalPaidForFee;

        if (balance > 0 && fee.due_date) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const dueDateParts = fee.due_date.split('-').map(part => parseInt(part, 10));
          if (dueDateParts.length === 3) {
              const dueDateThisYear = new Date(today.getFullYear(), dueDateParts[1] - 1, dueDateParts[2]);
              dueDateThisYear.setHours(0, 0, 0, 0);

              if (today > dueDateThisYear) {
                  latePaymentCount++;
              }
          }
        }
      }

      if (latePaymentCount >= latePaymentThreshold) {
        frequentLatePayers.push({
          id: student.id,
          name: `${student.first_name} ${student.name}`,
          className: student.registrations[0]?.class.name,
          latePaymentCount: latePaymentCount,
        });
      }
    }

    return frequentLatePayers;
  });
  // #endregion

  // #region Financial Management
  ipcMain.handle('db:financial-categories:getAll', async (event) => {
    const schoolId = await getUserSchoolId(event);
    return prisma.financialCategory.findMany({
      where: { 
        is_deleted: false,
        school_id: schoolId
      },
      orderBy: { name: 'asc' },
    });
  });

  ipcMain.handle('db:financial-categories:create', async (event, categoryData) => {
    const schoolId = await getUserSchoolId(event);
    const { name, type } = categoryData;
    return prisma.financialCategory.create({
      data: {
        name,
        type,
        school_id: schoolId,
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:financial-transactions:getAll', async (event, filters) => {
    const schoolId = await getUserSchoolId(event);
    const where = { 
      is_deleted: false,
      school_id: schoolId
    };

    if (filters) {
      if (filters.type) {
        where.type = filters.type;
      }
      if (filters.categoryId) {
        // Correction: Convertir l'ID de la catégorie en nombre
        const categoryIdNum = parseInt(filters.categoryId, 10);
        if (!isNaN(categoryIdNum)) {
          where.category_id = categoryIdNum;
        }
      }
      if (filters.startDate) {
        where.date = { ...where.date, gte: filters.startDate };
      }
      if (filters.endDate) {
        where.date = { ...where.date, lte: filters.endDate };
      }
    }

    return prisma.financialTransaction.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: { date: 'desc' },
    });
  });

  ipcMain.handle('db:financial-transactions:create', async (event, transactionData) => {
    const schoolId = await getUserSchoolId(event);
    const { date, description, amount, type, category_id } = transactionData;
    return prisma.financialTransaction.create({
      data: {
        date,
        description,
        amount,
        type,
        category_id,
        school_id: schoolId,
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:financial-transactions:update', async (event, { id, data }) => {
    const schoolId = await getUserSchoolId(event);
    const transactionToUpdate = await prisma.financialTransaction.findUnique({ where: { id } });

    if (!transactionToUpdate || transactionToUpdate.school_id !== schoolId) {
      throw new Error("Accès non autorisé ou transaction non trouvée.");
    }

    const { date, description, amount, type, category_id } = data;
    return prisma.financialTransaction.update({
      where: { id },
      data: {
        date,
        description,
        amount,
        type,
        category_id,
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:financial-transactions:delete', async (event, id) => {
    const schoolId = await getUserSchoolId(event);
    const transactionToDelete = await prisma.financialTransaction.findUnique({ where: { id } });

    if (!transactionToDelete || transactionToDelete.school_id !== schoolId) {
      throw new Error("Accès non autorisé ou transaction non trouvée.");
    }

    return prisma.financialTransaction.update({
      where: { id },
      data: {
        is_deleted: true,
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:migrate:salaries-to-expenses', async () => {
    let count = 0;
    let skipped = 0;

    await prisma.$transaction(async (tx) => {
      // 1. Assurer que la catégorie "Salaires" existe
      let salaryCategory = await tx.financialCategory.findFirst({
        where: { name: 'Salaires', type: 'expense' },
      });
      if (!salaryCategory) {
        salaryCategory = await tx.financialCategory.create({
          data: { name: 'Salaires', type: 'expense', needs_sync: true, last_modified: new Date() },
        });
      }

      // 2. Récupérer tous les paiements de salaires
      const salaryPayments = await tx.salaryPayments.findMany({
        include: { employee: true },
      });

      // 3. Récupérer les transactions existantes pour éviter les doublons
      const existingTransactions = await tx.financialTransaction.findMany({
        where: { category_id: salaryCategory.id },
      });

      for (const payment of salaryPayments) {
        // 4. Vérifier si une transaction existe déjà pour ce paiement
        const description = `Paiement de salaire: ${payment.employee.first_name} ${payment.employee.name}`;
        const alreadyExists = existingTransactions.some(
          (t) =>
            new Date(t.date).getTime() === new Date(payment.payment_date).getTime() &&
            t.amount === payment.total_amount &&
            t.description.includes(payment.employee.name)
        );

        if (alreadyExists) {
          skipped++;
          continue;
        }

        // 5. Créer la transaction si elle n'existe pas
        await tx.financialTransaction.create({
          data: {
            date: new Date(payment.payment_date),
            description,
            amount: payment.total_amount,
            type: 'expense',
            category_id: salaryCategory.id,
            needs_sync: true,
            last_modified: new Date(),
          },
        });
        count++;
      }
    });

    console.log(`Migration des salaires terminée. ${count} transactions créées, ${skipped} ignorées.`);
    return { migrated: count, skipped };
  });

  ipcMain.handle('db:migrate:student-payments-to-income', async () => {
    let count = 0;
    let skipped = 0;

    await prisma.$transaction(async (tx) => {
      const allPayments = await tx.payments.findMany({
        where: { is_deleted: false },
        include: {
          fee: true,
          registration: {
            include: {
              student: true,
            },
          },
        },
      });

      for (const payment of allPayments) {
        if (!payment.registration || !payment.registration.student || !payment.amount) {
          skipped++;
          continue;
        }
        
        const feeName = payment.fee?.name || 'Revenu scolaire';
        const studentName = `${payment.registration.student.first_name} ${payment.registration.student.name}`;
        const description = `Paiement de ${feeName} par ${studentName}`;

        // Trouver ou créer la catégorie
        let category = await tx.financialCategory.findFirst({
            where: { name: feeName, type: 'income' },
        });
        if (!category) {
            category = await tx.financialCategory.create({
                data: { name: feeName, type: 'income', needs_sync: true, last_modified: new Date() },
            });
        }

        // Vérifier si une transaction similaire existe déjà pour éviter les doublons
        const existingTransaction = await tx.financialTransaction.findFirst({
          where: {
            description: description,
            amount: payment.amount,
            date: new Date(payment.date),
            type: 'income',
            category_id: category.id,
          },
        });

        if (existingTransaction) {
          skipped++;
          continue;
        }

        // Créer la transaction
        await tx.financialTransaction.create({
          data: {
            date: new Date(payment.date),
            description: description,
            amount: payment.amount,
            type: 'income',
            category_id: category.id,
            needs_sync: true,
            last_modified: new Date(),
          },
        });
        count++;
      }
    });

    console.log(`Migration des paiements terminée. ${count} transactions créées, ${skipped} ignorées.`);
    return { migrated: count, skipped };
  });

  ipcMain.handle('db:financial-reports:getSummary', async (event) => {
    const schoolId = await getUserSchoolId(event);

    const income = await prisma.financialTransaction.aggregate({
      _sum: { amount: true },
      where: { type: 'income', is_deleted: false, school_id: schoolId },
    });

    const expenses = await prisma.financialTransaction.aggregate({
      _sum: { amount: true },
      where: { type: 'expense', is_deleted: false, school_id: schoolId },
    });

    const incomeByCategory = await prisma.financialTransaction.groupBy({
      by: ['category_id'],
      _sum: { amount: true },
      where: { type: 'income', is_deleted: false, school_id: schoolId },
    });

    const expenseByCategory = await prisma.financialTransaction.groupBy({
      by: ['category_id'],
      _sum: { amount: true },
      where: { type: 'expense', is_deleted: false, school_id: schoolId },
    });

    const categories = await prisma.financialCategory.findMany({
        where: { is_deleted: false, school_id: schoolId }
    });

    const incomeByCategoryWithName = incomeByCategory.map(item => {
        const category = categories.find(c => c.id === item.category_id);
        return {
            name: category ? category.name : 'Uncategorized',
            amount: item._sum.amount,
        }
    });

    const expenseByCategoryWithName = expenseByCategory.map(item => {
        const category = categories.find(c => c.id === item.category_id);
        return {
            name: category ? category.name : 'Uncategorized',
            amount: item._sum.amount,
        }
    });

    return {
      totalIncome: income._sum.amount || 0,
      totalExpenses: expenses._sum.amount || 0,
      netProfit: (income._sum.amount || 0) - (expenses._sum.amount || 0),
      incomeByCategory: incomeByCategoryWithName,
      expenseByCategory: expenseByCategoryWithName,
    };
  });
  // #endregion

  // #region Schedules
  ipcMain.handle('db:schedules:getAll', async (event) => {
    const schoolId = await getUserSchoolId(event);
    return prisma.schedules.findMany({
        where: {
            is_deleted: false,
            lesson: {
                class: {
                    school_id: schoolId
                }
            }
        }
    });
  });

// Corriger le format des heures (string au lieu de time)
ipcMain.handle('db:schedules:create', async (event, scheduleData) => {
  const schoolId = await getUserSchoolId(event);
  const { lesson_id, day_of_week, start_time, end_time } = scheduleData;

  const lesson = await prisma.lessons.findUnique({
    where: { id: lesson_id },
    include: { class: true }
  });

  if (!lesson || lesson.class.school_id !== schoolId) {
    throw new Error("Accès non autorisé: la leçon spécifiée n'appartient pas à votre école.");
  }

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
    const schoolId = await getUserSchoolId(event);
    const { lesson_id, day_of_week, start_time, end_time } = data;

    const scheduleToUpdate = await prisma.schedules.findUnique({
      where: { id },
      include: { lesson: { include: { class: true } } }
    });

    if (!scheduleToUpdate || scheduleToUpdate.lesson.class.school_id !== schoolId) {
      throw new Error("Accès non autorisé ou emploi du temps non trouvé.");
    }

    if (lesson_id && lesson_id !== scheduleToUpdate.lesson_id) {
      const newLesson = await prisma.lessons.findUnique({
        where: { id: lesson_id },
        include: { class: true }
      });
      if (!newLesson || newLesson.class.school_id !== schoolId) {
        throw new Error("Accès non autorisé: la nouvelle leçon n'appartient pas à votre école.");
      }
    }

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
    const schoolId = await getUserSchoolId(event);
    const scheduleToDelete = await prisma.schedules.findUnique({
      where: { id },
      include: { lesson: { include: { class: true } } }
    });

    if (!scheduleToDelete || scheduleToDelete.lesson.class.school_id !== schoolId) {
      throw new Error("Accès non autorisé ou emploi du temps non trouvé.");
    }

    return prisma.schedules.update({
      where: { id },
      data: { 
        is_deleted: true, 
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  });

  ipcMain.handle('db:schedules:getForClass', async (event, classId) => {
    const schoolId = await getUserSchoolId(event);

    if (classId) {
        const classToCheck = await prisma.classes.findUnique({ where: { id: classId } });
        if (!classToCheck || classToCheck.school_id !== schoolId) {
            throw new Error("Accès non autorisé ou classe non trouvée.");
        }
    }
    
    const whereClause = classId 
        ? { lesson: { class_id: classId, is_deleted: false } } 
        : { lesson: { class: { school_id: schoolId }, is_deleted: false } };

    return prisma.schedules.findMany({
      where: whereClause,
      include: {
        lesson: {
          include: {
            subject: true,
            class: true,
            teacher: true,
          },
        },
      },
      orderBy: {
        start_time: 'asc'
      }
    });
  });
  // #endregion

  // #region Notes
  ipcMain.handle('db:notes:getAll', async (event) => {
    const schoolId = await getUserSchoolId(event);
    return prisma.notes.findMany({
      where: { 
        is_deleted: false,
        lesson: {
            class: {
                school_id: schoolId
            }
        }
      },
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
  const schoolId = await getUserSchoolId(event);
  const { student_id, lesson_id, value, type, quarter } = noteData;

  const lesson = await prisma.lessons.findUnique({
      where: { id: lesson_id },
      include: { class: true }
  });

  if (!lesson || lesson.class.school_id !== schoolId) {
      throw new Error("Accès non autorisé: la leçon spécifiée n'appartient pas à votre école.");
  }

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
    const schoolId = await getUserSchoolId(event);
    const { student_id, lesson_id, value, type, quarter } = data;

    const noteToUpdate = await prisma.notes.findUnique({
      where: { id },
      include: { lesson: { include: { class: true } } }
    });

    if (!noteToUpdate || noteToUpdate.lesson.class.school_id !== schoolId) {
      throw new Error("Accès non autorisé ou note non trouvée.");
    }

    if (lesson_id && lesson_id !== noteToUpdate.lesson_id) {
      const newLesson = await prisma.lessons.findUnique({ 
        where: { id: lesson_id },
        include: { class: true }
      });
      if (!newLesson || newLesson.class.school_id !== schoolId) {
        throw new Error("Accès non autorisé: la nouvelle leçon spécifiée n'appartient pas à votre école.");
      }
    }

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
    const schoolId = await getUserSchoolId(event);
    const noteToDelete = await prisma.notes.findUnique({
      where: { id },
      include: { lesson: { include: { class: true } } }
    });

    if (!noteToDelete || noteToDelete.lesson.class.school_id !== schoolId) {
      throw new Error("Accès non autorisé ou note non trouvée.");
    }

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
  const schoolId = await getUserSchoolId(event);
  const { name, first_name, phone, email, adress, gender, job_title, salary, password } = employeeData;

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const schoolName = settings?.schoolName || 'SCHOOL';
  const initials = schoolName.substring(0, 3).toUpperCase();
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  const matricule = `EMP-${initials}-${randomDigits}`;

  let password_hash = null;
  if (password) {
    password_hash = bcrypt.hashSync(password, 10);
  }

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
      password_hash,
      school_id: schoolId,
      needs_sync: true,
      last_modified: new Date(),
    },
  });
});

ipcMain.handle('db:employees:update', async (event, { id, data }) => {
  const schoolId = await getUserSchoolId(event);
  const employeeToUpdate = await prisma.employees.findUnique({ where: { id } });

  if (!employeeToUpdate || employeeToUpdate.school_id !== schoolId) {
    throw new Error("Accès non autorisé ou employé non trouvé.");
  }

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
  const schoolId = await getUserSchoolId(event);
  const employeeToDelete = await prisma.employees.findUnique({ where: { id } });

  if (!employeeToDelete || employeeToDelete.school_id !== schoolId) {
    throw new Error("Accès non autorisé ou employé non trouvé.");
  }

  return prisma.employees.update({
      where: { id },
      data: { 
        is_deleted: true, 
        needs_sync: true,
        last_modified: new Date(),
      },
    });
});

ipcMain.handle('db:employees:paySalary', async (event, { employee_id, base_salary, bonus_amount, payment_date, notes }) => {
  const schoolId = await getUserSchoolId(event);
  const employee = await prisma.employees.findUnique({ where: { id: employee_id } });

  if (!employee || employee.school_id !== schoolId) {
    throw new Error("Accès non autorisé ou employé non trouvé.");
  }

  const total_amount = base_salary + bonus_amount;

  return prisma.$transaction(async (tx) => {
    // Étape 1: Créer l'enregistrement du paiement de salaire (fonctionnalité existante)
    const salaryPayment = await tx.salaryPayments.create({
      data: {
        employee_id,
        base_salary,
        bonus_amount,
        total_amount,
        payment_date,
        notes,
        needs_sync: true,
        last_modified: new Date(),
      },
      include: {
        employee: true, // Inclure l'employé pour obtenir son nom
      }
    });

    // Étape 2: Trouver ou créer la catégorie "Salaires"
    let salaryCategory = await tx.financialCategory.findFirst({
      where: { name: 'Salaires', type: 'expense', school_id: schoolId },
    });

    if (!salaryCategory) {
      salaryCategory = await tx.financialCategory.create({
        data: {
          name: 'Salaires',
          type: 'expense',
          school_id: schoolId,
          needs_sync: true,
          last_modified: new Date(),
        },
      });
    }

    // Étape 3: Créer la transaction financière correspondante
    await tx.financialTransaction.create({
      data: {
        date: new Date(payment_date),
        description: `Paiement de salaire: ${salaryPayment.employee.first_name} ${salaryPayment.employee.name}`,
        amount: total_amount,
        type: 'expense',
        category_id: salaryCategory.id,
        school_id: schoolId,
        needs_sync: true,
        last_modified: new Date(),
      },
    });

    return salaryPayment;
  });
});

ipcMain.handle('db:employees:getSalaryHistory', async (event, employeeId) => {
  const schoolId = await getUserSchoolId(event);
  if (!employeeId) return [];

  const employee = await prisma.employees.findUnique({ where: { id: employeeId } });
  if (!employee || employee.school_id !== schoolId) {
    throw new Error("Accès non autorisé ou employé non trouvé.");
  }

  return prisma.salaryPayments.findMany({
    where: { employee_id: employeeId, is_deleted: false },
    orderBy: { payment_date: 'desc' },
  });
});

ipcMain.handle('db:employees:getStats', async () => {
  const totalEmployees = await prisma.employees.count({ where: { is_deleted: false } });
  const payrollData = await prisma.employees.aggregate({
    where: { is_deleted: false },
    _sum: { salary: true },
  });
  return {
    totalEmployees,
    monthlyPayroll: payrollData._sum.salary || 0,
  };
});
  // #endregion

  // #region fees
  ipcMain.handle('db:fees:getAll', async (event, args) => {
    const schoolId = await getUserSchoolId(event);
    const allFees = await prisma.fees.findMany({
      where: { 
        is_deleted: false,
        school_id: schoolId
      },
    });

    const filteredFees = allFees.filter(fee => {
      if (fee.level === null) return true; // General fees (null)
      const feeLevel = fee.level.toLowerCase();
      if (feeLevel === 'all') return true; // General fees ('all')
      if (args?.level && feeLevel === args.level.toLowerCase()) return true; // Level-specific fees
      return false;
    });

    return filteredFees;
  });

ipcMain.handle('db:fees:create', async (event, feeData) => {
  const schoolId = await getUserSchoolId(event);
  const { name, amount, due_date, school_year, level } = feeData;
  return prisma.fees.create({
    data: {
      name,
      amount,
      due_date,
      school_year,
      level,
      school_id: schoolId,
      needs_sync: true,
      last_modified: new Date(),
    },
  });
});

ipcMain.handle('db:fees:update', async (event, { id, data }) => {
  const schoolId = await getUserSchoolId(event);
  const feeToUpdate = await prisma.fees.findUnique({ where: { id } });

  if (!feeToUpdate || feeToUpdate.school_id !== schoolId) {
    throw new Error("Accès non autorisé ou frais non trouvé.");
  }

  const { name, amount, due_date, school_year, level } = data;
  return prisma.fees.update({
    where: { id },
    data: {
      name,
      amount,
      due_date,
      school_year,
      level,
      needs_sync: true,
      last_modified: new Date(),
    },
  });
});

ipcMain.handle('db:fees:delete', async (event, id) => {
  const schoolId = await getUserSchoolId(event);
  const feeToDelete = await prisma.fees.findUnique({ where: { id } });

  if (!feeToDelete || feeToDelete.school_id !== schoolId) {
    throw new Error("Accès non autorisé ou frais non trouvé.");
  }

  return prisma.fees.update({
    where: { id },
    data: { 
      is_deleted: true, 
      needs_sync: true,
      last_modified: new Date(),
    },
  });
});

  ipcMain.handle('db:fees:getStudentFeeStatus', async (event, { registrationId, level }) => {
    const schoolId = await getUserSchoolId(event);

    const registration = await prisma.registrations.findUnique({
        where: { id: registrationId },
        include: { class: true }
    });
    if (!registration || registration.class.school_id !== schoolId) {
        throw new Error("Accès non autorisé: l'inscription n'appartient pas à votre école.");
    }

    // 1. Fetch fees for the correct school
    const allFees = await prisma.fees.findMany({
      where: { 
          is_deleted: false,
          school_id: schoolId
      },
    });

    // 2. Filter them in JavaScript code (case-insensitive)
    const applicableFees = allFees.filter(fee => {
      if (fee.level === null) return true; // General fees
      const feeLevel = fee.level.toLowerCase();
      if (feeLevel === 'all') return true; // "all" fees
      if (level && feeLevel === level.toLowerCase()) return true; // Level-specific fees
      return false;
    });

    const payments = await prisma.payments.findMany({
      where: {
        registration_id: registrationId,
        is_deleted: false,
      },
    });

    return applicableFees.map(fee => {
      const totalPaidForFee = payments
        .filter(p => p.fee_id === fee.id)
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      
      const balance = (fee.amount || 0) - totalPaidForFee;

      let status = 'À venir';
      if (balance <= 0) {
        status = 'Payé';
      } else if (fee.due_date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Ignorer l'heure pour la comparaison

        // Analyser la date d'échéance stockée en tant que chaîne (ex: "2024-02-15")
        const dueDateParts = fee.due_date.split('-').map(part => parseInt(part, 10));
        if (dueDateParts.length === 3) {
            // Créer la date d'échéance pour l'année EN COURS
            const dueDateThisYear = new Date(today.getFullYear(), dueDateParts[1] - 1, dueDateParts[2]);
            dueDateThisYear.setHours(0, 0, 0, 0);

            if (today > dueDateThisYear) {
                status = 'En retard';
            }
        }
      }

      return {
        ...fee,
        total_paid: totalPaidForFee,
        balance: balance,
        status: status, // Ajout du statut
      };
    });
  });

  // #endregion

  // #region Printer
  ipcMain.handle('printers:get-list', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return win.webContents.getPrinters();
  });

  ipcMain.handle('printers:print-receipt', async (event, { htmlContent, printerName }) => {
    const printWindow = new BrowserWindow({ show: false });
    
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURI(htmlContent)}`);
    
    return new Promise((resolve, reject) => {
      printWindow.webContents.on('did-finish-load', () => {
        printWindow.webContents.print({
          silent: true,
          deviceName: printerName,
          printBackground: true,
        }, (success, errorType) => {
          if (!success) {
            console.error('Printing failed:', errorType);
            reject(new Error(errorType));
          } else {
            resolve({ success: true });
          }
          printWindow.close();
        });
      });
    });
  });
  // #endregion
}

module.exports = { initializePrisma, setupDatabaseIPC }; // Exporter la fonction d'initialisation