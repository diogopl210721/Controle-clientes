import React, { useMemo } from 'react';
import { Clock, AlertTriangle, CalendarClock, CheckCircle2, Archive, Users, FileText } from 'lucide-react';
import { diasSemInteracao, diasEntre } from '../lib/helpers';

function CardIndicador({ label, valor, icone: Icone, corIcone, corFundo, corTexto, onClick }) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      className={`text-left bg-white rounded-xl shadow-sm border border-slate-100 p-2.5 transition-all ${onClick ? 'hover:shadow-md active:scale-[0.98]' : ''}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-6 h-6 rounded-full ${corFundo} flex items-center justify-center shrink-0`}>
          <Icone className={`w-3.5 h-3.5 ${corIcone}`} />
        </div>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide leading-tight">{label}</p>
      </div>
      <p className={`text-xl font-extrabold ${corTexto}`}>{valor}</p>
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

export default function Dashboard({ clientes, onAbrirFiltro, onAbrirDocumentos }) {
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
    <div className="space-y-2.5">
      <div className="grid grid-cols-3 gap-2">
        <CardIndicador
          label="Ativos" valor={ativos.length} icone={Clock}
          corFundo="bg-blue-50" corIcone="text-blue-600" corTexto="text-blue-600"
        />
        <CardIndicador
          label="Parados >5d" valor={totalParados} icone={AlertTriangle}
          corFundo="bg-red-50" corIcone="text-red-600" corTexto="text-red-600"
          onClick={() => onAbrirFiltro('parados', 'ativos', '')}
        />
        <CardIndicador
          label="Contrato <90d" valor={totalVencendo} icone={CalendarClock}
          corFundo="bg-orange-50" corIcone="text-orange-600" corTexto="text-orange-600"
          onClick={() => onAbrirFiltro('vencimento', 'ativos', '')}
        />
        <CardIndicador
          label="Em dia" valor={totalEmDia} icone={CheckCircle2}
          corFundo="bg-emerald-50" corIcone="text-emerald-600" corTexto="text-emerald-600"
        />
        <CardIndicador
          label="Concluídos" valor={concluidos.length} icone={Archive}
          corFundo="bg-slate-100" corIcone="text-slate-600" corTexto="text-slate-700"
          onClick={() => onAbrirFiltro(null, 'concluidos', '')}
        />
        <button
          onClick={onAbrirDocumentos}
          className="text-left bg-white rounded-xl shadow-sm border border-slate-100 p-2.5 transition-all hover:shadow-md active:scale-[0.98] flex items-center gap-2"
        >
          <div className="w-6 h-6 rounded-full bg-violet-50 flex items-center justify-center shrink-0">
            <FileText className="w-3.5 h-3.5 text-violet-600" />
          </div>
          <p className="text-[10px] font-bold text-violet-600 uppercase tracking-wide leading-tight">Documentos<br/>necessários</p>
        </button>
      </div>

      {consultores.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Atendimentos por consultor</h3>
          </div>
          <div className="p-2 grid grid-cols-2 gap-2">
            {consultores.map(([nome, total]) => (
              <button
                key={nome}
                onClick={() => onAbrirFiltro(null, 'ativos', nome)}
                className="flex items-center gap-2 bg-slate-50 hover:bg-blue-50 rounded-lg p-2 transition-colors text-left group"
              >
                <span className={`w-7 h-7 rounded-full ${corAvatar(nome)} text-white text-[10px] font-bold flex items-center justify-center shrink-0`}>
                  {nome.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate group-hover:text-blue-700">{nome}</p>
                  <p className="text-[10px] text-slate-400">{total} atendimento{total > 1 ? 's' : ''}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
