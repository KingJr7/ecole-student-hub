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

async function getLocalId(prisma, modelName, supabaseId) {
    if (!supabaseId) return null;
    const record = await prisma[modelName].findUnique({ where: { supabase_id: supabaseId }, select: { id: true } });
    return record ? record.id : null;
}

// --- Table Configurations for Synchronization ---
const tableConfigs = {
    classes: {
        name: 'classes', model: 'classes',
        pullSelect: '*',
        pullFilterColumn: 'school_id',
        supabaseMap: (row, schoolId) => ({ 
            name: row.name, 
            level: row.level, 
            school_id: schoolId 
        }),
        localMap: (row) => ({ 
            name: row.name, 
            level: row.level,
            school_id: row.school_id
        })
    },
    students: {
        name: 'students', model: 'students',
        pullSelect: '*, registrations!inner(*)',
        pullFilterColumn: 'registrations.school_id',
        supabaseMap: (row) => ({ 
            name: row.name,
            first_name: row.first_name,
            genre: row.genre,
            birth_date: row.birth_date,
            // picture_url: row.picture_url, // Colonne non existante sur Supabase
            matricul: row.matricul
        }),
        localMap: (row) => ({ 
            name: row.name,
            first_name: row.first_name,
            genre: row.genre,
            birth_date: row.birth_date,
            picture_url: row.picture_url,
            matricul: row.matricul // Ajouté pour la synchro
        })
    },
    registrations: {
        name: 'registrations', model: 'registrations',
        pullSelect: '*',
        pullFilterColumn: 'school_id',
        supabaseMap: async (row, schoolId, prisma, supabase) => {
            const [studentSupabaseId, classSupabaseId] = await Promise.all([
                getSupabaseId(prisma, 'students', row.student_id, schoolId, supabase),
                getSupabaseId(prisma, 'classes', row.class_id, schoolId, supabase)
            ]);
            if (!studentSupabaseId || !classSupabaseId) return null;
            return { 
                student_id: studentSupabaseId, 
                class_id: classSupabaseId, 
                school_id: schoolId, // Ajout du school_id
                school_year: row.school_year, 
                state: row.state, 
                registration_date: row.registration_date 
            };
        },
        localMap: async (row, prisma) => {
            const [studentLocalId, classLocalId] = await Promise.all([
                getLocalId(prisma, 'students', row.student_id),
                getLocalId(prisma, 'classes', row.class_id)
            ]);
            if (!studentLocalId || !classLocalId) return null;
            return { 
                studentId: studentLocalId, 
                classId: classLocalId, 
                school_year: row.school_year, 
                state: row.state, 
                registration_date: row.registration_date 
            };
        }
    },
    teachers: {
        name: 'teachers', model: 'teachers',
        pullSelect: '*, users(*)', // On récupère le teacher et le user associé
        pullFilterColumn: 'users.school_id', // On filtre sur le school_id du user associé
        supabaseMap: async (row, schoolId, prisma, supabase) => {
            const userData = {
                name: row.name,
                first_name: row.first_name,
                phone: row.phone,
                email: row.email,
                school_id: schoolId,
                role_id: row.role_id || '6bd5dc10-9df7-43f4-8539-6c0386b3cc33',
            };

            let userIdToLink;

            // Si le prof a déjà un user_supabase_id, on met à jour le user existant
            if (row.user_supabase_id) {
                const { error: updateUserError } = await supabase
                    .from('users')
                    .update(userData)
                    .eq('id', row.user_supabase_id);

                if (updateUserError) {
                    sendSyncLog('error', `  -> ❌ Erreur lors de la mise à jour du user Supabase pour le prof #${row.id}` , { error: updateUserError.message });
                    return null; // Échec, on ignore
                }
                userIdToLink = row.user_supabase_id;
            } else {
                // Sinon, on crée un nouvel utilisateur
                // On ajoute le mot de passe seulement à la création
                const { data: userCreated, error: createUserError } = await supabase
                    .from('users')
                    .insert({ ...userData, password_hash: row.password_hash || 'admin123' })
                    .select('id');

                if (createUserError || !userCreated || !userCreated[0]?.id) {
                    sendSyncLog('error', `  -> ❌ Erreur lors de la création du user Supabase pour le prof #${row.id}`, { error: createUserError?.message });
                    return null; // Échec, on ignore
                }
                userIdToLink = userCreated[0].id;
            }

            // On retourne les données du teacher à créer/mettre à jour
            return {
                user_id: userIdToLink,
                speciality: row.speciality,
                matricule: row.matricule,
                hourlyRate: row.hourlyRate, // Ajout du taux horaire
            };
        },
        localMap: (row) => {
            // Si le `user` associé n'est pas retourné par la requête,
            // cela signifie que le teacher n'appartient pas à l'école synchronisée.
            // On retourne un objet spécial pour l'ignorer avec un log clair.
            if (!row.users) {
                return { _ignore: true, reason: `N'appartient pas à l'école synchronisée.` };
            } 
            return {
                name: row.users.name,
                first_name: row.users.first_name,
                phone: row.users.phone,
                email: row.users.email,
                adress: row.users.address,
                speciality: row.speciality,
                matricule: row.matricule,
                hourlyRate: row.hourlyRate, // Ajout du taux horaire
                user_supabase_id: row.user_id, // L'ID du user Supabase
            }
        }
    },
    subjects: {
        name: 'subjects', model: 'subjects',
        pullSelect: '*',
        pullFilterColumn: 'school_id',
        supabaseMap: async (row, schoolId, prisma, supabase) => {
            const classSupabaseId = await getSupabaseId(prisma, 'classes', row.class_id, schoolId, supabase);
            if (!classSupabaseId) return null;
            return { 
                name: row.name, 
                coefficient: row.coefficient, 
                school_year: row.school_year, 
                class_id: classSupabaseId, 
                school_id: schoolId // Ajout du school_id
            };
        },
        localMap: async (row, prisma) => {
            const classLocalId = await getLocalId(prisma, 'classes', row.class_id);
            if (!classLocalId) return null;
            return { 
                name: row.name, 
                coefficient: row.coefficient, 
                school_year: row.school_year, 
                classId: classLocalId 
            };
        }
    },
    lessons: {
        name: 'lessons', model: 'lessons',
        pullSelect: '*, classes!inner(*)',
        pullFilterColumn: 'classes.school_id',
        supabaseMap: async (row, schoolId, prisma, supabase) => {
            const [teacherSupabaseId, classSupabaseId, subjectSupabaseId] = await Promise.all([
                getSupabaseId(prisma, 'teachers', row.teacher_id, schoolId, supabase),
                getSupabaseId(prisma, 'classes', row.class_id, schoolId, supabase),
                getSupabaseId(prisma, 'subjects', row.subject_id, schoolId, supabase)
            ]);
            if (!teacherSupabaseId || !classSupabaseId || !subjectSupabaseId) return null;
            return { 
                teacher_id: teacherSupabaseId, 
                class_id: classSupabaseId, 
                subject_id: subjectSupabaseId, 
                school_year: row.school_year 
            };
        },
        localMap: async (row, prisma) => {
            const [teacherLocalId, classLocalId, subjectLocalId] = await Promise.all([
                getLocalId(prisma, 'teachers', row.teacher_id),
                getLocalId(prisma, 'classes', row.class_id),
                getLocalId(prisma, 'subjects', row.subject_id)
            ]);
            if (!teacherLocalId || !classLocalId || !subjectLocalId) return null;
            return { 
                teacherId: teacherLocalId, 
                classId: classLocalId, 
                subjectId: subjectLocalId, 
                school_year: row.school_year 
            };
        }
    },
    notes: {
        name: 'notes', model: 'notes',
        pullSelect: '*, lessons!inner(classes!inner(*))',
        pullFilterColumn: 'lessons.classes.school_id',
        supabaseMap: async (row, schoolId, prisma, supabase) => {
            const [studentSupabaseId, lessonSupabaseId] = await Promise.all([
                getSupabaseId(prisma, 'students', row.student_id, schoolId, supabase),
                getSupabaseId(prisma, 'lessons', row.lesson_id, schoolId, supabase)
            ]);
            if (!studentSupabaseId || !lessonSupabaseId) return null;
            return { 
                student_id: studentSupabaseId, 
                lesson_id: lessonSupabaseId, 
                value: row.value, 
                type: row.type, 
                quarter: row.quarter 
            };
        },
        localMap: async (row, prisma) => {
            const [studentLocalId, lessonLocalId] = await Promise.all([
                getLocalId(prisma, 'students', row.student_id),
                getLocalId(prisma, 'lessons', row.lesson_id)
            ]);
            if (!studentLocalId || !lessonLocalId) return null;
            return { 
                studentId: studentLocalId, 
                lessonId: lessonLocalId, 
                value: row.value, 
                type: row.type, 
                quarter: row.quarter 
            };
        }
    },
    parents: {
        name: 'parents', model: 'parents',
        pullSelect: '*',
        pullFilterColumn: null, // Pas de school_id direct
        supabaseMap: (row) => ({
            name: row.name,
            first_name: row.first_name,
            phone: row.phone,
            email: row.email,
            address: row.adress,
            // gender: row.gender, // Colonne non existante sur Supabase
            profession: row.profession
        }),
        localMap: (row) => ({
            name: row.name,
            first_name: row.first_name,
            phone: row.phone,
            email: row.email,
            adress: row.address, // Correction du mapping pour le PULL
            gender: row.gender,
            profession: row.profession
        })
    },
    student_parents: {
        name: 'student_parents', model: 'studentParents',
        pullSelect: '*, students!inner(registrations!inner(*))',
        pullFilterColumn: 'students.registrations.school_id',
        supabaseMap: async (row, schoolId, prisma, supabase) => {
            const [studentSupabaseId, parentSupabaseId] = await Promise.all([
                getSupabaseId(prisma, 'students', row.student_id, schoolId, supabase),
                getSupabaseId(prisma, 'parents', row.parent_id, schoolId, supabase)
            ]);
            if (!studentSupabaseId || !parentSupabaseId) return null;
            return { 
                student_id: studentSupabaseId, 
                parent_id: parentSupabaseId, 
                relation: row.relation 
            };
        },
        localMap: async (row, prisma) => {
            const [studentLocalId, parentLocalId] = await Promise.all([
                getLocalId(prisma, 'students', row.student_id),
                getLocalId(prisma, 'parents', row.parent_id)
            ]);
            if (!studentLocalId || !parentLocalId) return null;
            return { 
                studentId: studentLocalId, 
                parentId: parentLocalId, 
                relation: row.relation 
            };
        }
    },
    payments: {
        name: 'payments', model: 'payments',
        pullSelect: '*, registrations!inner(*)',
        pullFilterColumn: 'registrations.school_id',
        supabaseMap: async (row, schoolId, prisma, supabase) => {
            const registrationSupabaseId = await getSupabaseId(prisma, 'registrations', row.registration_id, schoolId, supabase);
            if (!registrationSupabaseId) return null;
            return { 
                registration_id: registrationSupabaseId, 
                amount: row.amount, 
                method: row.method, 
                date: row.date, 
                reference: row.reference 
            };
        },
        localMap: async (row, prisma) => {
            const registrationLocalId = await getLocalId(prisma, 'registrations', row.registration_id);
            if (!registrationLocalId) return null;
            return { 
                registrationId: registrationLocalId, 
                amount: row.amount, 
                method: row.method, 
                date: row.date, 
                reference: row.reference 
            };
        }
    },
    fees: {
        name: 'fees', model: 'fees',
        pullSelect: '*',
        pullFilterColumn: 'school_id',
        supabaseMap: (row, schoolId) => ({ 
            name: row.name, 
            amount: row.amount, 
            due_date: row.due_date, 
            school_year: row.school_year 
        }),
        localMap: (row) => ({ 
            name: row.name, 
            amount: row.amount, 
            due_date: row.due_date, 
            school_year: row.school_year 
        })
    },
    attendances: {
        name: 'attendances', model: 'attendances',
        pullSelect: '*, students!inner(registrations!inner(*))',
        pullFilterColumn: 'students.registrations.school_id',
        supabaseMap: async (row, schoolId, prisma, supabase) => {
            const studentSupabaseId = await getSupabaseId(prisma, 'students', row.student_id, schoolId, supabase);
            if (!studentSupabaseId) return null;
            return { 
                student_id: studentSupabaseId, 
                date: row.date, 
                state: row.state, 
                justification: row.justification 
            };
        },
        localMap: async (row, prisma) => {
            const studentLocalId = await getLocalId(prisma, 'students', row.student_id);
            if (!studentLocalId) return null;
            return { 
                studentId: studentLocalId, 
                date: row.date, 
                state: row.state, 
                justification: row.justification 
            };
        }
    },
    employees: {
        name: 'employees', model: 'employees',
        pullSelect: '*, users(*)', // Jointure pour récupérer les infos du user
        pullFilterColumn: 'school_id', // Le school_id est directement sur la table employees
        supabaseMap: async (row, schoolId, prisma, supabase) => {
            const userData = {
                name: row.name,
                first_name: row.first_name,
                phone: row.phone,
                email: row.email,
                school_id: schoolId,
                role_id: '47e589fe-c978-4493-ba2f-5cd849dbe622', // ID du rôle "Employé"
            };

            let userIdToLink;
            const existingUser = await prisma.employees.findUnique({ where: { id: row.id }, select: { user_supabase_id: true } });

            if (existingUser && existingUser.user_supabase_id) {
                const { error: updateUserError } = await supabase.from('users').update(userData).eq('id', existingUser.user_supabase_id);
                if (updateUserError) {
                    sendSyncLog('error', `  -> ❌ Erreur MàJ user pour employé #${row.id}`, { error: updateUserError.message });
                    return null;
                }
                userIdToLink = existingUser.user_supabase_id;
            } else {
                const { data: userCreated, error: createUserError } = await supabase.from('users').insert({ ...userData, password_hash: 'admin123' }).select('id');
                if (createUserError || !userCreated || !userCreated[0]?.id) {
                    sendSyncLog('error', `  -> ❌ Erreur création user pour employé #${row.id}`, { error: createUserError?.message });
                    return null;
                }
                userIdToLink = userCreated[0].id;
                // Mettre à jour le user_supabase_id localement pour les futures MàJ
                await prisma.employees.update({ where: { id: row.id }, data: { user_supabase_id: userIdToLink } });
            }

            return {
                user_id: userIdToLink,
                job_title: row.job_title,
                salary: row.salary,
                matricule: row.matricule,
                school_id: schoolId
            };
        },
        localMap: (row) => {
            if (!row.users) {
                return { _ignore: true, reason: `User associé introuvable pour l'employé.` };
            }
            return {
                name: row.users.name,
                first_name: row.users.first_name,
                phone: row.users.phone,
                email: row.users.email,
                job_title: row.job_title,
                salary: row.salary,
                matricule: row.matricule,
                user_supabase_id: row.user_id, // Stocker l'ID du user Supabase
                school_id: row.school_id
            };
        }
    },
    schedules: {
        name: 'schedules', model: 'schedules',
        pullSelect: '*, lessons!inner(classes!inner(*))',
        pullFilterColumn: 'lessons.classes.school_id',
        supabaseMap: async (row, schoolId, prisma, supabase) => {
            const lessonSupabaseId = await getSupabaseId(prisma, 'lessons', row.lesson_id, schoolId, supabase);
            if (!lessonSupabaseId) return null;
            return { 
                lesson_id: lessonSupabaseId, 
                day_of_week: row.day_of_week, 
                start_time: row.start_time, 
                end_time: row.end_time 
            };
        },
        localMap: async (row, prisma) => {
            const lessonLocalId = await getLocalId(prisma, 'lessons', row.lesson_id);
            if (!lessonLocalId) return null;
            return { 
                lessonId: lessonLocalId, 
                day_of_week: row.day_of_week, 
                start_time: row.start_time, 
                end_time: row.end_time 
            };
        }
    },
    salary_payments: {
        name: 'salary_payments', model: 'salaryPayments',
        pullSelect: '*, employees(*)', // Utilise le nom de la table liée pour la jointure
        pullFilterColumn: 'employees.school_id', // Filtre sur le school_id de l'employé via la relation
        supabaseMap: async (row, schoolId, prisma, supabase) => {
            const employeeSupabaseId = await getSupabaseId(prisma, 'employees', row.employee_id, schoolId, supabase);
            if (!employeeSupabaseId) return null;
            return {
                employee_id: employeeSupabaseId,
                base_salary: row.base_salary,
                bonus_amount: row.bonus_amount,
                total_amount: row.total_amount,
                payment_date: row.payment_date,
                notes: row.notes,
                last_modified: new Date().toISOString(),
                is_deleted: row.is_deleted
            };
        },
        localMap: async (row, prisma) => {
            const employeeLocalId = await getLocalId(prisma, 'employees', row.employee_id);
            if (!employeeLocalId) return null;
            return {
                employee_id: employeeLocalId,
                base_salary: row.base_salary,
                bonus_amount: row.bonus_amount,
                total_amount: row.total_amount,
                payment_date: row.payment_date,
                notes: row.notes,
                last_modified: row.last_modified,
                is_deleted: row.is_deleted
            };
        }
    },
    teacher_work_hours: {
        name: 'teacher_work_hours', model: 'teacherWorkHours',
        pullSelect: '*, teachers!inner(users!inner(*))', // Jointure pour filtrer par école
        pullFilterColumn: 'teachers.users.school_id',
        supabaseMap: async (row, schoolId, prisma, supabase) => {
            const teacherSupabaseId = await getSupabaseId(prisma, 'teachers', row.teacher_id, schoolId, supabase);
            const subjectSupabaseId = row.subject_id ? await getSupabaseId(prisma, 'subjects', row.subject_id, schoolId, supabase) : null;
            if (!teacherSupabaseId) return null; // Le prof est obligatoire
            return {
                teacher_id: teacherSupabaseId,
                subject_id: subjectSupabaseId,
                date: row.date,
                start_time: row.start_time,
                end_time: row.end_time,
                hours: row.hours,
                notes: row.notes
            };
        },
        localMap: async (row, prisma) => {
            const teacherLocalId = await getLocalId(prisma, 'teachers', row.teacher_id);
            const subjectLocalId = row.subject_id ? await getLocalId(prisma, 'subjects', row.subject_id) : null;
            if (!teacherLocalId || (row.subject_id && !subjectLocalId)) return null;
            return {
                teacherId: teacherLocalId,
                subjectId: subjectLocalId,
                date: row.date,
                start_time: row.start_time,
                end_time: row.end_time,
                hours: row.hours,
                notes: row.notes
            };
        }
    }
};

// --- Helper functions for ID resolution ---
async function getSupabaseId(prisma, modelName, localId, schoolId, supabase) {
    if (!localId) return null;

    // 1. Trouver l'enregistrement local
    const localRecord = await prisma[modelName].findUnique({ where: { id: localId } });
    if (!localRecord) return null;

    // 2. S'il a déjà un supabase_id, le retourner
    if (localRecord.supabase_id) {
        return localRecord.supabase_id;
    }

    // 3. Sinon, il faut le "pusher" à la volée pour résoudre la dépendance
    sendSyncLog('info', `    -> 🔗 [DEP] Résolution de la dépendance pour ${modelName} #${localId}...`);
    const config = Object.values(tableConfigs).find(c => c.model === modelName);
    if (!config) {
        sendSyncLog('error', `      -> ❌ Configuration de table introuvable pour le modèle ${modelName}`);
        return null;
    }

    const mappedData = await config.supabaseMap(localRecord, schoolId, prisma, supabase);
    if (!mappedData) {
        sendSyncLog('warn', `      -> ⚠️ Impossible de mapper ${modelName} #${localId} pour la résolution de dépendance.`);
        return null;
    }

    const { data, error } = await supabase.from(config.name).insert(mappedData).select('id');

    if (error) {
        sendSyncLog('error', `      -> ❌ Erreur lors de l'insertion de la dépendance ${modelName} #${localId}:`, { error: error.message });
        return null;
    }

    const supabase_id = data[0].id;
    sendSyncLog('success', `      -> ✅ Dépendance ${modelName} #${localId} créée sur Supabase avec l'ID: ${supabase_id}`);

    // Mettre à jour l'enregistrement local avec le nouvel ID et le marquer comme synchronisé
    await prisma[modelName].update({
        where: { id: localId },
        data: { supabase_id: supabase_id, needs_sync: false, last_modified: new Date() },
    });

    return supabase_id;
}

const syncOrder = [
    // Entités de base sans dépendances externes majeures
    'classes', 
    'students', 
    'parents', 
    'teachers', 
    'employees', 
    'fees',
    
    // Entités dépendant des entités de base
    'subjects',        // Dépend de 'classes'
    'registrations',   // Dépend de 'students' et 'classes'
    'student_parents', // Dépend de 'students' et 'parents'
    'attendances',     // Dépend de 'students'
    'salary_payments', // Dépend de 'employees'
    'teacher_work_hours', // Dépend de 'teachers' et 'subjects'
    
    // Entités dépendant du niveau précédent
    'lessons',         // Dépend de 'teachers', 'classes', 'subjects'
    
    // Entités dépendant du niveau 2
    'notes',           // Dépend de 'students' et 'lessons'
    'schedules',       // Dépend de 'lessons'
    'payments'         // Dépend de 'registrations' et 'fees'
];

async function pushChanges(prisma, schoolId, supabase) {
    sendSyncLog('info', '🚀 Démarrage du PUSH vers Supabase...');

    for (const tableName of syncOrder) {
        const config = tableConfigs[tableName];
        if (!config.model) continue;
        const modelName = config.model;
        const rowsToSync = await prisma[modelName].findMany({ where: { needs_sync: true } });

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
                        await prisma[modelName].delete({ where: { id: row.id } });
                        sendSyncLog('success', `     ✅ Suppression locale et distante réussie.`);
                    }
                } else {
                    const mappedData = await config.supabaseMap(row, schoolId, prisma, supabase);
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

                    await prisma[modelName].update({
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

    // Helper pour transformer les IDs en objets `connect` pour Prisma
    const transformDataForPrisma = (data, modelName) => {
        const prismaData = { ...data };
        
        // Mappe explicite des relations pour chaque modèle
        // Clé: nom du champ dans mappedData, Valeur: nom de la relation dans Prisma
        const relationsMap = {
            registrations: { studentId: 'student', classId: 'class' },
            subjects: { classId: 'class' },
            lessons: { teacherId: 'teacher', classId: 'class', subjectId: 'subject' },
            notes: { studentId: 'student', lessonId: 'lesson' },
            studentParents: { studentId: 'student', parentId: 'parent' },
            payments: { registrationId: 'registration', feeId: 'fee' },
            attendances: { studentId: 'student' },
            schedules: { lessonId: 'lesson' },
            salary_payments: { employee_id: 'employee' },
            teacherWorkHours: { teacherId: 'teacher', subjectId: 'subject' },
            teacherWorkHours: { teacher_id: 'teacher', subject_id: 'subject' },
        };

        const modelRelations = relationsMap[modelName];
        if (modelRelations) {
            for (const fkField in modelRelations) {
                if (Object.prototype.hasOwnProperty.call(data, fkField)) {
                    const relationName = modelRelations[fkField];
                    const idValue = data[fkField];
                    
                    if (idValue !== null && idValue !== undefined) {
                        prismaData[relationName] = { connect: { id: idValue } };
                    }
                    delete prismaData[fkField];
                }
            }
        }
        return prismaData;
    };

    // On ne fait PLUS .reverse() pour respecter l'ordre des dépendances
    for (const tableName of syncOrder) {
        const config = tableConfigs[tableName];
        if (!config.model) continue;
        
        const modelName = config.model;
        
        const lastRecord = await prisma[modelName].findFirst({ orderBy: { last_modified: 'desc' } });
        const lastSyncTime = lastRecord ? lastRecord.last_modified.toISOString() : '1970-01-01T00:00:00Z';
        
        sendSyncLog('info', `[PULL] Table '${config.name}': Recherche des modifications depuis ${lastSyncTime}`);

        let query = supabase.from(config.name).select(config.pullSelect);
        
        if (config.pullFilterColumn) {
            query = query.eq(config.pullFilterColumn, schoolId);
        } else if (config.name !== 'roles' && config.name !== 'schools') {
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
                const localRow = await prisma[modelName].findUnique({ where: { supabase_id: row.id } });

                if (row.is_deleted) {
                    if (localRow) {
                        sendSyncLog('info', `    -> 🗑️  [DELETE] Suppression de ${config.name} #${localRow.id} (depuis supabase_id: ${row.id})`);
                        await prisma[modelName].delete({ where: { id: localRow.id } });
                    }
                    continue;
                }

                const mappedData = await config.localMap(row, prisma);

                // Gérer les enregistrements à ignorer
                if (mappedData?._ignore) {
                    sendSyncLog('info', `    -> ⏩ [IGNORE] Ignoré ${config.name} (supabase_id: ${row.id}). Raison: ${mappedData.reason}`);
                    continue;
                }

                if (!mappedData) {
                    sendSyncLog('warn', `    -> ⚠️  [SKIP] Ignoré ${config.name} (supabase_id: ${row.id}) (dépendances non résolues ou mapping invalide).`);
                    continue;
                }

                const prismaData = transformDataForPrisma(mappedData, modelName);

                if (localRow) { // Update
                    if (new Date(row.last_modified) > new Date(localRow.last_modified)) {
                        sendSyncLog('info', `    -> 🔄  [UPDATE] Mise à jour de ${config.name} #${localRow.id} depuis Supabase...`, { data: prismaData });
                        await prisma[modelName].update({
                            where: { id: localRow.id },
                            data: { ...prismaData, last_modified: new Date(row.last_modified), needs_sync: false },
                        });
                        sendSyncLog('success', `       ✅ Mise à jour locale réussie.`);
                    }
                } else { // Insert
                    sendSyncLog('info', `    -> ✨  [CREATE] Création de ${config.name} (supabase_id: ${row.id}) localement...`, { data: prismaData });
                    await prisma[modelName].create({
                        data: {
                            ...prismaData,
                            supabase_id: row.id,
                            last_modified: new Date(row.last_modified),
                            needs_sync: false,
                        },
                    });
                    sendSyncLog('success', `       ✅ Création locale réussie.`);
                }
            } catch (error) {
                sendSyncLog('error', `  -> ❌  [ERREUR PULL] Échec pour la ligne supabase_id: ${row.id} de la table ${config.name}:`, { error: error.message });
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