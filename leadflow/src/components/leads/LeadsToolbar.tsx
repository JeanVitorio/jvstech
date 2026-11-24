import { Download, FilterX, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILTROS_PADRAO, type FiltrosLeads } from "./leadsQuery";

interface LeadsToolbarProps {
  filtros: FiltrosLeads;
  onMudar: (filtros: FiltrosLeads) => void;
  etapas: { id: string; name: string }[];
  usuarios: { id: string; name: string }[];
  mostrarResponsavel: boolean;
  exportando: boolean;
  onExportar: () => void;
}

export function LeadsToolbar({
  filtros,
  onMudar,
  etapas,
  usuarios,
  mostrarResponsavel,
  exportando,
  onExportar,
}: LeadsToolbarProps) {
  const ajustar = (parcial: Partial<FiltrosLeads>) => onMudar({ ...filtros, ...parcial });
  const temFiltro = JSON.stringify(filtros) !== JSON.stringify(FILTROS_PADRAO);

  return (
    <Card className="space-y-3 p-3">
      <div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_180px_180px_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filtros.busca}
            onChange={(evento) => ajustar({ busca: evento.target.value })}
            placeholder="Nome, empresa, e-mail ou telefone"
            className="pl-9"
          />
        </div>

        {mostrarResponsavel ? (
          <Select
            value={filtros.responsavel}
            onValueChange={(valor) => ajustar({ responsavel: valor })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os responsáveis</SelectItem>
              <SelectItem value="none">Sem responsável</SelectItem>
              {usuarios.map((usuario) => (
                <SelectItem key={usuario.id} value={usuario.id}>
                  {usuario.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="hidden md:block" />
        )}

        <Select value={filtros.etapa} onValueChange={(valor) => ajustar({ etapa: valor })}>
          <SelectTrigger>
            <SelectValue placeholder="Etapa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as etapas</SelectItem>
            <SelectItem value="none">Fora do funil</SelectItem>
            {etapas.map((etapa) => (
              <SelectItem key={etapa.id} value={etapa.id}>
                {etapa.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onExportar} disabled={exportando} className="gap-2">
            <Download className="h-4 w-4" />
            {exportando ? "Gerando…" : "CSV"}
          </Button>
          {temFiltro && (
            <Button
              variant="ghost"
              onClick={() => onMudar({ ...FILTROS_PADRAO })}
              title="Limpar filtros"
            >
              <FilterX className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-6">
        <Input
          value={filtros.cidade}
          onChange={(evento) => ajustar({ cidade: evento.target.value })}
          placeholder="Cidade"
        />
        <Input
          value={filtros.nicho}
          onChange={(evento) => ajustar({ nicho: evento.target.value })}
          placeholder="Nicho"
        />
        <Input
          value={filtros.origem}
          onChange={(evento) => ajustar({ origem: evento.target.value })}
          placeholder="Origem"
        />

        <Select
          value={filtros.contato}
          onValueChange={(valor) => ajustar({ contato: valor as FiltrosLeads["contato"] })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Contato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Qualquer contato</SelectItem>
            <SelectItem value="com_whatsapp">Com WhatsApp</SelectItem>
            <SelectItem value="sem_contato">Sem telefone</SelectItem>
            <SelectItem value="nao_contatar">Marcados como não contatar</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filtros.periodo}
          onValueChange={(valor) => ajustar({ periodo: valor as FiltrosLeads["periodo"] })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Desde sempre</SelectItem>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={`${filtros.ordenarPor}:${filtros.ordem}`}
          onValueChange={(valor) => {
            const [ordenarPor, ordem] = valor.split(":");
            ajustar({
              ordenarPor: ordenarPor as FiltrosLeads["ordenarPor"],
              ordem: ordem as FiltrosLeads["ordem"],
            });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at:desc">Mais novos primeiro</SelectItem>
            <SelectItem value="created_at:asc">Mais antigos primeiro</SelectItem>
            <SelectItem value="updated_at:desc">Mexidos recentemente</SelectItem>
            <SelectItem value="updated_at:asc">Parados há mais tempo</SelectItem>
            <SelectItem value="estimated_value:desc">Maior valor</SelectItem>
            <SelectItem value="name:asc">Nome (A–Z)</SelectItem>
            <SelectItem value="city:asc">Cidade (A–Z)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </Card>
  );
}
