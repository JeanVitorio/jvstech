import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppLoader } from "@/components/AppLoader";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LeadFormDialog } from "@/components/leads/LeadFormDialog";
import { LeadsBulkActions } from "@/components/leads/LeadsBulkActions";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { LeadsToolbar } from "@/components/leads/LeadsToolbar";
import {
  LeadsTriage,
  type AtalhoTriagem,
  type ContagensTriagem,
} from "@/components/leads/LeadsTriage";
import {
  agruparDuplicados,
  COLUNAS_DUPLICADOS,
  idsParaDescartar,
  type LeadDuplicado,
} from "@/components/leads/leadsDuplicates";
import { baixarCsv, montarCsv } from "@/components/leads/leadsExport";
import {
  buscarPagina,
  contarTriagem,
  COLUNAS_LISTA,
  FILTROS_PADRAO,
  varrerFiltro,
  type FiltrosLeads,
  type LeadLista,
} from "@/components/leads/leadsQuery";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/store/AppStore";

interface Etapa {
  id: string;
  name: string;
  color: string;
  position: number;
}

const POR_PAGINA = 50;
const LOTE = 200;
// Filtrar por lista de ids vai na URL da consulta: limitamos para não estourar o tamanho.
const LIMITE_IDS = 300;

const mensagemErro = (erro: unknown) =>
  erro instanceof Error ? erro.message : "Operação não concluída.";

export default function Leads() {
  const { user } = useAuth();
  const { users } = useApp();

  const gestor = user?.tenant_role === "owner" || user?.tenant_role === "admin";

  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [leads, setLeads] = useState<LeadLista[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(0);
  const [filtros, setFiltros] = useState<FiltrosLeads>({ ...FILTROS_PADRAO });
  const [carregando, setCarregando] = useState(true);

  const [contagens, setContagens] = useState<ContagensTriagem>({
    total: 0,
    semResponsavel: 0,
    semContato: 0,
    semEtapa: 0,
  });
  const [contando, setContando] = useState(true);
  const [atalho, setAtalho] = useState<AtalhoTriagem>("todos");

  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [aplicando, setAplicando] = useState(false);
  const [exportando, setExportando] = useState(false);

  const [duplicados, setDuplicados] = useState<number | null>(null);
  const [idsDuplicados, setIdsDuplicados] = useState<string[]>([]);
  const [procurandoDuplicados, setProcurandoDuplicados] = useState(false);

  const [dialogoAberto, setDialogoAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<LeadLista | null>(null);

  const carregarEtapas = useCallback(async () => {
    const { data, error } = await supabase
      .from("lead_stages")
      .select("id,name,color,position")
      .order("position");
    if (error) {
      toast.error(mensagemErro(error));
      return;
    }
    setEtapas((data ?? []) as Etapa[]);
  }, []);

  const carregarPagina = useCallback(async () => {
    setCarregando(true);
    try {
      const resultado = await buscarPagina(filtros, pagina, POR_PAGINA, gestor, user?.id);
      setLeads(resultado.leads);
      setTotal(resultado.total);
    } catch (erro: unknown) {
      toast.error(mensagemErro(erro));
    } finally {
      setCarregando(false);
    }
  }, [filtros, pagina, gestor, user?.id]);

  const carregarContagens = useCallback(async () => {
    setContando(true);
    try {
      setContagens(await contarTriagem(gestor, user?.id));
    } catch (erro: unknown) {
      toast.error(mensagemErro(erro));
    } finally {
      setContando(false);
    }
  }, [gestor, user?.id]);

  useEffect(() => {
    void carregarEtapas();
  }, [carregarEtapas]);

  useEffect(() => {
    void carregarPagina();
  }, [carregarPagina]);

  useEffect(() => {
    void carregarContagens();
  }, [carregarContagens]);

  const nomeEtapa = useCallback(
    (id?: string | null) => {
      const etapa = etapas.find((item) => item.id === id);
      return { nome: etapa?.name ?? "—", cor: etapa?.color ?? "#FF6500" };
    },
    [etapas],
  );

  const nomeResponsavel = useCallback(
    (id?: string | null) => users.find((item) => item.id === id)?.name ?? "Sem responsável",
    [users],
  );

  const podeEditar = useCallback(
    (lead: LeadLista) => gestor || lead.owner_id === user?.id,
    [gestor, user?.id],
  );

  // Trocar de filtro sempre volta para a primeira página e descarta a seleção.
  const aplicarFiltrosNaTela = (novos: FiltrosLeads, novoAtalho: AtalhoTriagem = "todos") => {
    setFiltros(novos);
    setAtalho(novoAtalho);
    setPagina(0);
    setSelecionados(new Set());
  };

  async function usarAtalho(escolhido: AtalhoTriagem) {
    if (escolhido === "duplicados") {
      await procurarDuplicados();
      return;
    }
    const base = { ...FILTROS_PADRAO };
    if (escolhido === "sem_responsavel") base.responsavel = "none";
    if (escolhido === "sem_contato") base.contato = "sem_contato";
    if (escolhido === "sem_etapa") base.etapa = "none";
    aplicarFiltrosNaTela(base, escolhido);
  }

  async function procurarDuplicados() {
    setProcurandoDuplicados(true);
    try {
      const linhas = await varrerFiltro<LeadDuplicado>(
        { ...FILTROS_PADRAO },
        COLUNAS_DUPLICADOS,
        gestor,
        user?.id,
      );
      const grupos = agruparDuplicados(linhas);
      const ids = idsParaDescartar(grupos);
      setIdsDuplicados(ids);
      setDuplicados(ids.length);
      setAtalho("duplicados");
      if (!ids.length) {
        setFiltros({ ...FILTROS_PADRAO });
        toast.success("Nenhum lead repetido encontrado.");
        return;
      }
      // A tabela passa a mostrar só os repetidos para o usuário conferir antes de excluir.
      setFiltros({ ...FILTROS_PADRAO, ids: ids.slice(0, LIMITE_IDS), ordenarPor: "name", ordem: "asc" });
      setPagina(0);
      setSelecionados(new Set(ids));
      toast.success(
        `${ids.length} lead(s) repetido(s) marcados. O mais antigo de cada grupo foi preservado.`,
      );
    } catch (erro: unknown) {
      toast.error(mensagemErro(erro));
    } finally {
      setProcurandoDuplicados(false);
    }
  }

  function alternar(id: string) {
    setSelecionados((atual) => {
      const copia = new Set(atual);
      if (copia.has(id)) copia.delete(id);
      else copia.add(id);
      return copia;
    });
  }

  function alternarPagina(marcar: boolean) {
    setSelecionados((atual) => {
      const copia = new Set(atual);
      for (const lead of leads) {
        if (marcar) copia.add(lead.id);
        else copia.delete(lead.id);
      }
      return copia;
    });
  }

  // Supabase tem limite de itens por filtro: aplicamos em lotes.
  async function emLotes(ids: string[], acao: (lote: string[]) => Promise<void>) {
    for (let inicio = 0; inicio < ids.length; inicio += LOTE) {
      await acao(ids.slice(inicio, inicio + LOTE));
    }
  }

  async function aplicarEmMassa(
    rotulo: string,
    acao: (lote: string[]) => Promise<void>,
    limparSelecao = true,
  ) {
    const ids = [...selecionados];
    if (!ids.length) return;
    setAplicando(true);
    try {
      await emLotes(ids, acao);
      toast.success(`${rotulo} em ${ids.length} lead(s).`);
      if (limparSelecao) setSelecionados(new Set());
      await Promise.all([carregarPagina(), carregarContagens()]);
    } catch (erro: unknown) {
      toast.error(mensagemErro(erro));
    } finally {
      setAplicando(false);
    }
  }

  const atribuir = (ownerId: string) =>
    aplicarEmMassa("Responsável alterado", async (lote) => {
      const { error } = await supabase.from("leads").update({ owner_id: ownerId }).in("id", lote);
      if (error) throw error;
    });

  const mover = (stageId: string) =>
    aplicarEmMassa("Etapa alterada", async (lote) => {
      const { error } = await supabase.from("leads").update({ stage_id: stageId }).in("id", lote);
      if (error) throw error;
    });

  const marcarNaoContatar = (valor: boolean) =>
    aplicarEmMassa(valor ? "Marcado como não contatar" : "Contato liberado", async (lote) => {
      const { error } = await supabase
        .from("leads")
        .update({ whatsapp_do_not_contact: valor })
        .in("id", lote);
      if (error) throw error;
    });

  function excluirSelecionados() {
    const quantidade = selecionados.size;
    if (!quantidade) return;
    if (!confirm(`Excluir ${quantidade} lead(s)? Esta ação não pode ser desfeita.`)) return;
    void aplicarEmMassa("Excluído", async (lote) => {
      const { error } = await supabase.from("leads").delete().in("id", lote);
      if (error) throw error;
      setIdsDuplicados((atual) => atual.filter((id) => !lote.includes(id)));
      setDuplicados((atual) => (atual === null ? atual : Math.max(0, atual - lote.length)));
    });
  }

  async function excluirUm(lead: LeadLista) {
    if (!confirm(`Excluir o lead "${lead.name}"?`)) return;
    try {
      const { error } = await supabase.from("leads").delete().eq("id", lead.id);
      if (error) throw error;
      toast.success("Lead excluído.");
      await Promise.all([carregarPagina(), carregarContagens()]);
    } catch (erro: unknown) {
      toast.error(mensagemErro(erro));
    }
  }

  async function exportar() {
    setExportando(true);
    try {
      const linhas = await varrerFiltro<LeadLista>(filtros, COLUNAS_LISTA, gestor, user?.id);
      if (!linhas.length) {
        toast.error("Nenhum lead no filtro atual.");
        return;
      }
      const csv = montarCsv(
        linhas,
        (id) => nomeEtapa(id).nome,
        (id) => nomeResponsavel(id),
      );
      baixarCsv(csv, `leads-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success(`${linhas.length} lead(s) exportados.`);
    } catch (erro: unknown) {
      toast.error(mensagemErro(erro));
    } finally {
      setExportando(false);
    }
  }

  const ultimaPagina = Math.max(0, Math.ceil(total / POR_PAGINA) - 1);
  const inicio = total === 0 ? 0 : pagina * POR_PAGINA + 1;
  const fim = Math.min(total, (pagina + 1) * POR_PAGINA);

  const selecaoNaBase = useMemo(() => selecionados.size, [selecionados]);

  return (
    <div className="mx-auto max-w-[1500px] space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          title="Base de leads"
          subtitle="Triagem da base: filtre, distribua entre a equipe e limpe o que não serve."
        />
        <Button
          onClick={() => {
            setEmEdicao(null);
            setDialogoAberto(true);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" /> Novo lead
        </Button>
      </div>

      <LeadsTriage
        contagens={contagens}
        carregando={contando}
        duplicados={duplicados}
        procurandoDuplicados={procurandoDuplicados}
        atalhoAtivo={atalho}
        onAtalho={(escolhido) => void usarAtalho(escolhido)}
      />

      <LeadsToolbar
        filtros={filtros}
        onMudar={(novos) => aplicarFiltrosNaTela(novos)}
        etapas={etapas}
        usuarios={users}
        mostrarResponsavel={gestor}
        exportando={exportando}
        onExportar={() => void exportar()}
      />

      {atalho === "duplicados" && idsDuplicados.length > 0 && (
        <Card className="border-warning/40 bg-warning/5 p-3 text-sm">
          {idsDuplicados.length} lead(s) repetidos encontrados — a tabela está mostrando
          {idsDuplicados.length > LIMITE_IDS ? ` os ${LIMITE_IDS} primeiros` : " eles"}. O registro
          mais antigo de cada grupo foi preservado; confira a lista e use “Excluir” na barra de
          ações para limpar os demais.
        </Card>
      )}

      <Card className="overflow-hidden">
        {carregando ? (
          <AppLoader variant="inline" label="Carregando leads" />
        ) : leads.length === 0 ? (
          <p className="p-10 text-center text-muted-foreground">
            Nenhum lead encontrado com os filtros atuais.
          </p>
        ) : (
          <LeadsTable
            leads={leads}
            selecionados={selecionados}
            onAlternar={alternar}
            onAlternarPagina={alternarPagina}
            etapa={nomeEtapa}
            responsavel={nomeResponsavel}
            podeEditar={podeEditar}
            onEditar={(lead) => {
              setEmEdicao(lead);
              setDialogoAberto(true);
            }}
            onExcluir={(lead) => void excluirUm(lead)}
          />
        )}
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>
          {total === 0
            ? "Nenhum lead"
            : `${inicio.toLocaleString("pt-BR")}–${fim.toLocaleString("pt-BR")} de ${total.toLocaleString("pt-BR")}`}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagina === 0 || carregando}
            onClick={() => setPagina((atual) => Math.max(0, atual - 1))}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" /> Anterior
          </Button>
          <span className="tabular-nums">
            {pagina + 1} / {ultimaPagina + 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagina >= ultimaPagina || carregando}
            onClick={() => setPagina((atual) => Math.min(ultimaPagina, atual + 1))}
            className="gap-1"
          >
            Próxima <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <LeadsBulkActions
        quantidade={selecaoNaBase}
        usuarios={users}
        etapas={etapas}
        podeAtribuir={gestor}
        aplicando={aplicando}
        onAtribuir={(ownerId) => void atribuir(ownerId)}
        onMover={(stageId) => void mover(stageId)}
        onNaoContatar={(valor) => void marcarNaoContatar(valor)}
        onExcluir={excluirSelecionados}
        onLimpar={() => setSelecionados(new Set())}
      />

      <LeadFormDialog
        aberto={dialogoAberto}
        lead={emEdicao}
        etapas={etapas}
        usuarios={users}
        podeAtribuir={gestor}
        usuarioAtual={user ? { id: user.id, name: user.name, email: user.email } : undefined}
        onFechar={() => setDialogoAberto(false)}
        onSalvo={() => {
          void carregarPagina();
          void carregarContagens();
        }}
      />
    </div>
  );
}
