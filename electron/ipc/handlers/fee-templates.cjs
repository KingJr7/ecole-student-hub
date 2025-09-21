const { ipcMain } = require('electron');
const { pushSingleItem } = require('../sync.cjs');
const { isOnline, getUserSchoolId } = require('./helpers.cjs');

let isIpcSetup = false;

function setupFeeTemplatesIPC(prisma) {
  if (isIpcSetup) return;
  isIpcSetup = true;
  ipcMain.handle('db:fee-templates:getAll', async (event) => {
    const schoolId = await getUserSchoolId(prisma, event);
    return prisma.feeTemplate.findMany({ where: { school_id: schoolId } });
  });

  ipcMain.handle('db:fee-templates:create', async (event, data) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const { name, amount, frequency, due_day, applicable_months, applies_to_level, applies_to_class_id } = data;
    
    const newTemplate = await prisma.feeTemplate.create({
      data: {
        name,
        amount,
        frequency,
        due_day,
        applicable_months,
        applies_to_level,
        applies_to_class_id,
        school_id: schoolId,
        // needs_sync and last_modified are not in the schema for FeeTemplate
      },
    });

    // Real-time push for consistency, though not critical for templates
    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'feeTemplate', newTemplate.id).catch(err => console.error(err));
      }
    });
    return newTemplate;
  });

  ipcMain.handle('db:fee-templates:update', async (event, { id, data }) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const templateToUpdate = await prisma.feeTemplate.findUnique({ where: { id } });
    if (!templateToUpdate || templateToUpdate.school_id !== schoolId) throw new Error("Accès non autorisé");

    const { name, amount, frequency, due_day, applicable_months, applies_to_level, applies_to_class_id } = data;

    const updatedTemplate = await prisma.feeTemplate.update({
      where: { id },
      data: {
        name,
        amount,
        frequency,
        due_day,
        applicable_months,
        applies_to_level,
        applies_to_class_id,
        // needs_sync and last_modified are not in the schema for FeeTemplate
      },
    });

    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'feeTemplate', updatedTemplate.id).catch(err => console.error(err));
      }
    });
    return updatedTemplate;
  });

  ipcMain.handle('db:fee-templates:delete', async (event, id) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const templateToDelete = await prisma.feeTemplate.findUnique({ where: { id } });
    if (!templateToDelete || templateToDelete.school_id !== schoolId) throw new Error("Accès non autorisé");

    // Soft-delete is not supported by the schema for FeeTemplate, so we will do a hard delete.
    // First, check if any payments are associated with this template.
    const paymentCount = await prisma.payments.count({ where: { fee_template_id: id, is_deleted: false } });
    if (paymentCount > 0) {
      throw new Error('Impossible de supprimer ce modèle, car des paiements y sont associés.');
    }

    const deletedTemplate = await prisma.feeTemplate.delete({ where: { id } });

    // isOnline().then(online => {
    //   if (online) {
    //     // We need to handle deletion sync differently, this push won't work as the item is gone.
    //     // For now, skipping push on delete.
    //   }
    // });

    return deletedTemplate;
  });
}

module.exports = { setupFeeTemplatesIPC };
