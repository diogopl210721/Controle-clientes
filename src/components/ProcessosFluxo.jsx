import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, Trash2, Edit3, Save, X, ChevronRight, Workflow } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { MOTIVOS, labelMotivo } from '../lib/documentos';

function EtapaCard({ etapa, numero, ultima, onSalvar, onExcluir }) {
  const [editando, setEditando] = useState(false);
  const [titulo, setTitulo] = useState(etapa.titulo);
  const [instrucao, setInstrucao] = useState(etapa.instrucao || '');
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    setSalvando(true);
    await onSalvar(etapa.id, { titulo, instrucao });
    setSalvando(false);
    setEditando(false);
  };

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
          {numero}
        </span>
        {!ultima && <span className="w-0.5 flex-1 bg-slate-200 my-1" />}
      </div>
      <div className="flex-1 pb-4 min-w-0">
        <div className="bg-white border border-slate-200 rounded-xl p-3">
          {editando ? (
            <div className="space-y-2">
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Título da etapa"
                className="w-full text-xs font-bold border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <textarea
                value={instrucao}
                onChange={(e) => setInstrucao(e.target.value)}
                placeholder="Instrução: o que o consultor deve fazer nessa etapa..."
                rows={3}
                className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditando(false)} className="text-[11px] font-semibold text-slate-400 px-2 py-1">
                  Cancelar
                </button>
                <button
                  onClick={salvar}
                  disabled={salvando || !titulo.trim()}
                  className="text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-full disabled:opacity-50 flex items-center gap-1"
                >
                  {salvando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Salvar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800">{etapa.titulo}</p>
                <p className="text-xs text-slate-500 whitespace-pre-line mt-0.5">
                  {etapa.instrucao || <span className="text-slate-300 italic">Sem instrução ainda — clique em editar.</span>}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => setEditando(true)} className="text-slate-300 hover:text-blue-600 p-1">
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => onExcluir(etapa.id)} className="text-slate-300 hover:text-red-500 p-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProcessosFluxo() {
  const [etapas, setEtapas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [motivoAberto, setMotivoAberto] = useState(null);
  const [novoTitulo, setNovoTitulo] = useState('');
  const [salvandoNova, setSalvandoNova] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const { data, error } = await supabase
      .from('processos_etapas')
      .select('*')
      .order('motivo', { ascending: true })
      .order('etapa_numero', { ascending: true });
    if (!error) setEtapas(data || []);
    setCarregando(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const etapasDoMotivo = motivoAberto ? etapas.filter((e) => e.motivo === motivoAberto) : [];

  const adicionarEtapa = async () => {
    if (!novoTitulo.trim() || !motivoAberto) return;
    setSalvandoNova(true);
    const proximoNumero = etapasDoMotivo.length > 0 ? Math.max(...etapasDoMotivo.map((e) => e.etapa_numero)) + 1 : 1;
    const { error } = await supabase
      .from('processos_etapas')
      .insert({ motivo: motivoAberto, etapa_numero: proximoNumero, titulo: novoTitulo.trim() });
    setSalvandoNova(false);
    if (!error) {
      setNovoTitulo('');
      carregar();
    }
  };

  const salvarEtapa = async (id, campos) => {
    await supabase.from('processos_etapas').update(campos).eq('id', id);
    carregar();
  };

  const excluirEtapa = async (id) => {
    await supabase.from('processos_etapas').delete().eq('id', id);
    carregar();
  };

  if (motivoAberto) {
    return (
      <div className="space-y-3">
        <button onClick={() => setMotivoAberto(null)} className="text-xs font-semibold text-blue-600 flex items-center gap-1">
          <X className="w-3.5 h-3.5" /> Voltar para processos
        </button>

        <h3 className="text-sm font-bold text-slate-800">{labelMotivo(motivoAberto)}</h3>

        {carregando && (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
        )}

        {!carregando && (
          <div>
            {etapasDoMotivo.length === 0 && (
              <p className="text-xs text-slate-400 mb-3">Nenhuma etapa cadastrada ainda. Adicione a primeira abaixo.</p>
            )}
            {etapasDoMotivo.map((etapa, i) => (
              <EtapaCard
                key={etapa.id}
                etapa={etapa}
                numero={i + 1}
                ultima={i === etapasDoMotivo.length - 1}
                onSalvar={salvarEtapa}
                onExcluir={excluirEtapa}
              />
            ))}
          </div>
        )}

        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-2 flex gap-2">
          <input
            type="text"
            placeholder="Nome da próxima etapa..."
            value={novoTitulo}
            onChange={(e) => setNovoTitulo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && adicionarEtapa()}
            className="flex-1 text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={adicionarEtapa}
            disabled={salvandoNova || !novoTitulo.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 rounded-lg text-xs font-bold flex items-center gap-1"
          >
            {salvandoNova ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Etapa
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-slate-400 px-0.5">Escolha um processo para ver ou montar o passo a passo.</p>
      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
        {MOTIVOS.map((m) => {
          const total = etapas.filter((e) => e.motivo === m.valor).length;
          return (
            <button
              key={m.valor}
              onClick={() => setMotivoAberto(m.valor)}
              className="w-full text-left px-3 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2.5">
                <Workflow className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-semibold text-slate-700">{m.label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400">{total} etapa{total !== 1 ? 's' : ''}</span>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
