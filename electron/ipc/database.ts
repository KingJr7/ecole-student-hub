import { ipcMain } from 'electron'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export function setupDatabaseIPC() {
  // Gestion des Classes
  ipcMain.handle('db:classes:getAll', async () => {
    try {
      return await prisma.class.findMany({
        include: {
          students: true,
          subjects: true
        }
      })
    } catch (error) {
      console.error('Erreur lors de la récupération des classes:', error)
      throw error
    }
  })

  ipcMain.handle('db:classes:create', async (_, data: { name: string }) => {
    try {
      return await prisma.class.create({ data })
    } catch (error) {
      console.error('Erreur lors de la création de la classe:', error)
      throw error
    }
  })

  // Gestion des Étudiants
  ipcMain.handle('db:students:getAll', async () => {
    try {
      return await prisma.student.findMany({
        include: {
          class: true,
          grades: true,
          attendances: true,
          payments: true
        }
      })
    } catch (error) {
      console.error('Erreur lors de la récupération des étudiants:', error)
      throw error
    }
  })

  ipcMain.handle('db:students:create', async (_, data: {
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
      return await prisma.student.create({ data })
    } catch (error) {
      console.error('Erreur lors de la création de l\'étudiant:', error)
      throw error
    }
  })

  // Gestion des Professeurs
  ipcMain.handle('db:teachers:getAll', async () => {
    try {
      return await prisma.teacher.findMany({
        include: {
          subjects: true
        }
      })
    } catch (error) {
      console.error('Erreur lors de la récupération des professeurs:', error)
      throw error
    }
  })

  ipcMain.handle('db:teachers:create', async (_, data: {
    firstName: string
    lastName: string
    email: string
    phone: string
  }) => {
    try {
      return await prisma.teacher.create({ data })
    } catch (error) {
      console.error('Erreur lors de la création du professeur:', error)
      throw error
    }
  })

  // Gestion des Matières
  ipcMain.handle('db:subjects:getAll', async () => {
    try {
      return await prisma.subject.findMany({
        include: {
          class: true,
          teacher: true,
          schedules: true
        }
      })
    } catch (error) {
      console.error('Erreur lors de la récupération des matières:', error)
      throw error
    }
  })

  ipcMain.handle('db:subjects:create', async (_, data: {
    name: string
    classId: number
    teacherId: number
    coefficient: number
  }) => {
    try {
      return await prisma.subject.create({ data })
    } catch (error) {
      console.error('Erreur lors de la création de la matière:', error)
      throw error
    }
  })

  // Gestion des Notes
  ipcMain.handle('db:grades:getAll', async () => {
    try {
      return await prisma.grade.findMany({
        include: {
          student: true
        }
      })
    } catch (error) {
      console.error('Erreur lors de la récupération des notes:', error)
      throw error
    }
  })

  ipcMain.handle('db:grades:create', async (_, data: {
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
      return await prisma.grade.create({ data })
    } catch (error) {
      console.error('Erreur lors de la création de la note:', error)
      throw error
    }
  })

  // Gestion des Présences
  ipcMain.handle('db:attendances:getAll', async () => {
    try {
      return await prisma.attendanceRecord.findMany({
        include: {
          student: true
        }
      })
    } catch (error) {
      console.error('Erreur lors de la récupération des présences:', error)
      throw error
    }
  })

  ipcMain.handle('db:attendances:create', async (_, data: {
    studentId: number
    date: string
    status: string
    notes?: string
  }) => {
    try {
      return await prisma.attendanceRecord.create({ data })
    } catch (error) {
      console.error('Erreur lors de la création de la présence:', error)
      throw error
    }
  })

  // Gestion des Paiements
  ipcMain.handle('db:payments:getAll', async () => {
    try {
      return await prisma.payment.findMany({
        include: {
          student: true
        }
      })
    } catch (error) {
      console.error('Erreur lors de la récupération des paiements:', error)
      throw error
    }
  })

  ipcMain.handle('db:payments:create', async (_, data: {
    studentId: number
    amount: number
    date: string
    type: string
    status: string
    notes?: string
    currency?: string
  }) => {
    try {
      return await prisma.payment.create({ data })
    } catch (error) {
      console.error('Erreur lors de la création du paiement:', error)
      throw error
    }
  })
} 
