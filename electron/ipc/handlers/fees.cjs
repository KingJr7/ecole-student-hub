const { ipcMain } = require('electron');
const { pushSingleItem } = require('../sync.cjs');
const { isOnline, getUserSchoolId } = require('./helpers.cjs');

function setupFeesIPC(prisma) {
  ipcMain.handle('db:fees:getAll', async (event, args) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const allFees = await prisma.fees.findMany({
      where: { is_deleted: false, school_id: schoolId },
    });

    if (!args?.level) return allFees;

    return allFees.filter(fee => {
      if (fee.level === null || fee.level.toLowerCase() === 'all') return true;
      if (args.level && fee.level.toLowerCase() === args.level.toLowerCase()) return true;
      return false;
    });
  });

  ipcMain.handle('db:fees:create', async (event, feeData) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const { name, amount, due_date, school_year, level } = feeData;
    const newFee = await prisma.fees.create({
      data: { name, amount, due_date, school_year, level, school_id: schoolId, needs_sync: true, last_modified: new Date() },
    });
    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'fees', newFee.id).catch(err => console.error(err));
      }
    });
    return newFee;
  });

  ipcMain.handle('db:fees:update', async (event, { id, data }) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const feeToUpdate = await prisma.fees.findUnique({ where: { id } });
    if (!feeToUpdate || feeToUpdate.school_id !== schoolId) throw new Error("Accès non autorisé");
    const { name, amount, due_date, school_year, level } = data;
    const updatedFee = await prisma.fees.update({
      where: { id },
      data: { name, amount, due_date, school_year, level, needs_sync: true, last_modified: new Date() },
    });
    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'fees', updatedFee.id).catch(err => console.error(err));
      }
    });
    return updatedFee;
  });

  ipcMain.handle('db:fees:delete', async (event, id) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const feeToDelete = await prisma.fees.findUnique({ where: { id } });
    if (!feeToDelete || feeToDelete.school_id !== schoolId) throw new Error("Accès non autorisé");
    const deletedFee = await prisma.fees.update({
      where: { id },
      data: { is_deleted: true, needs_sync: true, last_modified: new Date() },
    });
    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'fees', deletedFee.id).catch(err => console.error(err));
      }
    });
    return deletedFee;
  });

  ipcMain.handle('db:fees:getStudentFeeStatus', async (event, { registrationId, level }) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const registration = await prisma.registrations.findUnique({ where: { id: registrationId }, include: { class: true } });
    if (!registration || registration.class.school_id !== schoolId) throw new Error("Accès non autorisé");
    const allFees = await prisma.fees.findMany({ where: { is_deleted: false, school_id: schoolId } });
    const applicableFees = allFees.filter(fee => {
      if (fee.level === null || fee.level.toLowerCase() === 'all') return true;
      if (level && fee.level.toLowerCase() === level.toLowerCase()) return true;
      return false;
    });
    const payments = await prisma.payments.findMany({ where: { registration_id: registrationId, is_deleted: false } });
    return applicableFees.map(fee => {
      const totalPaidForFee = payments.filter(p => p.fee_id === fee.id).reduce((sum, p) => sum + (p.amount || 0), 0);
      const balance = (fee.amount || 0) - totalPaidForFee;
      let status = 'À venir';
      if (balance <= 0) {
        status = 'Payé';
      } else if (fee.due_date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDateParts = fee.due_date.split('-').map(part => parseInt(part, 10));
        if (dueDateParts.length === 3) {
          const dueDateThisYear = new Date(today.getFullYear(), dueDateParts[1] - 1, dueDateParts[2]);
          dueDateThisYear.setHours(0, 0, 0, 0);
          if (today > dueDateThisYear) {
            status = 'En retard';
          }
        }
      }
      return { ...fee, total_paid: totalPaidForFee, balance: balance, status: status };
    });
  });
}

module.exports = { setupFeesIPC };
