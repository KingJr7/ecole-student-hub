const { PrismaClient } = require('../../src/generated/prisma');

// Importer TOUS les gestionnaires
const { setupClassesIPC } = require('./handlers/classes.cjs');
const { setupStudentsIPC } = require('./handlers/students.cjs');
const { setupTeachersIPC } = require('./handlers/teachers.cjs');
const { setupEmployeesIPC } = require('./handlers/employees.cjs');
const { setupParentsIPC } = require('./handlers/parents.cjs');
const { setupRegistrationsIPC } = require('./handlers/registrations.cjs');
const { setupPaymentsIPC } = require('./handlers/payments.cjs');
const { setupSubjectsIPC } = require('./handlers/subjects.cjs');
const { setupLessonsIPC } = require('./handlers/lessons.cjs');
const { setupNotesIPC } = require('./handlers/notes.cjs');
const { setupAttendancesIPC } = require('./handlers/attendances.cjs');
const { setupSchedulesIPC } = require('./handlers/schedules.cjs');
const { setupFinanceIPC } = require('./handlers/finance.cjs');
const { setupReportsIPC } = require('./handlers/reports.cjs');
const { setupSettingsIPC } = require('./handlers/settings.cjs');
const { setupFeesIPC } = require('./handlers/fees.cjs');
const { setupFeeTemplatesIPC } = require('./handlers/fee-templates.cjs');
const { setupStudentParentsIPC } = require('./handlers/studentParents.cjs');
const { setupEventsIPC } = require('./handlers/events.cjs');


let prisma;

function initializePrisma() {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

function setupDatabaseIPC(prismaClient) {
  prisma = prismaClient;

  // Appeler TOUTES les fonctions de configuration
  setupSettingsIPC(prisma);
  setupClassesIPC(prisma);
  setupStudentsIPC(prisma);
  setupTeachersIPC(prisma);
  setupEmployeesIPC(prisma);
  setupParentsIPC(prisma);
  setupRegistrationsIPC(prisma);
  setupPaymentsIPC(prisma);
  setupSubjectsIPC(prisma);
  setupLessonsIPC(prisma);
  setupNotesIPC(prisma);
  setupAttendancesIPC(prisma);
  setupSchedulesIPC(prisma);
  setupFinanceIPC(prisma);
  setupReportsIPC(prisma);
  setupStudentParentsIPC(prisma);
  setupFeesIPC(prisma);
  setupFeeTemplatesIPC(prisma);
  setupEventsIPC(prisma);
  
  console.log("All database IPC handlers have been set up from modular files.");
}

module.exports = { initializePrisma, setupDatabaseIPC };