import React, { useState, useEffect } from 'react';
import { Brain, Download, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';

const ModelManager = () => {
  const [models, setModels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/models`);
      setModels(response.data);
    } catch (error) {
      console.error('Error fetching models:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadModel = async (modelName) => {
    try {
      // This would call Ollama's pull endpoint
      await axios.post(`http://localhost:11434/api/pull`, {
        name: modelName
      });
      alert(`Modell ${modelName} wird heruntergeladen...`);
    } catch (error) {
      console.error('Error downloading model:', error);
      alert('Fehler beim Herunterladen des Modells');
    }
  };

  const deleteModel = async (modelName) => {
    if (window.confirm(`Möchten Sie das Modell "${modelName}" wirklich löschen?`)) {
      try {
        await axios.delete(`http://localhost:11434/api/delete`, {
          data: { name: modelName }
        });
        fetchModels(); // Refresh list
        alert(`Modell ${modelName} wurde gelöscht`);
      } catch (error) {
        console.error('Error deleting model:', error);
        alert('Fehler beim Löschen des Modells');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <Brain className="w-8 h-8 text-blue-600" />
          Modell-Management
        </h1>
        <p className="text-gray-600">
          Verwalten Sie die verfügbaren KI-Modelle für die lokale Textgenerierung
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(Array.isArray(models) ? models : []).map((model) => (
          <div key={model.name} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Brain className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{model.name}</h3>
                  <p className="text-sm text-gray-500">{model.parameters}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {model.status === 'available' ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm">
                <span className="text-gray-500">Größe:</span>
                <span className="ml-2 font-medium">{model.size}</span>
              </div>
              
              <div className="text-sm">
                <span className="text-gray-500">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                  model.status === 'available' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {model.status === 'available' ? 'Verfügbar' : 'Nicht verfügbar'}
                </span>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  onClick={() => downloadModel(model.name)}
                  className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 text-sm flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Herunterladen
                </button>
                <button
                  onClick={() => deleteModel(model.name)}
                  className="px-3 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50 text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {models.length === 0 && (
        <div className="text-center py-12">
          <Brain className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Modelle gefunden</h3>
          <p className="text-gray-500">
            Laden Sie ein Modell herunter, um mit der Textgenerierung zu beginnen.
          </p>
        </div>
      )}

      {/* Recommended Models */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Empfohlene Modelle</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { name: 'llama2', description: 'Allgemeines Modell für verschiedene Aufgaben', size: '3.8GB' },
            { name: 'mistral', description: 'Schnelles und effizientes Modell', size: '4.1GB' },
            { name: 'codellama', description: 'Spezialisiert für Code-Generierung', size: '6.7GB' }
          ].map((model) => (
            <div key={model.name} className="bg-gray-50 rounded-lg p-6 border-2 border-dashed border-gray-300">
              <h3 className="font-semibold text-gray-900 mb-2">{model.name}</h3>
              <p className="text-sm text-gray-600 mb-4">{model.description}</p>
              <div className="text-sm text-gray-500 mb-4">Größe: {model.size}</div>
              <button
                onClick={() => downloadModel(model.name)}
                className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 text-sm flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Herunterladen
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ModelManager; 