import React, { useState, useMemo } from 'react';
import { Search, Plus } from 'lucide-react';
import { statusInteracao, diasSemInteracao } from '../lib/helpers';
import { labelFase, corFase, FASES } from '../lib/fases';
import BotoesContato from './BotoesContato';

const CORES_STATUS = {
  critico: 'bg-red-500',
  atencao: 'bg-amber-500',
  ok: 'bg-emerald-500',
};

export default function ListaClientes({ clientes, onSelecionarCliente, onNovoCliente }) {
  const [busca, setBusca] = useState('');
  const [filtroFase, setFiltroFase] = useState('todas');

  const filtrados = useMemo(() => {
    const termo = busca.toLowerCase();
    return clientes.filter((c) => {
      const passaBusca =
        !termo ||
        c.razao_social?.toLowerCase().includes(termo) ||
        c.codigo_cliente?.toLowerCase().includes(termo) ||
        c.nome_fantasia?.toLowerCase().includes(termo) ||
        c.telefone?.toLowerCase().includes(termo) ||
        c.nome_contato?.toLowerCase().includes(termo);
      const passaFase = filtroFase === 'todas' || c.acompanhamento?.fase_atual === filtroFase;
      return passaBusca && passaFase;
    });
  }, [clientes, busca, filtroFase]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por código, cliente, fantasia, telefone..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-8 pr-2 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <button
          onClick={onNovoCliente}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> Novo
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setFiltroFase('todas')}
          className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${filtroFase === 'todas' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}
        >
          Todas ({clientes.length})
        </button>
        {FASES.map((f) => (
          <button
            key={f.valor}
            onClick={() => setFiltroFase(f.valor)}
            className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${filtroFase === f.valor ? 'bg-slate-800 text-white border-slate-800' : corFase(f.valor)}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
        {filtrados.length === 0 && (
          <p className="text-xs text-slate-400 p-4 text-center">Nenhum cliente encontrado.</p>
        )}
        {filtrados.map((c) => {
          const status = statusInteracao(c.acompanhamento?.ultima_interacao);
          const dias = diasSemInteracao(c.acompanhamento?.ultima_interacao);
          const ultimaNota = c.historico?.[0]?.descricao;
          const endereco = c.contrato?.endereco_entrega || c.endereco;
          return (
            <div
              key={c.id}
              onClick={() => onSelecionarCliente(c)}
              className="w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors flex items-center gap-2.5 cursor-pointer"
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${CORES_STATUS[status]}`} title={`${dias ?? '—'} dias sem contato`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-slate-800 truncate">{c.razao_social}</p>
                  <span className={`shrink-0 text-[9px] font-semibold px-1 py-0.5 rounded border ${corFase(c.acompanhamento?.fase_atual)}`}>
                    {labelFase(c.acompanhamento?.fase_atual)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  {ultimaNota || `${c.codigo_cliente}${c.nome_fantasia ? ` · ${c.nome_fantasia}` : ''} — sem registros ainda`}
                </p>
              </div>
              <BotoesContato telefone={c.telefone} endereco={endereco} tamanho="compacto" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
