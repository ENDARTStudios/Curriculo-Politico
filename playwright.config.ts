import { defineConfig, devices } from "@playwright/test";

/**
 * Configuração do Playwright para o Currículo Político.
 *
 * ── Por que Playwright aqui ─────────────────────────────────────────────────
 * O projeto tinha `curl` (smoke de produção) e verificadores de matemática
 * (`verify:scoring`, `verify:identity`), mas **nenhum teste que renderizasse uma
 * página**. Isso deixava sem cobertura justamente a camada onde erros são
 * invisíveis para o TypeScript: contraste, semântica, rótulos acessíveis e
 * estados do Termômetro. O eixo de maior valor é a **auditoria de acessibilidade
 * com axe-core na tag `wcag22aa`** (WCAG 2.2 AA, o requisito declarado do
 * projeto), não a regressão visual — cujo baseline é por plataforma e já é
 * coberto por `.design-review/capture.cjs`.
 *
 * ── Dois alvos ──────────────────────────────────────────────────────────────
 *  - Local (padrão): sobe o `next dev` e testa em `http://localhost:3000`.
 *  - Produção: defina `E2E_BASE_URL=https://www.curriculopolitico.org` e
 *    `E2E_NO_SERVER=1`; nesse modo só os testes marcados como `@readonly`
 *    devem rodar, porque não há banco de teste sob nosso controle.
 *
 * Não usamos `npx playwright install`: o Chrome já instalado na máquina é
 * usado via `channel: "chrome"`. Isso evita ~280 MB de download por browser.
 */

const PORTA_LOCAL = 3033;

/**
 * Servidor de teste com o banco fora, usado só para exercitar `app/error.tsx`.
 * Ver o comentário do `webServer` abaixo.
 */
export const PORTA_SEM_BANCO = 3034;

// O `baseURL` precisa apontar para a MESMA porta que o `webServer` sobe.
//
// Estava em 3000 enquanto o servidor subia na 3033: os testes navegavam para uma
// porta onde não havia servidor nosso — e nesta máquina a 3000 é ocupada por
// outros projetos Next, então a suíte podia auditar a interface de **outro
// produto** e ainda passar. Um gate de acessibilidade que mede o site errado é
// pior que nenhum.
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORTA_LOCAL}`;
const semServidor = process.env.E2E_NO_SERVER === "1";

export default defineConfig({
  testDir: "./tests/e2e",
  // Falha rápido num projeto cujo risco é regressão silenciosa.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Servidor local compartilha um Postgres; paralelismo alto só gera flake.
  workers: process.env.CI ? 1 : 2,
  timeout: 45_000,
  globalTimeout: 10 * 60_000,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"]],

  use: {
    baseURL,
    // Chrome do sistema: nenhum browser é baixado pelo `npm install`.
    channel: "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // O projeto é dark fixo; sem isto o Chrome pode simular prefers-color-scheme
    // e esconder problemas de contraste específicos do tema real.
    colorScheme: "dark",
  },

  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile",
      // Viewport de referência do projeto (o público é majoritariamente celular).
      use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 390, height: 844 } },
    },
  ],

  webServer: semServidor
    ? undefined
    : {
        // Porta dedicada (3033) em vez da 3000. Motivo concreto: nesta máquina
        // há outros projetos Next em desenvolvimento disputando a 3000, o que
        // faz o `next dev` trocar de porta sozinho ("Port 3000 is in use, using
        // 3001") e derruba a suíte com ERR_CONNECTION_REFUSED no meio da
        // execução. Uma porta improvável elimina a disputa.
        //
        // A fronteira de erro (`app/error.tsx`) precisa de um servidor com o
        // banco fora, que não convive com esta suíte: ver `playwright.erro.config.ts`
        // e `npm run e2e:erro`.
        command: `npm run dev --workspace @cp/web -- -p ${PORTA_LOCAL}`,
        url: `http://localhost:${PORTA_LOCAL}`,
        // Sem reuso: o objetivo é testar o código atual, não um servidor
        // antigo que por acaso ficou de pé.
        reuseExistingServer: false,
        // O primeiro `next dev` compila middleware e instrumentation: 12s é
        // pouco e produzia falso negativo. 180s cobre máquina fria.
        timeout: 180_000,
        stdout: "pipe",
        stderr: "pipe",
      },
});
