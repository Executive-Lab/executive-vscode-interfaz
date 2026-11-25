// Lo que corre DENTRO del VS Code de verdad.
//
// No comprueba cómo se ve: eso lo hacen las comprobaciones de contraste de
// `humo.js`, que pueden calcularlo sin pintar nada. Aquí se comprueba lo que
// solo se puede saber con un editor delante — que la extensión arranca, que
// todos sus comandos existen y que ninguno revienta al ejecutarlo.

const assert = require('node:assert');
const path = require('node:path');
const vscode = require('vscode');

const ID = 'executivelab.arnes-ui';

// Los que abren un diálogo del sistema y se quedarían esperando a que alguien
// pulse algo. Se comprueba que existen, pero no se ejecutan: un diálogo modal
// en una prueba sin nadie delante no se cierra nunca.
//
// Esta lista se comprobó a base de que la prueba se colgara. `ponerLaCara` abre
// una caja de texto y fue la primera en hacerlo.
const PIDEN_ALGO = new Set([
  'executiveLab.elegirCarpeta',
  'executiveLab.documentos',
  'executiveLab.empezarEmpresa',
  'executiveLab.ponerLaCara',
  // Estos tres preguntan antes de tocar la ventana entera, y hacen bien:
  // cambiar el aspecto de todas las ventanas de alguien no se hace a la
  // callada. Los encontró esta misma prueba, colgada esperando una respuesta.
  'executiveLab.verEditorCompleto',
  'executiveLab.modoSencillo',
  'executiveLab.quitarDeTodo',
]);

// Y por si aparece otro: ninguno puede tardar más de esto. Mejor un fallo que
// dice "este se queda colgado" que una prueba que no termina nunca.
const PACIENCIA = 8000;

const conReloj = (promesa, comando, ms = PACIENCIA) => Promise.race([
  Promise.resolve(promesa),
  new Promise((_, mal) => setTimeout(() => mal(new Error(`${comando} se queda esperando a alguien`)), ms)),
]);

// La misma copia de un módulo que cargó la extensión: en Windows la unidad
// puede llegar en otra caja, y un `require` con otra ruta da otra copia.
function elQueCargo(raiz, modulo) {
  const ruta = path.join(raiz, 'src', modulo);
  const cargado = Object.keys(require.cache).find((k) => k.toLowerCase() === ruta.toLowerCase());
  return cargado ? require.cache[cargado].exports : require(ruta);
}

const esperar = (ms) => new Promise((listo) => setTimeout(listo, ms));

async function run() {
  const fallos = [];
  const bien = (que) => console.log(`  ✓ ${que}`);
  const comprobar = async (que, hacer) => {
    try {
      const nota = await hacer();
      bien(nota ? `${que} — ${nota}` : que);
    } catch (error) {
      fallos.push(`${que}: ${error && error.message}`);
      console.log(`  ✗ ${que}\n    ${error && error.message}`);
    }
  };

  console.log('\nLa barra, en un VS Code de verdad\n');

  await comprobar('la extensión está y arranca', async () => {
    const suya = vscode.extensions.getExtension(ID);
    assert.ok(suya, `no se encuentra ${ID}`);
    await suya.activate();
    assert.equal(suya.isActive, true);
    return suya.packageJSON.version;
  });

  await comprobar('hay una carpeta abierta', () => {
    const carpetas = vscode.workspace.workspaceFolders;
    assert.ok(carpetas && carpetas.length, 'sin carpeta la barra no tiene nada que enseñar');
    return path.basename(carpetas[0].uri.fsPath);
  });

  const delManifiesto = vscode.extensions.getExtension(ID).packageJSON.contributes.commands.map((c) => c.command);

  await comprobar('todos los comandos del manifiesto están registrados de verdad', async () => {
    const registrados = new Set(await vscode.commands.getCommands(true));
    const faltan = delManifiesto.filter((c) => !registrados.has(c));
    assert.deepEqual(faltan, [], `el editor no conoce: ${faltan.join(', ')}`);
    return `${delManifiesto.length} comandos`;
  });

  await comprobar('ninguno revienta al ejecutarlo', async () => {
    const rotos = [];
    for (const comando of delManifiesto) {
      if (PIDEN_ALGO.has(comando)) continue;
      try {
        await conReloj(vscode.commands.executeCommand(comando), comando);
        await esperar(60);
      } catch (error) {
        rotos.push(`${comando} (${error && error.message})`);
      }
    }
    assert.deepEqual(rotos, [], `revientan: ${rotos.join(' · ')}`);
    return `${delManifiesto.length - PIDEN_ALGO.size} ejecutados`;
  });

  // Abrir un documento al lado. Es el caso que los dobles no pueden coger,
  // porque el doble siempre dice que sí.
  //
  // Y lo que enseñó esta prueba: `markdown.showPreviewToSide` **puede no estar
  // registrado todavía**. Lo trae una extensión de serie que el editor no
  // despierta hasta que hace falta, así que comprobar si el comando existe no
  // dice nada. Lo que sí dice algo es abrirlo de verdad y ver que aparece algo.
  await comprobar('un documento se abre al lado de verdad', async () => {
    const carpetas = vscode.workspace.workspaceFolders;
    const uri = vscode.Uri.joinPath(carpetas[0].uri, '02-DOCS', 'wiki', 'facturacion', 'ciclo.md');
    await vscode.workspace.fs.stat(uri);

    let como = 'compuesto';
    try {
      await conReloj(vscode.commands.executeCommand('markdown.showPreviewToSide', uri), 'la vista de markdown');
    } catch {
      // El mismo respaldo que usa la barra cuando esa vista no está.
      await vscode.window.showTextDocument(uri, { viewColumn: vscode.ViewColumn.Beside, preview: true });
      como = 'en crudo, con el respaldo';
    }
    await esperar(400);
    assert.ok(vscode.window.tabGroups.all.some((g) => g.tabs.length), 'no se ha abierto nada');
    return como;
  });

  await comprobar('los ajustes se escriben en el ámbito que toca', async () => {
    const config = vscode.workspace.getConfiguration();
    await config.update('executiveLab.guardarSolo', 1, vscode.ConfigurationTarget.Workspace);
    assert.equal(vscode.workspace.getConfiguration().get('executiveLab.guardarSolo'), 1);
    await config.update('executiveLab.guardarSolo', undefined, vscode.ConfigurationTarget.Workspace);
    return 'por carpeta, no global';
  });

  // Decisión 163. Lo que la vista sencilla escribe en la carpeta lo admite la
  // carpeta, y lo de todo el editor que pone el instalador no cabe en ella: por
  // eso va en los ajustes de usuario. Así estaba la vista enfocada de Claude,
  // que el editor rechazaba en la carpeta sin que nadie lo viera.
  await comprobar('cada ajuste va donde el editor lo admite', async () => {
    const fs = require('node:fs');
    const raiz = vscode.extensions.getExtension(ID).extensionPath;
    const disfraz = JSON.parse(fs.readFileSync(path.join(raiz, 'media', 'disfraz.json'), 'utf8'));
    const config = vscode.workspace.getConfiguration();
    const enLaCarpeta = [];
    for (const [clave, valor] of Object.entries(disfraz)) {
      // Las de Claude y Codex: sus extensiones no están en este editor.
      if (/^(claudeCode|chatgpt)\./.test(clave)) continue;
      const antes = (config.inspect(clave) || {}).workspaceValue;
      await config.update(clave, valor, vscode.ConfigurationTarget.Workspace);
      await config.update(clave, antes, vscode.ConfigurationTarget.Workspace);
      enLaCarpeta.push(clave);
    }
    const DE_TODO_EL_EDITOR = {
      'security.workspace.trust.enabled': false,
      'update.mode': 'none',
      'workbench.welcomePage.walkthroughs.openOnInstall': false,
      'extensions.confirmedUriHandlerExtensionIds': ['anthropic.claude-code'],
      'window.menuBarVisibility': 'hidden',
    };
    const caben = [];
    for (const [clave, valor] of Object.entries(DE_TODO_EL_EDITOR)) {
      try {
        await config.update(clave, valor, vscode.ConfigurationTarget.Workspace);
        caben.push(clave);
        await config.update(clave, undefined, vscode.ConfigurationTarget.Workspace);
      } catch { /* no cabe en una carpeta: es lo que se espera */ }
    }
    assert.deepEqual(caben, [], 'el editor deja poner en una carpeta lo que va en los de usuario porque no cabe');
    return `${enLaCarpeta.length} en la carpeta · ${Object.keys(DE_TODO_EL_EDITOR).length} solo para todo el editor`;
  });

  // El relevo de Node (C2, T032 (2)). `correr.js` arranca el editor con un
  // PATH sin ningún `node`, como el ordenador de un alumno. Lo que solo se
  // puede medir aquí: que el relevo que pone la barra al abrirse va el primero
  // del PATH del anfitrión de extensiones —el que comparten todas, también la
  // del asistente—, que un proceso hijo lo hereda y encuentra con él un Node, y
  // que un enganche escrito como `node …` corre con él y frena de verdad.
  await comprobar('sin node en el ordenador, el relevo va el primero y los hijos lo heredan', async () => {
    if (process.env.EXECUTIVE_LAB_PRUEBA_SIN_NODE !== '1') return 'SALTADA: el editor no se arrancó sin node';
    const cp = require('node:child_process');
    const fs = require('node:fs');
    const os = require('node:os');
    const raiz = vscode.extensions.getExtension(ID).extensionPath;
    // La misma copia del módulo que cargó la extensión: en Windows la unidad puede
    // llegar en otra caja, y un `require` con otra ruta da otra copia, sin lo que
    // puso la barra al activarse.
    const cargado = Object.keys(require.cache).find((k) => k.toLowerCase() === path.join(raiz, 'src', 'relevo.js').toLowerCase());
    const relevo = cargado ? require.cache[cargado].exports : require(path.join(raiz, 'src', 'relevo.js'));
    // Los enganches, como los corre Claude Code: con `sh -c`, que en Windows es el
    // de Git Bash. Allí contesta con rutas de MSYS —la carpeta temporal sale como
    // `/tmp/…`—, así que la ruta se le pide en la forma de Windows, con `cygpath -w`, y
    // se compara sin mayúsculas, como las compara Windows.
    const EN_WINDOWS = process.platform === 'win32';
    const SH = EN_WINDOWS ? require(path.join(raiz, 'src', 'entorno.js')).bash() : '/bin/sh';
    const mismaCarpeta = (a, b) => (EN_WINDOWS ? a.toLowerCase() === b.toLowerCase() : a === b);

    const puesto = relevo.comoEsta();
    assert.equal(puesto.modo, 'relevoVSCode', `sin node, la barra no pone el relevo: ${JSON.stringify(puesto)}`);
    assert.equal(process.env.PATH.split(path.delimiter)[0], puesto.carpeta, 'el relevo no va el primero del PATH');

    // Un hijo que no dice nada de su entorno hereda el del anfitrión: es como
    // lanza el asistente su proceso, y como ese proceso lanza los enganches.
    // Y el relevo lanza el mismo Node con el que la barra corre RSC
    // (`entorno.node()`): el de la app, si un instalador la dejó, y si no el
    // de VS Code. La primera vez se exigió aquí el de VS Code, y en un Mac con
    // una app de prueba instalada la comprobación falló por lo que está bien.
    // Y no se comparan rutas: el `node` de la app es un guion que elige la
    // arquitectura y lanza `node-arm64`. Se compara lo que corre de verdad por
    // los dos caminos.
    const entorno = require(path.join(raiz, 'src', 'entorno.js'));
    const dondeEsta = EN_WINDOWS ? 'cygpath -w "$(command -v node)"' : 'command -v node';
    const [donde, cual] = cp.execFileSync(SH, ['-c', `${dondeEsta}; node -p process.execPath`], { encoding: 'utf8' }).trim().split(/\r?\n/);
    assert.ok(mismaCarpeta(path.dirname(donde), puesto.carpeta), `el hijo encuentra otro node: ${donde}`);
    const directo = cp.execFileSync(entorno.node(), ['-p', 'process.execPath'], { encoding: 'utf8', env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' } }).trim();
    assert.equal(cual, directo, `el relevo lanza otro Node: ${cual}, y la barra usa ${directo}`);
    const deQuien = entorno.node() === process.execPath ? 'el de VS Code' : 'el de la app';

    // Y el freno, como lo engancha `aplicar.js` —corriendo también con el
    // relevo— y como lo corre Claude Code: con `sh -c` y la carpeta en
    // CLAUDE_PROJECT_DIR.
    const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'relevo-'));
    fs.mkdirSync(path.join(carpeta, '.claude'), { recursive: true });
    fs.writeFileSync(path.join(carpeta, '.rsc.json'), JSON.stringify({ version: 1, targets: ['claude'] }));
    fs.writeFileSync(path.join(carpeta, '.claude', 'settings.json'), '{}\n');
    cp.execFileSync(SH, ['-c', 'node "$1" "$2"', 'sh', path.join(raiz, 'media', 'railes', 'aplicar.js'), carpeta], { encoding: 'utf8' });
    const ajustes = JSON.parse(fs.readFileSync(path.join(carpeta, '.claude', 'settings.json'), 'utf8'));
    const freno = (ajustes.hooks.PreToolUse || []).flatMap((e) => e.hooks || []).map((h) => h.command).find((o) => o.includes('/executive-lab/freno.mjs'));
    assert.ok(freno, 'los raíles no enganchan el freno');
    const pasar = (orden) => cp.spawnSync(SH, ['-c', freno], {
      input: JSON.stringify({ tool_name: 'Bash', tool_input: { command: orden } }),
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_PROJECT_DIR: carpeta },
    });
    const peligrosa = pasar('rm -rf ./informes');
    assert.equal(peligrosa.status, 0, peligrosa.stderr);
    assert.match(peligrosa.stdout, /"permissionDecision":\s*"deny"/, 'con el relevo, el freno deja pasar un rm -rf');
    assert.doesNotMatch(pasar('ls -la').stdout, /"deny"/, 'y frena también lo que no es peligroso');
    fs.rmSync(carpeta, { recursive: true, force: true });
    return `el relevo lanza ${deQuien}, y el freno deniega`;
  });

  // «Actualizar ahora» (decisión 132). Lo que solo se sabe con un editor de
  // verdad: que `workbench.extensions.installExtension` instala el `.vsix` que
  // baja la barra. GitHub se finge dentro del editor —la release y la
  // descarga—, con un paquete de verdad que hace `correr.js`, y se mira que el
  // editor lo ha dejado en su carpeta de extensiones.
  await comprobar('«Actualizar ahora» baja el paquete y el editor lo instala de verdad', async () => {
    const fs = require('node:fs');
    const os = require('node:os');
    const crypto = require('node:crypto');
    const paquete = process.env.EXECUTIVE_LAB_PRUEBA_PAQUETE;
    const dondeVan = process.env.EXECUTIVE_LAB_PRUEBA_EXTENSIONES;
    assert.ok(paquete && fs.existsSync(paquete), 'correr.js no ha hecho el paquete de prueba');
    const version = elQueCargo(vscode.extensions.getExtension(ID).extensionPath, 'version.js');
    const bytes = fs.readFileSync(paquete);
    const release = {
      tag_name: 'v99.0.0',
      author: { login: version.DUENA },
      assets: [{
        name: 'executive-lab-99.0.0.vsix',
        uploader: { login: version.DUENA },
        browser_download_url: `https://github.com/${version.REPO}/releases/download/v99.0.0/executive-lab-99.0.0.vsix`,
        size: bytes.length,
        digest: `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`,
      }],
    };
    // Con las `Response` de verdad del editor, que son las que le llegan a la
    // barra: sin decir cuánto mide, como una descarga por trozos.
    const antes = globalThis.fetch;
    globalThis.fetch = async (url) => (String(url).endsWith('/releases/latest')
      ? new Response(JSON.stringify(release), { status: 200, headers: { 'content-type': 'application/json' } })
      : new Response(bytes, { status: 200 }));
    const almacen = fs.mkdtempSync(path.join(os.tmpdir(), 'almacen-'));
    const ctx = { globalStorageUri: vscode.Uri.file(almacen), globalState: { d: new Map(), get(k) { return this.d.get(k); }, async update(k, v) { this.d.set(k, v); } } };
    let hecho;
    try {
      hecho = await conReloj(version.ponerLaNueva(ctx, '0.43.0'), 'instalar el paquete', 90000);
    } finally {
      globalThis.fetch = antes;
    }
    assert.deepEqual(hecho, { ok: true, version: '99.0.0' }, `no se ha puesto: ${JSON.stringify(hecho)}`);
    const puestas = fs.readdirSync(dondeVan).filter((n) => n.toLowerCase().startsWith('executivelab.prueba-de-actualizar-99.0.0'));
    assert.ok(puestas.length, `el editor dice que sí, y en sus extensiones no está: ${fs.readdirSync(dondeVan).join(', ')}`);
    return `instalada: ${puestas[0]}`;
  });

  // Con Codex, el encargo lo empieza su programa en una pestaña (decisión 206). Lo
  // que solo se sabe con un editor de verdad: que la pestaña va en el editor, no
  // abajo, y que el programa recibe el encargo tal cual, sin que nadie lo
  // reinterprete. Con un Codex de mentira que apunta lo que le llega. En Windows
  // no: sin un `.exe` propio, el de mentira pasaría por `cmd.exe`, que es
  // justo lo que la barra evita.
  await comprobar('con Codex, el encargo abre su programa en una pestaña del editor, y le llega tal cual', async () => {
    if (process.platform === 'win32') return 'en Windows no se mira: haría falta un .exe de mentira';
    const fs = require('node:fs');
    const os = require('node:os');
    const raiz = vscode.extensions.getExtension(ID).extensionPath;
    const asistentes = elQueCargo(raiz, 'asistentes.js');
    const puente = elQueCargo(raiz, 'puente.js');
    const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-de-mentira-'));
    const apunte = path.join(carpeta, 'lo-que-le-llega');
    const programa = path.join(carpeta, 'codex');
    fs.writeFileSync(programa, `#!/bin/sh\npwd > "${apunte}.donde"\nfor a in "$@"; do printf '%s\\n--\\n' "$a"; done > "${apunte}.tmp"\nmv "${apunte}.tmp" "${apunte}"\n`, { mode: 0o755 });
    const antes = { elDeAhora: asistentes.elDeAhora, delPath: asistentes.terminal.programaEnElPath };
    asistentes.elDeAhora = () => asistentes.porId('codex');
    asistentes.terminal.programaEnElPath = (nombre) => (nombre === 'codex' ? programa : null);
    const habia = vscode.window.terminals.length;
    const encargo = '--sin-preguntar Haz el resumen de «Ferretería» y "Soler" & $HOME; `ls`';
    try {
      assert.equal(await conReloj(puente.enviar(encargo), 'mandarle el encargo a Codex'), 'trabajando');
      for (let i = 0; i < 50 && !fs.existsSync(apunte); i += 1) await esperar(100);
      assert.ok(fs.existsSync(apunte), 'el programa no ha arrancado');
      const llegado = fs.readFileSync(apunte, 'utf8').split('\n--\n').filter(Boolean);
      assert.deepEqual(llegado, ['--', encargo], 'el encargo no le llega tal cual');
      const donde = fs.readFileSync(`${apunte}.donde`, 'utf8').trim();
      assert.equal(fs.realpathSync(donde), fs.realpathSync(vscode.workspace.workspaceFolders[0].uri.fsPath), 'no trabaja en la carpeta');
      const suya = vscode.window.terminals.slice(habia).find((t) => t.name === 'Codex');
      assert.ok(suya, 'no hay ninguna pestaña que se llame Codex');
      const enElEditor = vscode.window.tabGroups.all.flatMap((g) => g.tabs).some((t) => t.input instanceof vscode.TabInputTerminal);
      assert.ok(enElEditor, 'la pestaña no va en el editor');
      return 'en el editor, en la carpeta, y el encargo intacto';
    } finally {
      asistentes.elDeAhora = antes.elDeAhora;
      asistentes.terminal.programaEnElPath = antes.delPath;
      for (const t of vscode.window.terminals.slice(habia)) t.dispose();
      fs.rmSync(carpeta, { recursive: true, force: true });
    }
  });

  console.log(`\n${fallos.length ? `${fallos.length} fallos` : 'todo bien'}\n`);
  if (fallos.length) throw new Error(fallos.join(' | '));
}

module.exports = { run };
