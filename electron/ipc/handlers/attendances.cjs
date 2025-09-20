const { ipcMain } = require('electron');
const { pushSingleItem } = require('../sync.cjs');
const { isOnline, getUserSchoolId } = require('./helpers.cjs');

function setupAttendancesIPC(prisma) {
  ipcMain.handle('db:attendances:getAll', async (event, args) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const whereClause = { is_deleted: false, student: { registrations: { some: { is_deleted: false, class: { school_id: schoolId } } } } };
    if (args?.date) {
      whereClause.date = args.date;
    }
    return prisma.attendances.findMany({
      where: whereClause,
      include: { student: true },
      orderBy: { id: 'desc' },
    }).then(attendances => attendances.map(a => ({ ...a, firstName: a.student.first_name, lastName: a.student.name })) );
  });

  ipcMain.handle('db:attendances:create', async (event, attendanceData) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const { student_id, date, state, justification } = attendanceData;
    const registration = await prisma.registrations.findFirst({ where: { student_id: student_id, is_deleted: false }, orderBy: { id: 'desc' }, include: { class: true } });
    if (!registration || registration.class.school_id !== schoolId) throw new Error("Accès non autorisé");
    const newAttendance = await prisma.attendances.create({ data: { student_id, date, state, justification, needs_sync: true, last_modified: new Date() } });
    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'attendances', newAttendance.id).catch(err => console.error(err));
      }
    });
    return newAttendance;
  });

  ipcMain.handle('db:attendances:update', async (event, { id, data }) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const { student_id, date, state, justification } = data;
    const attendanceToUpdate = await prisma.attendances.findUnique({ where: { id }, include: { student: { include: { registrations: { include: { class: true }, where: { is_deleted: false }, orderBy: { id: 'desc' }, take: 1 } } } } });
    if (!attendanceToUpdate || !attendanceToUpdate.student.registrations.length || attendanceToUpdate.student.registrations[0].class.school_id !== schoolId) throw new Error("Accès non autorisé");
    const updatedAttendance = await prisma.attendances.update({ where: { id }, data: { student_id, date, state, justification, needs_sync: true, last_modified: new Date() } });
    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'attendances', updatedAttendance.id).catch(err => console.error(err));
      }
    });
    return updatedAttendance;
  });

  ipcMain.handle('db:attendances:delete', async (event, id) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const attendanceToDelete = await prisma.attendances.findUnique({ where: { id }, include: { student: { include: { registrations: { include: { class: true }, where: { is_deleted: false }, orderBy: { id: 'desc' }, take: 1 } } } } });
    if (!attendanceToDelete || !attendanceToDelete.student.registrations.length || attendanceToDelete.student.registrations[0].class.school_id !== schoolId) throw new Error("Accès non autorisé");
    const deletedAttendance = await prisma.attendances.update({ where: { id }, data: { is_deleted: true, needs_sync: true, last_modified: new Date() } });
    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'attendances', deletedAttendance.id).catch(err => console.error(err));
      }
    });
    return deletedAttendance;
  });

  ipcMain.handle('db:attendances:getByStudentId', async (event, studentId) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const registration = await prisma.registrations.findFirst({ where: { student_id: studentId, is_deleted: false }, orderBy: { id: 'desc' }, include: { class: true } });
    if (!registration || registration.class.school_id !== schoolId) {
      console.warn(`Accès non autorisé ou aucune inscription trouvée pour l'étudiant ${studentId} dans l'école ${schoolId}. Retourne une liste de présences vide.`);
      return [];
    }
    return prisma.attendances.findMany({ where: { student_id: studentId, is_deleted: false }, orderBy: { date: 'desc' }, take: 5 });
  });
}

module.exports = { setupAttendancesIPC };
