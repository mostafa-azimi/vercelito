-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create barcode_jobs table
CREATE TABLE IF NOT EXISTS barcode_jobs (
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
CREATE TABLE IF NOT EXISTS barcode_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  job_id UUID REFERENCES barcode_jobs(id) ON DELETE CASCADE,
  sku VARCHAR(255),
  data TEXT NOT NULL,
  barcode_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_barcode_jobs_status ON barcode_jobs(status);
CREATE INDEX IF NOT EXISTS idx_barcode_jobs_created_at ON barcode_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_barcode_items_job_id ON barcode_items(job_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for barcode_jobs
CREATE TRIGGER update_barcode_jobs_updated_at 
    BEFORE UPDATE ON barcode_jobs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing
INSERT INTO barcode_jobs (job_name, code_type, label_size, total_codes, processed_codes, status) VALUES
('Sample QR Batch - Products', 'qr', '4x4', 10, 10, 'completed'),
('Sample Code 128 - Inventory', 'code128', '4x2', 25, 15, 'processing'),
('Demo Bulk Upload', 'qr', '4x6', 5, 5, 'completed');

-- Insert sample barcode items
INSERT INTO barcode_items (job_id, sku, data) 
SELECT 
    (SELECT id FROM barcode_jobs WHERE job_name = 'Sample QR Batch - Products' LIMIT 1),
    'SKU' || generate_series(1, 10),
    'https://example.com/product/' || generate_series(1, 10);
