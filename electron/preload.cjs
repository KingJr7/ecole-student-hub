const { contextBridge, ipcRenderer } = require('electron');

// Liste blanche complète des canaux de communication
const validInvokeChannels = [
  // Auth
  'auth:login-local', 'auth:logout', 'auth:getStatus',
  // Sync
  'sync:run',
  // Images
  'images:process-student-photo',
  // Debug
  'debug:get-web-contents-methods',
  // Database
  'db:settings:get', 'db:settings:update',
  'db:classes:getAll', 'db:classes:create', 'db:classes:update', 'db:classes:delete',
  'db:students:getAll', 'db:students:create', 'db:students:update', 'db:students:delete', 'db:students:getRecent', 'db:students:search',
  'db:teachers:getAll', 'db:teachers:getById', 'db:teachers:create', 'db:teachers:update', 'db:teachers:delete', 'db:teachers:getSubjects', 'db:teachers:calculateSalary',
  'db:parents:getAll', 'db:parents:create', 'db:parents:update', 'db:parents:delete', 'db:parents:findByPhone',
  'db:employees:getAll', 'db:employees:create', 'db:employees:update', 'db:employees:delete', 'db:employees:paySalary', 'db:employees:getSalaryHistory', 'db:employees:getStats',
  'db:subjects:getAll', 'db:subjects:create', 'db:subjects:update', 'db:subjects:delete', 'db:classSubjects:getAll', 'db:subjects:getByTeacherId', 'db:subjects:getAllDetailed',
  'db:lessons:getAll', 'db:lessons:create', 'db:lessons:update', 'db:lessons:delete',
  'db:registrations:getAll', 'db:registrations:create', 'db:registrations:update', 'db:registrations:delete', 'db:registrations:getLatestForStudent',
  'db:notes:getAll', 'db:notes:create', 'db:notes:update', 'db:notes:delete', 'db:notes:get-for-student',
  'db:payments:getAll', 'db:payments:getLatePayments', 'db:payments:create', 'db:payments:update', 'db:payments:delete', 'db:payments:get-for-registration',
  'db:fees:getAll', 'db:fees:create', 'db:fees:update', 'db:fees:delete', 'db:fees:getStudentFeeStatus',
  'db:schedules:getAll', 'db:schedules:create', 'db:schedules:update', 'db:schedules:delete', 'db:schedules:getForClass',
  'db:attendances:getAll', 'db:attendances:create', 'db:attendances:update', 'db:attendances:delete', 'db:attendances:getByStudentId',
  'db:teacher-work-hours:get', 'db:teacher-work-hours:create', 'db:teacher-work-hours:update', 'db:teacher-work-hours:delete', 'db:teacher-work-hours:getStats', 'db:teacherWorkHours:getByTeacherId', 'db:teacherWorkHours:create', 'db:teacherWorkHours:update', 'db:teacherWorkHours:delete', 'db:teacherWorkHours:getStats',
  'db:salary-payments:get', 'db:salary-payments:create', 'db:salary-payments:update', 'db:salary-payments:delete',
  'db:studentParents:getByStudent', 'db:studentParents:link', 'db:studentParents:unlink',
  'db:financial-categories:getAll', 'db:financial-categories:create', 'db:financial-categories:update', 'db:financial-categories:delete',
  'db:financial-transactions:getAll', 'db:financial-transactions:create', 'db:financial-transactions:update', 'db:financial-transactions:delete', 'db:financial-transactions:get-paged',
  'db:budgets:get', 'db:budgets:create', 'db:budgets:update', 'db:budgets:delete',
  'db:financial-reports:get', 'db:financial-reports:create', 'db:financial-reports:update', 'db:financial-reports:delete', 'db:financial-reports:getSummary',
  'db:dispatch-rules:getAll', 'db:dispatch-rules:create', 'db:dispatch-rules:update', 'db:dispatch-rules:delete',
  'db:dashboard:getStats', 'db:reports:getClassResults', 'db:reports:getAllClassesPerformance', 'db:reports:getClassTrend', 'db:reports:getFrequentLatePayers',
  'printers:get-list', 'printers:print-receipt'
];

const validOnChannels = [
  'sync-status-update', 'sync-log', 'sync:run:trigger', 'sync:auto:start'
];

contextBridge.exposeInMainWorld('api', {
  invoke: (channel, ...args) => {
    if (validInvokeChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    throw new Error(`Invalid IPC channel (invoke): ${channel}`);
  },
  on: (channel, listener) => {
    if (validOnChannels.includes(channel)) {
      const wrappedListener = (event, ...args) => listener(...args);
      ipcRenderer.on(channel, wrappedListener);
      return () => {
        ipcRenderer.removeListener(channel, wrappedListener);
      };
    }
    throw new Error(`Invalid IPC channel (on): ${channel}`);
  },
  removeAllListeners: (channel) => {
    if (validOnChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  }
});