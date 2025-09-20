const { ipcMain } = require('electron');
const { pushSingleItem } = require('../sync.cjs');
const { isOnline, getUserSchoolId } = require('./helpers.cjs');

function setupParentsIPC(prisma) {
  ipcMain.handle('db:parents:getAll', async () => {
    return prisma.parents.findMany({ where: { is_deleted: false } });
  });

  ipcMain.handle('db:parents:create', async (event, parentData) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const { name, first_name, phone, email, adress, gender, profession } = parentData;
    const newParent = await prisma.parents.create({
      data: { name, first_name, phone, email, adress, gender, profession, school_id: schoolId, needs_sync: true, last_modified: new Date() },
    });
    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'parents', newParent.id).catch(err => console.error(err));
      }
    });
    return newParent;
  });

  ipcMain.handle('db:parents:update', async (event, { id, data }) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const parentToUpdate = await prisma.parents.findUnique({ where: { id } });
    if (!parentToUpdate || parentToUpdate.school_id !== schoolId) throw new Error("Accès non autorisé");
    const { name, first_name, phone, email, adress, gender, profession } = data;
    const updatedParent = await prisma.parents.update({
      where: { id },
      data: { name, first_name, phone, email, adress, gender, profession, needs_sync: true, last_modified: new Date() },
    });
    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'parents', updatedParent.id).catch(err => console.error(err));
      }
    });
    return updatedParent;
  });

  ipcMain.handle('db:parents:delete', async (event, id) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const parentToDelete = await prisma.parents.findUnique({ where: { id } });
    if (!parentToDelete || parentToDelete.school_id !== schoolId) throw new Error("Accès non autorisé");
    const linkCount = await prisma.studentParents.count({ where: { parent_id: id, is_deleted: false } });
    if (linkCount > 0) throw new Error('Ce parent est lié à un ou plusieurs étudiants');
    const deletedParent = await prisma.parents.update({
      where: { id },
      data: { is_deleted: true, needs_sync: true, last_modified: new Date() },
    });
    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'parents', deletedParent.id).catch(err => console.error(err));
      }
    });
    return deletedParent;
  });

  ipcMain.handle('db:parents:findByPhone', async (event, phone) => {
    if (!phone) return null;
    return prisma.parents.findFirst({ where: { phone, is_deleted: false } });
  });

  ipcMain.handle('db:studentParents:getByStudent', async (event, studentId) => {
    if (!studentId) return [];
    return prisma.studentParents.findMany({
      where: { student_id: studentId, is_deleted: false },
      include: { parent: true }, // Include parent details
    });
  });
}

module.exports = { setupParentsIPC };
