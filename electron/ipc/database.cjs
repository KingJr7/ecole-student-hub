const { ipcMain } = require('electron');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let db;

function runMigrations(db) {
  const tables = [
    'classes', 'students', 'teachers', 'payments', 
    'grades', 'subjects', 'attendances', 'class_subjects'
  ];
  const columns = [
    { name: 'supabase_id', def: 'TEXT UNIQUE' },
    { name: 'last_modified', def: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    { name: 'needs_sync', def: 'BOOLEAN DEFAULT 0' },
    { name: 'is_deleted', def: 'BOOLEAN DEFAULT 0' }
  ];

  db.serialize(() => {
    tables.forEach(table => {
      db.all(`PRAGMA table_info(${table})`, (err, existingColumns) => {
        if (err) {
          console.error(`Error fetching info for table ${table}:`, err);
          return;
        }
        const existingColumnNames = existingColumns.map(c => c.name);
        columns.forEach(column => {
          if (!existingColumnNames.includes(column.name)) {
            db.run(`ALTER TABLE ${table} ADD COLUMN ${column.name} ${column.def}`, (alterErr) => {
              if (alterErr) {
                // Ignorer l'erreur si la colonne existe déjà (cas de concurrence)
                if (!alterErr.message.includes('duplicate column name')) {
                  console.error(`Error adding column ${column.name} to ${table}:`, alterErr);
                }
              } else {
                console.log(`Added column ${column.name} to ${table}`);
              }
            });
          }
        });
      });
    });
  });
}

function initializeDatabase() {
  const db = new sqlite3.Database(path.join(__dirname, '../../database.sqlite'), (err) => {
    if (err) {
      console.error('Erreur lors de la connexion à la base de données:', err);
    } else {
      console.log('Connecté à la base de données SQLite');
      db.serialize(() => {
        db.run(`PRAGMA foreign_keys = ON;`);

        db.run(`CREATE TABLE IF NOT EXISTS classes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          supabase_id TEXT UNIQUE,
          last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
          needs_sync BOOLEAN DEFAULT 0,
          is_deleted BOOLEAN DEFAULT 0
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
          supabase_id TEXT UNIQUE,
          last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
          needs_sync BOOLEAN DEFAULT 0,
          is_deleted BOOLEAN DEFAULT 0,
          FOREIGN KEY (classId) REFERENCES classes (id)
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS teachers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          firstName TEXT NOT NULL,
          lastName TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          hireDate TEXT,
          specialty TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          supabase_id TEXT UNIQUE,
          last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
          needs_sync BOOLEAN DEFAULT 0,
          is_deleted BOOLEAN DEFAULT 0
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
          supabase_id TEXT UNIQUE,
          last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
          needs_sync BOOLEAN DEFAULT 0,
          is_deleted BOOLEAN DEFAULT 0,
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
          supabase_id TEXT UNIQUE,
          last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
          needs_sync BOOLEAN DEFAULT 0,
          is_deleted BOOLEAN DEFAULT 0,
          FOREIGN KEY (studentId) REFERENCES students (id),
          FOREIGN KEY (subjectId) REFERENCES subjects (id)
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS subjects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          coefficient REAL,
          classId INTEGER,
          teacherId INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          supabase_id TEXT UNIQUE,
          last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
          needs_sync BOOLEAN DEFAULT 0,
          is_deleted BOOLEAN DEFAULT 0
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS attendances (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          studentId INTEGER,
          date TEXT NOT NULL,
          status TEXT NOT NULL,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          supabase_id TEXT UNIQUE,
          last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
          needs_sync BOOLEAN DEFAULT 0,
          is_deleted BOOLEAN DEFAULT 0,
          FOREIGN KEY (studentId) REFERENCES students (id)
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY,
          schoolName TEXT,
          paymentMonths TEXT,
          loggedIn INTEGER DEFAULT 0,
          userRole TEXT,
          schoolId TEXT
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS class_subjects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          classId INTEGER NOT NULL,
          subjectName TEXT NOT NULL,
          coefficient REAL NOT NULL,
          hoursPerWeek INTEGER,
          supabase_id TEXT UNIQUE,
          last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
          needs_sync BOOLEAN DEFAULT 0,
          is_deleted BOOLEAN DEFAULT 0,
          FOREIGN KEY (classId) REFERENCES classes(id)
        )`);
        
        // Migration : Ajouter les colonnes manquantes à la table grades si elles n'existent pas
        db.all("PRAGMA table_info(grades)", [], (err, rows) => {
          if (err) {
            console.error('Erreur lors de la vérification des colonnes de la table grades:', err);
            return;
          }
        });
        
        // Insérer une ligne par défaut si la table est vide
        db.get('SELECT COUNT(*) as count FROM settings', (err, row) => {
          if (!err && row.count === 0) {
            db.run('INSERT INTO settings (id, schoolName, paymentMonths) VALUES (1, "Nom de l\'école", "[\"2025-01\",\"2025-02\",\"2025-03\"]")');
          }
        });
      });

      // Exécuter les migrations pour ajouter les colonnes de synchronisation si elles n'existent pas
      runMigrations(db);
    }
  });
  return db;
}

function setupDatabaseIPC() {
  const db = initializeDatabase();

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

  // Handler pour mettre à jour les settings
  ipcMain.handle('db:settings:update', async (event, data) => {
    return new Promise((resolve, reject) => {
      const { schoolName, paymentMonths } = data;
      db.run('UPDATE settings SET schoolName = ?, paymentMonths = ? WHERE id = 1', [schoolName, JSON.stringify(paymentMonths)], function(err) {
        if (err) {
          reject(err);
        } else if (this.changes === 0) {
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

  // #region Classes
  ipcMain.handle('db:classes:getAll', async () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM classes WHERE is_deleted = 0 ORDER BY name', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  });

  ipcMain.handle('db:classes:create', async (event, classData) => {
    return new Promise((resolve, reject) => {
      db.run('INSERT INTO classes (name, last_modified, needs_sync) VALUES (?, CURRENT_TIMESTAMP, 1)', [classData.name], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...classData });
      });
    });
  });

  ipcMain.handle('db:classes:update', async (event, { id, data }) => {
    return new Promise((resolve, reject) => {
      db.run('UPDATE classes SET name = ?, last_modified = CURRENT_TIMESTAMP, needs_sync = 1 WHERE id = ?', [data.name, id], function(err) {
        if (err) reject(err);
        else resolve({ id, ...data });
      });
    });
  });

  ipcMain.handle('db:classes:delete', async (event, id) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM students WHERE classId = ? AND is_deleted = 0', [id], (err, row) => {
        if (err) return reject(err);
        if (row.count > 0) return reject(new Error('Impossible de supprimer une classe qui contient des étudiants'));
        
        const query = 'UPDATE classes SET is_deleted = 1, last_modified = CURRENT_TIMESTAMP, needs_sync = 1 WHERE id = ?';
        db.run(query, [id], function(err) {
          if (err) reject(err);
          else resolve({ id });
        });
      });
    });
  });
  // #endregion

  // #region Students
  ipcMain.handle('db:students:getAll', async () => {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT s.*, c.name as className 
        FROM students s 
        LEFT JOIN classes c ON s.classId = c.id
        WHERE s.is_deleted = 0
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
      const query = `
        INSERT INTO students 
        (firstName, lastName, email, phone, dateOfBirth, address, enrollmentDate, status, classId, parentInfo, last_modified, needs_sync)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1)
      `;
      db.run(
        query,
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
      const updates = [];
      const values = [];
      
      Object.keys(data).forEach(key => {
        if (data[key] !== undefined) {
          updates.push(`${key} = ?`);
          values.push(key === 'parentInfo' ? JSON.stringify(data[key]) : data[key]);
        }
      });

      if (updates.length === 0) {
        return reject(new Error('Aucun champ à mettre à jour'));
      }

      updates.push('last_modified = CURRENT_TIMESTAMP', 'needs_sync = 1');
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
      const query = 'UPDATE students SET is_deleted = 1, last_modified = CURRENT_TIMESTAMP, needs_sync = 1 WHERE id = ?';
      db.run(query, [id], function(err) {
        if (err) reject(err);
        else resolve({ id });
      });
    });
  });

  ipcMain.handle('db:students:getRecent', async () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM students WHERE is_deleted = 0 ORDER BY id DESC LIMIT 5', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  });
  // #endregion

  // #region Teachers
  ipcMain.handle('db:teachers:getAll', async () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM teachers WHERE is_deleted = 0', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  });

  ipcMain.handle('db:teachers:create', async (event, teacherData) => {
    return new Promise((resolve, reject) => {
      const { firstName, lastName, email, phone, hireDate, specialty } = teacherData;
      const query = `
        INSERT INTO teachers 
        (firstName, lastName, email, phone, hireDate, specialty, last_modified, needs_sync)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1)
      `;
      db.run(query, [firstName, lastName, email, phone, hireDate, specialty], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...teacherData });
      });
    });
  });

  ipcMain.handle('db:teachers:update', async (event, { id, data }) => {
    return new Promise((resolve, reject) => {
      const updates = [];
      const values = [];
      
      Object.keys(data).forEach(key => {
        if (data[key] !== undefined) {
          updates.push(`${key} = ?`);
          values.push(data[key]);
        }
      });

      if (updates.length === 0) {
        return reject(new Error('Aucun champ à mettre à jour'));
      }

      updates.push('last_modified = CURRENT_TIMESTAMP', 'needs_sync = 1');
      values.push(id);

      const query = `UPDATE teachers SET ${updates.join(', ')} WHERE id = ?`;

      db.run(query, values, function(err) {
        if (err) reject(err);
        else resolve({ id, ...data });
      });
    });
  });

  ipcMain.handle('db:teachers:delete', async (event, id) => {
    return new Promise((resolve, reject) => {
      const query = 'UPDATE teachers SET is_deleted = 1, last_modified = CURRENT_TIMESTAMP, needs_sync = 1 WHERE id = ?';
      db.run(query, [id], function(err) {
        if (err) reject(err);
        else resolve({ id });
      });
    });
  });
  // #endregion

  // #region Payments
  ipcMain.handle('db:payments:getAll', async () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM payments WHERE is_deleted = 0', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  });

  ipcMain.handle('db:payments:create', async (event, paymentData) => {
    return new Promise((resolve, reject) => {
      const { studentId, amount, date, type, status, notes, currency } = paymentData;
      const query = `
        INSERT INTO payments 
        (studentId, amount, date, type, status, notes, currency, last_modified, needs_sync)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1)
      `;
      db.run(query, [studentId, amount, date, type, status, notes, currency], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...paymentData });
      });
    });
  });

  ipcMain.handle('db:payments:update', async (event, { id, ...paymentData }) => {
    return new Promise((resolve, reject) => {
      const { studentId, amount, date, type, status, notes, currency } = paymentData;
      const query = `
        UPDATE payments SET 
        studentId = ?, amount = ?, date = ?, type = ?, status = ?, notes = ?, currency = ?,
        last_modified = CURRENT_TIMESTAMP, needs_sync = 1
        WHERE id = ?
      `;
      db.run(query, [studentId, amount, date, type, status, notes, currency, id], function(err) {
        if (err) reject(err);
        else resolve({ id, ...paymentData });
      });
    });
  });

  ipcMain.handle('db:payments:delete', async (event, id) => {
    return new Promise((resolve, reject) => {
      const query = 'UPDATE payments SET is_deleted = 1, last_modified = CURRENT_TIMESTAMP, needs_sync = 1 WHERE id = ?';
      db.run(query, [id], function(err) {
        if (err) reject(err);
        else resolve({ id });
      });
    });
  });

  ipcMain.handle('db:payments:getAvailableMonths', async () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT date FROM payments WHERE is_deleted = 0', [], (err, rows) => {
        if (err) return reject(err);
        const monthSet = new Set();
        rows.forEach(row => {
          if (row.date) {
            const month = row.date.slice(0, 7);
            monthSet.add(month);
          }
        });
        resolve(Array.from(monthSet).sort((a, b) => b.localeCompare(a)));
      });
    });
  });
  // #endregion

  // #region Grades
  ipcMain.handle('db:grades:getAll', async () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM grades WHERE is_deleted = 0', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  });

  ipcMain.handle('db:grades:create', async (event, gradeData) => {
    return new Promise((resolve, reject) => {
      const { studentId, subjectId, value, term, evaluationType, coefficient, notes } = gradeData;
      const query = `
        INSERT INTO grades 
        (studentId, subjectId, value, term, evaluationType, coefficient, notes, last_modified, needs_sync)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1)
      `;
      db.run(query, [studentId, subjectId, value, term, evaluationType, coefficient || 1, notes || null], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...gradeData });
      });
    });
  });

  ipcMain.handle('db:grades:update', async (event, { id, ...gradeData }) => {
    return new Promise((resolve, reject) => {
      const { studentId, subjectId, value, term, evaluationType, coefficient, notes } = gradeData;
      const query = `
        UPDATE grades SET 
        studentId = ?, subjectId = ?, value = ?, term = ?, evaluationType = ?, coefficient = ?, notes = ?,
        last_modified = CURRENT_TIMESTAMP, needs_sync = 1
        WHERE id = ?
      `;
      db.run(query, [studentId, subjectId, value, term, evaluationType, coefficient || 1, notes || null, id], function(err) {
        if (err) reject(err);
        else resolve({ id, ...gradeData });
      });
    });
  });

  ipcMain.handle('db:grades:delete', async (event, id) => {
    return new Promise((resolve, reject) => {
      const query = 'UPDATE grades SET is_deleted = 1, last_modified = CURRENT_TIMESTAMP, needs_sync = 1 WHERE id = ?';
      db.run(query, [id], function(err) {
        if (err) reject(err);
        else resolve({ id });
      });
    });
  });
  // #endregion

  // #region Subjects
  ipcMain.handle('db:subjects:getAll', async () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM subjects WHERE is_deleted = 0', [], (err, rows) => {
        if (err) reject(err);
        else {
          db.all('SELECT id, subjectName as name, coefficient, classId, hoursPerWeek FROM class_subjects WHERE is_deleted = 0', [], (err2, classSubjects) => {
            if (err2) reject(err2);
            else {
              const subjectsMap = new Map();
              rows.forEach(subject => subjectsMap.set(subject.id, subject));
              classSubjects.forEach(subject => { if (!subjectsMap.has(subject.id)) subjectsMap.set(subject.id, subject); });
              resolve(Array.from(subjectsMap.values()));
            }
          });
        }
      });
    });
  });

  ipcMain.handle('db:subjects:create', async (event, subjectData) => {
    return new Promise((resolve, reject) => {
      const { name, coefficient, classId, teacherId } = subjectData;
      const query = `
        INSERT INTO subjects (name, coefficient, classId, teacherId, last_modified, needs_sync)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, 1)
      `;
      db.run(query, [name, coefficient, classId, teacherId], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...subjectData });
      });
    });
  });

  ipcMain.handle('db:subjects:update', async (event, { id, data }) => {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE subjects SET name = ?, coefficient = ?, classId = ?, teacherId = ?,
        last_modified = CURRENT_TIMESTAMP, needs_sync = 1
        WHERE id = ?
      `;
      db.run(query, [data.name, data.coefficient, data.classId, data.teacherId, id], function(err) {
        if (err) reject(err);
        else resolve({ id, ...data });
      });
    });
  });

  ipcMain.handle('db:subjects:delete', async (event, id) => {
    return new Promise((resolve, reject) => {
      const query = 'UPDATE subjects SET is_deleted = 1, last_modified = CURRENT_TIMESTAMP, needs_sync = 1 WHERE id = ?';
      db.run(query, [id], function(err) {
        if (err) reject(err);
        else resolve({ id });
      });
    });
  });
  // #endregion

  // #region Attendances
  ipcMain.handle('db:attendances:getAll', async () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM attendances WHERE is_deleted = 0', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  });

  ipcMain.handle('db:attendances:create', async (event, attendanceData) => {
    return new Promise((resolve, reject) => {
      const { studentId, date, status, notes } = attendanceData;
      const query = `
        INSERT INTO attendances (studentId, date, status, notes, last_modified, needs_sync)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, 1)
      `;
      db.run(query, [studentId, date, status, notes], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...attendanceData });
      });
    });
  });

  ipcMain.handle('db:attendances:update', async (event, { id, data }) => {
    return new Promise((resolve, reject) => {
      const { studentId, date, status, notes } = data;
      const query = `
        UPDATE attendances SET studentId = ?, date = ?, status = ?, notes = ?,
        last_modified = CURRENT_TIMESTAMP, needs_sync = 1
        WHERE id = ?
      `;
      db.run(query, [studentId, date, status, notes, id], function(err) {
        if (err) reject(err);
        else resolve({ id, ...data });
      });
    });
  });

  ipcMain.handle('db:attendances:delete', async (event, id) => {
    return new Promise((resolve, reject) => {
      const query = 'UPDATE attendances SET is_deleted = 1, last_modified = CURRENT_TIMESTAMP, needs_sync = 1 WHERE id = ?';
      db.run(query, [id], function(err) {
        if (err) reject(err);
        else resolve({ id });
      });
    });
  });
  // #endregion

  // #region Class Subjects
  ipcMain.handle('db:classSubjects:getAll', async (event, classId) => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM class_subjects WHERE classId = ? AND is_deleted = 0', [classId], (err, rows) => {
        if (err) reject(err);
        else {
          const formattedRows = rows.map(row => ({ id: row.id, name: row.subjectName, subjectName: row.subjectName, coefficient: row.coefficient, classId: row.classId, hoursPerWeek: row.hoursPerWeek }));
          resolve(formattedRows);
        }
      });
    });
  });

  ipcMain.handle('db:classSubjects:add', async (event, { classId, subjectName, coefficient, hoursPerWeek }) => {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO class_subjects (classId, subjectName, coefficient, hoursPerWeek, last_modified, needs_sync)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, 1)
      `;
      db.run(query, [classId, subjectName, coefficient, hoursPerWeek], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, classId, subjectName, coefficient, hoursPerWeek });
      });
    });
  });

  ipcMain.handle('db:classSubjects:update', async (event, { id, subjectName, coefficient, hoursPerWeek }) => {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE class_subjects SET subjectName = ?, coefficient = ?, hoursPerWeek = ?,
        last_modified = CURRENT_TIMESTAMP, needs_sync = 1
        WHERE id = ?
      `;
      db.run(query, [subjectName, coefficient, hoursPerWeek, id], function(err) {
        if (err) reject(err);
        else resolve({ id, subjectName, coefficient, hoursPerWeek });
      });
    });
  });

  ipcMain.handle('db:classSubjects:delete', async (event, id) => {
    return new Promise((resolve, reject) => {
      const query = 'UPDATE class_subjects SET is_deleted = 1, last_modified = CURRENT_TIMESTAMP, needs_sync = 1 WHERE id = ?';
      db.run(query, [id], function(err) {
        if (err) reject(err);
        else resolve({ id });
      });
    });
  });
  // #endregion

  // #region Dashboard & Reports
  ipcMain.handle('db:dashboard:getStats', async () => {
    const stats = {};
    const promises = [
      new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM students WHERE is_deleted = 0', (err, row) => {
          if (err) return reject(err);
          stats.students = row.count;
          resolve();
        });
      }),
      new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM teachers WHERE is_deleted = 0', (err, row) => {
          if (err) return reject(err);
          stats.teachers = row.count;
          resolve();
        });
      }),
      new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM classes WHERE is_deleted = 0', (err, row) => {
          if (err) return reject(err);
          stats.classes = row.count;
          resolve();
        });
      })
    ];
    try {
      await Promise.all(promises);
      return stats;
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      return { students: 0, teachers: 0, classes: 0 };
    }
  });

  ipcMain.handle('db:grades:getClassResults', async (event, { className, term }) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT id FROM classes WHERE name = ? AND is_deleted = 0', [className], (err, classRow) => {
        if (err) return reject(err);
        if (!classRow) return reject(new Error('Classe non trouvée'));
        const classId = classRow.id;

        db.all('SELECT id, firstName, lastName FROM students WHERE classId = ? AND is_deleted = 0', [classId], (err, students) => {
          if (err) return reject(err);

          db.all('SELECT id, subjectName as name, coefficient FROM class_subjects WHERE classId = ? AND is_deleted = 0', [classId], (err, subjects) => {
            if (err) return reject(err);

            const studentIds = students.map(s => s.id);
            if (studentIds.length === 0) return resolve([]);
            const placeholders = studentIds.map(() => '?').join(',');

            db.all(`SELECT * FROM grades WHERE studentId IN (${placeholders}) AND term = ? AND is_deleted = 0`, [...studentIds, term], (err, grades) => {
              if (err) return reject(err);

              const results = students.map(student => {
                const studentGrades = grades.filter(g => g.studentId === student.id);
                let totalPoints = 0;
                let totalCoef = 0;
                const subjectResults = {};

                subjects.forEach(subject => {
                  const subjectGrades = studentGrades.filter(g => g.subjectId === subject.id);
                  if (subjectGrades.length > 0) {
                    const sum = subjectGrades.reduce((acc, grade) => acc + grade.value, 0);
                    const avg = sum / subjectGrades.length;
                    subjectResults[subject.name] = { average: avg, coefficient: subject.coefficient };
                    totalPoints += avg * subject.coefficient;
                    totalCoef += subject.coefficient;
                  }
                });

                const generalAverage = totalCoef > 0 ? totalPoints / totalCoef : 0;
                return { studentId: student.id, studentName: `${student.firstName} ${student.lastName}`, average: generalAverage, rank: 0, subjects: subjectResults, status: generalAverage >= 10 ? 'Admis' : 'Non admis' };
              });

              results.sort((a, b) => b.average - a.average);
              let currentRank = 0, prevAverage = -1;
              results.forEach((result, index) => {
                if (result.average !== prevAverage) {
                  currentRank = index + 1;
                  prevAverage = result.average;
                }
                result.rank = currentRank;
              });

              resolve(results);
            });
          });
        });
      });
    });
  });
  // #endregion
}

// ...
module.exports = {
  setupDatabaseIPC
};
