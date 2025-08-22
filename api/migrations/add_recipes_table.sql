-- Migration to add recipes table for Complément Stock operations

-- Create recipes table
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recipes_movement_id ON recipes(movement_id);
CREATE INDEX IF NOT EXISTS idx_recipes_product_id ON recipes(product_id);
CREATE INDEX IF NOT EXISTS idx_recipes_batch_number ON recipes(batch_number);
CREATE INDEX IF NOT EXISTS idx_recipes_operation_type ON recipes(operation_type);
CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at);

-- Add quality_status column to movements table if it doesn't exist
ALTER TABLE movements ADD COLUMN IF NOT EXISTS quality_status VARCHAR(50) DEFAULT NULL;

-- Add needs_examination column to movements table if it doesn't exist  
ALTER TABLE movements ADD COLUMN IF NOT EXISTS needs_examination BOOLEAN DEFAULT FALSE;

-- Add internal_transfer column to movements table if it doesn't exist
ALTER TABLE movements ADD COLUMN IF NOT EXISTS internal_transfer BOOLEAN DEFAULT FALSE;