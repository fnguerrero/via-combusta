# Deja el acceso directo de Via Combusta en el Escritorio.
#
# El destino es el archivo empaquetado, que es autocontenido: lo abre el
# navegador predeterminado de Windows, sin servidor y sin internet.
#
# Uso:  powershell -ExecutionPolicy Bypass -File tools\crear-acceso-directo.ps1

$raiz  = Split-Path -Parent $PSScriptRoot
$juego = Join-Path $raiz 'dist\index.html'
$icono = Join-Path $raiz 'viacombusta.ico'

if (-not (Test-Path $juego)) {
    Write-Error "Falta $juego. Genera el paquete con:  py -3 build.py"
    exit 1
}
if (-not (Test-Path $icono)) {
    Write-Error "Falta $icono. Genera el icono con:  py -3 tools\make_icon.py"
    exit 1
}

$destino = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Via Combusta.lnk'

$shell = New-Object -ComObject WScript.Shell
$lnk = $shell.CreateShortcut($destino)
$lnk.TargetPath       = $juego
$lnk.WorkingDirectory = Split-Path $juego
$lnk.IconLocation     = "$icono,0"
$lnk.Description      = 'Via Combusta - una historia de terror en doce casas'
$lnk.Save()

Write-Output "Acceso directo creado: $destino"
Write-Output "  apunta a: $juego"
Write-Output "  icono:    $icono"
