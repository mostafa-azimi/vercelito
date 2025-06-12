-- Create tables for barcode generation system
CREATE TABLE IF NOT EXISTS barcode_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name VARCHAR(255) NOT NULL,
  code_type VARCHAR(20) NOT NULL CHECK (code_type IN ('qr', 'code128')),
  label_size VARCHAR(50) NOT NULL,
  total_codes INTEGER NOT NULL DEFAULT 0,
  processed_codes INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS barcode_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES barcode_jobs(id) ON DELETE CASCADE,
  sku VARCHAR(255),
  data TEXT NOT NULL,
  barcode_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_barcode_jobs_status ON barcode_jobs(status);
CREATE INDEX IF NOT EXISTS idx_barcode_items_job_id ON barcode_items(job_id);
