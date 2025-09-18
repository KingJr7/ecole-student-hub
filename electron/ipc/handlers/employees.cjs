const { ipcMain } = require('electron');
const { pushSingleItem } = require('../sync.cjs');
const { isOnline, getUserSchoolId } = require('./helpers.cjs');

function setupEmployeesIPC(prisma) {
  ipcMain.handle('db:employees:getAll', async () => {
    return prisma.employees.findMany({ where: { is_deleted: false } });
  });

  ipcMain.handle('db:employees:create', async (event, employeeData) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const { name, first_name, phone, email, adress, gender, job_title, salary, password } = employeeData;
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    const schoolName = settings?.schoolName || 'SCHOOL';
    const initials = schoolName.substring(0, 3).toUpperCase();
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const matricule = `EMP-${initials}-${randomDigits}`;
    let password_hash = password ? bcrypt.hashSync(password, 10) : null;

    const newEmployee = await prisma.employees.create({
      data: {
        name, first_name, phone, email, adress, gender, job_title, salary, matricule, password_hash,
        school_id: schoolId,
        needs_sync: true,
        last_modified: new Date(),
      },
    });

    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'employees', newEmployee.id).catch(err => console.error(err));
      }
    });

    return newEmployee;
  });

  ipcMain.handle('db:employees:update', async (event, { id, data }) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const employeeToUpdate = await prisma.employees.findUnique({ where: { id } });

    if (!employeeToUpdate || employeeToUpdate.school_id !== schoolId) {
      throw new Error("Accès non autorisé ou employé non trouvé.");
    }

    const { name, first_name, phone, email, adress, gender, job_title, salary, matricule } = data;
    const updatedEmployee = await prisma.employees.update({
      where: { id },
      data: { name, first_name, phone, email, adress, gender, job_title, salary, matricule, needs_sync: true, last_modified: new Date() },
    });

    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'employees', updatedEmployee.id).catch(err => console.error(err));
      }
    });

    return updatedEmployee;
  });

  ipcMain.handle('db:employees:delete', async (event, id) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const employeeToDelete = await prisma.employees.findUnique({ where: { id } });

    if (!employeeToDelete || employeeToDelete.school_id !== schoolId) {
      throw new Error("Accès non autorisé ou employé non trouvé.");
    }

    const deletedEmployee = await prisma.employees.update({
      where: { id },
      data: { is_deleted: true, needs_sync: true, last_modified: new Date() },
    });

    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'employees', deletedEmployee.id).catch(err => console.error(err));
      }
    });

    return deletedEmployee;
  });

  ipcMain.handle('db:employees:getSalaryHistory', async (event, employeeId) => {
    const schoolId = await getUserSchoolId(prisma, event);
    if (!employeeId) return [];
    const employee = await prisma.employees.findUnique({ where: { id: employeeId } });
    if (!employee || employee.school_id !== schoolId) {
      throw new Error("Accès non autorisé ou employé non trouvé.");
    }
    return prisma.salaryPayments.findMany({
      where: { employee_id: employeeId, is_deleted: false },
      orderBy: { payment_date: 'desc' },
    });
  });

  ipcMain.handle('db:employees:getStats', async () => {
    const totalEmployees = await prisma.employees.count({ where: { is_deleted: false } });
    const payrollData = await prisma.employees.aggregate({
      where: { is_deleted: false },
      _sum: { salary: true },
    });
    return {
      totalEmployees,
      monthlyPayroll: payrollData._sum.salary || 0,
    };
  });

  ipcMain.handle('db:employees:paySalary', async (event, { employee_id, base_salary, bonus_amount, payment_date, notes }) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const employee = await prisma.employees.findUnique({ where: { id: employee_id } });
    if (!employee || employee.school_id !== schoolId) throw new Error("Accès non autorisé");

    const total_amount = base_salary + bonus_amount;

    const newSalaryPayment = await prisma.$transaction(async (tx) => {
      const salaryPayment = await tx.salaryPayments.create({
        data: { employee_id, base_salary, bonus_amount, total_amount, payment_date, notes, needs_sync: true, last_modified: new Date() },
        include: { employee: true },
      });

      let salaryCategory = await tx.financialCategory.findFirst({ where: { name: 'Salaires', type: 'expense', school_id: schoolId } });
      if (!salaryCategory) {
        salaryCategory = await tx.financialCategory.create({ data: { name: 'Salaires', type: 'expense', school_id: schoolId, needs_sync: true, last_modified: new Date() } });
      }

      await tx.financialTransaction.create({
        data: {
          date: new Date(payment_date),
          description: `Paiement de salaire: ${salaryPayment.employee.first_name} ${salaryPayment.employee.name}`,
          amount: total_amount,
          type: 'expense',
          category_id: salaryCategory.id,
          school_id: schoolId,
          needs_sync: true,
          last_modified: new Date(),
        },
      });

      return salaryPayment;
    });

    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'salaryPayments', newSalaryPayment.id).catch(err => console.error(err));
      }
    });

    return newSalaryPayment;
  });
}

module.exports = { setupEmployeesIPC };
