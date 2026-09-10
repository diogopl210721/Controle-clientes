import React, { useState, useMemo } from 'react';
import { Search, Plus, Send, Loader2, ChevronRight, Clock, AlertTriangle, CalendarClock, CheckCircle2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { statusInteracao, diasSemInteracao, diasEntre } from '../lib/helpers';
import { PRIORIDADES } from '../lib/fases';
import BotoesContato from './BotoesContato';

const CORES_STATUS = {
  critico: 'bg-red-500',
  atencao: 'bg-amber-500',
  ok: 'bg-emerald-500',
};

const CORES_PRIORIDADE = {
  normal: 'text-slate-400 border-slate-200',
  alta: 'text-amber-600 border-amber-300 bg-amber-50',
  urgente: 'text-red-600 border-red-300 bg-red-50',
};

function LinhaCliente({ cliente: c, onAbrir, onAtualizar }) {
  const [nota, setNota] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [salvandoPrioridade, setSalvandoPrioridade] = useState(false);

  const status = statusInteracao(c.acompanhamento?.ultima_interacao);
  const dias = diasSemInteracao(c.acompanhamento?.ultima_interacao);
  const [notaAtual, notaAnterior] = c.historico || [];
  const endereco = c.contrato?.endereco_entrega || c.endereco;
  const diasContrato = c.contrato?.data_termino ? diasEntre(c.contrato.data_termino) : null;
  const prioridade = c.acompanhamento?.prioridade || 'normal';

  const enviarNota = async () => {
    if (!nota.trim()) return;
    setEnviando(true);
    const { error } = await supabase.from('historico').insert({ cliente_id: c.id, descricao: nota.trim() });
    setEnviando(false);
    if (!error) {
      setNota('');
      onAtualizar();
    }
  };

  const mudarPrioridade = async (valor) => {
    setSalvandoPrioridade(true);
    const payload = { cliente_id: c.id, prioridade: valor, updated_at: new Date().toISOString() };
    const { error } = c.acompanhamento?.id
      ? await supabase.from('acompanhamento').update(payload).eq('id', c.acompanhamento.id)
      : await supabase.from('acompanhamento').insert(payload);
    setSalvandoPrioridade(false);
    if (!error) onAtualizar();
  };

  const parar = (e) => e.stopPropagation();

  return (
    <div className="px-3 py-2.5">
      <div className="flex items-start gap-2.5">
        <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${CORES_STATUS[status]}`} title={`${dias ?? '—'} dias sem contato`} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold text-slate-800 truncate">{c.razao_social}</p>
          </div>
          {notaAtual ? (
            <>
              <p className="text-[11px] text-slate-600 truncate">{notaAtual.descricao}</p>
              {notaAnterior && <p className="text-[10px] text-slate-400 truncate">Antes: {notaAnterior.descricao}</p>}
            </>
          ) : (
            <p className="text-[11px] text-slate-400 truncate">
              {c.codigo_cliente}{c.nome_fantasia ? ` · ${c.nome_fantasia}` : ''} — sem registros ainda
            </p>
          )}

          {/* Adicionar anotação direto na lista */}
          <div className="flex items-center gap-1.5 mt-1.5" onClick={parar}>
            <input
              type="text"
              placeholder="Escrever o que está acontecendo..."
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && enviarNota()}
              className="flex-1 min-w-0 px-2 py-1 text-[11px] border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
            <button
              onClick={enviarNota}
              disabled={enviando || !nota.trim()}
              className="text-blue-600 hover:text-blue-700 disabled:opacity-30 shrink-0 p-1"
            >
              {enviando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
            <select
              value={prioridade}
              onChange={(e) => mudarPrioridade(e.target.value)}
              disabled={salvandoPrioridade}
              className={`shrink-0 text-[10px] font-semibold rounded border px-1 py-1 focus:outline-none ${CORES_PRIORIDADE[prioridade]}`}
            >
              {PRIORIDADES.map((p) => (
                <option key={p.valor} value={p.valor}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          {diasContrato !== null && (
            <span className={`text-[10px] font-semibold ${diasContrato < 0 ? 'text-red-600' : diasContrato <= 30 ? 'text-red-600' : diasContrato <= 90 ? 'text-amber-600' : 'text-slate-400'}`}>
              {diasContrato < 0 ? `venceu há ${Math.abs(diasContrato)}d` : `vence em ${diasContrato}d`}
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <BotoesContato telefone={c.telefone} endereco={endereco} tamanho="compacto" />
            <button onClick={() => onAbrir(c)} className="text-slate-300 hover:text-slate-600 p-0.5" title="Abrir ficha completa">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ListaClientes({ clientes, onSelecionarCliente, onNovoCliente, onAtualizar }) {
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState(null); // null | 'parados' | 'vencimento'

  const comMetricas = useMemo(
    () =>
      clientes.map((c) => ({
        ...c,
        _diasSemContato: diasSemInteracao(c.acompanhamento?.ultima_interacao),
        _diasContrato: c.contrato?.data_termino ? diasEntre(c.contrato.data_termino) : null,
      })),
    [clientes]
  );

  const totalParados = comMetricas.filter((c) => c._diasSemContato !== null && c._diasSemContato >= 5).length;
  const totalVencendo = comMetricas.filter((c) => c._diasContrato !== null && c._diasContrato >= 0 && c._diasContrato <= 90).length;
  const totalEmDia = comMetricas.length - totalParados;

  const filtrados = useMemo(() => {
    const termo = busca.toLowerCase();
    return comMetricas
      .filter((c) => {
        if (!termo) return true;
        return (
          c.razao_social?.toLowerCase().includes(termo) ||
          c.codigo_cliente?.toLowerCase().includes(termo) ||
          c.nome_fantasia?.toLowerCase().includes(termo) ||
          c.telefone?.toLowerCase().includes(termo) ||
          c.nome_contato?.toLowerCase().includes(termo)
        );
      })
      .filter((c) => {
        if (filtro === 'parados') return c._diasSemContato !== null && c._diasSemContato >= 5;
        if (filtro === 'vencimento') return c._diasContrato !== null && c._diasContrato >= 0 && c._diasContrato <= 90;
        return true;
      });
  }, [comMetricas, busca, filtro]);

  const alternarFiltro = (valor) => setFiltro((atual) => (atual === valor ? null : valor));

  return (
    <div className="space-y-3">
      {/* Indicadores — clicáveis para filtrar a lista abaixo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          onClick={() => setFiltro(null)}
          className={`text-left bg-white border rounded-lg p-2.5 ${filtro === null ? 'border-blue-400 ring-1 ring-blue-400' : 'border-slate-200'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-500">Total de clientes</span>
            <Clock className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <p className="text-lg font-bold text-blue-600">{clientes.length}</p>
        </button>
        <button
          onClick={() => alternarFiltro('parados')}
          className={`text-left bg-white border rounded-lg p-2.5 ${filtro === 'parados' ? 'border-red-400 ring-1 ring-red-400' : 'border-slate-200'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-500">Parados &gt; 5 dias</span>
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
          </div>
          <p className="text-lg font-bold text-red-600">{totalParados}</p>
        </button>
        <button
          onClick={() => alternarFiltro('vencimento')}
          className={`text-left bg-white border rounded-lg p-2.5 ${filtro === 'vencimento' ? 'border-orange-400 ring-1 ring-orange-400' : 'border-slate-200'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-500">Contratos &lt; 90 dias</span>
            <CalendarClock className="w-3.5 h-3.5 text-orange-500" />
          </div>
          <p className="text-lg font-bold text-orange-600">{totalVencendo}</p>
        </button>
        <div className="text-left bg-white border border-slate-200 rounded-lg p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-500">Em dia</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <p className="text-lg font-bold text-emerald-600">{totalEmDia}</p>
        </div>
      </div>

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
          onClick={() => alternarFiltro('parados')}
          className={`shrink-0 px-2.5 rounded-lg text-[11px] font-bold border ${filtro === 'parados' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-500 border-slate-200'}`}
        >
          &gt;5d
        </button>
        <button
          onClick={() => alternarFiltro('vencimento')}
          className={`shrink-0 px-2.5 rounded-lg text-[11px] font-bold border ${filtro === 'vencimento' ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-slate-500 border-slate-200'}`}
        >
          &lt;90d
        </button>
        <button
          onClick={onNovoCliente}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> Novo
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
        {filtrados.length === 0 && (
          <p className="text-xs text-slate-400 p-4 text-center">Nenhum cliente encontrado.</p>
        )}
        {filtrados.map((c) => (
          <LinhaCliente key={c.id} cliente={c} onAbrir={onSelecionarCliente} onAtualizar={onAtualizar} />
        ))}
      </div>
    </div>
  );
}
