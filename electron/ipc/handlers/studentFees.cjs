const { ipcMain } = require('electron');

function setupStudentFeeHandlers(prisma) {
  ipcMain.handle('db:student-fees:get-by-registration', async (event, registrationId) => {
    if (!registrationId) return null;
    try {
      return await prisma.studentFee.findMany({
        where: { registration_id: registrationId },
        include: {
          fee_template: true,
          single_fee: true,
        },
      });
    } catch (error) {
      console.error("Erreur lors de la récupération des frais de l'étudiant:", error);
      throw new Error("Erreur lors de la récupération des frais de l'étudiant");
    }
  });

  ipcMain.handle('db:student-fees:create', async (event, data) => {
    try {
      return await prisma.studentFee.create({ data });
    } catch (error) {
      console.error("Erreur lors de la création du frais étudiant:", error);
      throw new Error("Erreur lors de la création du frais étudiant");
    }
  });

  ipcMain.handle('db:student-fees:update', async (event, { id, data }) => {
    try {
      return await prisma.studentFee.update({
        where: { id },
        data,
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour du frais étudiant:", error);
      throw new Error("Erreur lors de la mise à jour du frais étudiant");
    }
  });

  ipcMain.handle('db:student-fees:delete', async (event, id) => {
    try {
      return await prisma.studentFee.delete({ where: { id } });
    } catch (error) {
      console.error("Erreur lors de la suppression du frais étudiant:", error);
      throw new Error("Erreur lors de la suppression du frais étudiant");
    }
  });
}

module.exports = { setupStudentFeeHandlers };
