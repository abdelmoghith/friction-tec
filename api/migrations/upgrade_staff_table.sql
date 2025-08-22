-- Upgrade existing staff table to new structure

-- Add new columns to existing staff table
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS phone VARCHAR(50) AFTER email,
ADD COLUMN IF NOT EXISTS department VARCHAR(100) NOT NULL DEFAULT 'General' AFTER phone,
ADD COLUMN IF NOT EXISTS position VARCHAR(100) NOT NULL DEFAULT 'Staff Member' AFTER department,
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NOT NULL DEFAULT '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' AFTER position,
ADD COLUMN IF NOT EXISTS avatar VARCHAR(500) AFTER password_hash,
ADD COLUMN IF NOT EXISTS last_login DATETIME AFTER avatar;

-- Modify role column to use ENUM
ALTER TABLE staff MODIFY COLUMN role ENUM('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR', 'VIEWER', 'IT_SUPPORT', 'QUALITY_CONTROL', 'WAREHOUSE') NOT NULL DEFAULT 'VIEWER';

-- Modify status column to use ENUM
ALTER TABLE staff MODIFY COLUMN status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE';

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

-- Update existing staff records to have proper department and position
UPDATE staff SET 
    department = CASE 
        WHEN role = 'ADMIN' THEN 'Administration'
        WHEN role = 'IT' THEN 'IT Support'
        WHEN role = 'SUPER' THEN 'Management'
        ELSE 'General'
    END,
    position = CASE 
        WHEN role = 'ADMIN' THEN 'System Administrator'
        WHEN role = 'IT' THEN 'IT Support Specialist'
        WHEN role = 'SUPER' THEN 'Supervisor'
        ELSE 'Staff Member'
    END,
    role = CASE 
        WHEN role = 'ADMIN' THEN 'ADMIN'
        WHEN role = 'IT' THEN 'IT_SUPPORT'
        WHEN role = 'SUPER' THEN 'SUPERVISOR'
        ELSE 'VIEWER'
    END
WHERE department IS NULL OR department = '';

-- Insert admin user if not exists
INSERT IGNORE INTO staff (name, email, phone, department, position, role, status, password_hash) 
VALUES ('System Administrator', 'admin@company.com', NULL, 'Administration', 'System Administrator', 'ADMIN', 'ACTIVE', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- Insert default permissions for all existing staff
INSERT IGNORE INTO staff_permissions (staff_id, module, can_view, can_add, can_edit, can_delete, can_export, full_control) 
SELECT s.id, 'Dashboard', 
    CASE WHEN s.role = 'ADMIN' THEN TRUE ELSE TRUE END,
    CASE WHEN s.role = 'ADMIN' THEN TRUE ELSE FALSE END,
    CASE WHEN s.role = 'ADMIN' THEN TRUE ELSE FALSE END,
    CASE WHEN s.role = 'ADMIN' THEN TRUE ELSE FALSE END,
    CASE WHEN s.role = 'ADMIN' THEN TRUE ELSE FALSE END,
    CASE WHEN s.role = 'ADMIN' THEN TRUE ELSE FALSE END
FROM staff s;

INSERT IGNORE INTO staff_permissions (staff_id, module, can_view, can_add, can_edit, can_delete, can_export, full_control) 
SELECT s.id, 'Products', 
    CASE WHEN s.role IN ('ADMIN', 'MANAGER', 'SUPERVISOR') THEN TRUE ELSE TRUE END,
    CASE WHEN s.role IN ('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR') THEN TRUE ELSE FALSE END,
    CASE WHEN s.role IN ('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR') THEN TRUE ELSE FALSE END,
    CASE WHEN s.role = 'ADMIN' THEN TRUE ELSE FALSE END,
    CASE WHEN s.role IN ('ADMIN', 'MANAGER', 'SUPERVISOR') THEN TRUE ELSE FALSE END,
    CASE WHEN s.role = 'ADMIN' THEN TRUE ELSE FALSE END
FROM staff s;

INSERT IGNORE INTO staff_permissions (staff_id, module, can_view, can_add, can_edit, can_delete, can_export, full_control) 
SELECT s.id, 'Staff Management', 
    CASE WHEN s.role = 'ADMIN' THEN TRUE ELSE FALSE END,
    CASE WHEN s.role = 'ADMIN' THEN TRUE ELSE FALSE END,
    CASE WHEN s.role = 'ADMIN' THEN TRUE ELSE FALSE END,
    CASE WHEN s.role = 'ADMIN' THEN TRUE ELSE FALSE END,
    CASE WHEN s.role = 'ADMIN' THEN TRUE ELSE FALSE END,
    CASE WHEN s.role = 'ADMIN' THEN TRUE ELSE FALSE END
FROM staff s;