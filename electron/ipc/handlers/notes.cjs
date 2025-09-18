const { ipcMain } = require('electron');
const { pushSingleItem } = require('../sync.cjs');
const { isOnline, getUserSchoolId } = require('./helpers.cjs');

function setupNotesIPC(prisma) {
  ipcMain.handle('db:notes:getAll', async (event) => {
    const schoolId = await getUserSchoolId(prisma, event);
    return prisma.notes.findMany({
      where: { is_deleted: false, lesson: { class: { school_id: schoolId } } },
      include: { student: true, lesson: { include: { subject: true } } },
    }).then(notes => 
      notes.map(n => ({ ...n, firstName: n.student.first_name, lastName: n.student.name, subjectName: n.lesson.subject.name }))
    );
  });

  ipcMain.handle('db:notes:create', async (event, noteData) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const { student_id, lesson_id, value, type, quarter } = noteData;
    const lesson = await prisma.lessons.findUnique({ where: { id: lesson_id }, include: { class: true } });
    if (!lesson || lesson.class.school_id !== schoolId) throw new Error("Accès non autorisé");
    const newNote = await prisma.notes.create({ data: { student_id, lesson_id, value, type, quarter, needs_sync: true, last_modified: new Date() } });
    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'notes', newNote.id).catch(err => console.error(err));
      }
    });
    return newNote;
  });

  ipcMain.handle('db:notes:update', async (event, { id, data }) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const { student_id, lesson_id, value, type, quarter } = data;
    const noteToUpdate = await prisma.notes.findUnique({ where: { id }, include: { lesson: { include: { class: true } } } });
    if (!noteToUpdate || noteToUpdate.lesson.class.school_id !== schoolId) throw new Error("Accès non autorisé");
    if (lesson_id && lesson_id !== noteToUpdate.lesson_id) {
      const newLesson = await prisma.lessons.findUnique({ where: { id: lesson_id }, include: { class: true } });
      if (!newLesson || newLesson.class.school_id !== schoolId) throw new Error("Accès non autorisé");
    }
    const updatedNote = await prisma.notes.update({ where: { id }, data: { student_id, lesson_id, value, type, quarter, needs_sync: true, last_modified: new Date() } });
    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'notes', updatedNote.id).catch(err => console.error(err));
      }
    });
    return updatedNote;
  });

  ipcMain.handle('db:notes:delete', async (event, id) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const noteToDelete = await prisma.notes.findUnique({ where: { id }, include: { lesson: { include: { class: true } } } });
    if (!noteToDelete || noteToDelete.lesson.class.school_id !== schoolId) throw new Error("Accès non autorisé");
    const deletedNote = await prisma.notes.update({ where: { id }, data: { is_deleted: true, needs_sync: true, last_modified: new Date() } });
    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'notes', deletedNote.id).catch(err => console.error(err));
      }
    });
    return deletedNote;
  });
}

module.exports = { setupNotesIPC };
