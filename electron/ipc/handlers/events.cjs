const { ipcMain } = require('electron');
const { pushSingleItem } = require('../sync.cjs');
const { isOnline, getUserContext } = require('./helpers.cjs');

function setupEventsIPC(prisma) {
  // Get all events
  ipcMain.handle('db:events:getAll', async (event) => {
    const { schoolId } = await getUserContext(prisma, event);
    return prisma.events.findMany({
      where: { school_id: schoolId, is_deleted: false },
      orderBy: { date: 'desc' },
    });
  });

  // Create a new event
  ipcMain.handle('db:events:create', async (event, eventData) => {
    const { schoolId, userRole, permissions } = await getUserContext(prisma, event);
    const hasAccess = userRole === 'admin' || (permissions?.events && permissions.events === 'read_write');
    if (!hasAccess) throw new Error("Accès non autorisé pour créer un événement.");

    const newEvent = await prisma.events.create({
      data: {
        ...eventData,
        school_id: schoolId,
        needs_sync: true,
        last_modified: new Date(),
      },
    });

    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'events', newEvent.id).catch(err => console.error(`[SYNC-ERROR] Failed to push event ${newEvent.id}:`, err));
      }
    });

    return newEvent;
  });

  // Update an event
  ipcMain.handle('db:events:update', async (event, { id, data }) => {
    const { schoolId, userRole, permissions } = await getUserContext(prisma, event);
    const hasAccess = userRole === 'admin' || (permissions?.events && permissions.events === 'read_write');
    if (!hasAccess) throw new Error("Accès non autorisé pour modifier un événement.");

    const eventToUpdate = await prisma.events.findUnique({ where: { id } });
    if (!eventToUpdate || eventToUpdate.school_id !== schoolId) {
      throw new Error("Accès non autorisé ou événement non trouvé.");
    }

    const updatedEvent = await prisma.events.update({
      where: { id },
      data: { ...data, needs_sync: true, last_modified: new Date() },
    });

    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'events', updatedEvent.id).catch(err => console.error(`[SYNC-ERROR] Failed to push event ${updatedEvent.id}:`, err));
      }
    });

    return updatedEvent;
  });

  // Delete an event
  ipcMain.handle('db:events:delete', async (event, id) => {
    const { schoolId, userRole, permissions } = await getUserContext(prisma, event);
    const hasAccess = userRole === 'admin' || (permissions?.events && permissions.events === 'read_write');
    if (!hasAccess) throw new Error("Accès non autorisé pour supprimer un événement.");

    const eventToDelete = await prisma.events.findUnique({ where: { id } });
    if (!eventToDelete || eventToDelete.school_id !== schoolId) {
      throw new Error("Accès non autorisé ou événement non trouvé.");
    }

    const deletedEvent = await prisma.events.update({
      where: { id },
      data: { is_deleted: true, needs_sync: true, last_modified: new Date() },
    });

    isOnline().then(online => {
      if (online) {
        pushSingleItem(prisma, 'events', deletedEvent.id).catch(err => console.error(`[SYNC-ERROR] Failed to push event ${deletedEvent.id}:`, err));
      }
    });

    return deletedEvent;
  });
}

module.exports = { setupEventsIPC };
