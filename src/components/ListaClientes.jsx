import React, { useState, useMemo } from 'react';
import { Search, Plus, Send, Loader2, ChevronRight, ChevronDown, Check, Archive, X, ArrowLeft } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { statusInteracao, diasSemInteracao, diasEntre, formatarDataHora } from '../lib/helpers';
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

function ItemAssunto({ item, onMarcar, marcando }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <button
        onClick={() => onMarcar(item, !item.resolvido)}
        disabled={marcando}
        className={`mt-0.5 w-4 h-4 rounded border shrink-0 flex items-center justify-center ${item.resolvido ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-blue-400'}`}
        title={item.resolvido ? 'Reabrir assunto' : 'Marcar como concluído'}
      >
        {item.resolvido && <Check className="w-3 h-3 text-white" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`text-[11px] whitespace-pre-line break-words ${item.resolvido ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
          {item.descricao}
        </p>
        {item.resolvido && item.resolvido_em && (
          <p className="text-[9px] text-emerald-600 font-semibold">Concluído em {formatarDataHora(item.resolvido_em)}</p>
        )}
      </div>
    </div>
  );
}

function LinhaCliente({ cliente: c, onAbrir, onAtualizar }) {
  const [nota, setNota] = useState('');
  const [alvoContinuar, setAlvoContinuar] = useState(''); // '' = novo assunto | id de um assunto aberto
  const [enviando, setEnviando] = useState(false);
  const [marcandoId, setMarcandoId] = useState(null);
  const [salvandoPrioridade, setSalvandoPrioridade] = useState(false);
  const [expandido, setExpandido] = useState(false);
  const [mostrarConcluidos, setMostrarConcluidos] = useState(false);

  const status = statusInteracao(c.acompanhamento?.ultima_interacao);
  const dias = diasSemInteracao(c.acompanhamento?.ultima_interacao);
  const endereco = c.contrato?.endereco_entrega || c.endereco;
  const diasContrato = c.contrato?.data_termino ? diasEntre(c.contrato.data_termino) : null;
  const prioridade = c.acompanhamento?.prioridade || 'normal';

  const abertos = (c.historico || []).filter((h) => !h.resolvido);
  const concluidos = (c.historico || []).filter((h) => h.resolvido);

  const enviar = async () => {
    if (!nota.trim()) return;
    setEnviando(true);
    let error;
    if (alvoContinuar) {
      const atual = abertos.find((h) => h.id === alvoContinuar);
      const novaDescricao = `${atual?.descricao || ''}\n${formatarDataHora(new Date())} — ${nota.trim()}`;
      ({ error } = await supabase.from('historico').update({ descricao: novaDescricao }).eq('id', alvoContinuar));
    } else {
      ({ error } = await supabase.from('historico').insert({ cliente_id: c.id, descricao: nota.trim() }));
    }
    setEnviando(false);
    if (!error) {
      setNota('');
      setAlvoContinuar('');
      setExpandido(true);
      onAtualizar();
    }
  };

  const marcar = async (item, resolvido) => {
    setMarcandoId(item.id);
    const { error } = await supabase
      .from('historico')
      .update({ resolvido, resolvido_em: resolvido ? new Date().toISOString() : null })
      .eq('id', item.id);
    setMarcandoId(null);
    if (!error) onAtualizar();
  };

  const mudarPrioridade = async (valor) => {
    setSalvandoPrioridade(true);
    const { error } = await supabase
      .from('acompanhamento')
      .upsert({ cliente_id: c.id, prioridade: valor, updated_at: new Date().toISOString() }, { onConflict: 'cliente_id' });
    setSalvandoPrioridade(false);
    if (error) console.error('Erro ao salvar prioridade:', error);
    else onAtualizar();
  };

  const [encerrando, setEncerrando] = useState(false);
  const encerrarAtendimento = async () => {
    if (!window.confirm(`Encerrar o atendimento de ${c.razao_social}? Ele vai pra aba Concluídos.`)) return;
    setEncerrando(true);
    const { error } = await supabase
      .from('acompanhamento')
      .upsert({ cliente_id: c.id, encerrado: true, encerrado_em: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: 'cliente_id' });
    setEncerrando(false);
    if (error) console.error('Erro ao encerrar atendimento:', error);
    else onAtualizar();
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
          <p className="text-[10px] text-slate-400 truncate">
            {c.codigo_cliente}{c.nome_fantasia ? ` · ${c.nome_fantasia}` : ''}{c.nome_contato ? ` · ${c.nome_contato}` : ''}
          </p>

          {/* Resumo de assuntos — clique para expandir */}
          <button onClick={() => setExpandido((v) => !v)} className="flex items-center gap-1 mt-1">
            {expandido ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
            {abertos.length > 0 ? (
              <span className="text-[11px] font-semibold text-amber-700">{abertos.length} assunto{abertos.length > 1 ? 's' : ''} em aberto</span>
            ) : (
              <span className="text-[11px] text-emerald-600 font-semibold">Nenhum assunto em aberto</span>
            )}
          </button>

          {expandido && (
            <div className="mt-1 border border-slate-100 rounded-lg bg-slate-50 px-2 divide-y divide-slate-200">
              {abertos.length === 0 && concluidos.length === 0 && (
                <p className="text-[11px] text-slate-400 py-2">Nenhum registro ainda.</p>
              )}
              {abertos.map((item) => (
                <ItemAssunto key={item.id} item={item} onMarcar={marcar} marcando={marcandoId === item.id} />
              ))}

              {concluidos.length > 0 && (
                <div className="py-1">
                  <button
                    onClick={() => setMostrarConcluidos((v) => !v)}
                    className="text-[10px] font-semibold text-slate-400 hover:text-slate-600 py-1"
                  >
                    {mostrarConcluidos ? 'Ocultar' : 'Ver'} concluídos ({concluidos.length})
                  </button>
                  {mostrarConcluidos && (
                    <div className="divide-y divide-slate-200">
                      {concluidos.map((item) => (
                        <ItemAssunto key={item.id} item={item} onMarcar={marcar} marcando={marcandoId === item.id} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Adicionar/continuar assunto direto na lista */}
          <div className="mt-1.5 space-y-1.5" onClick={parar}>
            <div className="flex items-center justify-between gap-1.5">
              {abertos.length > 0 ? (
                <select
                  value={alvoContinuar}
                  onChange={(e) => setAlvoContinuar(e.target.value)}
                  className="min-w-0 flex-1 text-[10px] border border-slate-200 rounded px-1.5 py-1 focus:outline-none"
                >
                  <option value="">+ Novo assunto</option>
                  {abertos.map((h) => (
                    <option key={h.id} value={h.id}>
                      Continuar: {h.descricao.slice(0, 24)}{h.descricao.length > 24 ? '…' : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <span />
              )}
              <select
                value={prioridade}
                onChange={(e) => mudarPrioridade(e.target.value)}
                disabled={salvandoPrioridade}
                className={`shrink-0 text-[10px] font-semibold rounded border px-1.5 py-1 focus:outline-none ${CORES_PRIORIDADE[prioridade]}`}
              >
                {PRIORIDADES.map((p) => (
                  <option key={p.valor} value={p.valor}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder={alvoContinuar ? 'Adicionar atualização...' : 'Escrever novo assunto...'}
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && enviar()}
                className="flex-1 min-w-0 px-2 py-1.5 text-[11px] border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
              <button
                onClick={enviar}
                disabled={enviando || !nota.trim()}
                className="text-blue-600 hover:text-blue-700 disabled:opacity-30 shrink-0 p-1"
              >
                {enviando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </div>
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
            <button
              onClick={encerrarAtendimento}
              disabled={encerrando}
              className="text-slate-300 hover:text-emerald-600 p-0.5 disabled:opacity-40"
              title="Encerrar atendimento"
            >
              {encerrando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => onAbrir(c)} className="text-slate-300 hover:text-slate-600 p-0.5" title="Abrir ficha completa">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ListaClientes({ clientes, onSelecionarCliente, onNovoCliente, onAtualizar, filtro, onMudarFiltro, aba, onMudarAba, consultor, onMudarConsultor, onVoltarDashboard }) {
  const [busca, setBusca] = useState('');

  const ativos = clientes.filter((c) => !c.acompanhamento?.encerrado);
  const concluidos = clientes.filter((c) => c.acompanhamento?.encerrado);

  const comMetricas = useMemo(
    () =>
      ativos.map((c) => ({
        ...c,
        _diasSemContato: diasSemInteracao(c.acompanhamento?.ultima_interacao),
        _diasContrato: c.contrato?.data_termino ? diasEntre(c.contrato.data_termino) : null,
      })),
    [ativos]
  );

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
      .filter((c) => !consultor || c.consultor === consultor)
      .filter((c) => {
        if (filtro === 'parados') return c._diasSemContato !== null && c._diasSemContato >= 5;
        if (filtro === 'vencimento') return c._diasContrato !== null && c._diasContrato >= 0 && c._diasContrato <= 90;
        return true;
      });
  }, [comMetricas, busca, filtro, consultor]);

  const concluidosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase();
    return concluidos
      .filter((c) => !consultor || c.consultor === consultor)
      .filter((c) => {
        if (!termo) return true;
        return (
          c.razao_social?.toLowerCase().includes(termo) ||
          c.codigo_cliente?.toLowerCase().includes(termo) ||
          c.nome_fantasia?.toLowerCase().includes(termo)
        );
      });
  }, [concluidos, busca, consultor]);

  const reabrir = async (c) => {
    const { error } = await supabase
      .from('acompanhamento')
      .upsert({ cliente_id: c.id, encerrado: false, encerrado_em: null, updated_at: new Date().toISOString() }, { onConflict: 'cliente_id' });
    if (error) console.error('Erro ao reabrir atendimento:', error);
    else onAtualizar();
  };

  const rotuloFiltro = filtro === 'parados' ? 'Parados > 5 dias' : filtro === 'vencimento' ? 'Contratos < 90 dias' : null;

  return (
    <div className="space-y-3">
      {consultor && (
        <div className="bg-blue-600 text-white rounded-2xl p-3 flex items-center justify-between gap-2 shadow-sm shadow-blue-600/30">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-blue-100 uppercase tracking-wide">Atendimentos de</p>
            <p className="text-sm font-bold truncate">{consultor}</p>
          </div>
          <button
            onClick={onVoltarDashboard}
            className="shrink-0 text-[11px] font-bold bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </button>
        </div>
      )}

      {/* Abas */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 border border-slate-100">
        <button
          onClick={() => onMudarAba('ativos')}
          className={`flex-1 text-xs font-bold py-2 rounded-xl transition-all ${aba === 'ativos' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
        >
          Em andamento ({ativos.length})
        </button>
        <button
          onClick={() => onMudarAba('concluidos')}
          className={`flex-1 text-xs font-bold py-2 rounded-xl transition-all ${aba === 'concluidos' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
        >
          Concluídos ({concluidos.length})
        </button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por código, cliente, fantasia, telefone..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-2 py-2.5 text-xs bg-white border border-slate-200 rounded-full shadow-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:outline-none"
          />
        </div>
        <button
          onClick={onNovoCliente}
          className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-full text-xs font-bold flex items-center gap-1 shrink-0 shadow-sm shadow-blue-600/30 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Novo
        </button>
      </div>

      {rotuloFiltro && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => onMudarFiltro(null)}
            className="text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-1 flex items-center gap-1"
          >
            {rotuloFiltro} <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {aba === 'ativos' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-100 overflow-hidden">
          {filtrados.length === 0 && (
            <p className="text-xs text-slate-400 p-4 text-center">Nenhum cliente encontrado.</p>
          )}
          {filtrados.map((c) => (
            <LinhaCliente key={c.id} cliente={c} onAbrir={onSelecionarCliente} onAtualizar={onAtualizar} />
          ))}
        </div>
      )}

      {aba === 'concluidos' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-100 overflow-hidden">
          {concluidosFiltrados.length === 0 && (
            <p className="text-xs text-slate-400 p-4 text-center">Nenhum atendimento concluído ainda.</p>
          )}
          {concluidosFiltrados.map((c) => (
            <div key={c.id} className="px-3.5 py-3 flex items-center gap-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-700 truncate">{c.razao_social}</p>
                <p className="text-[10px] text-slate-400 truncate">
                  {c.codigo_cliente}{c.nome_fantasia ? ` · ${c.nome_fantasia}` : ''} · Encerrado em {formatarDataHora(c.acompanhamento?.encerrado_em)}
                </p>
              </div>
              <button onClick={() => reabrir(c)} className="text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-full shrink-0 transition-colors">
                Reabrir
              </button>
              <button onClick={() => onSelecionarCliente(c)} className="text-slate-300 hover:text-slate-600 p-0.5 shrink-0">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
