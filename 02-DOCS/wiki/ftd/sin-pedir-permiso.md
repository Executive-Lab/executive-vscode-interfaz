---
type: ftd
title: Trabajar sin pedir permiso, si el alumno lo elige
date: 2026-10-19
author: Jose Sanchis
branch: sin-pedir-permiso
status: hecho
---

# Trabajar sin pedir permiso, si el alumno lo elige

## Intent

Jose: *«Mete en el instalador o al iniciar proyecto o donde sea que pregunte si por defecto se usa el modo Bypass
permissions, y si acepta que sea ese el modo por defecto de claude y codex»*. Decisión 192. Cambia lo que decían la 163 y
la 182 (nunca): ahora sí, pero solo si la persona lo elige, con «No» por defecto.

## Scope

- Una pregunta, una vez por ordenador, al preparar la primera carpeta, con su línea de riesgo.
- Con el sí: Claude (ajustes de usuario del editor y `~/.claude/settings.json`) y Codex (`~/.codex/config.toml`).
- Cambiarlo después en «Qué puede hacer sin preguntarte».
- Fuera: el instalador (sus diálogos no se han podido probar con una persona); `skipDangerousModePermissionPrompt`.

## Checklist

- [x] Confirmado en la documentación oficial de Claude Code y de Codex (fuentes en la decisión 192)
- [x] `src/sin-pedir-permiso.js`: Claude, Codex y editor, con constancia y «Quitarlo»
- [x] La pregunta al montar de cero, con «No, que me pregunte» el primero
- [x] La opción «Sin pedirme permiso» en Qué puede hacer sin preguntarte, y la tarjeta con Codex solo
- [x] Notas en las decisiones 163 y 182
- [x] Textos en `docs/diccionario.md`
- [x] Pruebas en `humo.js` y mutaciones
- [ ] PR revisada y fusionada por Jose

## Evidence

- Claves: `claudeCode.initialPermissionMode` + `claudeCode.allowDangerouslySkipPermissions` (editor),
  `permissions.defaultMode` (terminal de Claude), `approval_policy = "never"` + `sandbox_mode = "danger-full-access"`
  (Codex).
- Los enganches de Claude (`PreToolUse` que deniega) siguen valiendo en este modo: hooks-guide.
- Con Codex no está documentado que los frenos del arnés valgan, y no se dice.

## Next

Si Jose quiere la misma pregunta en el instalador de macOS y en el de Windows: pedirlo aparte, y probar sus diálogos con
una persona antes.
