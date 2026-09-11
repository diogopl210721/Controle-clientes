import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, Trash2, Edit3, Save, X, ChevronRight, Workflow } from 'lucide-react';
import { supabase } from '../supabaseClient';

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
  const [categorias, setCategorias] = useState([]);
  const [etapas, setEtapas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [categoriaAberta, setCategoriaAberta] = useState(null); // objeto { id, nome } | null
  const [novoTitulo, setNovoTitulo] = useState('');
  const [salvandoNova, setSalvandoNova] = useState(false);
  const [novoProcesso, setNovoProcesso] = useState('');
  const [salvandoProcesso, setSalvandoProcesso] = useState(false);
  const [editandoNomeId, setEditandoNomeId] = useState(null);
  const [nomeEditado, setNomeEditado] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    const [{ data: cats, error: e1 }, { data: et, error: e2 }] = await Promise.all([
      supabase.from('processos_categorias').select('*').order('ordem', { ascending: true }),
      supabase.from('processos_etapas').select('*').order('categoria_id', { ascending: true }).order('etapa_numero', { ascending: true }),
    ]);
    if (!e1) setCategorias(cats || []);
    if (!e2) setEtapas(et || []);
    setCarregando(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const etapasDaCategoria = categoriaAberta ? etapas.filter((e) => e.categoria_id === categoriaAberta.id) : [];

  const adicionarProcesso = async () => {
    if (!novoProcesso.trim()) return;
    setSalvandoProcesso(true);
    const ordem = categorias.length > 0 ? Math.max(...categorias.map((c) => c.ordem || 0)) + 1 : 1;
    const { error } = await supabase.from('processos_categorias').insert({ nome: novoProcesso.trim(), ordem });
    setSalvandoProcesso(false);
    if (!error) {
      setNovoProcesso('');
      carregar();
    }
  };

  const renomearProcesso = async (id) => {
    if (!nomeEditado.trim()) return;
    await supabase.from('processos_categorias').update({ nome: nomeEditado.trim() }).eq('id', id);
    setEditandoNomeId(null);
    carregar();
  };

  const excluirProcesso = async (id) => {
    if (!window.confirm('Excluir esse processo e todas as etapas dele?')) return;
    await supabase.from('processos_categorias').delete().eq('id', id);
    if (categoriaAberta?.id === id) setCategoriaAberta(null);
    carregar();
  };

  const adicionarEtapa = async () => {
    if (!novoTitulo.trim() || !categoriaAberta) return;
    setSalvandoNova(true);
    const proximoNumero = etapasDaCategoria.length > 0 ? Math.max(...etapasDaCategoria.map((e) => e.etapa_numero)) + 1 : 1;
    const { error } = await supabase
      .from('processos_etapas')
      .insert({ categoria_id: categoriaAberta.id, etapa_numero: proximoNumero, titulo: novoTitulo.trim() });
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

  if (categoriaAberta) {
    return (
      <div className="space-y-3">
        <button onClick={() => setCategoriaAberta(null)} className="text-xs font-semibold text-blue-600 flex items-center gap-1">
          <X className="w-3.5 h-3.5" /> Voltar para processos
        </button>

        <h3 className="text-sm font-bold text-slate-800">{categoriaAberta.nome}</h3>

        {carregando && (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
        )}

        {!carregando && (
          <div>
            {etapasDaCategoria.length === 0 && (
              <p className="text-xs text-slate-400 mb-3">Nenhuma etapa cadastrada ainda. Adicione a primeira abaixo.</p>
            )}
            {etapasDaCategoria.map((etapa, i) => (
              <EtapaCard
                key={etapa.id}
                etapa={etapa}
                numero={i + 1}
                ultima={i === etapasDaCategoria.length - 1}
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
      <p className="text-[11px] text-slate-400 px-0.5">Escolha um processo para ver/montar o passo a passo, edite o nome ou crie um novo.</p>

      {carregando && (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
      )}

      {!carregando && (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
          {categorias.map((cat) => {
            const total = etapas.filter((e) => e.categoria_id === cat.id).length;
            if (editandoNomeId === cat.id) {
              return (
                <div key={cat.id} className="px-3 py-2.5 flex items-center gap-2">
                  <input
                    type="text"
                    value={nomeEditado}
                    onChange={(e) => setNomeEditado(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && renomearProcesso(cat.id)}
                    autoFocus
                    className="flex-1 text-xs font-semibold border border-blue-300 rounded px-2 py-1.5 focus:outline-none"
                  />
                  <button onClick={() => renomearProcesso(cat.id)} className="text-blue-600 p-1"><Save className="w-4 h-4" /></button>
                  <button onClick={() => setEditandoNomeId(null)} className="text-slate-400 p-1"><X className="w-4 h-4" /></button>
                </div>
              );
            }
            return (
              <div key={cat.id} className="px-3 py-3 flex items-center justify-between gap-2 hover:bg-slate-50">
                <button onClick={() => setCategoriaAberta(cat)} className="flex items-center gap-2.5 min-w-0 flex-1 text-left">
                  <Workflow className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="text-xs font-semibold text-slate-700 truncate">{cat.nome}</span>
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-slate-400">{total} etapa{total !== 1 ? 's' : ''}</span>
                  <button onClick={() => { setEditandoNomeId(cat.id); setNomeEditado(cat.nome); }} className="text-slate-300 hover:text-blue-600 p-1">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => excluirProcesso(cat.id)} className="text-slate-300 hover:text-red-500 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setCategoriaAberta(cat)}>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-white border border-dashed border-slate-300 rounded-xl p-2 flex gap-2">
        <input
          type="text"
          placeholder="Nome do novo processo..."
          value={novoProcesso}
          onChange={(e) => setNovoProcesso(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && adicionarProcesso()}
          className="flex-1 text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          onClick={adicionarProcesso}
          disabled={salvandoProcesso || !novoProcesso.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 rounded-lg text-xs font-bold flex items-center gap-1"
        >
          {salvandoProcesso ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Processo
        </button>
      </div>
    </div>
  );
}
