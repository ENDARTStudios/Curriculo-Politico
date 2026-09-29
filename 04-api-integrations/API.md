# API — Currículo Político

## Autenticação
Nenhuma rota GET requer autenticação. POST requer sessão NextAuth (JWT via cookie).

## Rate Limiting
60 requisições/minuto por IP em todas as rotas `/api/*` (middleware).
Excedido: `429` com `{"error": "RATE_LIMITED"}`.

---

## Rotas

### `GET /api/search?q={termo}`
Busca unificada em 4 entidades (políticos, partidos, projetos, histórico).
Mínimo 2 caracteres. Limite 8 por categoria.

### `GET /api/rankings?cargo={}&limit={}`
Top N parlamentares com confiança ≥ 60%, ordenados por nota.
- `cargo`: `LEGISLATIVE` ou `EXECUTIVE` (opcional)
- `limit`: 1–50 (default 10)

### `GET /api/politicians/{id}`
Perfil completo: termos, scores, custos, registros jurídicos (LGPD-filtered).
Aceita id interno (cuid) ou externalId (Câmara/Senado/TSE).

### `GET /api/compare?ids={id1,id2[,id3]}`
Comparação lado a lado de até 5 políticos. Stats de votos/bills/attendance.

### `GET /api/bills?page={}&limit={}&q=&type=&year=`
Listagem paginada de proposições. Filtros por busca, tipo e ano.

### `GET /api/bills/{id}/vote`
Contagens públicas de voto popular (favor/contra) + `votingOpen`.

### `POST /api/bills/{id}/vote`
Registra voto popular (FAVOR/CONTRA). Requer login. Anti-bot: conta < 24h → 403.

---

## Formato de Erro
```json
{
  "error": "CÓDIGO_ESTILO",
  "message": "Descrição legível em português"
}
```
Códigos: `RATE_LIMITED` (429), `AUTH_REQUIRED` (401), `ACCOUNT_TOO_NEW` (403),
`POLITICO_NAO_ENCONTRADO` (404), `PROJETO_NAO_ENCONTRADO` (404),
`INVALID_VOTE` (400), `CARGO_INVALIDO` (400), `IDS_OBRIGATORIO` (400).
