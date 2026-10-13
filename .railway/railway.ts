import { bucket, defineRailway, postgres, project, redis, service, volume } from "railway/iac";

/**
 * Autoridade declarativa da infraestrutura Railway do Currículo Político.
 *
 * ── Região: por que US East ─────────────────────────────────────────────────
 * O Railway não oferece região no Brasil (só `pdx`, `ams`, `sfo`, `iad`, `sin`).
 * A aplicação roda em `gru1` (São Paulo) — fixado em `apps/web/vercel.json` — e
 * `iad` (US East / Virgínia) é o ponto mais próximo disponível. A escolha está
 * documentada porque não é neutra: o Supabase usado antes ficava em São Paulo e
 * tinha latência menor; o ganho que justifica a troca é o PITR com backup
 * contínuo, que o plano Free do Supabase não oferece.
 *
 * ── ARMADILHA: `railway config plan` nunca converge para a região do volume ──
 * `railway config apply` numa mudança de região de volume **retorna sucesso e
 * não altera nada**. A região do volume é imutável depois de criado — igual à
 * do bucket, que responde "Bucket region cannot be changed after creation".
 * Consequência: `plan` sempre exibirá `config.region ("sfo" → ...)` para o
 * `redis-volume-DhjC`, mesmo depois de um `apply` bem-sucedido.
 *
 * Isso NÃO é drift real nem erro de configuração: é limitação da plataforma que
 * o `plan` não sabe expressar. **Não fique reaplicando.** O que vale é a região
 * de RUNTIME, conferível com `railway status`:
 *
 *     railway status   →   Postgres · region: US East
 *
 * Para mover um volume de região de verdade seria preciso criar um volume novo
 * na região desejada e migrar o dado — o que, para o Redis (cache volátil),
 * raramente compensa.
 *
 * ── Outras limitações aprendidas na prática ─────────────────────────────────
 * - `region` aceita apenas os IDs `[pdx, ams, sfo, iad, sin]`.
 * - `multiRegionConfig` usa `numReplicas` com **mínimo 1**: não se move um banco
 *   zerando a região de origem, e `railway scale` só adiciona réplicas.
 * - Serviço e volume precisam estar na MESMA região. Com eles divergentes, o
 *   deployment ancora na região do volume — foi exatamente o sintoma que
 *   mantinha o Postgres em US West enquanto o serviço já pedia US East.
 * - No PowerShell, `railway config plan` falha com "requires Railway CLI 5.42.1
 *   or newer" mesmo na 5.47.1: o SDK lê `process.env._` para achar o CLI, e no
 *   PowerShell `_` aponta para `pwsh`. Use `$env:_ = "railway"` antes.
 */
export default defineRailway(() => {
  const Postgres = postgres("Postgres", { region: "us-east4-eqdc4a" });
  const Redis = redis("Redis", { region: "us-east4-eqdc4a" });
  Redis.deploy = { startCommand: "/bin/sh -c \"rm -rf $RAILWAY_VOLUME_MOUNT_PATH/lost+found/ && exec docker-entrypoint.sh redis-server --requirepass $REDIS_PASSWORD --save 60 1 --dir $RAILWAY_VOLUME_MOUNT_PATH\"" };
  const redisVolumeDhjC = volume("redis-volume-DhjC", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "us-east4-eqdc4a", sizeMB: 50000 });
  const postgresVolumeWRMt = volume("postgres-volume-WRMt", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "us-east4-eqdc4a", sizeMB: 50000 });
  const PostgresPITR = bucket("Postgres-PITR", { region: "sjc" });
  const neatCupboard7QIF = bucket("neat-cupboard-7QIF", { region: "sjc" });

  return project("curriculo-politico", {
    resources: [Postgres, Redis, redisVolumeDhjC, postgresVolumeWRMt, PostgresPITR, neatCupboard7QIF],
  });
});
