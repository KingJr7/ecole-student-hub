const { ipcMain } = require('electron');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let db;

function initializeDatabase() {
  db = new sqlite3.Database(path.join(__dirname, '../../database.sqlite'), (err) => {
    if (err) {
      console.error('Erreur lors de la connexion à la base de données:', err);
    } else {
      console.log('Connecté à la base de données SQLite');
      db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS classes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS students (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          firstName TEXT NOT NULL,
          lastName TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          dateOfBirth TEXT,
          address TEXT,
          enrollmentDate TEXT,
          status TEXT DEFAULT 'active',
          classId INTEGER,
          parentInfo TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (classId) REFERENCES classes (id)
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          studentId INTEGER,
          amount REAL NOT NULL,
          date TEXT,
          type TEXT,
          status TEXT,
          notes TEXT,
          currency TEXT DEFAULT 'FCFA',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (studentId) REFERENCES students (id)
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS grades (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          studentId INTEGER,
          subjectId INTEGER,
          value REAL NOT NULL,
          term TEXT,
          evaluationType TEXT DEFAULT 'composition',
          coefficient REAL DEFAULT 1,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (studentId) REFERENCES students (id),
          FOREIGN KEY (subjectId) REFERENCES subjects (id)
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS subjects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          coefficient REAL,
          classId INTEGER,
          teacherId INTEGER,
          hoursPerWeek INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (teacherId) REFERENCES teachers (id)
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS attendances (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          studentId INTEGER,
          date TEXT NOT NULL,
          status TEXT NOT NULL,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (studentId) REFERENCES students (id)
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY,
          schoolName TEXT,
          paymentMonths TEXT
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS class_subjects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          classId INTEGER NOT NULL,
          subjectName TEXT NOT NULL,
          coefficient REAL NOT NULL,
          hoursPerWeek INTEGER,
          FOREIGN KEY (classId) REFERENCES classes(id)
        )`);

        // Création de la table des professeurs
        db.run(`CREATE TABLE IF NOT EXISTS teachers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          firstName TEXT NOT NULL,
          lastName TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          address TEXT,
          hourlyRate REAL DEFAULT 3000,
          speciality TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Création de la table de pointage des heures de travail des professeurs
        db.run(`CREATE TABLE IF NOT EXISTS teacher_work_hours (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          teacherId INTEGER NOT NULL,
          hours REAL NOT NULL,
          date TEXT NOT NULL,
          subjectId INTEGER,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (teacherId) REFERENCES teachers (id),
          FOREIGN KEY (subjectId) REFERENCES subjects (id)
        )`);
        
        // Migration : Vérifier si le champ hoursPerWeek existe dans la table subjects et l'ajouter si nécessaire
        db.all("PRAGMA table_info(subjects)", [], (err, rows) => {
          if (err) {
            console.error('Erreur lors de la vérification des colonnes de la table subjects:', err);
            return;
          }
          
          const columns = rows.map(row => row.name);
          
          if (!columns.includes('hoursPerWeek')) {
            db.run('ALTER TABLE subjects ADD COLUMN hoursPerWeek INTEGER', [], function(err) {
              if (err) {
                console.error('Erreur lors de l\'ajout de la colonne hoursPerWeek:', err);
              } else {
                console.log('Colonne hoursPerWeek ajoutée à la table subjects');
              }
            });
          }
        });

        // Migration : Ajouter les colonnes manquantes à la table grades si elles n'existent pas
        db.all("PRAGMA table_info(grades)", [], (err, rows) => {
          if (err) {
            console.error('Erreur lors de la vérification des colonnes de la table grades:', err);
            return;
          }
          
          // Vérifier si les colonnes existent déjà
          if (!rows || !Array.isArray(rows)) {
            console.error('Résultat inattendu lors de la vérification des colonnes:', rows);
            return;
          }
          
          console.log('Colonnes existantes dans grades:', rows.map(row => row.name).join(', '));
          
          const columns = rows.map(row => row.name);
          
          if (!columns.includes('evaluationType')) {
            db.run('ALTER TABLE grades ADD COLUMN evaluationType TEXT DEFAULT \'composition\'', [], function(err) {
              if (err) {
                console.error('Erreur lors de l\'ajout de la colonne evaluationType:', err);
              } else {
                console.log('Colonne evaluationType ajoutée à la table grades');
              }
            });
          }
          
          if (!columns.includes('coefficient')) {
            db.run('ALTER TABLE grades ADD COLUMN coefficient REAL DEFAULT 1', [], function(err) {
              if (err) {
                console.error('Erreur lors de l\'ajout de la colonne coefficient:', err);
              } else {
                console.log('Colonne coefficient ajoutée à la table grades');
              }
            });
          }
          
          if (!columns.includes('notes')) {
            db.run('ALTER TABLE grades ADD COLUMN notes TEXT', [], function(err) {
              if (err) {
                console.error('Erreur lors de l\'ajout de la colonne notes:', err);
              } else {
                console.log('Colonne notes ajoutée à la table grades');
              }
            });
          }
        });
        
        // Insérer une ligne par défaut si la table est vide
        db.get('SELECT COUNT(*) as count FROM settings', (err, row) => {
          if (!err && row.count === 0) {
            db.run('INSERT INTO settings (id, schoolName, paymentMonths) VALUES (1, "Nom de l\'école", "[\"2025-01\",\"2025-02\",\"2025-03\"]")');
          }
        });
      });
    }
  });
}

function setupDatabaseIPC() {
  initializeDatabase();

  // Handler pour récupérer les settings
  ipcMain.handle('db:settings:get', async () => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM settings WHERE id = 1', (err, row) => {
        if (err) reject(err);
        else {
          // Parse paymentMonths JSON string if present
          if (row && row.paymentMonths) {
            try { row.paymentMonths = JSON.parse(row.paymentMonths); } catch { row.paymentMonths = []; }
          }
          resolve(row);
        }
      });
    });
  });

  // Handler pour récupérer les matières d'une classe
  ipcMain.handle('db:classSubjects:getAll', async (event, classId) => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM class_subjects WHERE classId = ?', [classId], (err, rows) => {
        if (err) reject(err);
        else {
          // Convertir subjectName en name pour uniformiser avec la table subjects
          const formattedRows = rows.map(row => ({
            id: row.id,
            name: row.subjectName,  // Renomme subjectName en name
            subjectName: row.subjectName, // Garde l'original pour compatibilité
            coefficient: row.coefficient,
            classId: row.classId,
            hoursPerWeek: row.hoursPerWeek
          }));
          resolve(formattedRows);
        }
      });
    });
  });

  // Handler pour ajouter une matière à une classe
  ipcMain.handle('db:classSubjects:add', async (event, { classId, subjectName, coefficient, hoursPerWeek }) => {
    return new Promise((resolve, reject) => {
      db.run('INSERT INTO class_subjects (classId, subjectName, coefficient, hoursPerWeek) VALUES (?, ?, ?, ?)', [classId, subjectName, coefficient, hoursPerWeek], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, classId, subjectName, coefficient, hoursPerWeek });
      });
    });
  });

  // Handler pour supprimer une matière d'une classe
  ipcMain.handle('db:classSubjects:delete', async (event, id) => {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM class_subjects WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve({ id });
      });
    });
  });

  // Handler pour modifier une matière d'une classe
  ipcMain.handle('db:classSubjects:update', async (event, { id, subjectName, coefficient }) => {
    return new Promise((resolve, reject) => {
      db.run('UPDATE class_subjects SET subjectName = ?, coefficient = ? WHERE id = ?', [subjectName, coefficient, id], function(err) {
        if (err) reject(err);
        else resolve({ id, subjectName, coefficient });
      });
    });
  });

  // Handler pour mettre à jour les settings
  ipcMain.handle('db:settings:update', async (event, data) => {
    return new Promise((resolve, reject) => {
      const { schoolName, paymentMonths } = data;
      db.run('UPDATE settings SET schoolName = ?, paymentMonths = ? WHERE id = 1', [schoolName, JSON.stringify(paymentMonths)], function(err) {
        if (err) {
          reject(err);
        } else if (this.changes === 0) {
          // Aucun settings existant, on insère
          db.run('INSERT OR REPLACE INTO settings (id, schoolName, paymentMonths) VALUES (1, ?, ?)', [schoolName, JSON.stringify(paymentMonths)], function(err2) {
            if (err2) reject(err2);
            else resolve({ success: true, inserted: true });
          });
        } else {
          resolve({ success: true });
        }
      });
    });
  });

  // Gestionnaires IPC pour les classes
  ipcMain.handle('db:classes:getAll', async () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM classes ORDER BY name', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  });

  ipcMain.handle('db:classes:create', async (event, classData) => {
    return new Promise((resolve, reject) => {
      db.run('INSERT INTO classes (name) VALUES (?)', [classData.name], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...classData });
      });
    });
  });

  ipcMain.handle('db:classes:update', async (event, { id, data }) => {
    return new Promise((resolve, reject) => {
      db.run('UPDATE classes SET name = ? WHERE id = ?', [data.name, id], function(err) {
        if (err) reject(err);
        else resolve({ id, ...data });
      });
    });
  });

  ipcMain.handle('db:classes:delete', async (event, id) => {
    return new Promise((resolve, reject) => {
      // Vérifier d'abord s'il y a des étudiants dans cette classe
      db.get('SELECT COUNT(*) as count FROM students WHERE classId = ?', [id], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (row.count > 0) {
          reject(new Error('Impossible de supprimer une classe qui contient des étudiants'));
          return;
        }

        // Si pas d'étudiants, supprimer la classe
        db.run('DELETE FROM classes WHERE id = ?', [id], function(err) {
          if (err) reject(err);
          else resolve({ id });
        });
      });
    });
  });

  // Gestionnaires IPC pour les étudiants
  ipcMain.handle('db:students:getAll', async () => {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT s.*, c.name as className 
        FROM students s 
        LEFT JOIN classes c ON s.classId = c.id
        ORDER BY s.lastName, s.firstName
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  });

  ipcMain.handle('db:students:create', async (event, studentData) => {
    return new Promise((resolve, reject) => {
      const { firstName, lastName, email, phone, dateOfBirth, address, enrollmentDate, status, classId, parentInfo } = studentData;
      db.run(
        'INSERT INTO students (firstName, lastName, email, phone, dateOfBirth, address, enrollmentDate, status, classId, parentInfo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [firstName, lastName, email, phone, dateOfBirth, address, enrollmentDate, status, classId, JSON.stringify(parentInfo)],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...studentData });
        }
      );
    });
  });

  ipcMain.handle('db:students:update', async (event, { id, data }) => {
    return new Promise((resolve, reject) => {
      // Construire la requête SQL dynamiquement en fonction des champs fournis
      const updates = [];
      const values = [];
      
      if (data.firstName !== undefined) {
        updates.push('firstName = ?');
        values.push(data.firstName);
      }
      if (data.lastName !== undefined) {
        updates.push('lastName = ?');
        values.push(data.lastName);
      }
      if (data.email !== undefined) {
        updates.push('email = ?');
        values.push(data.email);
      }
      if (data.phone !== undefined) {
        updates.push('phone = ?');
        values.push(data.phone);
      }
      if (data.dateOfBirth !== undefined) {
        updates.push('dateOfBirth = ?');
        values.push(data.dateOfBirth);
      }
      if (data.address !== undefined) {
        updates.push('address = ?');
        values.push(data.address);
      }
      if (data.enrollmentDate !== undefined) {
        updates.push('enrollmentDate = ?');
        values.push(data.enrollmentDate);
      }
      if (data.status !== undefined) {
        updates.push('status = ?');
        values.push(data.status);
      }
      if (data.classId !== undefined) {
        updates.push('classId = ?');
        values.push(data.classId);
      }
      if (data.parentInfo !== undefined) {
        updates.push('parentInfo = ?');
        values.push(JSON.stringify(data.parentInfo));
      }

      if (updates.length === 0) {
        reject(new Error('Aucun champ à mettre à jour'));
        return;
      }

      values.push(id);
      const query = `UPDATE students SET ${updates.join(', ')} WHERE id = ?`;

      db.run(query, values, function(err) {
        if (err) reject(err);
        else resolve({ id, ...data });
      });
    });
  });

  ipcMain.handle('db:students:delete', async (event, id) => {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM students WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve({ id });
      });
    });
  });

  // Gestionnaires IPC pour les paiements
  ipcMain.handle('db:payments:getAll', async () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM payments', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  });

  ipcMain.handle('db:payments:create', async (event, paymentData) => {
    return new Promise((resolve, reject) => {
      const { studentId, amount, date, type, status, notes, currency } = paymentData;
      db.run(
        'INSERT INTO payments (studentId, amount, date, type, status, notes, currency) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [studentId, amount, date, type, status, notes, currency],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...paymentData });
        }
      );
    });
  });

  ipcMain.handle('db:payments:update', async (event, { id, ...paymentData }) => {
    return new Promise((resolve, reject) => {
      const { studentId, amount, date, type, status, notes, currency } = paymentData;
      db.run(
        'UPDATE payments SET studentId = ?, amount = ?, date = ?, type = ?, status = ?, notes = ?, currency = ? WHERE id = ?',
        [studentId, amount, date, type, status, notes, currency, id],
        function(err) {
          if (err) reject(err);
          else resolve({ id, ...paymentData });
        }
      );
    });
  });

  ipcMain.handle('db:payments:delete', async (event, id) => {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM payments WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve({ id });
      });
    });
  });

  // IPC handler to get all available payment months (YYYY-MM)
  ipcMain.handle('db:payments:getAvailableMonths', async () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT date FROM payments', [], (err, rows) => {
        if (err) return reject(err);
        const monthSet = new Set();
        rows.forEach(row => {
          if (row.date) {
            const month = row.date.slice(0, 7);
            monthSet.add(month);
          }
        });
        // Sort months descending (most recent first)
        resolve(Array.from(monthSet).sort((a, b) => b.localeCompare(a)));
      });
    });
  });

  // Gestionnaires IPC pour les notes
  ipcMain.handle('db:grades:getAll', async () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM grades', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  });

  ipcMain.handle('db:grades:create', async (event, gradeData) => {
    return new Promise((resolve, reject) => {
      const { studentId, subjectId, value, term, evaluationType, coefficient, notes } = gradeData;
      db.run(
        'INSERT INTO grades (studentId, subjectId, value, term, evaluationType, coefficient, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [studentId, subjectId, value, term, evaluationType, coefficient || 1, notes || null],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...gradeData });
        }
      );
    });
  });

  ipcMain.handle('db:grades:update', async (event, { id, ...gradeData }) => {
    return new Promise((resolve, reject) => {
      const { studentId, subjectId, value, term, evaluationType, coefficient, notes } = gradeData;
      db.run(
        'UPDATE grades SET studentId = ?, subjectId = ?, value = ?, term = ?, evaluationType = ?, coefficient = ?, notes = ? WHERE id = ?',
        [studentId, subjectId, value, term, evaluationType, coefficient || 1, notes || null, id],
        function(err) {
          if (err) reject(err);
          else resolve({ id, ...gradeData });
        }
      );
    });
  });

  ipcMain.handle('db:grades:delete', async (event, id) => {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM grades WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve({ id });
      });
    });
  });

  // Gestionnaire IPC pour générer les résultats de classe
  ipcMain.handle('db:grades:getClassResults', async (event, { className, term }) => {
    return new Promise((resolve, reject) => {
      // 1. Récupérer l'ID de la classe
      db.get('SELECT id FROM classes WHERE name = ?', [className], (err, classRow) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!classRow) {
          reject(new Error('Classe non trouvée'));
          return;
        }
        
        const classId = classRow.id;
        
        // 2. Récupérer tous les étudiants de cette classe
        db.all('SELECT id, firstName, lastName FROM students WHERE classId = ?', [classId], (err, students) => {
          if (err) {
            reject(err);
            return;
          }
          
          // 3. Récupérer toutes les matières pour cette classe
          db.all('SELECT id, subjectName as name, coefficient FROM class_subjects WHERE classId = ?', [classId], (err, subjects) => {
            if (err) {
              reject(err);
              return;
            }
            
            // 4. Récupérer toutes les notes pour ces étudiants dans ce trimestre
            const studentIds = students.map(s => s.id);
            const placeholders = studentIds.map(() => '?').join(',');
            
            db.all(
              `SELECT * FROM grades WHERE studentId IN (${placeholders}) AND term = ?`,
              [...studentIds, term],
              (err, grades) => {
                if (err) {
                  reject(err);
                  return;
                }
                
                // 5. Calculer les moyennes et le classement pour chaque élève
                const results = students.map(student => {
                  // Filtrer les notes de cet étudiant
                  const studentGrades = grades.filter(g => g.studentId === student.id);
                  
                  // Calculer la moyenne pour chaque matière
                  const subjectResults = {};
                  let totalPoints = 0;
                  let totalCoef = 0;
                  
                  subjects.forEach(subject => {
                    // Filtrer les notes de l'étudiant pour cette matière
                    const subjectGrades = studentGrades.filter(g => g.subjectId === subject.id);
                    
                    if (subjectGrades.length > 0) {
                      // Calculer la moyenne pour cette matière
                      const sum = subjectGrades.reduce((acc, grade) => acc + grade.value, 0);
                      const avg = sum / subjectGrades.length;
                      
                      subjectResults[subject.name] = {
                        average: avg,
                        coefficient: subject.coefficient
                      };
                      
                      // Ajouter les points pondérés à la moyenne générale
                      totalPoints += avg * subject.coefficient;
                      totalCoef += subject.coefficient;
                    }
                  });
                  
                  // Calculer la moyenne générale
                  const generalAverage = totalCoef > 0 ? totalPoints / totalCoef : 0;
                  
                  return {
                    studentId: student.id,
                    studentName: `${student.firstName} ${student.lastName}`,
                    average: generalAverage,
                    rank: 0, // Sera calculé après
                    subjects: subjectResults,
                    status: generalAverage >= 10 ? 'Admis' : 'Non admis'
                  };
                });
                
                // 6. Attribuer les rangs
                results.sort((a, b) => b.average - a.average);
                
                let currentRank = 1;
                let prevAverage = -1;
                let sameRankCount = 0;
                
                results.forEach((result, index) => {
                  // Si l'élève a la même moyenne que le précédent, il a le même rang
                  if (result.average === prevAverage) {
                    result.rank = currentRank;
                    sameRankCount++;
                  } else {
                    // Sinon, son rang est égal à sa position + 1
                    currentRank = index + 1;
                    result.rank = currentRank;
                    sameRankCount = 0;
                  }
                  
                  prevAverage = result.average;
                });
                
                resolve(results);
              }
            );
          });
        });
      });
    });
  });

  // Gestionnaires IPC pour les matières
  ipcMain.handle('db:subjects:getAll', async () => {
    return new Promise((resolve, reject) => {
      // Récupère toutes les matières principales
      db.all('SELECT * FROM subjects', [], (err, rows) => {
        if (err) reject(err);
        else {
          // Récupère aussi les matières de classe pour une liste complète
          db.all('SELECT id, subjectName as name, coefficient, classId, hoursPerWeek FROM class_subjects', [], (err2, classSubjects) => {
            if (err2) reject(err2);
            else {
              // Dédoublonnage : utiliser un Map pour conserver une seule entrée par ID
              const subjectsMap = new Map();
              
              // Ajouter les matières de la table subjects
              rows.forEach(subject => {
                subjectsMap.set(subject.id, subject);
              });
              
              // Ajouter les matières de class_subjects sans dupliquer celles qui existent déjà
              classSubjects.forEach(subject => {
                if (!subjectsMap.has(subject.id)) {
                  subjectsMap.set(subject.id, subject);
                }
              });
              
              // Convertir la Map en array de matières uniques
              const allSubjects = Array.from(subjectsMap.values());
              console.log('getAllSubjects returning deduplicated:', JSON.stringify(allSubjects));
              resolve(allSubjects);
            }
          });
        }
      });
    });
  });

  ipcMain.handle('db:subjects:create', async (event, subjectData) => {
    return new Promise((resolve, reject) => {
      // Transaction pour insérer dans les deux tables
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
  
        // 1. Insérer dans la table subjects (nouvelle structure avec teacherId)
        db.run(
          'INSERT INTO subjects (name, coefficient, classId, teacherId, hoursPerWeek) VALUES (?, ?, ?, ?, ?)',
          [subjectData.name, subjectData.coefficient, subjectData.classId, subjectData.teacherId, subjectData.hoursPerWeek || 0],
          function(err) {
            if (err) {
              db.run('ROLLBACK');
              console.error('Erreur lors de l\'insertion dans subjects:', err);
              reject(err);
              return;
            }
            
            const subjectId = this.lastID;
            
            // 2. Insérer aussi dans class_subjects (ancienne structure)
            db.run(
              'INSERT INTO class_subjects (classId, subjectName, coefficient, hoursPerWeek) VALUES (?, ?, ?, ?)',
              [subjectData.classId, subjectData.name, subjectData.coefficient, subjectData.hoursPerWeek || 0],
              function(err) {
                if (err) {
                  db.run('ROLLBACK');
                  console.error('Erreur lors de l\'insertion dans class_subjects:', err);
                  reject(err);
                } else {
                  db.run('COMMIT');
                  console.log(`Matière ajoutée avec succès: ${subjectData.name} (ID: ${subjectId})`);
                  resolve({ id: subjectId, ...subjectData });
                }
              }
            );
          }
        );
      });
    });
  });

  // Récupérer toutes les matières d'une classe spécifique
  ipcMain.handle('db:subjects:getByClassId', async (event, classId) => {
    return new Promise((resolve, reject) => {
      // Joindre les tables subjects et teachers pour obtenir les noms des professeurs
      db.all(`
        SELECT s.id, s.name, s.coefficient, s.classId, s.teacherId, s.hoursPerWeek,
               t.firstName || ' ' || t.lastName AS teacherName
        FROM subjects s
        LEFT JOIN teachers t ON s.teacherId = t.id
        WHERE s.classId = ?
      `, [classId], (err, rows) => {
        if (err) {
          console.error('Erreur lors de la récupération des matières:', err);
          reject(err);
        } else {
          console.log(`Récupération de ${rows.length} matières pour la classe ${classId}`);
          resolve(rows);
        }
      });
    });
  });
  
  // Récupérer toutes les matières avec informations complètes (classes et professeurs)
  ipcMain.handle('db:subjects:getAllDetailed', async () => {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT s.id, s.name, s.coefficient, s.classId, s.teacherId, s.hoursPerWeek,
               t.firstName || ' ' || t.lastName AS teacherName,
               c.name AS className
        FROM subjects s
        LEFT JOIN teachers t ON s.teacherId = t.id
        LEFT JOIN classes c ON s.classId = c.id
      `, [], (err, rows) => {
        if (err) {
          console.error('Erreur lors de la récupération de toutes les matières:', err);
          reject(err);
        } else {
          console.log(`Récupération de ${rows.length} matières au total`);
          resolve(rows);
        }
      });
    });
  });
  
  // Récupérer toutes les matières assignées à un professeur spécifique
  ipcMain.handle('db:subjects:getByTeacherId', async (event, teacherId) => {
    return new Promise((resolve, reject) => {
      // Joindre les tables subjects et classes pour obtenir les noms des classes
      db.all(`
        SELECT s.id, s.name, s.coefficient, s.classId, s.teacherId, s.hoursPerWeek,
               c.name AS className
        FROM subjects s
        LEFT JOIN classes c ON s.classId = c.id
        WHERE s.teacherId = ?
      `, [teacherId], (err, rows) => {
        if (err) {
          console.error(`Erreur lors de la récupération des matières pour le professeur ${teacherId}:`, err);
          reject(err);
        } else {
          console.log(`Récupération de ${rows.length} matières pour le professeur ${teacherId}`);
          resolve(rows);
        }
      });
    });
  });

  // Gestionnaires IPC pour les présences
  ipcMain.handle('db:attendances:getAll', async () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM attendances', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  });

  ipcMain.handle('db:attendances:create', async (event, attendanceData) => {
    return new Promise((resolve, reject) => {
      const { studentId, date, status, notes } = attendanceData;
      db.run(
        'INSERT INTO attendances (studentId, date, status, notes) VALUES (?, ?, ?, ?)',
        [studentId, date, status, notes],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...attendanceData });
        }
      );
    });
  });

  // Handlers pour les professeurs
  ipcMain.handle('db:teachers:getAll', async () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM teachers', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  });

  ipcMain.handle('db:teachers:getById', async (event, id) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM teachers WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  });

  ipcMain.handle('db:teachers:create', async (event, teacherData) => {
    return new Promise((resolve, reject) => {
      const { firstName, lastName, email, phone, address, hourlyRate, speciality } = teacherData;
      db.run(
        'INSERT INTO teachers (firstName, lastName, email, phone, address, hourlyRate, speciality) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [firstName, lastName, email, phone, address, hourlyRate, speciality],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...teacherData });
        }
      );
    });
  });

  ipcMain.handle('db:teachers:update', async (event, { id, ...teacherData }) => {
    return new Promise((resolve, reject) => {
      const fields = Object.keys(teacherData);
      const values = Object.values(teacherData);
      
      if (fields.length === 0) {
        resolve({ id });
        return;
      }
      
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const query = `UPDATE teachers SET ${setClause} WHERE id = ?`;
      
      db.run(query, [...values, id], function(err) {
        if (err) reject(err);
        else resolve({ id, ...teacherData });
      });
    });
  });

  ipcMain.handle('db:teachers:delete', async (event, id) => {
    return new Promise((resolve, reject) => {
      // Vérifier d'abord si le professeur est associé à des matières
      db.get('SELECT COUNT(*) as count FROM subjects WHERE teacherId = ?', [id], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (row.count > 0) {
          reject(new Error('Impossible de supprimer ce professeur car il est associé à des matières.'));
          return;
        }
        
        // Si aucune matière n'est associée, supprimer le professeur
        db.run('DELETE FROM teachers WHERE id = ?', [id], function(err) {
          if (err) reject(err);
          else resolve({ success: true, id });
        });
      });
    });
  });

  ipcMain.handle('db:teachers:getSubjects', async (event, teacherId) => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM subjects WHERE teacherId = ?', [teacherId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  });

  ipcMain.handle('db:teachers:calculateSalary', async (event, { teacherId, month }) => {
    return new Promise((resolve, reject) => {
      // Récupérer le taux horaire du professeur
      db.get('SELECT hourlyRate FROM teachers WHERE id = ?', [teacherId], (err, teacher) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!teacher) {
          reject(new Error('Professeur non trouvé'));
          return;
        }
        
        // Récupérer les heures de travail pointées pour ce mois
        const monthStart = month + '-01';
        const nextMonth = parseInt(month.split('-')[1]) + 1;
        const year = month.split('-')[0];
        const monthEnd = `${year}-${nextMonth.toString().padStart(2, '0')}-01`;
        
        db.all('SELECT * FROM teacher_work_hours WHERE teacherId = ? AND date >= ? AND date < ?', 
          [teacherId, monthStart, monthEnd], 
          (err, workHours) => {
            if (err) {
              reject(err);
              return;
            }
            
            // Calculer le total des heures et le salaire
            const totalHours = workHours.reduce((sum, wh) => sum + wh.hours, 0);
            const salary = totalHours * teacher.hourlyRate;
            
            // Récupérer les matières enseignées par ce professeur
            db.all('SELECT * FROM subjects WHERE teacherId = ?', [teacherId], (err, subjects) => {
              if (err) {
                reject(err);
                return;
              }
              
              // Récupérer les heures par matière
              const subjectHours = [];
              if (subjects.length > 0) {
                let processed = 0;
                subjects.forEach(subject => {
                  db.all('SELECT SUM(hours) as totalHours FROM teacher_work_hours WHERE teacherId = ? AND subjectId = ? AND date >= ? AND date < ?',
                    [teacherId, subject.id, monthStart, monthEnd],
                    (err, result) => {
                      processed++;
                      if (!err && result && result[0]) {
                        subjectHours.push({
                          id: subject.id,
                          name: subject.name,
                          hours: result[0].totalHours || 0
                        });
                      }
                      
                      if (processed === subjects.length) {
                        // Retourner les statistiques complètes
                        resolve({
                          teacherId,
                          month,
                          totalHours,
                          hourlyRate: teacher.hourlyRate,
                          salary,
                          subjectHours
                        });
                      }
                    }
                  );
                });
              } else {
                // Retourner les statistiques sans détails par matière
                resolve({
                  teacherId,
                  month,
                  totalHours,
                  hourlyRate: teacher.hourlyRate,
                  salary,
                  subjectHours: []
                });
              }
            });
          }
        );
      });
    });
  });

  // Handlers pour la gestion des heures de travail des professeurs
  ipcMain.handle('db:teacherWorkHours:getAll', async (event, teacherId) => {
    return new Promise((resolve, reject) => {
      const query = teacherId 
        ? 'SELECT twh.*, s.name as subjectName FROM teacher_work_hours twh LEFT JOIN subjects s ON twh.subjectId = s.id WHERE twh.teacherId = ? ORDER BY twh.date DESC'
        : 'SELECT twh.*, s.name as subjectName FROM teacher_work_hours twh LEFT JOIN subjects s ON twh.subjectId = s.id ORDER BY twh.date DESC';
      
      const params = teacherId ? [teacherId] : [];
      
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  });
  
  ipcMain.handle('db:teacherWorkHours:getByTeacherId', async (event, teacherId) => {
    return new Promise((resolve, reject) => {
      if (!teacherId) {
        resolve([]);
        return;
      }
      
      const query = 'SELECT twh.*, s.name as subjectName FROM teacher_work_hours twh LEFT JOIN subjects s ON twh.subjectId = s.id WHERE twh.teacherId = ? ORDER BY twh.date DESC';
      
      db.all(query, [teacherId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  });

  ipcMain.handle('db:teacherWorkHours:create', async (event, workHoursData) => {
    return new Promise((resolve, reject) => {
      const { teacherId, hours, date, subjectId, notes } = workHoursData;
      
      db.run(
        'INSERT INTO teacher_work_hours (teacherId, hours, date, subjectId, notes) VALUES (?, ?, ?, ?, ?)',
        [teacherId, hours, date, subjectId || null, notes || null],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...workHoursData });
        }
      );
    });
  });

  ipcMain.handle('db:teacherWorkHours:update', async (event, { id, ...workHoursData }) => {
    return new Promise((resolve, reject) => {
      const fields = Object.keys(workHoursData);
      const values = Object.values(workHoursData);
      
      if (fields.length === 0) {
        resolve({ id });
        return;
      }
      
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const query = `UPDATE teacher_work_hours SET ${setClause} WHERE id = ?`;
      
      db.run(query, [...values, id], function(err) {
        if (err) reject(err);
        else resolve({ id, ...workHoursData });
      });
    });
  });

  ipcMain.handle('db:teacherWorkHours:delete', async (event, id) => {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM teacher_work_hours WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve({ success: true, id });
      });
    });
  });

  ipcMain.handle('db:teacherStats:get', async (event, teacherId) => {
    return new Promise((resolve, reject) => {
      // Récupérer le taux horaire du professeur
      db.get('SELECT hourlyRate FROM teachers WHERE id = ?', [teacherId], (err, teacher) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!teacher) {
          reject(new Error('Professeur non trouvé'));
          return;
        }
        
        // Récupérer les heures de travail pointées pour ce mois
        const currentDate = new Date();
        const currentMonth = currentDate.toISOString().substring(0, 7);
        const monthStart = currentMonth + '-01';
        const nextMonth = (currentDate.getMonth() + 1) % 12 + 1;
        const year = currentDate.getMonth() === 11 ? currentDate.getFullYear() + 1 : currentDate.getFullYear();
        const monthEnd = `${year}-${nextMonth.toString().padStart(2, '0')}-01`;
        
        db.all('SELECT * FROM teacher_work_hours WHERE teacherId = ? AND date >= ? AND date < ?', 
          [teacherId, monthStart, monthEnd], 
          (err, workHours) => {
            if (err) {
              reject(err);
              return;
            }
            
            // Calculer le total des heures et le salaire
            const totalHoursThisMonth = workHours.reduce((sum, wh) => sum + wh.hours, 0);
            const totalEarningsThisMonth = totalHoursThisMonth * teacher.hourlyRate;
            
            // Récupérer les matières enseignées par ce professeur
            db.all('SELECT * FROM subjects WHERE teacherId = ?', [teacherId], (err, subjects) => {
              if (err) {
                reject(err);
                return;
              }
              
              // Récupérer les heures par matière
              const subjectHours = [];
              if (subjects.length > 0) {
                let processed = 0;
                subjects.forEach(subject => {
                  db.all('SELECT SUM(hours) as totalHours FROM teacher_work_hours WHERE teacherId = ? AND subjectId = ? AND date >= ? AND date < ?',
                    [teacherId, subject.id, monthStart, monthEnd],
                    (err, result) => {
                      processed++;
                      if (!err && result && result[0]) {
                        subjectHours.push({
                          id: subject.id,
                          name: subject.name,
                          hours: result[0].totalHours || 0
                        });
                      }
                      
                      if (processed === subjects.length) {
                        // Retourner les statistiques complètes
                        resolve({
                          totalHoursThisMonth,
                          totalEarningsThisMonth,
                          hourlyRate: teacher.hourlyRate,
                          subjectHours
                        });
                      }
                    }
                  );
                });
              } else {
                // Retourner les statistiques sans détails par matière
                resolve({
                  totalHoursThisMonth,
                  totalEarningsThisMonth,
                  hourlyRate: teacher.hourlyRate,
                  subjectHours: []
                });
              }
            });
          }
        );
      });
    });
  });
  
  ipcMain.handle('db:teacherWorkHours:getStats', async (event, teacherId, month, year) => {
    return new Promise((resolve, reject) => {
      // Récupérer le taux horaire du professeur
      db.get('SELECT hourlyRate FROM teachers WHERE id = ?', [teacherId], (err, teacher) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!teacher) {
          reject(new Error('Professeur non trouvé'));
          return;
        }
        
        // Définir la période pour le filtrage des données
        let monthStart, monthEnd;
        if (month && year) {
          // Si mois et année sont spécifiés, utiliser ces valeurs
          const monthNum = parseInt(month, 10);
          const yearNum = parseInt(year, 10);
          monthStart = `${yearNum}-${monthNum.toString().padStart(2, '0')}-01`;
          const nextMonth = monthNum === 12 ? 1 : monthNum + 1;
          const nextYear = monthNum === 12 ? yearNum + 1 : yearNum;
          monthEnd = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`;
        } else {
          // Sinon, utiliser le mois en cours
          const currentDate = new Date();
          const currentMonth = currentDate.toISOString().substring(0, 7);
          monthStart = currentMonth + '-01';
          const nextMonth = (currentDate.getMonth() + 1) % 12 + 1;
          const year = currentDate.getMonth() === 11 ? currentDate.getFullYear() + 1 : currentDate.getFullYear();
          monthEnd = `${year}-${nextMonth.toString().padStart(2, '0')}-01`;
        }
        
        // Récupérer les heures travaillées pour la période spécifiée
        db.all('SELECT twh.*, s.name as subjectName FROM teacher_work_hours twh LEFT JOIN subjects s ON twh.subjectId = s.id WHERE twh.teacherId = ? AND twh.date >= ? AND twh.date < ?', 
          [teacherId, monthStart, monthEnd], 
          (err, workHours) => {
            if (err) {
              reject(err);
              return;
            }
            
            // Calculer le total des heures et le salaire
            const totalHoursThisMonth = workHours.reduce((sum, wh) => sum + wh.hours, 0);
            const totalEarningsThisMonth = totalHoursThisMonth * teacher.hourlyRate;
            
            // Regrouper les heures par matière
            const subjectMap = new Map();
            workHours.forEach(wh => {
              if (wh.subjectId) {
                const subjectKey = wh.subjectId.toString();
                if (!subjectMap.has(subjectKey)) {
                  subjectMap.set(subjectKey, {
                    id: wh.subjectId,
                    name: wh.subjectName || `Matière #${wh.subjectId}`,
                    hours: 0
                  });
                }
                subjectMap.get(subjectKey).hours += wh.hours;
              }
            });
            
            // Convertir la map en tableau pour la réponse
            const subjectHours = Array.from(subjectMap.values());
            
            // Retourner les statistiques complètes
            resolve({
              totalHoursThisMonth,
              totalEarningsThisMonth,
              hourlyRate: teacher.hourlyRate,
              subjectHours
            });
          }
        );
      });
    });
  });

  // Handler pour les statistiques du dashboard
ipcMain.handle('db:dashboard:getStats', async () => {
  try {
    // Récupérer le nombre total d'élèves
    const totalStudentsPromise = new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM students WHERE status = "active"', (err, row) => {
        if (err) reject(err);
        else resolve(row?.count || 0);
      });
    });
    
    // Récupérer les présences d'aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    const attendanceTodayPromise = new Promise((resolve, reject) => {
      db.all('SELECT status FROM attendances WHERE date = ?', [today], (err, rows) => {
        if (err) reject(err);
        else {
          const present = rows?.filter(r => r.status === 'present').length || 0;
          const absent = rows?.filter(r => r.status === 'absent').length || 0;
          const late = rows?.filter(r => r.status === 'late').length || 0;
          resolve({ present, absent, late });
        }
      });
    });
    
    // Récupérer les paiements du mois en cours
    const thisMonth = new Date().toISOString().substring(0, 7);
    const paymentsPromise = new Promise((resolve, reject) => {
      db.all('SELECT amount FROM payments WHERE date LIKE ?', [`${thisMonth}%`], (err, rows) => {
        if (err) reject(err);
        else {
          const total = rows?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
          resolve(total);
        }
      });
    });
    
    // Récupérer le nombre de notes récentes (du mois en cours)
    const recentGradesPromise = new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM grades WHERE created_at >= datetime("now", "-30 days")', (err, row) => {
        if (err) reject(err);
        else resolve(row?.count || 0);
      });
    });
    
    // Attendre toutes les promesses
    const [totalStudents, attendanceToday, paymentsThisMonth, recentGrades] = await Promise.all([
      totalStudentsPromise,
      attendanceTodayPromise,
      paymentsPromise,
      recentGradesPromise
    ]);
    
    return {
      totalStudents,
      attendanceToday,
      paymentsThisMonth,
      recentGrades
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques du dashboard:', error);
    throw error;
  }
});

ipcMain.handle('db:students:getRecent', async (event, limit = 5) => {
  return new Promise((resolve, reject) => {
    // Utiliser la requête sans LIMIT paramétré
    db.all('SELECT * FROM students ORDER BY created_at DESC', [], (err, rows) => {
      if (err) {
        console.error('Erreur lors de la récupération des étudiants récents:', err);
        reject(err);
      } else {
        // Convertir la limite en nombre sécuritaire et limiter les résultats en JavaScript
        let limitNum = 5; // Valeur par défaut
        try {
          if (limit) {
            const parsed = parseInt(limit, 10);
            if (!isNaN(parsed) && parsed > 0) {
              limitNum = parsed;
            }
          }
        } catch (e) {
          console.log('Erreur lors de la conversion de limit:', e);
        }
        
        console.log(`Récupération de ${limitNum} étudiants récents sur ${rows.length} trouvés`);
        
        // Limiter les résultats à la limite spécifiée
        const limitedRows = rows.slice(0, limitNum);
        resolve(limitedRows);
      }
    });
  });
});
}

module.exports = {
  setupDatabaseIPC
};
