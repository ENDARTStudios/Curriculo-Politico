"""
ETL — Receitas de campanha (TSE, Dados Abertos)
Baixa receitas_candidatos_{ano}.zip (ou usa zip/CSV local em data/raw/tse_{ano}/)
e agrega receitas por candidato (SQ_CANDIDATO), Deputado Federal e Senador.

Uso:
  python etl/tse_receitas.py --ano 2022

Se o CDN do TSE estiver bloqueado (Akamai 403), baixe manualmente:
  https://cdn.tse.jus.br/estatistica/sead/odsele/receitas_candidatos/receitas_candidatos_{ano}.zip
e salve em data/raw/tse_{ano}/receitas_candidatos_{ano}.zip
"""
import argparse
import csv
import json
import os
import sys
import zipfile
from collections import defaultdict

import requests

TSE_BASE = "https://cdn.tse.jus.br/estatistica/sead/odsele"
RAW_DIR = os.path.join("data", "raw")
CARGOS = {"DEPUTADO FEDERAL", "SENADOR"}
HEADERS = {"User-Agent": "CurriculoPolitico/1.0 (Projeto Open Source de Transparencia)"}


def download(url: str, dest: str) -> None:
    print(f"📥 Baixando {url}...")
    with requests.get(url, headers=HEADERS, timeout=600, stream=True) as r:
        r.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in r.iter_content(chunk_size=1 << 20):
                f.write(chunk)
    print(f"✅ {os.path.getsize(dest) / 1e6:.1f} MB salvos em {dest}")


def parse_valor(s: str | None) -> float:
    """VR_RECEITA usa formato brasileiro; cobre '1234,56', '1.234,56' e '1234.56'."""
    s = (s or "").strip()
    if not s:
        return 0.0
    if "," in s and "." in s:
        s = s.replace(".", "").replace(",", ".")
    elif "," in s:
        s = s.replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return 0.0


def load_csvs(workdir: str, ano: int) -> list[str]:
    brasil = os.path.join(workdir, f"receitas_candidatos_{ano}_BRASIL.csv")
    if os.path.exists(brasil):
        return [brasil]
    return sorted(
        os.path.join(workdir, f)
        for f in os.listdir(workdir)
        if f.startswith(f"receitas_candidatos_{ano}_") and f.endswith(".csv")
    )


def run(ano: int) -> None:
    workdir = os.path.join(RAW_DIR, f"tse_{ano}")
    os.makedirs(workdir, exist_ok=True)

    zip_path = os.path.join(workdir, f"receitas_candidatos_{ano}.zip")
    if not os.path.exists(zip_path):
        url = f"{TSE_BASE}/receitas_candidatos/receitas_candidatos_{ano}.zip"
        try:
            download(url, zip_path)
        except requests.RequestException as e:
            print(f"❌ Download falhou ({e}).")
            print("   O CDN do TSE bloqueia redes fora do Brasil (Akamai 403).")
            print(f"   Baixe manualmente: {url}")
            print(f"   e salve em: {zip_path}")
            sys.exit(2)

    with zipfile.ZipFile(zip_path) as zf:
        zf.extractall(workdir)

    csvs = load_csvs(workdir, ano)
    if not csvs:
        print(f"❌ Nenhum CSV de receitas encontrado em {workdir}")
        sys.exit(1)

    por_candidato: dict[str, dict] = defaultdict(
        lambda: {"total": 0.0, "donors": [], "nome_urna": "", "cargo": "", "uf": ""}
    )

    for csv_path in csvs:
        print(f"📄 Processando {os.path.basename(csv_path)}...")
        with open(csv_path, encoding="latin1") as f:
            primeira = f.readline()
            f.seek(0)
            if "SQ_CANDIDATO" not in primeira:
                f.readline()
            reader = csv.DictReader(f, delimiter=";")
            for row in reader:
                cargo = (row.get("DS_CARGO") or "").strip()
                if cargo not in CARGOS:
                    continue
                sq = (row.get("SQ_CANDIDATO") or "").strip()
                if not sq:
                    continue
                valor = parse_valor(row.get("VR_RECEITA"))
                doador = (
                    (row.get("NM_DOADOR") or "").strip()
                    or (row.get("NM_FONTE_RECURSO") or "").strip()
                    or "Não identificado"
                )
                dados = por_candidato[sq]
                dados["total"] += valor
                dados["donors"].append({"nome": doador, "valor": round(valor, 2)})
                dados["nome_urna"] = (row.get("NM_URNA_CANDIDATO") or "").strip()
                dados["cargo"] = cargo
                dados["uf"] = (row.get("SG_UF") or "").strip()

    resultado = []
    for sq, d in por_candidato.items():
        top = sorted(d["donors"], key=lambda x: x["valor"], reverse=True)[:5]
        resultado.append({
            "tse_id": sq,
            "nome_urna": d["nome_urna"],
            "cargo": d["cargo"],
            "uf": d["uf"],
            "total_received": round(d["total"], 2),
            "donor_count": len(d["donors"]),
            "top_donors": top,
        })

    out = os.path.join(RAW_DIR, f"tse_receitas_{ano}_raw.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(resultado, f, ensure_ascii=False, indent=2)
    print(f"\n✅ {len(resultado)} candidatos com receitas salvos em {out}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ETL receitas de campanha TSE")
    parser.add_argument("--ano", type=int, default=2022)
    args = parser.parse_args()
    run(args.ano)
