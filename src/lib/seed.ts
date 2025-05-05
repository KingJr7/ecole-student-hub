
import prisma from './prisma';

export async function seedDatabase() {
  console.log("Seeding database...");
  
  try {
    // Check if there's data already
    const classCount = await prisma.class.count();
    
    if (classCount > 0) {
      console.log("Database already seeded. Skipping...");
      return;
    }
    
    // Create classes
    const terminaleSClass = await prisma.class.create({
      data: {
        name: "Terminale S"
      }
    });
    
    const premiereESClass = await prisma.class.create({
      data: {
        name: "Première ES"
      }
    });
    
    // Create students
    const marie = await prisma.student.create({
      data: {
        firstName: "Marie",
        lastName: "Dupont",
        email: "marie.dupont@example.com",
        phone: "06 12 34 56 78",
        dateOfBirth: "2005-05-15",
        address: "123 Rue de Paris, 75001 Paris",
        enrollmentDate: "2022-09-01",
        status: "active",
        classId: terminaleSClass.id
      }
    });
    
    const thomas = await prisma.student.create({
      data: {
        firstName: "Thomas",
        lastName: "Martin",
        email: "thomas.martin@example.com",
        phone: "07 23 45 67 89",
        dateOfBirth: "2004-08-22",
        address: "456 Avenue Victor Hugo, 69002 Lyon",
        enrollmentDate: "2021-09-01",
        status: "active",
        classId: premiereESClass.id
      }
    });
    
    const sophie = await prisma.student.create({
      data: {
        firstName: "Sophie",
        lastName: "Bernard",
        email: "sophie.bernard@example.com",
        phone: "06 34 56 78 90",
        dateOfBirth: "2005-03-10",
        address: "789 Boulevard Voltaire, 13001 Marseille",
        enrollmentDate: "2022-09-01",
        status: "active",
        classId: terminaleSClass.id
      }
    });
    
    // Create attendance records
    await prisma.attendanceRecord.createMany({
      data: [
        {
          studentId: marie.id,
          date: "2023-11-06",
          status: "present"
        },
        {
          studentId: thomas.id,
          date: "2023-11-06",
          status: "absent",
          notes: "Maladie"
        },
        {
          studentId: sophie.id,
          date: "2023-11-06",
          status: "present"
        },
        {
          studentId: marie.id,
          date: "2023-11-07",
          status: "present"
        },
        {
          studentId: thomas.id,
          date: "2023-11-07",
          status: "present"
        },
        {
          studentId: sophie.id,
          date: "2023-11-07",
          status: "late",
          notes: "10 minutes de retard"
        }
      ]
    });
    
    // Create payments
    await prisma.payment.createMany({
      data: [
        {
          studentId: marie.id,
          amount: 500.00,
          date: "2023-10-05",
          type: "tuition",
          status: "paid",
          currency: "FCFA"
        },
        {
          studentId: thomas.id,
          amount: 500.00,
          date: "2023-10-10",
          type: "tuition",
          status: "paid",
          currency: "FCFA"
        },
        {
          studentId: sophie.id,
          amount: 500.00,
          date: "2023-10-15",
          type: "tuition",
          status: "overdue",
          notes: "Rappel envoyé",
          currency: "FCFA"
        }
      ]
    });
    
    // Create grades
    await prisma.grade.createMany({
      data: [
        {
          studentId: marie.id,
          subject: "Mathématiques",
          score: 17,
          date: "2023-10-20",
          evaluationType: "composition",
          term: "1er trimestre",
          coefficient: 4
        },
        {
          studentId: marie.id,
          subject: "Français",
          score: 15.5,
          date: "2023-10-22",
          evaluationType: "composition",
          term: "1er trimestre",
          coefficient: 3
        },
        {
          studentId: thomas.id,
          subject: "Mathématiques",
          score: 18.5,
          date: "2023-10-20",
          evaluationType: "composition",
          term: "1er trimestre",
          coefficient: 4
        },
        {
          studentId: thomas.id,
          subject: "Français",
          score: 13.5,
          date: "2023-10-22",
          evaluationType: "composition",
          term: "1er trimestre",
          coefficient: 3
        },
        {
          studentId: sophie.id,
          subject: "Mathématiques",
          score: 15,
          date: "2023-10-20",
          evaluationType: "composition",
          term: "1er trimestre",
          coefficient: 4
        },
        {
          studentId: sophie.id,
          subject: "Français",
          score: 17.5,
          date: "2023-10-22",
          evaluationType: "composition",
          term: "1er trimestre",
          coefficient: 3,
          notes: "Excellente rédaction"
        }
      ]
    });
    
    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}
