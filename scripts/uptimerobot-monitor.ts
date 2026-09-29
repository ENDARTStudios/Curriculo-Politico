/**
 * Cria monitor de uptime no UptimeRobot (API v2) apontando para o
 * domínio de produção. Requer UPTIMEROBOT_API_KEY no ambiente.
 *
 *   UPTIMEROBOT_API_KEY=... npx tsx scripts/uptimerobot-monitor.ts [url]
 *
 * API docs: https://uptimerobot.com/api/
 */
const KEY = process.env.UPTIMEROBOT_API_KEY;
const URL_ALVO = process.argv[2] ?? "https://curriculopolitico.org";

export {};

if (!KEY) {
  console.error(
    "❌ UPTIMEROBOT_API_KEY ausente. Crie a key em https://uptimerobot.com/app/settings (API v2, tipo 'Main').",
  );
  process.exit(1);
}

const res = await fetch("https://api.uptimerobot.com/v2/newMonitor", {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    "Cache-Control": "no-cache",
  },
  body: new URLSearchParams({
    api_key: KEY,
    friendly_name: "Currículo Político — Home",
    url: URL_ALVO,
    type: "1", // HTTP(S)
    interval: "300", // 5 min
  }),
});

const data = (await res.json()) as {
  stat: string;
  error?: { message: string };
  monitor?: { id: number; url: string };
};

if (data.stat === "ok" && data.monitor) {
  console.log(`✅ Monitor criado: ${data.monitor.url} (id ${data.monitor.id})`);
  console.log("   Painel: https://uptimerobot.com/dashboard");
} else {
  console.error(`❌ Erro: ${data.error?.message ?? JSON.stringify(data)}`);
  process.exit(1);
}
