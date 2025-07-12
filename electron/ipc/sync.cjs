const { ipcMain, BrowserWindow } = require('electron');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

let isSyncIpcSetup = false;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL or Anon Key is missing. Make sure to set it in the .env file.");
}

// --- Helper function to send logs to renderer ---
function sendSyncLog(level, message, details) {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
        win.webContents.send('sync:log', { level, message, details });
    }
    console.log(`[SYNC:${level.toUpperCase()}] ${message}`, details || '');
}

// --- Helper functions for ID resolution ---
async function getSupabaseId(prisma, modelName, localId) {
    if (!localId) return null;
    const record = await prisma[modelName].findUnique({ where: { id: localId }, select: { supabase_id: true } });
    return record ? record.supabase_id : null;
}

async function getLocalId(prisma, modelName, supabaseId) {
    if (!supabaseId) return null;
    const record = await prisma[modelName].findUnique({ where: { supabase_id: supabaseId }, select: { id: true } });
    return record ? record.id : null;
}

// --- Table Configurations for Synchronization ---
const tableConfigs = {
    roles: {
        name: 'roles', model: 'roles',
        pullSelect: '*'
    },
    schools: {
        name: 'schools', model: 'schools',
        pullSelect: '*'
    },
    users: {
        name: 'users', model: 'users',
        pullSelect: '*, roles(*)', pullFilterColumn: 'school_id',
        supabaseMap: (row, schoolId) => ({ 
            name: row.name, first_name: row.first_name, phone: row.phone, email: row.email, 
            password_hash: row.password_hash, role_id: row.role_id, school_id: schoolId, 
            profil_picture_url: row.profil_picture_url 
        }),
        localMap: (row) => ({ 
            name: row.name, firstName: row.first_name, phone: row.phone, email: row.email, 
            password_hash: row.password_hash, role_id: row.role_id, school_id: row.school_id, 
            profil_picture_url: row.profil_picture_url 
        })
    },
    classes: {
        name: 'classes', model: 'classes',
        pullSelect: '*', pullFilterColumn: 'school_id',
        supabaseMap: (row, schoolId) => ({ name: row.name, level: row.level, school_id: schoolId }),
        localMap: (row) => ({ name: row.name, level: row.level })
    },
    subjects: {
        name: 'subjects', model: 'subjects',
        pullSelect: '*', pullFilterColumn: 'school_id',
        supabaseMap: async (row, schoolId, prisma) => {
            const classSupabaseId = await getSupabaseId(prisma, 'classes', row.classId);
            if (!classSupabaseId) return null;
            return { name: row.name, coefficient: row.coefficient, school_year: row.school_year, class_id: classSupabaseId, school_id: schoolId };
        },
        localMap: async (row, prisma) => {
            const classLocalId = await getLocalId(prisma, 'classes', row.class_id);
            if (!classLocalId) return null;
            return { name: row.name, coefficient: row.coefficient, school_year: row.school_year, classId: classLocalId };
        }
    },
    students: {
        name: 'students', model: 'students',
        pullSelect: '*, registrations!inner(*)', pullFilterColumn: 'registrations.school_id',
        supabaseMap: (row) => ({ first_name: row.firstName, last_name: row.lastName, birth_date: row.birth_date, genre: row.genre, matricul: row.matricul, picture_url: row.picture_url }),
        localMap: (row) => ({ firstName: row.first_name, lastName: row.last_name, birth_date: row.birth_date, genre: row.genre, matricul: row.matricul, picture_url: row.picture_url })
    },
    teachers: {
        name: 'teachers', model: 'teachers',
        pullSelect: '*, users!inner(*)', pullFilterColumn: 'users.school_id',
        supabaseMap: async (row, schoolId, prisma) => {
            const userSupabaseId = await getSupabaseId(prisma, 'users', row.userId);
            if (!userSupabaseId) return null;
            return { user_id: userSupabaseId, speciality: row.speciality, matricule: row.matricule };
        },
        localMap: async (row, prisma) => {
            const userLocalId = await getLocalId(prisma, 'users', row.user_id);
            if (!userLocalId) return null;
            return { userId: userLocalId, speciality: row.speciality, matricule: row.matricule };
        }
    },
    parents: {
        name: 'parents', model: 'parents',
        pullSelect: '*, users!inner(*)', pullFilterColumn: 'users.school_id',
        supabaseMap: async (row, schoolId, prisma) => {
            const userSupabaseId = await getSupabaseId(prisma, 'users', row.userId);
            if (!userSupabaseId) return null;
            return { user_id: userSupabaseId, profession: row.profession, address: row.address, name: row.name, phone: row.phone, email: row.email };
        },
        localMap: async (row, prisma) => {
            const userLocalId = await getLocalId(prisma, 'users', row.user_id);
            if (!userLocalId) return null;
            return { userId: userLocalId, profession: row.profession, address: row.address, name: row.name, phone: row.phone, email: row.email };
        }
    },
    registrations: {
        name: 'registrations', model: 'registrations',
        pullSelect: '*', pullFilterColumn: 'school_id',
        supabaseMap: async (row, schoolId, prisma) => {
            const [studentSupabaseId, classSupabaseId] = await Promise.all([
                getSupabaseId(prisma, 'students', row.studentId),
                getSupabaseId(prisma, 'classes', row.classId)
            ]);
            if (!studentSupabaseId || !classSupabaseId) return null;
            return { student_id: studentSupabaseId, class_id: classSupabaseId, school_year: row.schoolYear, state: row.state, registration_date: row.registration_date, school_id: schoolId };
        },
        localMap: async (row, prisma) => {
            const [studentLocalId, classLocalId] = await Promise.all([
                getLocalId(prisma, 'students', row.student_id),
                getLocalId(prisma, 'classes', row.class_id)
            ]);
            if (!studentLocalId || !classLocalId) return null;
            return { studentId: studentLocalId, classId: classLocalId, schoolYear: row.school_year, state: row.state, registration_date: row.registration_date };
        }
    },
    student_parents: {
        name: 'student_parents', model: 'studentParents',
        pullSelect: '*, students!inner(registrations!inner(*))', pullFilterColumn: 'students.registrations.school_id',
        supabaseMap: async (row, schoolId, prisma) => {
            const [studentSupabaseId, parentSupabaseId] = await Promise.all([
                getSupabaseId(prisma, 'students', row.studentId),
                getSupabaseId(prisma, 'parents', row.parentId)
            ]);
            if (!studentSupabaseId || !parentSupabaseId) return null;
            return { student_id: studentSupabaseId, parent_id: parentSupabaseId, relation: row.relation };
        },
        localMap: async (row, prisma) => {
            const [studentLocalId, parentLocalId] = await Promise.all([
                getLocalId(prisma, 'students', row.student_id),
                getLocalId(prisma, 'parents', row.parent_id)
            ]);
            if (!studentLocalId || !parentLocalId) return null;
            return { studentId: studentLocalId, parentId: parentLocalId, relation: row.relation };
        }
    },
    lessons: {
        name: 'lessons', model: 'lessons',
        pullSelect: '*, classes!inner(*)', pullFilterColumn: 'classes.school_id',
        supabaseMap: async (row, schoolId, prisma) => {
            const [classSupabaseId, subjectSupabaseId, teacherSupabaseId] = await Promise.all([
                getSupabaseId(prisma, 'classes', row.classId),
                getSupabaseId(prisma, 'subjects', row.subjectId),
                getSupabaseId(prisma, 'teachers', row.teacherId)
            ]);
            if (!classSupabaseId || !subjectSupabaseId) return null;
            return { class_id: classSupabaseId, subject_id: subjectSupabaseId, teacher_id: teacherSupabaseId, school_year: row.schoolYear };
        },
        localMap: async (row, prisma) => {
            const [classLocalId, subjectLocalId, teacherLocalId] = await Promise.all([
                getLocalId(prisma, 'classes', row.class_id),
                getLocalId(prisma, 'subjects', row.subject_id),
                getLocalId(prisma, 'teachers', row.teacher_id)
            ]);
            if (!classLocalId || !subjectLocalId) return null;
            return { classId: classLocalId, subjectId: subjectLocalId, teacherId: teacherLocalId, schoolYear: row.school_year };
        }
    },
    schedules: {
        name: 'schedules', model: 'schedules',
        pullSelect: '*, lessons!inner(classes!inner(*))', pullFilterColumn: 'lessons.classes.school_id',
        supabaseMap: async (row, schoolId, prisma) => {
            const lessonSupabaseId = await getSupabaseId(prisma, 'lessons', row.lessonId);
            if (!lessonSupabaseId) return null;
            return { lesson_id: lessonSupabaseId, day_of_week: row.day_of_week, start_time: row.start_time, end_time: row.end_time };
        },
        localMap: async (row, prisma) => {
            const lessonLocalId = await getLocalId(prisma, 'lessons', row.lesson_id);
            if (!lessonLocalId) return null;
            return { lessonId: lessonLocalId, day_of_week: row.day_of_week, start_time: row.start_time, end_time: row.end_time };
        }
    },
    payments: {
        name: 'payments', model: 'payments',
        pullSelect: '*, registrations!inner(*)', pullFilterColumn: 'registrations.school_id',
        supabaseMap: async (row, schoolId, prisma) => {
            const registrationSupabaseId = await getSupabaseId(prisma, 'registrations', row.registrationId);
            if (!registrationSupabaseId) return null;
            return { registration_id: registrationSupabaseId, amount: row.amount, date: row.date, method: row.method, reference: row.reference, month: row.month };
        },
        localMap: async (row, prisma) => {
            const registrationLocalId = await getLocalId(prisma, 'registrations', row.registration_id);
            if (!registrationLocalId) return null;
            return { registrationId: registrationLocalId, amount: row.amount, date: row.date, method: row.method, reference: row.reference, month: row.month };
        }
    },
    notes: {
        name: 'notes', model: 'notes',
        pullSelect: '*, lessons!inner(classes!inner(*))', pullFilterColumn: 'lessons.classes.school_id',
        supabaseMap: async (row, schoolId, prisma) => {
            const [studentSupabaseId, lessonSupabaseId] = await Promise.all([
                getSupabaseId(prisma, 'students', row.studentId),
                getSupabaseId(prisma, 'lessons', row.lessonId)
            ]);
            if (!studentSupabaseId || !lessonSupabaseId) return null;
            return { student_id: studentSupabaseId, lesson_id: lessonSupabaseId, value: row.value, type: row.type, quarter: row.quarter };
        },
        localMap: async (row, prisma) => {
            const [studentLocalId, lessonLocalId] = await Promise.all([
                getLocalId(prisma, 'students', row.student_id),
                getLocalId(prisma, 'lessons', row.lesson_id)
            ]);
            if (!studentLocalId || !lessonLocalId) return null;
            return { studentId: studentLocalId, lessonId: lessonLocalId, value: row.value, type: row.type, quarter: row.quarter };
        }
    },
    attendances: {
        name: 'attendances', model: 'attendances',
        pullSelect: '*, students!inner(registrations!inner(*))', pullFilterColumn: 'students.registrations.school_id',
        supabaseMap: async (row, schoolId, prisma) => {
            const studentSupabaseId = await getSupabaseId(prisma, 'students', row.studentId);
            if (!studentSupabaseId) return null;
            return { student_id: studentSupabaseId, date: row.date, status: row.status, justification: row.justification };
        },
        localMap: async (row, prisma) => {
            const studentLocalId = await getLocalId(prisma, 'students', row.student_id);
            if (!studentLocalId) return null;
            return { studentId: studentLocalId, date: row.date, status: row.status, justification: row.justification };
        }
    },
    fees: {
        name: 'fees', model: 'fees',
        pullSelect: '*', pullFilterColumn: 'school_id',
        supabaseMap: (row, schoolId) => ({ name: row.name, amount: row.amount, due_date: row.due_date, school_year: row.school_year, school_id: schoolId }),
        localMap: (row) => ({ name: row.name, amount: row.amount, due_date: row.due_date, school_year: row.school_year })
    }
};

const syncOrder = [
    'roles', 'schools', 'users', 'classes', 'subjects', 'students', 'teachers', 'parents', 'registrations', 'student_parents', 'lessons', 'schedules', 'payments', 'notes', 'attendances', 'fees'
];

async function pushChanges(prisma, schoolId, supabase) {
    sendSyncLog('info', '🚀 Démarrage du PUSH vers Supabase...');

    for (const tableName of syncOrder) {
        const config = tableConfigs[tableName];
        if (!config.model) continue;
        const rowsToSync = await prisma[config.model].findMany({ where: { needs_sync: true } });

        if (rowsToSync.length === 0) {
            continue;
        }
        sendSyncLog('info', `[PUSH] ${rowsToSync.length} enregistrement(s) à envoyer pour la table '${config.name}'.`);

        for (const row of rowsToSync) {
            try {
                if (row.is_deleted) {
                    if (row.supabase_id) {
                        sendSyncLog('info', `  -> 🗑️  [DELETE] Suppression de ${config.name} #${row.id} sur Supabase...`);
                        const { error } = await supabase
                            .from(config.name)
                            .update({ is_deleted: true, last_modified: new Date().toISOString() })
                            .match({ id: row.supabase_id });
                        if (error) throw error;
                        await prisma[config.model].delete({ where: { id: row.id } });
                        sendSyncLog('success', `     ✅ Suppression locale et distante réussie.`);
                    }
                } else {
                    const mappedData = await config.supabaseMap(row, schoolId, prisma);
                    if (!mappedData) {
                        sendSyncLog('warn', `  -> ⚠️  [SKIP] Ignoré ${config.name} #${row.id} (dépendances non résolues).`);
                        continue;
                    }

                    let supabase_id = row.supabase_id;
                    if (supabase_id) { // Update
                        sendSyncLog('info', `  -> 🔄  [UPDATE] Mise à jour de ${config.name} #${row.id} sur Supabase...`, { data: mappedData });
                        const { error } = await supabase.from(config.name).update({ ...mappedData, last_modified: new Date().toISOString() }).match({ id: supabase_id });
                        if (error) throw error;
                    } else { // Insert
                        sendSyncLog('info', `  -> ✨  [CREATE] Création de ${config.name} #${row.id} sur Supabase...`, { data: mappedData });
                        const { data, error } = await supabase.from(config.name).insert(mappedData).select('id');
                        if (error) throw error;
                        supabase_id = data[0].id;
                        sendSyncLog('info', `     📦 Nouvel ID Supabase: ${supabase_id}`);
                    }

                    await prisma[config.model].update({
                        where: { id: row.id },
                        data: { needs_sync: false, supabase_id: supabase_id, last_modified: new Date() },
                    });
                    sendSyncLog('success', `     ✅ Statut de synchronisation mis à jour localement.`);
                }
            } catch (error) {
                sendSyncLog('error', `  -> ❌  [ERREUR PUSH] Échec pour la ligne #${row.id} de la table ${config.name}:`, { error: error.message });
            }
        }
    }
    sendSyncLog('success', '✅ PUSH terminé.');
}

async function pullChanges(prisma, schoolId, supabase) {
    sendSyncLog('info', '📥 Démarrage du PULL depuis Supabase...');

    for (const tableName of [...syncOrder].reverse()) {
        const config = tableConfigs[tableName];
        if (!config.model) continue;
        const lastRecord = await prisma[config.model].findFirst({ orderBy: { last_modified: 'desc' } });
        const lastSyncTime = lastRecord ? lastRecord.last_modified.toISOString() : '1970-01-01T00:00:00Z';
        
        sendSyncLog('info', `[PULL] Table '${config.name}': Recherche des modifications depuis ${lastSyncTime}`);

        let query = supabase.from(config.name).select(config.pullSelect);
        
        if (config.pullFilterColumn) {
            query = query.eq(config.pullFilterColumn, schoolId);
        } else if (config.name !== 'roles' && config.name !== 'schools') { // Ne pas filtrer les rôles et les écoles par école
             query = query.eq('school_id', schoolId);
        }

        query = query.gt('last_modified', lastSyncTime);

        const { data: supabaseRows, error } = await query;

        if (error) {
            sendSyncLog('error', `  -> ❌  [ERREUR PULL] Échec de la récupération pour la table ${config.name}:`, { error: error.message });
            continue;
        }

        if (supabaseRows.length === 0) {
            sendSyncLog('info', `  -> ✅  Aucune nouvelle donnée pour '${config.name}'.`);
            continue;
        }
        sendSyncLog('info', `  -> 📂  ${supabaseRows.length} enregistrement(s) trouvé(s) pour '${config.name}'. Traitement...`);

        for (const row of supabaseRows) {
            try {
                const localRow = await prisma[config.model].findUnique({ where: { supabase_id: row.id } });

                if (row.is_deleted) {
                    if (localRow) {
                        sendSyncLog('info', `    -> 🗑️  [DELETE] Suppression de ${config.name} #${localRow.id} (depuis supabase_id: ${row.id})`);
                        await prisma[config.model].delete({ where: { id: localRow.id } });
                    }
                    continue;
                }

                const mappedData = await config.localMap(row, prisma);
                if (!mappedData) {
                    sendSyncLog('warn', `    -> ⚠️  [SKIP] Ignoré ${config.name} (supabase_id: ${row.id}) (dépendances non résolues).`);
                    continue;
                }

                if (localRow) { // Update
                    if (new Date(row.last_modified) > new Date(localRow.last_modified)) {
                        sendSyncLog('info', `    -> 🔄  [UPDATE] Mise à jour de ${config.name} #${localRow.id} depuis Supabase...`, { data: mappedData });
                        await prisma[config.model].update({
                            where: { id: localRow.id },
                            data: { ...mappedData, last_modified: new Date(row.last_modified), needs_sync: false },
                        });
                        sendSyncLog('success', `       ✅ Mise à jour locale réussie.`);
                    }
                } else { // Insert
                    sendSyncLog('info', `    -> ✨  [CREATE] Création de ${config.name} (supabase_id: ${row.id}) localement...`, { data: mappedData });
                    await prisma[config.model].create({
                        data: {
                            ...mappedData,
                            supabase_id: row.id,
                            last_modified: new Date(row.last_modified),
                            needs_sync: false,
                        },
                    });
                    sendSyncLog('success', `       ✅ Création locale réussie.`);
                }
            } catch (error) {
                sendSyncLog('error', `    -> ❌  [ERREUR PULL] Échec pour la ligne supabase_id: ${row.id} de la table ${config.name}:`, { error: error.message });
            }
        }
    }
    sendSyncLog('success', '✅ PULL terminé.');
}

let isSyncing = false;

async function runSync(prisma, schoolId, token) {
    if (isSyncing) {
        sendSyncLog('warn', 'La synchronisation est déjà en cours.');
        return;
    }
    isSyncing = true;
    sendSyncLog('info', 'Démarrage du processus de synchronisation complet.');
    try {
        let supabaseAuthenticated;
        if (token) {
            supabaseAuthenticated = createClient(supabaseUrl, supabaseAnonKey, {
                global: {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            });
        } else {
            supabaseAuthenticated = createClient(supabaseUrl, supabaseAnonKey);
        }

        await pushChanges(prisma, schoolId, supabaseAuthenticated);
        await pullChanges(prisma, schoolId, supabaseAuthenticated);

        sendSyncLog('success', 'Synchronisation terminée avec succès.');
    } catch (syncErr) {
        sendSyncLog('error', 'Le processus de synchronisation a échoué.', { error: syncErr.message });
        throw syncErr; 
    } finally {
        isSyncing = false;
    }
}

function setupSyncIPC(prisma) {
  if (isSyncIpcSetup) {
    return;
  }
  isSyncIpcSetup = true;
    ipcMain.handle('sync:run', async (event, { schoolId, token }) => {
        try {
            await runSync(prisma, schoolId, token);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });
}

module.exports = { setupSyncIPC, runSync };