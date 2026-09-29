"""
ETL — Checagens de agências independentes (RSS público)
Aos Fatos, Lupa e Comprova. Extrai veredito do título e menciona políticos.
Saída: data/raw/fact_checking_raw.json
"""
import json
import os
import re
import xml.etree.ElementTree as ET

import requests

RAW_DIR = os.path.join("data", "raw")
HEADERS = {"User-Agent": "CurriculoPolitico/1.0 (Pesquisa de Checagem)"}

RSS_FEEDS = {
    "aos_fatos": "https://www.aosfatos.org/rss/",
    "lupa": "https://lupa.uol.com.br/feed/",
    "comprova": "https://projetocomprova.com.br/feed/",
}

VERDICTOS = ["FALSO", "VERDADEIRO", "ENGANOSO", "IMPRECISO", "INSUSTENTÁVEL", "DEFORMADO", "CONTEXTO"]

# Nomes de busca (limitação honesta: lista curada, não NER completo)
KNOWN_POLITICIANS = [
    "Lula", "Bolsonaro", "Temer", "Dilma", "Alckmin", "Haddad", "Moro",
    "Lira", "Pacheco", "Tebet", "Dino", "Fux", "Toffoli", "Moraes",
]


def extract_verdict(title: str) -> str:
    # Veredito em qualquer posição do título (as feeds variam o formato)
    for v in VERDICTOS:
        if re.search(rf"{v}", title, re.IGNORECASE):
            return v.upper()
    match = re.search(r"\[([A-ZÁÉÍÓÚÂÊÔÃÕÇ]+)\]", title)
    if match and match.group(1).upper() in [v.upper() for v in VERDICTOS]:
        return match.group(1).upper()
    return "CHECAGEM"  # veredito não estruturado no título; checagem ainda válida


def extract_politicians(text: str) -> list[str]:
    found = []
    for name in KNOWN_POLITICIANS:
        if name.lower() in text.lower():
            found.append(name)
    return found


def fetch_rss(url: str, source: str) -> list[dict]:
    print(f"📥 Buscando {source}...")
    try:
        res = requests.get(url, headers=HEADERS, timeout=30)
        res.raise_for_status()
    except requests.RequestException as e:
        print(f"   ❌ {source}: {e}")
        return []

    try:
        root = ET.fromstring(res.content)
    except ET.ParseError as e:
        print(f"   ❌ {source}: XML inválido ({e})")
        return []

    claims = []
    for item in root.iter("item"):
        title = item.findtext("title") or ""
        link = item.findtext("link") or ""
        if not title or not link:
            continue
        description = (item.findtext("description") or "")[:200]
        claims.append({
            "title": title.strip(),
            "link": link.strip(),
            "pub_date": item.findtext("pubDate"),
            "description": description,
            "verdict": extract_verdict(title),
            "source": source,
        })
    print(f"   ✅ {len(claims)} itens")
    return claims[:50]


def run():
    all_claims = []
    for source, url in RSS_FEEDS.items():
        all_claims.extend(fetch_rss(url, source))

    for claim in all_claims:
        texto = f"{claim['title']} {claim.get('description', '')}"
        claim["politicians"] = extract_politicians(texto)

    os.makedirs(RAW_DIR, exist_ok=True)
    out = os.path.join(RAW_DIR, "fact_checking_raw.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(all_claims, f, ensure_ascii=False, indent=2)
    print(f"\n✅ {len(all_claims)} checagens salvas em {out}")

    vereditos: dict[str, int] = {}
    for c in all_claims:
        vereditos[c["verdict"]] = vereditos.get(c["verdict"], 0) + 1
    print("\n📊 Vereditos:")
    for v, count in sorted(vereditos.items(), key=lambda x: -x[1]):
        print(f"   {v}: {count}")


if __name__ == "__main__":
    run()
