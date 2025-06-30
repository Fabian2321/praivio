import React from 'react';
import { FileText, Image, Mic, X, Eye, Download } from 'lucide-react';
import axios from 'axios';
import { supabase } from '../supabaseClient';

export default function AttachedFiles({ files, onFileRemoved, sessionId }) {
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-400" />;
      case 'image':
        return <Image className="w-5 h-5 text-green-400" />;
      case 'audio':
        return <Mic className="w-5 h-5 text-purple-400" />;
      default:
        return <FileText className="w-5 h-5 text-slate-400" />;
    }
  };

  const getFileTypeLabel = (fileType) => {
    switch (fileType) {
      case 'pdf':
        return 'PDF';
      case 'image':
        return 'Bild';
      case 'audio':
        return 'Audio';
      default:
        return 'Datei';
    }
  };

  const handleRemoveFile = async (fileId) => {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      const response = await axios.delete(
        `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/upload/files/${fileId}`,
        {
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        }
      );
      
      if (response.data.success) {
        onFileRemoved(fileId);
      }
    } catch (error) {
      console.error('Error removing file:', error);
    }
  };

  const handleViewFile = (file) => {
    // Hier könnte man eine Vorschau implementieren
    // Für jetzt zeigen wir nur eine Info
    alert(`Datei: ${file.filename}\nTyp: ${getFileTypeLabel(file.file_type)}\nGröße: ${formatFileSize(file.file_size)}`);
  };

  if (!files || files.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-900 border-t-2 border-slate-700 p-4">
      <div className="flex items-center space-x-2 mb-3">
        <h3 className="text-white font-medium text-sm">Angehängte Dateien:</h3>
        <span className="text-slate-400 text-xs">({files.length})</span>
      </div>
      
      <div className="space-y-2">
        {files.map((file) => (
          <div
            key={file.id}
            className="flex items-center justify-between p-3 bg-slate-800 border border-slate-700 rounded-lg"
          >
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              {getFileIcon(file.file_type)}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <p className="text-white text-sm font-medium truncate">
                    {file.filename}
                  </p>
                  <span className="text-slate-500 text-xs">
                    {getFileTypeLabel(file.file_type)}
                  </span>
                </div>
                
                <div className="flex items-center space-x-4 text-xs text-slate-400">
                  <span>{formatFileSize(file.file_size)}</span>
                  {file.processed_content && (
                    <span className="text-green-400">✓ Verarbeitet</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handleViewFile(file)}
                className="p-1 text-slate-400 hover:text-white transition-colors"
                title="Datei anzeigen"
              >
                <Eye className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => handleRemoveFile(file.id)}
                className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                title="Datei entfernen"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {files.length > 0 && (
        <div className="mt-3 text-xs text-slate-500">
          <p>Diese Dateien werden als Kontext für die KI verwendet.</p>
        </div>
      )}
    </div>
  );
} 