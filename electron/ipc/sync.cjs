const { ipcMain } = require('electron');
const { createClient } = require('@supabase/supabase-js');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL or Anon Key is missing. Make sure to set it in the .env file.");
}
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize SQLite DB connection
let db;
function getDbConnection() {
    if (!db) {
        db = new sqlite3.Database(path.join(__dirname, '../../database.sqlite'), (err) => {
            if (err) {
                console.error('Sync: Error connecting to database:', err);
            }
        });
    }
    return db;
}

const tableConfigs = {
    classes: {
        name: 'classes',
        supabaseMap: (row, schoolId) => ({ name: row.name, school_id: schoolId }),
        localMap: (row) => ({ name: row.name })
    },
    students: {
        name: 'students',
        supabaseMap: async (row, schoolId, db) => {
            const classSupabaseId = await new Promise((resolve, reject) => {
                db.get('SELECT supabase_id FROM classes WHERE id = ?', [row.classId], (err, classRow) => {
                    if (err) return reject(new Error(`DB error looking up class ${row.classId}: ${err.message}`));
                    resolve(classRow ? classRow.supabase_id : null);
                });
            });

            if (!classSupabaseId) {
                console.log(`Dependency not met for student ${row.id}: class ${row.classId} not synced. Skipping.`);
                return null;
            }
            
            let parentInfoParsed = {};
            try {
                if (row.parentInfo && row.parentInfo.trim() !== '') {
                    parentInfoParsed = JSON.parse(row.parentInfo);
                }
            } catch (e) {
                console.error(`Invalid JSON for parentInfo for student ${row.id}: ${row.parentInfo}. Skipping.`);
                return null;
            }

            return {
                first_name: row.firstName,
                last_name: row.lastName,
                date_of_birth: row.dateOfBirth,
                gender: row.gender,
                address: row.address,
                parent_info: parentInfoParsed,
                class_id: classSupabaseId,
                school_id: schoolId,
            };
        },
        localMap: async (row, db) => {
            const classLocalId = await new Promise((resolve, reject) => {
                db.get('SELECT id FROM classes WHERE supabase_id = ?', [row.class_id], (err, classRow) => {
                    if (err) return reject(new Error(`DB error looking up class with supabase_id ${row.class_id}: ${err.message}`));
                    resolve(classRow ? classRow.id : null);
                });
            });

            if (!classLocalId) {
                console.log(`Dependency not met for student with supabase_id ${row.id}: class with supabase_id ${row.class_id} not found locally. Skipping.`);
                return null;
            }

            return {
                firstName: row.first_name,
                lastName: row.last_name,
                dateOfBirth: row.date_of_birth,
                gender: row.gender,
                address: row.address,
                parentInfo: JSON.stringify(row.parent_info || {}),
                classId: classLocalId,
            };
        }
    },
    teachers: {
        name: 'teachers',
        supabaseMap: (row, schoolId) => ({
            first_name: row.firstName,
            last_name: row.lastName,
            email: row.email,
            phone: row.phone,
            hire_date: row.hireDate,
            specialty: row.specialty,
            school_id: schoolId,
        }),
        localMap: (row) => ({
            firstName: row.first_name,
            lastName: row.last_name,
            email: row.email,
            phone: row.phone,
            hireDate: row.hire_date,
            specialty: row.specialty,
        })
    },
    subjects: {
        name: 'subjects',
        supabaseMap: async (row, schoolId, db) => {
            const teacherSupabaseId = await new Promise((resolve, reject) => {
                db.get('SELECT supabase_id FROM teachers WHERE id = ?', [row.teacherId], (err, teacherRow) => {
                    if (err) return reject(new Error(`DB error looking up teacher ${row.teacherId}: ${err.message}`));
                    resolve(teacherRow ? teacherRow.supabase_id : null);
                });
            });

            if (!teacherSupabaseId) {
                console.log(`Dependency not met for subject ${row.id}: teacher ${row.teacherId} not synced. Skipping.`);
                return null;
            }

            return {
                name: row.name,
                coefficient: row.coefficient,
                teacher_id: teacherSupabaseId,
                school_id: schoolId,
            };
        },
        localMap: async (row, db) => {
            const teacherLocalId = await new Promise((resolve, reject) => {
                db.get('SELECT id FROM teachers WHERE supabase_id = ?', [row.teacher_id], (err, teacherRow) => {
                    if (err) return reject(new Error(`DB error looking up teacher with supabase_id ${row.teacher_id}: ${err.message}`));
                    resolve(teacherRow ? teacherRow.id : null);
                });
            });

            if (!teacherLocalId) {
                console.log(`Dependency not met for subject with supabase_id ${row.id}: teacher with supabase_id ${row.teacher_id} not found locally. Skipping.`);
                return null;
            }

            return {
                name: row.name,
                coefficient: row.coefficient,
                teacherId: teacherLocalId,
            };
        }
    },
    class_subjects: {
        name: 'class_subjects',
        supabaseMap: async (row, schoolId, db) => {
            const classSupabaseId = await new Promise((resolve, reject) => {
                db.get('SELECT supabase_id FROM classes WHERE id = ?', [row.classId], (err, classRow) => {
                    if (err) return reject(new Error(`DB error looking up class ${row.classId}: ${err.message}`));
                    resolve(classRow ? classRow.supabase_id : null);
                });
            });

            const subjectSupabaseId = await new Promise((resolve, reject) => {
                db.get('SELECT supabase_id FROM subjects WHERE id = ?', [row.subjectId], (err, subjectRow) => {
                    if (err) return reject(new Error(`DB error looking up subject ${row.subjectId}: ${err.message}`));
                    resolve(subjectRow ? subjectRow.supabase_id : null);
                });
            });

            if (!classSupabaseId || !subjectSupabaseId) {
                console.log(`Dependency not met for class_subject ${row.id}. Skipping.`);
                return null;
            }

            return {
                class_id: classSupabaseId,
                subject_id: subjectSupabaseId,
                hours_per_week: row.hoursPerWeek,
                school_id: schoolId,
            };
        },
        localMap: async (row, db) => {
            const classLocalId = await new Promise((resolve, reject) => {
                db.get('SELECT id FROM classes WHERE supabase_id = ?', [row.class_id], (err, classRow) => {
                    if (err) return reject(new Error(`DB error looking up class with supabase_id ${row.class_id}: ${err.message}`));
                    resolve(classRow ? classRow.id : null);
                });
            });

            const subjectLocalId = await new Promise((resolve, reject) => {
                db.get('SELECT id FROM subjects WHERE supabase_id = ?', [row.subject_id], (err, subjectRow) => {
                    if (err) return reject(new Error(`DB error looking up subject with supabase_id ${row.subject_id}: ${err.message}`));
                    resolve(subjectRow ? subjectRow.id : null);
                });
            });

            if (!classLocalId || !subjectLocalId) {
                console.log(`Dependency not met for class_subject with supabase_id ${row.id}. Skipping.`);
                return null;
            }

            return {
                classId: classLocalId,
                subjectId: subjectLocalId,
                hoursPerWeek: row.hours_per_week,
            };
        }
    },
    grades: {
        name: 'grades',
        supabaseMap: async (row, schoolId, db) => {
            const studentSupabaseId = await new Promise((resolve, reject) => {
                db.get('SELECT supabase_id FROM students WHERE id = ?', [row.studentId], (err, studentRow) => {
                    if (err) return reject(new Error(`DB error looking up student ${row.studentId}: ${err.message}`));
                    resolve(studentRow ? studentRow.supabase_id : null);
                });
            });

            const subjectSupabaseId = await new Promise((resolve, reject) => {
                db.get('SELECT supabase_id FROM subjects WHERE id = ?', [row.subjectId], (err, subjectRow) => {
                    if (err) return reject(new Error(`DB error looking up subject ${row.subjectId}: ${err.message}`));
                    resolve(subjectRow ? subjectRow.supabase_id : null);
                });
            });

            if (!studentSupabaseId || !subjectSupabaseId) {
                console.log(`Dependency not met for grade ${row.id}. Skipping.`);
                return null;
            }

            return {
                student_id: studentSupabaseId,
                subject_id: subjectSupabaseId,
                term: row.term,
                value: row.value,
                comment: row.comment,
                school_id: schoolId,
            };
        },
        localMap: async (row, db) => {
            const studentLocalId = await new Promise((resolve, reject) => {
                db.get('SELECT id FROM students WHERE supabase_id = ?', [row.student_id], (err, studentRow) => {
                    if (err) return reject(new Error(`DB error looking up student with supabase_id ${row.student_id}: ${err.message}`));
                    resolve(studentRow ? studentRow.id : null);
                });
            });

            const subjectLocalId = await new Promise((resolve, reject) => {
                db.get('SELECT id FROM subjects WHERE supabase_id = ?', [row.subject_id], (err, subjectRow) => {
                    if (err) return reject(new Error(`DB error looking up subject with supabase_id ${row.subject_id}: ${err.message}`));
                    resolve(subjectRow ? subjectRow.id : null);
                });
            });

            if (!studentLocalId || !subjectLocalId) {
                console.log(`Dependency not met for grade with supabase_id ${row.id}. Skipping.`);
                return null;
            }

            return {
                studentId: studentLocalId,
                subjectId: subjectLocalId,
                term: row.term,
                value: row.value,
                comment: row.comment,
            };
        }
    },
    payments: {
        name: 'payments',
        supabaseMap: async (row, schoolId, db) => {
            const studentSupabaseId = await new Promise((resolve, reject) => {
                db.get('SELECT supabase_id FROM students WHERE id = ?', [row.studentId], (err, studentRow) => {
                    if (err) return reject(new Error(`DB error looking up student ${row.studentId}: ${err.message}`));
                    resolve(studentRow ? studentRow.supabase_id : null);
                });
            });

            if (!studentSupabaseId) {
                console.log(`Dependency not met for payment ${row.id}. Skipping.`);
                return null;
            }

            return {
                student_id: studentSupabaseId,
                amount: row.amount,
                date: row.date,
                month: row.month,
                status: row.status,
                school_id: schoolId,
            };
        },
        localMap: async (row, db) => {
            const studentLocalId = await new Promise((resolve, reject) => {
                db.get('SELECT id FROM students WHERE supabase_id = ?', [row.student_id], (err, studentRow) => {
                    if (err) return reject(new Error(`DB error looking up student with supabase_id ${row.student_id}: ${err.message}`));
                    resolve(studentRow ? studentRow.id : null);
                });
            });

            if (!studentLocalId) {
                console.log(`Dependency not met for payment with supabase_id ${row.id}. Skipping.`);
                return null;
            }

            return {
                studentId: studentLocalId,
                amount: row.amount,
                date: row.date,
                month: row.month,
                status: row.status,
            };
        }
    },
    attendances: {
        name: 'attendances',
        supabaseMap: async (row, schoolId, db) => {
            const studentSupabaseId = await new Promise((resolve, reject) => {
                db.get('SELECT supabase_id FROM students WHERE id = ?', [row.studentId], (err, studentRow) => {
                    if (err) return reject(new Error(`DB error looking up student ${row.studentId}: ${err.message}`));
                    resolve(studentRow ? studentRow.supabase_id : null);
                });
            });

            if (!studentSupabaseId) {
                console.log(`Dependency not met for attendance ${row.id}. Skipping.`);
                return null;
            }

            return {
                student_id: studentSupabaseId,
                date: row.date,
                status: row.status,
                notes: row.notes,
                school_id: schoolId,
            };
        },
        localMap: async (row, db) => {
            const studentLocalId = await new Promise((resolve, reject) => {
                db.get('SELECT id FROM students WHERE supabase_id = ?', [row.student_id], (err, studentRow) => {
                    if (err) return reject(new Error(`DB error looking up student with supabase_id ${row.student_id}: ${err.message}`));
                    resolve(studentRow ? studentRow.id : null);
                });
            });

            if (!studentLocalId) {
                console.log(`Dependency not met for attendance with supabase_id ${row.id}. Skipping.`);
                return null;
            }

            return {
                studentId: studentLocalId,
                date: row.date,
                status: row.status,
                notes: row.notes,
            };
        }
    },
};

// Fonction générique pour synchroniser une table
async function syncTable(config, schoolId) {
    const db = getDbConnection();
    const { name: tableName, supabaseMap } = config;

    const recordsToSync = await new Promise((resolve, reject) => {
        db.all(`SELECT * FROM ${tableName} WHERE needs_sync = 1`, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });

    if (recordsToSync.length === 0) {
        console.log(`No changes to push for table: ${tableName}`);
        return;
    }

    console.log(`Pushing ${recordsToSync.length} changes for table: ${tableName}`);

    for (const record of recordsToSync) {
        try {
            if (record.is_deleted) {
                if (record.supabase_id) {
                    const { error } = await supabase.from(tableName).delete().match({ id: record.supabase_id });
                    if (error) throw error;
                    console.log(`Deleted record ${record.id} from Supabase table ${tableName}`);
                }
            } else {
                const supabaseRecord = await supabaseMap(record, schoolId, db);
                
                if (supabaseRecord === null) {
                    continue;
                }

                if (record.supabase_id) {
                    const { error } = await supabase.from(tableName).update(supabaseRecord).match({ id: record.supabase_id });
                    if (error) throw error;
                    console.log(`Updated record ${record.id} in Supabase table ${tableName}`);
                } else {
                    const { data, error } = await supabase.from(tableName).insert(supabaseRecord).select('id').single();
                    if (error) throw error;
                    
                    await new Promise((resolve, reject) => {
                        db.run(`UPDATE ${tableName} SET supabase_id = ? WHERE id = ?`, [data.id, record.id], (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                    console.log(`Inserted record ${record.id} into Supabase table ${tableName} with new supabase_id ${data.id}`);
                }
            }

            await new Promise((resolve, reject) => {
                db.run(`UPDATE ${tableName} SET needs_sync = 0, last_modified = CURRENT_TIMESTAMP WHERE id = ?`, [record.id], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

        } catch (error) {
            console.error(`Failed to sync record ${record.id} from table ${tableName}:`, error.message);
        }
    }
}

async function pushChanges(schoolId) {
    console.log('Starting to push changes for school:', schoolId);
    await syncTable(tableConfigs.classes, schoolId);
    await syncTable(tableConfigs.students, schoolId);
    await syncTable(tableConfigs.teachers, schoolId);
    await syncTable(tableConfigs.subjects, schoolId);
    await syncTable(tableConfigs.class_subjects, schoolId);
    await syncTable(tableConfigs.grades, schoolId);
    await syncTable(tableConfigs.payments, schoolId);
    await syncTable(tableConfigs.attendances, schoolId);
}

async function pullTable(config, schoolId) {
    const db = getDbConnection();
    const { name: tableName, localMap } = config;

    const { data: remoteRecords, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('school_id', schoolId);

    if (error) {
        console.error(`Error pulling ${tableName}:`, error.message);
        return;
    }

    if (remoteRecords.length === 0) {
        console.log(`No remote records to pull for table: ${tableName}`);
        return;
    }

    console.log(`Pulling ${remoteRecords.length} records for table: ${tableName}`);

    for (const remoteRecord of remoteRecords) {
        try {
            const localRecord = await new Promise((resolve, reject) => {
                db.get(`SELECT * FROM ${tableName} WHERE supabase_id = ?`, [remoteRecord.id], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            const mappedData = await localMap(remoteRecord, db);
            if (mappedData === null) {
                console.log(`Skipping remote record ${remoteRecord.id} from table ${tableName} due to missing dependencies.`);
                continue;
            }

            const columns = Object.keys(mappedData);
            const values = Object.values(mappedData);

            if (localRecord) {
                // Update only if remote is newer to prevent overwriting local changes
                if (new Date(remoteRecord.last_modified) > new Date(localRecord.last_modified)) {
                    const setClause = columns.map(col => `${col} = ?`).join(', ');
                    const query = `UPDATE ${tableName} SET ${setClause}, last_modified = CURRENT_TIMESTAMP, needs_sync = 0 WHERE id = ?`;
                    await new Promise((resolve, reject) => {
                        db.run(query, [...values, localRecord.id], (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                }
            } else {
                // Insert new record from remote
                const columnsClause = columns.join(', ');
                const placeholders = columns.map(() => '?').join(', ');
                const query = `INSERT INTO ${tableName} (${columnsClause}, supabase_id, needs_sync, is_deleted) VALUES (${placeholders}, ?, 0, 0)`;
                await new Promise((resolve, reject) => {
                    db.run(query, [...values, remoteRecord.id], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }
        } catch (error) {
            console.error(`Failed to sync remote record ${remoteRecord.id} to table ${tableName}:`, error.message);
        }
    }

    // Gérer les suppressions distantes
    const remoteSupabaseIds = remoteRecords.map(r => r.id);
    if (remoteSupabaseIds.length > 0) {
        const placeholders = remoteSupabaseIds.map(() => '?').join(',');
        const query = `
            UPDATE ${tableName} 
            SET is_deleted = 1, needs_sync = 0, last_modified = CURRENT_TIMESTAMP 
            WHERE supabase_id IS NOT NULL 
              AND is_deleted = 0
              AND supabase_id NOT IN (${placeholders})
        `;
        
        await new Promise((resolve, reject) => {
            db.run(query, remoteSupabaseIds, function(err) {
                if (err) {
                    console.error(`Error soft-deleting remote-deleted records for ${tableName}:`, err.message);
                    reject(err);
                } else {
                    if (this.changes > 0) {
                        console.log(`Soft-deleted ${this.changes} records from ${tableName} that were deleted remotely.`);
                    }
                    resolve();
                }
            });
        });
    } else {
        // Si la table distante est vide pour ce school_id, supprimez tous les enregistrements locaux synchronisés
        const query = `
            UPDATE ${tableName}
            SET is_deleted = 1, needs_sync = 0, last_modified = CURRENT_TIMESTAMP
            WHERE supabase_id IS NOT NULL AND is_deleted = 0
        `;
        await new Promise((resolve, reject) => {
            db.run(query, [], function(err) {
                if (err) {
                    console.error(`Error soft-deleting all synced records for empty remote ${tableName}:`, err.message);
                    reject(err);
                } else {
                     if (this.changes > 0) {
                        console.log(`Soft-deleted ${this.changes} records from ${tableName} as remote is empty.`);
                    }
                    resolve();
                }
            });
        });
    }
}

async function pullChanges(schoolId) {
    console.log('Starting to pull changes for school:', schoolId);
    await pullTable(tableConfigs.classes, schoolId);
    await pullTable(tableConfigs.teachers, schoolId);
    await pullTable(tableConfigs.subjects, schoolId);
    await pullTable(tableConfigs.students, schoolId);
    await pullTable(tableConfigs.class_subjects, schoolId);
    await pullTable(tableConfigs.grades, schoolId);
    await pullTable(tableConfigs.payments, schoolId);
    await pullTable(tableConfigs.attendances, schoolId);
}

async function runSync(schoolId, authToken) {
    if (!schoolId) {
        console.error('Sync error: schoolId is required.');
        throw new Error('schoolId is required.');
    }
    if (!authToken) {
        console.error('Sync error: authToken is required.');
        throw new Error('authToken is required.');
    }

    // Set the auth token for the Supabase client for this session
    supabase.auth.setAuth(authToken);

    try {
        // Step 1: Push local changes to Supabase
        await pushChanges(schoolId);

        // Step 2: Pull remote changes from Supabase
        await pullChanges(schoolId);

        return { success: true };
    } catch (error) {
        console.error('Synchronization failed:', error);
        throw error;
    }
}

function setupSyncIPC() {
    ipcMain.handle('sync:run', async (event, { schoolId, authToken }) => {
        return runSync(schoolId, authToken);
    });
}

module.exports = {
    setupSyncIPC,
    runSync
};
