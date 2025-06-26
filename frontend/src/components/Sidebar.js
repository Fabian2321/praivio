import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  MessageSquare, 
  Brain, 
  FileText, 
  BarChart3, 
  Settings,
  Shield,
  Home,
  Sparkles
} from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();

  const navigation = [
    { name: 'Textgenerierung', href: '/', icon: MessageSquare },
    { name: 'Modelle', href: '/models', icon: Brain },
    { name: 'Vorlagen', href: '/templates', icon: FileText },
    { name: 'Statistiken', href: '/statistics', icon: BarChart3 },
    { name: 'Einstellungen', href: '/settings', icon: Settings },
  ];

  return (
    <div className="w-72 sidebar-modern">
      <div className="p-8">
        {/* Logo Section */}
        <div className="flex items-center gap-4 mb-12">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Praivio</h1>
            <p className="text-xs text-white/70">KI-Plattform</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-white/20 text-white border border-white/20 shadow-lg'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isActive ? 'bg-white/20' : 'bg-white/10'
                }`}>
                  <item.icon className="w-4 h-4" />
                </div>
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Security Badge */}
        <div className="mt-12 p-4 bg-white/10 rounded-xl border border-white/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Sicher & Lokal</p>
              <p className="text-xs text-white/60">100% Datenschutz</p>
            </div>
          </div>
        </div>

        {/* Version Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-white/40">v1.0.0</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar; 