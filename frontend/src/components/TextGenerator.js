import React, { useState, useRef } from 'react';
import { CheckCircle, Copy, Download, Loader2, RotateCcw, Shield, Brain, FileText, Sparkles, Zap, Mic, MicOff } from 'lucide-react';

// Die Komponente erwartet Props: onGenerate(prompt, context) und isGenerating
export default function TextGenerator({ prompt, setPrompt, onGenerate, isGenerating }) {
  const [context, setContext] = useState("");
  const [generatedText, setGeneratedText] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const textareaRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    try {
      const result = await onGenerate(prompt, context);
      setGeneratedText(result);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error("Generation failed:", error);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedText);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch {}
  };

  const handleExport = (format) => {
    const filename = `generated-text.${format}`;
    const blob = new Blob([generatedText], { type: format === "txt" ? "text/plain" : "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleKeyDown = (e) => {
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      handleGenerate();
    }
  };

  const resetForm = () => {
    setPrompt("");
    setContext("");
    setGeneratedText("");
  };

  const handleSpeechInput = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Spracheingabe wird von diesem Browser nicht unterstützt.');
      return;
    }
    let SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!recognitionRef.current) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'de-DE';
      recognitionRef.current.interimResults = false;
      recognitionRef.current.maxAlternatives = 1;
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setPrompt((prev) => prev ? prev + ' ' + transcript : transcript);
      };
      recognitionRef.current.onend = () => setIsRecording(false);
      recognitionRef.current.onerror = () => setIsRecording(false);
    }
    if (!isRecording) {
      setIsRecording(true);
      recognitionRef.current.start();
    } else {
      setIsRecording(false);
      recognitionRef.current.stop();
    }
  };

  return (
    <div style={{color: 'red', fontSize: 32}}>TEST_BUILD</div>
    <div className="space-y-6">
      <div className="space-y-6">
        <div className="bg-slate-800 border-2 border-slate-700 rounded-xl p-6 card-shadow">
          <label className="block text-white font-semibold text-lg mb-3">Anfrage</label>
          <div className="flex items-start space-x-3">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Geben Sie Ihre Anfrage hier ein... (Strg+Enter zum Generieren)"
              className="flex-1 h-32 p-4 bg-slate-900 border-2 border-slate-600 rounded-lg text-white placeholder-slate-400 resize-none focus:border-purple-500 focus:outline-none transition-colors font-mono"
            />
            <button
              onClick={handleSpeechInput}
              type="button"
              className={`w-12 h-12 flex items-center justify-center p-3 rounded-lg transition-colors border-4 border-red-500 ${isRecording ? 'bg-red-600' : 'bg-slate-700 hover:bg-purple-700'} text-white mt-1`}
              title={isRecording ? 'Spracheingabe läuft...' : 'Spracheingabe starten'}
              style={{ minWidth: 48, minHeight: 48 }}
            >
              TEST123
              {isRecording ? <MicOff className="w-5 h-5 animate-pulse" /> : <Mic className="w-5 h-5" />}
            </button>
          </div>
          <div className="flex justify-between items-center mt-3">
            <span className="text-slate-300 text-sm font-medium">{prompt.length} Zeichen</span>
            <span className="text-slate-400 text-xs bg-slate-700 px-2 py-1 rounded border border-slate-600">
              Strg+Enter zum Generieren
            </span>
          </div>
        </div>

        <div className="bg-slate-800 border-2 border-slate-700 rounded-xl p-6 card-shadow">
          <label className="block text-white font-semibold text-lg mb-3">Kontext (Optional)</label>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Zusätzliche Informationen oder Anweisungen..."
            className="w-full h-20 p-4 bg-slate-900 border-2 border-slate-600 rounded-lg text-white placeholder-slate-400 resize-none focus:border-purple-500 focus:outline-none transition-colors font-mono"
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={!prompt.trim() || isGenerating}
          className="w-full p-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold text-lg rounded-xl transition-all duration-200 flex items-center justify-center space-x-3 disabled:cursor-not-allowed border-2 border-purple-500 hover:border-purple-400 disabled:border-slate-600 card-shadow-lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Generiere...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-6 h-6" />
              <span>Text Generieren</span>
            </>
          )}
        </button>
        <button
          onClick={resetForm}
          className="w-full mt-2 p-4 border-2 border-gray-300 rounded-xl hover:bg-gray-50 flex items-center gap-3 font-semibold transition-all duration-200"
        >
          <RotateCcw className="w-5 h-5" />
          Zurücksetzen
        </button>
      </div>

      {generatedText && (
        <div className="bg-slate-800 border-2 border-slate-700 rounded-xl p-6 card-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold text-lg flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span>Generierter Text</span>
            </h3>
            <div className="flex items-center space-x-3">
              {showSuccess && (
                <div className="flex items-center space-x-2 text-green-400 bg-green-900/30 px-3 py-1 rounded-lg border border-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Erfolgreich!</span>
                </div>
              )}
              <button
                onClick={handleCopy}
                className="p-2.5 bg-slate-700 border-2 border-slate-600 rounded-lg hover:border-purple-500 hover:bg-slate-600 transition-all duration-200 focus-ring"
                title="In Zwischenablage kopieren"
              >
                <Copy className="w-4 h-4 text-slate-300" />
              </button>
              <button
                onClick={() => handleExport("txt")}
                className="p-2.5 bg-slate-700 border-2 border-slate-600 rounded-lg hover:border-purple-500 hover:bg-slate-600 transition-all duration-200 focus-ring"
                title="Als TXT herunterladen"
              >
                <Download className="w-4 h-4 text-slate-300" />
              </button>
            </div>
          </div>
          <div className="bg-slate-900 border-2 border-slate-600 rounded-lg p-4">
            <pre className="text-slate-200 whitespace-pre-wrap font-mono text-sm leading-relaxed">{generatedText}</pre>
          </div>
        </div>
      )}
    </div>
  );
} 