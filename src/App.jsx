import React, { useState } from 'react';
import { LayoutDashboard, Users, FileText, Loader2, AlertTriangle, ArrowLeft, Plus } from 'lucide-react';
import { useCRMData } from './hooks/useCRMData';
import Dashboard from './components/Dashboard';
import ListaClientes from './components/ListaClientes';
import FichaCliente from './components/FichaCliente';
import ModalNovoCliente from './components/ModalNovoCliente';
import DocumentosNecessarios from './components/DocumentosNecessarios';

const TITULOS = {
  dashboard: 'Dashboard',
  clientes: 'Clientes',
  documentos: 'Documentação Necessária',
};

export default function App() {
  const { clientes, carregando, erro, recarregar } = useCRMData();
  const [aba, setAba] = useState('dashboard'); // 'dashboard' | 'clientes' | 'documentos'
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState(null);
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [filtroClientes, setFiltroClientes] = useState(null); // null | 'parados' | 'vencimento'
  const [subAbaClientes, setSubAbaClientes] = useState('ativos'); // 'ativos' | 'concluidos'
  const [consultorClientes, setConsultorClientes] = useState('');

  const clienteSelecionado = clientes.find((c) => c.id === clienteSelecionadoId) || null;

  const atualizarEFechar = async () => {
    await recarregar();
  };

  const irParaClientesComFiltro = (filtro, subAba, consultor = '') => {
    setFiltroClientes(filtro);
    setSubAbaClientes(subAba);
    setConsultorClientes(consultor);
    setAba('clientes');
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950 text-white px-4 py-3.5 sticky top-0 z-30 shadow-lg shadow-slate-900/10">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {aba !== 'dashboard' && (
              <button
                onClick={() => setAba('dashboard')}
                className="text-slate-300 hover:text-white hover:bg-white/10 p-1.5 -ml-1 rounded-full shrink-0 transition-colors"
                aria-label="Voltar"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h1 className="font-bold text-sm tracking-tight truncate">{TITULOS[aba]}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {carregando && <Loader2 className="w-4 h-4 animate-spin text-slate-300" />}
            {aba === 'clientes' && (
              <button
                onClick={() => setModalNovoAberto(true)}
                className="hidden sm:flex bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-full text-xs font-bold items-center gap-1 shadow-sm shadow-blue-600/30 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Novo Cliente
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-3 pb-20">
        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {erro}
          </div>
        )}

        {!erro && aba === 'dashboard' && (
          <Dashboard clientes={clientes} onAbrirFiltro={irParaClientesComFiltro} />
        )}

        {!erro && aba === 'clientes' && (
          <ListaClientes
            clientes={clientes}
            onSelecionarCliente={(c) => setClienteSelecionadoId(c.id)}
            onNovoCliente={() => setModalNovoAberto(true)}
            onAtualizar={recarregar}
            filtro={filtroClientes}
            onMudarFiltro={setFiltroClientes}
            aba={subAbaClientes}
            onMudarAba={setSubAbaClientes}
            consultor={consultorClientes}
            onMudarConsultor={setConsultorClientes}
          />
        )}

        {!erro && aba === 'documentos' && <DocumentosNecessarios />}
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-md border-t border-slate-200 flex z-30 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
        <div className="max-w-2xl mx-auto flex w-full">
          <button
            onClick={() => setAba('dashboard')}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors ${aba === 'dashboard' ? 'text-blue-600' : 'text-slate-400'}`}
          >
            <span className={`p-1.5 rounded-full ${aba === 'dashboard' ? 'bg-blue-50' : ''}`}>
              <LayoutDashboard className="w-4 h-4" />
            </span>
            Dashboard
          </button>
          <button
            onClick={() => setAba('clientes')}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors ${aba === 'clientes' ? 'text-blue-600' : 'text-slate-400'}`}
          >
            <span className={`p-1.5 rounded-full ${aba === 'clientes' ? 'bg-blue-50' : ''}`}>
              <Users className="w-4 h-4" />
            </span>
            Clientes ({clientes.length})
          </button>
          <button
            onClick={() => setAba('documentos')}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors ${aba === 'documentos' ? 'text-blue-600' : 'text-slate-400'}`}
          >
            <span className={`p-1.5 rounded-full ${aba === 'documentos' ? 'bg-blue-50' : ''}`}>
              <FileText className="w-4 h-4" />
            </span>
            Docs
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
