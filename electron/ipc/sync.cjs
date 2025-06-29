const { ipcMain } = require('electron');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

let isSyncIpcSetup = false;

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL or Anon Key is missing. Make sure to set it in the .env file.");
}
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Helper functions for ID resolution ---
async function getSupabaseId(db, table, localId) {
    if (!localId) return null;
    return new Promise((resolve, reject) => {
        db.get(`SELECT supabase_id FROM ${table} WHERE id = ?`, [localId], (err, row) => {
            if (err) return reject(new Error(`DB error looking up supabase_id in ${table} for local id ${localId}: ${err.message}`));
            resolve(row ? row.supabase_id : null);
        });
    });
}

async function getLocalId(db, table, supabaseId) {
    if (!supabaseId) return null;
    return new Promise((resolve, reject) => {
        db.get(`SELECT id FROM ${table} WHERE supabase_id = ?`, [supabaseId], (err, row) => {
            if (err) return reject(new Error(`DB error looking up local id in ${table} for supabase_id ${supabaseId}: ${err.message}`));
            resolve(row ? row.id : null);
        });
    });
}


// --- Table Configurations for Synchronization ---
const tableConfigs = {
    classes: {
        name: 'classes',
        supabaseMap: (row, schoolId) => ({ name: row.name, level: row.level, school_id: schoolId }),
        localMap: (row) => ({ name: row.name, level: row.level })
    },
    teachers: {
        name: 'teachers',
        supabaseMap: (row, schoolId) => ({ first_name: row.firstName, last_name: row.lastName, email: row.email, phone: row.phone, hire_date: row.hireDate, specialty: row.specialty, school_id: schoolId }),
        localMap: (row) => ({ firstName: row.first_name, lastName: row.last_name, email: row.email, phone: row.phone, hireDate: row.hire_date, specialty: row.specialty })
    },
    subjects: {
        name: 'subjects',
        supabaseMap: (row, schoolId) => ({ name: row.name, coefficient: row.coefficient, school_id: schoolId }),
        localMap: (row) => ({ name: row.name, coefficient: row.coefficient })
    },
    students: {
        name: 'students',
        supabaseMap: (row, schoolId) => ({ first_name: row.firstName, last_name: row.lastName, birth_date: row.birthDate, gender: row.gender, matricul: row.matricul, school_id: schoolId }),
        localMap: (row) => ({ firstName: row.first_name, lastName: row.last_name, birthDate: row.birth_date, gender: row.gender, matricul: row.matricul })
    },
    parents: {
        name: 'parents',
        supabaseMap: (row, schoolId) => ({ first_name: row.firstName, last_name: row.lastName, phone: row.phone, email: row.email, profession: row.profession, school_id: schoolId }),
        localMap: (row) => ({ firstName: row.first_name, lastName: row.last_name, phone: row.phone, email: row.email, profession: row.profession })
    },
    registrations: {
        name: 'registrations',
        supabaseMap: async (row, schoolId, db) => {
            const [studentSupabaseId, classSupabaseId] = await Promise.all([
                getSupabaseId(db, 'students', row.studentId),
                getSupabaseId(db, 'classes', row.classId)
            ]);
            if (!studentSupabaseId || !classSupabaseId) return null;
            return { student_id: studentSupabaseId, class_id: classSupabaseId, school_year: row.schoolYear, school_id: schoolId };
        },
        localMap: async (row, db) => {
            const [studentLocalId, classLocalId] = await Promise.all([
                getLocalId(db, 'students', row.student_id),
                getLocalId(db, 'classes', row.class_id)
            ]);
            if (!studentLocalId || !classLocalId) return null;
            return { studentId: studentLocalId, classId: classLocalId, schoolYear: row.school_year };
        }
    },
    student_parents: {
        name: 'student_parents',
        supabaseMap: async (row, schoolId, db) => {
            const [studentSupabaseId, parentSupabaseId] = await Promise.all([
                getSupabaseId(db, 'students', row.studentId),
                getSupabaseId(db, 'parents', row.parentId)
            ]);
            if (!studentSupabaseId || !parentSupabaseId) return null;
            return { student_id: studentSupabaseId, parent_id: parentSupabaseId, school_id: schoolId };
        },
        localMap: async (row, db) => {
            const [studentLocalId, parentLocalId] = await Promise.all([
                getLocalId(db, 'students', row.student_id),
                getLocalId(db, 'parents', row.parent_id)
            ]);
            if (!studentLocalId || !parentLocalId) return null;
            return { studentId: studentLocalId, parentId: parentLocalId };
        }
    },
    lessons: {
        name: 'lessons',
        supabaseMap: async (row, schoolId, db) => {
            const [classSupabaseId, subjectSupabaseId, teacherSupabaseId] = await Promise.all([
                getSupabaseId(db, 'classes', row.classId),
                getSupabaseId(db, 'subjects', row.subjectId),
                getSupabaseId(db, 'teachers', row.teacherId)
            ]);
            if (!classSupabaseId || !subjectSupabaseId) return null; // teacher is optional
            return { class_id: classSupabaseId, subject_id: subjectSupabaseId, teacher_id: teacherSupabaseId, day_of_week: row.dayOfWeek, start_time: row.startTime, end_time: row.endTime, school_id: schoolId };
        },
        localMap: async (row, db) => {
            const [classLocalId, subjectLocalId, teacherLocalId] = await Promise.all([
                getLocalId(db, 'classes', row.class_id),
                getLocalId(db, 'subjects', row.subject_id),
                getLocalId(db, 'teachers', row.teacher_id)
            ]);
            if (!classLocalId || !subjectLocalId) return null; // teacher is optional
            return { classId: classLocalId, subjectId: subjectLocalId, teacherId: teacherLocalId, dayOfWeek: row.day_of_week, startTime: row.start_time, endTime: row.end_time };
        }
    },
    payments: {
        name: 'payments',
        supabaseMap: async (row, schoolId, db) => {
            const registrationSupabaseId = await getSupabaseId(db, 'registrations', row.registrationId);
            if (!registrationSupabaseId) return null;
            return { registration_id: registrationSupabaseId, amount: row.amount, date: row.date, method: row.method, reference: row.reference, month: row.month, school_id: schoolId };
        },
        localMap: async (row, db) => {
            const registrationLocalId = await getLocalId(db, 'registrations', row.registration_id);
            if (!registrationLocalId) return null;
            return { registrationId: registrationLocalId, amount: row.amount, date: row.date, method: row.method, reference: row.reference, month: row.month };
        }
    },
    notes: {
        name: 'notes',
        supabaseMap: async (row, schoolId, db) => {
            const [studentSupabaseId, lessonSupabaseId] = await Promise.all([
                getSupabaseId(db, 'students', row.studentId),
                getSupabaseId(db, 'lessons', row.lessonId)
            ]);
            if (!studentSupabaseId || !lessonSupabaseId) return null;
            return { student_id: studentSupabaseId, lesson_id: lessonSupabaseId, value: row.value, type: row.type, quarter: row.quarter, school_id: schoolId };
        },
        localMap: async (row, db) => {
            const [studentLocalId, lessonLocalId] = await Promise.all([
                getLocalId(db, 'students', row.student_id),
                getLocalId(db, 'lessons', row.lesson_id)
            ]);
            if (!studentLocalId || !lessonLocalId) return null;
            return { studentId: studentLocalId, lessonId: lessonLocalId, value: row.value, type: row.type, quarter: row.quarter };
        }
    },
    attendances: {
        name: 'attendances',
        supabaseMap: async (row, schoolId, db) => {
            const studentSupabaseId = await getSupabaseId(db, 'students', row.studentId);
            if (!studentSupabaseId) return null;
            return { student_id: studentSupabaseId, date: row.date, state: row.state, justification: row.justification, school_id: schoolId };
        },
        localMap: async (row, db) => {
            const studentLocalId = await getLocalId(db, 'students', row.student_id);
            if (!studentLocalId) return null;
            return { studentId: studentLocalId, date: row.date, state: row.state, justification: row.justification };
        }
    }
};

// --- Synchronization Order ---
const syncOrder = [
    'classes', 'teachers', 'subjects', 'students', 'parents',
    'registrations', 'student_parents', 'lessons',
    'payments', 'notes', 'attendances'
];

// --- Core Synchronization Logic ---

async function pushChanges(db, schoolId, token) {
    if (!db) {
        console.error("Push changes error: Database is not initialized.");
        return;
    }
    supabase.auth.setAuth(token);
    console.log("Starting push changes...");

    for (const tableName of syncOrder) {
        const config = tableConfigs[tableName];
        console.log(`Pushing table: ${tableName}`);

        const rowsToSync = await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM ${config.name} WHERE needs_sync = 1`, (err, rows) => {
                if (err) reject(new Error(`DB error reading ${config.name}: ${err.message}`));
                else resolve(rows);
            });
        });

        if (rowsToSync.length === 0) {
            console.log(`No changes to push for ${tableName}.`);
            continue;
        }

        for (const row of rowsToSync) {
            try {
                if (row.is_deleted) {
                    if (row.supabase_id) {
                        const { error } = await supabase.from(config.name).delete().match({ id: row.supabase_id });
                        if (error) throw new Error(`Supabase delete error for ${config.name} ${row.id}: ${error.message}`);
                        
                        await new Promise((resolve, reject) => {
                            db.run(`DELETE FROM ${config.name} WHERE id = ?`, [row.id], (err) => {
                                if (err) reject(new Error(`DB error deleting ${config.name} ${row.id}: ${err.message}`));
                                else resolve();
                            });
                        });
                        console.log(`Deleted ${config.name} ${row.id} from local and Supabase.`);
                    }
                } else {
                    const mappedData = await config.supabaseMap(row, schoolId, db);
                    if (!mappedData) {
                        console.log(`Skipping push for ${config.name} ID ${row.id} due to unresolved dependencies.`);
                        continue;
                    }

                    let supabase_id = row.supabase_id;
                    if (supabase_id) { // Update existing record
                        const { data, error } = await supabase.from(config.name).update({ ...mappedData, last_modified: new Date().toISOString() }).match({ id: supabase_id }).select('id');
                        if (error) throw new Error(`Supabase update error for ${config.name} ${row.id}: ${error.message}`);
                    } else { // Insert new record
                        const { data, error } = await supabase.from(config.name).insert(mappedData).select('id');
                        if (error) throw new Error(`Supabase insert error for ${config.name} ${row.id}: ${error.message}`);
                        supabase_id = data[0].id;
                    }

                    await new Promise((resolve, reject) => {
                        db.run(`UPDATE ${config.name} SET needs_sync = 0, supabase_id = ?, last_modified = ? WHERE id = ?`, [supabase_id, new Date().toISOString(), row.id], (err) => {
                            if (err) reject(new Error(`DB error updating sync status for ${config.name} ${row.id}: ${err.message}`));
                            else resolve();
                        });
                    });
                    console.log(`Pushed ${config.name} ${row.id} successfully.`);
                }
            } catch (error) {
                console.error(`Failed to push row ${row.id} from ${config.name}:`, error);
            }
        }
    }
    console.log("Push changes finished.");
}


async function pullChanges(db, schoolId, token) {
    if (!db) {
        console.error("Pull changes error: Database is not initialized.");
        return;
    }
    supabase.auth.setAuth(token);
    console.log("Starting pull changes...");

    for (const tableName of [...syncOrder].reverse()) { // Pull in reverse order
        const config = tableConfigs[tableName];
        console.log(`Pulling table: ${tableName}`);

        const lastSyncTime = await new Promise((resolve) => {
            db.get(`SELECT MAX(last_modified) as last_sync FROM ${config.name}`, (err, row) => {
                resolve(row && row.last_sync ? row.last_sync : '1970-01-01T00:00:00Z');
            });
        });

        const { data: supabaseRows, error } = await supabase
            .from(config.name)
            .select('*')
            .eq('school_id', schoolId)
            .gt('last_modified', lastSyncTime);

        if (error) {
            console.error(`Error fetching from Supabase for ${config.name}:`, error);
            continue;
        }

        if (supabaseRows.length === 0) {
            console.log(`No new data to pull for ${tableName}.`);
            continue;
        }

        for (const row of supabaseRows) {
            try {
                const localRow = await new Promise((resolve, reject) => {
                    db.get(`SELECT * FROM ${config.name} WHERE supabase_id = ?`, [row.id], (err, res) => {
                        if (err) reject(new Error(`DB error checking for existing ${config.name} with supabase_id ${row.id}: ${err.message}`));
                        else resolve(res);
                    });
                });

                if (row.is_deleted) {
                    if (localRow) {
                        await new Promise((resolve, reject) => {
                            db.run(`DELETE FROM ${config.name} WHERE id = ?`, [localRow.id], (err) => {
                                if (err) reject(new Error(`DB error deleting ${config.name} ${localRow.id}: ${err.message}`));
                                else resolve();
                            });
                        });
                        console.log(`Pulled deletion for ${config.name} with supabase_id ${row.id}.`);
                    }
                    continue;
                }

                const mappedData = await config.localMap(row, db);
                if (!mappedData) {
                    console.log(`Skipping pull for ${config.name} with supabase_id ${row.id} due to unresolved dependencies.`);
                    continue;
                }

                if (localRow) { // Update existing local record
                    if (new Date(row.last_modified) > new Date(localRow.last_modified)) {
                        const updateFields = Object.keys(mappedData).map(k => `${k} = ?`).join(', ');
                        const updateValues = [...Object.values(mappedData), row.last_modified, localRow.id];
                        await new Promise((resolve, reject) => {
                            db.run(`UPDATE ${config.name} SET ${updateFields}, last_modified = ?, needs_sync = 0 WHERE id = ?`, updateValues, (err) => {
                                if (err) reject(new Error(`DB error updating ${config.name} ${localRow.id}: ${err.message}`));
                                else resolve();
                            });
                        });
                        console.log(`Pulled update for ${config.name} ${localRow.id}.`);
                    }
                } else { // Insert new local record
                    const insertKeys = Object.keys(mappedData);
                    const columns = ['supabase_id', 'last_modified', 'needs_sync', ...insertKeys].join(', ');
                    const placeholders = ['?', '?', '?', ...insertKeys.map(() => '?')].join(', ');
                    const values = [row.id, row.last_modified, 0, ...Object.values(mappedData)];
                    await new Promise((resolve, reject) => {
                        db.run(`INSERT INTO ${config.name} (${columns}) VALUES (${placeholders})`, values, (err) => {
                            if (err) reject(new Error(`DB error inserting new ${config.name}: ${err.message}`));
                            else resolve();
                        });
                    });
                    console.log(`Pulled new record for ${config.name} with supabase_id ${row.id}.`);
                }
            } catch (error) {
                console.error(`Failed to pull row with supabase_id ${row.id} from ${config.name}:`, error);
            }
        }
    }
    console.log("Pull changes finished.");
}

let isSyncing = false;

async function runSync(db, schoolId, token) {
    if (isSyncing) {
        console.log('Sync already in progress. Skipping.');
        return;
    }
    isSyncing = true;
    console.log('Starting sync...');
    try {
        const lastSync = await new Promise((resolve, reject) => {
            db.get('SELECT last_sync FROM settings WHERE id = 1', (err, row) => {
                if (err) return reject(err);
                resolve(row ? row.last_sync : null);
            });
        });

        await pushChanges(db, schoolId, token);
        await pullChanges(db, schoolId, token, lastSync);

        const newSyncTime = new Date().toISOString();
        await new Promise((resolve, reject) => {
            db.run('UPDATE settings SET last_sync = ? WHERE id = 1', [newSyncTime], (err) => {
                if (err) return reject(err);
                resolve();
            });
        });
        console.log('Sync finished successfully.');
    } catch (syncErr) {
        console.error('Sync process failed:', syncErr);
        throw syncErr; 
    } finally {
        isSyncing = false;
    }
}

function setupSyncIPC(db) {
  if (isSyncIpcSetup) {
    return;
  }
  isSyncIpcSetup = true;
    ipcMain.handle('sync:run', async (event, { schoolId, token }) => {
        try {
            await runSync(db, schoolId, token);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });
}

module.exports = { setupSyncIPC, runSync };