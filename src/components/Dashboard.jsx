import React, { useMemo } from 'react';
import { Clock, AlertTriangle, CalendarClock, CheckCircle2, Archive } from 'lucide-react';
import { diasSemInteracao, diasEntre } from '../lib/helpers';

export default function Dashboard({ clientes, onAbrirFiltro }) {
  const ativos = useMemo(() => clientes.filter((c) => !c.acompanhamento?.encerrado), [clientes]);
  const concluidos = useMemo(() => clientes.filter((c) => c.acompanhamento?.encerrado), [clientes]);

  const comMetricas = useMemo(
    () =>
      ativos.map((c) => ({
        _diasSemContato: diasSemInteracao(c.acompanhamento?.ultima_interacao),
        _diasContrato: c.contrato?.data_termino ? diasEntre(c.contrato.data_termino) : null,
      })),
    [ativos]
  );

  const totalParados = comMetricas.filter((c) => c._diasSemContato !== null && c._diasSemContato >= 5).length;
  const totalVencendo = comMetricas.filter((c) => c._diasContrato !== null && c._diasContrato >= 0 && c._diasContrato <= 90).length;
  const totalEmDia = comMetricas.length - totalParados;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onAbrirFiltro(null, 'ativos')}
          className="text-left bg-white border border-slate-200 rounded-lg p-3 hover:border-blue-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Total ativos</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-600">{ativos.length}</p>
        </button>

        <button
          onClick={() => onAbrirFiltro('parados', 'ativos')}
          className="text-left bg-white border border-slate-200 rounded-lg p-3 hover:border-red-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Parados &gt; 5 dias</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-600">{totalParados}</p>
        </button>

        <button
          onClick={() => onAbrirFiltro('vencimento', 'ativos')}
          className="text-left bg-white border border-slate-200 rounded-lg p-3 hover:border-orange-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Contratos &lt; 90 dias</span>
            <CalendarClock className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-orange-600">{totalVencendo}</p>
        </button>

        <div className="text-left bg-white border border-slate-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Em dia</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600">{totalEmDia}</p>
        </div>

        <button
          onClick={() => onAbrirFiltro(null, 'concluidos')}
          className="col-span-2 text-left bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-400"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Atendimentos concluídos</span>
            <Archive className="w-4 h-4 text-slate-500" />
          </div>
          <p className="text-2xl font-bold text-slate-600">{concluidos.length}</p>
        </button>
      </div>
    </div>
  );
}
