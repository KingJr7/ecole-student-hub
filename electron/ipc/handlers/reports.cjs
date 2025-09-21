const { ipcMain } = require('electron');
const { pushSingleItem } = require('../sync.cjs');
const { isOnline, getUserSchoolId, calculateClassResults } = require('./helpers.cjs');

function setupReportsIPC(prisma) {
  ipcMain.removeHandler('db:dashboard:getStats');
  ipcMain.handle('db:dashboard:getStats', async () => {
    const totalStudents = await prisma.students.count({ where: { is_deleted: false } });
    const totalTeachers = await prisma.teachers.count({ where: { is_deleted: false } });
    const totalClasses = await prisma.classes.count({ where: { is_deleted: false } });
    const today = new Date().toISOString().split('T')[0];
    const attendanceToday = await prisma.attendances.findMany({ where: { date: today, is_deleted: false } });
    const present = attendanceToday.filter(a => a.state === 'present').length;
    const absent = attendanceToday.filter(a => a.state === 'absent').length;
    const late = attendanceToday.filter(a => a.state === 'late').length;
    const genderData = await prisma.students.groupBy({ by: ['genre'], _count: { id: true }, where: { is_deleted: false } });
    const genderDistribution = genderData.map(g => ({ gender: g.genre || 'Non défini', count: g._count.id }));
    const monthlyPayments = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const month = d.toLocaleString('fr-FR', { month: 'short' });
      const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
      const payments = await prisma.payments.aggregate({ _sum: { amount: true }, where: { date: { gte: firstDay, lte: lastDay }, is_deleted: false } });
      monthlyPayments.push({ name: month, total: payments._sum.amount || 0 });
    }
    const classRegistrations = await prisma.registrations.groupBy({ by: ['class_id'], _count: { student_id: true }, where: { is_deleted: false } });
    const classes = await prisma.classes.findMany({ where: { id: { in: classRegistrations.map(c => c.class_id) } } });
    const studentsPerClass = classRegistrations.map(reg => ({ name: classes.find(c => c.id === reg.class_id)?.name || 'N/A', students: reg._count.student_id }));
    return { totalStudents, totalTeachers, totalClasses, attendanceToday: { present, absent, late }, genderDistribution, monthlyPayments, studentsPerClass };
  });

  ipcMain.removeHandler('db:reports:getClassResults');
  ipcMain.handle('db:reports:getClassResults', async (event, { classId, quarter }) => {
    return calculateClassResults(prisma, classId, quarter);
  });

  ipcMain.removeHandler('db:reports:getAllClassesPerformance');
  ipcMain.handle('db:reports:getAllClassesPerformance', async (event, { quarter }) => {
    const classes = await prisma.classes.findMany({ where: { is_deleted: false } });
    const performancePromises = classes.map(async (c) => {
      const results = await calculateClassResults(prisma, c.id, quarter);
      if (!results || results.length === 0) {
        return { classId: c.id, className: c.name, studentCount: 0, averageGrade: 0, passRate: 0 };
      }
      const totalAverage = results.reduce((acc, r) => acc + r.average, 0) / results.length;
      const passingStudents = results.filter((r) => r.status === "Admis").length;
      const passRate = (passingStudents / results.length) * 100;
      return { classId: c.id, className: c.name, studentCount: results.length, averageGrade: totalAverage, passRate: passRate };
    });
    const data = await Promise.all(performancePromises);
    data.sort((a, b) => b.averageGrade - a.averageGrade);
    return data;
  });

  ipcMain.removeHandler('db:reports:getClassTrend');
  ipcMain.handle('db:reports:getClassTrend', async (event, { classId }) => {
    const trend = [];
    for (const quarter of [1, 2, 3]) {
      const results = await calculateClassResults(prisma, classId, quarter);
      if (results && results.length > 0) {
        const classAverage = results.reduce((acc, r) => acc + r.average, 0) / results.length;
        trend.push({ quarter: `Trimestre ${quarter}`, average: classAverage });
      } else {
        trend.push({ quarter: `Trimestre ${quarter}`, average: 0 });
      }
    }
    return trend;
  });

  ipcMain.removeHandler('db:reports:getFrequentLatePayers');
  ipcMain.handle('db:reports:getFrequentLatePayers', async (event) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const latePaymentThreshold = 2;
    const allStudents = await prisma.students.findMany({
      where: { is_deleted: false, registrations: { some: { is_deleted: false, class: { school_id: schoolId } } } },
      include: { registrations: { where: { is_deleted: false }, orderBy: { id: 'desc' }, take: 1, include: { class: true } } },
    });
    const allFees = await prisma.singleFee.findMany({ where: { is_deleted: false, school_id: schoolId } });
    const allPayments = await prisma.payments.findMany({ where: { is_deleted: false, registration: { class: { school_id: schoolId } } } });
    const frequentLatePayers = [];
    for (const student of allStudents) {
      if (!student.registrations || student.registrations.length === 0) continue;
      const registration = student.registrations[0];
      const studentLevel = registration.class?.level;
      const applicableFeesForStudent = allFees.filter(fee => {
        if (fee.is_deleted) return false;
        if (fee.level === null || fee.level.toLowerCase() === 'all') return true;
        if (studentLevel && fee.level.toLowerCase() === studentLevel.toLowerCase()) return true;
        return false;
      });
      const paymentsForStudent = allPayments.filter(p => p.registration_id === registration.id);
      let latePaymentCount = 0;
      for (const fee of applicableFeesForStudent) {
        const totalPaidForFee = paymentsForStudent.filter(p => p.single_fee_id === fee.id).reduce((sum, p) => sum + (p.amount || 0), 0);
        const balance = (fee.amount || 0) - totalPaidForFee;
        if (balance > 0 && fee.due_date) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const dueDateParts = fee.due_date.split('-').map(part => parseInt(part, 10));
          if (dueDateParts.length === 3) {
            const dueDateThisYear = new Date(today.getFullYear(), dueDateParts[1] - 1, dueDateParts[2]);
            dueDateThisYear.setHours(0, 0, 0, 0);
            if (today > dueDateThisYear) {
              latePaymentCount++;
            }
          }
        }
      }
      if (latePaymentCount >= latePaymentThreshold) {
        frequentLatePayers.push({
          id: student.id,
          name: `${student.first_name} ${student.name}`,
          className: student.registrations[0]?.class.name,
          latePaymentCount: latePaymentCount,
        });
      }
    }
    return frequentLatePayers;
  });

  ipcMain.removeHandler('db:financial-reports:getSummary');
  ipcMain.handle('db:financial-reports:getSummary', async (event) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const income = await prisma.financialTransaction.aggregate({ _sum: { amount: true }, where: { type: 'income', is_deleted: false, school_id: schoolId } });
    const expenses = await prisma.financialTransaction.aggregate({ _sum: { amount: true }, where: { type: 'expense', is_deleted: false, school_id: schoolId } });
    const incomeByCategory = await prisma.financialTransaction.groupBy({ by: ['category_id'], _sum: { amount: true }, where: { type: 'income', is_deleted: false, school_id: schoolId } });
    const expenseByCategory = await prisma.financialTransaction.groupBy({ by: ['category_id'], _sum: { amount: true }, where: { type: 'expense', is_deleted: false, school_id: schoolId } });
    const categories = await prisma.financialCategory.findMany({ where: { is_deleted: false, school_id: schoolId } });
    const incomeByCategoryWithName = incomeByCategory.map(item => {
        const category = categories.find(c => c.id === item.category_id);
        return { name: category ? category.name : 'Uncategorized', amount: item._sum.amount };
    });
    const expenseByCategoryWithName = expenseByCategory.map(item => {
        const category = categories.find(c => c.id === item.category_id);
        return { name: category ? category.name : 'Uncategorized', amount: item._sum.amount };
    });
    return {
      totalIncome: income._sum.amount || 0,
      totalExpenses: expenses._sum.amount || 0,
      netProfit: (income._sum.amount || 0) - (expenses._sum.amount || 0),
      incomeByCategory: incomeByCategoryWithName,
      expenseByCategory: expenseByCategoryWithName,
    };
  });
}

module.exports = { setupReportsIPC };