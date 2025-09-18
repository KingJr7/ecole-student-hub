const { ipcMain } = require('electron');
const { pushSingleItem } = require('../sync.cjs');
const { isOnline, getUserSchoolId } = require('./helpers.cjs');

function setupSubjectsIPC(prisma) {
  ipcMain.handle('db:subjects:getAll', async (event) => {
    const schoolId = await getUserSchoolId(prisma, event);
    return prisma.subjects.findMany({ where: { is_deleted: false, class: { school_id: schoolId } }, orderBy: { name: 'asc' } });
  });

  ipcMain.handle('db:subjects:create', async (event, subjectData) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const { name, coefficient, class_id, school_year, teacher_id } = subjectData;
    const classToLink = await prisma.classes.findUnique({ where: { id: class_id } });
    if (!classToLink || classToLink.school_id !== schoolId) throw new Error("Accès non autorisé");
    const newSubject = await prisma.$transaction(async (tx) => {
      const subject = await tx.subjects.create({ data: { name, coefficient, class_id, school_year, needs_sync: true, last_modified: new Date() } });
      await tx.lessons.create({ data: { teacher_id: parseInt(teacher_id, 10), class_id: parseInt(class_id, 10), subject_id: subject.id, school_year, needs_sync: true, last_modified: new Date() } });
      return subject;
    });
    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'subjects', newSubject.id).catch(err => console.error(err));
      }
    });
    return newSubject;
  });

  ipcMain.handle('db:subjects:update', async (event, { id, data }) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const subjectToUpdate = await prisma.subjects.findUnique({ where: { id }, include: { class: true } });
    if (!subjectToUpdate || subjectToUpdate.class.school_id !== schoolId) throw new Error("Accès non autorisé");
    const { name, coefficient, class_id, school_year } = data;
    if (class_id && class_id !== subjectToUpdate.class_id) {
      const newClass = await prisma.classes.findUnique({ where: { id: class_id } });
      if (!newClass || newClass.school_id !== schoolId) throw new Error("Accès non autorisé");
    }
    const updatedSubject = await prisma.subjects.update({ where: { id }, data: { name, coefficient, class_id, school_year, needs_sync: true, last_modified: new Date() } });
    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'subjects', updatedSubject.id).catch(err => console.error(err));
      }
    });
    return updatedSubject;
  });

  ipcMain.handle('db:subjects:delete', async (event, id) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const subjectToDelete = await prisma.subjects.findUnique({ where: { id }, include: { class: true } });
    if (!subjectToDelete || subjectToDelete.class.school_id !== schoolId) throw new Error("Accès non autorisé");
    const lessonCount = await prisma.lessons.count({ where: { subject_id: id, is_deleted: false } });
    if (lessonCount > 0) throw new Error('Impossible de supprimer une matière enseignée');
    const deletedSubject = await prisma.subjects.update({ where: { id }, data: { is_deleted: true, needs_sync: true, last_modified: new Date() } });
    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'subjects', deletedSubject.id).catch(err => console.error(err));
      }
    });
    return deletedSubject;
  });

  ipcMain.handle('db:classSubjects:getAll', async (event, classId) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const classToCheck = await prisma.classes.findUnique({ where: { id: classId } });
    if (!classToCheck || classToCheck.school_id !== schoolId) throw new Error("Accès non autorisé");
    return prisma.lessons.findMany({ where: { class_id: classId, is_deleted: false }, include: { subject: true, teacher: true } });
  });

  ipcMain.handle('db:subjects:getByTeacherId', async (event, teacherId) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const teacher = await prisma.teachers.findUnique({ where: { id: teacherId } });
    if (!teacher || teacher.school_id !== schoolId) throw new Error("Accès non autorisé");
    return prisma.subjects.findMany({ where: { lessons: { some: { teacher_id: teacherId } }, is_deleted: false, class: { school_id: schoolId } }, include: { class: true } });
  });
}

module.exports = { setupSubjectsIPC };
