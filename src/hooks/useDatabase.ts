import { useCallback } from 'react'

const { ipcRenderer } = window.require('electron')

export function useDatabase() {
  // Classes
  const getAllClasses = useCallback(async () => {
    try {
      return await ipcRenderer.invoke('db:classes:getAll')
    } catch (error) {
      console.error('Erreur lors de la récupération des classes:', error)
      throw error
    }
  }, [])

  const createClass = useCallback(async (data: { name: string }) => {
    try {
      return await ipcRenderer.invoke('db:classes:create', data)
    } catch (error) {
      console.error('Erreur lors de la création de la classe:', error)
      throw error
    }
  }, [])

  const updateClass = useCallback(async (id: number, data: { name: string }) => {
    try {
      return await ipcRenderer.invoke('db:classes:update', { id, data })
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la classe:', error)
      throw error
    }
  }, [])

  const deleteClass = useCallback(async (id: number) => {
    try {
      return await ipcRenderer.invoke('db:classes:delete', id)
    } catch (error) {
      console.error('Erreur lors de la suppression de la classe:', error)
      throw error
    }
  }, [])

  // Étudiants
  const getAllStudents = useCallback(async () => {
    try {
      return await ipcRenderer.invoke('db:students:getAll')
    } catch (error) {
      console.error('Erreur lors de la récupération des étudiants:', error)
      throw error
    }
  }, [])

  const createStudent = useCallback(async (data: {
    firstName: string
    lastName: string
    email: string
    phone: string
    dateOfBirth: string
    address: string
    enrollmentDate: string
    status: string
    classId: number
  }) => {
    try {
      return await ipcRenderer.invoke('db:students:create', data)
    } catch (error) {
      console.error('Erreur lors de la création de l\'étudiant:', error)
      throw error
    }
  }, [])

  const updateStudent = useCallback(async (id: number, data: {
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    dateOfBirth?: string
    address?: string
    enrollmentDate?: string
    status?: string
    classId?: number
  }) => {
    try {
      return await ipcRenderer.invoke('db:students:update', { id, data })
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'étudiant:', error)
      throw error
    }
  }, [])

  const deleteStudent = useCallback(async (id: number) => {
    try {
      return await ipcRenderer.invoke('db:students:delete', id)
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'étudiant:', error)
      throw error
    }
  }, [])

  // Professeurs
  const getAllTeachers = useCallback(async () => {
    try {
      return await ipcRenderer.invoke('db:teachers:getAll')
    } catch (error) {
      console.error('Erreur lors de la récupération des professeurs:', error)
      throw error
    }
  }, [])

  const createTeacher = useCallback(async (data: {
    firstName: string
    lastName: string
    email: string
    phone: string
  }) => {
    try {
      return await ipcRenderer.invoke('db:teachers:create', data)
    } catch (error) {
      console.error('Erreur lors de la création du professeur:', error)
      throw error
    }
  }, [])

  // Matières
  const getAllSubjects = useCallback(async () => {
    try {
      return await ipcRenderer.invoke('db:subjects:getAll')
    } catch (error) {
      console.error('Erreur lors de la récupération des matières:', error)
      throw error
    }
  }, [])

  const createSubject = useCallback(async (data: {
    name: string
    classId: number
    teacherId: number
    coefficient: number
  }) => {
    try {
      return await ipcRenderer.invoke('db:subjects:create', data)
    } catch (error) {
      console.error('Erreur lors de la création de la matière:', error)
      throw error
    }
  }, [])

  // Notes
  const getAllGrades = useCallback(async () => {
    try {
      return await ipcRenderer.invoke('db:grades:getAll')
    } catch (error) {
      console.error('Erreur lors de la récupération des notes:', error)
      throw error
    }
  }, [])

  const createGrade = useCallback(async (data: {
    studentId: number
    subject: string
    score: number
    date: string
    notes?: string
    evaluationType?: string
    term?: string
    coefficient?: number
  }) => {
    try {
      return await ipcRenderer.invoke('db:grades:create', data)
    } catch (error) {
      console.error('Erreur lors de la création de la note:', error)
      throw error
    }
  }, [])

  const updateGrade = useCallback(async (id: number, data: {
    studentId?: number
    subject?: string
    score?: number
    date?: string
    notes?: string
    evaluationType?: string
    term?: string
    coefficient?: number
  }) => {
    try {
      return await ipcRenderer.invoke('db:grades:update', { id, data })
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la note:', error)
      throw error
    }
  }, [])

  const deleteGrade = useCallback(async (id: number) => {
    try {
      return await ipcRenderer.invoke('db:grades:delete', id)
    } catch (error) {
      console.error('Erreur lors de la suppression de la note:', error)
      throw error
    }
  }, [])

  const getClassResults = useCallback(async (className: string, term: string) => {
    try {
      return await ipcRenderer.invoke('db:grades:getClassResults', { className, term })
    } catch (error) {
      console.error('Erreur lors de la récupération des résultats de classe:', error)
      throw error
    }
  }, [])

  // Présences
  const getAllAttendances = useCallback(async () => {
    try {
      return await ipcRenderer.invoke('db:attendances:getAll')
    } catch (error) {
      console.error('Erreur lors de la récupération des présences:', error)
      throw error
    }
  }, [])

  const createAttendance = useCallback(async (data: {
    studentId: number
    date: string
    status: string
    notes?: string
  }) => {
    try {
      return await ipcRenderer.invoke('db:attendances:create', data)
    } catch (error) {
      console.error('Erreur lors de la création de la présence:', error)
      throw error
    }
  }, [])

  // Settings
  const getSettings = useCallback(async () => {
    try {
      return await ipcRenderer.invoke('db:settings:get')
    } catch (error) {
      console.error('Erreur lors de la récupération des paramètres:', error)
      throw error
    }
  }, [])

  const updateSettings = useCallback(async (data: { schoolName?: string; paymentMonths?: string[] }) => {
    try {
      return await ipcRenderer.invoke('db:settings:update', data)
    } catch (error) {
      console.error('Erreur lors de la mise à jour des paramètres:', error)
      throw error
    }
  }, [])

  // Paiements
  const getAllPayments = useCallback(async () => {
    try {
      return await ipcRenderer.invoke('db:payments:getAll')
    } catch (error) {
      console.error('Erreur lors de la récupération des paiements:', error)
      throw error
    }
  }, [])

  // Get all available payment months
  const getAvailablePaymentMonths = useCallback(async () => {
    try {
      return await ipcRenderer.invoke('db:payments:getAvailableMonths')
    } catch (error) {
      console.error('Erreur lors de la récupération des mois de paiement:', error)
      throw error
    }
  }, [])

  const createPayment = useCallback(async (data: {
    studentId: number
    amount: number
    date: string
    type: string
    status: string
    notes?: string
    currency?: string
  }) => {
    try {
      return await ipcRenderer.invoke('db:payments:create', data)
    } catch (error) {
      console.error('Erreur lors de la création du paiement:', error)
      throw error
    }
  }, [])

  const updatePayment = useCallback(async (id: number, data: {
    studentId?: number
    amount?: number
    date?: string
    type?: string
    status?: string
    notes?: string
    currency?: string
  }) => {
    try {
      return await ipcRenderer.invoke('db:payments:update', { id, data })
    } catch (error) {
      console.error('Erreur lors de la mise à jour du paiement:', error)
      throw error
    }
  }, [])

  const deletePayment = useCallback(async (id: number) => {
    try {
      return await ipcRenderer.invoke('db:payments:delete', id)
    } catch (error) {
      console.error('Erreur lors de la suppression du paiement:', error)
      throw error
    }
  }, [])

  // Gestion des matières par classe
  const getClassSubjects = useCallback(async (classId: number) => {
    try {
      return await ipcRenderer.invoke('db:classSubjects:getAll', classId)
    } catch (error) {
      console.error('Erreur lors de la récupération des matières par classe:', error)
      throw error
    }
  }, [])

  const addClassSubject = useCallback(async (classId: number, subjectName: string, coefficient: number, hoursPerWeek?: number) => {
    try {
      return await ipcRenderer.invoke('db:classSubjects:add', { classId, subjectName, coefficient, hoursPerWeek })
    } catch (error) {
      console.error('Erreur lors de l\'ajout d\'une matière à une classe:', error)
      throw error
    }
  }, [])

  const deleteClassSubject = useCallback(async (id: number) => {
    try {
      return await ipcRenderer.invoke('db:classSubjects:delete', id)
    } catch (error) {
      console.error('Erreur lors de la suppression d\'une matière d\'une classe:', error)
      throw error
    }
  }, [])

  // Modifier une matière d'une classe
  const updateClassSubject = useCallback(async (id: number, subjectName: string, coefficient: number) => {
    try {
      return await ipcRenderer.invoke('db:classSubjects:update', { id, subjectName, coefficient })
    } catch (error) {
      console.error('Erreur lors de la modification d\'une matière d\'une classe:', error)
      throw error
    }
  }, [])

  return {
    // Classes
    getAllClasses,
    createClass,
    updateClass,
    deleteClass,
    // Matières
    getAllSubjects,
    createSubject,
    // Étudiants
    getAllStudents,
    createStudent,
    updateStudent,
    deleteStudent,
    // Professeurs
    getAllTeachers,
    createTeacher,
    // Matières
    getClassSubjects,
    addClassSubject,
    deleteClassSubject,
    updateClassSubject,
    getAllGrades,
    createGrade,
    updateGrade,
    deleteGrade,
    getClassResults,
    // Présences
    getAllAttendances,
    createAttendance,
    // Settings
    getSettings,
    updateSettings,
    // Paiements
    getAllPayments,
    getAvailablePaymentMonths,
    createPayment,
    updatePayment,
    deletePayment
  }
} 