; Instalador de Executive Lab para Windows (Inno Setup 6.3+, guardar como UTF-8).
;
; Tres decisiones gobiernan este fichero:
;
;   1. PrivilegesRequired=lowest. Nada de administrador, nada de UAC. Es lo que
;      permite instalarlo en un portátil gestionado por el IT de la empresa,
;      que en pyme es más común de lo que parece.
;
;   2. Esto pone las PIEZAS y nada más: el editor, Node, git y las dos
;      extensiones. Node va al PATH del usuario porque los enganches del arnés
;      lo llaman por nombre desde el editor. git no viaja dentro: lo instala
;      `preparar.js` con el instalador oficial de Git para Windows (decisión
;      26), que además está firmado por quien lo hace y no por nosotros.
;
;      Todo lo demás —elegir carpeta, las preguntas, montar el arnés, los
;      raíles, la primera copia— lo hace el panel cuando esa persona abre una
;      carpeta y pulsa "Preparar esta carpeta". Antes se hacía aquí, y eso
;      significaba mantener dos versiones del mismo onboarding y decidir por
;      adelantado en qué carpeta iba a trabajar alguien que ni había abierto
;      el programa.
;
;   3. Una sola pregunta, la única que el instalador necesita para su trabajo:
;      con qué asistente va a trabajar, porque de eso depende qué extensión se
;      instala. Y con opciones, que el diccionario no admite pregunta sin
;      ellas: un campo de texto vacío delante de quien no sabe qué escribir es
;      una pared.

#define Nombre "Executive Lab"
#define Version "0.59.0"

[Setup]
AppName={#Nombre}
AppVersion={#Version}
AppPublisher=Executive Lab
DefaultDirName={localappdata}\ExecutiveLab
PrivilegesRequired=lowest
DisableDirPage=yes
DisableProgramGroupPage=yes
DisableReadyPage=yes
OutputBaseFilename=ExecutiveLab-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
SetupIconFile=carga\executivelab.ico
UninstallDisplayName={#Nombre}
ChangesEnvironment=yes

[Languages]
Name: "es"; MessagesFile: "compiler:Languages\Spanish.isl"

[Files]
; overwritereadonly: al reinstalar encima, un fichero de solo lectura de la vez
; anterior no debe parar la instalación ni preguntar.
Source: "carga\runtime\*";   DestDir: "{app}\runtime";  Flags: recursesubdirs ignoreversion overwritereadonly
; preparar.js y los módulos que necesita para funcionar. El arnés y los raíles
; ya no viajan aquí: van dentro del .vsix, que es quien los usa.
Source: "carga\preparar.js"; DestDir: "{app}";          Flags: ignoreversion overwritereadonly
Source: "carga\git.js";      DestDir: "{app}";          Flags: ignoreversion overwritereadonly
Source: "carga\ajustes.js";  DestDir: "{app}";          Flags: ignoreversion overwritereadonly
Source: "carga\ajustes-del-editor.js"; DestDir: "{app}"; Flags: ignoreversion overwritereadonly
Source: "carga\control-remoto.js"; DestDir: "{app}";   Flags: ignoreversion overwritereadonly
Source: "carga\executive-lab.vsix"; DestDir: "{app}";   Flags: ignoreversion overwritereadonly
Source: "carga\executivelab.ico";   DestDir: "{app}";   Flags: ignoreversion overwritereadonly
Source: "carga\disfraz.json";       DestDir: "{app}";   Flags: ignoreversion overwritereadonly
; El instalador de VS Code YA NO VIAJA AQUÍ: son 225 MB de los 256 que pesaba
; esto. Se descarga durante la instalación, como ya hacía el de macOS, y no se
; descarga nada si esa persona ya lo tiene. Hace falta red, que de todos modos
; hace falta para el login y para la extensión del asistente.

[Registry]
; Para que la extensión encuentre la app aunque cambie la carpeta por defecto.
Root: HKCU; Subkey: "Environment"; ValueType: string; ValueName: "EXECUTIVE_LAB_HOME"; ValueData: "{app}"; Flags: uninsdeletevalue

; Aquí no hay [Run]: el editor y el último paso (git y las dos extensiones) se
; lanzan desde [Code], en `PonerLasPiezas`. Inno no mira cómo termina un [Run], y
; si el último paso fallaba la persona veía «instalado» sin estarlo.

[UninstallRun]
; El control remoto de Claude, si lo puso la instalación y sigue puesto
; (decisión 143). Antes de borrar los ficheros: hace falta el node y el módulo.
Filename: "{app}\runtime\node.exe"; \
  Parameters: """{app}\control-remoto.js"" --quitar"; \
  RunOnceId: "QuitarControlRemoto"; Flags: runhidden waituntilterminated
; Y lo que puso en los ajustes del editor (decisión 163): solo lo que dice su
; constancia, y solo si sigue con el valor que dejó.
Filename: "{app}\runtime\node.exe"; \
  Parameters: """{app}\ajustes-del-editor.js"" --quitar"; \
  RunOnceId: "QuitarAjustesDelEditor"; Flags: runhidden waituntilterminated

[Icons]
; Abre el editor, sin carpeta: la elige esa persona la primera vez, y el panel
; la prepara. El disfraz lo pone la extensión cuando se enciende.
Name: "{autodesktop}\{#Nombre}"; \
  Filename: "{code:RutaDelEditor}"; \
  IconFilename: "{app}\executivelab.ico"; \
  Comment: "Abre Executive Lab"

[Code]
var
  PaginaAsistente: TInputOptionWizardPage;
  PaginaDescarga: TDownloadWizardPage;
  Descargado: Boolean;

// El sitio oficial de Microsoft, con su enlace permanente a la última estable
// para instalación por usuario. No se fija ninguna versión: el editor se
// actualiza solo y repartir uno viejo no gana nada.
const
  DESCARGA_DEL_EDITOR = 'https://update.code.visualstudio.com/latest/win32-x64-user/stable';

// ¿Ya lo tiene? Se mira donde lo deja cada tipo de instalación. Si está, no se
// descargan 225 MB para nada.
function YaTieneElEditor(): Boolean;
begin
  Result := FileExists(ExpandConstant('{localappdata}\Programs\Microsoft VS Code\Code.exe'))
         or FileExists(ExpandConstant('{commonpf}\Microsoft VS Code\Code.exe'))
         or FileExists(ExpandConstant('{commonpf32}\Microsoft VS Code\Code.exe'));
end;

function RutaDelEditor(Param: String): String;
begin
  Result := ExpandConstant('{localappdata}\Programs\Microsoft VS Code\Code.exe');
  if FileExists(Result) then Exit;
  if FileExists(ExpandConstant('{commonpf}\Microsoft VS Code\Code.exe')) then
    Result := ExpandConstant('{commonpf}\Microsoft VS Code\Code.exe')
  else if FileExists(ExpandConstant('{commonpf32}\Microsoft VS Code\Code.exe')) then
    Result := ExpandConstant('{commonpf32}\Microsoft VS Code\Code.exe');
end;

function AlDescargar(const NombreDelFichero, URL: String; const Progreso, Total: Int64): Boolean;
begin
  Result := True;
end;

procedure InitializeWizard;
begin
  Descargado := False;

  PaginaAsistente := CreateInputOptionPage(wpWelcome,
    'Tu asistente', '¿Con cuál vas a trabajar?',
    'Claude y Codex hacen lo mismo aquí. Si en clase te han dicho uno, elige ese. Si no lo sabes, deja Claude. «Los dos» pone los dos.',
    True, False);
  PaginaAsistente.Add('Claude');
  PaginaAsistente.Add('Codex');
  PaginaAsistente.Add('Los dos');
  PaginaAsistente.SelectedValueIndex := 0;
  // En silencio no hay quien elija: `/ASISTENTE=codex` o `/ASISTENTE=losDos`
  // (decisión 168). Sin nada, o con algo que no se entiende, Claude.
  if CompareText(ExpandConstant('{param:ASISTENTE|}'), 'codex') = 0 then
    PaginaAsistente.SelectedValueIndex := 1
  else if CompareText(ExpandConstant('{param:ASISTENTE|}'), 'losDos') = 0 then
    PaginaAsistente.SelectedValueIndex := 2;

  PaginaDescarga := CreateDownloadPage('Descargando el editor',
    'Son unos 100 MB. Tarda según tu conexión.', @AlDescargar);
end;

// La descarga va justo después de la única pregunta, antes de tocar el disco:
// si falla, no se ha instalado nada a medias.
function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if CurPageID <> PaginaAsistente.ID then
    Exit;

  if YaTieneElEditor() then
  begin
    Descargado := False;
    Exit;
  end;

  PaginaDescarga.Clear;
  PaginaDescarga.Add(DESCARGA_DEL_EDITOR, 'VSCodeUserSetup-x64.exe', '');
  PaginaDescarga.Show;
  try
    try
      PaginaDescarga.Download;
      Descargado := True;
    except
      SuppressibleMsgBox('No he podido descargar el editor. Mira que haya conexión y vuelve a intentarlo.' + #13#10 + #13#10 + GetExceptionMessage, mbCriticalError, MB_OK, IDOK);
      Result := False;
    end;
  finally
    PaginaDescarga.Hide;
  end;
end;

function AsistenteElegido(Param: String): String;
begin
  if PaginaAsistente.SelectedValueIndex = 1 then
    Result := 'codex'
  else if PaginaAsistente.SelectedValueIndex = 2 then
    Result := 'losDos'
  else
    Result := 'claude';
end;

// El PATH del usuario. Los enganches del arnés llaman a node por nombre desde
// el editor, y esa persona no tiene Node en el sistema. git no se añade: lo
// pone su propio instalador, donde le corresponda.
procedure AnadirAlPath(Carpeta: String);
var
  Actual: String;
begin
  if not RegQueryStringValue(HKEY_CURRENT_USER, 'Environment', 'Path', Actual) then
    Actual := '';
  if Pos(';' + Uppercase(Carpeta) + ';', ';' + Uppercase(Actual) + ';') > 0 then
    Exit;
  if Actual = '' then
    Actual := Carpeta
  else
    Actual := Actual + ';' + Carpeta;
  RegWriteExpandStringValue(HKEY_CURRENT_USER, 'Environment', 'Path', Actual);
end;

// Lo que ve la persona cuando el último paso falla: el motivo en una frase, y un
// informe en el escritorio para su tutor. `preparar.js` ya deja el informe y el
// motivo (`motivo.txt`, en el código de página de Windows); si ni eso pudo
// —no arrancó, o se cayó antes—, el informe lo deja el instalador.
procedure ContarQueHaFallado(Codigo: Integer);
var
  App, Informe, Porque: String;
  Crudo: AnsiString;
  Lineas: TArrayOfString;
begin
  App := ExpandConstant('{app}');
  Informe := ExpandConstant('{userdesktop}') + '\Informe para tu tutor.txt';
  Porque := '';
  if LoadStringFromFile(App + '\motivo.txt', Crudo) then
    Porque := Trim(String(Crudo));
  if Porque = '' then
    Porque := 'el último paso de la instalación se ha parado (código ' + IntToStr(Codigo) + ') y no ha dicho por qué';

  if not FileExists(Informe) then
  begin
    SetArrayLength(Lineas, 4);
    Lineas[0] := 'Executive Lab: la instalación no ha terminado.';
    Lineas[1] := 'Motivo: ' + Porque;
    Lineas[2] := '';
    Lineas[3] := 'El registro, si llegó a escribirse, está en ' + App + '\instalacion.log';
    SaveStringsToUTF8File(Informe, Lineas, False);
  end;

  Log('El ultimo paso ha fallado: ' + Porque);
  SuppressibleMsgBox('No he podido terminar: ' + Porque + '.' + #13#10 + #13#10 +
    'Te he dejado en el escritorio un informe para tu tutor: «Informe para tu tutor.txt».',
    mbError, MB_OK, IDOK);
end;

// El editor (si hubo que descargarlo) y después `preparar.js`, que pone git y las
// extensiones. Va aquí y no en [Run] para poder mirar cómo terminó.
procedure PonerLasPiezas();
var
  App, Escritorio: String;
  Codigo: Integer;
begin
  App := ExpandConstant('{app}');
  Escritorio := ExpandConstant('{userdesktop}');

  if Descargado then
  begin
    WizardForm.StatusLabel.Caption := 'Instalando el editor...';
    if not Exec(ExpandConstant('{tmp}\VSCodeUserSetup-x64.exe'),
        '/VERYSILENT /NORESTART /SUPPRESSMSGBOXES /MERGETASKS=!runcode',
        '', SW_HIDE, ewWaitUntilTerminated, Codigo) then
      Codigo := -1;
    // Si falla, preparar.js lo dirá con sus palabras al no encontrar el editor.
    Log('Instalador del editor: código ' + IntToStr(Codigo));
  end;

  DeleteFile(App + '\motivo.txt');
  WizardForm.StatusLabel.Caption := 'Poniendo el editor y el asistente. Esto tarda un par de minutos...';
  if not Exec(App + '\runtime\node.exe',
      '"' + App + '\preparar.js" --asistente "' + AsistenteElegido('') + '" --escritorio "' + Escritorio + '"',
      App, SW_HIDE, ewWaitUntilTerminated, Codigo) then
    Codigo := -1;
  Log('preparar.js: codigo ' + IntToStr(Codigo));
  if Codigo <> 0 then
    ContarQueHaFallado(Codigo);
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    AnadirAlPath(ExpandConstant('{app}') + '\runtime');
    PonerLasPiezas();
  end;
end;
