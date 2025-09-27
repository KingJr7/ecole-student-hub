const dns = require('dns');

function isOnline() {
  return new Promise((resolve) => {
    dns.lookup('google.com', (err) => {
      resolve(err === null);
    });
  });
}

async function getUserContext(prisma, event) {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  return {
    schoolId: settings?.schoolId || null,
    userRole: settings?.userRole || null,
    userSupabaseId: settings?.roleId || null, // roleId contient l'ID supabase de l'utilisateur connecté
    permissions: settings?.permissions || {},
  };
}

// Restore getUserSchoolId for backward compatibility
async function getUserSchoolId(prisma, event) {
  const { schoolId } = await getUserContext(prisma, event).catch(() => ({ schoolId: null }));
  if (!schoolId) {
     const settings = await prisma.settings.findUnique({ where: { id: 1 } });
     const fallbackSchoolId = settings?.schoolId;
     if (!fallbackSchoolId) {
        throw new Error("Utilisateur non authentifié ou ID d'école non trouvé.");
     }
     return fallbackSchoolId;
  }
  return schoolId;
}

async function handlePaymentDispatch(tx, payment, schoolId) {
  const { fee_id, amount, date, registration } = payment;
  const studentName = `${registration.student.first_name} ${registration.student.name}`;
  const feeName = payment.fee?.name || 'Revenu scolaire';
  const description = `Paiement de ${feeName} par ${studentName}`;

  const dispatchRule = await tx.dispatchRule.findUnique({
    where: { source_fee_id: fee_id },
    include: { details: true },
  });

  let totalDispatched = 0;

  if (dispatchRule && dispatchRule.details.length > 0) {
    for (const detail of dispatchRule.details) {
      const dispatchedAmount = Math.floor(amount * detail.percentage);
      if (dispatchedAmount > 0) {
        totalDispatched += dispatchedAmount;
        await tx.financialTransaction.create({
          data: {
            date: new Date(date),
            description: `${description} (Répartition: ${detail.percentage * 100}%)`,
            amount: dispatchedAmount,
            type: 'income',
            category_id: detail.destination_category_id,
            school_id: schoolId,
            needs_sync: true,
            last_modified: new Date(),
          },
        });
      }
    }
  }
  
  const remainder = amount - totalDispatched;
  if (remainder > 0) {
    let incomeCategory = await tx.financialCategory.findFirst({
      where: { name: feeName, type: 'income', school_id: schoolId },
    });

    if (!incomeCategory) {
      incomeCategory = await tx.financialCategory.create({
        data: { name: feeName, type: 'income', school_id: schoolId, needs_sync: true, last_modified: new Date() },
      });
    }

    await tx.financialTransaction.create({
      data: {
        date: new Date(date),
        description: `${description} (Principal)`,
        amount: remainder,
        type: 'income',
        category_id: incomeCategory.id,
        school_id: schoolId,
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  }
}

async function calculateClassResults(prisma, classId, quarter) {
  const studentsInClass = await prisma.registrations.findMany({
    where: {
      class_id: classId,
      is_deleted: false,
    },
    include: {
      student: true,
    },
  });

  if (studentsInClass.length === 0) return [];

  const studentIds = studentsInClass.map(reg => reg.student_id);

  const lessonsInClass = await prisma.lessons.findMany({
    where: {
      class_id: classId,
      is_deleted: false,
    },
    include: {
      subject: true,
    },
  });

  const subjectIds = lessonsInClass.map(l => l.subject_id);
  const subjects = await prisma.subjects.findMany({
    where: { id: { in: subjectIds } },
  });

  const notesWhere = {
    student_id: { in: studentIds },
    is_deleted: false,
    lesson: {
      class_id: classId,
    },
  };
  if (quarter && !isNaN(parseInt(quarter, 10))) {
    notesWhere.quarter = parseInt(quarter, 10);
  }

  const notes = await prisma.notes.findMany({
    where: notesWhere,
    include: {
      lesson: {
        include: {
          subject: true,
        },
      },
    },
  });

  const results = studentsInClass.map(({ student }) => {
    let totalPoints = 0;
    let totalCoef = 0;
    const subjectResults = {};

    subjects.forEach(subject => {
      const subjectNotes = notes.filter(
        n => n.student_id === student.id && n.lesson.subject_id === subject.id
      );

      let avg = null;
      if (subjectNotes.length > 0) {
        const sum = subjectNotes.reduce((acc, note) => acc + (note.value || 0), 0);
        avg = sum / subjectNotes.length;
        totalPoints += avg * (subject.coefficient || 1);
        totalCoef += subject.coefficient || 1;
      }
      subjectResults[subject.name] = { 
        average: avg, 
        coefficient: subject.coefficient || 1, 
        notes: subjectNotes.map(n => ({ type: n.type, value: n.value }))
      };
    });

    const generalAverage = totalCoef > 0 ? totalPoints / totalCoef : 0;
    return {
      studentId: student.id,
      studentName: `${student.first_name} ${student.name}`,
      studentPicture: student.picture_url,
      studentMatricul: student.matricul,
      average: generalAverage,
      rank: 0,
      subjects: subjectResults,
      status: generalAverage >= 10 ? 'Admis' : 'Non admis',
    };
  });

  results.sort((a, b) => b.average - a.average);
  results.forEach((result, index) => {
    result.rank = index + 1;
  });

  return results;
}

const findOrCreateParent = async (tx, parentData) => {
  if (!parentData || (!parentData.id && !parentData.first_name && !parentData.phone)) {
    return null;
  }

  if (parentData.id) {
    return tx.parents.update({
      where: { id: parentData.id },
      data: {
        name: parentData.name,
        first_name: parentData.first_name,
        phone: parentData.phone,
        email: parentData.email,
        adress: parentData.adress,
        gender: parentData.gender,
        profession: parentData.profession,
        needs_sync: true,
        last_modified: new Date(),
      },
    });
  }

  if (parentData.phone) {
    const existingParent = await tx.parents.findFirst({
      where: { phone: parentData.phone, is_deleted: false },
    });
    if (existingParent) {
      return tx.parents.update({
        where: { id: existingParent.id },
        data: {
          name: parentData.name,
          first_name: parentData.first_name,
          email: parentData.email,
          adress: parentData.adress,
          gender: parentData.gender,
          profession: parentData.profession,
          needs_sync: true,
          last_modified: new Date(),
        },
      });
    }
  }

  return tx.parents.create({
    data: {
      name: parentData.name,
      first_name: parentData.first_name,
      phone: parentData.phone,
      email: parentData.email,
      adress: parentData.adress,
      gender: parentData.gender,
      profession: parentData.profession,
      needs_sync: true,
      last_modified: new Date(),
    },
  });
};

module.exports = {
    isOnline,
    getUserSchoolId,
    getUserContext,
    handlePaymentDispatch,
    calculateClassResults,
    findOrCreateParent
};