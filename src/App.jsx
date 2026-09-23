import { useState } from "react";
import {
  LayoutDashboard,
  Workflow,
  Archive,
  Plus,
  RefreshCw,
  ArrowLeft,
  Command,
  AlertCircle,
} from "lucide-react";
import { useCRMData } from "./hooks/useCRMData";
import Dashboard from "./components/Dashboard";
import ListaClientes from "./components/ListaClientes";
import FichaCliente from "./components/FichaCliente";
import ModalNovoCliente from "./components/ModalNovoCliente";
import CentralProcessos from "./components/CentralProcessos";

export default function App() {
  const { clientes, carregando, erro, recarregar } = useCRMData();
  const [aba, setAba] = useState("dashboard");
  const [clienteId, setClienteId] = useState(null);
  const [novo, setNovo] = useState(false);
  const [filtro, setFiltro] = useState(null);
  const [subAba, setSubAba] = useState("ativos");
  const [consultor, setConsultor] = useState("");
  const cliente = clientes.find((c) => c.id === clienteId);
  const abrirLista = (f = null, sub = "ativos", nome = "") => {
    setFiltro(f);
    setSubAba(sub);
    setConsultor(nome);
    setAba("clientes");
  };
  const titulo =
    aba === "dashboard"
      ? "Meu dia"
      : aba === "documentos"
        ? "Processos e documentos"
        : subAba === "concluidos"
          ? "Atendimentos concluídos"
          : "Diário de atendimentos";
  const concluido = aba === "clientes" && subAba === "concluidos";
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => setAba("dashboard")}
          aria-label="Controle Clientes — início"
        >
          <span className="brand-icon">
            <Command size={25} />
          </span>
          <span>
            <strong>Controle Clientes</strong>
            <small>Seu diário de atendimentos</small>
          </span>
        </button>
        <p className="nav-caption">SEU ESPAÇO DE TRABALHO</p>
        <nav aria-label="Navegação principal">
          <button
            className={aba !== "documentos" && !concluido ? "active" : ""}
            onClick={() => setAba("dashboard")}
          >
            <LayoutDashboard size={19} /> Meu dia
          </button>
          <button
            className={aba === "documentos" ? "active" : ""}
            onClick={() => setAba("documentos")}
          >
            <Workflow size={19} /> Processos e documentos
          </button>
          <button
            className={concluido ? "active" : ""}
            onClick={() => abrirLista(null, "concluidos")}
          >
            <Archive size={19} /> Concluídos
          </button>
        </nav>
        <div className="sidebar-note">
          <span className="accent-line" />
          <p>
            Cada conversa importa.
            <br />
            <strong>Cada próximo passo também.</strong>
          </p>
        </div>
      </aside>
      <div className="workspace">
        <header className="page-header">
          <div>
            <div className="eyebrow">RELACIONAMENTO & ACOMPANHAMENTO</div>
            <div className="title-row">
              {aba !== "dashboard" && (
                <button
                  className="icon-button"
                  onClick={() => setAba("dashboard")}
                  aria-label="Voltar ao início"
                >
                  <ArrowLeft size={20} />
                </button>
              )}
              <h1>{titulo}</h1>
            </div>
            <p>
              {aba === "dashboard"
                ? "Clareza para saber onde agir. Espaço para registrar cada avanço."
                : aba === "documentos"
                  ? "Seu passo a passo, sempre à mão."
                  : consultor
                    ? `Acompanhamento de ${consultor === "__sem_consultor__" ? "clientes sem consultor" : consultor}.`
                    : "Converse, registre e acompanhe o que vem depois."}
            </p>
          </div>
          <div className="header-actions">
            <button
              className="icon-button"
              onClick={recarregar}
              disabled={carregando}
              aria-label="Atualizar dados"
              title="Atualizar dados"
            >
              <RefreshCw size={18} className={carregando ? "spin" : ""} />
            </button>
            <button className="button primary" onClick={() => setNovo(true)}>
              <Plus size={18} />
              <span>Novo cliente</span>
            </button>
          </div>
        </header>
        <main>
          {erro && (
            <div className="notice error" role="alert">
              <AlertCircle size={18} />
              <span>{erro}</span>
              <button onClick={recarregar}>Tentar novamente</button>
            </div>
          )}
          {carregando && clientes.length === 0 ? (
            <div className="empty-state">
              <RefreshCw className="spin" />
              <h2>Carregando seus atendimentos</h2>
              <p>Preparando o seu dia.</p>
            </div>
          ) : (
            <>
              {aba === "dashboard" && (
                <Dashboard
                  clientes={clientes}
                  onAbrirFiltro={abrirLista}
                  onAbrirDocumentos={() => setAba("documentos")}
                  onSelecionarCliente={(c) => setClienteId(c.id)}
                  onNovoCliente={() => setNovo(true)}
                />
              )}
              {aba === "clientes" && (
                <ListaClientes
                  clientes={clientes}
                  onSelecionarCliente={(c) => setClienteId(c.id)}
                  onNovoCliente={() => setNovo(true)}
                  onAtualizar={recarregar}
                  filtro={filtro}
                  onMudarFiltro={setFiltro}
                  aba={subAba}
                  onMudarAba={setSubAba}
                  consultor={consultor}
                />
              )}
              {aba === "documentos" && (
                <div className="legacy-content process-page">
                  <CentralProcessos />
                </div>
              )}
            </>
          )}
        </main>
        <footer className="site-footer">
          <span>Controle Clientes</span>
          <span>
            © Diogo Soares —{" "}
            <a
              href="https://www.ddsinovacao.com.br"
              target="_blank"
              rel="noreferrer"
            >
              www.ddsinovacao.com.br
            </a>
          </span>
        </footer>
      </div>
      {cliente && (
        <FichaCliente
          key={cliente.id}
          cliente={cliente}
          onFechar={() => setClienteId(null)}
          onAtualizar={recarregar}
        />
      )}
      {novo && (
        <div className="legacy-content">
          <ModalNovoCliente
            onFechar={() => setNovo(false)}
            onCriado={async () => {
              setNovo(false);
              await recarregar();
            }}
          />
        </div>
      )}
    </div>
  );
}
