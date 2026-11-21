-- Macro Vision Academy — reference relational schema (SQLite dialect).
-- The authoritative schema is defined in backend/models.py via SQLAlchemy.

CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY,
    name VARCHAR(40) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username VARCHAR(80) NOT NULL UNIQUE,
    email VARCHAR(160) NOT NULL UNIQUE,
    full_name VARCHAR(160) NOT NULL,
    password_hash VARCHAR(300) NOT NULL,
    role_id INTEGER NOT NULL REFERENCES roles(id),
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME,
    last_login DATETIME
);
CREATE INDEX IF NOT EXISTS ix_users_username ON users(username);

CREATE TABLE IF NOT EXISTS sessions (
    token VARCHAR(128) PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at DATETIME,
    expires_at DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_sessions_user_id ON sessions(user_id);

CREATE TABLE IF NOT EXISTS academic_years (
    id INTEGER PRIMARY KEY,
    year INTEGER NOT NULL UNIQUE,
    label VARCHAR(20) NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_academic_years_year ON academic_years(year);

CREATE TABLE IF NOT EXISTS entrance_exams (
    id INTEGER PRIMARY KEY,
    code VARCHAR(40) NOT NULL UNIQUE,
    name VARCHAR(160) NOT NULL,
    exam_year INTEGER NOT NULL,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id)
);
CREATE INDEX IF NOT EXISTS ix_entrance_exams_exam_year ON entrance_exams(exam_year);

CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY,
    country VARCHAR(80) NOT NULL,
    state VARCHAR(80) NOT NULL,
    district VARCHAR(80) NOT NULL,
    city VARCHAR(80) NOT NULL,
    pincode VARCHAR(12),
    UNIQUE (country, state, district, city)
);
CREATE INDEX IF NOT EXISTS ix_locations_country ON locations(country);
CREATE INDEX IF NOT EXISTS ix_locations_state ON locations(state);
CREATE INDEX IF NOT EXISTS ix_locations_city ON locations(city);

CREATE TABLE IF NOT EXISTS schools (
    id INTEGER PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE,
    school_type VARCHAR(40) NOT NULL
);

CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY,
    student_id VARCHAR(40) NOT NULL UNIQUE,
    application_id VARCHAR(40) NOT NULL UNIQUE,
    full_name VARCHAR(160) NOT NULL,
    gender VARCHAR(20) NOT NULL,
    date_of_birth DATE,
    class_applied VARCHAR(30) NOT NULL,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id),
    entrance_exam_id INTEGER REFERENCES entrance_exams(id),
    location_id INTEGER NOT NULL REFERENCES locations(id),
    school_id INTEGER REFERENCES schools(id),
    entrance_score FLOAT,
    percentage FLOAT,
    previous_academic_percentage FLOAT,
    admission_status VARCHAR(30) NOT NULL,
    registration_date DATE,
    source_referral VARCHAR(60),
    is_synthetic BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME
);
CREATE INDEX IF NOT EXISTS ix_students_student_id ON students(student_id);
CREATE INDEX IF NOT EXISTS ix_students_application_id ON students(application_id);
CREATE INDEX IF NOT EXISTS ix_students_academic_year_id ON students(academic_year_id);
CREATE INDEX IF NOT EXISTS ix_students_location_id ON students(location_id);
CREATE INDEX IF NOT EXISTS ix_students_gender ON students(gender);
CREATE INDEX IF NOT EXISTS ix_students_admission_status ON students(admission_status);
CREATE INDEX IF NOT EXISTS ix_students_is_synthetic ON students(is_synthetic);
CREATE INDEX IF NOT EXISTS ix_students_year_gender ON students(academic_year_id, gender);

CREATE TABLE IF NOT EXISTS forecast_results (
    id INTEGER PRIMARY KEY,
    generated_at DATETIME,
    scope VARCHAR(40) DEFAULT 'overall',
    scope_value VARCHAR(120),
    method VARCHAR(60) NOT NULL,
    horizon_years INTEGER NOT NULL,
    target_year INTEGER NOT NULL,
    predicted FLOAT NOT NULL,
    lower FLOAT,
    upper FLOAT,
    context_json TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    username VARCHAR(80),
    action VARCHAR(80) NOT NULL,
    entity VARCHAR(80),
    entity_id VARCHAR(80),
    details TEXT,
    ip_address VARCHAR(60),
    created_at DATETIME
);
CREATE INDEX IF NOT EXISTS ix_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS ix_audit_logs_created_at ON audit_logs(created_at);

CREATE TABLE IF NOT EXISTS uploaded_datasets (
    id INTEGER PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    uploaded_by VARCHAR(80),
    record_count INTEGER DEFAULT 0,
    valid_count INTEGER DEFAULT 0,
    invalid_count INTEGER DEFAULT 0,
    duplicate_count INTEGER DEFAULT 0,
    status VARCHAR(30) DEFAULT 'previewed',
    notes TEXT,
    created_at DATETIME
);

CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(80) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME
);
