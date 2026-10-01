"""
Importador de leads - Imobiliárias → JVS Flow
==============================================
Lê o CSV gerado pelo scraper (imobiliarias_sem_site.csv),
insere os leads novos no Supabase e fica monitorando o arquivo
para adicionar automaticamente qualquer linha nova que aparecer.

Configuração:
  1. Copie .env.example para .env e preencha as chaves.
  2. pip install supabase python-dotenv watchdog

Como rodar:
  python importar_leads_imobiliarias.py

O script roda indefinidamente. Ctrl+C para parar.
"""

import csv
import os
import time
import logging
import hashlib
from pathlib import Path
from datetime import datetime

from dotenv import load_dotenv
from supabase import create_client, Client
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# ── Configurações ──────────────────────────────────────────────────────────────
load_dotenv(Path(__file__).parent / ".env")

SUPABASE_URL        = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
OWNER_EMAIL         = os.environ.get("OWNER_EMAIL", "joaovendas@jvs.com.br")

CSV_PATH            = Path(__file__).parent / "imobiliarias_sem_site.csv"
NICHO               = "imobiliarias"
TICKET_ESTIMADO     = 1200.0
INTERVALO_POLL_SEG  = 30        # verifica o arquivo a cada 30 s (além do watchdog)

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%H:%M:%S",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(Path(__file__).parent / "log_importador_imobiliarias.txt", encoding="utf-8"),
    ],
)
log = logging.getLogger("importador")

# ── Supabase ───────────────────────────────────────────────────────────────────
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def buscar_owner_id(email: str) -> str | None:
    """Retorna o UUID do perfil cujo e-mail bate com OWNER_EMAIL."""
    res = supabase.table("profiles").select("id").eq("email", email).maybe_single().execute()
    return res.data["id"] if res.data else None


def buscar_stage_inicial() -> str | None:
    """Pega o primeiro estágio do funil (menor position, não é won nem lost)."""
    res = (
        supabase.table("lead_stages")
        .select("id")
        .eq("is_won", False)
        .eq("is_lost", False)
        .order("position")
        .limit(1)
        .execute()
    )
    return res.data[0]["id"] if res.data else None


def chave_unica(nome: str, telefone: str) -> str:
    """Gera um hash para identificar o lead de forma única (evita duplicatas)."""
    raw = f"{nome.strip().lower()}|{telefone.strip()}"
    return hashlib.md5(raw.encode()).hexdigest()


def leads_existentes() -> set[str]:
    """
    Busca todos os leads com nicho=NICHO já no banco e devolve um set
    de 'chaves' compostas de nome+telefone (via notes que guardamos).
    Usamos o campo 'notes' para armazenar a chave de deduplicação.
    """
    res = supabase.table("leads").select("notes").eq("source", NICHO).execute()
    return {r["notes"] for r in (res.data or []) if r.get("notes")}


def inserir_lead(row: dict, owner_id: str, stage_id: str | None, chave: str) -> bool:
    """Insere um único lead. Retorna True se inserido, False se erro."""
    payload = {
        "name":              row["Nome"],
        "company":           row["Nome"],          # nome e empresa iguais conforme solicitado
        "phone":             row.get("Telefone", ""),
        "source":            NICHO,                # usado também para filtrar deduplicação
        "estimated_value":   TICKET_ESTIMADO,
        "niche":             NICHO,
        "owner_id":          owner_id,
        "notes":             chave,                # chave de dedup guardada em notes
        "created_at":        datetime.utcnow().isoformat(),
        "updated_at":        datetime.utcnow().isoformat(),
    }
    if stage_id:
        payload["stage_id"] = stage_id

    try:
        supabase.table("leads").insert(payload).execute()
        return True
    except Exception as e:
        log.error(f"  Erro ao inserir '{row['Nome']}': {e}")
        return False


def processar_csv(owner_id: str, stage_id: str | None) -> int:
    """Lê o CSV completo e insere apenas os leads ainda não existentes. Retorna qtd inserida."""
    if not CSV_PATH.exists():
        log.warning(f"CSV não encontrado: {CSV_PATH}")
        return 0

    existentes = leads_existentes()
    inseridos  = 0

    with open(CSV_PATH, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            nome     = row.get("Nome", "").strip()
            telefone = row.get("Telefone", "").strip()
            if not nome:
                continue

            chave = chave_unica(nome, telefone)
            if chave in existentes:
                continue  # já importado antes

            ok = inserir_lead(row, owner_id, stage_id, chave)
            if ok:
                existentes.add(chave)
                inseridos += 1
                log.info(f"  ✔ Lead inserido: {nome} | {telefone}")

    return inseridos


# ── Watchdog: reage quando o arquivo CSV for modificado ───────────────────────
class CSVHandler(FileSystemEventHandler):
    def __init__(self, owner_id: str, stage_id: str | None):
        self.owner_id = owner_id
        self.stage_id = stage_id
        self._ultimo_processo = 0.0

    def on_modified(self, event):
        if Path(event.src_path).resolve() != CSV_PATH.resolve():
            return
        agora = time.time()
        # debounce: ignora eventos duplicados em menos de 5 s
        if agora - self._ultimo_processo < 5:
            return
        self._ultimo_processo = agora
        log.info("CSV modificado — verificando novos leads...")
        n = processar_csv(self.owner_id, self.stage_id)
        log.info(f"  {n} novo(s) lead(s) inserido(s) após modificação do arquivo.")


# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    log.info("=== Importador de leads - Imobiliárias ===")
    log.info(f"CSV monitorado : {CSV_PATH}")
    log.info(f"Responsável    : {OWNER_EMAIL}")
    log.info(f"Nicho          : {NICHO}")
    log.info(f"Ticket estimado: R$ {TICKET_ESTIMADO:.2f}")

    owner_id = buscar_owner_id(OWNER_EMAIL)
    if not owner_id:
        log.error(f"Perfil '{OWNER_EMAIL}' não encontrado no banco. Verifique OWNER_EMAIL no .env.")
        return

    stage_id = buscar_stage_inicial()
    if not stage_id:
        log.warning("Nenhum estágio inicial encontrado em lead_stages. Leads serão criados sem estágio.")

    log.info(f"owner_id : {owner_id}")
    log.info(f"stage_id : {stage_id}")

    # Processa tudo que já existe no CSV
    n = processar_csv(owner_id, stage_id)
    log.info(f"Importação inicial: {n} lead(s) inserido(s).")

    # Monitora mudanças no arquivo
    handler  = CSVHandler(owner_id, stage_id)
    observer = Observer()
    observer.schedule(handler, str(CSV_PATH.parent), recursive=False)
    observer.start()
    log.info(f"Monitorando '{CSV_PATH.name}' por novos registros (Ctrl+C para parar)...")

    try:
        while True:
            time.sleep(INTERVALO_POLL_SEG)
            # poll periódico como seguro adicional ao watchdog
            n = processar_csv(owner_id, stage_id)
            if n:
                log.info(f"Poll periódico: {n} novo(s) lead(s) inserido(s).")
    except KeyboardInterrupt:
        log.info("Interrompido pelo usuário.")
    finally:
        observer.stop()
        observer.join()
        log.info("Monitoramento encerrado.")


if __name__ == "__main__":
    main()
