const { ipcMain } = require('electron');
const { pushSingleItem } = require('../sync.cjs');
const { isOnline, getUserSchoolId } = require('./helpers.cjs');

function setupLessonsIPC(prisma) {
  ipcMain.handle('db:lessons:getAll', async (event) => {
    const schoolId = await getUserSchoolId(prisma, event);
    return prisma.lessons.findMany({
      where: { is_deleted: false, class: { school_id: schoolId } },
      include: { subject: true, teacher: true, class: true },
    }).then(lessons => 
      lessons.map(l => ({ ...l, subjectName: l.subject.name, teacherFirstName: l.teacher?.first_name, teacherLastName: l.teacher?.name, className: l.class.name }))
    );
  });

  ipcMain.handle('db:lessons:create', async (event, lessonData) => {
    const schoolId = await getUserSchoolId(prisma, event);
    let { subject_id, teacher_id, class_id, school_year } = lessonData;

    // Calculate school_year if not provided or empty
    if (!school_year) {
      const today = new Date();
      const currentMonth = today.getMonth(); // 0-indexed (0 for January)
      const currentYear = today.getFullYear();

      if (currentMonth >= 8) { // September (8) to December (11)
        school_year = `${currentYear}-${currentYear + 1}`;
      } else { // January (0) to August (7)
        school_year = `${currentYear - 1}-${currentYear}`;
      }
    }

    const classToLink = await prisma.classes.findUnique({ where: { id: class_id } });
    if (!classToLink || classToLink.school_id !== schoolId) throw new Error("Accès non autorisé");
    const newLesson = await prisma.lessons.create({ data: { subject_id, teacher_id, class_id, school_year, needs_sync: true, last_modified: new Date() } });
    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'lessons', newLesson.id).catch(err => console.error(err));
      }
    });
    return newLesson;
  });

  ipcMain.handle('db:lessons:update', async (event, { id, data }) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const { subject_id, teacher_id, class_id, school_year } = data;
    const lessonToUpdate = await prisma.lessons.findUnique({ where: { id }, include: { class: true } });
    if (!lessonToUpdate || lessonToUpdate.class.school_id !== schoolId) throw new Error("Accès non autorisé");
    if (class_id && class_id !== lessonToUpdate.class_id) {
      const newClass = await prisma.classes.findUnique({ where: { id: class_id } });
      if (!newClass || newClass.school_id !== schoolId) throw new Error("Accès non autorisé");
    }
    const updatedLesson = await prisma.lessons.update({ where: { id }, data: { subject_id, teacher_id, class_id, school_year, needs_sync: true, last_modified: new Date() } });
    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'lessons', updatedLesson.id).catch(err => console.error(err));
      }
    });
    return updatedLesson;
  });

  ipcMain.handle('db:lessons:delete', async (event, id) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const lessonToDelete = await prisma.lessons.findUnique({ where: { id }, include: { class: true } });
    if (!lessonToDelete || lessonToDelete.class.school_id !== schoolId) throw new Error("Accès non autorisé");
    const noteCount = await prisma.notes.count({ where: { lesson_id: id, is_deleted: false } });
    if (noteCount > 0) throw new Error('Cette leçon est liée à des notes');
    const deletedLesson = await prisma.lessons.update({ where: { id }, data: { is_deleted: true, needs_sync: true, last_modified: new Date() } });
    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'lessons', deletedLesson.id).catch(err => console.error(err));
      }
    });
    return deletedLesson;
  });
}

module.exports = { setupLessonsIPC };
