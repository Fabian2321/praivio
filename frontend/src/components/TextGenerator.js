import React, { useState, useEffect } from 'react';
import { Send, Download, Copy, RotateCcw, Shield, Brain, FileText, Sparkles, Zap } from 'lucide-react';
import axios from 'axios';

const TextGenerator = () => {
  const [prompt, setPrompt] = useState('');
  const [context, setContext] = useState('');
  const [generatedText, setGeneratedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('tinyllama');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [models, setModels] = useState([]);
  const [templates, setTemplates] = useState({});
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1000);

  useEffect(() => {
    fetchModels();
    fetchTemplates();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/models`);
      setModels(response.data);
      if (response.data.length > 0) {
        setSelectedModel(response.data[0].name);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/templates`);
      setTemplates(response.data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const generateText = async () => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/generate`, {
        prompt,
        model: selectedModel,
        max_tokens: maxTokens,
        temperature,
        template: selectedTemplate,
        context
      }, {
        headers: {
          'Authorization': 'Bearer demo-token'
        }
      });

      setGeneratedText(response.data.generated_text);
    } catch (error) {
      console.error('Error generating text:', error);
      alert('Fehler bei der Textgenerierung. Bitte versuchen Sie es erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedText);
  };

  const downloadText = () => {
    const blob = new Blob([generatedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `generated-text-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setPrompt('');
    setContext('');
    setGeneratedText('');
    setSelectedTemplate('');
  };

  return (
    <div className="max-w-7xl mx-auto fade-in">
      {/* Header Section */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Praivio
          </h1>
        </div>
        <p className="text-lg text-white/90 flex items-center justify-center gap-2">
          <Shield className="w-5 h-5 text-green-400" />
          100% lokal verarbeitet - Ihre Daten bleiben sicher
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-6">
          <div className="modern-card p-8">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3 text-gray-800">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-blue-600" />
              </div>
              Eingabe
            </h2>

            {/* Model Selection */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                KI-Modell
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="modern-input w-full"
              >
                {(Array.isArray(models) ? models : []).map((model) => (
                  <option key={model.name} value={model.name}>
                    {model.name} ({model.parameters}) - {model.size}
                  </option>
                ))}
              </select>
            </div>

            {/* Template Selection */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Vorlage (optional)
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="modern-input w-full"
              >
                <option value="">Keine Vorlage</option>
                {templates && typeof templates === 'object' && Object.entries(templates).map(([category, categoryTemplates]) => (
                  <optgroup key={category} label={category.charAt(0).toUpperCase() + category.slice(1)}>
                    {categoryTemplates && typeof categoryTemplates === 'object' && Object.entries(categoryTemplates).map(([key, template]) => (
                      <option key={key} value={template}>
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Context Input */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Kontext (optional)
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Zusätzliche Informationen oder Kontext..."
                className="modern-input w-full resize-none"
                rows={3}
              />
            </div>

            {/* Prompt Input */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Anfrage *
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Beschreiben Sie, was Sie generieren möchten..."
                className="modern-input w-full resize-none"
                rows={4}
                required
              />
            </div>

            {/* Parameters */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Temperatur: {temperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Max. Tokens: {maxTokens}
                </label>
                <input
                  type="range"
                  min="100"
                  max="2000"
                  step="100"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={generateText}
                disabled={isLoading || !prompt.trim()}
                className="btn-gradient flex-1 px-6 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {isLoading ? (
                  <>
                    <div className="loading-spinner"></div>
                    Generiere...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Generieren
                  </>
                )}
              </button>
              <button
                onClick={resetForm}
                className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 flex items-center gap-3 font-semibold transition-all duration-200"
              >
                <RotateCcw className="w-5 h-5" />
                Zurücksetzen
              </button>
            </div>
          </div>
        </div>

        {/* Output Section */}
        <div className="space-y-6">
          <div className="modern-card p-8">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3 text-gray-800">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
              Generierter Text
            </h2>

            {generatedText ? (
              <>
                <div className="bg-gray-50 rounded-xl p-6 mb-6 border border-gray-200">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
                    {generatedText}
                  </pre>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={copyToClipboard}
                    className="btn-gradient flex-1 px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-3"
                  >
                    <Copy className="w-5 h-5" />
                    Kopieren
                  </button>
                  <button
                    onClick={downloadText}
                    className="btn-gradient flex-1 px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-3"
                  >
                    <Download className="w-5 h-5" />
                    Herunterladen
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-16 text-gray-500">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-lg font-medium mb-2">Bereit für die Generierung</p>
                <p className="text-sm">Geben Sie eine Anfrage ein und klicken Sie auf "Generieren"</p>
              </div>
            )}
          </div>

          {/* Security Info */}
          <div className="modern-card p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-green-800 text-lg mb-2">Datensicherheit</h3>
                <p className="text-green-700 leading-relaxed">
                  Alle Daten werden lokal verarbeitet und verlassen niemals Ihr System. 
                  Keine Cloud-Anbindung erforderlich. Ihre Privatsphäre steht an erster Stelle.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextGenerator; 