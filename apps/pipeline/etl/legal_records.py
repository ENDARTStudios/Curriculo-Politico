"""
ETL — Registros jurídicos: TCU (contas rejeitadas) e STF (ações penais).

REALIDADE DAS FONTES (verificada 2026-09-28):
- TCU: api-publica exige credenciais (401) — sem endpoint aberto estável.
- STF: portal sem API consolidada (403 em endpoints de serviço).
- CNJ/TJs: autenticação/captcha — inviável sem parceria institucional.

Modo local-first: coloque arquivos manualmente em data/raw/ e o ETL
processa. Estrutura esperada (JSON array):
  data/raw/tcu_contas_rejeitadas_raw.json  → [{nome, processo, data_decisao, orgao}]
  data/raw/stf_acoes_penais_raw.json       → [{numero_processo, classe, situacao, partes:[{nome}]}]

Fontes para obtenção manual:
  TCU: https://portal.tcu.gov.br/contas-de-governo-e-estados/ (listas de inidôneos)
  STF: https://portal.stf.jus.br/processos/ (AP/Inq com parlamentares)
"""
import json
import os
import sys

RAW_DIR = os.path.join("data", "raw")


def salvar(nome, registros):
    os.makedirs(RAW_DIR, exist_ok=True)
    out = os.path.join(RAW_DIR, nome)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(registros, f, ensure_ascii=False, indent=2)
    print(f"✅ {len(registros)} registros salvos em {out}")


def run():
    print("⚖️ ETL de registros jurídicos (modo local-first)\n")

    tcu_path = os.path.join(RAW_DIR, "tcu_contas_rejeitadas_raw.json")
    stf_path = os.path.join(RAW_DIR, "stf_acoes_penais_raw.json")

    if os.path.exists(tcu_path):
        with open(tcu_path, encoding="utf-8") as f:
            salvar("tcu_contas_rejeitadas_raw.json", json.load(f))
    else:
        print(f"⚠️  {tcu_path} ausente — TCU api-publica retorna 401 sem credenciais.")
        print("    Baixe a lista de inidôneos manualmente e salve nesse caminho.")

    if os.path.exists(stf_path):
        with open(stf_path, encoding="utf-8") as f:
            salvar("stf_acoes_penais_raw.json", json.load(f))
    else:
        print(f"⚠️  {stf_path} ausente — STF não possui API consolidada (403).")
        print("    Exporte do portal do STF e salve nesse caminho.")

    print("\nDepois de posicionar os arquivos, rode: npm run db:load-legal")


if __name__ == "__main__":
    run()
    sys.exit(0)
