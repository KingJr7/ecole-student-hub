const { ipcMain } = require('electron');
const { pushSingleItem } = require('../sync.cjs');
const { isOnline, getUserSchoolId } = require('./helpers.cjs');

function setupStudentParentsIPC(prisma) {
  ipcMain.removeHandler('db:studentParents:getByStudent');
  ipcMain.handle('db:studentParents:getByStudent', async (event, studentId) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const registration = await prisma.registrations.findFirst({
        where: { student_id: studentId, is_deleted: false },
        orderBy: { id: 'desc' },
        include: { class: true }
    });
    if (!registration || registration.class.school_id !== schoolId) throw new Error("Accès non autorisé");

    return prisma.studentParents.findMany({
      where: {
        student_id: studentId,
        is_deleted: false,
        parent: { is_deleted: false },
      },
      include: { parent: true },
    }).then(links => links.map(l => l.parent));
  });

  ipcMain.removeHandler('db:studentParents:link');
  ipcMain.handle('db:studentParents:link', async (event, { studentId, parentId, relation }) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const registration = await prisma.registrations.findFirst({
        where: { student_id: studentId, is_deleted: false },
        orderBy: { id: 'desc' },
        include: { class: true }
    });
    if (!registration || registration.class.school_id !== schoolId) throw new Error("Accès non autorisé");

    const parent = await prisma.parents.findUnique({ where: { id: parentId } });
    if (!parent || parent.school_id !== schoolId) throw new Error("Accès non autorisé");

    const newLink = await prisma.studentParents.create({
      data: {
        student_id: studentId,
        parent_id: parentId,
        relation: relation,
        needs_sync: true,
        last_modified: new Date(),
      },
    });

    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'studentParents', newLink.id).catch(err => console.error(err));
      }
    });

    return newLink;
  });

  ipcMain.removeHandler('db:studentParents:unlink');
  ipcMain.handle('db:studentParents:unlink', async (event, { studentId, parentId }) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const registration = await prisma.registrations.findFirst({
        where: { student_id: studentId, is_deleted: false },
        orderBy: { id: 'desc' },
        include: { class: true }
    });
    if (!registration || registration.class.school_id !== schoolId) throw new Error("Accès non autorisé");

    const linkToUnlink = await prisma.studentParents.findFirst({
        where: { student_id: studentId, parent_id: parentId, is_deleted: false }
    });

    const result = await prisma.studentParents.updateMany({
      where: { student_id: studentId, parent_id: parentId },
      data: { is_deleted: true, needs_sync: true, last_modified: new Date() },
    });

    if (linkToUnlink) {
        isOnline().then(online => {
            if (online) {
                pushSingleItem(prisma, 'studentParents', linkToUnlink.id).catch(err => console.error(err));
            }
        });
    }

    return result;
  });
}

module.exports = { setupStudentParentsIPC };