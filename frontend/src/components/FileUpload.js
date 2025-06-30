import React, { useState, useRef } from 'react';
import { Upload, FileText, Image, Mic, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import axios from 'axios';
import { supabase } from '../supabaseClient';

export default function FileUpload({ onFileUploaded, sessionId, disabled = false }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const fileInputRef = useRef(null);
  const audioInputRef = useRef(null);

  const handleFileSelect = async (file, fileType) => {
    if (!file) return;
    
    // Validiere Dateigröße
    const maxSizes = {
      'pdf': 10 * 1024 * 1024,  // 10 MB
      'image': 5 * 1024 * 1024,  // 5 MB
      'audio': 25 * 1024 * 1024  // 25 MB
    };
    
    if (file.size > maxSizes[fileType]) {
      setUploadError(`Datei zu groß. Maximal ${maxSizes[fileType] / (1024 * 1024)} MB für ${fileType === 'pdf' ? 'PDFs' : fileType === 'image' ? 'Bilder' : 'Audio'}.`);
      return;
    }
    
    await uploadFile(file, fileType);
  };

  const uploadFile = async (file, fileType) => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (sessionId) {
        formData.append('session_id', sessionId);
      }
      
      // Token holen
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/upload/file`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        }
      );
      
      if (response.data.success) {
        onFileUploaded(response.data.file);
        setShowDropdown(false);
      } else {
        setUploadError('Upload fehlgeschlagen');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error.response?.data?.detail || 'Upload fehlgeschlagen');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      const fileType = getFileType(file);
      if (fileType) {
        handleFileSelect(file, fileType);
      } else {
        setUploadError('Nicht unterstützter Dateityp');
      }
    }
  };

  const getFileType = (file) => {
    const ext = file.name.toLowerCase().split('.').pop();
    const mimeType = file.type;
    
    if (mimeType === 'application/pdf' || ext === 'pdf') return 'pdf';
    if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return 'image';
    if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'webm'].includes(ext)) return 'audio';
    
    return null;
  };

  const openFileDialog = (fileType) => {
    if (fileType === 'audio') {
      audioInputRef.current?.click();
    } else {
      fileInputRef.current?.click();
    }
  };

  const startAudioRecording = () => {
    // Hier könnte man die Audio-Aufnahme implementieren
    // Für jetzt öffnen wir einfach den Datei-Dialog
    audioInputRef.current?.click();
  };

  return (
    <div className="relative">
      {/* Upload Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={disabled || isUploading}
        className={`p-3 rounded-lg transition-colors h-12 w-12 flex items-center justify-center ${
          isUploading 
            ? 'bg-slate-700 cursor-not-allowed' 
            : 'bg-slate-700 hover:bg-purple-700'
        } text-white`}
        title="Datei hochladen"
      >
        {isUploading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Upload className="w-5 h-5" />
        )}
      </button>

      {/* Dropdown Menu */}
      {showDropdown && !isUploading && (
        <div className="absolute bottom-full right-0 mb-2 w-64 bg-slate-800 border-2 border-slate-700 rounded-lg shadow-lg z-50">
          <div className="p-3">
            <h3 className="text-white font-medium mb-3">Datei hochladen</h3>
            
            {/* Upload Options */}
            <div className="space-y-2">
              <button
                onClick={() => openFileDialog('pdf')}
                className="w-full flex items-center space-x-3 p-2 text-left text-slate-200 hover:bg-slate-700 rounded transition-colors"
              >
                <FileText className="w-5 h-5 text-blue-400" />
                <span>PDF hochladen</span>
              </button>
              
              <button
                onClick={() => openFileDialog('image')}
                className="w-full flex items-center space-x-3 p-2 text-left text-slate-200 hover:bg-slate-700 rounded transition-colors"
              >
                <Image className="w-5 h-5 text-green-400" />
                <span>Bild hochladen</span>
              </button>
              
              <button
                onClick={() => openFileDialog('audio')}
                className="w-full flex items-center space-x-3 p-2 text-left text-slate-200 hover:bg-slate-700 rounded transition-colors"
              >
                <Mic className="w-5 h-5 text-purple-400" />
                <span>Audio hochladen</span>
              </button>
            </div>
            
            {/* Drag & Drop Area */}
            <div
              className={`mt-3 p-3 border-2 border-dashed rounded-lg transition-colors ${
                isDragOver 
                  ? 'border-purple-500 bg-purple-900/20' 
                  : 'border-slate-600 hover:border-slate-500'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="text-center text-slate-400 text-sm">
                <Upload className="w-6 h-6 mx-auto mb-2" />
                <p>Datei hier hineinziehen</p>
                <p className="text-xs">PDF, Bild oder Audio</p>
              </div>
            </div>
            
            {/* File Size Limits */}
            <div className="mt-3 text-xs text-slate-500">
              <p>Max. Größen:</p>
              <p>• PDF: 10 MB</p>
              <p>• Bilder: 5 MB</p>
              <p>• Audio: 25 MB</p>
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.gif"
        onChange={(e) => {
          const file = e.target.files[0];
          if (file) {
            const fileType = getFileType(file);
            if (fileType) {
              handleFileSelect(file, fileType);
            } else {
              setUploadError('Nicht unterstützter Dateityp');
            }
          }
          e.target.value = ''; // Reset input
        }}
      />
      
      <input
        ref={audioInputRef}
        type="file"
        className="hidden"
        accept="audio/*,.mp3,.wav,.ogg,.m4a,.webm"
        onChange={(e) => {
          const file = e.target.files[0];
          if (file) {
            handleFileSelect(file, 'audio');
          }
          e.target.value = ''; // Reset input
        }}
      />

      {/* Upload Progress */}
      {isUploading && (
        <div className="absolute bottom-full right-0 mb-2 w-64 bg-slate-800 border-2 border-slate-700 rounded-lg p-3 z-50">
          <div className="flex items-center space-x-2 mb-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
            <span className="text-white text-sm">Upload läuft...</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <div className="text-right text-xs text-slate-400 mt-1">
            {uploadProgress}%
          </div>
        </div>
      )}

      {/* Error Message */}
      {uploadError && (
        <div className="absolute bottom-full right-0 mb-2 w-64 bg-red-900 border-2 border-red-700 rounded-lg p-3 z-50">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-white text-sm">{uploadError}</span>
            <button
              onClick={() => setUploadError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Click Outside to Close */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
} 