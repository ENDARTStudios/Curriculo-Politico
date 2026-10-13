# Script de diagnóstico: builda N vezes seguidas capturando o exit code REAL.
#
# Motivo 1 — medição: `npm run build 2>&1 | Select-String ...` faz
# `$LASTEXITCODE` refletir o Select-String, não o npm. Isso mascarou qual
# execução realmente falhou num diagnóstico anterior. Aqui o código de saída é
# capturado sem pipe.
#
# Motivo 2 — o que este script ajudou a descobrir: o build do Next falha de
# forma INTERMITENTE quando existe um `next dev` ativo, porque os dois
# compartilham `apps/web/.next`. Os sintomas são enganosos e variam
# (`Invariant: no direct app page entry found for /_not-found`,
# `ENOENT .../route.js.nft.json`, `Cannot find module
# './chunks/vendor-chunks/next.js'`), o que faz parecer bug de código quando é
# concorrência de diretório. Se este script acusar falha, **primeiro** verifique
# se há dev server ativo (inclusive órfão) antes de investigar o código.
# Ver a seção "Armadilhas conhecidas" do AGENTS.md.
param(
  [string]$Rotulo = "teste",
  [int]$Vezes = 3
)

$ErrorActionPreference = "Continue"
$raiz = "D:\PROJETOS\Currículo Político"

Push-Location $raiz
try {
  for ($i = 1; $i -le $Vezes; $i++) {
    $log = Join-Path $env:TEMP "cp-build-$Rotulo-$i.log"
    # Sem pipe: o exit code é o do npm.
    & cmd.exe /c "npm run build > `"$log`" 2>&1"
    $code = $LASTEXITCODE

    $conteudo = Get-Content $log -Raw
    $ok = $conteudo -match "Compiled successfully" -and $conteudo -notmatch "Build error occurred"
    $inv = $conteudo -match "no direct app page entry found"

    $veredito = if ($code -eq 0 -and $ok) { "PASSOU" } elseif ($inv) { "FALHOU (invariant _not-found)" } else { "FALHOU (outro)" }
    "[$Rotulo] run $i/$Vezes -> exit=$code  $veredito"
  }
}
finally {
  Pop-Location
}
