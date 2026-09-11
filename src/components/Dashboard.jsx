import React, { useMemo } from 'react';
import { Clock, AlertTriangle, CalendarClock, CheckCircle2, Archive, Users } from 'lucide-react';
import { diasSemInteracao, diasEntre } from '../lib/helpers';

function CardIndicador({ label, valor, icone: Icone, corIcone, corFundo, corTexto, onClick }) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      className={`text-left bg-white rounded-2xl shadow-sm border border-slate-100 p-4 transition-all ${onClick ? 'hover:shadow-md hover:-translate-y-0.5 active:translate-y-0' : ''}`}
    >
      <div className={`w-9 h-9 rounded-full ${corFundo} flex items-center justify-center mb-3`}>
        <Icone className={`w-4.5 h-4.5 ${corIcone}`} />
      </div>
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`text-3xl font-extrabold ${corTexto}`}>{valor}</p>
    </Wrapper>
  );
}

const CORES_AVATAR = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-orange-500', 'bg-rose-500', 'bg-cyan-500', 'bg-fuchsia-500',
];

function corAvatar(nome) {
  let hash = 0;
  for (let i = 0; i < nome.length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash);
  return CORES_AVATAR[Math.abs(hash) % CORES_AVATAR.length];
}

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

  const consultores = useMemo(() => {
    const contagem = {};
    ativos.forEach((c) => {
      if (c.consultor) contagem[c.consultor] = (contagem[c.consultor] || 0) + 1;
    });
    return Object.entries(contagem).sort((a, b) => b[1] - a[1]);
  }, [ativos]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <CardIndicador
          label="Total ativos" valor={ativos.length} icone={Clock}
          corFundo="bg-blue-50" corIcone="text-blue-600" corTexto="text-blue-600"
          onClick={() => onAbrirFiltro(null, 'ativos', '')}
        />
        <CardIndicador
          label="Parados > 5 dias" valor={totalParados} icone={AlertTriangle}
          corFundo="bg-red-50" corIcone="text-red-600" corTexto="text-red-600"
          onClick={() => onAbrirFiltro('parados', 'ativos', '')}
        />
        <CardIndicador
          label="Contratos < 90 dias" valor={totalVencendo} icone={CalendarClock}
          corFundo="bg-orange-50" corIcone="text-orange-600" corTexto="text-orange-600"
          onClick={() => onAbrirFiltro('vencimento', 'ativos', '')}
        />
        <CardIndicador
          label="Em dia" valor={totalEmDia} icone={CheckCircle2}
          corFundo="bg-emerald-50" corIcone="text-emerald-600" corTexto="text-emerald-600"
        />
      </div>

      <CardIndicador
        label="Atendimentos concluídos" valor={concluidos.length} icone={Archive}
        corFundo="bg-slate-100" corIcone="text-slate-600" corTexto="text-slate-700"
        onClick={() => onAbrirFiltro(null, 'concluidos', '')}
      />

      {consultores.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Atendimentos por consultor</h3>
          </div>
          <div className="p-3 grid grid-cols-2 gap-2">
            {consultores.map(([nome, total]) => (
              <button
                key={nome}
                onClick={() => onAbrirFiltro(null, 'ativos', nome)}
                className="flex items-center gap-2.5 bg-slate-50 hover:bg-blue-50 rounded-xl p-2.5 transition-colors text-left group"
              >
                <span className={`w-8 h-8 rounded-full ${corAvatar(nome)} text-white text-xs font-bold flex items-center justify-center shrink-0`}>
                  {nome.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate group-hover:text-blue-700">{nome}</p>
                  <p className="text-[11px] text-slate-400">{total} atendimento{total > 1 ? 's' : ''}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
