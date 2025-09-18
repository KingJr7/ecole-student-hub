const { ipcMain } = require('electron');
const { pushSingleItem } = require('../sync.cjs');
const { isOnline, getUserSchoolId, findOrCreateParent } = require('./helpers.cjs');

function setupStudentsIPC(prisma) {
  ipcMain.handle('db:students:getAll', async (event, args) => {
    const schoolYear = args?.schoolYear;
    const registrationWhere = { is_deleted: false };
    if (schoolYear) {
      registrationWhere.school_year = schoolYear;
    }

    const students = await prisma.students.findMany({
      where: { is_deleted: false },
      include: {
        registrations: {
          where: registrationWhere,
          orderBy: { id: 'desc' },
          take: 1,
          include: {
            class: true,
          },
        },
        student_parents: {
          where: { is_deleted: false },
          include: {
            parent: true,
          },
        },
      },
      orderBy: [{ name: 'asc' }, { first_name: 'asc' }],
    });

    return students.map(s => {
      const father = s.student_parents.find(sp => sp.relation === 'père')?.parent;
      const mother = s.student_parents.find(sp => sp.relation === 'mère')?.parent;
      
      return {
        ...s,
        className: s.registrations[0]?.class.name,
        classId: s.registrations[0]?.class_id,
        classLevel: s.registrations[0]?.class.level,
        parentInfo: { father, mother },
      };
    });
  });

  ipcMain.handle('db:students:create', async (event, { studentData, parentsData }) => {
    const newStudentWithDetails = await prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear().toString().slice(-2);
      const prefix = `STU-${year}-`;

      const lastStudent = await tx.students.findFirst({
        where: { matricul: { startsWith: prefix } },
        orderBy: { matricul: 'desc' },
      });

      let nextIdNumber = 1;
      if (lastStudent) {
        const lastId = parseInt(lastStudent.matricul.replace(prefix, ''), 10);
        nextIdNumber = lastId + 1;
      }

      const nextId = nextIdNumber.toString().padStart(4, '0');
      const matricule = `${prefix}${nextId}`;

      const newStudent = await tx.students.create({
        data: {
          ...studentData,
          matricul: matricule,
          needs_sync: true,
          last_modified: new Date(),
        },
      });

      if (parentsData) {
        const { father, mother } = parentsData;
        if (father) father.gender = 'Masculin';
        if (mother) mother.gender = 'Féminin';

        const fatherRecord = await findOrCreateParent(tx, father);
        const motherRecord = await findOrCreateParent(tx, mother);

        if (fatherRecord) {
          await tx.studentParents.upsert({
            where: { student_id_parent_id_unique: { student_id: newStudent.id, parent_id: fatherRecord.id } },
            update: { is_deleted: false, relation: 'père', needs_sync: true, last_modified: new Date() },
            create: { student_id: newStudent.id, parent_id: fatherRecord.id, relation: 'père', needs_sync: true, last_modified: new Date() },
          });
        }
        if (motherRecord) {
          await tx.studentParents.upsert({
            where: { student_id_parent_id_unique: { student_id: newStudent.id, parent_id: motherRecord.id } },
            update: { is_deleted: false, relation: 'mère', needs_sync: true, last_modified: new Date() },
            create: { student_id: newStudent.id, parent_id: motherRecord.id, relation: 'mère', needs_sync: true, last_modified: new Date() },
          });
        }
      }
      
      const fullNewStudent = await tx.students.findUnique({
        where: { id: newStudent.id },
        include: {
          registrations: { where: { is_deleted: false }, orderBy: { id: 'desc' }, take: 1, include: { class: true } },
          student_parents: { where: { is_deleted: false }, include: { parent: true } },
        },
      });

      const father = fullNewStudent.student_parents.find(sp => sp.relation === 'père')?.parent;
      const mother = fullNewStudent.student_parents.find(sp => sp.relation === 'mère')?.parent;

      return {
        ...fullNewStudent,
        className: fullNewStudent.registrations[0]?.class.name,
        classLevel: fullNewStudent.registrations[0]?.class.level,
        parentInfo: { father, mother },
      };
    });

    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'students', newStudentWithDetails.id).catch(err => console.error(err));
      }
    });

    return newStudentWithDetails;
  });

  ipcMain.handle('db:students:update', async (event, { id, studentData, parentsData }) => {
    const result = await prisma.$transaction(async (tx) => {
      await tx.students.update({
        where: { id },
        data: {
          ...studentData,
          needs_sync: true,
          last_modified: new Date(),
        },
      });

      if (parentsData) {
        const { father, mother } = parentsData;
        if (father) father.gender = 'Masculin';
        if (mother) mother.gender = 'Féminin';

        const fatherRecord = await findOrCreateParent(tx, father);
        const motherRecord = await findOrCreateParent(tx, mother);

        await tx.studentParents.updateMany({
          where: { student_id: id },
          data: { is_deleted: true, needs_sync: true, last_modified: new Date() },
        });

        if (fatherRecord) {
          await tx.studentParents.upsert({
            where: { student_id_parent_id_unique: { student_id: id, parent_id: fatherRecord.id } },
            update: { is_deleted: false, relation: 'père', needs_sync: true, last_modified: new Date() },
            create: { student_id: id, parent_id: fatherRecord.id, relation: 'père', needs_sync: true, last_modified: new Date() },
          });
        }
        if (motherRecord) {
          await tx.studentParents.upsert({
            where: { student_id_parent_id_unique: { student_id: id, parent_id: motherRecord.id } },
            update: { is_deleted: false, relation: 'mère', needs_sync: true, last_modified: new Date() },
            create: { student_id: id, parent_id: motherRecord.id, relation: 'mère', needs_sync: true, last_modified: new Date() },
          });
        }
      }
      return { id };
    });

    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'students', id).catch(err => console.error(err));
      }
    });

    return result;
  });

  ipcMain.handle('db:students:delete', async (event, id) => {
    const result = await prisma.$transaction(async (tx) => {
      await tx.students.update({
        where: { id },
        data: { 
          is_deleted: true, 
          needs_sync: true,
          last_modified: new Date(),
        },
      });
      await tx.registrations.updateMany({
        where: { student_id: id },
        data: { 
          is_deleted: true, 
          needs_sync: true,
          last_modified: new Date(),
        },
      });
      return { id };
    });

    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'students', id).catch(err => console.error(err));
      }
    });

    return result;
  });

  ipcMain.handle('db:students:getRecent', async () => {
    return prisma.students.findMany({
      where: { is_deleted: false },
      orderBy: { id: 'desc' },
      take: 5,
      include: {
        registrations: {
          where: { is_deleted: false },
          orderBy: { id: 'desc' },
          take: 1,
          include: {
            class: true,
          },
        },
      },
    }).then(students => 
      students.map(s => ({
        ...s,
        className: s.registrations[0]?.class.name,
        registration_date: s.registrations[0]?.registration_date,
      }))
    );
  });
}

module.exports = { setupStudentsIPC };
