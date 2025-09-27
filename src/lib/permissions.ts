export const PERMISSIONS = {
  // Students
  CAN_MANAGE_STUDENTS: 'students',
  // Teachers
  CAN_MANAGE_TEACHERS: 'teachers',
  // Employees
  CAN_MANAGE_EMPLOYEES: 'employees',
  // Classes
  CAN_MANAGE_CLASSES: 'classes',
  // Payments
  CAN_MANAGE_PAYMENTS: 'payments',
  // Grades
  CAN_MANAGE_GRADES: 'notes',
  // Attendance
  CAN_MANAGE_ATTENDANCE: 'attendances',
  // Schedules
  CAN_MANAGE_SCHEDULES: 'schedules',
  // Settings
  CAN_MANAGE_SETTINGS: 'settings',
};

export const getAccessLevel = (userRole, userPermissions, permission) => {
  if (!userRole || !permission) {
    return 'none';
  }
  if (userRole.toLowerCase() === 'admin') {
    return 'read_write';
  }
  if (userPermissions && typeof userPermissions === 'object') {
    return userPermissions[permission] || 'none';
  }
  return 'none';
};

export const hasPermission = (userRole, userPermissions, permission) => {
  return getAccessLevel(userRole, userPermissions, permission) !== 'none';
};
