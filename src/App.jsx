import React, { useState } from 'react';
import { Users, FileText, Loader2, AlertTriangle, ArrowLeft, Plus } from 'lucide-react';
import { useCRMData } from './hooks/useCRMData';
import ListaClientes from './components/ListaClientes';
import FichaCliente from './components/FichaCliente';
import ModalNovoCliente from './components/ModalNovoCliente';
import DocumentosNecessarios from './components/DocumentosNecessarios';

const TITULOS = {
  clientes: 'CRM Clientes',
  documentos: 'Documentação Necessária',
};

export default function App() {
  const { clientes, carregando, erro, recarregar } = useCRMData();
  const [aba, setAba] = useState('clientes'); // 'clientes' | 'documentos'
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState(null);
  const [modalNovoAberto, setModalNovoAberto] = useState(false);

  const clienteSelecionado = clientes.find((c) => c.id === clienteSelecionadoId) || null;

  const atualizarEFechar = async () => {
    await recarregar();
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white px-4 py-3 sticky top-0 z-30 shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {aba !== 'clientes' && (
              <button
                onClick={() => setAba('clientes')}
                className="text-slate-300 hover:text-white p-1 -ml-1 shrink-0"
                aria-label="Voltar"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h1 className="font-bold text-sm truncate">{TITULOS[aba]}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {carregando && <Loader2 className="w-4 h-4 animate-spin text-slate-300" />}
            {aba === 'clientes' && (
              <button
                onClick={() => setModalNovoAberto(true)}
                className="hidden sm:flex bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Novo Cliente
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-3 pb-20">
        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {erro}
          </div>
        )}

        {!erro && aba === 'clientes' && (
          <ListaClientes
            clientes={clientes}
            onSelecionarCliente={(c) => setClienteSelecionadoId(c.id)}
            onNovoCliente={() => setModalNovoAberto(true)}
            onAtualizar={recarregar}
          />
        )}

        {!erro && aba === 'documentos' && <DocumentosNecessarios />}
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 flex z-30">
        <div className="max-w-2xl mx-auto flex w-full">
          <button
            onClick={() => setAba('clientes')}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${aba === 'clientes' ? 'text-blue-600' : 'text-slate-400'}`}
          >
            <Users className="w-4 h-4" /> Clientes ({clientes.length})
          </button>
          <button
            onClick={() => setAba('documentos')}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${aba === 'documentos' ? 'text-blue-600' : 'text-slate-400'}`}
          >
            <FileText className="w-4 h-4" /> Docs
          </button>
        </div>
      </nav>

      {clienteSelecionado && (
        <FichaCliente
          cliente={clienteSelecionado}
          onFechar={() => setClienteSelecionadoId(null)}
          onAtualizar={atualizarEFechar}
        />
      )}

      {modalNovoAberto && (
        <ModalNovoCliente
          onFechar={() => setModalNovoAberto(false)}
          onCriado={async () => {
            setModalNovoAberto(false);
            await recarregar();
          }}
        />
      )}
    </div>
  );
}
