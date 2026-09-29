"""
ETL — Candidatos ao Legislativo federal (TSE, Dados Abertos)
Baixa consulta_cand_{ano}.zip do CDN do TSE (ou usa zip/CSV local em
data/raw/tse_{ano}/) e extrai candidatos a Deputado Federal e Senador.

Uso:
  python etl/tse_candidatos.py --ano 2022
  python etl/tse_candidatos.py --ano 2018

Se o CDN estiver inacessível (bloqueio Akamai para redes fora do Brasil),
baixe o zip manualmente em:
  https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_{ano}.zip
e salve em data/raw/tse_{ano}/consulta_cand_{ano}.zip antes de rodar.
"""
import argparse
import csv
import json
import os
import sys
import zipfile

import requests

TSE_BASE = "https://cdn.tse.jus.br/estatistica/sead/odsele"
RAW_DIR = os.path.join("data", "raw")
CARGOS = {"DEPUTADO FEDERAL", "SENADOR"}
HEADERS = {
    "User-Agent": "CurriculoPolitico/1.0 (Projeto Open Source de Transparencia)",
}


def download(url: str, dest: str) -> None:
    print(f"📥 Baixando {url}...")
    with requests.get(url, headers=HEADERS, timeout=300, stream=True) as r:
        r.raise_for_status()
        total = 0
        with open(dest, "wb") as f:
            for chunk in r.iter_content(chunk_size=1 << 20):
                f.write(chunk)
                total += len(chunk)
    print(f"✅ {total / 1e6:.1f} MB salvos em {dest}")


def parse_valor_ano(dt_nascimento: str | None) -> int | None:
    """DT_NASCIMENTO vem como DD/MM/AAAA — o ano são os 4 últimos dígitos."""
    if not dt_nascimento or len(dt_nascimento) < 4:
        return None
    ano = dt_nascimento.strip()[-4:]
    return int(ano) if ano.isdigit() else None


def parse_csv(csv_path: str, ano: int) -> list[dict]:
    candidatos = []
    with open(csv_path, encoding="latin1") as f:
        primeira = f.readline()
        f.seek(0)
        # Alguns arquivos do TSE trazem linha de metadados antes do cabeçalho
        if "NM_URNA_CANDIDATO" not in primeira:
            f.readline()
        reader = csv.DictReader(f, delimiter=";")
        for row in reader:
            cargo = (row.get("DS_CARGO") or "").strip()
            if cargo not in CARGOS:
                continue
            sq = (row.get("SQ_CANDIDATO") or "").strip()
            if not sq:
                continue
            candidatos.append({
                "tse_id": sq,
                "ano": ano,
                "cpf": (row.get("NR_CPF_CANDIDATO") or "").strip(),  # só no raw; nunca exposto
                "nome_urna": (row.get("NM_URNA_CANDIDATO") or "").strip(),
                "nome_civil": (row.get("NM_CANDIDATO") or "").strip(),
                "partido_sigla": (row.get("SG_PARTIDO") or "").strip(),
                "uf": (row.get("SG_UF") or "").strip(),
                "cargo": cargo,
                "ano_nascimento": parse_valor_ano(row.get("DT_NASCIMENTO")),
                "situacao": (row.get("DS_SIT_TOT_TURNO") or "").strip(),
            })
    return candidatos


def run(ano: int) -> None:
    workdir = os.path.join(RAW_DIR, f"tse_{ano}")
    os.makedirs(workdir, exist_ok=True)

    zip_path = os.path.join(workdir, f"consulta_cand_{ano}.zip")
    if not os.path.exists(zip_path):
        url = f"{TSE_BASE}/consulta_cand/consulta_cand_{ano}.zip"
        try:
            download(url, zip_path)
        except requests.RequestException as e:
            print(f"❌ Download falhou ({e}).")
            print(f"   O CDN do TSE bloqueia redes fora do Brasil (Akamai 403).")
            print(f"   Baixe manualmente: {url}")
            print(f"   e salve em: {zip_path}")
            sys.exit(2)

    with zipfile.ZipFile(zip_path) as zf:
        zf.extractall(workdir)

    # Prefere o agregado BRASIL (evita duplicar candidatos por UF)
    brasil = os.path.join(workdir, f"consulta_cand_{ano}_BRASIL.csv")
    csvs = [brasil] if os.path.exists(brasil) else [
        os.path.join(workdir, f) for f in os.listdir(workdir)
        if f.startswith(f"consulta_cand_{ano}_") and f.endswith(".csv")
    ]

    candidatos: list[dict] = []
    seen: set[str] = set()
    for csv_path in csvs:
        print(f"📄 Processando {os.path.basename(csv_path)}...")
        for cand in parse_csv(csv_path, ano):
            key = f"{cand['ano']}:{cand['tse_id']}"
            if key not in seen:
                seen.add(key)
                candidatos.append(cand)

    out = os.path.join(RAW_DIR, f"tse_candidatos_{ano}_raw.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(candidatos, f, ensure_ascii=False, indent=2)

    federais = sum(1 for c in candidatos if c["cargo"] == "DEPUTADO FEDERAL")
    senadores = sum(1 for c in candidatos if c["cargo"] == "SENADOR")
    print(f"✅ {len(candidatos)} candidatos ({federais} deputados federais, {senadores} senadores) salvos em {out}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ETL candidatos TSE")
    parser.add_argument("--ano", type=int, default=2022, help="Ano da eleição (default: 2022)")
    args = parser.parse_args()
    run(args.ano)
