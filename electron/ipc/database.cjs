const { ipcMain } = require('electron');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let isDatabaseIpcSetup = false;

let db;

function runMigrations(db) {
  const tables = [
    'classes', 'students', 'teachers', 'payments', 'subjects', 'attendances',
    'parents', 'registrations', 'student_parents', 'lessons', 'notes'
  ];

  db.serialize(() => {
    tables.forEach(table => {
      db.all(`PRAGMA table_info(${table})`, (err, existingColumns) => {
        if (err) {
          if (!err.message.includes('no such table')) {
            console.error(`Error fetching info for table ${table}:`, err);
          }
          return;
        }
        const existingColumnNames = existingColumns.map(c => c.name);
        
        const columnsToAdd = [
          { name: 'supabase_id', def: 'TEXT' }, // No UNIQUE constraint here to avoid errors on existing dbs
          { name: 'last_modified', def: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
          { name: 'needs_sync', def: 'BOOLEAN DEFAULT 0' },
          { name: 'is_deleted', def: 'BOOLEAN DEFAULT 0' }
        ];

        columnsToAdd.forEach(column => {
          if (!existingColumnNames.includes(column.name)) {
            db.run(`ALTER TABLE ${table} ADD COLUMN ${column.name} ${column.def}`, (alterErr) => {
              if (alterErr && !alterErr.message.includes('duplicate column name')) {
                console.error(`Error adding column ${column.name} to ${table}:`, alterErr);
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
    if (err) { console.error('Erreur lors de la connexion à la base de données:', err); return; }
    console.log('Connecté à la base de données SQLite');
    db.serialize(() => {
      db.run(`PRAGMA foreign_keys = ON;`);
      
      // Drop old tables that are replaced to ensure a clean slate
      db.run(`DROP TABLE IF EXISTS grades;`);
      db.run(`DROP TABLE IF EXISTS class_subjects;`);

      // Create tables in dependency order according to the new Supabase schema
      db.run(`CREATE TABLE IF NOT EXISTS classes (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, level TEXT, supabase_id TEXT UNIQUE, last_modified DATETIME DEFAULT CURRENT_TIMESTAMP, needs_sync BOOLEAN DEFAULT 0, is_deleted BOOLEAN DEFAULT 0)`);
      db.run(`CREATE TABLE IF NOT EXISTS teachers (id INTEGER PRIMARY KEY AUTOINCREMENT, firstName TEXT NOT NULL, lastName TEXT NOT NULL, email TEXT, phone TEXT, hireDate TEXT, specialty TEXT, supabase_id TEXT UNIQUE, last_modified DATETIME DEFAULT CURRENT_TIMESTAMP, needs_sync BOOLEAN DEFAULT 0, is_deleted BOOLEAN DEFAULT 0)`);
      db.run(`CREATE TABLE IF NOT EXISTS students (id INTEGER PRIMARY KEY AUTOINCREMENT, firstName TEXT NOT NULL, lastName TEXT NOT NULL, birthDate TEXT, gender TEXT, matricul TEXT, supabase_id TEXT UNIQUE, last_modified DATETIME DEFAULT CURRENT_TIMESTAMP, needs_sync BOOLEAN DEFAULT 0, is_deleted BOOLEAN DEFAULT 0)`);
      db.run(`CREATE TABLE IF NOT EXISTS subjects (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, coefficient INTEGER, supabase_id TEXT UNIQUE, last_modified DATETIME DEFAULT CURRENT_TIMESTAMP, needs_sync BOOLEAN DEFAULT 0, is_deleted BOOLEAN DEFAULT 0)`);
      db.run(`CREATE TABLE IF NOT EXISTS parents (id INTEGER PRIMARY KEY AUTOINCREMENT, firstName TEXT, lastName TEXT, phone TEXT, email TEXT, profession TEXT, supabase_id TEXT UNIQUE, last_modified DATETIME DEFAULT CURRENT_TIMESTAMP, needs_sync BOOLEAN DEFAULT 0, is_deleted BOOLEAN DEFAULT 0)`);
      
      db.run(`CREATE TABLE IF NOT EXISTS registrations (id INTEGER PRIMARY KEY AUTOINCREMENT, studentId INTEGER NOT NULL, classId INTEGER NOT NULL, schoolYear TEXT, supabase_id TEXT UNIQUE, last_modified DATETIME DEFAULT CURRENT_TIMESTAMP, needs_sync BOOLEAN DEFAULT 0, is_deleted BOOLEAN DEFAULT 0, FOREIGN KEY (studentId) REFERENCES students (id) ON DELETE CASCADE, FOREIGN KEY (classId) REFERENCES classes (id) ON DELETE CASCADE)`);
      db.run(`CREATE TABLE IF NOT EXISTS student_parents (id INTEGER PRIMARY KEY AUTOINCREMENT, studentId INTEGER NOT NULL, parentId INTEGER NOT NULL, supabase_id TEXT UNIQUE, last_modified DATETIME DEFAULT CURRENT_TIMESTAMP, needs_sync BOOLEAN DEFAULT 0, is_deleted BOOLEAN DEFAULT 0, FOREIGN KEY (studentId) REFERENCES students (id) ON DELETE CASCADE, FOREIGN KEY (parentId) REFERENCES parents (id) ON DELETE CASCADE)`);
      db.run(`CREATE TABLE IF NOT EXISTS lessons (id INTEGER PRIMARY KEY AUTOINCREMENT, classId INTEGER NOT NULL, subjectId INTEGER NOT NULL, teacherId INTEGER, dayOfWeek TEXT, startTime TEXT, endTime TEXT, schoolYear TEXT, supabase_id TEXT UNIQUE, last_modified DATETIME DEFAULT CURRENT_TIMESTAMP, needs_sync BOOLEAN DEFAULT 0, is_deleted BOOLEAN DEFAULT 0, FOREIGN KEY (classId) REFERENCES classes (id) ON DELETE CASCADE, FOREIGN KEY (subjectId) REFERENCES subjects (id) ON DELETE CASCADE, FOREIGN KEY (teacherId) REFERENCES teachers (id) ON DELETE SET NULL)`);
      db.run(`CREATE TABLE IF NOT EXISTS payments (id INTEGER PRIMARY KEY AUTOINCREMENT, registrationId INTEGER, amount REAL, date TEXT, method TEXT, reference TEXT, month TEXT, supabase_id TEXT UNIQUE, last_modified DATETIME DEFAULT CURRENT_TIMESTAMP, needs_sync BOOLEAN DEFAULT 0, is_deleted BOOLEAN DEFAULT 0, FOREIGN KEY (registrationId) REFERENCES registrations (id) ON DELETE SET NULL)`);
      db.run(`CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, studentId INTEGER NOT NULL, lessonId INTEGER NOT NULL, value REAL, type TEXT, quarter INTEGER, supabase_id TEXT UNIQUE, last_modified DATETIME DEFAULT CURRENT_TIMESTAMP, needs_sync BOOLEAN DEFAULT 0, is_deleted BOOLEAN DEFAULT 0, FOREIGN KEY (studentId) REFERENCES students (id) ON DELETE CASCADE, FOREIGN KEY (lessonId) REFERENCES lessons (id) ON DELETE CASCADE)`);
      db.run(`CREATE TABLE IF NOT EXISTS attendances (id INTEGER PRIMARY KEY AUTOINCREMENT, studentId INTEGER NOT NULL, date TEXT, state TEXT, justification TEXT, supabase_id TEXT UNIQUE, last_modified DATETIME DEFAULT CURRENT_TIMESTAMP, needs_sync BOOLEAN DEFAULT 0, is_deleted BOOLEAN DEFAULT 0, FOREIGN KEY (studentId) REFERENCES students (id) ON DELETE CASCADE)`);

      db.run(`CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY, schoolName TEXT, paymentMonths TEXT, loggedIn INTEGER DEFAULT 0, userRole TEXT, schoolId TEXT)`);
      db.get('SELECT COUNT(*) as count FROM settings', (err, row) => {
        if (!err && row.count === 0) {
          db.run('INSERT INTO settings (id, schoolName) VALUES (1, "Nom de l\'école")');
        }
      });

      // Run migrations to add sync columns to any tables that might already exist without them
      runMigrations(db);
    });
  });
  return db;
}

function setupDatabaseIPC(db) {
  if (isDatabaseIpcSetup) {
    return;
  }
  isDatabaseIpcSetup = true;

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
      const { name, level } = classData;
      db.run('INSERT INTO classes (name, level, last_modified, needs_sync) VALUES (?, ?, CURRENT_TIMESTAMP, 1)', [name, level], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...classData });
      });
    });
  });

  ipcMain.handle('db:classes:update', async (event, { id, data }) => {
    return new Promise((resolve, reject) => {
      const { name, level } = data;
      db.run('UPDATE classes SET name = ?, level = ?, last_modified = CURRENT_TIMESTAMP, needs_sync = 1 WHERE id = ?', [name, level, id], function(err) {
        if (err) reject(err);
        else resolve({ id, ...data });
      });
    });
  });

  ipcMain.handle('db:classes:delete', async (event, id) => {
    return new Promise((resolve, reject) => {
      // Check if class has students through the registrations table
      db.get('SELECT COUNT(*) as count FROM registrations WHERE classId = ? AND is_deleted = 0', [id], (err, row) => {
        if (err) return reject(err);
        if (row.count > 0) return reject(new Error('Impossible de supprimer une classe qui contient des étudiants inscrits'));
        
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
      const query = `
        WITH LatestRegistration AS (
          SELECT studentId, classId, ROW_NUMBER() OVER(PARTITION BY studentId ORDER BY registrationDate DESC, id DESC) as rn
          FROM registrations
          WHERE is_deleted = 0
        )
        SELECT s.*, c.name as className
        FROM students s
        LEFT JOIN LatestRegistration r ON s.id = r.studentId AND r.rn = 1
        LEFT JOIN classes c ON r.classId = c.id
        WHERE s.is_deleted = 0
        ORDER BY s.lastName, s.firstName
      `;
      db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  });

  ipcMain.handle('db:students:create', async (event, studentData) => {
    return new Promise((resolve, reject) => {
      const { firstName, lastName, birthDate, gender, matricul } = studentData;
      const query = `
        INSERT INTO students (firstName, lastName, birthDate, gender, matricul, last_modified, needs_sync)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1)
      `;
      db.run(query, [firstName, lastName, birthDate, gender, matricul], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...studentData });
      });
    });
  });

  ipcMain.handle('db:students:update', async (event, { id, data }) => {
    return new Promise((resolve, reject) => {
      const { firstName, lastName, birthDate, gender, matricul } = data;
      const query = `
        UPDATE students 
        SET firstName = ?, lastName = ?, birthDate = ?, gender = ?, matricul = ?, last_modified = CURRENT_TIMESTAMP, needs_sync = 1
        WHERE id = ?
      `;
      db.run(query, [firstName, lastName, birthDate, gender, matricul, id], function(err) {
        if (err) reject(err);
        else resolve({ id, ...data });
      });
    });
  });

  ipcMain.handle('db:students:delete', async (event, id) => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION', (err) => {
          if (err) return reject(err);
        });

        const studentQuery = 'UPDATE students SET is_deleted = 1, last_modified = CURRENT_TIMESTAMP, needs_sync = 1 WHERE id = ?';
        db.run(studentQuery, [id], function(err) {
          if (err) {
            db.run('ROLLBACK');
            return reject(err);
          }
        });

        const registrationQuery = 'UPDATE registrations SET is_deleted = 1, last_modified = CURRENT_TIMESTAMP, needs_sync = 1 WHERE studentId = ?';
        db.run(registrationQuery, [id], function(err) {
          if (err) {
            db.run('ROLLBACK');
            return reject(err);
          }
        });

        db.run('COMMIT', (err) => {
          if (err) {
            db.run('ROLLBACK');
            return reject(err);
          }
          resolve({ id });
        });
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
      const { firstName, lastName, email, phone, hireDate, specialty } = data;
      const query = `
        UPDATE teachers 
        SET firstName = ?, lastName = ?, email = ?, phone = ?, hireDate = ?, specialty = ?, last_modified = CURRENT_TIMESTAMP, needs_sync = 1
        WHERE id = ?
      `;
      db.run(query, [firstName, lastName, email, phone, hireDate, specialty, id], function(err) {
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
      const query = `
        SELECT 
          p.*, 
          s.firstName, 
          s.lastName,
          c.name as className
        FROM payments p
        JOIN registrations r ON p.registrationId = r.id
        JOIN students s ON r.studentId = s.id
        JOIN classes c ON r.classId = c.id
        WHERE p.is_deleted = 0
        ORDER BY p.date DESC
      `;
      db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  });

  ipcMain.handle('db:payments:create', async (event, paymentData) => {
    return new Promise((resolve, reject) => {
      const { registrationId, amount, date, method, reference, month } = paymentData;
      const query = `
        INSERT INTO payments (registrationId, amount, date, method, reference, month, last_modified, needs_sync)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1)
      `;
      db.run(query, [registrationId, amount, date, method, reference, month], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...paymentData });
      });
    });
  });

  ipcMain.handle('db:payments:update', async (event, { id, data }) => {
    return new Promise((resolve, reject) => {
      const { registrationId, amount, date, method, reference, month } = data;
      const query = `
        UPDATE payments SET 
        registrationId = ?, amount = ?, date = ?, method = ?, reference = ?, month = ?,
        last_modified = CURRENT_TIMESTAMP, needs_sync = 1
        WHERE id = ?
      `;
      db.run(query, [registrationId, amount, date, method, reference, month, id], function(err) {
        if (err) reject(err);
        else resolve({ id, ...data });
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
      db.all('SELECT DISTINCT month FROM payments WHERE is_deleted = 0 AND month IS NOT NULL ORDER BY month DESC', [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows.map(r => r.month));
      });
    });
  });
  // #endregion

  // #region Notes
  ipcMain.handle('db:notes:getAll', async () => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          n.*,
          s.firstName, 
          s.lastName,
          sub.name as subjectName
        FROM notes n
        JOIN students s ON n.studentId = s.id
        JOIN lessons l ON n.lessonId = l.id
        JOIN subjects sub ON l.subjectId = sub.id
        WHERE n.is_deleted = 0
      `;
      db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  });

  ipcMain.handle('db:notes:create', async (event, noteData) => {
    return new Promise((resolve, reject) => {
      const { studentId, lessonId, value, type, quarter } = noteData;
      const query = `
        INSERT INTO notes (studentId, lessonId, value, type, quarter, last_modified, needs_sync)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1)
      `;
      db.run(query, [studentId, lessonId, value, type, quarter], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...noteData });
      });
    });
  });

  ipcMain.handle('db:notes:update', async (event, { id, data }) => {
    return new Promise((resolve, reject) => {
      const { studentId, lessonId, value, type, quarter } = data;
      const query = `
        UPDATE notes 
        SET studentId = ?, lessonId = ?, value = ?, type = ?, quarter = ?,
        last_modified = CURRENT_TIMESTAMP, needs_sync = 1
        WHERE id = ?
      `;
      db.run(query, [studentId, lessonId, value, type, quarter, id], function(err) {
        if (err) reject(err);
        else resolve({ id, ...data });
      });
    });
  });

  ipcMain.handle('db:notes:delete', async (event, id) => {
    return new Promise((resolve, reject) => {
      const query = 'UPDATE notes SET is_deleted = 1, last_modified = CURRENT_TIMESTAMP, needs_sync = 1 WHERE id = ?';
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
      db.all('SELECT * FROM subjects WHERE is_deleted = 0 ORDER BY name', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  });

  ipcMain.handle('db:subjects:create', async (event, subjectData) => {
    return new Promise((resolve, reject) => {
      const { name, coefficient } = subjectData;
      db.run('INSERT INTO subjects (name, coefficient, last_modified, needs_sync) VALUES (?, ?, CURRENT_TIMESTAMP, 1)', [name, coefficient], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...subjectData });
      });
    });
  });

  ipcMain.handle('db:subjects:update', async (event, { id, data }) => {
    return new Promise((resolve, reject) => {
      const { name, coefficient } = data;
      db.run('UPDATE subjects SET name = ?, coefficient = ?, last_modified = CURRENT_TIMESTAMP, needs_sync = 1 WHERE id = ?', [name, coefficient, id], function(err) {
        if (err) reject(err);
        else resolve({ id, ...data });
      });
    });
  });

  ipcMain.handle('db:subjects:delete', async (event, id) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM lessons WHERE subjectId = ? AND is_deleted = 0', [id], (err, row) => {
        if (err) return reject(err);
        if (row.count > 0) return reject(new Error('Impossible de supprimer une matière enseignée dans des leçons.'));

        const query = 'UPDATE subjects SET is_deleted = 1, last_modified = CURRENT_TIMESTAMP, needs_sync = 1 WHERE id = ?';
        db.run(query, [id], function(err) {
          if (err) reject(err);
          else resolve({ id });
        });
      });
    });
  });
  // #endregion

  // #region Attendances
  ipcMain.handle('db:attendances:getAll', async () => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          a.*, 
          s.firstName, 
          s.lastName
        FROM attendances a
        JOIN students s ON a.studentId = s.id
        WHERE a.is_deleted = 0
        ORDER BY a.date DESC
      `;
      db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  });

  ipcMain.handle('db:attendances:create', async (event, attendanceData) => {
    return new Promise((resolve, reject) => {
      const { studentId, date, state, justification } = attendanceData;
      const query = `
        INSERT INTO attendances (studentId, date, state, justification, last_modified, needs_sync)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, 1)
      `;
      db.run(query, [studentId, date, state, justification], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...attendanceData });
      });
    });
  });

  ipcMain.handle('db:attendances:update', async (event, { id, data }) => {
    return new Promise((resolve, reject) => {
      const { studentId, date, state, justification } = data;
      const query = `
        UPDATE attendances 
        SET studentId = ?, date = ?, state = ?, justification = ?,
        last_modified = CURRENT_TIMESTAMP, needs_sync = 1
        WHERE id = ?
      `;
      db.run(query, [studentId, date, state, justification, id], function(err) {
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

  // #region Parents
  ipcMain.handle('db:parents:getAll', async () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM parents WHERE is_deleted = 0', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  });

  ipcMain.handle('db:parents:create', async (event, parentData) => {
    return new Promise((resolve, reject) => {
      const { firstName, lastName, phone, email, profession } = parentData;
      const query = `
        INSERT INTO parents (firstName, lastName, phone, email, profession, last_modified, needs_sync)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1)
      `;
      db.run(query, [firstName, lastName, phone, email, profession], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...parentData });
      });
    });
  });

  ipcMain.handle('db:parents:update', async (event, { id, data }) => {
    return new Promise((resolve, reject) => {
      const { firstName, lastName, phone, email, profession } = data;
      const query = `
        UPDATE parents 
        SET firstName = ?, lastName = ?, phone = ?, email = ?, profession = ?,
        last_modified = CURRENT_TIMESTAMP, needs_sync = 1
        WHERE id = ?
      `;
      db.run(query, [firstName, lastName, phone, email, profession, id], function(err) {
        if (err) reject(err);
        else resolve({ id, ...data });
      });
    });
  });

  ipcMain.handle('db:parents:delete', async (event, id) => {
    return new Promise((resolve, reject) => {
      // Check if the parent is linked to any student
      db.get('SELECT 1 FROM student_parents WHERE parentId = ? AND is_deleted = 0', [id], (err, row) => {
        if (err) return reject(err);
        if (row) {
          return reject(new Error('Ce parent est lié à un ou plusieurs étudiants et ne peut pas être supprimé.'));
        }
        
        const query = 'UPDATE parents SET is_deleted = 1, last_modified = CURRENT_TIMESTAMP, needs_sync = 1 WHERE id = ?';
        db.run(query, [id], function(err) {
          if (err) reject(err);
          else resolve({ id });
        });
      });
    });
  });
  // #endregion

  // #region Registrations
  ipcMain.handle('db:registrations:getAll', async () => {
    return new Promise((resolve, reject) => {
        const query = `
        SELECT 
            r.id, r.schoolYear,
            s.id as studentId, s.firstName, s.lastName,
            c.id as classId, c.name as className
        FROM registrations r
        JOIN students s ON r.studentId = s.id
        JOIN classes c ON r.classId = c.id
        WHERE r.is_deleted = 0
        `;
        db.all(query, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
  });

  ipcMain.handle('db:registrations:create', async (event, regData) => {
    return new Promise((resolve, reject) => {
        const { studentId, classId, schoolYear } = regData;
        const query = `
        INSERT INTO registrations (studentId, classId, schoolYear, last_modified, needs_sync)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, 1)
        `;
        db.run(query, [studentId, classId, schoolYear], function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, ...regData });
        });
    });
  });

  ipcMain.handle('db:registrations:update', async (event, { id, data }) => {
    return new Promise((resolve, reject) => {
        const { studentId, classId, schoolYear } = data;
        const query = `
        UPDATE registrations 
        SET studentId = ?, classId = ?, schoolYear = ?,
        last_modified = CURRENT_TIMESTAMP, needs_sync = 1
        WHERE id = ?
        `;
        db.run(query, [studentId, classId, schoolYear, id], function(err) {
            if (err) reject(err);
            else resolve({ id, ...data });
        });
    });
  });

  ipcMain.handle('db:registrations:delete', async (event, id) => {
    return new Promise((resolve, reject) => {
        // Check for dependencies in payments
        db.get('SELECT 1 FROM payments WHERE registrationId = ? AND is_deleted = 0', [id], (err, row) => {
            if (err) return reject(err);
            if (row) {
                return reject(new Error('Cette inscription est liée à des paiements et ne peut pas être supprimée.'));
            }

            const query = 'UPDATE registrations SET is_deleted = 1, last_modified = CURRENT_TIMESTAMP, needs_sync = 1 WHERE id = ?';
            db.run(query, [id], function(err) {
                if (err) reject(err);
                else resolve({ id });
            });
        });
    });
  });
  // #endregion

  // #region Student-Parents
  ipcMain.handle('db:studentParents:getByStudent', async (event, studentId) => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT p.* FROM parents p
        JOIN student_parents sp ON p.id = sp.parentId
        WHERE sp.studentId = ? AND p.is_deleted = 0 AND sp.is_deleted = 0
      `;
      db.all(query, [studentId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  });

  ipcMain.handle('db:studentParents:link', async (event, { studentId, parentId }) => {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO student_parents (studentId, parentId, last_modified, needs_sync)
        VALUES (?, ?, CURRENT_TIMESTAMP, 1)
      `;
      db.run(query, [studentId, parentId], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, studentId, parentId });
      });
    });
  });

  ipcMain.handle('db:studentParents:unlink', async (event, { studentId, parentId }) => {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE student_parents 
        SET is_deleted = 1, last_modified = CURRENT_TIMESTAMP, needs_sync = 1
        WHERE studentId = ? AND parentId = ?
      `;
      db.run(query, [studentId, parentId], function(err) {
        if (err) reject(err);
        else resolve({ studentId, parentId });
      });
    });
  });
  // #endregion

  // #region Lessons
  ipcMain.handle('db:lessons:getAll', async () => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          l.*,
          s.name as subjectName,
          t.firstName as teacherFirstName,
          t.lastName as teacherLastName,
          c.name as className
        FROM lessons l
        JOIN subjects s ON l.subjectId = s.id
        JOIN teachers t ON l.teacherId = t.id
        JOIN classes c ON l.classId = c.id
        WHERE l.is_deleted = 0
      `;
      db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  });

  ipcMain.handle('db:lessons:create', async (event, lessonData) => {
    return new Promise((resolve, reject) => {
      const { subjectId, teacherId, classId, dayOfWeek, startTime, endTime } = lessonData;
      const query = `
        INSERT INTO lessons (subjectId, teacherId, classId, dayOfWeek, startTime, endTime, last_modified, needs_sync)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1)
      `;
      db.run(query, [subjectId, teacherId, classId, dayOfWeek, startTime, endTime], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...lessonData });
      });
    });
  });

  ipcMain.handle('db:lessons:update', async (event, { id, data }) => {
    return new Promise((resolve, reject) => {
      const { subjectId, teacherId, classId, dayOfWeek, startTime, endTime } = data;
      const query = `
        UPDATE lessons 
        SET subjectId = ?, teacherId = ?, classId = ?, dayOfWeek = ?, startTime = ?, endTime = ?,
        last_modified = CURRENT_TIMESTAMP, needs_sync = 1
        WHERE id = ?
      `;
      db.run(query, [subjectId, teacherId, classId, dayOfWeek, startTime, endTime, id], function(err) {
        if (err) reject(err);
        else resolve({ id, ...data });
      });
    });
  });

  ipcMain.handle('db:lessons:delete', async (event, id) => {
    return new Promise((resolve, reject) => {
      // Check for dependencies in notes
      db.get('SELECT 1 FROM notes WHERE lessonId = ? AND is_deleted = 0', [id], (err, row) => {
        if (err) return reject(err);
        if (row) {
          return reject(new Error('Cette leçon est liée à des notes et ne peut pas être supprimée.'));
        }

        const query = 'UPDATE lessons SET is_deleted = 1, last_modified = CURRENT_TIMESTAMP, needs_sync = 1 WHERE id = ?';
        db.run(query, [id], function(err) {
          if (err) reject(err);
          else resolve({ id });
        });
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

  ipcMain.handle('db:reports:getClassResults', async (event, { classId, quarter }) => {
    return new Promise((resolve, reject) => {
        const getStudents = new Promise((res, rej) => {
            const query = `
                SELECT s.id, s.firstName, s.lastName
                FROM students s
                JOIN registrations r ON s.id = r.studentId
                WHERE r.classId = ? AND r.is_deleted = 0 AND s.is_deleted = 0
            `;
            db.all(query, [classId], (err, rows) => err ? rej(err) : res(rows));
        });

        const getSubjects = new Promise((res, rej) => {
            const query = `
                SELECT DISTINCT sub.id, sub.name, sub.coefficient
                FROM subjects sub
                JOIN lessons l ON sub.id = l.subjectId
                WHERE l.classId = ? AND l.is_deleted = 0 AND sub.is_deleted = 0
            `;
            db.all(query, [classId], (err, rows) => err ? rej(err) : res(rows));
        });

        Promise.all([getStudents, getSubjects]).then(([students, subjects]) => {
            if (students.length === 0) return resolve([]);

            const studentIds = students.map(s => s.id);
            const placeholders = studentIds.map(() => '?').join(',');

            const notesQuery = `
                SELECT n.value, n.studentId, l.subjectId
                FROM notes n
                JOIN lessons l ON n.lessonId = l.id
                WHERE n.studentId IN (${placeholders}) AND n.quarter = ? AND n.is_deleted = 0 AND l.classId = ?
            `;

            db.all(notesQuery, [...studentIds, quarter, classId], (err, notes) => {
                if (err) return reject(err);

                const results = students.map(student => {
                    const studentNotes = notes.filter(n => n.studentId === student.id);
                    let totalPoints = 0;
                    let totalCoef = 0;
                    const subjectResults = {};

                    subjects.forEach(subject => {
                        const subjectNotes = studentNotes.filter(n => n.subjectId === subject.id);
                        if (subjectNotes.length > 0) {
                            const sum = subjectNotes.reduce((acc, note) => acc + note.value, 0);
                            const avg = sum / subjectNotes.length;
                            subjectResults[subject.name] = { average: avg, coefficient: subject.coefficient };
                            totalPoints += avg * subject.coefficient;
                            totalCoef += subject.coefficient;
                        } else {
                            subjectResults[subject.name] = { average: null, coefficient: subject.coefficient };
                        }
                    });

                    const generalAverage = totalCoef > 0 ? totalPoints / totalCoef : 0;
                    return { 
                        studentId: student.id, 
                        studentName: `${student.firstName} ${student.lastName}`, 
                        average: generalAverage, 
                        rank: 0, 
                        subjects: subjectResults, 
                        status: generalAverage >= 10 ? 'Admis' : 'Non admis' 
                    };
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
        }).catch(reject);
    });
  });
  // #endregion
}

// ...
module.exports = { initializeDatabase, setupDatabaseIPC };
