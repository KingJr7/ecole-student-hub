const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Communication sécurisée du Renderer vers le Main (invocation)
  invoke: (channel, ...args) => {
    const validChannels = [
      'db:sync-status', 'db:sync-force', 'db:sync-run', 'db:sync-reset',
      'db:settings:get', 'db:settings:update',
      'db:auth:login', 'db:auth:logout', 'db:auth:check',
      'db:classes:get', 'db:classes:get-by-id', 'db:classes:create', 'db:classes:update', 'db:classes:delete',
      'db:students:get', 'db:students:get-by-id', 'db:students:create', 'db:students:update', 'db:students:delete', 'db:students:search',
      'db:teachers:get', 'db:teachers:create', 'db:teachers:update', 'db:teachers:delete',
      'db:parents:get', 'db:parents:create', 'db:parents:update', 'db:parents:delete',
      'db:employees:get', 'db:employees:create', 'db:employees:update', 'db:employees:delete',
      'db:subjects:get', 'db:subjects:create', 'db:subjects:update', 'db:subjects:delete',
      'db:lessons:get', 'db:lessons:create', 'db:lessons:update', 'db:lessons:delete',
      'db:registrations:get', 'db:registrations:create', 'db:registrations:update', 'db:registrations:delete', 'db:registrations:get-by-student-and-year',
      'db:notes:get', 'db:notes:create', 'db:notes:update', 'db:notes:delete', 'db:notes:get-for-student',
      'db:payments:get', 'db:payments:create', 'db:payments:update', 'db:payments:delete', 'db:payments:get-for-registration',
      'db:fees:get', 'db:fees:create', 'db:fees:update', 'db:fees:delete',
      'db:schedules:get', 'db:schedules:create', 'db:schedules:update', 'db:schedules:delete',
      'db:attendances:get', 'db:attendances:create', 'db:attendances:update', 'db:attendances:delete',
      'db:teacher-work-hours:get', 'db:teacher-work-hours:create', 'db:teacher-work-hours:update', 'db:teacher-work-hours:delete',
      'db:salary-payments:get', 'db:salary-payments:create', 'db:salary-payments:update', 'db:salary-payments:delete',
      'db:student-parents:get', 'db:student-parents:create', 'db:student-parents:delete',
      'db:financial-categories:get', 'db:financial-categories:create', 'db:financial-categories:update', 'db:financial-categories:delete',
      'db:financial-transactions:get', 'db:financial-transactions:create', 'db:financial-transactions:update', 'db:financial-transactions:delete', 'db:financial-transactions:get-paged',
      'db:budgets:get', 'db:budgets:create', 'db:budgets:update', 'db:budgets:delete',
      'db:financial-reports:get', 'db:financial-reports:create', 'db:financial-reports:update', 'db:financial-reports:delete',
      'images:process-student-photo'
    ];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    throw new Error(`Invalid IPC channel: ${channel}`);
  },

  // Communication sécurisée du Main vers le Renderer (écoute d'événements)
  on: (channel, listener) => {
    const validChannels = ['sync-status-update', 'sync-log'];
    if (validChannels.includes(channel)) {
      // Enveloppe le listener pour la sécurité
      const wrappedListener = (event, ...args) => listener(...args);
      ipcRenderer.on(channel, wrappedListener);
      // Retourne une fonction pour se désabonner
      return () => {
        ipcRenderer.removeListener(channel, wrappedListener);
      };
    }
    throw new Error(`Invalid IPC channel: ${channel}`);
  },

  // Nettoyage de tous les listeners pour un canal donné
  removeAllListeners: (channel) => {
    const validChannels = ['sync-status-update', 'sync-log'];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  }
});
