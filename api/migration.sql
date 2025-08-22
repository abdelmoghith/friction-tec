-- Migration script to add missing columns for product materials support

-- Add type column to products table if it doesn't exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS type VARCHAR(50) NOT NULL DEFAULT 'matiere';

-- Add material_type column to product_materials table if it doesn't exist
ALTER TABLE product_materials ADD COLUMN IF NOT EXISTS material_type VARCHAR(50) NOT NULL DEFAULT 'matiere';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_type ON products(type);
CREATE INDEX IF NOT EXISTS idx_product_materials_material_type ON product_materials(material_type);

-- Notification table for stock alerts
CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    message VARCHAR(255) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_notifications_product_id ON notifications(product_id);

-- Add is_transfer column to movements table if it doesn't exist
ALTER TABLE movements ADD COLUMN IF NOT EXISTS is_transfer BOOLEAN DEFAULT 0;

-- Add quality_status column to movements table if it doesn't exist
ALTER TABLE movements ADD COLUMN IF NOT EXISTS quality_status VARCHAR(50) DEFAULT NULL;

-- Add needs_examination column to movements table if it doesn't exist  
ALTER TABLE movements ADD COLUMN IF NOT EXISTS needs_examination BOOLEAN DEFAULT FALSE;

-- Add internal_transfer column to movements table if it doesn't exist
ALTER TABLE movements ADD COLUMN IF NOT EXISTS internal_transfer BOOLEAN DEFAULT FALSE;

-- Create recipes table for Complément Stock operations
CREATE TABLE IF NOT EXISTS recipes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    movement_id INT NOT NULL,
    product_id INT NOT NULL,
    product_designation VARCHAR(255) NOT NULL,
    product_reference VARCHAR(255),
    product_unite VARCHAR(50),
    supplier_name VARCHAR(255),
    batch_number VARCHAR(255),
    quantity INT NOT NULL,
    fabrication_date DATE,
    expiration_date DATE,
    quality_status VARCHAR(50),
    needs_examination BOOLEAN DEFAULT FALSE,
    operation_type VARCHAR(50) NOT NULL DEFAULT 'Complément Stock',
    locations_info JSON, -- Store location and floor distribution as JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (movement_id) REFERENCES movements(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Create indexes for better performance on recipes table
CREATE INDEX IF NOT EXISTS idx_recipes_movement_id ON recipes(movement_id);
CREATE INDEX IF NOT EXISTS idx_recipes_product_id ON recipes(product_id);
CREATE INDEX IF NOT EXISTS idx_recipes_batch_number ON recipes(batch_number);
CREATE INDEX IF NOT EXISTS idx_recipes_operation_type ON recipes(operation_type);
CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at); 