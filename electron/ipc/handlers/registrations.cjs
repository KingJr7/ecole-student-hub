const { ipcMain } = require('electron');
const { pushSingleItem } = require('../sync.cjs');
const { isOnline, getUserSchoolId } = require('./helpers.cjs');

function setupRegistrationsIPC(prisma) {
  ipcMain.handle('db:registrations:getAll', async (event) => {
    const schoolId = await getUserSchoolId(prisma, event);
    return prisma.registrations.findMany({
      where: { is_deleted: false, class: { school_id: schoolId } },
      include: { student: true, class: true },
    }).then(registrations => 
      registrations.map(r => ({ ...r, studentId: r.student.id, firstName: r.student.first_name, lastName: r.student.name, classId: r.class.id, className: r.class.name }))
    );
  });

  ipcMain.handle('db:registrations:create', async (event, regData) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const { student_id, class_id, school_year, state, registration_date } = regData;
    const classToLink = await prisma.classes.findUnique({ where: { id: class_id } });
    if (!classToLink || classToLink.school_id !== schoolId) throw new Error("Accès non autorisé");
    const newRegistration = await prisma.registrations.create({
      data: { student_id, class_id, school_year, state, registration_date, needs_sync: true, last_modified: new Date() },
    });
    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'registrations', newRegistration.id).catch(err => console.error(err));
      }
    });
    return newRegistration;
  });

  ipcMain.handle('db:registrations:update', async (event, { id, data }) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const { student_id, class_id, school_year, state, registration_date } = data;
    const registrationToUpdate = await prisma.registrations.findUnique({ where: { id }, include: { class: true } });
    if (!registrationToUpdate || registrationToUpdate.class.school_id !== schoolId) throw new Error("Accès non autorisé");
    if (class_id && class_id !== registrationToUpdate.class_id) {
      const newClass = await prisma.classes.findUnique({ where: { id: class_id } });
      if (!newClass || newClass.school_id !== schoolId) throw new Error("Accès non autorisé");
    }
    const updatedRegistration = await prisma.registrations.update({
      where: { id },
      data: { student_id, class_id, school_year, state, registration_date, needs_sync: true, last_modified: new Date() },
    });
    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'registrations', updatedRegistration.id).catch(err => console.error(err));
      }
    });
    return updatedRegistration;
  });

  ipcMain.handle('db:registrations:delete', async (event, id) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const registrationToDelete = await prisma.registrations.findUnique({ where: { id }, include: { class: true } });
    if (!registrationToDelete || registrationToDelete.class.school_id !== schoolId) throw new Error("Accès non autorisé");
    const paymentCount = await prisma.payments.count({ where: { registration_id: id, is_deleted: false } });
    if (paymentCount > 0) throw new Error('Cette inscription est liée à des paiements');
    const deletedRegistration = await prisma.registrations.update({
      where: { id },
      data: { is_deleted: true, needs_sync: true, last_modified: new Date() },
    });
    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'registrations', deletedRegistration.id).catch(err => console.error(err));
      }
    });
    return deletedRegistration;
  });

  ipcMain.handle('db:registrations:getLatestForStudent', async (event, { studentId }) => {
    const schoolId = await getUserSchoolId(prisma, event);
    if (!studentId) return null;
    const registration = await prisma.registrations.findFirst({
      where: { student_id: studentId, is_deleted: false },
      orderBy: { id: 'desc' },
      include: { class: true },
    });
    if (!registration || registration.class.school_id !== schoolId) return null;
    return registration;
  });
}

module.exports = { setupRegistrationsIPC };
