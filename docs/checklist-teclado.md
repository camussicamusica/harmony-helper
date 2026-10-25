---
type: sop
updated: 2026-10-25
tags: [harmony-helper, pruebas]
---

# Checklist de 10 minutos con tu teclado MIDI

Para qué sirve: comprobar que la app escucha tu teclado de verdad. Yo solo lo pude probar con un teclado simulado.

Cómo usarlo:
- Hacé las pruebas en orden.
- En cada una dice **qué tenés que ver**.
- Si no ves eso, anotá el número de la prueba y lo que viste. Si podés, sacale una foto a la pantalla.
- Al final me pasás solo las que fallaron.

## Antes de empezar (1 min)
1. Enchufá el teclado MIDI a la Mac por USB.
2. Prendé el teclado.
3. Abrí Chrome en `http://localhost:5190`. Si no abre, prendé la app primero (instructivo, sección 1).

## Las 10 pruebas

| # | Hacé esto | Tenés que ver | ✓ / ✗ |
|---|---|---|---|
| 1 | Apretá **"Conectar teclado MIDI"** (arriba a la izquierda) | Chrome te pregunta si permitís el MIDI. Apretá **"Permitir"**. Después dice **"Teclado: …"** con el nombre de tu teclado | |
| 2 | Apretá **"Mostrar teclado"** si el piano de la pantalla no está. Tocá un Do en el medio del teclado | La tecla Do del piano de la pantalla se ilumina en tu color de Do. Arriba dice **"Do (C) · octava 4"** | |
| 3 | Tocá una tecla negra, por ejemplo Fa# | Se ilumina y dice sus dos nombres: **"Fa# (F#) / Sol♭ (G♭)"** | |
| 4 | Tocá Fa#, La y Do# juntos y dejalos apretados | Al lado de la nota aparece **"Fa# menor"** | |
| 5 | Soltá las teclas | El piano de la pantalla se apaga | |
| 6 | Tocá una nota, pisá el **pedal**, soltá la tecla, y después soltá el pedal | Con el pedal pisado, la tecla sigue iluminada. Al soltar el pedal, se apaga | |
| 7 | Hacé clic donde dice **"Teclado: …"** para abrir su menú y prendé **"Sonido de la app al tocar"**. Tocá una nota | Suena la nota también desde la compu. Si no te gusta, apagalo de nuevo | |
| 8 | Apretá **"Recorrido"** → andá al **paso 3** con **"Siguiente"** | Aparece "Tocá la escala de Sol mayor subiendo, una octava" y 8 cuadritos | |
| 9 | Tocá Sol La Si Do Re Mi **Fa (sin sostenido)** | Te avisa **"Esa es Fa (F); la escala usa Fa# (F#)"** y **no** borra lo que ya tocaste. Seguí con Fa# y Sol: dice **"Salió la escala."** | |
| 10 | Más abajo: tocá Sol, Si y Re juntos, en cualquier orden u octava | Se completa **"Tocá el acorde de tónica"** | |

## Si algo falla
- **Prueba 1, dice "Chrome bloqueó el permiso":** hacé clic en el candado (o el ícono de ajustes) a la izquierda de la dirección → **MIDI** → **Permitir** → recargá la página.
- **Prueba 1, dice "No encuentro ningún teclado":** desenchufá y volvé a enchufar el USB, y apretá de nuevo.
- **Nada se ilumina pero dice "Teclado: …":** puede que el teclado esté mandando por otro canal o puerto. Anotá el nombre que aparece y mandámelo.

## Para mandarme
Copiá esto y completalo:
```
Pruebas que fallaron: (números)
Lo que vi: 
Nombre del teclado que aparece: 
```

## Extra (opcional, 2 min)
- **Enchufar con la app abierta:** desenchufá el teclado y volvé a enchufarlo. ¿El estado cambia solo, sin recargar?
- **Recargar la página:** ¿se reconecta sola o pide "Reconectar teclado MIDI"? Cualquiera de las dos está bien. Anotá cuál pasó.
