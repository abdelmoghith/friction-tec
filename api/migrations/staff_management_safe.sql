-- Safe Migration script for Staff Management System

-- Create staff table with enhanced fields
CREATE TABLE IF NOT EXISTS staff (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    department VARCHAR(100) NOT NULL,
    position VARCHAR(100) NOT NULL,
    role ENUM('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR', 'VIEWER', 'IT_SUPPORT', 'QUALITY_CONTROL', 'WAREHOUSE') NOT NULL DEFAULT 'VIEWER',
    status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    password_hash VARCHAR(255) NOT NULL,
    avatar VARCHAR(500),
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Create staff_permissions table for granular permissions
CREATE TABLE IF NOT EXISTS staff_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    staff_id INT NOT NULL,
    module VARCHAR(100) NOT NULL,
    can_view BOOLEAN DEFAULT FALSE,
    can_add BOOLEAN DEFAULT FALSE,
    can_edit BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    can_export BOOLEAN DEFAULT FALSE,
    full_control BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
    UNIQUE KEY unique_staff_module (staff_id, module)
) ENGINE=InnoDB;

-- Create staff_sessions table for session management
CREATE TABLE IF NOT EXISTS staff_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    staff_id INT NOT NULL,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Create staff_activity_log table for audit trail
CREATE TABLE IF NOT EXISTS staff_activity_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    staff_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    module VARCHAR(100),
    target_id INT,
    target_type VARCHAR(50),
    details JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Insert default admin user (password: admin123) - only if not exists
INSERT IGNORE INTO staff (name, email, department, position, role, status, password_hash) 
VALUES ('System Administrator', 'admin@company.com', 'Administration', 'System Administrator', 'ADMIN', 'ACTIVE', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- Insert default permissions for admin (full access to all modules)
INSERT IGNORE INTO staff_permissions (staff_id, module, can_view, can_add, can_edit, can_delete, can_export, full_control) 
SELECT s.id, 'Dashboard', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE FROM staff s WHERE s.email = 'admin@company.com';

INSERT IGNORE INTO staff_permissions (staff_id, module, can_view, can_add, can_edit, can_delete, can_export, full_control) 
SELECT s.id, 'Products', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE FROM staff s WHERE s.email = 'admin@company.com';

INSERT IGNORE INTO staff_permissions (staff_id, module, can_view, can_add, can_edit, can_delete, can_export, full_control) 
SELECT s.id, 'Buyers', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE FROM staff s WHERE s.email = 'admin@company.com';

INSERT IGNORE INTO staff_permissions (staff_id, module, can_view, can_add, can_edit, can_delete, can_export, full_control) 
SELECT s.id, 'Locations', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE FROM staff s WHERE s.email = 'admin@company.com';

INSERT IGNORE INTO staff_permissions (staff_id, module, can_view, can_add, can_edit, can_delete, can_export, full_control) 
SELECT s.id, 'Quality Control', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE FROM staff s WHERE s.email = 'admin@company.com';

INSERT IGNORE INTO staff_permissions (staff_id, module, can_view, can_add, can_edit, can_delete, can_export, full_control) 
SELECT s.id, 'Materials', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE FROM staff s WHERE s.email = 'admin@company.com';

INSERT IGNORE INTO staff_permissions (staff_id, module, can_view, can_add, can_edit, can_delete, can_export, full_control) 
SELECT s.id, 'Finished Products', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE FROM staff s WHERE s.email = 'admin@company.com';

INSERT IGNORE INTO staff_permissions (staff_id, module, can_view, can_add, can_edit, can_delete, can_export, full_control) 
SELECT s.id, 'Semi Products', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE FROM staff s WHERE s.email = 'admin@company.com';

INSERT IGNORE INTO staff_permissions (staff_id, module, can_view, can_add, can_edit, can_delete, can_export, full_control) 
SELECT s.id, 'Settings', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE FROM staff s WHERE s.email = 'admin@company.com';

INSERT IGNORE INTO staff_permissions (staff_id, module, can_view, can_add, can_edit, can_delete, can_export, full_control) 
SELECT s.id, 'Reports', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE FROM staff s WHERE s.email = 'admin@company.com';

INSERT IGNORE INTO staff_permissions (staff_id, module, can_view, can_add, can_edit, can_delete, can_export, full_control) 
SELECT s.id, 'Staff Management', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE FROM staff s WHERE s.email = 'admin@company.com';

INSERT IGNORE INTO staff_permissions (staff_id, module, can_view, can_add, can_edit, can_delete, can_export, full_control) 
SELECT s.id, 'Warehouse', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE FROM staff s WHERE s.email = 'admin@company.com';

INSERT IGNORE INTO staff_permissions (staff_id, module, can_view, can_add, can_edit, can_delete, can_export, full_control) 
SELECT s.id, 'History', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE FROM staff s WHERE s.email = 'admin@company.com';