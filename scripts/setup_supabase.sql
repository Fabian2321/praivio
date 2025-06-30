-- Supabase Setup Script für Praivio Upload-Funktionalität
-- Führe dieses Script in der Supabase SQL Editor aus

-- Erstelle uploaded_files Tabelle
CREATE TABLE IF NOT EXISTS uploaded_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'image', 'audio')),
    file_size INTEGER NOT NULL CHECK (file_size > 0),
    content_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    user_id TEXT NOT NULL,
    session_id TEXT,
    processed_content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Erstelle Index für bessere Performance
CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_id ON uploaded_files(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_session_id ON uploaded_files(session_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_created_at ON uploaded_files(created_at);

-- Erstelle RLS (Row Level Security) Policies
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;

-- Policy: Benutzer können nur ihre eigenen Dateien sehen
CREATE POLICY "Users can view their own files" ON uploaded_files
    FOR SELECT USING (auth.uid()::text = user_id);

-- Policy: Benutzer können nur ihre eigenen Dateien erstellen
CREATE POLICY "Users can insert their own files" ON uploaded_files
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Policy: Benutzer können nur ihre eigenen Dateien aktualisieren
CREATE POLICY "Users can update their own files" ON uploaded_files
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Policy: Benutzer können nur ihre eigenen Dateien löschen
CREATE POLICY "Users can delete their own files" ON uploaded_files
    FOR DELETE USING (auth.uid()::text = user_id);

-- Erstelle Storage Bucket für Dateien
INSERT INTO storage.buckets (id, name, public) 
VALUES ('files', 'files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies für den files Bucket
CREATE POLICY "Users can upload their own files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'files' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their own files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'files' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'files' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Funktion für automatisches updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger für updated_at
CREATE TRIGGER update_uploaded_files_updated_at 
    BEFORE UPDATE ON uploaded_files 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Zeige Erfolg an
SELECT 'Supabase Upload-Funktionalität erfolgreich eingerichtet!' as status; 