drop extension if exists "pg_net";


  create table "public"."activity_logs" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "action" text,
    "target_table" text,
    "target_id" uuid,
    "timestamp" timestamp without time zone default CURRENT_TIMESTAMP,
    "local_id" integer,
    "is_synced" boolean default false,
    "sync_timestamp" timestamp with time zone,
    "is_deleted" boolean default false,
    "last_modified" timestamp with time zone default now()
      );



  create table "public"."attendances" (
    "id" uuid not null default gen_random_uuid(),
    "student_id" uuid,
    "date" date,
    "state" text,
    "justification" text,
    "local_id" integer,
    "is_synced" boolean default false,
    "sync_timestamp" timestamp with time zone,
    "is_deleted" boolean default false,
    "last_modified" timestamp with time zone default now()
      );



  create table "public"."classes" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "level" text,
    "school_id" uuid,
    "local_id" integer,
    "is_synced" boolean default false,
    "sync_timestamp" timestamp with time zone,
    "is_deleted" boolean default false,
    "last_modified" timestamp with time zone default now()
      );



  create table "public"."employees" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "job_title" text,
    "salary" double precision,
    "matricule" text,
    "school_id" uuid,
    "local_id" integer,
    "is_synced" boolean default false,
    "sync_timestamp" timestamp with time zone,
    "is_deleted" boolean default false,
    "last_modified" timestamp with time zone default now()
      );



  create table "public"."fees" (
    "id" uuid not null default gen_random_uuid(),
    "school_id" uuid,
    "name" text,
    "amount" double precision,
    "due_date" date,
    "school_year" text,
    "local_id" integer,
    "is_synced" boolean default false,
    "sync_timestamp" timestamp with time zone,
    "is_deleted" boolean default false,
    "last_modified" timestamp with time zone default now(),
    "level" text default 'all'::text
      );



  create table "public"."lessons" (
    "id" uuid not null default gen_random_uuid(),
    "teacher_id" uuid,
    "class_id" uuid,
    "subject_id" uuid,
    "school_year" text,
    "local_id" integer,
    "is_synced" boolean default false,
    "sync_timestamp" timestamp with time zone,
    "is_deleted" boolean default false,
    "last_modified" timestamp with time zone default now()
      );



  create table "public"."notes" (
    "id" uuid not null default gen_random_uuid(),
    "student_id" uuid,
    "lesson_id" uuid,
    "value" double precision,
    "type" text,
    "quarter" integer,
    "local_id" integer,
    "is_synced" boolean default false,
    "sync_timestamp" timestamp with time zone,
    "is_deleted" boolean default false,
    "last_modified" timestamp with time zone default now()
      );



  create table "public"."parents" (
    "id" uuid not null default gen_random_uuid(),
    "profession" text,
    "address" text,
    "name" text,
    "phone" text,
    "email" text,
    "local_id" integer,
    "is_synced" boolean default false,
    "sync_timestamp" timestamp with time zone,
    "is_deleted" boolean default false,
    "last_modified" timestamp with time zone default now(),
    "school_id" uuid,
    "first_name" text
      );



  create table "public"."payments" (
    "id" uuid not null default gen_random_uuid(),
    "registration_id" uuid,
    "amount" double precision,
    "method" text,
    "date" date default CURRENT_DATE,
    "reference" text,
    "emitter_id" uuid,
    "local_id" integer,
    "is_synced" boolean default false,
    "sync_timestamp" timestamp with time zone,
    "is_deleted" boolean default false,
    "last_modified" timestamp with time zone default now()
      );



  create table "public"."registrations" (
    "id" uuid not null default gen_random_uuid(),
    "student_id" uuid,
    "class_id" uuid,
    "school_id" uuid,
    "school_year" text,
    "state" text,
    "registration_date" date default CURRENT_DATE,
    "local_id" integer,
    "is_synced" boolean default false,
    "sync_timestamp" timestamp with time zone,
    "is_deleted" boolean default false,
    "last_modified" timestamp with time zone default now()
      );



  create table "public"."roles" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "local_id" integer,
    "is_synced" boolean default false,
    "sync_timestamp" timestamp with time zone,
    "is_deleted" boolean default false,
    "last_modified" timestamp with time zone default now()
      );



  create table "public"."salary_payments" (
    "employee_id" uuid not null,
    "base_salary" real default 0,
    "bonus_amount" real default 0,
    "total_amount" real not null,
    "payment_date" text not null,
    "notes" text,
    "last_modified" timestamp with time zone default now(),
    "is_deleted" boolean default false,
    "id" uuid not null default gen_random_uuid()
      );



  create table "public"."schedules" (
    "id" uuid not null default gen_random_uuid(),
    "lesson_id" uuid,
    "day_of_week" text,
    "start_time" time without time zone,
    "end_time" time without time zone,
    "is_synced" boolean default false,
    "is_deleted" boolean default false,
    "last_modified" timestamp with time zone default now()
      );



  create table "public"."schools" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "address" text,
    "phone" text,
    "email" text,
    "registration_code" text,
    "created_at" date default CURRENT_DATE,
    "local_id" integer,
    "is_synced" boolean default false,
    "sync_timestamp" timestamp with time zone,
    "is_deleted" boolean default false,
    "last_modified" timestamp with time zone default now()
      );



  create table "public"."student_parents" (
    "id" uuid not null default gen_random_uuid(),
    "student_id" uuid,
    "parent_id" uuid,
    "relation" text,
    "local_id" integer,
    "is_synced" boolean default false,
    "sync_timestamp" timestamp with time zone,
    "is_deleted" boolean default false,
    "last_modified" timestamp with time zone default now()
      );



  create table "public"."students" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "first_name" text not null,
    "genre" text,
    "birth_date" date,
    "matricul" text,
    "local_id" integer,
    "is_synced" boolean default false,
    "sync_timestamp" timestamp with time zone,
    "is_deleted" boolean default false,
    "last_modified" timestamp with time zone default now(),
    "picture_url" text
      );



  create table "public"."subjects" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "school_id" uuid,
    "class_id" uuid,
    "school_year" text,
    "coefficient" integer,
    "local_id" integer,
    "is_synced" boolean default false,
    "sync_timestamp" timestamp with time zone,
    "is_deleted" boolean default false,
    "last_modified" timestamp with time zone default now()
      );



  create table "public"."teacher_work_hours" (
    "teacher_id" uuid not null,
    "subject_id" uuid,
    "date" text,
    "start_time" text,
    "end_time" text,
    "hours" real not null,
    "notes" text,
    "last_modified" timestamp with time zone default now(),
    "is_deleted" boolean default false,
    "id" uuid not null default gen_random_uuid()
      );



  create table "public"."teachers" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "speciality" text,
    "matricule" text,
    "local_id" integer,
    "is_synced" boolean default false,
    "sync_timestamp" timestamp with time zone,
    "is_deleted" boolean default false,
    "last_modified" timestamp with time zone default now(),
    "hourlyRate" real default '0'::real
      );



  create table "public"."users" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "first_name" text not null,
    "phone" text,
    "email" text,
    "password_hash" text not null,
    "role_id" uuid,
    "school_id" uuid,
    "profile_picture_url" text,
    "local_id" integer,
    "is_synced" boolean default false,
    "sync_timestamp" timestamp with time zone,
    "is_deleted" boolean default false,
    "last_modified" timestamp with time zone default now()
      );


CREATE UNIQUE INDEX activity_logs_pkey ON public.activity_logs USING btree (id);

CREATE UNIQUE INDEX attendances_pkey ON public.attendances USING btree (id);

CREATE UNIQUE INDEX classes_pkey ON public.classes USING btree (id);

CREATE UNIQUE INDEX employees_pkey ON public.employees USING btree (id);

CREATE UNIQUE INDEX fees_pkey ON public.fees USING btree (id);

CREATE UNIQUE INDEX lessons_pkey ON public.lessons USING btree (id);

CREATE UNIQUE INDEX notes_pkey ON public.notes USING btree (id);

CREATE UNIQUE INDEX parents_pkey ON public.parents USING btree (id);

CREATE UNIQUE INDEX payments_pkey ON public.payments USING btree (id);

CREATE UNIQUE INDEX registrations_pkey ON public.registrations USING btree (id);

CREATE UNIQUE INDEX roles_name_key ON public.roles USING btree (name);

CREATE UNIQUE INDEX roles_pkey ON public.roles USING btree (id);

CREATE UNIQUE INDEX salary_payments_pkey ON public.salary_payments USING btree (id);

CREATE UNIQUE INDEX schedules_pkey ON public.schedules USING btree (id);

CREATE UNIQUE INDEX schools_pkey ON public.schools USING btree (id);

CREATE UNIQUE INDEX student_parents_pkey ON public.student_parents USING btree (id);

CREATE UNIQUE INDEX students_pkey ON public.students USING btree (id);

CREATE UNIQUE INDEX subjects_pkey ON public.subjects USING btree (id);

CREATE UNIQUE INDEX teacher_work_hours_pkey ON public.teacher_work_hours USING btree (id);

CREATE UNIQUE INDEX teachers_pkey ON public.teachers USING btree (id);

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

alter table "public"."activity_logs" add constraint "activity_logs_pkey" PRIMARY KEY using index "activity_logs_pkey";

alter table "public"."attendances" add constraint "attendances_pkey" PRIMARY KEY using index "attendances_pkey";

alter table "public"."classes" add constraint "classes_pkey" PRIMARY KEY using index "classes_pkey";

alter table "public"."employees" add constraint "employees_pkey" PRIMARY KEY using index "employees_pkey";

alter table "public"."fees" add constraint "fees_pkey" PRIMARY KEY using index "fees_pkey";

alter table "public"."lessons" add constraint "lessons_pkey" PRIMARY KEY using index "lessons_pkey";

alter table "public"."notes" add constraint "notes_pkey" PRIMARY KEY using index "notes_pkey";

alter table "public"."parents" add constraint "parents_pkey" PRIMARY KEY using index "parents_pkey";

alter table "public"."payments" add constraint "payments_pkey" PRIMARY KEY using index "payments_pkey";

alter table "public"."registrations" add constraint "registrations_pkey" PRIMARY KEY using index "registrations_pkey";

alter table "public"."roles" add constraint "roles_pkey" PRIMARY KEY using index "roles_pkey";

alter table "public"."salary_payments" add constraint "salary_payments_pkey" PRIMARY KEY using index "salary_payments_pkey";

alter table "public"."schedules" add constraint "schedules_pkey" PRIMARY KEY using index "schedules_pkey";

alter table "public"."schools" add constraint "schools_pkey" PRIMARY KEY using index "schools_pkey";

alter table "public"."student_parents" add constraint "student_parents_pkey" PRIMARY KEY using index "student_parents_pkey";

alter table "public"."students" add constraint "students_pkey" PRIMARY KEY using index "students_pkey";

alter table "public"."subjects" add constraint "subjects_pkey" PRIMARY KEY using index "subjects_pkey";

alter table "public"."teacher_work_hours" add constraint "teacher_work_hours_pkey" PRIMARY KEY using index "teacher_work_hours_pkey";

alter table "public"."teachers" add constraint "teachers_pkey" PRIMARY KEY using index "teachers_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."activity_logs" add constraint "activity_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."activity_logs" validate constraint "activity_logs_user_id_fkey";

alter table "public"."attendances" add constraint "attendances_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE not valid;

alter table "public"."attendances" validate constraint "attendances_student_id_fkey";

alter table "public"."classes" add constraint "classes_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE not valid;

alter table "public"."classes" validate constraint "classes_school_id_fkey";

alter table "public"."employees" add constraint "employees_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE not valid;

alter table "public"."employees" validate constraint "employees_school_id_fkey";

alter table "public"."employees" add constraint "employees_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."employees" validate constraint "employees_user_id_fkey";

alter table "public"."fees" add constraint "fees_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE not valid;

alter table "public"."fees" validate constraint "fees_school_id_fkey";

alter table "public"."lessons" add constraint "lessons_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE not valid;

alter table "public"."lessons" validate constraint "lessons_class_id_fkey";

alter table "public"."lessons" add constraint "lessons_subject_id_fkey" FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE not valid;

alter table "public"."lessons" validate constraint "lessons_subject_id_fkey";

alter table "public"."lessons" add constraint "lessons_teacher_id_fkey" FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE not valid;

alter table "public"."lessons" validate constraint "lessons_teacher_id_fkey";

alter table "public"."notes" add constraint "notes_lesson_id_fkey" FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE not valid;

alter table "public"."notes" validate constraint "notes_lesson_id_fkey";

alter table "public"."notes" add constraint "notes_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE not valid;

alter table "public"."notes" validate constraint "notes_student_id_fkey";

alter table "public"."parents" add constraint "parents_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) not valid;

alter table "public"."parents" validate constraint "parents_school_id_fkey";

alter table "public"."payments" add constraint "payments_emitter_id_fkey" FOREIGN KEY (emitter_id) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."payments" validate constraint "payments_emitter_id_fkey";

alter table "public"."payments" add constraint "payments_registration_id_fkey" FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE CASCADE not valid;

alter table "public"."payments" validate constraint "payments_registration_id_fkey";

alter table "public"."registrations" add constraint "registrations_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE not valid;

alter table "public"."registrations" validate constraint "registrations_class_id_fkey";

alter table "public"."registrations" add constraint "registrations_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE not valid;

alter table "public"."registrations" validate constraint "registrations_school_id_fkey";

alter table "public"."registrations" add constraint "registrations_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE not valid;

alter table "public"."registrations" validate constraint "registrations_student_id_fkey";

alter table "public"."roles" add constraint "roles_name_key" UNIQUE using index "roles_name_key";

alter table "public"."salary_payments" add constraint "fk_employee" FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE not valid;

alter table "public"."salary_payments" validate constraint "fk_employee";

alter table "public"."schedules" add constraint "schedules_lesson_id_fkey" FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE not valid;

alter table "public"."schedules" validate constraint "schedules_lesson_id_fkey";

alter table "public"."student_parents" add constraint "student_parents_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE not valid;

alter table "public"."student_parents" validate constraint "student_parents_parent_id_fkey";

alter table "public"."student_parents" add constraint "student_parents_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE not valid;

alter table "public"."student_parents" validate constraint "student_parents_student_id_fkey";

alter table "public"."subjects" add constraint "subjects_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE not valid;

alter table "public"."subjects" validate constraint "subjects_class_id_fkey";

alter table "public"."subjects" add constraint "subjects_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE not valid;

alter table "public"."subjects" validate constraint "subjects_school_id_fkey";

alter table "public"."teacher_work_hours" add constraint "fk_subject" FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL not valid;

alter table "public"."teacher_work_hours" validate constraint "fk_subject";

alter table "public"."teacher_work_hours" add constraint "fk_teacher" FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE not valid;

alter table "public"."teacher_work_hours" validate constraint "fk_teacher";

alter table "public"."teachers" add constraint "teachers_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."teachers" validate constraint "teachers_user_id_fkey";

alter table "public"."users" add constraint "users_email_key" UNIQUE using index "users_email_key";

alter table "public"."users" add constraint "users_role_id_fkey" FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL not valid;

alter table "public"."users" validate constraint "users_role_id_fkey";

alter table "public"."users" add constraint "users_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL not valid;

alter table "public"."users" validate constraint "users_school_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.execute_sql(query text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  EXECUTE query;
  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('error', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_monthly_revenue(p_school_id uuid, p_start_date text, p_end_date text)
 RETURNS numeric
 LANGUAGE plpgsql
AS $function$
 DECLARE
    total_revenue NUMERIC;
BEGIN
   SELECT COALESCE(SUM(p.amount), 0)
    INTO total_revenue
    FROM payments AS p
    JOIN registrations AS r ON p.registration_id = r.id
    WHERE r.school_id = p_school_id
      AND p.date >= p_start_date::DATE
      AND p.date <= p_end_date::DATE;

    RETURN total_revenue;
 END;
 $function$
;

grant delete on table "public"."activity_logs" to "anon";

grant insert on table "public"."activity_logs" to "anon";

grant references on table "public"."activity_logs" to "anon";

grant select on table "public"."activity_logs" to "anon";

grant trigger on table "public"."activity_logs" to "anon";

grant truncate on table "public"."activity_logs" to "anon";

grant update on table "public"."activity_logs" to "anon";

grant delete on table "public"."activity_logs" to "authenticated";

grant insert on table "public"."activity_logs" to "authenticated";

grant references on table "public"."activity_logs" to "authenticated";

grant select on table "public"."activity_logs" to "authenticated";

grant trigger on table "public"."activity_logs" to "authenticated";

grant truncate on table "public"."activity_logs" to "authenticated";

grant update on table "public"."activity_logs" to "authenticated";

grant delete on table "public"."activity_logs" to "service_role";

grant insert on table "public"."activity_logs" to "service_role";

grant references on table "public"."activity_logs" to "service_role";

grant select on table "public"."activity_logs" to "service_role";

grant trigger on table "public"."activity_logs" to "service_role";

grant truncate on table "public"."activity_logs" to "service_role";

grant update on table "public"."activity_logs" to "service_role";

grant delete on table "public"."attendances" to "anon";

grant insert on table "public"."attendances" to "anon";

grant references on table "public"."attendances" to "anon";

grant select on table "public"."attendances" to "anon";

grant trigger on table "public"."attendances" to "anon";

grant truncate on table "public"."attendances" to "anon";

grant update on table "public"."attendances" to "anon";

grant delete on table "public"."attendances" to "authenticated";

grant insert on table "public"."attendances" to "authenticated";

grant references on table "public"."attendances" to "authenticated";

grant select on table "public"."attendances" to "authenticated";

grant trigger on table "public"."attendances" to "authenticated";

grant truncate on table "public"."attendances" to "authenticated";

grant update on table "public"."attendances" to "authenticated";

grant delete on table "public"."attendances" to "service_role";

grant insert on table "public"."attendances" to "service_role";

grant references on table "public"."attendances" to "service_role";

grant select on table "public"."attendances" to "service_role";

grant trigger on table "public"."attendances" to "service_role";

grant truncate on table "public"."attendances" to "service_role";

grant update on table "public"."attendances" to "service_role";

grant delete on table "public"."classes" to "anon";

grant insert on table "public"."classes" to "anon";

grant references on table "public"."classes" to "anon";

grant select on table "public"."classes" to "anon";

grant trigger on table "public"."classes" to "anon";

grant truncate on table "public"."classes" to "anon";

grant update on table "public"."classes" to "anon";

grant delete on table "public"."classes" to "authenticated";

grant insert on table "public"."classes" to "authenticated";

grant references on table "public"."classes" to "authenticated";

grant select on table "public"."classes" to "authenticated";

grant trigger on table "public"."classes" to "authenticated";

grant truncate on table "public"."classes" to "authenticated";

grant update on table "public"."classes" to "authenticated";

grant delete on table "public"."classes" to "service_role";

grant insert on table "public"."classes" to "service_role";

grant references on table "public"."classes" to "service_role";

grant select on table "public"."classes" to "service_role";

grant trigger on table "public"."classes" to "service_role";

grant truncate on table "public"."classes" to "service_role";

grant update on table "public"."classes" to "service_role";

grant delete on table "public"."employees" to "anon";

grant insert on table "public"."employees" to "anon";

grant references on table "public"."employees" to "anon";

grant select on table "public"."employees" to "anon";

grant trigger on table "public"."employees" to "anon";

grant truncate on table "public"."employees" to "anon";

grant update on table "public"."employees" to "anon";

grant delete on table "public"."employees" to "authenticated";

grant insert on table "public"."employees" to "authenticated";

grant references on table "public"."employees" to "authenticated";

grant select on table "public"."employees" to "authenticated";

grant trigger on table "public"."employees" to "authenticated";

grant truncate on table "public"."employees" to "authenticated";

grant update on table "public"."employees" to "authenticated";

grant delete on table "public"."employees" to "service_role";

grant insert on table "public"."employees" to "service_role";

grant references on table "public"."employees" to "service_role";

grant select on table "public"."employees" to "service_role";

grant trigger on table "public"."employees" to "service_role";

grant truncate on table "public"."employees" to "service_role";

grant update on table "public"."employees" to "service_role";

grant delete on table "public"."fees" to "anon";

grant insert on table "public"."fees" to "anon";

grant references on table "public"."fees" to "anon";

grant select on table "public"."fees" to "anon";

grant trigger on table "public"."fees" to "anon";

grant truncate on table "public"."fees" to "anon";

grant update on table "public"."fees" to "anon";

grant delete on table "public"."fees" to "authenticated";

grant insert on table "public"."fees" to "authenticated";

grant references on table "public"."fees" to "authenticated";

grant select on table "public"."fees" to "authenticated";

grant trigger on table "public"."fees" to "authenticated";

grant truncate on table "public"."fees" to "authenticated";

grant update on table "public"."fees" to "authenticated";

grant delete on table "public"."fees" to "service_role";

grant insert on table "public"."fees" to "service_role";

grant references on table "public"."fees" to "service_role";

grant select on table "public"."fees" to "service_role";

grant trigger on table "public"."fees" to "service_role";

grant truncate on table "public"."fees" to "service_role";

grant update on table "public"."fees" to "service_role";

grant delete on table "public"."lessons" to "anon";

grant insert on table "public"."lessons" to "anon";

grant references on table "public"."lessons" to "anon";

grant select on table "public"."lessons" to "anon";

grant trigger on table "public"."lessons" to "anon";

grant truncate on table "public"."lessons" to "anon";

grant update on table "public"."lessons" to "anon";

grant delete on table "public"."lessons" to "authenticated";

grant insert on table "public"."lessons" to "authenticated";

grant references on table "public"."lessons" to "authenticated";

grant select on table "public"."lessons" to "authenticated";

grant trigger on table "public"."lessons" to "authenticated";

grant truncate on table "public"."lessons" to "authenticated";

grant update on table "public"."lessons" to "authenticated";

grant delete on table "public"."lessons" to "service_role";

grant insert on table "public"."lessons" to "service_role";

grant references on table "public"."lessons" to "service_role";

grant select on table "public"."lessons" to "service_role";

grant trigger on table "public"."lessons" to "service_role";

grant truncate on table "public"."lessons" to "service_role";

grant update on table "public"."lessons" to "service_role";

grant delete on table "public"."notes" to "anon";

grant insert on table "public"."notes" to "anon";

grant references on table "public"."notes" to "anon";

grant select on table "public"."notes" to "anon";

grant trigger on table "public"."notes" to "anon";

grant truncate on table "public"."notes" to "anon";

grant update on table "public"."notes" to "anon";

grant delete on table "public"."notes" to "authenticated";

grant insert on table "public"."notes" to "authenticated";

grant references on table "public"."notes" to "authenticated";

grant select on table "public"."notes" to "authenticated";

grant trigger on table "public"."notes" to "authenticated";

grant truncate on table "public"."notes" to "authenticated";

grant update on table "public"."notes" to "authenticated";

grant delete on table "public"."notes" to "service_role";

grant insert on table "public"."notes" to "service_role";

grant references on table "public"."notes" to "service_role";

grant select on table "public"."notes" to "service_role";

grant trigger on table "public"."notes" to "service_role";

grant truncate on table "public"."notes" to "service_role";

grant update on table "public"."notes" to "service_role";

grant delete on table "public"."parents" to "anon";

grant insert on table "public"."parents" to "anon";

grant references on table "public"."parents" to "anon";

grant select on table "public"."parents" to "anon";

grant trigger on table "public"."parents" to "anon";

grant truncate on table "public"."parents" to "anon";

grant update on table "public"."parents" to "anon";

grant delete on table "public"."parents" to "authenticated";

grant insert on table "public"."parents" to "authenticated";

grant references on table "public"."parents" to "authenticated";

grant select on table "public"."parents" to "authenticated";

grant trigger on table "public"."parents" to "authenticated";

grant truncate on table "public"."parents" to "authenticated";

grant update on table "public"."parents" to "authenticated";

grant delete on table "public"."parents" to "service_role";

grant insert on table "public"."parents" to "service_role";

grant references on table "public"."parents" to "service_role";

grant select on table "public"."parents" to "service_role";

grant trigger on table "public"."parents" to "service_role";

grant truncate on table "public"."parents" to "service_role";

grant update on table "public"."parents" to "service_role";

grant delete on table "public"."payments" to "anon";

grant insert on table "public"."payments" to "anon";

grant references on table "public"."payments" to "anon";

grant select on table "public"."payments" to "anon";

grant trigger on table "public"."payments" to "anon";

grant truncate on table "public"."payments" to "anon";

grant update on table "public"."payments" to "anon";

grant delete on table "public"."payments" to "authenticated";

grant insert on table "public"."payments" to "authenticated";

grant references on table "public"."payments" to "authenticated";

grant select on table "public"."payments" to "authenticated";

grant trigger on table "public"."payments" to "authenticated";

grant truncate on table "public"."payments" to "authenticated";

grant update on table "public"."payments" to "authenticated";

grant delete on table "public"."payments" to "service_role";

grant insert on table "public"."payments" to "service_role";

grant references on table "public"."payments" to "service_role";

grant select on table "public"."payments" to "service_role";

grant trigger on table "public"."payments" to "service_role";

grant truncate on table "public"."payments" to "service_role";

grant update on table "public"."payments" to "service_role";

grant delete on table "public"."registrations" to "anon";

grant insert on table "public"."registrations" to "anon";

grant references on table "public"."registrations" to "anon";

grant select on table "public"."registrations" to "anon";

grant trigger on table "public"."registrations" to "anon";

grant truncate on table "public"."registrations" to "anon";

grant update on table "public"."registrations" to "anon";

grant delete on table "public"."registrations" to "authenticated";

grant insert on table "public"."registrations" to "authenticated";

grant references on table "public"."registrations" to "authenticated";

grant select on table "public"."registrations" to "authenticated";

grant trigger on table "public"."registrations" to "authenticated";

grant truncate on table "public"."registrations" to "authenticated";

grant update on table "public"."registrations" to "authenticated";

grant delete on table "public"."registrations" to "service_role";

grant insert on table "public"."registrations" to "service_role";

grant references on table "public"."registrations" to "service_role";

grant select on table "public"."registrations" to "service_role";

grant trigger on table "public"."registrations" to "service_role";

grant truncate on table "public"."registrations" to "service_role";

grant update on table "public"."registrations" to "service_role";

grant delete on table "public"."roles" to "anon";

grant insert on table "public"."roles" to "anon";

grant references on table "public"."roles" to "anon";

grant select on table "public"."roles" to "anon";

grant trigger on table "public"."roles" to "anon";

grant truncate on table "public"."roles" to "anon";

grant update on table "public"."roles" to "anon";

grant delete on table "public"."roles" to "authenticated";

grant insert on table "public"."roles" to "authenticated";

grant references on table "public"."roles" to "authenticated";

grant select on table "public"."roles" to "authenticated";

grant trigger on table "public"."roles" to "authenticated";

grant truncate on table "public"."roles" to "authenticated";

grant update on table "public"."roles" to "authenticated";

grant delete on table "public"."roles" to "service_role";

grant insert on table "public"."roles" to "service_role";

grant references on table "public"."roles" to "service_role";

grant select on table "public"."roles" to "service_role";

grant trigger on table "public"."roles" to "service_role";

grant truncate on table "public"."roles" to "service_role";

grant update on table "public"."roles" to "service_role";

grant delete on table "public"."salary_payments" to "anon";

grant insert on table "public"."salary_payments" to "anon";

grant references on table "public"."salary_payments" to "anon";

grant select on table "public"."salary_payments" to "anon";

grant trigger on table "public"."salary_payments" to "anon";

grant truncate on table "public"."salary_payments" to "anon";

grant update on table "public"."salary_payments" to "anon";

grant delete on table "public"."salary_payments" to "authenticated";

grant insert on table "public"."salary_payments" to "authenticated";

grant references on table "public"."salary_payments" to "authenticated";

grant select on table "public"."salary_payments" to "authenticated";

grant trigger on table "public"."salary_payments" to "authenticated";

grant truncate on table "public"."salary_payments" to "authenticated";

grant update on table "public"."salary_payments" to "authenticated";

grant delete on table "public"."salary_payments" to "service_role";

grant insert on table "public"."salary_payments" to "service_role";

grant references on table "public"."salary_payments" to "service_role";

grant select on table "public"."salary_payments" to "service_role";

grant trigger on table "public"."salary_payments" to "service_role";

grant truncate on table "public"."salary_payments" to "service_role";

grant update on table "public"."salary_payments" to "service_role";

grant delete on table "public"."schedules" to "anon";

grant insert on table "public"."schedules" to "anon";

grant references on table "public"."schedules" to "anon";

grant select on table "public"."schedules" to "anon";

grant trigger on table "public"."schedules" to "anon";

grant truncate on table "public"."schedules" to "anon";

grant update on table "public"."schedules" to "anon";

grant delete on table "public"."schedules" to "authenticated";

grant insert on table "public"."schedules" to "authenticated";

grant references on table "public"."schedules" to "authenticated";

grant select on table "public"."schedules" to "authenticated";

grant trigger on table "public"."schedules" to "authenticated";

grant truncate on table "public"."schedules" to "authenticated";

grant update on table "public"."schedules" to "authenticated";

grant delete on table "public"."schedules" to "service_role";

grant insert on table "public"."schedules" to "service_role";

grant references on table "public"."schedules" to "service_role";

grant select on table "public"."schedules" to "service_role";

grant trigger on table "public"."schedules" to "service_role";

grant truncate on table "public"."schedules" to "service_role";

grant update on table "public"."schedules" to "service_role";

grant delete on table "public"."schools" to "anon";

grant insert on table "public"."schools" to "anon";

grant references on table "public"."schools" to "anon";

grant select on table "public"."schools" to "anon";

grant trigger on table "public"."schools" to "anon";

grant truncate on table "public"."schools" to "anon";

grant update on table "public"."schools" to "anon";

grant delete on table "public"."schools" to "authenticated";

grant insert on table "public"."schools" to "authenticated";

grant references on table "public"."schools" to "authenticated";

grant select on table "public"."schools" to "authenticated";

grant trigger on table "public"."schools" to "authenticated";

grant truncate on table "public"."schools" to "authenticated";

grant update on table "public"."schools" to "authenticated";

grant delete on table "public"."schools" to "service_role";

grant insert on table "public"."schools" to "service_role";

grant references on table "public"."schools" to "service_role";

grant select on table "public"."schools" to "service_role";

grant trigger on table "public"."schools" to "service_role";

grant truncate on table "public"."schools" to "service_role";

grant update on table "public"."schools" to "service_role";

grant delete on table "public"."student_parents" to "anon";

grant insert on table "public"."student_parents" to "anon";

grant references on table "public"."student_parents" to "anon";

grant select on table "public"."student_parents" to "anon";

grant trigger on table "public"."student_parents" to "anon";

grant truncate on table "public"."student_parents" to "anon";

grant update on table "public"."student_parents" to "anon";

grant delete on table "public"."student_parents" to "authenticated";

grant insert on table "public"."student_parents" to "authenticated";

grant references on table "public"."student_parents" to "authenticated";

grant select on table "public"."student_parents" to "authenticated";

grant trigger on table "public"."student_parents" to "authenticated";

grant truncate on table "public"."student_parents" to "authenticated";

grant update on table "public"."student_parents" to "authenticated";

grant delete on table "public"."student_parents" to "service_role";

grant insert on table "public"."student_parents" to "service_role";

grant references on table "public"."student_parents" to "service_role";

grant select on table "public"."student_parents" to "service_role";

grant trigger on table "public"."student_parents" to "service_role";

grant truncate on table "public"."student_parents" to "service_role";

grant update on table "public"."student_parents" to "service_role";

grant delete on table "public"."students" to "anon";

grant insert on table "public"."students" to "anon";

grant references on table "public"."students" to "anon";

grant select on table "public"."students" to "anon";

grant trigger on table "public"."students" to "anon";

grant truncate on table "public"."students" to "anon";

grant update on table "public"."students" to "anon";

grant delete on table "public"."students" to "authenticated";

grant insert on table "public"."students" to "authenticated";

grant references on table "public"."students" to "authenticated";

grant select on table "public"."students" to "authenticated";

grant trigger on table "public"."students" to "authenticated";

grant truncate on table "public"."students" to "authenticated";

grant update on table "public"."students" to "authenticated";

grant delete on table "public"."students" to "service_role";

grant insert on table "public"."students" to "service_role";

grant references on table "public"."students" to "service_role";

grant select on table "public"."students" to "service_role";

grant trigger on table "public"."students" to "service_role";

grant truncate on table "public"."students" to "service_role";

grant update on table "public"."students" to "service_role";

grant delete on table "public"."subjects" to "anon";

grant insert on table "public"."subjects" to "anon";

grant references on table "public"."subjects" to "anon";

grant select on table "public"."subjects" to "anon";

grant trigger on table "public"."subjects" to "anon";

grant truncate on table "public"."subjects" to "anon";

grant update on table "public"."subjects" to "anon";

grant delete on table "public"."subjects" to "authenticated";

grant insert on table "public"."subjects" to "authenticated";

grant references on table "public"."subjects" to "authenticated";

grant select on table "public"."subjects" to "authenticated";

grant trigger on table "public"."subjects" to "authenticated";

grant truncate on table "public"."subjects" to "authenticated";

grant update on table "public"."subjects" to "authenticated";

grant delete on table "public"."subjects" to "service_role";

grant insert on table "public"."subjects" to "service_role";

grant references on table "public"."subjects" to "service_role";

grant select on table "public"."subjects" to "service_role";

grant trigger on table "public"."subjects" to "service_role";

grant truncate on table "public"."subjects" to "service_role";

grant update on table "public"."subjects" to "service_role";

grant delete on table "public"."teacher_work_hours" to "anon";

grant insert on table "public"."teacher_work_hours" to "anon";

grant references on table "public"."teacher_work_hours" to "anon";

grant select on table "public"."teacher_work_hours" to "anon";

grant trigger on table "public"."teacher_work_hours" to "anon";

grant truncate on table "public"."teacher_work_hours" to "anon";

grant update on table "public"."teacher_work_hours" to "anon";

grant delete on table "public"."teacher_work_hours" to "authenticated";

grant insert on table "public"."teacher_work_hours" to "authenticated";

grant references on table "public"."teacher_work_hours" to "authenticated";

grant select on table "public"."teacher_work_hours" to "authenticated";

grant trigger on table "public"."teacher_work_hours" to "authenticated";

grant truncate on table "public"."teacher_work_hours" to "authenticated";

grant update on table "public"."teacher_work_hours" to "authenticated";

grant delete on table "public"."teacher_work_hours" to "service_role";

grant insert on table "public"."teacher_work_hours" to "service_role";

grant references on table "public"."teacher_work_hours" to "service_role";

grant select on table "public"."teacher_work_hours" to "service_role";

grant trigger on table "public"."teacher_work_hours" to "service_role";

grant truncate on table "public"."teacher_work_hours" to "service_role";

grant update on table "public"."teacher_work_hours" to "service_role";

grant delete on table "public"."teachers" to "anon";

grant insert on table "public"."teachers" to "anon";

grant references on table "public"."teachers" to "anon";

grant select on table "public"."teachers" to "anon";

grant trigger on table "public"."teachers" to "anon";

grant truncate on table "public"."teachers" to "anon";

grant update on table "public"."teachers" to "anon";

grant delete on table "public"."teachers" to "authenticated";

grant insert on table "public"."teachers" to "authenticated";

grant references on table "public"."teachers" to "authenticated";

grant select on table "public"."teachers" to "authenticated";

grant trigger on table "public"."teachers" to "authenticated";

grant truncate on table "public"."teachers" to "authenticated";

grant update on table "public"."teachers" to "authenticated";

grant delete on table "public"."teachers" to "service_role";

grant insert on table "public"."teachers" to "service_role";

grant references on table "public"."teachers" to "service_role";

grant select on table "public"."teachers" to "service_role";

grant trigger on table "public"."teachers" to "service_role";

grant truncate on table "public"."teachers" to "service_role";

grant update on table "public"."teachers" to "service_role";

grant delete on table "public"."users" to "anon";

grant insert on table "public"."users" to "anon";

grant references on table "public"."users" to "anon";

grant select on table "public"."users" to "anon";

grant trigger on table "public"."users" to "anon";

grant truncate on table "public"."users" to "anon";

grant update on table "public"."users" to "anon";

grant delete on table "public"."users" to "authenticated";

grant insert on table "public"."users" to "authenticated";

grant references on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant trigger on table "public"."users" to "authenticated";

grant truncate on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";


