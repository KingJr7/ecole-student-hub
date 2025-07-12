export const PERMISSIONS = {
  // Students
  CAN_MANAGE_STUDENTS: 'manage_students',
  // Teachers
  CAN_MANAGE_TEACHERS: 'manage_teachers',
  // Classes
  CAN_MANAGE_CLASSES: 'manage_classes',
  // Payments
  CAN_MANAGE_PAYMENTS: 'manage_payments',
  // Grades
  CAN_MANAGE_GRADES: 'manage_grades',
  // Attendance
  CAN_MANAGE_ATTENDANCE: 'manage_attendance',
  // Settings
  CAN_MANAGE_SETTINGS: 'manage_settings',
};

const allPermissions = Object.values(PERMISSIONS);

const rolePermissions = {
  admin: allPermissions,
  employee: [
    PERMISSIONS.CAN_MANAGE_STUDENTS,
    PERMISSIONS.CAN_MANAGE_TEACHERS,
    PERMISSIONS.CAN_MANAGE_CLASSES,
    PERMISSIONS.CAN_MANAGE_PAYMENTS,
    PERMISSIONS.CAN_MANAGE_GRADES,
    PERMISSIONS.CAN_MANAGE_ATTENDANCE,
  ],
  // On pourra ajouter d'autres rôles ici plus tard
  // teacher: [PERMISSIONS.CAN_MANAGE_GRADES, PERMISSIONS.CAN_MANAGE_ATTENDANCE]
};

export const hasPermission = (role, permission) => {
  if (!role || !rolePermissions[role]) {
    return false;
  }
  return rolePermissions[role].includes(permission);
};
