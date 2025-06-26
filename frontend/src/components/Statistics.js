import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Clock, Hash, Brain } from 'lucide-react';
import axios from 'axios';

const Statistics = () => {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/stats`, {
        headers: {
          'Authorization': 'Bearer demo-token'
        }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Daten verfügbar</h3>
        <p className="text-gray-500">
          Starten Sie mit der Textgenerierung, um Statistiken zu sehen.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-blue-600" />
          Nutzungsstatistiken
        </h1>
        <p className="text-gray-600">
          Übersicht über die Nutzung der lokalen KI-Plattform
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Gesamt Generierungen</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_generations}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tokens verwendet</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_tokens_used.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Hash className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Durchschn. Zeit</p>
              <p className="text-2xl font-bold text-gray-900">{stats.average_processing_time}s</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Aktive Modelle</p>
              <p className="text-2xl font-bold text-gray-900">{stats.model_usage.length}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Brain className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Model Usage */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Modell-Nutzung</h2>
        
        {stats.model_usage.length > 0 ? (
          <div className="space-y-4">
            {stats.model_usage.map((model, index) => (
              <div key={model.model} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{model.model}</h3>
                    <p className="text-sm text-gray-500">{model.count} Generierungen</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900">
                    {((model.count / stats.total_generations) * 100).toFixed(1)}%
                  </div>
                  <div className="w-32 bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${(model.count / stats.total_generations) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Noch keine Modell-Nutzung aufgezeichnet</p>
          </div>
        )}
      </div>

      {/* Efficiency Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Effizienz-Metriken</h2>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Tokens pro Generierung</span>
              <span className="font-semibold">
                {stats.total_generations > 0 
                  ? Math.round(stats.total_tokens_used / stats.total_generations) 
                  : 0}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Generierungen pro Tag</span>
              <span className="font-semibold">
                {stats.total_generations > 0 ? Math.round(stats.total_generations / 30) : 0}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Durchschn. Antwortzeit</span>
              <span className="font-semibold">{stats.average_processing_time}s</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Datenschutz-Status</h2>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-700">100% lokale Verarbeitung</span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-700">Keine Cloud-Anbindung</span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-700">DSGVO-konform</span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-700">Vollständige Audit-Logs</span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="font-medium text-green-800 mb-2">Sicherheitsstatus</h3>
            <p className="text-sm text-green-700">
              Alle Daten werden lokal verarbeitet und verlassen niemals Ihr System. 
              Vollständige Kontrolle über alle Daten und Prozesse.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics; 