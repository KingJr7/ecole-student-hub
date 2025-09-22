const { ipcMain } = require('electron');
const { pushSingleItem } = require('../sync.cjs');
const { isOnline } = require('./helpers.cjs');

function setupSettingsIPC(prisma) {
  ipcMain.handle('db:settings:get', async () => {
    let settings = await prisma.settings.findUnique({ where: { id: 1 } });
    return settings;
  });

  ipcMain.handle('db:settings:update', async (event, data) => {
    const { schoolName, schoolAddress, directorName, directorGender } = data;
    const updatedSettings = await prisma.settings.upsert({
      where: { id: 1 },
      update: { schoolName, schoolAddress, directorName, directorGender },
      create: { schoolName, schoolAddress, directorName, directorGender, loggedIn: 0 },
    });

    isOnline().then(online => {
      if (online) {
        console.log(`[REALTIME] Internet connection detected, pushing item settings #${updatedSettings.id}`);
        pushSingleItem(prisma, 'settings', updatedSettings.id).catch(err => {
          console.error(`[REALTIME-PUSH-FAIL] for settings #${updatedSettings.id}: ${err.message}`);
        });
      }
    });

    return updatedSettings;
  });
}

module.exports = { setupSettingsIPC };
