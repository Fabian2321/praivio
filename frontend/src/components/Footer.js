import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 w-full z-50 bg-slate-900/95 border-t-2 border-slate-700 text-slate-300 text-sm py-4 px-6 flex flex-col md:flex-row items-center justify-between gap-2 shadow-lg">
      <div className="flex flex-wrap items-center gap-3">
        <span>© 2025 Praivio</span>
        <span>|</span>
        <Link to="/impressum" className="hover:text-purple-400 transition-colors">Impressum</Link>
        <span>|</span>
        <Link to="/datenschutz" className="hover:text-purple-400 transition-colors">Datenschutz</Link>
        <span>|</span>
        <a href="https://github.com/Fabian2321/praivio" target="_blank" rel="noopener noreferrer" className="hover:text-purple-400 transition-colors">GitHub</a>
        <span>|</span>
        <span>Version: v1.0.0</span>
        <span>|</span>
        <a href="mailto:support@praivio.com" className="hover:text-purple-400 transition-colors">Kontakt</a>
      </div>
    </footer>
  );
} 