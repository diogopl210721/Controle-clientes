import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Search,
  Phone,
  MapPin,
  Navigation,
  Send,
  Calendar,
  Database,
  Plus,
  LayoutDashboard,
  X,
  Loader2,
  Pencil,
  Check,
  Trash2
} from 'lucide-react';
import { supabase } from './supabaseClient';

const MS_DIA = 1000 * 60 * 60 * 24;

function diasEntre(dataA, dataB) {
  return Math.ceil((new Date(dataA) - new Date(dataB)) / MS_DIA);
}

export default function CRMAtendimentoSlim() {
  const [atendimentos, setAtendimentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const [abaAtiva, setAbaAtiva] = useState('em_andamento'); // 'em_andamento' | 'concluido'
  const [busca, setBusca] = useState('');
  const [filtroModo, setFiltroModo] = useState('todos'); // 'todos' | 'critico' | 'contrato'
  const [atendimentoSelecionado, setAtendimentoSelecionado] = useState(null);
  const [novaEvolucao, setNovaEvolucao] = useState('');
  const [salvandoEvolucao, setSalvandoEvolucao] = useState(false);
  const [editandoHistoricoId, setEditandoHistoricoId] = useState(null);
  const [textoEdicao, setTextoEdicao] = useState('');
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [salvandoNovo, setSalvandoNovo] = useState(false);
  const [novoCliente, setNovoCliente] = useState({
    codigo_cliente: '',
    razao_social: '',
    nome_contato: '',
    telefone: '',
    endereco: '',
    tipo_tanque: '',
    consumo_medio: '',
    data_inicio_contrato: '',
    data_fim_contrato: ''
  });
  // Data de abertura do ATENDIMENTO (não do cliente) — em branco = usa "agora".
  // Existe para cadastrar casos que já estavam em andamento antes de o sistema entrar no ar,
  // mantendo o contador de "dias em aberto" correto desde o início real da ocorrência.
  const [dataAberturaManual, setDataAberturaManual] = useState('');
  const [novoAssunto, setNovoAssunto] = useState('');

  // Edição de um atendimento/cliente já cadastrado
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [salvandoEdicaoCadastro, setSalvandoEdicaoCadastro] = useState(false);
  const [atendimentoEmEdicao, setAtendimentoEmEdicao] = useState(null);
  const [dadosEdicao, setDadosEdicao] = useState({
    codigo_cliente: '',
    razao_social: '',
    nome_contato: '',
    telefone: '',
    endereco: '',
    tipo_tanque: '',
    consumo_medio: '',
    data_inicio_contrato: '',
    data_fim_contrato: '',
    assunto: ''
  });

  // -------------------------------------------------------
  // Busca dados reais no Supabase (clientes + atendimentos + histórico)
  // -------------------------------------------------------
  const carregarDados = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    const { data, error } = await supabase
      .from('atendimentos')
      .select(`
        id,
        status,
        created_at,
        concluido_em,
        cliente_id,
        assunto,
        clientes ( * ),
        historico_atendimento ( id, descricao, created_at )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      setErro('Não foi possível carregar os dados do Supabase. Confira a URL/anon key em supabaseClient.js.');
      setCarregando(false);
      return;
    }

    const normalizados = (data || []).map((a) => ({
      id: a.id,
      clienteId: a.cliente_id,
      status: a.status,
      createdAt: a.created_at,
      concluidoEm: a.concluido_em,
      assunto: a.assunto ?? '',
      codigo: a.clientes?.codigo_cliente ?? '—',
      razaoSocial: a.clientes?.razao_social ?? 'Cliente sem cadastro',
      contato: a.clientes?.nome_contato ?? '',
      telefone: a.clientes?.telefone ?? '',
      endereco: a.clientes?.endereco ?? '',
      tipoTanque: a.clientes?.tipo_tanque ?? '',
      consumo: a.clientes?.consumo_medio ?? '',
      inicioContrato: a.clientes?.data_inicio_contrato ?? null,
      fimContrato: a.clientes?.data_fim_contrato ?? null,
      historico: (a.historico_atendimento || [])
        .slice()
        .sort((h1, h2) => new Date(h2.created_at) - new Date(h1.created_at))
        .map((h) => ({
          id: h.id,
          data: new Date(h.created_at).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
          }),
          texto: h.descricao
        }))
    }));

    setAtendimentos(normalizados);
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // -------------------------------------------------------
  // Métricas do Dashboard (diasAberto calculado dinamicamente)
  // -------------------------------------------------------
  const agora = new Date();

  const comDiasCalculados = atendimentos.map((a) => ({
    ...a,
    diasAberto: Math.max(0, Math.floor((agora - new Date(a.createdAt)) / MS_DIA)),
    diasParaVencer: a.fimContrato ? diasEntre(a.fimContrato, agora) : null
  }));

  const totalEmAndamento = comDiasCalculados.filter(a => a.status === 'em_andamento').length;
  const totalCriticos = comDiasCalculados.filter(a => a.status === 'em_andamento' && a.diasAberto > 5).length;
  const totalConcluidos = comDiasCalculados.filter(a => a.status === 'concluido').length;
  const contratosVencendo = comDiasCalculados.filter(
    a => a.diasParaVencer !== null && a.diasParaVencer <= 90 && a.diasParaVencer >= 0
  );

  const listaExibida = comDiasCalculados
    .filter(a => a.status === abaAtiva)
    .filter(a => {
      if (filtroModo === 'critico') return a.diasAberto > 5;
      if (filtroModo === 'contrato') return a.diasParaVencer !== null && a.diasParaVencer <= 90 && a.diasParaVencer >= 0;
      return true;
    })
    .filter(a =>
      a.razaoSocial.toLowerCase().includes(busca.toLowerCase()) ||
      a.codigo.toLowerCase().includes(busca.toLowerCase()) ||
      a.contato.toLowerCase().includes(busca.toLowerCase())
    );

  // -------------------------------------------------------
  // Ações que gravam de verdade no Supabase
  // -------------------------------------------------------
  const handleAdicionarEvolucao = async () => {
    if (!novaEvolucao.trim() || !atendimentoSelecionado) return;
    setSalvandoEvolucao(true);

    const { data, error } = await supabase
      .from('historico_atendimento')
      .insert({ atendimento_id: atendimentoSelecionado.id, descricao: novaEvolucao })
      .select()
      .single();

    setSalvandoEvolucao(false);
    if (error) {
      console.error(error);
      alert('Erro ao salvar evolução. Veja o console.');
      return;
    }

    const novoItem = {
      id: data.id,
      data: new Date(data.created_at).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
      }),
      texto: data.descricao
    };

    setAtendimentos(prev => prev.map(item =>
      item.id === atendimentoSelecionado.id
        ? { ...item, historico: [novoItem, ...item.historico] }
        : item
    ));
    setAtendimentoSelecionado(prev => ({ ...prev, historico: [novoItem, ...prev.historico] }));
    setNovaEvolucao('');
  };

  const handleConcluirAtendimento = async (id) => {
    const agoraIso = new Date().toISOString();
    const { error } = await supabase
      .from('atendimentos')
      .update({ status: 'concluido', concluido_em: agoraIso })
      .eq('id', id);

    if (error) {
      console.error(error);
      alert('Erro ao concluir atendimento. Veja o console.');
      return;
    }

    setAtendimentos(prev => prev.map(item =>
      item.id === id ? { ...item, status: 'concluido', concluidoEm: agoraIso } : item
    ));
    setAtendimentoSelecionado(null);
  };

  const handleReabrirAtendimento = async (id) => {
    const { error } = await supabase
      .from('atendimentos')
      .update({ status: 'em_andamento', concluido_em: null })
      .eq('id', id);

    if (error) {
      console.error(error);
      alert('Erro ao reabrir atendimento. Veja o console.');
      return;
    }

    setAtendimentos(prev => prev.map(item =>
      item.id === id ? { ...item, status: 'em_andamento', concluidoEm: null } : item
    ));
    setAtendimentoSelecionado(prev => prev ? { ...prev, status: 'em_andamento', concluidoEm: null } : prev);
  };

  const handleEditarEvolucao = async (historicoId, novoTexto) => {
    const { error } = await supabase
      .from('historico_atendimento')
      .update({ descricao: novoTexto })
      .eq('id', historicoId);

    if (error) {
      console.error(error);
      alert('Erro ao salvar a edição. Veja o console.');
      return false;
    }

    const atualizarHistorico = (historico) =>
      historico.map(h => h.id === historicoId ? { ...h, texto: novoTexto } : h);

    setAtendimentos(prev => prev.map(item =>
      item.id === atendimentoSelecionado.id
        ? { ...item, historico: atualizarHistorico(item.historico) }
        : item
    ));
    setAtendimentoSelecionado(prev => prev ? { ...prev, historico: atualizarHistorico(prev.historico) } : prev);
    return true;
  };

  const handleExcluirAtendimento = async (id) => {
    if (!window.confirm('Excluir este atendimento e todo o seu histórico? Essa ação não pode ser desfeita.')) return;

    const { error } = await supabase
      .from('atendimentos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(error);
      alert('Erro ao excluir o atendimento. Veja o console.');
      return;
    }

    setAtendimentos(prev => prev.filter(item => item.id !== id));
    setAtendimentoSelecionado(null);
  };

  const handleExcluirEvolucao = async (historicoId) => {
    if (!window.confirm('Excluir este registro do histórico? Essa ação não pode ser desfeita.')) return;

    const { error } = await supabase
      .from('historico_atendimento')
      .delete()
      .eq('id', historicoId);

    if (error) {
      console.error(error);
      alert('Erro ao excluir o registro. Veja o console.');
      return;
    }

    const removerDoHistorico = (historico) => historico.filter(h => h.id !== historicoId);

    setAtendimentos(prev => prev.map(item =>
      item.id === atendimentoSelecionado.id
        ? { ...item, historico: removerDoHistorico(item.historico) }
        : item
    ));
    setAtendimentoSelecionado(prev => prev ? { ...prev, historico: removerDoHistorico(prev.historico) } : prev);
  };

  const handleCriarClienteEAtendimento = async () => {
    if (!novoCliente.codigo_cliente.trim() || !novoCliente.razao_social.trim()) {
      alert('Preencha ao menos o código e a razão social.');
      return;
    }
    setSalvandoNovo(true);

    const { data: clienteCriado, error: erroCliente } = await supabase
      .from('clientes')
      .insert(novoCliente)
      .select()
      .single();

    if (erroCliente) {
      console.error(erroCliente);
      setSalvandoNovo(false);
      alert('Erro ao criar cliente. Veja o console.');
      return;
    }

    const payloadAtendimento = { cliente_id: clienteCriado.id, status: 'em_andamento', assunto: novoAssunto };
    // Se o usuário informou uma data de abertura (caso de atendimento que já existia
    // antes do sistema), usamos ela no lugar do "agora" padrão do banco.
    if (dataAberturaManual) {
      payloadAtendimento.created_at = new Date(dataAberturaManual).toISOString();
    }

    const { error: erroAtendimento } = await supabase
      .from('atendimentos')
      .insert(payloadAtendimento);

    setSalvandoNovo(false);

    if (erroAtendimento) {
      console.error(erroAtendimento);
      alert('Cliente criado, mas houve erro ao abrir o atendimento. Veja o console.');
      return;
    }

    setModalNovoAberto(false);
    setNovoCliente({
      codigo_cliente: '', razao_social: '', nome_contato: '', telefone: '',
      endereco: '', tipo_tanque: '', consumo_medio: '', data_inicio_contrato: '', data_fim_contrato: ''
    });
    setDataAberturaManual('');
    setNovoAssunto('');
    carregarDados();
  };

  const handleAbrirEdicao = (atendimento) => {
    setAtendimentoEmEdicao(atendimento);
    setDadosEdicao({
      codigo_cliente: atendimento.codigo === '—' ? '' : atendimento.codigo,
      razao_social: atendimento.razaoSocial === 'Cliente sem cadastro' ? '' : atendimento.razaoSocial,
      nome_contato: atendimento.contato || '',
      telefone: atendimento.telefone || '',
      endereco: atendimento.endereco || '',
      tipo_tanque: atendimento.tipoTanque || '',
      consumo_medio: atendimento.consumo || '',
      data_inicio_contrato: atendimento.inicioContrato || '',
      data_fim_contrato: atendimento.fimContrato || '',
      assunto: atendimento.assunto || ''
    });
    setModalEditarAberto(true);
  };

  const handleSalvarEdicaoCadastro = async () => {
    if (!atendimentoEmEdicao) return;
    setSalvandoEdicaoCadastro(true);

    const { assunto, ...camposCliente } = dadosEdicao;

    const { error: erroCliente } = await supabase
      .from('clientes')
      .update(camposCliente)
      .eq('id', atendimentoEmEdicao.clienteId);

    const { error: erroAtendimento } = await supabase
      .from('atendimentos')
      .update({ assunto })
      .eq('id', atendimentoEmEdicao.id);

    setSalvandoEdicaoCadastro(false);

    if (erroCliente || erroAtendimento) {
      console.error(erroCliente || erroAtendimento);
      alert('Erro ao salvar as alterações. Veja o console.');
      return;
    }

    setAtendimentos(prev => prev.map(item =>
      item.id === atendimentoEmEdicao.id
        ? {
            ...item,
            codigo: camposCliente.codigo_cliente,
            razaoSocial: camposCliente.razao_social,
            contato: camposCliente.nome_contato,
            telefone: camposCliente.telefone,
            endereco: camposCliente.endereco,
            tipoTanque: camposCliente.tipo_tanque,
            consumo: camposCliente.consumo_medio,
            inicioContrato: camposCliente.data_inicio_contrato || null,
            fimContrato: camposCliente.data_fim_contrato || null,
            assunto
          }
        : item
    ));

    setModalEditarAberto(false);
    setAtendimentoEmEdicao(null);
  };

  // -------------------------------------------------------
  // Estados de carregamento / erro
  // -------------------------------------------------------
  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-500 text-sm gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando dados do Supabase...
      </div>
    );
  }

  if (erro) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 text-red-600 text-sm p-6 text-center">
        {erro}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans text-xs md:text-sm">

      {/* Topo / Header Compacto */}
      <header className="bg-slate-900 text-white p-3 shadow border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex justify-between items-center px-1">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-blue-400" />
            <h1 className="font-bold tracking-tight text-sm md:text-base">CRM Clientes</h1>
          </div>
          <button
            onClick={() => setModalNovoAberto(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Novo Cliente
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-3 md:p-5 space-y-4">

        {/* 1. Dashboard (4 Métricas clicáveis) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
          <button
            onClick={() => { setAbaAtiva('em_andamento'); setFiltroModo('todos'); }}
            className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between text-left hover:border-blue-300 hover:shadow transition-all"
          >
            <span className="text-[11px] font-medium text-slate-500">Em Andamento</span>
            <div className="flex justify-between items-end mt-1">
              <span className="text-xl md:text-2xl font-bold text-blue-600">{totalEmAndamento}</span>
              <Clock className="w-4 h-4 text-blue-500 hidden sm:block" />
            </div>
          </button>

          <button
            onClick={() => { setAbaAtiva('em_andamento'); setFiltroModo('critico'); }}
            className={`p-3 rounded-lg border shadow-sm flex flex-col justify-between text-left hover:shadow transition-all ${totalCriticos > 0 ? 'bg-red-50/60 border-red-200 hover:border-red-300' : 'bg-white border-slate-200 hover:border-red-200'}`}
          >
            <span className={`text-[11px] font-medium ${totalCriticos > 0 ? 'text-red-600' : 'text-slate-500'}`}>Parados &gt; 5 Dias</span>
            <div className="flex justify-between items-end mt-1">
              <span className={`text-xl md:text-2xl font-bold ${totalCriticos > 0 ? 'text-red-600' : 'text-slate-700'}`}>{totalCriticos}</span>
              <AlertTriangle className={`w-4 h-4 hidden sm:block ${totalCriticos > 0 ? 'text-red-500' : 'text-slate-400'}`} />
            </div>
          </button>

          <button
            onClick={() => { setAbaAtiva('em_andamento'); setFiltroModo('contrato'); }}
            className={`p-3 rounded-lg border shadow-sm flex flex-col justify-between text-left hover:shadow transition-all ${contratosVencendo.length > 0 ? 'bg-amber-50/60 border-amber-200 hover:border-amber-300' : 'bg-white border-slate-200 hover:border-amber-200'}`}
          >
            <span className={`text-[11px] font-medium ${contratosVencendo.length > 0 ? 'text-amber-700' : 'text-slate-500'}`}>Contratos &lt; 90 dias</span>
            <div className="flex justify-between items-end mt-1">
              <span className={`text-xl md:text-2xl font-bold ${contratosVencendo.length > 0 ? 'text-amber-700' : 'text-slate-700'}`}>{contratosVencendo.length}</span>
              <Calendar className={`w-4 h-4 hidden sm:block ${contratosVencendo.length > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
            </div>
          </button>

          <button
            onClick={() => { setAbaAtiva('concluido'); setFiltroModo('todos'); }}
            className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between text-left hover:border-emerald-300 hover:shadow transition-all"
          >
            <span className="text-[11px] font-medium text-slate-500">Concluídos</span>
            <div className="flex justify-between items-end mt-1">
              <span className="text-xl md:text-2xl font-bold text-emerald-600">{totalConcluidos}</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500 hidden sm:block" />
            </div>
          </button>
        </div>

        {/* 2. Abas e Barra de Pesquisa */}
        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row gap-2 justify-between items-center">

          <div className="flex bg-slate-100 p-1 rounded-md w-full md:w-auto">
            <button
              onClick={() => { setAbaAtiva('em_andamento'); setFiltroModo('todos'); }}
              className={`flex-1 md:flex-initial px-3 py-1 rounded text-xs font-semibold transition-all ${abaAtiva === 'em_andamento' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              Atendimentos
            </button>
            <button
              onClick={() => { setAbaAtiva('concluido'); setFiltroModo('todos'); }}
              className={`flex-1 md:flex-initial px-3 py-1 rounded text-xs font-semibold transition-all ${abaAtiva === 'concluido' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              Concluídos ({totalConcluidos})
            </button>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar cliente ou código..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {abaAtiva === 'em_andamento' && (
              <div className="flex gap-1">
                <button
                  onClick={() => setFiltroModo(filtroModo === 'critico' ? 'todos' : 'critico')}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 border transition-all ${filtroModo === 'critico' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-600 border-slate-200'}`}
                >
                  🚨 &gt;5d
                </button>
                <button
                  onClick={() => setFiltroModo(filtroModo === 'contrato' ? 'todos' : 'contrato')}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 border transition-all ${filtroModo === 'contrato' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-600 border-slate-200'}`}
                >
                  📅 &lt;90d
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 3. Lista de Atendimentos */}
        <div className="space-y-2">
          {listaExibida.length === 0 ? (
            <div className="bg-white p-8 text-center text-slate-400 rounded-lg border border-slate-200">
              Nenhum atendimento encontrado.
            </div>
          ) : (
            listaExibida.map((cliente) => {
              const isCritico = cliente.diasAberto > 5 && cliente.status === 'em_andamento';
              const alertaContrato = cliente.diasParaVencer !== null && cliente.diasParaVencer <= 90;

              return (
                <div
                  key={cliente.id}
                  className={`bg-white rounded-lg border p-3 shadow-sm transition-all ${
                    isCritico
                      ? 'border-l-4 border-l-red-500 border-red-100'
                      : (alertaContrato && cliente.status === 'em_andamento')
                        ? 'border-l-4 border-l-amber-400 border-amber-100 bg-amber-50/30'
                        : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-col md:flex-row justify-between gap-2">

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                          {cliente.codigo}
                        </span>
                        <h3 className="font-bold text-slate-800 text-sm">{cliente.razaoSocial}</h3>
                      </div>

                      {cliente.assunto && (
                        <p className="text-slate-600 text-xs italic">💬 {cliente.assunto}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500 text-xs">
                        <span>👤 {cliente.contato}</span>
                        {cliente.telefone && (
                          <a
                            href={`https://wa.me/${cliente.telefone}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-600 font-medium hover:underline inline-flex items-center gap-0.5"
                          >
                            <Phone className="w-3 h-3" /> WhatsApp
                          </a>
                        )}
                      </div>

                      {cliente.endereco && (
                        <div className="flex flex-wrap items-center gap-1.5 text-slate-500 text-[11px] pt-1">
                          <span className="truncate max-w-[250px]" title={cliente.endereco}>📍 {cliente.endereco}</span>
                          <div className="flex gap-1 ml-1">
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cliente.endereco)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-0.5"
                            >
                              <MapPin className="w-2.5 h-2.5" /> Maps
                            </a>
                            <a
                              href={`https://waze.com/ul?q=${encodeURIComponent(cliente.endereco)}&navigate=yes`}
                              target="_blank"
                              rel="noreferrer"
                              className="bg-sky-50 hover:bg-sky-100 text-sky-600 px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-0.5"
                            >
                              <Navigation className="w-2.5 h-2.5" /> Waze
                            </a>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-100 pt-2 md:pt-0 md:pl-4 space-y-1 min-w-[200px]">
                      <div className="flex justify-between md:flex-col text-xs">
                        <span className="font-semibold text-slate-700">{cliente.tipoTanque}</span>
                        <span className="text-slate-500">{cliente.consumo}</span>
                      </div>

                      {cliente.diasParaVencer !== null && (
                        <div>
                          <div className="flex justify-between text-[10px] mb-0.5 font-medium">
                            <span className="text-slate-400">Contrato</span>
                            <span className={alertaContrato ? 'text-amber-600 font-bold' : 'text-slate-500'}>
                              {cliente.diasParaVencer}d restantes
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${alertaContrato ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.max(5, Math.min(100, (cliente.diasParaVencer / 365) * 100))}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex md:flex-col justify-between items-center md:items-end border-t md:border-t-0 md:border-l border-slate-100 pt-2 md:pt-0 md:pl-3 min-w-[120px]">
                      {cliente.status === 'em_andamento' ? (
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold inline-flex items-center gap-1 ${isCritico ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-slate-100 text-slate-600'}`}>
                          <Clock className="w-3 h-3" /> {cliente.diasAberto}d aberto
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          Concluído {cliente.concluidoEm ? `em ${new Date(cliente.concluidoEm).toLocaleDateString('pt-BR')}` : ''}
                        </span>
                      )}

                      <button
                        onClick={() => setAtendimentoSelecionado(cliente)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-bold transition-all shadow-sm"
                      >
                        {cliente.status === 'em_andamento' ? 'Evolução / Ver' : 'Ver Histórico'}
                      </button>
                      <button
                        onClick={() => handleAbrirEdicao(cliente)}
                        className="text-slate-400 hover:text-blue-600 flex items-center gap-1 text-[11px] font-medium"
                        title="Editar dados cadastrados"
                      >
                        <Pencil className="w-3 h-3" /> Editar cadastro
                      </button>
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>

      </main>

      <footer className="text-center text-[10px] text-slate-400 py-4">
        © {new Date().getFullYear()} Diogo Soares. Todos os direitos reservados.
      </footer>

      {/* Drawer Lateral de Histórico e Evolução */}
      {atendimentoSelecionado && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-end z-50">
          <div className="bg-white w-full max-w-md h-full shadow-xl flex flex-col justify-between">

            <div className="p-3 border-b border-slate-200 bg-slate-50 flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-blue-600 font-mono">{atendimentoSelecionado.codigo}</span>
                <h2 className="font-bold text-slate-800 text-sm leading-tight">{atendimentoSelecionado.razaoSocial}</h2>
              </div>
              <button
                onClick={() => { setAtendimentoSelecionado(null); setEditandoHistoricoId(null); }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-3 py-2 border-b border-slate-100 bg-white flex justify-end">
              <button
                onClick={() => handleExcluirAtendimento(atendimentoSelecionado.id)}
                className="text-[11px] text-red-500 hover:text-red-700 flex items-center gap-1 font-medium"
              >
                <Trash2 className="w-3 h-3" /> Excluir este atendimento
              </button>
            </div>

            {atendimentoSelecionado.status === 'em_andamento' && (
              <div className="p-3 border-b border-slate-100 bg-white space-y-2">
                <textarea
                  rows={2}
                  value={novaEvolucao}
                  onChange={(e) => setNovaEvolucao(e.target.value)}
                  placeholder="Escreva o andamento da ocorrência..."
                  className="w-full p-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
                <div className="flex justify-between items-center">
                  <button
                    onClick={handleAdicionarEvolucao}
                    disabled={salvandoEvolucao}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1 rounded text-xs font-bold flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" /> {salvandoEvolucao ? 'Salvando...' : 'Registrar'}
                  </button>
                  <button
                    onClick={() => handleConcluirAtendimento(atendimentoSelecionado.id)}
                    className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 px-3 py-1 rounded text-xs font-bold flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3" /> Dar como Concluído
                  </button>
                </div>
              </div>
            )}

            {atendimentoSelecionado.status === 'concluido' && (
              <div className="p-3 border-b border-slate-100 bg-white flex justify-between items-center">
                <span className="text-[11px] text-slate-500">
                  Concluído {atendimentoSelecionado.concluidoEm ? `em ${new Date(atendimentoSelecionado.concluidoEm).toLocaleDateString('pt-BR')}` : ''}
                </span>
                <button
                  onClick={() => handleReabrirAtendimento(atendimentoSelecionado.id)}
                  className="bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 px-3 py-1 rounded text-xs font-bold flex items-center gap-1"
                >
                  <Clock className="w-3 h-3" /> Reabrir Atendimento
                </button>
              </div>
            )}

            <div className="p-3 flex-1 overflow-y-auto space-y-2 bg-slate-50">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Histórico de Registros</span>
              {atendimentoSelecionado.historico.length === 0 && (
                <p className="text-xs text-slate-400">Nenhum registro ainda.</p>
              )}
              {atendimentoSelecionado.historico.map((h) => (
                <div key={h.id} className="bg-white p-2.5 rounded border border-slate-200 space-y-1 shadow-2xs">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>{h.data}</span>
                    {editandoHistoricoId !== h.id && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setEditandoHistoricoId(h.id); setTextoEdicao(h.texto); }}
                          className="text-slate-300 hover:text-blue-500"
                          title="Editar registro"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleExcluirEvolucao(h.id)}
                          className="text-slate-300 hover:text-red-500"
                          title="Excluir registro"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {editandoHistoricoId === h.id ? (
                    <div className="space-y-1.5">
                      <textarea
                        rows={2}
                        value={textoEdicao}
                        onChange={(e) => setTextoEdicao(e.target.value)}
                        className="w-full p-1.5 border border-blue-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditandoHistoricoId(null)}
                          className="text-[11px] text-slate-400 hover:text-slate-600 px-2 py-0.5"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={async () => {
                            setSalvandoEdicao(true);
                            const ok = await handleEditarEvolucao(h.id, textoEdicao);
                            setSalvandoEdicao(false);
                            if (ok) setEditandoHistoricoId(null);
                          }}
                          disabled={salvandoEdicao || !textoEdicao.trim()}
                          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" /> {salvandoEdicao ? 'Salvando...' : 'Salvar'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-700">{h.texto}</p>
                  )}
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* Modal de Novo Cliente / Atendimento */}
      {modalNovoAberto && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h2 className="font-bold text-slate-800 text-sm">Novo Cliente / Atendimento</h2>
              <button onClick={() => { setModalNovoAberto(false); setDataAberturaManual(''); setNovoAssunto(''); }} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 space-y-2">
              {[
                ['codigo_cliente', 'Código do Cliente *'],
                ['razao_social', 'Razão Social *'],
                ['nome_contato', 'Nome do Contato'],
                ['telefone', 'Telefone (formato 5541999999999)'],
                ['endereco', 'Endereço'],
                ['tipo_tanque', 'Tipo de Tanque'],
                ['consumo_medio', 'Consumo Médio']
              ].map(([campo, label]) => (
                <div key={campo}>
                  <label className="text-[11px] font-medium text-slate-500 block mb-0.5">{label}</label>
                  <input
                    type="text"
                    value={novoCliente[campo]}
                    onChange={(e) => setNovoCliente(prev => ({ ...prev, [campo]: e.target.value }))}
                    className="w-full p-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              ))}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Início do Contrato</label>
                  <input
                    type="date"
                    value={novoCliente.data_inicio_contrato}
                    onChange={(e) => setNovoCliente(prev => ({ ...prev, data_inicio_contrato: e.target.value }))}
                    className="w-full p-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Fim do Contrato</label>
                  <input
                    type="date"
                    value={novoCliente.data_fim_contrato}
                    onChange={(e) => setNovoCliente(prev => ({ ...prev, data_fim_contrato: e.target.value }))}
                    className="w-full p-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-1 border-t border-slate-100 mt-1">
                <label className="text-[11px] font-medium text-slate-500 block mb-0.5">
                  Assunto deste atendimento
                </label>
                <input
                  type="text"
                  placeholder="Ex: Vazamento no tanque, troca de manômetro..."
                  value={novoAssunto}
                  onChange={(e) => setNovoAssunto(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-500 block mb-0.5">
                  Data de abertura deste atendimento
                </label>
                <input
                  type="date"
                  value={dataAberturaManual}
                  onChange={(e) => setDataAberturaManual(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Deixe em branco para usar a data de hoje. Use isso para lançar atendimentos
                  que já estavam em andamento antes de você começar a usar o sistema — o
                  contador de "dias aberto" vai contar a partir dessa data, não da data do cadastro.
                </p>
              </div>
            </div>

            <div className="p-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => { setModalNovoAberto(false); setDataAberturaManual(''); setNovoAssunto(''); }}
                className="px-3 py-1.5 rounded text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleCriarClienteEAtendimento}
                disabled={salvandoNovo}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded text-xs font-bold"
              >
                {salvandoNovo ? 'Salvando...' : 'Criar e Abrir Atendimento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Cadastro (dados do cliente + assunto do atendimento) */}
      {modalEditarAberto && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h2 className="font-bold text-slate-800 text-sm">Editar Cadastro</h2>
              <button
                onClick={() => { setModalEditarAberto(false); setAtendimentoEmEdicao(null); }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 space-y-2">
              {[
                ['codigo_cliente', 'Código do Cliente *'],
                ['razao_social', 'Razão Social *'],
                ['nome_contato', 'Nome do Contato'],
                ['telefone', 'Telefone (formato 5541999999999)'],
                ['endereco', 'Endereço'],
                ['tipo_tanque', 'Tipo de Tanque'],
                ['consumo_medio', 'Consumo Médio']
              ].map(([campo, label]) => (
                <div key={campo}>
                  <label className="text-[11px] font-medium text-slate-500 block mb-0.5">{label}</label>
                  <input
                    type="text"
                    value={dadosEdicao[campo]}
                    onChange={(e) => setDadosEdicao(prev => ({ ...prev, [campo]: e.target.value }))}
                    className="w-full p-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              ))}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Início do Contrato</label>
                  <input
                    type="date"
                    value={dadosEdicao.data_inicio_contrato}
                    onChange={(e) => setDadosEdicao(prev => ({ ...prev, data_inicio_contrato: e.target.value }))}
                    className="w-full p-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Fim do Contrato</label>
                  <input
                    type="date"
                    value={dadosEdicao.data_fim_contrato}
                    onChange={(e) => setDadosEdicao(prev => ({ ...prev, data_fim_contrato: e.target.value }))}
                    className="w-full p-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-1 border-t border-slate-100 mt-1">
                <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Assunto deste atendimento</label>
                <input
                  type="text"
                  value={dadosEdicao.assunto}
                  onChange={(e) => setDadosEdicao(prev => ({ ...prev, assunto: e.target.value }))}
                  className="w-full p-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="p-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => { setModalEditarAberto(false); setAtendimentoEmEdicao(null); }}
                className="px-3 py-1.5 rounded text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvarEdicaoCadastro}
                disabled={salvandoEdicaoCadastro}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded text-xs font-bold"
              >
                {salvandoEdicaoCadastro ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
