import { defineConfig, devices } from "@playwright/test";

/**
 * Configuração do teste da fronteira de erro.
 *
 * ── Por que um arquivo separado ─────────────────────────────────────────────
 * `app/error.tsx` só renderiza quando um Server Component lança. Para exercitá-lo
 * de verdade é preciso um servidor com o **banco inacessível** — e isso não pode
 * conviver com a suíte principal:
 *
 * 1. **Custo**: dois `next dev` ao mesmo tempo levaram a suíte de 2,3 min para
 *    5,3 min e introduziram 2 falhas por contenção (os mesmos testes passam
 *    isolados). Um gate lento e instável é um gate que se aprende a ignorar.
 * 2. **CI**: o workflow `a11y.yml` roda `npx playwright test --grep @readonly`
 *    **contra produção**, com `E2E_NO_SERVER=1`. Um teste que espera a página de
 *    erro rodaria lá — onde `/ranking` funciona — e falharia por motivo errado.
 *    Separar por diretório remove esse risco por construção.
 *
 * ── O que já foi tentado e NÃO funciona ────────────────────────────────────
 * Abortar a requisição RSC durante navegação cliente. O Next detecta a falha e
 * cai para navegação dura; a página resolve normalmente e a fronteira nunca é
 * chamada. Verificado antes de escrever o teste.
 *
 * ── Uso ─────────────────────────────────────────────────────────────────────
 *   npm run e2e:erro
 */

const PORTA = 3034;

export default defineConfig({
  testDir: "./tests/e2e-erro",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  globalTimeout: 5 * 60_000,
  reporter: [["list"]],

  use: {
    baseURL: `http://localhost:${PORTA}`,
    channel: "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    colorScheme: "dark",
  },

  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile",
      use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 390, height: 844 } },
    },
  ],

  webServer: {
    command: `npm run dev --workspace @cp/web -- -p ${PORTA}`,
    url: `http://localhost:${PORTA}`,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      // Porta 1 em 127.0.0.1 não tem listener: qualquer consulta lança, e é isso
      // que faz a fronteira de erro renderizar.
      DATABASE_URL: "postgresql://sem:banco@127.0.0.1:1/indisponivel",
      DIRECT_URL: "postgresql://sem:banco@127.0.0.1:1/indisponivel",
      // Obrigatório: sem ele o middleware falha antes da página e o erro seria
      // outro — o teste passaria pelo motivo errado.
      NEXTAUTH_SECRET: "e2e-erro",
      NEXTAUTH_URL: `http://localhost:${PORTA}`,
      /*
        Sem `distDir` próprio de propósito.
        
        Ele seria necessário se as duas suítes rodassem ao mesmo tempo — dois
        `next dev` dividindo o mesmo `.next` sobrescrevem manifestos um do outro.
        Como `e2e` e `e2e:erro` são invocações **separadas**, o `.next` é usado em
        sequência e não há disputa.
        
        A primeira versão usava `NEXT_DIST_DIR`: o Next então reescrevia o
        `apps/web/tsconfig.json` sozinho para incluir `.next-e2e-erro/types`, o que
        acoplou o tsconfig do app a um artefato de teste — e o arquivo apareceu
        modificado num commit que não era sobre ele. Menos peças móveis é melhor.
        
        Se um dia as duas rodarem em paralelo, a saída é `NEXT_DIST_DIR` (mais um
        `distDir` no `next.config.ts`), aceitando o tsconfig reescrito.
      */
    },
  },
});
