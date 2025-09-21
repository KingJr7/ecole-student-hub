const { ipcMain } = require('electron');
// const { pushSingleItem } = require('../sync.cjs'); // Commented out as sync is not ready
const { isOnline, getUserSchoolId } = require('./helpers.cjs');

function setupFeesIPC(prisma) {
  ipcMain.removeHandler('db:fees:getAll');
  ipcMain.handle('db:fees:getAll', async (event, args) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const allFees = await prisma.singleFee.findMany({
      where: { is_deleted: false, school_id: schoolId },
    });

    if (!args?.level) return allFees;

    return allFees.filter(fee => {
      if (fee.level === null || fee.level.toLowerCase() === 'all') return true;
      if (args.level && fee.level.toLowerCase() === args.level.toLowerCase()) return true;
      return false;
    });
  });

  ipcMain.removeHandler('db:fees:create');
  ipcMain.handle('db:fees:create', async (event, feeData) => {
    const schoolId = await getUserSchoolId(prisma, event);
    let { name, amount, due_date, school_year, level } = feeData;

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

    const newFee = await prisma.singleFee.create({
      data: { name, amount, due_date, school_year, level, school_id: schoolId, needs_sync: true, last_modified: new Date() },
    });
    // isOnline().then(online => {
    //   if (online) {
    //     pushSingleItem(prisma, 'singleFee', newFee.id).catch(err => console.error(err));
    //   }
    // });
    return newFee;
  });

  ipcMain.removeHandler('db:fees:update');
  ipcMain.handle('db:fees:update', async (event, { id, data }) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const feeToUpdate = await prisma.singleFee.findUnique({ where: { id } });
    if (!feeToUpdate || feeToUpdate.school_id !== schoolId) throw new Error("Accès non autorisé");
    const { name, amount, due_date, school_year, level } = data;
    const updatedFee = await prisma.singleFee.update({
      where: { id },
      data: { name, amount, due_date, school_year, level, needs_sync: true, last_modified: new Date() },
    });
    // isOnline().then(online => {
    //   if (online) {
    //     pushSingleItem(prisma, 'singleFee', updatedFee.id).catch(err => console.error(err));
    //   }
    // });
    return updatedFee;
  });

  ipcMain.removeHandler('db:fees:delete');
  ipcMain.handle('db:fees:delete', async (event, id) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const feeToDelete = await prisma.singleFee.findUnique({ where: { id } });
    if (!feeToDelete || feeToDelete.school_id !== schoolId) throw new Error("Accès non autorisé");
    const deletedFee = await prisma.singleFee.update({
      where: { id },
      data: { is_deleted: true, needs_sync: true, last_modified: new Date() },
    });
    // isOnline().then(online => {
    //   if (online) {
    //     pushSingleItem(prisma, 'singleFee', deletedFee.id).catch(err => console.error(err));
    //   }
    // });
    return deletedFee;
  });

  ipcMain.removeHandler('db:fees:getStudentFeeStatus');
  ipcMain.handle('db:fees:getStudentFeeStatus', async (event, { registrationId }) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const registration = await prisma.registrations.findUnique({ 
      where: { id: registrationId }, 
      include: { class: true } 
    });
    if (!registration || registration.class.school_id !== schoolId) throw new Error("Accès non autorisé");

    const studentLevel = registration.class.level;
    const studentClassId = registration.class.id;
    const payments = await prisma.payments.findMany({ where: { registration_id: registrationId, is_deleted: false } });
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });

    // 1. Gérer les frais uniques (SingleFee)
    const applicableSingleFees = await prisma.singleFee.findMany({
      where: {
        is_deleted: false,
        school_id: schoolId,
        OR: [
          { level: 'all' },
          { level: null },
          { level: studentLevel },
          { class_id: studentClassId }
        ]
      }
    });

    const singleFeeStatuses = applicableSingleFees.map(fee => {
      const totalPaidForFee = payments
        .filter(p => p.single_fee_id === fee.id)
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      const balance = (fee.amount || 0) - totalPaidForFee;
      let status = 'À venir';
      if (balance <= 0) {
        status = 'Payé';
      } else if (fee.due_date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(fee.due_date);
        dueDate.setHours(0,0,0,0);
        if (today > dueDate) {
          status = 'En retard';
        }
      }
      return { 
        id: `single-${fee.id}`,
        name: fee.name,
        amount: fee.amount,
        due_date: fee.due_date,
        total_paid: totalPaidForFee, 
        balance: balance, 
        status: status,
        type: 'unique'
      };
    });

    // 2. Gérer les modèles de frais (FeeTemplate)
    const applicableTemplates = await prisma.feeTemplate.findMany({
      where: {
        school_id: schoolId,
        OR: [
          { applies_to_level: 'all' },
          { applies_to_level: null },
          { applies_to_level: studentLevel },
          { applies_to_class_id: studentClassId }
        ]
      }
    });

    const templateFeeStatuses = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const getWeekNumber = (d) => {
      d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
      var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
      var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
      return weekNo;
    }

    for (const template of applicableTemplates) {
      if (template.frequency === 'monthly' && template.applicable_months) {
        const months = template.applicable_months;
        const monthMap = { "sept": 8, "oct": 9, "nov": 10, "dec": 11, "jan": 0, "fev": 1, "mar": 2, "avr": 3, "mai": 4, "juin": 5, "juil": 6, "aout": 7 };

        for (const monthName of months) {
          const monthIndex = monthMap[monthName];
          if (monthIndex === undefined) continue;

          const currentYear = new Date().getFullYear();
          const schoolYearStartMonth = 8; // September is month 8
          let dueYear = (today.getMonth() + 1) >= schoolYearStartMonth ? currentYear : currentYear - 1;
          if (monthIndex < schoolYearStartMonth) {
             dueYear = dueYear + 1;
          }

          const dueDate = new Date(dueYear, monthIndex, template.due_day || 1);
          dueDate.setHours(0,0,0,0);

          const periodId = `${monthName}-${dueYear}`;
          const totalPaidForPeriod = payments
            .filter(p => p.fee_template_id === template.id && p.period_identifier === periodId)
            .reduce((sum, p) => sum + (p.amount || 0), 0);
          
          const balance = (template.amount || 0) - totalPaidForPeriod;
          let status = 'À venir';

          if (balance <= 0) {
            status = 'Payé';
          } else if (today > dueDate) {
            status = 'En retard';
          }

          templateFeeStatuses.push({
            id: `template-${template.id}-${periodId}`,
            name: `${template.name} (${monthName})`,
            amount: template.amount,
            due_date: dueDate.toISOString().split('T')[0],
            total_paid: totalPaidForPeriod,
            balance: balance,
            status: status,
            type: 'recurrent'
          });
        }
      } else if (template.frequency === 'weekly') {
        const schoolYear = settings?.activeSchoolYear;
        if (!schoolYear || !template.due_day) continue;

        const startYear = parseInt(schoolYear.split('-')[0], 10);
        const schoolYearStartDate = settings.schoolYearStartDate ? new Date(settings.schoolYearStartDate) : new Date(startYear, 8, 1); // Use configured date or default to Sept 1st

        let currentDate = new Date(schoolYearStartDate);

        while (currentDate <= today) {
          let weekDueDate = new Date(currentDate);
          const dayOfWeek = currentDate.getDay() === 0 ? 7 : currentDate.getDay(); // Adjust Sunday to be 7
          const dueDay = template.due_day; // Assuming 1=Mon, 2=Tue, ...
          weekDueDate.setDate(weekDueDate.getDate() - dayOfWeek + dueDay);

          if (weekDueDate > today && balance <= 0) continue; // Don't show future paid weeks

          const week = getWeekNumber(weekDueDate);
          const year = weekDueDate.getFullYear();
          const periodId = `W${week}-${year}`;

          const totalPaidForPeriod = payments
            .filter(p => p.fee_template_id === template.id && p.period_identifier === periodId)
            .reduce((sum, p) => sum + (p.amount || 0), 0);

          const balance = (template.amount || 0) - totalPaidForPeriod;
          let status = 'À venir';

          if (balance <= 0) {
            status = 'Payé';
          } else if (today > weekDueDate) {
            status = 'En retard';
          }

          // Improved user-friendly name
          let weekStartDate = new Date(weekDueDate);
          weekStartDate.setDate(weekDueDate.getDate() - dueDay + 1); // Monday of that week
          let weekEndDate = new Date(weekStartDate);
          weekEndDate.setDate(weekStartDate.getDate() + 6); // Sunday of that week
          const name = `${template.name} (Du ${weekStartDate.toLocaleDateString('fr-FR', {day: '2-digit', month: 'short'})} au ${weekEndDate.toLocaleDateString('fr-FR', {day: '2-digit', month: 'short'})})`;

          templateFeeStatuses.push({
            id: `template-${template.id}-${periodId}`,
            name: name,
            amount: template.amount,
            due_date: weekDueDate.toISOString().split('T')[0],
            total_paid: totalPaidForPeriod,
            balance: balance,
            status: status,
            type: 'recurrent'
          });
          
          currentDate.setDate(currentDate.getDate() + 7);
        }
      }
    }

    // 3. Combiner les résultats
    return [...singleFeeStatuses, ...templateFeeStatuses].sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  });
}

module.exports = { setupFeesIPC };