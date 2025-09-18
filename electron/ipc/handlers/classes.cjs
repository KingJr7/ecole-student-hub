const { ipcMain } = require('electron');
const { pushSingleItem } = require('../sync.cjs');
const { isOnline, getUserSchoolId } = require('./helpers.cjs');

function setupClassesIPC(prisma) {
  ipcMain.handle('db:classes:getAll', async () => {
    return prisma.classes.findMany({
      where: { is_deleted: false },
      orderBy: { name: 'asc' },
    });
  });

  ipcMain.handle('db:classes:create', async (event, classData) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const { name, level } = classData;
    const newClass = await prisma.classes.create({
      data: { 
        name, 
        level, 
        school_id: schoolId,
        needs_sync: true,
        last_modified: new Date(),
      },
    });

    isOnline().then(online => {
      if (online) {
        console.log(`[REALTIME] Internet connection detected, pushing item classes #${newClass.id}`);
        pushSingleItem(prisma, 'classes', newClass.id).catch(err => {
          console.error(`[REALTIME-PUSH-FAIL] for classes #${newClass.id}: ${err.message}`);
        });
      }
    });

    return newClass;
  });

  ipcMain.handle('db:classes:update', async (event, { id, data }) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const classToUpdate = await prisma.classes.findUnique({ where: { id } });

    if (!classToUpdate || classToUpdate.school_id !== schoolId) {
      throw new Error("Accès non autorisé ou classe non trouvée.");
    }

    const { name, level } = data;
    const updatedClass = await prisma.classes.update({
      where: { id },
      data: { 
        name, 
        level, 
        needs_sync: true,
        last_modified: new Date(),
      },
    });

    isOnline().then(online => {
      if (online) {
        console.log(`[REALTIME] Internet connection detected, pushing item classes #${updatedClass.id}`);
        pushSingleItem(prisma, 'classes', updatedClass.id).catch(err => {
          console.error(`[REALTIME-PUSH-FAIL] for classes #${updatedClass.id}: ${err.message}`);
        });
      }
    });

    return updatedClass;
  });

  ipcMain.handle('db:classes:delete', async (event, id) => {
    const schoolId = await getUserSchoolId(prisma, event);

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

    const deletedClass = await prisma.classes.update({
      where: { id },
      data: { 
        is_deleted: true, 
        needs_sync: true,
        last_modified: new Date(),
      },
    });

    isOnline().then(online => {
      if (online) {
        console.log(`[REALTIME] Internet connection detected, pushing deleted item classes #${deletedClass.id}`);
        pushSingleItem(prisma, 'classes', deletedClass.id).catch(err => {
          console.error(`[REALTIME-PUSH-FAIL] for deleted classes #${deletedClass.id}: ${err.message}`);
        });
      }
    });

    return deletedClass;
  });
}

module.exports = { setupClassesIPC };
