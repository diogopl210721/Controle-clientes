import React from 'react';
import { AlertTriangle, CalendarClock } from 'lucide-react';
import { diasSemInteracao, statusInteracao, diasEntre } from '../lib/helpers';

function CardSecao({ icone: Icone, titulo, corIcone, children, vazio }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
        <Icone className={`w-4 h-4 ${corIcone}`} />
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">{titulo}</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {React.Children.count(children) > 0 ? children : (
          <p className="text-xs text-slate-400 p-3">{vazio}</p>
        )}
      </div>
    </div>
  );
}

function LinhaCliente({ cliente, destaque, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors flex items-center justify-between gap-2"
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-800 truncate">{cliente.razao_social}</p>
        <p className="text-[11px] text-slate-400 truncate">
          {cliente.historico?.[0]?.descricao || `${cliente.codigo_cliente} · ${cliente.nome_fantasia || cliente.nome_contato || ''}`}
        </p>
      </div>
      <span className="shrink-0 text-[11px] font-bold text-slate-500">{destaque}</span>
    </button>
  );
}

export default function Dashboard({ clientes, onSelecionarCliente }) {
  const criticos = clientes
    .filter((c) => statusInteracao(c.acompanhamento?.ultima_interacao) === 'critico')
    .sort((a, b) => diasSemInteracao(b.acompanhamento?.ultima_interacao) - diasSemInteracao(a.acompanhamento?.ultima_interacao));

  const atencao = clientes
    .filter((c) => statusInteracao(c.acompanhamento?.ultima_interacao) === 'atencao')
    .sort((a, b) => diasSemInteracao(b.acompanhamento?.ultima_interacao) - diasSemInteracao(a.acompanhamento?.ultima_interacao));

  const vencimentos = clientes
    .filter((c) => c.contrato?.data_termino && diasEntre(c.contrato.data_termino) >= 0 && diasEntre(c.contrato.data_termino) <= 90)
    .sort((a, b) => diasEntre(a.contrato.data_termino) - diasEntre(b.contrato.data_termino));

  return (
    <div className="space-y-4">
      {/* Resumo rápido */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-red-50 border border-red-100 rounded-lg p-2.5 text-center">
          <p className="text-xl font-bold text-red-600">{criticos.length}</p>
          <p className="text-[10px] font-semibold text-red-500 uppercase">+10 dias sem contato</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5 text-center">
          <p className="text-xl font-bold text-amber-600">{atencao.length}</p>
          <p className="text-[10px] font-semibold text-amber-600 uppercase">7-9 dias, atenção</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 text-center">
          <p className="text-xl font-bold text-emerald-600">{clientes.length - criticos.length - atencao.length}</p>
          <p className="text-[10px] font-semibold text-emerald-600 uppercase">Em dia</p>
        </div>
      </div>

      <CardSecao icone={AlertTriangle} corIcone="text-red-500" titulo="Clientes precisam de atenção" vazio="Nenhum cliente com +7 dias sem contato. 🎉">
        {[...criticos, ...atencao].map((c) => (
          <LinhaCliente
            key={c.id}
            cliente={c}
            destaque={
              <span className={statusInteracao(c.acompanhamento?.ultima_interacao) === 'critico' ? 'text-red-600' : 'text-amber-600'}>
                {diasSemInteracao(c.acompanhamento?.ultima_interacao)}d sem contato
              </span>
            }
            onClick={() => onSelecionarCliente(c)}
          />
        ))}
      </CardSecao>

      <CardSecao icone={CalendarClock} corIcone="text-orange-500" titulo="Vencimentos próximos (90 dias)" vazio="Nenhum contrato vencendo nos próximos 90 dias.">
        {vencimentos.map((c) => (
          <LinhaCliente
            key={c.id}
            cliente={c}
            destaque={<span className="text-orange-600">{diasEntre(c.contrato.data_termino)}d</span>}
            onClick={() => onSelecionarCliente(c)}
          />
        ))}
      </CardSecao>
    </div>
  );
}
