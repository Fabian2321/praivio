"""
File Upload Handler für Praivio
Verarbeitet PDFs, Bilder und Audio-Dateien mit AI-Integration
"""

import os
import uuid
import logging
from typing import Optional, Dict, Any
from datetime import datetime
import httpx
from pathlib import Path
import tempfile
import shutil

# Supabase
from supabase import create_client, Client
from supabase_auth import supabase_auth

# AI Processing
import whisper
from PIL import Image
import pytesseract
import fitz  # PyMuPDF
import io

logger = logging.getLogger(__name__)

class FileUploadHandler:
    def __init__(self):
        # Supabase Configuration
        self.supabase_url = os.getenv("SUPABASE_URL", "https://vtvlbavlhlnfamlreiql.supabase.co")
        self.supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        
        # File size limits (in bytes)
        self.max_sizes = {
            'pdf': 10 * 1024 * 1024,  # 10 MB
            'image': 5 * 1024 * 1024,  # 5 MB
            'audio': 25 * 1024 * 1024  # 25 MB
        }
        
        # Allowed file types
        self.allowed_types = {
            'pdf': ['application/pdf'],
            'image': ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
            'audio': ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm']
        }
        
        # Initialize AI models
        self.whisper_model = None
        
    def _get_whisper_model(self):
        """Lazy loading für Whisper model"""
        if self.whisper_model is None:
            logger.info("Loading Whisper model...")
            self.whisper_model = whisper.load_model("base")
        return self.whisper_model
    
    def validate_file(self, file_content: bytes, filename: str, content_type: str) -> Dict[str, Any]:
        """Validiert eine Datei und gibt Metadaten zurück"""
        file_size = len(file_content)
        
        # Bestimme Dateityp basierend auf Content-Type und Extension
        file_type = None
        for type_name, mime_types in self.allowed_types.items():
            if content_type in mime_types:
                file_type = type_name
                break
        
        if not file_type:
            # Fallback: Versuche es mit Dateiendung
            ext = Path(filename).suffix.lower()
            if ext == '.pdf':
                file_type = 'pdf'
            elif ext in ['.jpg', '.jpeg', '.png', '.webp', '.gif']:
                file_type = 'image'
            elif ext in ['.mp3', '.wav', '.ogg', '.m4a', '.webm']:
                file_type = 'audio'
        
        if not file_type:
            raise ValueError(f"Nicht unterstützter Dateityp: {content_type}")
        
        # Prüfe Dateigröße
        max_size = self.max_sizes.get(file_type)
        if file_size > max_size:
            raise ValueError(f"Datei zu groß. Maximal {max_size // (1024*1024)} MB für {file_type}")
        
        return {
            'file_type': file_type,
            'file_size': file_size,
            'filename': filename,
            'content_type': content_type
        }
    
    async def upload_file(self, file_content: bytes, filename: str, content_type: str, user_id: str, session_id: Optional[str] = None) -> Dict[str, Any]:
        """Lädt eine Datei hoch und verarbeitet sie"""
        try:
            # Validiere Datei
            metadata = self.validate_file(file_content, filename, content_type)
            
            # Generiere eindeutige ID und Pfad
            file_id = str(uuid.uuid4())
            file_extension = Path(filename).suffix
            storage_path = f"uploads/{user_id}/{file_id}{file_extension}"
            
            # Upload zu Supabase Storage
            logger.info(f"Uploading file {filename} to Supabase Storage...")
            result = self.supabase.storage.from_('files').upload(
                path=storage_path,
                file=file_content,
                file_options={"content-type": content_type}
            )
            
            # Prüfe auf Fehler in der Response
            if hasattr(result, 'error') and result.error:
                raise Exception(f"Supabase upload failed: {result.error}")
            
            # Verarbeite Datei mit AI
            processed_content = await self._process_file(file_content, metadata['file_type'])
            
            # Speichere Metadaten in Datenbank
            file_data = {
                'id': file_id,
                'filename': filename,
                'file_type': metadata['file_type'],
                'file_size': metadata['file_size'],
                'content_type': content_type,
                'storage_path': storage_path,
                'user_id': user_id,
                'session_id': session_id,
                'processed_content': processed_content,
                'created_at': datetime.now().isoformat()
            }
            
            # Insert in database
            result = self.supabase.table('uploaded_files').insert(file_data).execute()
            
            # Prüfe auf Fehler in der Response
            if hasattr(result, 'error') and result.error:
                raise Exception(f"Database insert failed: {result.error}")
            
            logger.info(f"File {filename} uploaded and processed successfully")
            
            return {
                'id': file_id,
                'filename': filename,
                'file_type': metadata['file_type'],
                'file_size': metadata['file_size'],
                'processed_content': processed_content,
                'storage_path': storage_path
            }
            
        except Exception as e:
            logger.error(f"File upload failed: {e}")
            raise
    
    async def _process_file(self, file_content: bytes, file_type: str) -> Optional[str]:
        """Verarbeitet eine Datei mit AI und extrahiert Inhalt"""
        try:
            if file_type == 'pdf':
                return await self._process_pdf(file_content)
            elif file_type == 'image':
                return await self._process_image(file_content)
            elif file_type == 'audio':
                return await self._process_audio(file_content)
            else:
                return None
        except Exception as e:
            logger.error(f"File processing failed: {e}")
            return None
    
    async def _process_pdf(self, file_content: bytes) -> str:
        """Extrahiert Text aus PDF"""
        try:
            # Öffne PDF mit PyMuPDF
            doc = fitz.open(stream=file_content, filetype="pdf")
            text_content = []
            
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                text = page.get_text()
                text_content.append(text)
            
            doc.close()
            
            # Kombiniere alle Seiten
            full_text = "\n\n".join(text_content)
            
            # Kürze bei sehr langen Texten
            if len(full_text) > 10000:
                full_text = full_text[:10000] + "\n\n[Text gekürzt - zu lang für vollständige Anzeige]"
            
            return full_text.strip()
            
        except Exception as e:
            logger.error(f"PDF processing failed: {e}")
            return "PDF konnte nicht verarbeitet werden."
    
    async def _process_image(self, file_content: bytes) -> str:
        """Analysiert Bild mit OCR und Vision"""
        try:
            # Öffne Bild mit PIL
            image = Image.open(io.BytesIO(file_content))
            
            # OCR mit Tesseract
            try:
                ocr_text = pytesseract.image_to_string(image, lang='deu+eng')
                ocr_text = ocr_text.strip()
            except Exception as ocr_error:
                logger.warning(f"OCR failed: {ocr_error}")
                ocr_text = ""
            
            # Bildbeschreibung (falls Vision API verfügbar)
            # Hier könnte man GPT-4V oder ähnliches integrieren
            vision_description = "Bild erfolgreich verarbeitet."
            
            # Kombiniere OCR und Vision
            if ocr_text:
                result = f"OCR-Text aus Bild:\n{ocr_text}\n\n{vision_description}"
            else:
                result = vision_description
            
            return result
            
        except Exception as e:
            logger.error(f"Image processing failed: {e}")
            return "Bild konnte nicht verarbeitet werden."
    
    async def _process_audio(self, file_content: bytes) -> str:
        """Transkribiert Audio mit Whisper"""
        try:
            # Speichere temporäre Datei
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                temp_file.write(file_content)
                temp_path = temp_file.name
            
            try:
                # Transkribiere mit Whisper
                model = self._get_whisper_model()
                result = model.transcribe(temp_path, language="de")
                transcript = result["text"].strip()
                
                return f"Audio-Transkript:\n{transcript}"
                
            finally:
                # Lösche temporäre Datei
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
                    
        except Exception as e:
            logger.error(f"Audio processing failed: {e}")
            return "Audio konnte nicht transkribiert werden."
    
    async def get_file(self, file_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Holt eine Datei aus der Datenbank"""
        try:
            result = self.supabase.table('uploaded_files').select('*').eq('id', file_id).eq('user_id', user_id).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
            
        except Exception as e:
            logger.error(f"Get file failed: {e}")
            return None
    
    async def get_session_files(self, session_id: str, user_id: str) -> list:
        """Holt alle Dateien einer Chat-Session"""
        try:
            result = self.supabase.table('uploaded_files').select('*').eq('session_id', session_id).eq('user_id', user_id).execute()
            
            return result.data or []
            
        except Exception as e:
            logger.error(f"Get session files failed: {e}")
            return []
    
    async def delete_file(self, file_id: str, user_id: str) -> bool:
        """Löscht eine Datei"""
        try:
            # Hole Datei-Informationen
            file_info = await self.get_file(file_id, user_id)
            if not file_info:
                return False
            
            # Lösche aus Storage
            try:
                self.supabase.storage.from_('files').remove([file_info['storage_path']])
            except Exception as storage_error:
                logger.warning(f"Storage deletion failed: {storage_error}")
            
            # Lösche aus Datenbank
            result = self.supabase.table('uploaded_files').delete().eq('id', file_id).eq('user_id', user_id).execute()
            
            return True
            
        except Exception as e:
            logger.error(f"Delete file failed: {e}")
            return False

# Global instance
file_upload_handler = FileUploadHandler() 