const { ipcMain } = require('electron');
const fetch = require('node-fetch').default;
const { pushSingleItem } = require('../sync.cjs');
const { isOnline, getUserSchoolId, handlePaymentDispatch } = require('./helpers.cjs');

function setupPaymentsIPC(prisma) {
  ipcMain.handle('db:payments:getAll', async (event) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const studentPayments = await prisma.payments.findMany({
      where: { is_deleted: false, registration: { class: { school_id: schoolId } } },
      include: {
        fee: true,
        registration: { include: { student: true, class: true } },
      },
    });
    const salaryPayments = await prisma.salaryPayments.findMany({
      where: { is_deleted: false, employee: { school_id: schoolId } },
      include: { employee: true },
    });
    const mappedStudentPayments = studentPayments
      .filter(p => p.registration && p.registration.student)
      .map(p => ({
        ...p,
        type: 'Étudiant',
        person_name: `${p.registration.student.first_name} ${p.registration.student.name}`,
        details: p.fee?.name || p.registration.class.name,
        student_name: p.registration.student.name,
        student_first_name: p.registration.student.first_name,
        class_name: p.registration.class.name,
      }));
    const mappedSalaryPayments = salaryPayments
      .filter(p => p.employee)
      .map(p => ({
        id: p.id,
        type: 'Salaire',
        person_name: `${p.employee.first_name} ${p.employee.name}`,
        details: p.employee.job_title,
        date: p.payment_date,
        amount: p.total_amount,
        method: 'N/A',
        registration_id: null,
      }));
    const allPayments = [...mappedStudentPayments, ...mappedSalaryPayments];
    allPayments.sort((a, b) => new Date(b.date) - new Date(a.date));
    return allPayments;
  });

  ipcMain.handle('db:payments:getLatePayments', async (event) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const allStudents = await prisma.students.findMany({
      where: { is_deleted: false, registrations: { some: { is_deleted: false, class: { school_id: schoolId } } } },
      include: { registrations: { where: { is_deleted: false }, orderBy: { id: 'desc' }, take: 1, include: { class: true } } },
    });
    const allFees = await prisma.fees.findMany({ where: { is_deleted: false, school_id: schoolId } });
    const allPayments = await prisma.payments.findMany({ where: { is_deleted: false, registration: { class: { school_id: schoolId } } } });
    const latePayments = [];
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
      for (const fee of applicableFeesForStudent) {
        const totalPaidForFee = paymentsForStudent.filter(p => p.fee_id === fee.id).reduce((sum, p) => sum + (p.amount || 0), 0);
        const balance = (fee.amount || 0) - totalPaidForFee;
        if (balance > 0 && fee.due_date) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const dueDateParts = fee.due_date.split('-').map(part => parseInt(part, 10));
          if (dueDateParts.length === 3) {
            const dueDateThisYear = new Date(today.getFullYear(), dueDateParts[1] - 1, dueDateParts[2]);
            dueDateThisYear.setHours(0, 0, 0, 0);
            if (today > dueDateThisYear) {
              latePayments.push({ studentId: student.id, studentName: `${student.first_name} ${student.name}`, className: registration.class?.name || 'N/A', feeName: fee.name, feeAmount: fee.amount, dueDate: fee.due_date, balance: balance });
            }
          }
        }
      }
    }
    return latePayments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  });

  ipcMain.handle('db:payments:create', async (event, { registration_id, fee_id, amount, date, method, reference }) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const registration = await prisma.registrations.findUnique({ where: { id: registration_id }, include: { class: true } });
    if (!registration || registration.class.school_id !== schoolId) {
      throw new Error("Accès non autorisé: l'inscription spécifiée n'appartient pas à votre école.");
    }
    const newPayment = await prisma.$transaction(async (tx) => {
      const payment = await tx.payments.create({
        data: { registration_id, fee_id, amount, date, method, reference, needs_sync: true, last_modified: new Date() },
        include: { fee: true, registration: { include: { student: true, class: true } } },
      });
      await handlePaymentDispatch(tx, payment, schoolId);
      return payment;
    });
    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'payments', newPayment.id)
          .then(() => {
            // After successful push to Supabase, send webhook
            const webhookUrl = "https://ntik-server.onrender.com/api/payments/webhook";
            const payload = {
              school_id: schoolId,
              amount: newPayment.amount,
              student_name: `${newPayment.registration.student.first_name} ${newPayment.registration.student.name}`,
              class_name: newPayment.registration.class.name
            };

            fetch(webhookUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload),
            })
            .then(response => {
              if (!response.ok) {
                console.error(`Webhook failed with status: ${response.status}`);
              }
              return response.json();
            })
            .then(data => console.log('Webhook success:', data))
            .catch(error => console.error('Error sending webhook:', error));
          })
          .catch(err => console.error(err));
      }
    });
    return newPayment;
  });

  ipcMain.handle('db:payments:update', async (event, { id, data }) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const paymentToUpdate = await prisma.payments.findUnique({ where: { id }, include: { registration: { include: { class: true } } } });
    if (!paymentToUpdate || !paymentToUpdate.registration || paymentToUpdate.registration.class.school_id !== schoolId) {
      throw new Error("Accès non autorisé ou paiement non trouvé.");
    }
    const { registration_id, amount, date, method, reference } = data;
    if (registration_id && registration_id !== paymentToUpdate.registration_id) {
      const newRegistration = await prisma.registrations.findUnique({ where: { id: registration_id }, include: { class: true } });
      if (!newRegistration || newRegistration.class.school_id !== schoolId) {
        throw new Error("Accès non autorisé: la nouvelle inscription n'appartient pas à votre école.");
      }
    }
    const updatedPayment = await prisma.payments.update({
      where: { id },
      data: { registration_id, amount, date, method, reference, needs_sync: true, last_modified: new Date() },
    });
    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'payments', updatedPayment.id).catch(err => console.error(err));
      }
    });
    return updatedPayment;
  });

  ipcMain.handle('db:payments:delete', async (event, id) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const paymentToDelete = await prisma.payments.findUnique({ where: { id }, include: { registration: { include: { class: true } } } });
    if (!paymentToDelete || !paymentToDelete.registration || paymentToDelete.registration.class.school_id !== schoolId) {
      throw new Error("Accès non autorisé ou paiement non trouvé.");
    }
    const deletedPayment = await prisma.payments.update({
      where: { id },
      data: { is_deleted: true, needs_sync: true, last_modified: new Date() },
    });
    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'payments', deletedPayment.id).catch(err => console.error(err));
      }
    });
    return deletedPayment;
  });
}

module.exports = { setupPaymentsIPC };
