import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Plus, Trash2, Loader2, FileText, AlertTriangle, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { MOTIVOS, TIPOS_CLIENTE, labelMotivo, labelTipoCliente } from '../lib/documentos';

// Todas as 15 combinações possíveis (motivo x tipo de cliente), com texto de busca já normalizado
const COMBOS = MOTIVOS.flatMap((m) =>
  TIPOS_CLIENTE.map((t) => ({
    motivo: m.valor,
    tipo: t.valor,
    label: `${m.label} · ${t.label}`,
    busca: [m.label, t.label, ...(m.aliases || [])].join(' ').toLowerCase(),
  }))
);

export default function DocumentosNecessarios() {
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [query, setQuery] = useState('');
  const [combo, setCombo] = useState(null); // { motivo, tipo } | null
  const [novoDocumento, setNovoDocumento] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const { data, error } = await supabase
      .from('documentos_requisitos')
      .select('*')
      .order('motivo', { ascending: true })
      .order('ordem', { ascending: true });
    if (!error) setItens(data || []);
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const termo = query.trim().toLowerCase();

  const combosFiltrados = useMemo(() => {
    if (!termo) return COMBOS;
    return COMBOS.filter((c) => c.busca.includes(termo));
  }, [termo]);

  const listaAtual = useMemo(
    () => (combo ? itens.filter((i) => i.motivo === combo.motivo && i.tipo_cliente === combo.tipo) : []),
    [itens, combo]
  );

  const abrirCombo = (c) => {
    setCombo({ motivo: c.motivo, tipo: c.tipo });
    setQuery('');
  };

  const adicionar = async () => {
    if (!novoDocumento.trim() || !combo) return;
    setSalvando(true);
    const ordem = listaAtual.length > 0 ? Math.max(...listaAtual.map((i) => i.ordem || 0)) + 1 : 1;
    const { error } = await supabase
      .from('documentos_requisitos')
      .insert({ motivo: combo.motivo, tipo_cliente: combo.tipo, documento: novoDocumento.trim(), ordem });
    setSalvando(false);
    if (!error) {
      setNovoDocumento('');
      carregar();
    }
  };

  const remover = async (id) => {
    await supabase.from('documentos_requisitos').delete().eq('id', id);
    carregar();
  };

  if (combo) {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setCombo(null)}
          className="text-xs font-semibold text-blue-600 flex items-center gap-1"
        >
          <X className="w-3.5 h-3.5" /> Voltar para a busca
        </button>

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              {labelMotivo(combo.motivo)} · {labelTipoCliente(combo.tipo)}
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {carregando && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            )}
            {!carregando && listaAtual.length === 0 && (
              <p className="text-xs text-slate-400 p-4 text-center">Nenhum documento cadastrado para essa combinação ainda.</p>
            )}
            {listaAtual.map((i) => (
              <div key={i.id} className="px-3 py-2.5 flex items-center justify-between gap-2">
                <p className="text-xs text-slate-700">{i.documento}</p>
                <button onClick={() => remover(i.id)} className="text-slate-300 hover:text-red-500 shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="p-2 border-t border-slate-100 flex gap-2">
            <input
              type="text"
              placeholder="Adicionar documento..."
              value={novoDocumento}
              onChange={(e) => setNovoDocumento(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && adicionar()}
              className="flex-1 p-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
            <button
              onClick={adicionar}
              disabled={salvando}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-2.5 rounded text-xs font-bold flex items-center justify-center"
            >
              {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex gap-2 items-start">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-800">
          Essa lista foi montada a partir da sua planilha impressa — confira e corrija direto aqui qualquer item que estiver errado ou faltando.
        </p>
      </div>

      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          autoFocus
          placeholder="Ex: troca de titularidade - indústrias"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-8 pr-2 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
        {combosFiltrados.length === 0 && (
          <p className="text-xs text-slate-400 p-4 text-center">Nenhum resultado. Tente outro termo.</p>
        )}
        {combosFiltrados.map((c) => (
          <button
            key={`${c.motivo}-${c.tipo}`}
            onClick={() => abrirCombo(c)}
            className="w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-2"
          >
            <span className="text-xs text-slate-700">{c.label}</span>
            <span className="text-[10px] text-slate-400 shrink-0">
              {itens.filter((i) => i.motivo === c.motivo && i.tipo_cliente === c.tipo).length} docs
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
