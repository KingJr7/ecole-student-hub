const { ipcMain } = require('electron');
const { pushSingleItem } = require('../sync.cjs');

function setupEmployeeAttendancesIPC(prisma) {
  ipcMain.handle('db:employee-attendances:getForEmployee', async (event, { employeeId, teacherId }) => {
    if (!employeeId && !teacherId) return [];
    return prisma.employeeAttendance.findMany({
      where: {
        ...(employeeId && { employee_id: employeeId }),
        ...(teacherId && { teacher_id: teacherId }),
        is_deleted: false,
      },
      orderBy: {
        check_in: 'desc',
      },
    });
  });

  ipcMain.handle('db:employee-attendances:getTodaysSummary', async (event, { schoolId }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return prisma.employeeAttendance.findMany({
      where: {
        school_id: schoolId,
        is_deleted: false,
        check_in: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        employee: true,
        teacher: true,
      },
      orderBy: {
        check_in: 'asc',
      },
    });
  });

  ipcMain.handle('db:employee-attendances:clockIn', async (event, { employeeId, teacherId, schoolId }) => {
    if (!employeeId && !teacherId) throw new Error('An employee or teacher ID is required to clock in.');
    
    // Check for an existing open entry for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingEntry = await prisma.employeeAttendance.findFirst({
        where: {
            ...(employeeId && { employee_id: employeeId }),
            ...(teacherId && { teacher_id: teacherId }),
            check_out: null,
            is_deleted: false,
            check_in: {
                gte: today,
                lt: tomorrow,
            },
        }
    });

    if (existingEntry) {
        throw new Error('An open time entry for today already exists.');
    }

    const newAttendance = await prisma.employeeAttendance.create({
      data: {
        employee_id: employeeId,
        teacher_id: teacherId,
        school_id: schoolId,
        check_in: new Date(),
        needs_sync: true,
      },
    });

    pushSingleItem(prisma, 'employeeAttendance', newAttendance.id).catch(err => console.error("[SYNC-ERROR] Failed to push single item on clock-in:", err));

    return newAttendance;
  });

  ipcMain.handle('db:employee-attendances:clockOut', async (event, { attendanceId }) => {
    const attendance = await prisma.employeeAttendance.findUnique({ where: { id: attendanceId } });
    if (!attendance) throw new Error('Attendance record not found.');
    if (attendance.check_out) throw new Error('Already clocked out.');

    const updatedAttendance = await prisma.employeeAttendance.update({
      where: { id: attendanceId },
      data: {
        check_out: new Date(),
        needs_sync: true,
        last_modified: new Date(),
      },
    });

    pushSingleItem(prisma, 'employeeAttendance', updatedAttendance.id).catch(err => console.error("[SYNC-ERROR] Failed to push single item on clock-out:", err));

    return updatedAttendance;
  });

  ipcMain.handle('db:employee-attendances:update', async (event, { id, data }) => {
    const updatedAttendance = await prisma.employeeAttendance.update({
      where: { id },
      data: { ...data, needs_sync: true, last_modified: new Date() },
    });
    pushSingleItem(prisma, 'employeeAttendance', updatedAttendance.id).catch(err => console.error("[SYNC-ERROR] Failed to push single item on update:", err));
    return updatedAttendance;
  });

  ipcMain.handle('db:employee-attendances:delete', async (event, id) => {
    const updatedAttendance = await prisma.employeeAttendance.update({
      where: { id },
      data: { is_deleted: true, needs_sync: true, last_modified: new Date() },
    });
    pushSingleItem(prisma, 'employeeAttendance', updatedAttendance.id).catch(err => console.error("[SYNC-ERROR] Failed to push single item on delete:", err));
    return updatedAttendance;
  });
}

module.exports = { setupEmployeeAttendancesIPC };
