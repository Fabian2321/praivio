import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Cpu, Check, FileText, Search, Filter, Copy, Download, Loader2, CheckCircle, Sparkles, Settings, Info, Clock, Trash2, History, BarChart3, Zap, TrendingUp, Activity, User, Menu, X, Users, LogOut, MessageSquare, Edit3, Keyboard, AlertCircle, Star } from 'lucide-react';
import axios from 'axios';
import ChatInterface from './ChatInterface.js';

const formatNumber = (num) => {
  if (num === undefined || num === null || isNaN(num)) {
    return "0"
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M"
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K"
  }
  return num.toString()
}

const formatTime = (seconds) => {
  if (seconds === undefined || seconds === null || isNaN(seconds)) {
    return "0.0s"
  }
  return `${seconds.toFixed(1)}s`
}

const formatDate = (date) => {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    console.error('Failed to copy text: ', err)
    return false
  }
}

const downloadAsFile = (content, filename, type) => {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Definiere die statischen Templates oben im File:
const staticTemplates = {
  medical: {
    arztbericht: "Erstelle einen strukturierten Arztbericht basierend auf den folgenden Informationen:",
    befund: "Formuliere einen medizinischen Befund für:",
    anamnese: "Erstelle eine strukturierte Anamnese für:",
    entlassungsbrief: "Verfasse einen Entlassungsbrief für:"
  },
  legal: {
    gutachten: "Erstelle ein juristisches Kurzgutachten zu folgender Fragestellung:",
    widerspruch: "Formuliere einen Widerspruch gegen einen Bescheid:"
  },
  government: {
    protokoll: "Erstelle ein Sitzungsprotokoll für eine Behörde:",
    bescheid: "Formuliere einen Behördenbescheid zum folgenden Sachverhalt:"
  }
};

function ModelSelector({ selectedModel, onModelSelect, models }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="space-y-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 bg-slate-800 border-2 border-slate-700 hover:border-purple-500 hover:bg-slate-750 rounded-xl transition-all duration-200 flex items-center justify-between card-shadow focus-ring"
      >
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-semibold">Modell</span>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-slate-400 transform transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
        />
      </button>

      {isExpanded && (
        <div className="bg-slate-800 border-2 border-slate-700 rounded-xl p-6 space-y-4 card-shadow">
          {models.length === 0 ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 mx-auto mb-3 text-slate-500 animate-spin" />
              <p className="text-slate-400 font-medium">Lade Modelle...</p>
            </div>
          ) : (
            models.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  onModelSelect(model)
                  setIsExpanded(false)
                }}
                className={`w-full p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                  selectedModel.id === model.id
                    ? "bg-purple-900/30 border-purple-500 text-purple-200"
                    : "bg-slate-700 border-slate-600 text-slate-200 hover:border-purple-500 hover:bg-slate-600"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg">{model.name}</h3>
                  <div className="flex items-center space-x-2">
                    <Check
                      className={`w-4 h-4 ${
                        selectedModel.id === model.id ? "text-purple-400" : "text-transparent"
                      }`}
                    />
                  </div>
                </div>
                <p className="text-sm text-slate-300 mb-2">{model.description}</p>
                <div className="grid grid-cols-3 items-center text-xs">
                  <span className="text-slate-400 justify-self-start">{model.size}</span>
                  <span className="justify-self-center text-xs bg-slate-600 px-2 py-1 rounded border border-slate-500">{model.parameters}</span>
                  <span className="text-slate-400 justify-self-end">{model.provider}</span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function TemplateSystem({ onTemplateSelect, templates }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getCategoryColor = (category) => {
    switch (category) {
      case 'medical': return 'from-green-500 to-emerald-500'
      case 'legal': return 'from-blue-500 to-cyan-500'
      case 'government': return 'from-orange-500 to-red-500'
      default: return 'from-purple-500 to-blue-500'
    }
  }

  const getCategoryBadgeColor = (category) => {
    switch (category) {
      case 'medical': return 'bg-green-900/30 border-green-600 text-green-300'
      case 'legal': return 'bg-blue-900/30 border-blue-600 text-blue-300'
      case 'government': return 'bg-orange-900/30 border-orange-600 text-orange-300'
      default: return 'bg-purple-900/30 border-purple-600 text-purple-300'
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 bg-slate-800 border-2 border-slate-700 hover:border-purple-500 hover:bg-slate-750 rounded-xl transition-all duration-200 flex items-center justify-between card-shadow focus-ring"
      >
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-semibold">Vorlagen</span>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-slate-400 transform transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
        />
      </button>

      {isExpanded && (
        <div className="bg-slate-800 border-2 border-slate-700 rounded-xl p-6 space-y-6 card-shadow">
          {Object.entries(templates).map(([category, categoryTemplates]) => (
            <div key={category} className="space-y-3">
              <h3 className="text-white font-semibold capitalize">{category}</h3>
              <div className="grid grid-cols-1 gap-3">
                {Object.entries(categoryTemplates).map(([templateId, description]) => (
                  <button
                    key={templateId}
                    onClick={() => {
                      onTemplateSelect({ id: templateId, prompt: description, category })
                      setIsExpanded(false)
                    }}
                    className="p-3 bg-slate-700 border-2 border-slate-600 rounded-lg hover:border-purple-500 hover:bg-slate-600 transition-all duration-200 text-left"
                  >
                    <span className={`text-xs px-2 py-1 rounded border block text-left mb-2 ${getCategoryBadgeColor(category)}`}>{category}</span>
                    <span className="text-slate-200 font-medium capitalize block mb-1">{templateId}</span>
                    <p className="text-slate-300 text-sm mt-1">{description}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TextGenerator({ prompt, setPrompt, onGenerate, isGenerating, generatedText }) {
  const [context, setContext] = useState("")
  const [streamingText, setStreamingText] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportMenuRef = useRef(null)

  // Click-away handler für das Export-Menü
  useEffect(() => {
    function handleClickOutside(event) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setErrorMessage("Bitte geben Sie einen Prompt ein.")
      setShowError(true)
      setTimeout(() => setShowError(false), 3000)
      return
    }

    setStreamingText("")
    setShowError(false)
    setShowSuccess(false)

    try {
      const result = await onGenerate(prompt, context, (chunk) => {
        setStreamingText(chunk)
      })
      
      if (result) {
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 3000)
      }
    } catch (error) {
      console.error("Generation error:", error)
      setErrorMessage(error.message || "Ein Fehler ist aufgetreten.")
      setShowError(true)
      setTimeout(() => setShowError(false), 3000)
    }
  }

  const handleCopy = async () => {
    const textToCopy = generatedText || streamingText
    if (textToCopy) {
      try {
        await navigator.clipboard.writeText(textToCopy)
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 2000)
      } catch (err) {
        console.error('Failed to copy: ', err)
      }
    }
  }

  const handleExport = (format) => {
    const textToExport = generatedText || streamingText
    if (textToExport) {
      downloadAsFile(textToExport, `generated-text.${format}`, format)
    }
    setShowExportMenu(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleGenerate()
    }
  }

  // Display the final generated text or streaming text
  const displayText = generatedText || streamingText

  return (
    <div className="space-y-6">
      {/* Prompt Input */}
      <div className="bg-slate-800 border-2 border-slate-700 rounded-xl p-6 card-shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white flex items-center space-x-2">
            <Edit3 className="w-5 h-5 text-purple-400" />
            <span>Prompt</span>
          </h3>
          <div className="flex items-center space-x-2 text-slate-400 text-sm">
            <Keyboard className="w-4 h-4" />
            <span>⌘+Enter zum Generieren</span>
          </div>
        </div>
        
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Beschreiben Sie, was Sie generieren möchten..."
          className="w-full h-32 bg-slate-900 border-2 border-slate-600 rounded-lg p-4 text-white placeholder-slate-400 resize-none focus:border-purple-500 focus:outline-none transition-colors"
        />
        
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                isGenerating || !prompt.trim()
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:scale-105'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generiere...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generieren</span>
                </>
              )}
            </button>
            
            {showSuccess && (
              <div className="flex items-center space-x-2 text-green-400">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Erfolgreich!</span>
              </div>
            )}
            
            {showError && (
              <div className="flex items-center space-x-2 text-red-400">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">{errorMessage}</span>
              </div>
            )}
          </div>
          
          <div className="text-slate-400 text-sm">
            {prompt.length} Zeichen
          </div>
        </div>
      </div>

      {/* Context Input */}
      <div className="bg-slate-800 border-2 border-slate-700 rounded-xl p-6 card-shadow">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
          <FileText className="w-5 h-5 text-blue-400" />
          <span>Kontext (Optional)</span>
        </h3>
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Zusätzlicher Kontext für bessere Ergebnisse..."
          className="w-full h-24 bg-slate-900 border-2 border-slate-600 rounded-lg p-4 text-white placeholder-slate-400 resize-none focus:border-blue-500 focus:outline-none transition-colors"
        />
      </div>

      {/* Generated Text Output */}
      {displayText && (
        <div className="bg-slate-800 border-2 border-slate-700 rounded-xl p-6 card-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white flex items-center space-x-2">
              <Star className="w-5 h-5 text-green-400" />
              <span>Generierter Text</span>
              {isGenerating && (
                <div className="flex items-center space-x-2 text-yellow-400 text-sm">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Streaming...</span>
                </div>
              )}
            </h3>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopy}
                className="flex items-center space-x-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                <Copy className="w-4 h-4" />
                <span>Kopieren</span>
              </button>
              
              <div className="relative" ref={exportMenuRef}>
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="flex items-center space-x-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                
                {showExportMenu && (
                  <div className="absolute right-0 top-12 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
                    <button
                      onClick={() => handleExport('txt')}
                      className="w-full flex items-center px-4 py-3 text-left text-slate-200 hover:bg-slate-700 transition-colors"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Als TXT exportieren
                    </button>
                    <button
                      onClick={() => handleExport('md')}
                      className="w-full flex items-center px-4 py-3 text-left text-slate-200 hover:bg-slate-700 transition-colors"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Als Markdown exportieren
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-slate-900 border-2 border-slate-600 rounded-lg p-4">
            <pre className="text-white whitespace-pre-wrap font-sans text-sm leading-relaxed">
              {displayText}
            </pre>
          </div>
          
          <div className="flex items-center justify-between mt-4 text-slate-400 text-sm">
            <span>{displayText.length} Zeichen generiert</span>
            <span>{displayText.split(' ').length} Wörter</span>
          </div>
        </div>
      )}
    </div>
  )
}

function SettingsPanel({ settings, onSettingsChange }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleSettingChange = (key, value) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    })
  }

  const SettingSlider = ({
    label,
    value,
    min,
    max,
    step,
    onChange,
    description,
  }) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <label className="text-white text-sm font-semibold">{label}</label>
          <div className="group relative">
            <Info className="w-4 h-4 text-slate-400 cursor-help hover:text-purple-400 transition-colors" />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 border border-slate-600 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 card-shadow">
              {description}
            </div>
          </div>
        </div>
        <span className="text-purple-300 text-sm font-bold bg-slate-700 px-2 py-1 rounded border border-slate-600">
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number.parseFloat(e.target.value))}
        className="w-full h-3 slider cursor-pointer"
      />
    </div>
  )

  return (
    <div className="space-y-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 bg-slate-800 border-2 border-slate-700 hover:border-purple-500 hover:bg-slate-750 rounded-xl transition-all duration-200 flex items-center justify-between card-shadow focus-ring"
      >
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-semibold">Einstellungen</span>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-slate-400 transform transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
        />
      </button>

      {isExpanded && (
        <div className="bg-slate-800 border-2 border-slate-700 rounded-xl p-6 space-y-6 card-shadow">
          <SettingSlider
            label="Temperatur"
            value={settings.temperature}
            min={0}
            max={2}
            step={0.1}
            onChange={(value) => handleSettingChange('temperature', value)}
            description="Kreativität der Antworten (0 = konservativ, 2 = sehr kreativ)"
          />
          <SettingSlider
            label="Max Tokens"
            value={settings.maxTokens}
            min={10}
            max={4000}
            step={10}
            onChange={(value) => handleSettingChange('maxTokens', value)}
            description="Maximale Anzahl der generierten Tokens"
          />
          <SettingSlider
            label="Top P"
            value={settings.topP}
            min={0}
            max={1}
            step={0.05}
            onChange={(value) => handleSettingChange('topP', value)}
            description="Nukleus-Sampling für bessere Textqualität"
          />
          <SettingSlider
            label="Frequency Penalty"
            value={settings.frequencyPenalty}
            min={0}
            max={2}
            step={0.1}
            onChange={(value) => handleSettingChange('frequencyPenalty', value)}
            description="Reduziert Wiederholungen im Text"
          />
          <SettingSlider
            label="Presence Penalty"
            value={settings.presencePenalty}
            min={0}
            max={2}
            step={0.1}
            onChange={(value) => handleSettingChange('presencePenalty', value)}
            description="Ermutigt zu neuen Themen"
          />
        </div>
      )}
    </div>
  )
}

function HistoryPanel({ generations, onGenerationSelect, onGenerationDelete }) {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredGenerations = generations.filter(
    (gen) =>
      gen.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gen.result.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleCopy = async (text, e) => {
    e.stopPropagation()
    await copyToClipboard(text)
  }

  const handleDelete = (id, e) => {
    e.stopPropagation()
    onGenerationDelete(id)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
          <History className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-white font-semibold text-lg">Generierungsverlauf</h2>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Verlauf durchsuchen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-slate-800 border-2 border-slate-700 rounded-lg text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none transition-colors card-shadow"
        />
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredGenerations.length === 0 ? (
          <div className="text-center py-8 bg-slate-800 border-2 border-slate-700 rounded-xl card-shadow">
            <Clock className="w-8 h-8 mx-auto mb-3 text-slate-500" />
            <p className="text-slate-400 font-medium">Keine Generierungen gefunden</p>
          </div>
        ) : (
          filteredGenerations.map((generation) => (
            <div
              key={generation.id}
              onClick={() => onGenerationSelect(generation)}
              className="p-4 bg-slate-800 border-2 border-slate-700 hover:border-purple-500 hover:bg-slate-750 rounded-xl transition-all duration-200 cursor-pointer group card-shadow"
            >
              <div className="flex items-start justify-between mb-3 w-full">
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-xs text-purple-300 bg-purple-900/30 px-2 py-1 rounded border border-purple-600 font-medium w-fit mb-1">{generation.model}</span>
                  <span className="text-xs text-slate-300 font-medium mb-1">{formatDate(generation.timestamp)}</span>
                </div>
                <div className="flex items-center space-x-1 ml-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCopy(generation.result, e); }}
                    className="p-2 hover:bg-slate-600 rounded-lg border border-slate-600 hover:border-purple-500 transition-colors"
                    title="Ergebnis kopieren"
                  >
                    <Copy className="w-4 h-4 text-slate-300" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(generation.id, e)}
                    className="p-2 hover:bg-red-600/20 rounded-lg border border-slate-600 hover:border-red-500 transition-colors"
                    title="Löschen"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
              <p className="text-white text-sm font-semibold line-clamp-2 mb-2">{generation.prompt}</p>
              <div className="bg-slate-900 border border-slate-600 rounded-lg p-3 mb-3">
                <p className="text-slate-300 text-xs line-clamp-2 font-mono">{generation.result}</p>
                {generation.isStreaming && (
                  <div className="flex items-center space-x-2 mt-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-purple-400 font-medium">Generiere...</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-blue-300 bg-blue-900/30 px-2 py-1 rounded border border-blue-600 font-medium">
                  {generation.tokens || 0} tokens
                </span>
                <span className="text-green-300 bg-green-900/30 px-2 py-1 rounded border border-green-600 font-medium">
                  {formatTime(generation.processingTime)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function Statistics({ statistics }) {
  console.log("📊 Statistics component received:", statistics);
  
  const stats = [
    {
      label: "Gesamte Generierungen",
      value: formatNumber(statistics.totalGenerations),
      icon: BarChart3,
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-900/30",
      borderColor: "border-blue-600",
      textColor: "text-blue-300",
    },
    {
      label: "Verwendete Tokens",
      value: formatNumber(statistics.tokensUsed),
      icon: Zap,
      color: "from-purple-500 to-pink-500",
      bgColor: "bg-purple-900/30",
      borderColor: "border-purple-600",
      textColor: "text-purple-300",
    },
    {
      label: "Durchschn. Verarbeitungszeit",
      value: formatTime(statistics.averageProcessingTime),
      icon: Clock,
      color: "from-green-500 to-emerald-500",
      bgColor: "bg-green-900/30",
      borderColor: "border-green-600",
      textColor: "text-green-300",
    },
    {
      label: "Erfolgsrate",
      value: `${statistics.successRate}%`,
      icon: TrendingUp,
      color: "from-orange-500 to-red-500",
      bgColor: "bg-orange-900/30",
      borderColor: "border-orange-600",
      textColor: "text-orange-300",
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-white font-semibold text-lg">Statistiken</h2>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`p-4 bg-slate-800 border-2 border-slate-700 hover:border-purple-500 rounded-xl transition-all duration-200 card-shadow`}
          >
            <div className="flex items-center space-x-3">
              <div className={`p-3 bg-gradient-to-br ${stat.color} rounded-lg shadow-lg`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-xl">{stat.value}</p>
                <p className="text-slate-300 text-sm font-medium">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-800 border-2 border-slate-700 rounded-xl p-6 card-shadow">
        <h3 className="text-white font-semibold mb-4 flex items-center space-x-2">
          <TrendingUp className="w-5 h-5 text-purple-400" />
          <span>Nutzungstrend</span>
        </h3>
        <div className="h-24 bg-slate-900 border-2 border-slate-600 rounded-lg flex items-end justify-between p-3">
          {[40, 65, 45, 80, 60, 90, 75].map((height, index) => (
            <div
              key={index}
              className="bg-gradient-to-t from-purple-500 to-blue-500 rounded-sm w-6 transition-all duration-300 hover:opacity-80 border border-purple-400"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-400 font-medium">
          <span>Mo</span>
          <span>Di</span>
          <span>Mi</span>
          <span>Do</span>
          <span>Fr</span>
          <span>Sa</span>
          <span>So</span>
        </div>
      </div>
    </div>
  )
}

export default function AITextPlatform({ user, onLogout }) {
  const [selectedModel, setSelectedModel] = useState({
    id: "tinyllama",
    name: "tinyllama",
    size: "608.2 MB",
    parameters: "1B",
    description: "Schnell für einfache Aufgaben",
    provider: "Ollama",
    status: "available"
  })
  const [models, setModels] = useState([])
  const [templates, setTemplates] = useState({})
  const [generations, setGenerations] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [settings, setSettings] = useState({
    temperature: 0.7,
    maxTokens: 1000,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
  })
  const [activePage, setActivePage] = useState('dashboard');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [statistics, setStatistics] = useState({
    totalGenerations: 0,
    tokensUsed: 0,
    averageProcessingTime: 0,
    successRate: 98.5,
  });
  const userMenuRef = useRef(null);
  const [prompt, setPrompt] = useState("");
  const [chatMode, setChatMode] = useState(false);
  const [generatedText, setGeneratedText] = useState("");

  // Click-away handler für das User-Menü
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Update statistics when generations change
  useEffect(() => {
    if (generations.length > 0) {
      const completedGenerations = generations.filter(gen => !gen.isStreaming);
      const totalGenerations = completedGenerations.length;
      const totalTokens = completedGenerations.reduce((sum, gen) => sum + (gen.tokens || 0), 0);
      const totalProcessingTime = completedGenerations.reduce((sum, gen) => sum + (gen.processingTime || 0), 0);
      const averageProcessingTime = totalGenerations > 0 ? totalProcessingTime / totalGenerations : 0;
      
      setStatistics({
        totalGenerations,
        tokensUsed: totalTokens,
        averageProcessingTime,
        successRate: 98.5, // Keep this static for now
      });
    }
  }, [generations]);

  // Fetch models and templates on component mount
  useEffect(() => {
    fetchModels();
    fetchTemplates();
  }, []);

  // Safety check for user object
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Lade Benutzerdaten...</p>
        </div>
      </div>
    );
  }

  const fetchModels = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/models`);
      const modelsData = response.data.map((model) => ({
        id: model.name,
        name: model.name,
        size: model.size,
        parameters: model.parameters,
        description: `${model.parameters} Parameter Modell`,
        provider: "Ollama",
        status: model.status
      }));
      setModels(modelsData);
      if (modelsData.length > 0) {
        setSelectedModel(modelsData[0]);
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

  const handleTemplateSelect = (template) => {
    setPrompt(template.prompt);
  };

  const handleGenerationSelect = (generation) => {
    console.log("Generation selected:", generation)
  }

  const handleGenerationDelete = (id) => {
    setGenerations((prev) => prev.filter((gen) => gen.id !== id))
  }

  const handleGenerate = async (prompt, context, onStreamChunk) => {
    console.log("🚀 AITextPlatform handleGenerate called with:", { prompt, context, hasCallback: !!onStreamChunk });
    setIsGenerating(true)
    setGeneratedText(""); // Reset generated text

    try {
      // Use streaming endpoint
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/generate/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          model: selectedModel.name,
          max_tokens: settings.maxTokens,
          temperature: settings.temperature,
          template: null,
          context
        })
      });

      console.log("📡 Response status:", response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let tokensUsed = 0;
      let processingTime = 0;
      let generationId = null;
      let chunkCount = 0;

      // Create a temporary generation for streaming
      const tempGenerationId = Date.now().toString();
      const tempGeneration = {
        id: tempGenerationId,
        prompt,
        result: '',
        model: selectedModel.name,
        timestamp: new Date(),
        tokens: 0,
        processingTime: 0,
        isStreaming: true
      };

      setGenerations((prev) => [tempGeneration, ...prev]);

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          const chunk = decoder.decode(value);
          console.log("📦 Raw chunk received:", chunk);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                console.log("🟢 FULL DATA OBJECT:", data);
                if (data.done === true) {
                  console.log("🟢 DATA.DONE erkannt!", data);
                }
                console.log("📝 Parsed data:", data);
                
                if (data.response) {
                  chunkCount++;
                  fullText += data.response;
                  console.log(`📝 Chunk ${chunkCount}: "${data.response}" -> Full text: "${fullText}"`);
                  
                  // Update the generation in real-time
                  setGenerations((prev) => 
                    prev.map(gen => 
                      gen.id === tempGenerationId 
                        ? { ...gen, result: fullText }
                        : gen
                    )
                  );
                  
                  // Update generated text state
                  setGeneratedText(fullText);
                  
                  // Call the streaming callback for live output
                  if (onStreamChunk) {
                    console.log("🔄 Calling onStreamChunk with:", fullText);
                    onStreamChunk(fullText);
                  } else {
                    console.log("⚠️ No onStreamChunk callback provided!");
                  }
                }
                
                // Robuste done-Erkennung
                if (data.done === true) {
                  console.log("🟢 DATA.DONE erkannt!", data);
                  
                  // Extract token count from tokens_used (Backend format)
                  tokensUsed = data.tokens_used || data.eval_count || 0;
                  
                  // Extract processing time from processing_time (Backend format)
                  processingTime = data.processing_time || 0;
                  
                  generationId = data.generation_id;
                  
                  console.log("📊 Extracted data:", { tokensUsed, processingTime, generationId });
                  
                  // Update final generation
                  setGenerations((prev) => {
                    console.log("🔄 Updating final generation with tokens:", tokensUsed, "processingTime:", processingTime);
                    const updated = prev.map(gen =>
                      gen.id === tempGenerationId
                        ? {
                            ...gen,
                            result: fullText,
                            tokens: tokensUsed,
                            processingTime: processingTime,
                            isStreaming: false
                          }
                        : gen
                    );
                    // Erzwinge neues Array-Objekt
                    const newArray = [...updated];
                    console.log("📝 New generations array:", newArray);
                    return newArray;
                  });
                  
                  // Ensure generated text is saved
                  setGeneratedText(fullText);
                  
                  setIsGenerating(false);
                  return fullText;
                }
                
                if (data.error) {
                  console.error("❌ Error from server:", data.error);
                  throw new Error(data.error);
                }
              } catch (parseError) {
                console.warn('Failed to parse SSE data:', parseError, 'Line:', line);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      setIsGenerating(false);
      return fullText;
    } catch (error) {
      console.error("Generation failed:", error);
      setIsGenerating(false);
      throw error;
    }
  }

  return (
    <div className="flex min-h-screen">
      <main className="flex-1 bg-slate-950 p-6">
        <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-sm border-b-2 border-slate-700">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl shadow-lg">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Praivio</h1>
                <p className="text-slate-300 text-sm font-medium">Sichere, lokale KI-Plattform</p>
              </div>
            </div>

            {/* Modus-Umschaltung zentriert */}
            <div className="flex-1 flex justify-center">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setChatMode(false)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    !chatMode
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <Sparkles className="w-4 h-4 inline mr-2" />
                  Einzelanfrage
                </button>
                <button
                  onClick={() => setChatMode(true)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    chatMode
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 inline mr-2" />
                  Chat
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-4 relative ml-4">
              <button
                className="lg:hidden p-3 bg-slate-800 border-2 border-slate-700 rounded-lg hover:border-purple-500 transition-colors card-shadow"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu className="w-5 h-5 text-white" />
              </button>
              <button
                ref={userMenuRef}
                type="button"
                className="hidden lg:flex items-center space-x-3 p-3 bg-slate-800 border-2 border-slate-700 rounded-xl card-shadow cursor-pointer relative select-none"
                style={{ cursor: 'pointer', zIndex: 50 }}
                onClick={() => setShowUserMenu((v) => !v)}
                aria-haspopup="true"
                aria-expanded={showUserMenu}
                tabIndex={0}
              >
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{user?.username || 'Praivio Benutzer'}</p>
                  <div className="flex items-center space-x-1">
                    <Zap className="w-3 h-3 text-yellow-400" />
                    <p className="text-yellow-300 text-xs font-medium">Lokale Installation</p>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 ml-2" />
              </button>
              {showUserMenu && (
                <div
                  className="absolute right-0 top-14 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50"
                  style={{ zIndex: 1000 }}
                >
                  <div className="p-4 border-b border-slate-700">
                    <p className="text-white font-semibold">{user?.username || 'Praivio Benutzer'}</p>
                    <p className="text-slate-400 text-xs">{user?.role_name || 'Benutzer'}</p>
                  </div>
                  {user?.role_name === 'admin' && (
                    <button
                      className="w-full flex items-center px-4 py-3 text-left text-slate-200 hover:bg-slate-700 transition-colors"
                      onClick={() => {
                        setActivePage('users');
                        setShowUserMenu(false);
                      }}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Benutzerverwaltung
                    </button>
                  )}
                  <button
                    className="w-full flex items-center px-4 py-3 text-left text-slate-200 hover:bg-slate-700 transition-colors"
                    onClick={() => {
                      setShowUserMenu(false);
                      localStorage.removeItem('praivio_token');
                      localStorage.removeItem('praivio_user');
                      delete axios.defaults.headers.common['Authorization'];
                      window.location.href = '/login';
                    }}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Abmelden
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex h-[calc(100vh-88px)]">
          {/* Linke Sidebar: Modell, Vorlagen, Einstellungen */}
          <aside className="hidden xl:block w-80 bg-slate-900/95 border-r-2 border-slate-700 p-6 space-y-6 overflow-y-auto rounded-none shadow-none">
            <ModelSelector selectedModel={selectedModel} onModelSelect={setSelectedModel} models={models} />
            <TemplateSystem onTemplateSelect={handleTemplateSelect} templates={staticTemplates} />
            <SettingsPanel settings={settings} onSettingsChange={setSettings} />
          </aside>

          {/* Hauptbereich */}
          {chatMode ? (
            /* Chat-Modus */
            <div className="flex-1">
              <ChatInterface 
                selectedModel={selectedModel}
                onBackToGenerator={() => setChatMode(false)}
              />
            </div>
          ) : (
            /* Einzelanfrage-Modus */
          <main className="flex-1 p-6 overflow-y-auto bg-slate-800/30">
            <div className="max-w-4xl mx-auto">
              <div className="mb-8 bg-slate-800 border-2 border-slate-700 rounded-xl p-6 card-shadow">
                <h2 className="text-3xl font-bold text-white mb-2 flex items-center space-x-3">
                  <Sparkles className="w-8 h-8 text-purple-400" />
                  <span>Text Generieren</span>
                </h2>
                <p className="text-slate-300 font-medium">Erstellen Sie professionelle Inhalte mit KI-gestützter Textgenerierung</p>
              </div>

              <TextGenerator
                prompt={prompt}
                setPrompt={setPrompt}
                onGenerate={(prompt, context, onStreamChunk) => handleGenerate(prompt, context, onStreamChunk)}
                isGenerating={isGenerating}
                generatedText={generatedText}
              />
            </div>
          </main>
          )}

          {/* Rechte Sidebar bleibt erhalten */}
          <aside className="hidden xl:block w-80 bg-slate-900/95 border-l-2 border-slate-700 p-6 space-y-6 overflow-y-auto rounded-none shadow-none">
            <HistoryPanel
              generations={generations}
              onGenerationSelect={handleGenerationSelect}
              onGenerationDelete={handleGenerationDelete}
            />

            {console.log("🎯 Passing statistics to component:", statistics)}
            <Statistics statistics={statistics} />
          </aside>
        </div>

        {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
        )}
      </main>
    </div>
  )
} 