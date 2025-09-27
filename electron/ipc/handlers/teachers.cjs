const { ipcMain } = require('electron');
const { pushSingleItem } = require('../sync.cjs');
const { isOnline, getUserSchoolId, getUserContext } = require('./helpers.cjs');
const bcrypt = require('bcryptjs');

function setupTeachersIPC(prisma) {
  ipcMain.handle('db:teachers:getAll', async () => {
    return prisma.teachers.findMany({ where: { is_deleted: false } });
  });

  ipcMain.handle('db:teachers:create', async (event, teacherData) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const { name, first_name, email, phone, speciality, adress, hourlyRate, password } = teacherData;

    const existingTeacher = await prisma.teachers.findUnique({ where: { email } });
    if (existingTeacher) {
      throw new Error('Un professeur avec cette adresse e-mail existe déjà.');
    }

    const password_hash = bcrypt.hashSync(password, 10);
    const year = new Date().getFullYear().toString().slice(-2);
    const prefix = `TEA-${year}-`;

    const lastTeacher = await prisma.teachers.findFirst({
      where: { matricule: { startsWith: prefix } },
      orderBy: { matricule: 'desc' },
    });

    let nextIdNumber = 1;
    if (lastTeacher) {
      const lastId = parseInt(lastTeacher.matricule.replace(prefix, ''), 10);
      nextIdNumber = lastId + 1;
    }

    const nextId = nextIdNumber.toString().padStart(4, '0');
    const matricule = `${prefix}${nextId}`;

    const newTeacher = await prisma.teachers.create({
      data: {
        name, first_name, email, phone, password_hash, matricule, speciality, adress, hourlyRate,
        school_id: schoolId,
        needs_sync: true,
        last_modified: new Date(),
      },
    });

    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'teachers', newTeacher.id).catch(err => console.error(err));
      }
    });

    return newTeacher;
  });

  ipcMain.handle('db:teachers:update', async (event, { id, data }) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const teacherToUpdate = await prisma.teachers.findUnique({ where: { id } });

    if (!teacherToUpdate || teacherToUpdate.school_id !== schoolId) {
      throw new Error("Accès non autorisé ou professeur non trouvé.");
    }

    const { name, first_name, email, phone, speciality, adress, hourlyRate } = data;
    const updatedTeacher = await prisma.teachers.update({
      where: { id },
      data: { name, first_name, email, phone, speciality, adress, hourlyRate, needs_sync: true, last_modified: new Date() },
    });

    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'teachers', updatedTeacher.id).catch(err => console.error(err));
      }
    });

    return updatedTeacher;
  });

  ipcMain.handle('db:teachers:delete', async (event, id) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const teacherToDelete = await prisma.teachers.findUnique({ where: { id } });

    if (!teacherToDelete || teacherToDelete.school_id !== schoolId) {
      throw new Error("Accès non autorisé ou professeur non trouvé.");
    }

    const deletedTeacher = await prisma.teachers.update({
      where: { id },
      data: { is_deleted: true, needs_sync: true, last_modified: new Date() },
    });

    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'teachers', deletedTeacher.id).catch(err => console.error(err));
      }
    });

    return deletedTeacher;
  });

  ipcMain.handle('db:teachers:getSchedule', async (event, teacherId) => {
    const { schoolId, userRole, userSupabaseId } = await getUserContext(prisma, event);
    if (!schoolId) throw new Error("Contexte utilisateur invalide. Accès refusé.");

    const teacher = await prisma.teachers.findUnique({ where: { id: teacherId } });
    if (!teacher || teacher.school_id !== schoolId) throw new Error("Accès non autorisé");

    const { permissions } = await prisma.settings.findUnique({ where: { id: 1 } }) || {};
    const hasAccess = userRole === 'admin' || (teacher.user_supabase_id && teacher.user_supabase_id === userSupabaseId) || (permissions?.teachers && permissions.teachers !== 'none');
    if (!hasAccess) throw new Error("Accès non autorisé");

    const scheduleData = await prisma.schedules.findMany({
      where: {
        lesson: {
          teacher_id: teacherId,
          is_deleted: false,
        },
        is_deleted: false,
      },
      include: {
        lesson: {
          include: {
            class: true,
            subject: true,
          },
        },
      },
      orderBy: [
        { day_of_week: 'asc' },
        { start_time: 'asc' },
      ],
    });

    // Convert day_of_week to a number for sorting if it's a string like 'Lundi', 'Mardi'
    const dayOrder = { 'Lundi': 1, 'Mardi': 2, 'Mercredi': 3, 'Jeudi': 4, 'Vendredi': 5, 'Samedi': 6, 'Dimanche': 7 };
    scheduleData.sort((a, b) => {
      const dayA = dayOrder[a.day_of_week] || 8;
      const dayB = dayOrder[b.day_of_week] || 8;
      if (dayA !== dayB) return dayA - dayB;
      return a.start_time.localeCompare(b.start_time);
    });

    return scheduleData;
  });

  // #region TeacherWorkHours
  ipcMain.handle('db:teacherWorkHours:getByTeacherId', async (event, teacherId) => {
    const { schoolId, userRole, userSupabaseId } = await getUserContext(prisma, event);
    if (!schoolId) throw new Error("Contexte utilisateur invalide. Accès refusé.");

    const teacher = await prisma.teachers.findUnique({ where: { id: teacherId } });

    if (!teacher || teacher.school_id !== schoolId) throw new Error("Accès non autorisé");
    
    const { permissions } = await prisma.settings.findUnique({ where: { id: 1 } }) || {};
    const hasAccess = userRole === 'admin' || (teacher.user_supabase_id && teacher.user_supabase_id === userSupabaseId) || (permissions?.teachers && permissions.teachers !== 'none');
    if (!hasAccess) throw new Error("Accès non autorisé");

    return prisma.teacherWorkHours.findMany({
      where: { teacher_id: teacherId, is_deleted: false },
      orderBy: { date: 'desc' },
    });
  });

  ipcMain.handle('db:teacherWorkHours:create', async (event, workHoursData) => {
    const { schoolId } = await getUserContext(prisma, event);
    const { teacher_id, subject_id, date, start_time, end_time, notes } = workHoursData;
    const teacher = await prisma.teachers.findUnique({ where: { id: teacher_id } });
    if (!teacher || teacher.school_id !== schoolId) throw new Error("Accès non autorisé");
    const start = new Date(`${date}T${start_time}`);
    const end = new Date(`${date}T${end_time}`);
    const hours = (end.getTime() - start.getTime()) / 3600000;
    if (hours <= 0) throw new Error("L'heure de fin doit être après l'heure de début.");
    const amount = hours * (teacher.hourlyRate || 0);
    const newWorkHour = await prisma.$transaction(async (tx) => {
      const workHour = await tx.teacherWorkHours.create({ data: { teacher_id, subject_id, date, start_time, end_time, hours, notes, needs_sync: true, last_modified: new Date() } });
      if (amount > 0) {
        let salaryCategory = await tx.financialCategory.findFirst({ where: { name: 'Salaires Professeurs', type: 'expense', school_id: schoolId } });
        if (!salaryCategory) {
          salaryCategory = await tx.financialCategory.create({ data: { name: 'Salaires Professeurs', type: 'expense', school_id: schoolId, needs_sync: true, last_modified: new Date() } });
        }
        await tx.financialTransaction.create({ data: { date: new Date(date), description: `Pointage heures - ${teacher.first_name} ${teacher.name}`, amount, type: 'expense', category_id: salaryCategory.id, school_id: schoolId, needs_sync: true, last_modified: new Date() } });
      }
      return workHour;
    });
    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'teacherWorkHours', newWorkHour.id).catch(err => console.error(err));
      }
    });
    return newWorkHour;
  });

  ipcMain.handle('db:teacherWorkHours:getStats', async (event, teacherId) => {
    const { schoolId, userRole, userSupabaseId } = await getUserContext(prisma, event);
    if (!schoolId) throw new Error("Contexte utilisateur invalide. Accès refusé.");

    const teacher = await prisma.teachers.findUnique({ where: { id: teacherId } });

    if (!teacher || teacher.school_id !== schoolId) throw new Error("Accès non autorisé");

    const { permissions } = await prisma.settings.findUnique({ where: { id: 1 } }) || {};
    const hasAccess = userRole === 'admin' || (teacher.user_supabase_id && teacher.user_supabase_id === userSupabaseId) || (permissions?.teachers && permissions.teachers !== 'none');
    if (!hasAccess) throw new Error("Accès non autorisé");

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const workHours = await prisma.teacherWorkHours.findMany({ where: { teacher_id: teacherId, is_deleted: false, date: { gte: startOfMonth } }, include: { subject: true } });
    const totalHoursThisMonth = workHours.reduce((acc, record) => acc + record.hours, 0);
    const totalEarningsThisMonth = totalHoursThisMonth * (teacher?.hourlyRate || 0);
    const subjectHoursMap = new Map();
    workHours.forEach(record => {
      const subjectName = record.subject?.name || 'Non spécifié';
      subjectHoursMap.set(subjectName, (subjectHoursMap.get(subjectName) || 0) + record.hours);
    });
    const subjectHours = Array.from(subjectHoursMap.entries()).map(([name, hours]) => ({ name, hours }));
    return { totalHoursThisMonth, totalEarningsThisMonth, subjectHours };
  });

  ipcMain.handle('db:teacherWorkHours:getTodayByTeacherId', async (event, teacherId, dateString) => {
    const { schoolId, userRole, userSupabaseId } = await getUserContext(prisma, event);
    if (!schoolId) throw new Error("Contexte utilisateur invalide. Accès refusé.");

    const teacher = await prisma.teachers.findUnique({ where: { id: teacherId } });

    if (!teacher || teacher.school_id !== schoolId) throw new Error("Accès non autorisé");

    const { permissions } = await prisma.settings.findUnique({ where: { id: 1 } }) || {};
    const hasAccess = userRole === 'admin' || (teacher.user_supabase_id && teacher.user_supabase_id === userSupabaseId) || (permissions?.teachers && permissions.teachers !== 'none');
    if (!hasAccess) throw new Error("Accès non autorisé");

    const todayWorkHours = await prisma.teacherWorkHours.findMany({
      where: {
        teacher_id: teacherId,
        date: dateString,
        is_deleted: false,
      },
    });

    const totalHoursToday = todayWorkHours.reduce((acc, record) => acc + record.hours, 0);
    const amountOwedToday = totalHoursToday * (teacher?.hourlyRate || 0);

    return { totalHoursToday, amountOwedToday };
  });

  ipcMain.handle('db:teacherWorkHours:update', async (event, { id, data }) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const { teacher_id, subject_id, date, start_time, end_time, notes } = data;
    const workHourToUpdate = await prisma.teacherWorkHours.findUnique({ where: { id }, include: { teacher: true } });
    if (!workHourToUpdate || workHourToUpdate.teacher.school_id !== schoolId) throw new Error("Accès non autorisé");
    if (teacher_id && teacher_id !== workHourToUpdate.teacher_id) {
      const newTeacher = await prisma.teachers.findUnique({ where: { id: teacher_id } });
      if (!newTeacher || newTeacher.school_id !== schoolId) throw new Error("Accès non autorisé");
    }
    const hours = (new Date(`${date}T${end_time}`).getTime() - new Date(`${date}T${start_time}`).getTime()) / 3600000;
    if (hours <= 0) throw new Error("L'heure de fin doit être après l'heure de début.");
    const updatedWorkHour = await prisma.teacherWorkHours.update({ where: { id }, data: { teacher_id, subject_id, date, start_time, end_time, hours, notes, needs_sync: true, last_modified: new Date() } });
    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'teacherWorkHours', updatedWorkHour.id).catch(err => console.error(err));
      }
    });
    return updatedWorkHour;
  });

  ipcMain.handle('db:teacherWorkHours:delete', async (event, id) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const workHourToDelete = await prisma.teacherWorkHours.findUnique({ where: { id }, include: { teacher: true } });
    if (!workHourToDelete || workHourToDelete.teacher.school_id !== schoolId) throw new Error("Accès non autorisé");
    const deletedWorkHour = await prisma.teacherWorkHours.update({ where: { id }, data: { is_deleted: true, needs_sync: true, last_modified: new Date() } });
    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'teacherWorkHours', deletedWorkHour.id).catch(err => console.error(err));
      }
    });
    return deletedWorkHour;
  });
  // #endregion

  ipcMain.handle('admin:assign-school-to-orphans', async (event) => {
    const { schoolId, userRole } = await getUserContext(prisma, event);

    if (userRole !== 'admin' || !schoolId) {
      throw new Error("Accès refusé. Seul un administrateur peut effectuer cette action.");
    }

    try {
      const updatedTeachers = await prisma.teachers.updateMany({
        where: { school_id: null },
        data: { school_id: schoolId, needs_sync: true, last_modified: new Date() },
      });

      const updatedEmployees = await prisma.employees.updateMany({
        where: { school_id: null },
        data: { school_id: schoolId, needs_sync: true, last_modified: new Date() },
      });

      return {
        updatedTeachersCount: updatedTeachers.count,
        updatedEmployeesCount: updatedEmployees.count,
      };
    } catch (error) {
      console.error("Erreur lors de l'assignation de l'école aux utilisateurs orphelins:", error);
      throw new Error("L'opération de réparation a échoué.");
    }
  });
}

module.exports = { setupTeachersIPC };
