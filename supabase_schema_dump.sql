

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."execute_sql"("query" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  EXECUTE query;
  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."execute_sql"("query" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_monthly_revenue"("p_school_id" "uuid", "p_start_date" "text", "p_end_date" "text") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
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
 $$;


ALTER FUNCTION "public"."get_monthly_revenue"("p_school_id" "uuid", "p_start_date" "text", "p_end_date" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."activity_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "action" "text",
    "target_table" "text",
    "target_id" "uuid",
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "local_id" integer,
    "is_synced" boolean DEFAULT false,
    "sync_timestamp" timestamp with time zone,
    "is_deleted" boolean DEFAULT false,
    "last_modified" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."activity_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attendances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid",
    "date" "date",
    "state" "text",
    "justification" "text",
    "local_id" integer,
    "is_synced" boolean DEFAULT false,
    "sync_timestamp" timestamp with time zone,
    "is_deleted" boolean DEFAULT false,
    "last_modified" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."attendances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."classes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "level" "text",
    "school_id" "uuid",
    "local_id" integer,
    "is_synced" boolean DEFAULT false,
    "sync_timestamp" timestamp with time zone,
    "is_deleted" boolean DEFAULT false,
    "last_modified" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."classes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "job_title" "text",
    "salary" double precision,
    "matricule" "text",
    "school_id" "uuid",
    "local_id" integer,
    "is_synced" boolean DEFAULT false,
    "sync_timestamp" timestamp with time zone,
    "is_deleted" boolean DEFAULT false,
    "last_modified" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."employees" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid",
    "name" "text",
    "amount" double precision,
    "due_date" "date",
    "school_year" "text",
    "local_id" integer,
    "is_synced" boolean DEFAULT false,
    "sync_timestamp" timestamp with time zone,
    "is_deleted" boolean DEFAULT false,
    "last_modified" timestamp with time zone DEFAULT "now"(),
    "level" "text" DEFAULT 'all'::"text"
);


ALTER TABLE "public"."fees" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lessons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "teacher_id" "uuid",
    "class_id" "uuid",
    "subject_id" "uuid",
    "school_year" "text",
    "local_id" integer,
    "is_synced" boolean DEFAULT false,
    "sync_timestamp" timestamp with time zone,
    "is_deleted" boolean DEFAULT false,
    "last_modified" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."lessons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid",
    "lesson_id" "uuid",
    "value" double precision,
    "type" "text",
    "quarter" integer,
    "local_id" integer,
    "is_synced" boolean DEFAULT false,
    "sync_timestamp" timestamp with time zone,
    "is_deleted" boolean DEFAULT false,
    "last_modified" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."parents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profession" "text",
    "address" "text",
    "name" "text",
    "phone" "text",
    "email" "text",
    "local_id" integer,
    "is_synced" boolean DEFAULT false,
    "sync_timestamp" timestamp with time zone,
    "is_deleted" boolean DEFAULT false,
    "last_modified" timestamp with time zone DEFAULT "now"(),
    "school_id" "uuid",
    "first_name" "text"
);


ALTER TABLE "public"."parents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "registration_id" "uuid",
    "amount" double precision,
    "method" "text",
    "date" "date" DEFAULT CURRENT_DATE,
    "reference" "text",
    "emitter_id" "uuid",
    "local_id" integer,
    "is_synced" boolean DEFAULT false,
    "sync_timestamp" timestamp with time zone,
    "is_deleted" boolean DEFAULT false,
    "last_modified" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."registrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid",
    "class_id" "uuid",
    "school_id" "uuid",
    "school_year" "text",
    "state" "text",
    "registration_date" "date" DEFAULT CURRENT_DATE,
    "local_id" integer,
    "is_synced" boolean DEFAULT false,
    "sync_timestamp" timestamp with time zone,
    "is_deleted" boolean DEFAULT false,
    "last_modified" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."registrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "local_id" integer,
    "is_synced" boolean DEFAULT false,
    "sync_timestamp" timestamp with time zone,
    "is_deleted" boolean DEFAULT false,
    "last_modified" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."salary_payments" (
    "employee_id" "uuid" NOT NULL,
    "base_salary" real DEFAULT 0,
    "bonus_amount" real DEFAULT 0,
    "total_amount" real NOT NULL,
    "payment_date" "text" NOT NULL,
    "notes" "text",
    "last_modified" timestamp with time zone DEFAULT "now"(),
    "is_deleted" boolean DEFAULT false,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."salary_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lesson_id" "uuid",
    "day_of_week" "text",
    "start_time" time without time zone,
    "end_time" time without time zone,
    "is_synced" boolean DEFAULT false,
    "is_deleted" boolean DEFAULT false,
    "last_modified" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schools" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "address" "text",
    "phone" "text",
    "email" "text",
    "registration_code" "text",
    "created_at" "date" DEFAULT CURRENT_DATE,
    "local_id" integer,
    "is_synced" boolean DEFAULT false,
    "sync_timestamp" timestamp with time zone,
    "is_deleted" boolean DEFAULT false,
    "last_modified" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."schools" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_parents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid",
    "parent_id" "uuid",
    "relation" "text",
    "local_id" integer,
    "is_synced" boolean DEFAULT false,
    "sync_timestamp" timestamp with time zone,
    "is_deleted" boolean DEFAULT false,
    "last_modified" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."student_parents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."students" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "first_name" "text" NOT NULL,
    "genre" "text",
    "birth_date" "date",
    "matricul" "text",
    "local_id" integer,
    "is_synced" boolean DEFAULT false,
    "sync_timestamp" timestamp with time zone,
    "is_deleted" boolean DEFAULT false,
    "last_modified" timestamp with time zone DEFAULT "now"(),
    "picture_url" "text"
);


ALTER TABLE "public"."students" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subjects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "school_id" "uuid",
    "class_id" "uuid",
    "school_year" "text",
    "coefficient" integer,
    "local_id" integer,
    "is_synced" boolean DEFAULT false,
    "sync_timestamp" timestamp with time zone,
    "is_deleted" boolean DEFAULT false,
    "last_modified" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."subjects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teacher_work_hours" (
    "teacher_id" "uuid" NOT NULL,
    "subject_id" "uuid",
    "date" "text",
    "start_time" "text",
    "end_time" "text",
    "hours" real NOT NULL,
    "notes" "text",
    "last_modified" timestamp with time zone DEFAULT "now"(),
    "is_deleted" boolean DEFAULT false,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."teacher_work_hours" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teachers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "speciality" "text",
    "matricule" "text",
    "local_id" integer,
    "is_synced" boolean DEFAULT false,
    "sync_timestamp" timestamp with time zone,
    "is_deleted" boolean DEFAULT false,
    "last_modified" timestamp with time zone DEFAULT "now"(),
    "hourlyRate" real DEFAULT '0'::real
);


ALTER TABLE "public"."teachers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "first_name" "text" NOT NULL,
    "phone" "text",
    "email" "text",
    "password_hash" "text" NOT NULL,
    "role_id" "uuid",
    "school_id" "uuid",
    "profile_picture_url" "text",
    "local_id" integer,
    "is_synced" boolean DEFAULT false,
    "sync_timestamp" timestamp with time zone,
    "is_deleted" boolean DEFAULT false,
    "last_modified" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendances"
    ADD CONSTRAINT "attendances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fees"
    ADD CONSTRAINT "fees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notes"
    ADD CONSTRAINT "notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."parents"
    ADD CONSTRAINT "parents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."registrations"
    ADD CONSTRAINT "registrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."salary_payments"
    ADD CONSTRAINT "salary_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schedules"
    ADD CONSTRAINT "schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_parents"
    ADD CONSTRAINT "student_parents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subjects"
    ADD CONSTRAINT "subjects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teacher_work_hours"
    ADD CONSTRAINT "teacher_work_hours_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teachers"
    ADD CONSTRAINT "teachers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."attendances"
    ADD CONSTRAINT "attendances_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fees"
    ADD CONSTRAINT "fees_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."salary_payments"
    ADD CONSTRAINT "fk_employee" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teacher_work_hours"
    ADD CONSTRAINT "fk_subject" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."teacher_work_hours"
    ADD CONSTRAINT "fk_teacher" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notes"
    ADD CONSTRAINT "notes_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notes"
    ADD CONSTRAINT "notes_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."parents"
    ADD CONSTRAINT "parents_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_emitter_id_fkey" FOREIGN KEY ("emitter_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."registrations"
    ADD CONSTRAINT "registrations_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."registrations"
    ADD CONSTRAINT "registrations_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."registrations"
    ADD CONSTRAINT "registrations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schedules"
    ADD CONSTRAINT "schedules_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_parents"
    ADD CONSTRAINT "student_parents_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."parents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_parents"
    ADD CONSTRAINT "student_parents_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subjects"
    ADD CONSTRAINT "subjects_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subjects"
    ADD CONSTRAINT "subjects_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teachers"
    ADD CONSTRAINT "teachers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."execute_sql"("query" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."execute_sql"("query" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."execute_sql"("query" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_monthly_revenue"("p_school_id" "uuid", "p_start_date" "text", "p_end_date" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_monthly_revenue"("p_school_id" "uuid", "p_start_date" "text", "p_end_date" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_monthly_revenue"("p_school_id" "uuid", "p_start_date" "text", "p_end_date" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."activity_logs" TO "anon";
GRANT ALL ON TABLE "public"."activity_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_logs" TO "service_role";



GRANT ALL ON TABLE "public"."attendances" TO "anon";
GRANT ALL ON TABLE "public"."attendances" TO "authenticated";
GRANT ALL ON TABLE "public"."attendances" TO "service_role";



GRANT ALL ON TABLE "public"."classes" TO "anon";
GRANT ALL ON TABLE "public"."classes" TO "authenticated";
GRANT ALL ON TABLE "public"."classes" TO "service_role";



GRANT ALL ON TABLE "public"."employees" TO "anon";
GRANT ALL ON TABLE "public"."employees" TO "authenticated";
GRANT ALL ON TABLE "public"."employees" TO "service_role";



GRANT ALL ON TABLE "public"."fees" TO "anon";
GRANT ALL ON TABLE "public"."fees" TO "authenticated";
GRANT ALL ON TABLE "public"."fees" TO "service_role";



GRANT ALL ON TABLE "public"."lessons" TO "anon";
GRANT ALL ON TABLE "public"."lessons" TO "authenticated";
GRANT ALL ON TABLE "public"."lessons" TO "service_role";



GRANT ALL ON TABLE "public"."notes" TO "anon";
GRANT ALL ON TABLE "public"."notes" TO "authenticated";
GRANT ALL ON TABLE "public"."notes" TO "service_role";



GRANT ALL ON TABLE "public"."parents" TO "anon";
GRANT ALL ON TABLE "public"."parents" TO "authenticated";
GRANT ALL ON TABLE "public"."parents" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."registrations" TO "anon";
GRANT ALL ON TABLE "public"."registrations" TO "authenticated";
GRANT ALL ON TABLE "public"."registrations" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON TABLE "public"."salary_payments" TO "anon";
GRANT ALL ON TABLE "public"."salary_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."salary_payments" TO "service_role";



GRANT ALL ON TABLE "public"."schedules" TO "anon";
GRANT ALL ON TABLE "public"."schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."schedules" TO "service_role";



GRANT ALL ON TABLE "public"."schools" TO "anon";
GRANT ALL ON TABLE "public"."schools" TO "authenticated";
GRANT ALL ON TABLE "public"."schools" TO "service_role";



GRANT ALL ON TABLE "public"."student_parents" TO "anon";
GRANT ALL ON TABLE "public"."student_parents" TO "authenticated";
GRANT ALL ON TABLE "public"."student_parents" TO "service_role";



GRANT ALL ON TABLE "public"."students" TO "anon";
GRANT ALL ON TABLE "public"."students" TO "authenticated";
GRANT ALL ON TABLE "public"."students" TO "service_role";



GRANT ALL ON TABLE "public"."subjects" TO "anon";
GRANT ALL ON TABLE "public"."subjects" TO "authenticated";
GRANT ALL ON TABLE "public"."subjects" TO "service_role";



GRANT ALL ON TABLE "public"."teacher_work_hours" TO "anon";
GRANT ALL ON TABLE "public"."teacher_work_hours" TO "authenticated";
GRANT ALL ON TABLE "public"."teacher_work_hours" TO "service_role";



GRANT ALL ON TABLE "public"."teachers" TO "anon";
GRANT ALL ON TABLE "public"."teachers" TO "authenticated";
GRANT ALL ON TABLE "public"."teachers" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
