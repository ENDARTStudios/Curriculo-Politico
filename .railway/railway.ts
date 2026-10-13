import { bucket, defineRailway, postgres, project, redis, service, volume } from "railway/iac";

/**
 * Autoridade declarativa da infraestrutura Railway do Currículo Político.
 *
 * ── O erro que este arquivo revelou ─────────────────────────────────────────
 * O serviço Postgres já estava configurado em `us-east4-eqdc4a` (US East) — a
 * escolha correta para um público brasileiro, já que o Railway não tem região no
 * Brasil e US East é o ponto mais próximo. Mas o **volume** estava em
 * `us-west2`, e o Redis em `sfo`.
 *
 * Serviço e volume precisam estar na MESMA região: o volume é o dado, e ele não
 * migra. Com o serviço pedindo US East e o volume vivendo em US West, o
 * deployment ancorava em US West — que é exatamente o sintoma que eu não
 * conseguia explicar pelo CLI (`railway status` mostrava `US West` enquanto a
 * intenção era US East).
 *
 * `railway postgres pitr` não reportava nada disso, e `railway scale` só
 * adicionava réplicas em outra região (com mínimo de 1 na origem, o que impede
 * "mover" por escala). O `railway config pull` foi o que expôs a contradição.
 *
 * ── Ordem de operações para aplicar ─────────────────────────────────────────
 * 1. O banco está VAZIO, então recriar volume não perde dado — é o momento mais
 *    barato para corrigir a região.
 * 2. Aplicar move a infraestrutura; conferir com `railway status` que serviço e
 *    volume ficaram na mesma região.
 * 3. Reabrir o túnel SSH (a porta muda a cada recriação) e reaplicar as
 *    migrations.
 * 4. Reabilitar PITR e o agendamento de backups DEPOIS de mover, porque o
 *    vínculo do bucket de arquivamento acompanha o volume.
 */
export default defineRailway(() => {
  const Postgres = postgres("Postgres", { region: "us-east4-eqdc4a" });
  const Redis = redis("Redis", { region: "us-east4-eqdc4a" });
  Redis.deploy = { startCommand: "/bin/sh -c \"rm -rf $RAILWAY_VOLUME_MOUNT_PATH/lost+found/ && exec docker-entrypoint.sh redis-server --requirepass $REDIS_PASSWORD --save 60 1 --dir $RAILWAY_VOLUME_MOUNT_PATH\"" };
  const redisVolumeDhjC = volume("redis-volume-DhjC", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "us-east4-eqdc4a", sizeMB: 50000 });
  const redisVolumeQftC = volume("redis-volume-QftC", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "sfo", sizeMB: 50000 });
  const redisVolume = volume("redis-volume", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "sfo", sizeMB: 50000 });
  const postgresVolumeWRMt = volume("postgres-volume-WRMt", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "us-east4-eqdc4a", sizeMB: 50000 });
  const postgresVolume = volume("postgres-volume", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "sfo", sizeMB: 50000 });
  const PostgresPITR = bucket("Postgres-PITR", { region: "sjc" });
  const neatCupboard7QIF = bucket("neat-cupboard-7QIF", { region: "sjc" });

  return project("curriculo-politico", {
    resources: [Postgres, Redis, redisVolumeDhjC, redisVolumeQftC, redisVolume, postgresVolumeWRMt, postgresVolume, PostgresPITR, neatCupboard7QIF],
  });
});
