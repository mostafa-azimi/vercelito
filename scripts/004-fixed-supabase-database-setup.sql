-- Fixed setup database for your Supabase project: gfurbnciptgfrjkxevnm
-- This will create all the necessary tables and sample data

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS barcode_items CASCADE;
DROP TABLE IF EXISTS barcode_jobs CASCADE;

-- Create barcode_jobs table
CREATE TABLE barcode_jobs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  job_name VARCHAR(255) NOT NULL,
  code_type VARCHAR(20) NOT NULL CHECK (code_type IN ('qr', 'code128')),
  label_size VARCHAR(50) NOT NULL,
  total_codes INTEGER NOT NULL DEFAULT 0,
  processed_codes INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create barcode_items table
CREATE TABLE barcode_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  job_id UUID REFERENCES barcode_jobs(id) ON DELETE CASCADE,
  sku VARCHAR(255),
  data TEXT NOT NULL,
  barcode_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_barcode_jobs_status ON barcode_jobs(status);
CREATE INDEX idx_barcode_jobs_created_at ON barcode_jobs(created_at DESC);
CREATE INDEX idx_barcode_items_job_id ON barcode_items(job_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for barcode_jobs
DROP TRIGGER IF EXISTS update_barcode_jobs_updated_at ON barcode_jobs;
CREATE TRIGGER update_barcode_jobs_updated_at 
    BEFORE UPDATE ON barcode_jobs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE barcode_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE barcode_items ENABLE ROW LEVEL SECURITY;

-- Create policies (allowing all operations for now - customize based on your needs)
DROP POLICY IF EXISTS "Allow all operations on barcode_jobs" ON barcode_jobs;
CREATE POLICY "Allow all operations on barcode_jobs" ON barcode_jobs
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on barcode_items" ON barcode_items;
CREATE POLICY "Allow all operations on barcode_items" ON barcode_items
    FOR ALL USING (true) WITH CHECK (true);

-- Insert sample jobs
INSERT INTO barcode_jobs (job_name, code_type, label_size, total_codes, processed_codes, status) VALUES
('Welcome QR Batch - Electronics', 'qr', '4x4', 12, 12, 'completed'),
('Inventory Code 128 - Warehouse', 'code128', '4x2', 30, 25, 'processing'),
('Product Launch QR Codes', 'qr', '4x6', 8, 8, 'completed'),
('Shipping Labels - Code 128', 'code128', '2x1', 50, 50, 'completed'),
('Demo Bulk Upload Test', 'qr', '4x4', 15, 10, 'processing');

-- Insert sample barcode items for QR code jobs (fixed approach)
INSERT INTO barcode_items (job_id, sku, data) 
SELECT 
    j.id,
    'SKU-' || LPAD(s.num::text, 4, '0'),
    'https://example.com/product/' || s.num
FROM barcode_jobs j
CROSS JOIN generate_series(1, 12) s(num)
WHERE j.job_name = 'Welcome QR Batch - Electronics';

-- Insert items for Product Launch QR Codes
INSERT INTO barcode_items (job_id, sku, data) 
SELECT 
    j.id,
    'LAUNCH-' || LPAD(s.num::text, 3, '0'),
    'https://launch.example.com/item/' || s.num
FROM barcode_jobs j
CROSS JOIN generate_series(1, 8) s(num)
WHERE j.job_name = 'Product Launch QR Codes';

-- Insert items for Code 128 shipping labels
INSERT INTO barcode_items (job_id, sku, data) 
SELECT 
    j.id,
    'SHIP-' || LPAD(s.num::text, 4, '0'),
    'SHIPPING' || LPAD(s.num::text, 8, '0')
FROM barcode_jobs j
CROSS JOIN generate_series(1, 50) s(num)
WHERE j.job_name = 'Shipping Labels - Code 128';

-- Insert items for processing jobs (partial completion)
INSERT INTO barcode_items (job_id, sku, data) 
SELECT 
    j.id,
    'INV-' || LPAD(s.num::text, 4, '0'),
    'INVENTORY' || LPAD(s.num::text, 8, '0')
FROM barcode_jobs j
CROSS JOIN generate_series(1, 25) s(num)
WHERE j.job_name = 'Inventory Code 128 - Warehouse';

INSERT INTO barcode_items (job_id, sku, data) 
SELECT 
    j.id,
    'DEMO-' || LPAD(s.num::text, 3, '0'),
    'https://demo.example.com/test/' || s.num
FROM barcode_jobs j
CROSS JOIN generate_series(1, 10) s(num)
WHERE j.job_name = 'Demo Bulk Upload Test';

-- Verify the setup with some helpful queries
SELECT 'Database setup completed successfully!' as message;

SELECT 
    'Jobs Summary:' as info,
    COUNT(*) as total_jobs,
    SUM(total_codes) as total_codes_planned,
    SUM(processed_codes) as total_codes_processed
FROM barcode_jobs;

SELECT 
    'Items Summary:' as info,
    COUNT(*) as total_items_created
FROM barcode_items;

-- Show a sample of what was created
SELECT 
    j.job_name,
    j.code_type,
    j.status,
    j.total_codes,
    j.processed_codes,
    COUNT(bi.id) as actual_items
FROM barcode_jobs j
LEFT JOIN barcode_items bi ON j.id = bi.job_id
GROUP BY j.id, j.job_name, j.code_type, j.status, j.total_codes, j.processed_codes
ORDER BY j.created_at;
