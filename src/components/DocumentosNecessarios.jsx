import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Plus, Trash2, Loader2, FileText, AlertTriangle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { MOTIVOS, TIPOS_CLIENTE, labelMotivo, labelTipoCliente } from '../lib/documentos';

export default function DocumentosNecessarios() {
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [motivo, setMotivo] = useState(MOTIVOS[0].valor);
  const [tipo, setTipo] = useState(TIPOS_CLIENTE[0].valor);
  const [busca, setBusca] = useState('');
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

  const emBusca = busca.trim().length > 0;

  const resultadosBusca = useMemo(() => {
    if (!emBusca) return [];
    const termo = busca.toLowerCase();
    return itens.filter((i) => i.documento.toLowerCase().includes(termo));
  }, [itens, busca, emBusca]);

  const listaAtual = useMemo(
    () => itens.filter((i) => i.motivo === motivo && i.tipo_cliente === tipo),
    [itens, motivo, tipo]
  );

  const adicionar = async () => {
    if (!novoDocumento.trim()) return;
    setSalvando(true);
    const ordem = listaAtual.length > 0 ? Math.max(...listaAtual.map((i) => i.ordem || 0)) + 1 : 1;
    const { error } = await supabase
      .from('documentos_requisitos')
      .insert({ motivo, tipo_cliente: tipo, documento: novoDocumento.trim(), ordem });
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
          placeholder="Pesquisar um documento (ex: RG, contrato social...)"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full pl-8 pr-2 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      {carregando && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      )}

      {!carregando && emBusca && (
        <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
          {resultadosBusca.length === 0 && (
            <p className="text-xs text-slate-400 p-4 text-center">Nenhum documento encontrado.</p>
          )}
          {resultadosBusca.map((i) => (
            <div key={i.id} className="px-3 py-2">
              <p className="text-xs font-semibold text-slate-800">{i.documento}</p>
              <p className="text-[10px] text-slate-400">{labelMotivo(i.motivo)} · {labelTipoCliente(i.tipo_cliente)}</p>
            </div>
          ))}
        </div>
      )}

      {!carregando && !emBusca && (
        <>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 mb-1">Motivo</p>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {MOTIVOS.map((m) => (
                <button
                  key={m.valor}
                  onClick={() => setMotivo(m.valor)}
                  className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${motivo === m.valor ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-slate-500 mb-1">Tipo de cliente</p>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {TIPOS_CLIENTE.map((t) => (
                <button
                  key={t.valor}
                  onClick={() => setTipo(t.valor)}
                  className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${tipo === t.valor ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                {labelMotivo(motivo)} · {labelTipoCliente(tipo)}
              </h3>
            </div>
            <div className="divide-y divide-slate-100">
              {listaAtual.length === 0 && (
                <p className="text-xs text-slate-400 p-4 text-center">Nenhum documento cadastrado para essa combinação ainda.</p>
              )}
              {listaAtual.map((i) => (
                <div key={i.id} className="px-3 py-2 flex items-center justify-between gap-2">
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
        </>
      )}
    </div>
  );
}
