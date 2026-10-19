# Las dos pruebas que probar.ps1 no hace, porque solo mira la primera instalacion
# y el camino bueno (decision 194). Se corre DESPUES de probar.ps1:
#
#   powershell -ExecutionPolicy Bypass -File probar-reinstalar-y-fallar.ps1 reinstalar
#   powershell -ExecutionPolicy Bypass -File probar-reinstalar-y-fallar.ps1 fallar
#
# reinstalar: deja una instalacion "vieja" (un fichero de mas, ficheros de solo
#   lectura, incluido el node.exe) e instala OTRA VEZ encima, en silencio. Tiene
#   que terminar sin error y sin dejar informe de fallo. Despues se vuelve a pasar
#   probar.ps1.
# fallar: instala encima otra vez, pero con el paso final forzado a fallar (solo
#   funciona dentro de GitHub Actions: preparar.js lo exige). Tiene que quedar en
#   el escritorio 'Informe para tu tutor.txt' con el motivo, el progreso y el
#   registro, y el registro del instalador tiene que decir que fallo.

param([Parameter(Mandatory = $true)][ValidateSet('reinstalar', 'fallar')][string]$Que, [string]$Asistente = 'claude')

$ErrorActionPreference = 'Stop'
$aqui = Split-Path -Parent $MyInvocation.MyCommand.Path
$exe = Join-Path $aqui 'Output\ExecutiveLab-Setup.exe'
if (-not (Test-Path $exe)) { $exe = Join-Path $aqui 'ExecutiveLab-Setup.exe' }
$app = Join-Path $env:LOCALAPPDATA 'ExecutiveLab'
$informe = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Informe para tu tutor.txt'
$registroDeInno = Join-Path $aqui "inno-$Que.log"
$mal = @()

function Instalar {
  $p = Start-Process -FilePath $exe -ArgumentList '/VERYSILENT', '/NORESTART', '/SUPPRESSMSGBOXES', "/ASISTENTE=$Asistente", "/LOG=$registroDeInno" -Wait -PassThru
  return $p.ExitCode
}

if (-not (Test-Path "$app\runtime\node.exe")) { throw "no hay una primera instalacion en ${app}: pasa antes probar.ps1" }
if (Test-Path $informe) { Remove-Item $informe -Force }

if ($Que -eq 'reinstalar') {
  # Lo que dejaria una version anterior: algo que la nueva no trae, y ficheros que
  # alguien (o el antivirus) dejo en solo lectura.
  New-Item -ItemType Directory -Force "$app\runtime\viejo" | Out-Null
  Set-Content "$app\runtime\viejo\sobra.txt" 'de una version anterior'
  foreach ($f in @("$app\preparar.js", "$app\git.js", "$app\runtime\node.exe", "$app\runtime\viejo\sobra.txt")) {
    (Get-Item $f).IsReadOnly = $true
  }
  Write-Host 'Reinstalando encima, en silencio...'
  $codigo = Instalar
  if ($codigo -ne 0) { $mal += "el instalador ha salido con codigo $codigo al reinstalar" }
  if (Test-Path $informe) { $mal += 'ha dejado un informe de fallo al reinstalar' }
  if (-not (Test-Path "$app\runtime\node.exe")) { $mal += 'tras reinstalar no hay node.exe' }
  if ((Get-Item "$app\preparar.js").IsReadOnly) { $mal += 'preparar.js sigue de solo lectura: no se ha reemplazado' }
  if (Test-Path "$app\motivo.txt") { $mal += 'queda un motivo.txt de un fallo que no ha habido' }
  $log = Join-Path $app 'instalacion.log'
  if (-not (Test-Path $log) -or ((Get-Item $log).LastWriteTime -lt (Get-Date).AddMinutes(-10))) { $mal += 'preparar.js no ha vuelto a escribir su registro' }
}

if ($Que -eq 'fallar') {
  $env:EXECUTIVE_LAB_PROBAR_FALLO = '1'
  Write-Host 'Instalando encima con el ultimo paso forzado a fallar...'
  $codigo = Instalar
  Remove-Item Env:EXECUTIVE_LAB_PROBAR_FALLO
  if (-not (Test-Path $informe)) { $mal += "no hay informe en el escritorio ($informe)" }
  else {
    $texto = Get-Content $informe -Raw -Encoding UTF8
    foreach ($trozo in @('la instalaci', 'Motivo: fallo forzado', '--- Progreso', '--- Registro', 'fallo forzado por la prueba (EXECUTIVE_LAB_PROBAR_FALLO)')) {
      if ($texto -notlike "*$trozo*") { $mal += "el informe no lleva: $trozo" }
    }
  }
  if (-not (Test-Path "$app\motivo.txt")) { $mal += 'preparar.js no ha dejado motivo.txt' }
  $dentro = if (Test-Path $registroDeInno) { Get-Content $registroDeInno -Raw } else { '' }
  if ($dentro -notlike '*preparar.js: codigo 1*') { $mal += 'el registro del instalador no dice que preparar.js saliera con 1' }
  if ($dentro -notlike '*ultimo paso ha fallado: fallo forzado*') { $mal += 'el instalador no ha contado el motivo (ContarQueHaFallado)' }
}

if ($mal.Count) { $mal | ForEach-Object { Write-Host "  MAL  $_" -ForegroundColor Red }; exit 1 }
Write-Host "  OK   $Que" -ForegroundColor Green
if ($Que -eq 'fallar') { Write-Host "  Informe: $informe"; Get-Content $informe -TotalCount 12 }
