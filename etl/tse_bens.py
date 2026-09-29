"""
ETL — Patrimônio declarado ao TSE (bem_candidato)
Parseia data/raw/tse_2022/bem_candidato_2022_BRASIL.csv (se presente) e
agrega o valor total declarado por SQ_CANDIDATO.

Modo local-first: o CDN do TSE bloqueia intermitentemente (Akamai 403).
Baixe manualmente:
  https://cdn.tse.jus.br/estatistica/sead/odsele/bem_candidato/bem_candidato_2022.zip
e extraia em data/raw/tse_2022/.
"""
import csv
import json
import os
import sys

RAW_DIR = os.path.join("data", "raw")


def run():
    csv_path = os.path.join(RAW_DIR, "tse_2022", "bem_candidato_2022_BRASIL.csv")
    if not os.path.exists(csv_path):
        print(f"❌ {csv_path} não encontrado.")
        print("   Baixe manualmente: https://cdn.tse.jus.br/estatistica/sead/odsele/bem_candidato/bem_candidato_2022.zip")
        print("   Extraia bem_candidato_2022_BRASIL.csv para data/raw/tse_2022/")
        sys.exit(2)

    por_candidato: dict[str, float] = {}
    with open(csv_path, encoding="latin1") as f:
        primeira = f.readline()
        f.seek(0)
        if "SQ_CANDIDATO" not in primeira:
            f.readline()  # pula metadados
        reader = csv.DictReader(f, delimiter=";")
        for row in reader:
            sq = (row.get("SQ_CANDIDATO") or "").strip()
            valor = (row.get("VR_BEM_CANDIDATO") or "0").strip()
            if not sq:
                continue
            try:
                v = float(valor.replace(",", "."))
            except ValueError:
                continue
            por_candidato[sq] = por_candidato.get(sq, 0.0) + v

    resultado = [
        {"tse_id": sq, "total_declarado": round(total, 2)}
        for sq, total in por_candidato.items()
    ]

    out = os.path.join(RAW_DIR, "tse_bens_2022_raw.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(resultado, f, ensure_ascii=False)
    print(f"✅ {len(resultado)} candidatos com patrimônio salvos em {out}")


if __name__ == "__main__":
    run()
