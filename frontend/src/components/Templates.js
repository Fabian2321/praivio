import React, { useState, useEffect } from 'react';
import { FileText, Copy, Plus, Edit, Trash2, Heart, Building, Scale } from 'lucide-react';
import axios from 'axios';

const Templates = () => {
  const [templates, setTemplates] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('medical');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/templates`);
      setTemplates(response.data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyTemplate = (template) => {
    navigator.clipboard.writeText(template);
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'medical':
        return <Heart className="w-5 h-5 text-red-500" />;
      case 'legal':
        return <Scale className="w-5 h-5 text-blue-500" />;
      case 'government':
        return <Building className="w-5 h-5 text-green-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getCategoryName = (category) => {
    switch (category) {
      case 'medical':
        return 'Medizin';
      case 'legal':
        return 'Recht';
      case 'government':
        return 'Behörden';
      default:
        return category;
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
          <FileText className="w-8 h-8 text-blue-600" />
          Text-Vorlagen
        </h1>
        <p className="text-gray-600">
          Vordefinierte Vorlagen für verschiedene Anwendungsbereiche
        </p>
      </div>

      {/* Category Tabs */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {Object.keys(templates).map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  selectedCategory === category
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {getCategoryIcon(category)}
                {getCategoryName(category)}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates[selectedCategory] && 
          Object.entries(templates[selectedCategory]).map(([key, template]) => (
            <div key={key} className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {getCategoryName(selectedCategory)} Vorlage
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => copyTemplate(template)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="bg-gray-50 rounded-md p-3">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                    {template}
                  </pre>
                </div>

                <div className="text-xs text-gray-500">
                  <p>Verfügbare Variablen:</p>
                  <ul className="mt-1 space-y-1">
                    <li>• <code className="bg-gray-200 px-1 rounded">{'{prompt}'}</code> - Ihre Anfrage</li>
                    <li>• <code className="bg-gray-200 px-1 rounded">{'{context}'}</code> - Zusätzlicher Kontext</li>
                  </ul>
                </div>

                <div className="flex gap-2 pt-3">
                  <button
                    onClick={() => copyTemplate(template)}
                    className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 text-sm flex items-center justify-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Kopieren
                  </button>
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* Template Examples by Category */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Beispiele für {getCategoryName(selectedCategory)}
        </h2>
        
        {selectedCategory === 'medical' && (
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-4">Medizinische Anwendungen</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-blue-800 mb-2">Arztberichte</h4>
                <p className="text-blue-700">
                  Automatische Generierung von Arztberichten basierend auf Befunden und Patientendaten.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-blue-800 mb-2">Befundvorlagen</h4>
                <p className="text-blue-700">
                  Strukturierte Vorlagen für verschiedene Untersuchungsarten und Befunde.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-blue-800 mb-2">Anamnese-Dokumentation</h4>
                <p className="text-blue-700">
                  Unterstützung bei der strukturierten Dokumentation von Patientengesprächen.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-blue-800 mb-2">Entlassungsbriefe</h4>
                <p className="text-blue-700">
                  Automatisierte Erstellung von Entlassungsbriefen mit relevanten Informationen.
                </p>
              </div>
            </div>
          </div>
        )}

        {selectedCategory === 'legal' && (
          <div className="bg-green-50 rounded-lg p-6">
            <h3 className="font-semibold text-green-900 mb-4">Rechtliche Anwendungen</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-green-800 mb-2">Vertragsanalysen</h4>
                <p className="text-green-700">
                  Automatische Analyse von Vertragstexten und Identifikation wichtiger Klauseln.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-green-800 mb-2">Textentwürfe</h4>
                <p className="text-green-700">
                  Unterstützung bei der Erstellung von rechtlichen Dokumenten und Schriftsätzen.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-green-800 mb-2">Dokumentenprüfung</h4>
                <p className="text-green-700">
                  Automatisierte Prüfung von Dokumenten auf Vollständigkeit und Rechtmäßigkeit.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-green-800 mb-2">Gutachten</h4>
                <p className="text-green-700">
                  Unterstützung bei der Erstellung von rechtlichen Gutachten und Stellungnahmen.
                </p>
              </div>
            </div>
          </div>
        )}

        {selectedCategory === 'government' && (
          <div className="bg-purple-50 rounded-lg p-6">
            <h3 className="font-semibold text-purple-900 mb-4">Behördliche Anwendungen</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-purple-800 mb-2">Berichterstellung</h4>
                <p className="text-purple-700">
                  Automatisierte Erstellung von behördlichen Berichten und Dokumentationen.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-purple-800 mb-2">Protokollierung</h4>
                <p className="text-purple-700">
                  Unterstützung bei der strukturierten Protokollierung von Sitzungen und Besprechungen.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-purple-800 mb-2">Dokumentenverwaltung</h4>
                <p className="text-purple-700">
                  Automatisierte Kategorisierung und Verwaltung von behördlichen Dokumenten.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-purple-800 mb-2">Antwortschreiben</h4>
                <p className="text-purple-700">
                  Unterstützung bei der Erstellung von standardisierten Antwortschreiben an Bürger.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Templates; 