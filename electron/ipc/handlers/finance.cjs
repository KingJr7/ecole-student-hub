const { ipcMain } = require('electron');
const { pushSingleItem } = require('../sync.cjs');
const { isOnline, getUserSchoolId } = require('./helpers.cjs');

function setupFinanceIPC(prisma) {
  ipcMain.handle('db:financial-categories:getAll', async (event) => {
    const schoolId = await getUserSchoolId(prisma, event);
    return prisma.financialCategory.findMany({
      where: { is_deleted: false, school_id: schoolId },
      orderBy: { name: 'asc' },
    });
  });

  ipcMain.handle('db:financial-categories:create', async (event, categoryData) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const { name, type } = categoryData;
    const newCategory = await prisma.financialCategory.create({
      data: { name, type, school_id: schoolId, needs_sync: true, last_modified: new Date() },
    });
    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'financialCategory', newCategory.id).catch(err => console.error(err));
      }
    });
    return newCategory;
  });

  ipcMain.handle('db:financial-transactions:getAll', async (event, filters) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const where = { is_deleted: false, school_id: schoolId };
    if (filters) {
      if (filters.type) where.type = filters.type;
      if (filters.categoryId) {
        const categoryIdNum = parseInt(filters.categoryId, 10);
        if (!isNaN(categoryIdNum)) where.category_id = categoryIdNum;
      }
      if (filters.startDate) where.date = { ...where.date, gte: filters.startDate };
      if (filters.endDate) where.date = { ...where.date, lte: filters.endDate };
    }
    return prisma.financialTransaction.findMany({ where, include: { category: true }, orderBy: { date: 'desc' } });
  });

  ipcMain.handle('db:financial-transactions:create', async (event, transactionData) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const { date, description, amount, type, category_id } = transactionData;
    const newTransaction = await prisma.financialTransaction.create({
      data: { date, description, amount, type, category_id, school_id: schoolId, needs_sync: true, last_modified: new Date() },
    });
    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'financialTransaction', newTransaction.id).catch(err => console.error(err));
      }
    });
    return newTransaction;
  });

  ipcMain.handle('db:financial-transactions:update', async (event, { id, data }) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const itemToUpdate = await prisma.financialTransaction.findUnique({ where: { id } });
    if (!itemToUpdate || itemToUpdate.school_id !== schoolId) throw new Error("Accès non autorisé");
    const updatedItem = await prisma.financialTransaction.update({ where: { id }, data: { ...data, needs_sync: true, last_modified: new Date() } });
    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'financialTransaction', updatedItem.id).catch(err => console.error(err));
      }
    });
    return updatedItem;
  });

  ipcMain.handle('db:financial-transactions:delete', async (event, id) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const itemToDelete = await prisma.financialTransaction.findUnique({ where: { id } });
    if (!itemToDelete || itemToDelete.school_id !== schoolId) throw new Error("Accès non autorisé");
    const deletedItem = await prisma.financialTransaction.update({ where: { id }, data: { is_deleted: true, needs_sync: true, last_modified: new Date() } });
    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'financialTransaction', deletedItem.id).catch(err => console.error(err));
      }
    });
    return deletedItem;
  });

  ipcMain.handle('db:dispatch-rules:getAll', async (event) => {
    const schoolId = await getUserSchoolId(prisma, event);
    return prisma.dispatchRule.findMany({
      where: { school_id: schoolId, is_deleted: false },
      include: { source_fee: true, details: { include: { destination_category: true } } },
      orderBy: { name: 'asc' },
    });
  });

  ipcMain.handle('db:dispatch-rules:create', async (event, { name, source_fee_id, details }) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const fee = await prisma.fees.findUnique({ where: { id: source_fee_id } });
    if (!fee || fee.school_id !== schoolId) throw new Error("Accès non autorisé");

    // Vérifier si une règle existe déjà pour ce frais
    const existingRule = await prisma.dispatchRule.findUnique({
      where: { source_fee_id },
    });
    if (existingRule) {
      throw new Error('Une règle de répartition existe déjà pour ce type de frais. Veuillez la modifier.');
    }

    const newRule = await prisma.$transaction(async (tx) => {
      const rule = await tx.dispatchRule.create({
        data: { name, source_fee_id, school_id: schoolId, needs_sync: true, last_modified: new Date() },
      });
      for (const detail of details) {
        await tx.dispatchRuleDetail.create({ data: { ...detail, dispatch_rule_id: rule.id, needs_sync: true, last_modified: new Date() } });
      }
      return rule;
    });

    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'dispatchRule', newRule.id).catch(err => console.error(err));
      }
    });

    return newRule;
  });

  ipcMain.handle('db:dispatch-rules:delete', async (event, id) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const ruleToDelete = await prisma.dispatchRule.findUnique({ where: { id } });
    if (!ruleToDelete || ruleToDelete.school_id !== schoolId) throw new Error("Accès non autorisé");
    const deletedRule = await prisma.dispatchRule.update({ where: { id }, data: { is_deleted: true, needs_sync: true, last_modified: new Date() } });
    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'dispatchRule', deletedRule.id).catch(err => console.error(err));
      }
    });
    return deletedRule;
  });

  ipcMain.handle('db:dispatch-rules:update', async (event, { id, data }) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const { name, source_fee_id, details } = data;
    const ruleToUpdate = await prisma.dispatchRule.findUnique({ where: { id } });
    if (!ruleToUpdate || ruleToUpdate.school_id !== schoolId) throw new Error("Accès non autorisé");
    const updatedRule = await prisma.$transaction(async (tx) => {
      const rule = await tx.dispatchRule.update({ where: { id }, data: { name, source_fee_id, needs_sync: true, last_modified: new Date() } });
      await tx.dispatchRuleDetail.deleteMany({ where: { dispatch_rule_id: id } });
      for (const detail of details) {
        await tx.dispatchRuleDetail.create({ data: { ...detail, dispatch_rule_id: rule.id, needs_sync: true, last_modified: new Date() } });
      }
      return rule;
    });
    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'dispatchRule', updatedRule.id).catch(err => console.error(err));
      }
    });
    return updatedRule;
  });

  ipcMain.handle('db:finance:get-dispatch-summary', async (event) => {
    const schoolId = await getUserSchoolId(prisma, event);

    const rules = await prisma.dispatchRule.findMany({
      where: { school_id: schoolId, is_deleted: false },
      include: {
        details: {
          include: {
            destination_category: true,
          },
        },
      },
    });

    const payments = await prisma.payments.findMany({
      where: {
        is_deleted: false,
        registration: {
          class: {
            school_id: schoolId,
          },
        },
        fee_id: { not: null },
      },
      select: {
        fee_id: true,
        amount: true,
      },
    });

    const incomePerFee = payments.reduce((acc, payment) => {
      acc[payment.fee_id] = (acc[payment.fee_id] || 0) + payment.amount;
      return acc;
    }, {});

    const dispatchSummary = {};

    for (const rule of rules) {
      const totalIncomeForRule = incomePerFee[rule.source_fee_id] || 0;
      if (totalIncomeForRule > 0) {
        for (const detail of rule.details) {
          const categoryName = detail.destination_category.name;
          const dispatchedAmount = totalIncomeForRule * detail.percentage;
          dispatchSummary[categoryName] = (dispatchSummary[categoryName] || 0) + dispatchedAmount;
        }
      }
    }

    return Object.entries(dispatchSummary).map(([name, value]) => ({
      name,
      value,
    }));
  });
}

module.exports = { setupFinanceIPC };
