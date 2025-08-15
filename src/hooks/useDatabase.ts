import { useCallback } from 'react';

const { ipcRenderer } = window.require('electron');

// Typage générique pour les fonctions IPC pour réduire la répétition
const invoke = <T,>(channel: string, ...args: any[]): Promise<T> => {
  try {
    return ipcRenderer.invoke(channel, ...args);
  } catch (error) {
    console.error(`Erreur IPC sur le canal ${channel}:`, error);
    throw error;
  }
};

export function useDatabase() {
  // #region Settings
  const getSettings = useCallback(() => invoke('db:settings:get'), []);
  const updateSettings = useCallback((data: any) => invoke('db:settings:update', data), []);
  // #endregion

  // #region Classes
  const getAllClasses = useCallback(() => invoke('db:classes:getAll'), []);
  const createClass = useCallback((data: any) => invoke('db:classes:create', data), []);
  const updateClass = useCallback((id: number, data: any) => invoke('db:classes:update', { id, data }), []);
  const deleteClass = useCallback((id: number) => invoke('db:classes:delete', id), []);
  // #endregion

  // #region Students
  const getAllStudents = useCallback((args?: any) => invoke('db:students:getAll', args), []);
  const createStudent = useCallback((data: any) => invoke('db:students:create', data), []);
  const updateStudent = useCallback((id: number, data: any) => invoke('db:students:update', { id, data }), []);
  const deleteStudent = useCallback((id: number) => invoke('db:students:delete', id), []);
  const getRecentStudents = useCallback(() => invoke('db:students:getRecent'), []);
  // #endregion

  // #region Teachers
  const getAllTeachers = useCallback(() => invoke('db:teachers:getAll'), []);
  const createTeacher = useCallback((data: any) => invoke('db:teachers:create', data), []);
  const updateTeacher = useCallback((id: number, data: any) => invoke('db:teachers:update', { id, data }), []);
  const deleteTeacher = useCallback((id: number) => invoke('db:teachers:delete', id), []);
  // #endregion

  // #region Payments
  const getAllPayments = useCallback(() => invoke('db:payments:getAll'), []);
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
  // #endregion

  // #region Parents
  const getAllParents = useCallback(() => invoke('db:parents:getAll'), []);
  const createParent = useCallback((data: any) => invoke('db:parents:create', data), []);
  const updateParent = useCallback((id: number, data: any) => invoke('db:parents:update', { id, data }), []);
  const deleteParent = useCallback((id: number) => invoke('db:parents:delete', id), []);
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
  const linkStudentToParent = useCallback((studentId: number, parentId: number) => invoke('db:studentParents:link', { studentId, parentId }), []);
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
  // #endregion

  // #region Printer
  const getPrinters = useCallback(() => invoke('printers:get-list'), []);
  const printReceipt = useCallback((data: any) => invoke('printers:print-receipt', data), []);
  // #endregion

  return {
    getSettings, updateSettings,
    getAllClasses, createClass, updateClass, deleteClass,
    getAllStudents, createStudent, updateStudent, deleteStudent, getRecentStudents,
    getAllTeachers, createTeacher, updateTeacher, deleteTeacher,
    getAllPayments, createPayment, updatePayment, deletePayment,
    getAllSubjects, createSubject, updateSubject, deleteSubject, getClassSubjects,
    getAllAttendances, createAttendance, updateAttendance, deleteAttendance,
    getAllParents, createParent, updateParent, deleteParent,
    getAllRegistrations, createRegistration, updateRegistration, deleteRegistration, getLatestRegistrationForStudent,
    getStudentParents, linkStudentToParent, unlinkStudentFromParent,
    getAllLessons, createLesson, updateLesson, deleteLesson,
    getDashboardStats, getClassResults,
    getAllSchedules, createSchedule, updateSchedule, deleteSchedule, getSchedulesForClass,
    getAllNotes, createNote, updateNote, deleteNote,
    getAllEmployees, createEmployee, updateEmployee, deleteEmployee,
    getAllFees, createFee, updateFee, deleteFee, getStudentFeeStatus, 
    getPrinters, printReceipt,
  };
}