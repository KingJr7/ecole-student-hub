const { ipcMain } = require('electron');
const fetch = require('node-fetch').default;
const { pushSingleItem } = require('../sync.cjs');
const { isOnline, getUserSchoolId, handlePaymentDispatch } = require('./helpers.cjs');

function setupPaymentsIPC(prisma) {
  ipcMain.removeHandler('db:payments:getAll');
  ipcMain.handle('db:payments:getAll', async (event) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const studentPayments = await prisma.payments.findMany({
      where: { is_deleted: false, registration: { class: { school_id: schoolId } } },
      include: {
        single_fee: true,
        fee_template: true,
        registration: { include: { student: true, class: true } },
      },
    });
    const salaryPayments = await prisma.salaryPayments.findMany({
      where: { is_deleted: false, employee: { school_id: schoolId } },
      include: { employee: true },
    });
    const mappedStudentPayments = studentPayments
      .filter(p => p.registration && p.registration.student)
      .map(p => {
        let details = 'Paiement scolaire';
        if (p.single_fee) {
          details = p.single_fee.name;
        } else if (p.fee_template) {
          details = `${p.fee_template.name} (${p.period_identifier || 'N/A'})`;
        } else if (p.registration?.class?.name) {
          details = `Frais pour la classe de ${p.registration.class.name}`;
        }

        return {
          ...p,
          type: 'Étudiant',
          person_name: `${p.registration.student.first_name} ${p.registration.student.name}`,
          details: details,
          student_name: p.registration.student.name,
          student_first_name: p.registration.student.first_name,
          class_name: p.registration.class.name,
        };
      });
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

  ipcMain.removeHandler('db:payments:getLatePayments');
  ipcMain.handle('db:payments:getLatePayments', async (event) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const settings = await prisma.settings.findUnique({ where: { id: 1 } });

    // 1. Fetch all necessary data in parallel
    const [allStudents, allSingleFees, allFeeTemplates, allPayments] = await Promise.all([
      prisma.students.findMany({
        where: { is_deleted: false, registrations: { some: { is_deleted: false, class: { school_id: schoolId } } } },
        include: { registrations: { where: { is_deleted: false }, orderBy: { id: 'desc' }, take: 1, include: { class: true } } },
      }),
      prisma.singleFee.findMany({ where: { is_deleted: false, school_id: schoolId } }),
      prisma.feeTemplate.findMany({ where: { school_id: schoolId } }),
      prisma.payments.findMany({ where: { is_deleted: false, registration: { class: { school_id: schoolId } } } })
    ]);

    const paymentsByRegId = allPayments.reduce((acc, p) => {
      if (!p.registration_id) return acc;
      if (!acc[p.registration_id]) {
        acc[p.registration_id] = [];
      }
      acc[p.registration_id].push(p);
      return acc;
    }, {});

    const latePayments = [];

    const getWeekNumber = (d) => {
      d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
      var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
      var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
      return weekNo;
    }

    for (const student of allStudents) {
      if (!student.registrations || student.registrations.length === 0) continue;
      
      const registration = student.registrations[0];
      const studentLevel = registration.class?.level;
      const studentClassId = registration.class?.id;
      const paymentsForStudent = paymentsByRegId[registration.id] || [];

      // 2. Process Single Fees
      const applicableSingleFees = allSingleFees.filter(fee => 
        !fee.is_deleted && (
          fee.level === null || 
          fee.level.toLowerCase() === 'all' || 
          (studentLevel && fee.level.toLowerCase() === studentLevel.toLowerCase()) ||
          (studentClassId && fee.class_id === studentClassId)
        )
      );

      for (const fee of applicableSingleFees) {
        const totalPaidForFee = paymentsForStudent
          .filter(p => p.single_fee_id === fee.id)
          .reduce((sum, p) => sum + (p.amount || 0), 0);
        const balance = (fee.amount || 0) - totalPaidForFee;
        const dueDate = new Date(fee.due_date);
        dueDate.setHours(0,0,0,0);

        if (balance > 0 && today > dueDate) {
          latePayments.push({ 
            studentId: student.id, 
            studentName: `${student.first_name} ${student.name}`, 
            className: registration.class?.name || 'N/A', 
            feeName: fee.name, 
            feeAmount: fee.amount, 
            dueDate: fee.due_date, 
            balance: balance 
          });
        }
      }

      // 3. Process Fee Templates
      const applicableTemplates = allFeeTemplates.filter(template => 
        template.applies_to_level === 'all' ||
        template.applies_to_level === null ||
        (studentLevel && template.applies_to_level === studentLevel) ||
        (studentClassId && template.applies_to_class_id === studentClassId)
      );

      const monthMap = { "sept": 8, "oct": 9, "nov": 10, "dec": 11, "jan": 0, "fev": 1, "mar": 2, "avr": 3, "mai": 4, "juin": 5, "juil": 6, "aout": 7 };
      const currentYear = today.getFullYear();
      const schoolYearStartMonth = 8; // September

      for (const template of applicableTemplates) {
        if (template.frequency === 'monthly' && template.applicable_months) {
          for (const monthName of template.applicable_months) {
            const monthIndex = monthMap[monthName];
            if (monthIndex === undefined) continue;

            let dueYear = (today.getMonth() + 1) >= schoolYearStartMonth ? currentYear : currentYear - 1;
            if (monthIndex < schoolYearStartMonth) {
               dueYear = dueYear + 1;
            }
            const dueDate = new Date(dueYear, monthIndex, template.due_day || 1);
            dueDate.setHours(0,0,0,0);

            if (today > dueDate) {
              const periodId = `${monthName}-${dueYear}`;
              const totalPaidForPeriod = paymentsForStudent
                .filter(p => p.fee_template_id === template.id && p.period_identifier === periodId)
                .reduce((sum, p) => sum + (p.amount || 0), 0);
              
              const balance = (template.amount || 0) - totalPaidForPeriod;

              if (balance > 0) {
                latePayments.push({
                  studentId: student.id,
                  studentName: `${student.first_name} ${student.name}`,
                  className: registration.class?.name || 'N/A',
                  feeName: `${template.name} (${monthName})`,
                  feeAmount: template.amount,
                  dueDate: dueDate.toISOString().split('T')[0],
                  balance: balance,
                });
              }
            }
          }
        } else if (template.frequency === 'weekly') {
          const schoolYear = settings?.activeSchoolYear;
          if (!schoolYear || !template.due_day) continue;

          const startYear = parseInt(schoolYear.split('-')[0], 10);
          const schoolYearStartDate = settings.schoolYearStartDate ? new Date(settings.schoolYearStartDate) : new Date(startYear, 8, 1);

          let currentDate = new Date(schoolYearStartDate);
          while (currentDate <= today) {
            let weekDueDate = new Date(currentDate);
            const dayOfWeek = currentDate.getDay() === 0 ? 7 : currentDate.getDay();
            const dueDay = template.due_day;
            weekDueDate.setDate(weekDueDate.getDate() - dayOfWeek + dueDay);

            if (today > weekDueDate) {
              const week = getWeekNumber(weekDueDate);
              const year = weekDueDate.getFullYear();
              const periodId = `W${week}-${year}`;

              const totalPaidForPeriod = paymentsForStudent
                .filter(p => p.fee_template_id === template.id && p.period_identifier === periodId)
                .reduce((sum, p) => sum + (p.amount || 0), 0);

              const balance = (template.amount || 0) - totalPaidForPeriod;

              if (balance > 0) {
                let weekStartDate = new Date(weekDueDate);
                weekStartDate.setDate(weekDueDate.getDate() - dueDay + 1);
                let weekEndDate = new Date(weekStartDate);
                weekEndDate.setDate(weekStartDate.getDate() + 6);
                const name = `${template.name} (Du ${weekStartDate.toLocaleDateString('fr-FR', {day: '2-digit', month: 'short'})} au ${weekEndDate.toLocaleDateString('fr-FR', {day: '2-digit', month: 'short'})})`;

                latePayments.push({
                  studentId: student.id,
                  studentName: `${student.first_name} ${student.name}`,
                  className: registration.class?.name || 'N/A',
                  feeName: name,
                  feeAmount: template.amount,
                  dueDate: weekDueDate.toISOString().split('T')[0],
                  balance: balance,
                });
              }
            }
            currentDate.setDate(currentDate.getDate() + 7);
          }
        }
      }
    }
    
    return latePayments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  });

  ipcMain.removeHandler('db:payments:create');
  ipcMain.handle('db:payments:create', async (event, { registration_id, single_fee_id, fee_template_id, amount, date, method, reference, period_identifier }) => {
    const schoolId = await getUserSchoolId(prisma, event);
    const registration = await prisma.registrations.findUnique({ where: { id: registration_id }, include: { class: true } });
    if (!registration || registration.class.school_id !== schoolId) {
      throw new Error("Accès non autorisé: l'inscription spécifiée n'appartient pas à votre école.");
    }
    const newPayment = await prisma.$transaction(async (tx) => {
      const payment = await tx.payments.create({
        data: { registration_id, single_fee_id, fee_template_id, amount, date, method, reference, period_identifier, needs_sync: true, last_modified: new Date() },
        include: { single_fee: true, fee_template: true, registration: { include: { student: true, class: true } } },
      });
      // await handlePaymentDispatch(tx, payment, schoolId); // This helper might need update too
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

  ipcMain.removeHandler('db:payments:update');
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

  ipcMain.removeHandler('db:payments:delete');
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