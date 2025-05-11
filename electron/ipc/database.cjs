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
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (studentId) REFERENCES students (id),
          FOREIGN KEY (subjectId) REFERENCES subjects (id)
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS subjects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
          FOREIGN KEY (classId) REFERENCES classes(id)
        )`);
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
        else resolve(rows);
      });
    });
  });

  // Handler pour ajouter une matière à une classe
  ipcMain.handle('db:classSubjects:add', async (event, { classId, subjectName, coefficient }) => {
    return new Promise((resolve, reject) => {
      db.run('INSERT INTO class_subjects (classId, subjectName, coefficient) VALUES (?, ?, ?)', [classId, subjectName, coefficient], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, classId, subjectName, coefficient });
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
      const { studentId, subjectId, value, term } = gradeData;
      db.run(
        'INSERT INTO grades (studentId, subjectId, value, term) VALUES (?, ?, ?, ?)',
        [studentId, subjectId, value, term],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...gradeData });
        }
      );
    });
  });

  ipcMain.handle('db:grades:update', async (event, { id, ...gradeData }) => {
    return new Promise((resolve, reject) => {
      const { studentId, subjectId, value, term } = gradeData;
      db.run(
        'UPDATE grades SET studentId = ?, subjectId = ?, value = ?, term = ? WHERE id = ?',
        [studentId, subjectId, value, term, id],
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

  // Gestionnaires IPC pour les matières
  ipcMain.handle('db:subjects:getAll', async () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM subjects', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  });

  ipcMain.handle('db:subjects:create', async (event, subjectData) => {
    return new Promise((resolve, reject) => {
      db.run('INSERT INTO subjects (name) VALUES (?)', [subjectData.name], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...subjectData });
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
}

module.exports = {
  setupDatabaseIPC
}; 