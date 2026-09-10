import React, { useState, useMemo } from 'react';
import { Search, Plus, Send, Loader2, ChevronRight } from 'lucide-react';
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

  const filtrados = useMemo(() => {
    const termo = busca.toLowerCase();
    if (!termo) return clientes;
    return clientes.filter(
      (c) =>
        c.razao_social?.toLowerCase().includes(termo) ||
        c.codigo_cliente?.toLowerCase().includes(termo) ||
        c.nome_fantasia?.toLowerCase().includes(termo) ||
        c.telefone?.toLowerCase().includes(termo) ||
        c.nome_contato?.toLowerCase().includes(termo)
    );
  }, [clientes, busca]);

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
