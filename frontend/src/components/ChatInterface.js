import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, MessageSquare, User, Bot, Edit3, Trash2, Plus, ArrowLeft, Settings, Mic, MicOff } from 'lucide-react';
import axios from 'axios';

export default function ChatInterface({ selectedModel, onBackToGenerator }) {
  const [chatSessions, setChatSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [showNewChatForm, setShowNewChatForm] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const [showSystemPromptModal, setShowSystemPromptModal] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // State für Spracheingabe
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);

  // Default System Prompt (lang und detailliert)
  const DEFAULT_SYSTEM_PROMPT = `Du bist ein professioneller KI-Assistent für Praivio, eine sichere, lokale KI-Plattform für datensensible Institutionen.

Deine Hauptaufgaben:
- Beantworte Fragen sachlich, präzise und hilfreich
- Verwende immer die deutsche Sprache
- Gib strukturierte und gut formatierte Antworten
- Berücksichtige den Kontext der gesamten Konversation
- Sei besonders hilfreich bei medizinischen, rechtlichen und behördlichen Themen
- Verwende eine professionelle, aber zugängliche Sprache
- Gib bei Unsicherheiten ehrliche Antworten und schlage Nachfragen vor

Wichtige Richtlinien:
- Antworte immer respektvoll und professionell
- Verwende bei Bedarf Aufzählungen und Strukturen für bessere Lesbarkeit
- Gib praktische und umsetzbare Ratschläge
- Berücksichtige Datenschutz und Sicherheitsaspekte
- Sei hilfreich bei der Erstellung von Dokumenten und Berichten

Kontext: Du arbeitest in einer sicheren, lokalen Umgebung für vertrauenswürdige Institutionen.`;

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Load chat sessions on component mount
  useEffect(() => {
    loadChatSessions();
  }, []);

  const loadChatSessions = async () => {
    try {
      setIsLoadingSessions(true);
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/chat/sessions`);
      setChatSessions(response.data);
    } catch (error) {
      console.error('Error loading chat sessions:', error);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const createNewChat = async () => {
    if (!newChatTitle.trim()) return;
    
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/chat/sessions`, {
        title: newChatTitle,
        model: selectedModel.name,
        system_prompt: DEFAULT_SYSTEM_PROMPT
      });
      
      const newSession = response.data;
      setChatSessions([newSession, ...chatSessions]);
      setCurrentSession(newSession);
      setMessages([]);
      setNewChatTitle('');
      setShowNewChatForm(false);
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  };

  const createNewChatWithMessage = async (messageContent) => {
    setIsLoading(true);
    try {
      // Erstelle neue Session mit initial_message
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/chat/sessions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`
          },
          body: JSON.stringify({
            title: newChatTitle || 'Neuer Chat',
            model: selectedModel,
            initial_message: messageContent,
            system_prompt: systemPrompt
          })
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const newSession = await response.json();
      setCurrentSession(newSession);
      // Lade die Session inkl. aller Nachrichten (inkl. initial_message)
      await loadChatSession(newSession.id);
      setNewMessage('');
    } catch (error) {
      console.error('Error creating new chat with message:', error);
      setMessages(prev => prev.slice(0, -2));
    } finally {
      setIsLoading(false);
    }
  };

  const loadChatSession = async (sessionId) => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/chat/sessions/${sessionId}`);
      const session = response.data;
      setCurrentSession(session);
      setMessages(session.messages);
      setEditingTitleValue(session.title);
      setSystemPrompt(session.system_prompt || DEFAULT_SYSTEM_PROMPT);
    } catch (error) {
      console.error('Error loading chat session:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isLoading) return;

    // If no current session, create a new one
    if (!currentSession) {
      await createNewChatWithMessage(newMessage);
      setNewMessage('');
      return;
    }

    const messageContent = newMessage; // Save the message content
    const userMessage = {
      id: `temp_${Date.now()}`,
      role: 'user',
      content: messageContent,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsLoading(true);

    try {
      // Create assistant message placeholder
      const assistantMessage = {
        id: `temp_assistant_${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date()
      };

      setMessages(prev => [...prev.slice(0, -1), userMessage, assistantMessage]);

      // Send message and handle streaming response
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/chat/sessions/${currentSession.id}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`
          },
          body: JSON.stringify({ content: messageContent })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.response) {
                fullContent += data.response;
                // Update the assistant message with accumulated content
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessage.id 
                    ? { ...msg, content: fullContent }
                    : msg
                ));
              }
            } catch (e) {
              // Ignore parsing errors for incomplete JSON
            }
          }
        }
      }

      // Update chat sessions list
      await loadChatSessions();
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove the temporary messages on error
      setMessages(prev => prev.slice(0, -2));
    } finally {
      setIsLoading(false);
    }
  };

  const updateChatTitle = async () => {
    if (!currentSession || !editingTitleValue.trim()) return;

    try {
      await axios.put(
        `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/chat/sessions/${currentSession.id}`,
        { 
          title: editingTitleValue,
          system_prompt: systemPrompt
        }
      );
      
      setCurrentSession(prev => ({ ...prev, title: editingTitleValue }));
      setEditingTitle(false);
      
      // Update chat sessions list
      await loadChatSessions();
    } catch (error) {
      console.error('Error updating chat title:', error);
    }
  };

  const updateSystemPrompt = async () => {
    if (!currentSession) return;

    try {
      await axios.put(
        `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/chat/sessions/${currentSession.id}`,
        { 
          title: currentSession.title,
          system_prompt: systemPrompt
        }
      );
      
      setCurrentSession(prev => ({ ...prev, system_prompt: systemPrompt }));
      setShowSystemPromptModal(false);
      
      // Update chat sessions list
      await loadChatSessions();
    } catch (error) {
      console.error('Error updating system prompt:', error);
    }
  };

  const deleteChatSession = async (sessionId) => {
    if (!window.confirm('Möchten Sie diesen Chat wirklich löschen?')) return;

    try {
      await axios.delete(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/chat/sessions/${sessionId}`);
      
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
        setMessages([]);
      }
      
      await loadChatSessions();
    } catch (error) {
      console.error('Error deleting chat session:', error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Funktion zum Starten/Stoppen der Spracheingabe
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
        setNewMessage((prev) => prev ? prev + ' ' + transcript : transcript);
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
    <div className="flex h-full bg-slate-950">
      {/* Sidebar - Chat Sessions */}
      <div className="w-80 bg-slate-900 border-r-2 border-slate-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b-2 border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-lg">Chats</h2>
            <button
              onClick={() => setShowNewChatForm(true)}
              className="p-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4 text-white" />
            </button>
          </div>
          
          {showNewChatForm && (
            <div className="space-y-3">
              <input
                type="text"
                value={newChatTitle}
                onChange={(e) => setNewChatTitle(e.target.value)}
                placeholder="Chat-Titel eingeben..."
                className="w-full p-2 bg-slate-800 border-2 border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none"
                onKeyDown={(e) => e.key === 'Enter' && createNewChat()}
                autoFocus
              />
              <div className="flex space-x-2">
                <button
                  onClick={createNewChat}
                  className="flex-1 p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  Erstellen
                </button>
                <button
                  onClick={() => setShowNewChatForm(false)}
                  className="flex-1 p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Chat Sessions List */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoadingSessions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
            </div>
          ) : chatSessions.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400">Keine Chats vorhanden</p>
              <p className="text-slate-500 text-sm">Erstellen Sie einen neuen Chat</p>
            </div>
          ) : (
            <div className="space-y-2">
              {chatSessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    currentSession?.id === session.id
                      ? 'bg-purple-900/30 border-2 border-purple-500'
                      : 'bg-slate-800 border-2 border-slate-700 hover:border-purple-500 hover:bg-slate-750'
                  }`}
                  onClick={() => loadChatSession(session.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">{session.title}</h3>
                      <p className="text-slate-400 text-sm">{session.message_count} Nachrichten</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteChatSession(session.id);
                      }}
                      className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col pb-20">
        {currentSession ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b-2 border-slate-700 bg-slate-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => {
                      setCurrentSession(null);
                      setMessages([]);
                    }}
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  
                  {editingTitle ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={editingTitleValue}
                        onChange={(e) => setEditingTitleValue(e.target.value)}
                        className="p-1 bg-slate-800 border border-slate-600 rounded text-white focus:border-purple-500 focus:outline-none"
                        onKeyDown={(e) => e.key === 'Enter' && updateChatTitle()}
                        autoFocus
                      />
                      <button
                        onClick={updateChatTitle}
                        className="p-1 text-green-400 hover:text-green-300"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => setEditingTitle(false)}
                        className="p-1 text-red-400 hover:text-red-300"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <h2 className="text-white font-semibold text-lg">{currentSession.title}</h2>
                      <button
                        onClick={() => setEditingTitle(true)}
                        className="p-1 text-slate-400 hover:text-white transition-colors"
                        title="Titel bearbeiten"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setShowSystemPromptModal(true)}
                        className="p-1 text-slate-400 hover:text-white transition-colors"
                        title="System-Prompt bearbeiten"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="text-slate-400 text-sm">
                  Modell: {currentSession.model}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                  <p className="text-slate-400">Starte eine Konversation</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-3xl p-4 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-800 text-slate-200 border-2 border-slate-700'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          {message.role === 'user' ? (
                            <User className="w-5 h-5 text-purple-200" />
                          ) : (
                            <Bot className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="whitespace-pre-wrap">{message.content}</div>
                          <div className={`text-xs mt-2 ${
                            message.role === 'user' ? 'text-purple-200' : 'text-slate-400'
                          }`}>
                            {formatTime(message.timestamp)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 text-slate-200 border-2 border-slate-700 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <Bot className="w-5 h-5 text-slate-400" />
                      <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                      <span className="text-slate-400">Schreibt...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t-2 border-slate-700 bg-slate-900">
              <div className="flex space-x-3">
                <textarea
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Nachricht eingeben... (Enter zum Senden, Shift+Enter für neue Zeile)"
                  className="flex-1 p-3 bg-slate-800 border-2 border-slate-600 rounded-lg text-white placeholder-slate-400 resize-none focus:border-purple-500 focus:outline-none"
                  rows="1"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSpeechInput}
                  type="button"
                  className={`p-3 rounded-lg transition-colors ${isRecording ? 'bg-red-600' : 'bg-slate-700 hover:bg-purple-700'} text-white`}
                  title={isRecording ? 'Spracheingabe läuft...' : 'Spracheingabe starten'}
                  disabled={isLoading}
                >
                  {isRecording ? <MicOff className="w-5 h-5 animate-pulse" /> : <Mic className="w-5 h-5" />}
                </button>
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || isLoading}
                  className="p-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Welcome Screen */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md mx-auto">
              <MessageSquare className="w-16 h-16 text-slate-500 mx-auto mb-4" />
              <h2 className="text-white text-xl font-semibold mb-2">Willkommen im Chat</h2>
            </div>
          </div>
        )}
      </div>

      {/* System Prompt Modal */}
      {showSystemPromptModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border-2 border-slate-700 rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">System-Prompt bearbeiten</h3>
              <button
                onClick={() => setShowSystemPromptModal(false)}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white font-medium mb-2">System-Prompt</label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Geben Sie den System-Prompt ein..."
                  className="w-full h-64 p-3 bg-slate-900 border-2 border-slate-600 rounded-lg text-white placeholder-slate-400 resize-none focus:border-purple-500 focus:outline-none font-mono text-sm"
                />
                <p className="text-slate-400 text-sm mt-2">
                  Der System-Prompt definiert das Verhalten und die Rolle der KI für diesen Chat.
                </p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setSystemPrompt(DEFAULT_SYSTEM_PROMPT)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Standard verwenden
                </button>
                <button
                  onClick={updateSystemPrompt}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  Speichern
                </button>
                <button
                  onClick={() => setShowSystemPromptModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 