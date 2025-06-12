-- Add new fields for top text, bottom text, and display options
ALTER TABLE barcode_jobs ADD COLUMN IF NOT EXISTS display_barcode_data BOOLEAN DEFAULT true;

ALTER TABLE barcode_items ADD COLUMN IF NOT EXISTS top_text TEXT;
ALTER TABLE barcode_items ADD COLUMN IF NOT EXISTS bottom_text TEXT;

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
    END;

-- Update some jobs to have different display settings
UPDATE barcode_jobs 
SET display_barcode_data = false 
WHERE job_name IN ('Product Launch QR Codes', 'Shipping Labels - Code 128');

SELECT 'Text fields added successfully!' as message;
