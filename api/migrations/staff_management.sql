-- Migration script for Staff Management System

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

-- Create indexes for better performance (MySQL compatible)
CREATE INDEX idx_staff_email ON staff(email);
CREATE INDEX idx_staff_role ON staff(role);
CREATE INDEX idx_staff_status ON staff(status);
CREATE INDEX idx_staff_department ON staff(department);
CREATE INDEX idx_staff_permissions_staff_id ON staff_permissions(staff_id);
CREATE INDEX idx_staff_permissions_module ON staff_permissions(module);
CREATE INDEX idx_staff_sessions_staff_id ON staff_sessions(staff_id);
CREATE INDEX idx_staff_sessions_token ON staff_sessions(session_token);
CREATE INDEX idx_staff_activity_staff_id ON staff_activity_log(staff_id);
CREATE INDEX idx_staff_activity_action ON staff_activity_log(action);
CREATE INDEX idx_staff_activity_created_at ON staff_activity_log(created_at);

-- Insert default admin user (password: admin123)
INSERT IGNORE INTO staff (name, email, department, position, role, status, password_hash) 
VALUES ('System Administrator', 'admin@company.com', 'Administration', 'System Administrator', 'ADMIN', 'ACTIVE', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- Get the admin user ID for permissions
SET @admin_id = (SELECT id FROM staff WHERE email = 'admin@company.com');

-- Insert default permissions for admin (full access to all modules)
INSERT IGNORE INTO staff_permissions (staff_id, module, can_view, can_add, can_edit, can_delete, can_export, full_control) VALUES
(@admin_id, 'Dashboard', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
(@admin_id, 'Products', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
(@admin_id, 'Buyers', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
(@admin_id, 'Locations', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
(@admin_id, 'Quality Control', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
(@admin_id, 'Materials', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
(@admin_id, 'Finished Products', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
(@admin_id, 'Semi Products', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
(@admin_id, 'Settings', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
(@admin_id, 'Reports', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
(@admin_id, 'Staff Management', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
(@admin_id, 'Warehouse', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
(@admin_id, 'History', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE);