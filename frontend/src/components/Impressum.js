import React from "react";

export default function Impressum() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4 text-slate-200">
      <h1 className="text-3xl font-bold mb-4">Impressum</h1>
      <p className="mb-2">Praivio GmbH<br />Musterstraße 1<br />12345 Musterstadt<br />Deutschland</p>
      <p className="mb-2">Vertreten durch: Max Mustermann</p>
      <p className="mb-2">E-Mail: support@praivio.com</p>
      <p className="mb-2">Handelsregister: HRB 123456<br />Umsatzsteuer-ID: DE123456789</p>
      <p className="mt-6 text-xs text-slate-400">Dies ist ein Platzhalter-Impressum. Bitte mit echten Daten ersetzen!</p>
    </div>
  );
} 