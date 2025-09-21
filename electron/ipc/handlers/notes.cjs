const { ipcMain } = require('electron');
const { pushSingleItem } = require('../sync.cjs');
const { isOnline, getUserSchoolId } = require('./helpers.cjs');

function setupNotesIPC(prisma) {
  console.log('CHARGEMENT DU HANDLER DES NOTES');
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

  ipcMain.handle('db:notes:createMany', async (event, { lesson_id, type, quarter, grades }) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const lesson = await prisma.lessons.findUnique({ where: { id: lesson_id }, include: { class: true } });
    if (!lesson || lesson.class.school_id !== schoolId) throw new Error("Accès non autorisé pour cette leçon.");

    const transactionResult = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const grade of grades) {
        if (grade.value === null || grade.value === undefined) continue; // Ne pas traiter les notes vides

        const existingNote = await tx.notes.findFirst({
          where: {
            student_id: grade.student_id,
            lesson_id: lesson_id,
            type: type,
            quarter: quarter,
            is_deleted: false
          }
        });

        if (existingNote) {
          // Mettre à jour la note existante
          const updatedNote = await tx.notes.update({
            where: { id: existingNote.id },
            data: { value: grade.value, needs_sync: true, last_modified: new Date() },
          });
          results.push(updatedNote);
        } else {
          // Créer une nouvelle note
          const newNote = await tx.notes.create({
            data: {
              student_id: grade.student_id,
              lesson_id: lesson_id,
              value: grade.value,
              type: type,
              quarter: quarter,
              needs_sync: true,
              last_modified: new Date(),
            },
          });
          results.push(newNote);
        }
      }
      return results;
    });

    // Déclencher la synchronisation pour les éléments créés/mis à jour
    isOnline().then(online => {
      if (online) {
        transactionResult.forEach(note => {
          pushSingleItem(prisma, 'notes', note.id).catch(err => console.error(err));
        });
      }
    });

    return { count: transactionResult.length };
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
