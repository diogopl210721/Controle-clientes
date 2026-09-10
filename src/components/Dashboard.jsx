import React from 'react';
import { AlertTriangle, Clock, CalendarClock, PieChart } from 'lucide-react';
import { diasSemInteracao, statusInteracao, diasEntre, formatarData } from '../lib/helpers';
import { FASES, labelFase, corFase } from '../lib/fases';

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
        <p className="text-[11px] text-slate-400 truncate">{cliente.codigo_cliente} · {cliente.nome_fantasia || cliente.nome_contato || ''}</p>
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

  const proximasAcoes = clientes
    .filter((c) => c.acompanhamento?.data_proxima_acao)
    .sort((a, b) => new Date(a.acompanhamento.data_proxima_acao) - new Date(b.acompanhamento.data_proxima_acao));

  const vencimentos = clientes
    .filter((c) => c.contrato?.data_termino && diasEntre(c.contrato.data_termino) >= 0 && diasEntre(c.contrato.data_termino) <= 90)
    .sort((a, b) => diasEntre(a.contrato.data_termino) - diasEntre(b.contrato.data_termino));

  const totalPorFase = FASES.map((f) => ({
    ...f,
    total: clientes.filter((c) => (c.acompanhamento?.fase_atual || 'aguardando_documentacao') === f.valor).length,
  }));
  const maxFase = Math.max(1, ...totalPorFase.map((f) => f.total));

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

      <CardSecao icone={Clock} corIcone="text-blue-500" titulo="Próximas ações" vazio="Nenhuma próxima ação agendada.">
        {proximasAcoes.map((c) => (
          <LinhaCliente
            key={c.id}
            cliente={c}
            destaque={<span className="text-blue-600">{formatarData(c.acompanhamento.data_proxima_acao)}</span>}
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

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
          <PieChart className="w-4 h-4 text-slate-500" />
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Clientes por fase</h3>
        </div>
        <div className="p-3 space-y-1.5">
          {totalPorFase.map((f) => (
            <div key={f.valor} className="flex items-center gap-2">
              <span className="text-[11px] text-slate-600 w-40 shrink-0 truncate">{f.label}</span>
              <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${corFase(f.valor).split(' ')[0].replace('100', '400')}`}
                  style={{ width: `${(f.total / maxFase) * 100}%` }}
                />
              </div>
              <span className="text-[11px] font-bold text-slate-500 w-4 text-right">{f.total}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
