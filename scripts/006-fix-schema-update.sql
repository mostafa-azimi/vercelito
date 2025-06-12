-- Fix schema by properly adding the missing columns
-- First, let's check if columns exist and add them if they don't

-- Add display_barcode_data column to barcode_jobs if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'barcode_jobs' AND column_name = 'display_barcode_data') THEN
        ALTER TABLE barcode_jobs ADD COLUMN display_barcode_data BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Add top_text column to barcode_items if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'barcode_items' AND column_name = 'top_text') THEN
        ALTER TABLE barcode_items ADD COLUMN top_text TEXT;
    END IF;
END $$;

-- Add bottom_text column to barcode_items if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'barcode_items' AND column_name = 'bottom_text') THEN
        ALTER TABLE barcode_items ADD COLUMN bottom_text TEXT;
    END IF;
END $$;

-- Update existing jobs with default display_barcode_data value
UPDATE barcode_jobs 
SET display_barcode_data = true 
WHERE display_barcode_data IS NULL;

-- Update existing sample data with some example text
UPDATE barcode_items 
SET 
    top_text = CASE 
        WHEN sku LIKE 'SKU-%' THEN 'Electronics Product'
        WHEN sku LIKE 'LAUNCH-%' THEN 'New Launch Item'
        WHEN sku LIKE 'SHIP-%' THEN 'Shipping Label'
        WHEN sku LIKE 'INV-%' THEN 'Inventory Item'
        WHEN sku LIKE 'DEMO-%' THEN 'Demo Product'
        ELSE 'Product'
    END,
    bottom_text = CASE 
        WHEN sku LIKE 'SKU-%' THEN '$29.99'
        WHEN sku LIKE 'LAUNCH-%' THEN '$49.99 - NEW'
        WHEN sku LIKE 'SHIP-%' THEN 'Priority Mail'
        WHEN sku LIKE 'INV-%' THEN 'Warehouse A'
        WHEN sku LIKE 'DEMO-%' THEN '$19.99'
        ELSE 'N/A'
    END
WHERE top_text IS NULL OR bottom_text IS NULL;

-- Update some jobs to have different display settings
UPDATE barcode_jobs 
SET display_barcode_data = false 
WHERE job_name IN ('Product Launch QR Codes', 'Shipping Labels - Code 128');

-- Verify the schema updates
SELECT 
    'Schema updated successfully!' as message,
    COUNT(*) as jobs_with_display_setting
FROM barcode_jobs 
WHERE display_barcode_data IS NOT NULL;

SELECT 
    'Text fields updated!' as message,
    COUNT(*) as items_with_text
FROM barcode_items 
WHERE top_text IS NOT NULL OR bottom_text IS NOT NULL;
