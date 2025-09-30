const { ipcMain } = require('electron');
const { pushSingleItem } = require('../sync.cjs');
const { isOnline, getUserSchoolId } = require('./helpers.cjs');

function setupSchedulesIPC(prisma) {
  ipcMain.handle('db:schedules:getAll', async (event) => {
    const schoolId = await getUserSchoolId(prisma, event);
    return prisma.schedules.findMany({ where: { is_deleted: false, lesson: { class: { school_id: schoolId } } } });
  });

  ipcMain.handle('db:schedules:create', async (event, scheduleData) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const { lesson_id, day_of_week, start_time, end_time } = scheduleData;
    const lesson = await prisma.lessons.findUnique({ where: { id: lesson_id }, include: { class: true } });
    if (!lesson || lesson.class.school_id !== schoolId) throw new Error("Accès non autorisé");
    const newSchedule = await prisma.schedules.create({
      data: { lesson_id, day_of_week, start_time: start_time.toString(), end_time: end_time.toString(), needs_sync: true, last_modified: new Date() },
    });
    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'schedules', newSchedule.id).catch(err => console.error(err));
      }
    });
    return newSchedule;
  });

  ipcMain.handle('db:schedules:update', async (event, { id, data }) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const { lesson_id, day_of_week, start_time, end_time } = data;
    const scheduleToUpdate = await prisma.schedules.findUnique({ where: { id }, include: { lesson: { include: { class: true } } } });
    if (!scheduleToUpdate || scheduleToUpdate.lesson.class.school_id !== schoolId) throw new Error("Accès non autorisé");
    if (lesson_id && lesson_id !== scheduleToUpdate.lesson_id) {
      const newLesson = await prisma.lessons.findUnique({ where: { id: lesson_id }, include: { class: true } });
      if (!newLesson || newLesson.class.school_id !== schoolId) throw new Error("Accès non autorisé");
    }
    const updatedSchedule = await prisma.schedules.update({ where: { id }, data: { lesson_id, day_of_week, start_time, end_time, needs_sync: true, last_modified: new Date() } });
    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'schedules', updatedSchedule.id).catch(err => console.error(err));
      }
    });
    return updatedSchedule;
  });

  ipcMain.handle('db:schedules:delete', async (event, id) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const scheduleToDelete = await prisma.schedules.findUnique({ where: { id }, include: { lesson: { include: { class: true } } } });
    if (!scheduleToDelete || !scheduleToDelete.lesson || !scheduleToDelete.lesson.class || scheduleToDelete.lesson.class.school_id !== schoolId) throw new Error("Accès non autorisé");
    const deletedSchedule = await prisma.schedules.update({ where: { id }, data: { is_deleted: true, needs_sync: true, last_modified: new Date() } });
    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'schedules', deletedSchedule.id).catch(err => console.error(err));
      }
    });
    return deletedSchedule;
  });

  ipcMain.handle('db:schedules:getForClass', async (event, classId) => {
    const schoolId = await getUserSchoolId(prisma, event);
    if (classId) {
      const classToCheck = await prisma.classes.findUnique({ where: { id: classId } });
      if (!classToCheck || classToCheck.school_id !== schoolId) throw new Error("Accès non autorisé");
    }
    const whereClause = classId ? { lesson: { class_id: classId, is_deleted: false } } : { lesson: { class: { school_id: schoolId }, is_deleted: false } };
    return prisma.schedules.findMany({ where: whereClause, include: { lesson: { include: { subject: true, class: true, teacher: true } } }, orderBy: { start_time: 'asc' } });
  });
}

module.exports = { setupSchedulesIPC };
