import React, { useState } from 'react';
import { Workflow, FileText } from 'lucide-react';
import ProcessosFluxo from './ProcessosFluxo';
import DocumentosNecessarios from './DocumentosNecessarios';

export default function CentralProcessos() {
  const [secao, setSecao] = useState('processos'); // 'processos' | 'documentos'

  return (
    <div className="space-y-3">
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 border border-slate-100">
        <button
          onClick={() => setSecao('processos')}
          className={`flex-1 text-xs font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${secao === 'processos' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
        >
          <Workflow className="w-3.5 h-3.5" /> Processos
        </button>
        <button
          onClick={() => setSecao('documentos')}
          className={`flex-1 text-xs font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${secao === 'documentos' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
        >
          <FileText className="w-3.5 h-3.5" /> Documentos
        </button>
      </div>

      {secao === 'processos' ? <ProcessosFluxo /> : <DocumentosNecessarios />}
    </div>
  );
}
