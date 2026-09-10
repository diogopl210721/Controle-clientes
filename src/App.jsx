import React, { useState } from 'react';
import { LayoutDashboard, Users, Loader2, AlertTriangle } from 'lucide-react';
import { useCRMData } from './hooks/useCRMData';
import Dashboard from './components/Dashboard';
import ListaClientes from './components/ListaClientes';
import FichaCliente from './components/FichaCliente';
import ModalNovoCliente from './components/ModalNovoCliente';

export default function App() {
  const { clientes, carregando, erro, recarregar } = useCRMData();
  const [aba, setAba] = useState('hoje'); // 'hoje' | 'clientes'
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState(null);
  const [modalNovoAberto, setModalNovoAberto] = useState(false);

  const clienteSelecionado = clientes.find((c) => c.id === clienteSelecionadoId) || null;

  const atualizarEFechar = async () => {
    await recarregar();
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-800 text-white px-4 py-3 sticky top-0 z-30 shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="font-bold text-sm">Acompanhamento de Clientes</h1>
          {carregando && <Loader2 className="w-4 h-4 animate-spin text-slate-300" />}
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-3 pb-20">
        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {erro}
          </div>
        )}

        {!erro && aba === 'hoje' && (
          <Dashboard clientes={clientes} onSelecionarCliente={(c) => setClienteSelecionadoId(c.id)} />
        )}

        {!erro && aba === 'clientes' && (
          <ListaClientes
            clientes={clientes}
            onSelecionarCliente={(c) => setClienteSelecionadoId(c.id)}
            onNovoCliente={() => setModalNovoAberto(true)}
          />
        )}
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 flex z-30">
        <div className="max-w-2xl mx-auto flex w-full">
          <button
            onClick={() => setAba('hoje')}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${aba === 'hoje' ? 'text-blue-600' : 'text-slate-400'}`}
          >
            <LayoutDashboard className="w-4 h-4" /> Hoje
          </button>
          <button
            onClick={() => setAba('clientes')}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${aba === 'clientes' ? 'text-blue-600' : 'text-slate-400'}`}
          >
            <Users className="w-4 h-4" /> Clientes ({clientes.length})
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
