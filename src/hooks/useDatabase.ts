import { useCallback, useMemo } from 'react';

const invoke = <T,>(channel: string, ...args: any[]): Promise<T> => {
  try {
    // @ts-ignore
    return window.api.invoke(channel, ...args);
  } catch (error) {
    console.error(`Erreur IPC sur le canal ${channel}:`, error);
    throw error;
  }
};

export function useDatabase() {
  // #region Settings
  const getSettings = useCallback(() => invoke('db:settings:get'), []);
  const updateSettings = useCallback((data: any) => invoke('db:settings:update', data), []);
  const setSchoolLogo = useCallback(() => invoke('settings:set-school-logo'), []);
  const getSchoolLogoBase64 = useCallback(() => invoke('settings:get-school-logo-base64'), []);
  // #endregion

  // #region Classes
  const getAllClasses = useCallback(() => invoke('db:classes:getAll'), []);
  const createClass = useCallback((data: any) => invoke('db:classes:create', data), []);
  const updateClass = useCallback((id: number, data: any) => invoke('db:classes:update', { id, data }), []);
  const deleteClass = useCallback((id: number) => invoke('db:classes:delete', id), []);
  // #endregion

  // #region Students
  const getAllStudents = useCallback((args?: any) => invoke('db:students:getAll', args), []);
  const createStudent = useCallback((studentData: any, parentsData: any) => invoke('db:students:create', { studentData, parentsData }), []);
  const updateStudent = useCallback((id: number, studentData: any, parentsData: any) => invoke('db:students:update', { id, studentData, parentsData }), []);
  const deleteStudent = useCallback((id: number) => invoke('db:students:delete', id), []);
  const getRecentStudents = useCallback(() => invoke('db:students:getRecent'), []);
  const getStudentDetails = useCallback((id: number) => invoke('db:students:getDetails', id), []);
  // #endregion

  // #region Teachers
  const getAllTeachers = useCallback(() => invoke('db:teachers:getAll'), []);
  const createTeacher = useCallback((data: any) => invoke('db:teachers:create', data), []);
  const updateTeacher = useCallback((id: number, data: any) => invoke('db:teachers:update', { id, data }), []);
  const deleteTeacher = useCallback((id: number) => invoke('db:teachers:delete', id), []);
  // #endregion

  // #region Payments
  const getAllPayments = useCallback(() => invoke('db:payments:getAll'), []);
  const getLatePayments = useCallback(() => invoke('db:payments:getLatePayments'), []);
  const createPayment = useCallback((data: any) => invoke('db:payments:create', data), []);
  const updatePayment = useCallback((id: number, data: any) => invoke('db:payments:update', { id, data }), []);
  const deletePayment = useCallback((id: number) => invoke('db:payments:delete', id), []);
  // #endregion

  // #region Subjects
  const getAllSubjects = useCallback(() => invoke('db:subjects:getAll'), []);
  const createSubject = useCallback((data: any) => invoke('db:subjects:create', data), []);
  const updateSubject = useCallback((id: number, data: any) => invoke('db:subjects:update', { id, data }), []);
  const deleteSubject = useCallback((id: number) => invoke('db:subjects:delete', id), []);
  const getClassSubjects = useCallback((classId: number) => invoke('db:classSubjects:getAll', classId), []);
  // #endregion

  // #region Attendances
  const getAllAttendances = useCallback((args?: any) => invoke('db:attendances:getAll', args), []);
  const createAttendance = useCallback((data: any) => invoke('db:attendances:create', data), []);
  const updateAttendance = useCallback((id: number, data: any) => invoke('db:attendances:update', { id, data }), []);
  const deleteAttendance = useCallback((id: number) => invoke('db:attendances:delete', id), []);
  const getAttendancesByStudentId = useCallback((studentId: number) => invoke('db:attendances:getByStudentId', studentId), []);
  // #endregion

  // #region Parents
  const getAllParents = useCallback(() => invoke('db:parents:getAll'), []);
  const createParent = useCallback((data: any) => invoke('db:parents:create', data), []);
  const updateParent = useCallback((id: number, data: any) => invoke('db:parents:update', { id, data }), []);
  const deleteParent = useCallback((id: number) => invoke('db:parents:delete', id), []);
  const findParentByPhone = useCallback((phone: string) => invoke('db:parents:findByPhone', phone), []);
  // #endregion

  // #region Registrations
  const getAllRegistrations = useCallback(() => invoke('db:registrations:getAll'), []);
  const createRegistration = useCallback((data: any) => invoke('db:registrations:create', data), []);
  const updateRegistration = useCallback((id: number, data: any) => invoke('db:registrations:update', { id, data }), []);
  const deleteRegistration = useCallback((id: number) => invoke('db:registrations:delete', id), []);
  const getLatestRegistrationForStudent = useCallback((args: any) => invoke('db:registrations:getLatestForStudent', args), []);
  // #endregion

  // #region Student-Parents
  const getStudentParents = useCallback((studentId: number) => invoke('db:studentParents:getByStudent', studentId), []);
  const linkStudentToParent = useCallback((studentId: number, parentId: number, relation: string) => invoke('db:studentParents:link', { studentId, parentId, relation }), []);
  const unlinkStudentFromParent = useCallback((studentId: number, parentId: number) => invoke('db:studentParents:unlink', { studentId, parentId }), []);
  // #endregion

  // #region Lessons
  const getAllLessons = useCallback(() => invoke('db:lessons:getAll'), []);
  const createLesson = useCallback((data: any) => invoke('db:lessons:create', data), []);
  const updateLesson = useCallback((id: number, data: any) => invoke('db:lessons:update', { id, data }), []);
  const deleteLesson = useCallback((id: number) => invoke('db:lessons:delete', id), []);
  // #endregion

  // #region Dashboard & Reports
  const getDashboardStats = useCallback(() => invoke('db:dashboard:getStats'), []);
  const getClassResults = useCallback((classId: number, quarter: number) => invoke('db:reports:getClassResults', { classId, quarter }), []);
  const getAllClassesPerformance = useCallback((filters: any) => invoke('db:reports:getAllClassesPerformance', filters), []);
  const getClassTrend = useCallback((classId: number) => invoke('db:reports:getClassTrend', { classId }), []);
  const getFrequentLatePayers = useCallback(() => invoke('db:reports:getFrequentLatePayers'), []);
  // #endregion

  // #region Financial Management
  const getFinancialSummary = useCallback(() => invoke('db:financial-reports:getSummary'), []);
  const getAllFinancialCategories = useCallback(() => invoke('db:financial-categories:getAll'), []);
  const createFinancialCategory = useCallback((data: any) => invoke('db:financial-categories:create', data), []);
  const getAllFinancialTransactions = useCallback((filters?: any) => invoke('db:financial-transactions:getAll', filters), []);
  const createFinancialTransaction = useCallback((data: any) => invoke('db:financial-transactions:create', data), []);
  const updateFinancialTransaction = useCallback((id: number, data: any) => invoke('db:financial-transactions:update', { id, data }), []);
  const deleteFinancialTransaction = useCallback((id: number) => invoke('db:financial-transactions:delete', id), []);
  // #endregion

  // #region Schedules
  const getAllSchedules = useCallback(() => invoke('db:schedules:getAll'), []);
  const createSchedule = useCallback((data: any) => invoke('db:schedules:create', data), []);
  const updateSchedule = useCallback((id: number, data: any) => invoke('db:schedules:update', { id, data }), []);
  const deleteSchedule = useCallback((id: number) => invoke('db:schedules:delete', id), []);
  const getSchedulesForClass = useCallback((classId: number) => invoke('db:schedules:getForClass', classId), []);
  // #endregion

  // #region Notes
  const getAllNotes = useCallback(() => invoke('db:notes:getAll'), []);
  const createNote = useCallback((data: any) => invoke('db:notes:create', data), []);
  const updateNote = useCallback((id: number, data: any) => invoke('db:notes:update', { id, data }), []);
  const deleteNote = useCallback((id: number) => invoke('db:notes:delete', id), []);
  const createManyNotes = useCallback((data: any) => invoke('db:notes:createMany', data), []);
  const getNotesByStudentId = useCallback((studentId: number) => invoke('db:notes:getByStudentId', studentId), []);
  // #endregion

  // #region Employees
  const getAllEmployees = useCallback(() => invoke('db:employees:getAll'), []);
  const createEmployee = useCallback((data: any) => invoke('db:employees:create', data), []);
  const updateEmployee = useCallback((id: number, data: any) => invoke('db:employees:update', { id, data }), []);
  const deleteEmployee = useCallback((id: number) => invoke('db:employees:delete', id), []);
  // #endregion

  // #region Fees
  const getAllFees = useCallback((args?: any) => invoke('db:fees:getAll', args), []);
  const createFee = useCallback((data: any) => invoke('db:fees:create', data), []);
  const updateFee = useCallback((id: number, data: any) => invoke('db:fees:update', { id, data }), []);
  const deleteFee = useCallback((id: number) => invoke('db:fees:delete', id), []);
  const getStudentFeeStatus = useCallback((args: any) => invoke('db:fees:getStudentFeeStatus', args), []);

  // #region Fee Templates
  const getAllFeeTemplates = useCallback(() => invoke('db:fee-templates:getAll'), []);
  const createFeeTemplate = useCallback((data: any) => invoke('db:fee-templates:create', data), []);
  const updateFeeTemplate = useCallback((id: number, data: any) => invoke('db:fee-templates:update', { id, data }), []);
  const deleteFeeTemplate = useCallback((id: number) => invoke('db:fee-templates:delete', id), []);
  // #endregion

  // #region Student Fees
  const getStudentFeesByRegistration = useCallback((registrationId: number) => invoke('db:student-fees:get-by-registration', registrationId), []);
  const createStudentFee = useCallback((data: any) => invoke('db:student-fees:create', data), []);
  const updateStudentFee = useCallback((id: number, data: any) => invoke('db:student-fees:update', { id, data }), []);
  const deleteStudentFee = useCallback((id: number) => invoke('db:student-fees:delete', id), []);
  // #endregion

  // #region Events
  const getAllEvents = useCallback(() => invoke('db:events:getAll'), []);
  const createEvent = useCallback((data: any) => invoke('db:events:create', data), []);
  const updateEvent = useCallback((id: number, data: any) => invoke('db:events:update', { id, data }), []);
  const deleteEvent = useCallback((id: number) => invoke('db:events:delete', id), []);
  // #endregion

  // #region Printer
  const getPrinters = useCallback(() => invoke('printers:get-list'), []);
  const printReceipt = useCallback((data: any) => invoke('printers:print-receipt', data), []);
  // #endregion

  // #region Dispatch Rules
  const getAllDispatchRules = useCallback(() => invoke('db:dispatch-rules:getAll'), []);
  const createDispatchRule = useCallback((data: any) => invoke('db:dispatch-rules:create', data), []);
  const getDispatchSummary = useCallback(() => invoke('db:finance:get-dispatch-summary'), []);
  const getBase64Image = useCallback((fileName: string) => invoke('images:get-base64', fileName), []);
  
  const deleteDispatchRule = useCallback((id: number) => invoke('db:dispatch-rules:delete', id), []);
  const updateDispatchRule = useCallback((id: number, data: any) => invoke('db:dispatch-rules:update', { id, data }), []);
  // #endregion

  // #region Employee Attendances
  const getEmployeeAttendances = useCallback((args: { employeeId?: number, teacherId?: number }) => invoke('db:employee-attendances:getForEmployee', args), []);
  const getTodaysAttendanceSummary = useCallback((args: { schoolId: string }) => invoke('db:employee-attendances:getTodaysSummary', args), []);
  const clockInEmployee = useCallback((args: { employeeId?: number, teacherId?: number, schoolId: string }) => invoke('db:employee-attendances:clockIn', args), []);
  const clockOutEmployee = useCallback((attendanceId: number) => invoke('db:employee-attendances:clockOut', { attendanceId }), []);
  const updateEmployeeAttendance = useCallback((id: number, data: any) => invoke('db:employee-attendances:update', { id, data }), []);
  const deleteEmployeeAttendance = useCallback((id: number) => invoke('db:employee-attendances:delete', id), []);
  // #endregion

  return useMemo(() => ({
    getSettings, updateSettings, setSchoolLogo, getSchoolLogoBase64,
    getAllClasses, createClass, updateClass, deleteClass,
    getAllStudents, createStudent, updateStudent, deleteStudent, getRecentStudents, getStudentDetails,
    getAllTeachers, createTeacher, updateTeacher, deleteTeacher,
    getAllPayments, createPayment, updatePayment, deletePayment, getLatePayments,
    getAllSubjects, createSubject, updateSubject, deleteSubject, getClassSubjects,
    getAllAttendances, createAttendance, updateAttendance, deleteAttendance, getAttendancesByStudentId,
    getAllParents, createParent, updateParent, deleteParent, findParentByPhone,
    getAllRegistrations, createRegistration, updateRegistration, deleteRegistration, getLatestRegistrationForStudent,
    getStudentParents, linkStudentToParent, unlinkStudentFromParent,
    getAllLessons, createLesson, updateLesson, deleteLesson,
    getDashboardStats, getClassResults, getAllClassesPerformance, getClassTrend, getFrequentLatePayers,
    getFinancialSummary,
    getAllFinancialCategories,
    createFinancialCategory,
    getAllFinancialTransactions,
    createFinancialTransaction,
    updateFinancialTransaction,
    deleteFinancialTransaction,
    getAllSchedules, createSchedule, updateSchedule, deleteSchedule, getSchedulesForClass,
    getAllNotes, createNote, updateNote, deleteNote, createManyNotes, getNotesByStudentId,
    getAllEmployees, createEmployee, updateEmployee, deleteEmployee,
    getAllFees, createFee, updateFee, deleteFee, getStudentFeeStatus, 
    getPrinters, printReceipt,
    getAllDispatchRules, createDispatchRule, updateDispatchRule, deleteDispatchRule, getDispatchSummary, getBase64Image,
    getAllFeeTemplates, createFeeTemplate, updateFeeTemplate, deleteFeeTemplate,
    getStudentFeesByRegistration, createStudentFee, updateStudentFee, deleteStudentFee,
    getAllEvents, createEvent, updateEvent, deleteEvent, // Ajout des fonctions pour les événements
    getEmployeeAttendances, getTodaysAttendanceSummary, clockInEmployee, clockOutEmployee, updateEmployeeAttendance, deleteEmployeeAttendance,
    processStudentPhoto: () => invoke('images:process-student-photo'),
  }), []);
}