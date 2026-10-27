---
type: project
updated: 2026-10-26
tags: [harmony-helper, plan, cajas, degrade]
---

# Build plan 8: Cajas de patrones y Degradé de notas

Aprobado por Sofia el 2026-10-26: "cajas con color al azar por patrón, y la mezcla de notas como degradé alineado a las notas, en otra capa." Dos capas independientes, apagadas por defecto, en la fila "Capas". Colores y matemática salen del prototipo aprobado `public/prototipos/mezcla-de-colores.html` (OKLab/OKLCH, tonos al azar).

## A. Cajas de patrones
- **Detección** (`analysis/patterns.ts`, pura). Firma de cada compás: (momento dentro del compás, altura, duración) de cada nota, con la mano elegida; los silencios quedan implícitos. Las notas ligadas que solo continúan no cuentan. El inicio real del compás sale de `meta.measures`.
- **Repetición exacta:** firma que aparece 2 o más veces. Tramos de 2 a 4 compases seguidos que se repiten, sin superponerse. Va primero el tramo más largo y sus compases no se vuelven a encuadrar. **Excepción para que se vea claro:** si un compás del tramo aparece también suelto en otro lado (A B x A y A B: la A del medio), se descarta el tramo y se encuadran los compases de a uno; si no, esa A quedaba sin caja.
- **Parecidos (transportados)**, apagado por defecto: mismo ritmo y misma secuencia de saltos entre notas, otra altura. Solo compases sueltos que no estén ya en una caja. Salen como entradas `kind: "transposed"` con `colorOf` (el patrón exacto que les presta color y letra) o, sin patrón exacto, con color propio (necesita 2 compases).
- Salida: `{ id, measures: number[][], kind, colorOf? }`.
- **Colores** (`patternColors.ts`, `patternStore.ts`): un tono por patrón repartido parejo en OKLCH (L 0,82-0,88, C 0,09-0,13), con desfase, jitter y orden al azar; vecinos nunca a menos de ~60° de tono (se mide sobre el color final ya ajustado a pantalla). Se guarda una **semilla** por hash de partitura en `hh.patterns.v1` (mismo hash que la Ficha), así los colores se regeneran iguales aunque cambie el alcance. "Otra combinación" = semilla nueva (el primer tono se mueve al menos 40°). Combinaciones guardadas: `hh.patterns.palettes.v1`, lista de listas de hex (mismo formato que `hh.proto.patternPalettes.v1`, que se importa una vez y nunca se modifica; bandera `hh.patterns.protoImported.v1`). Solo "Quitar" con confirmación borra una. Opciones: `hh.patterns.options.v1`.
- **Dibujo** (`ScoreView.tsx`): SVG propio **detrás** de la partitura (el contenedor de OSMD pasó a `position: relative`, así queda encima de las capas de fondo). Caja redondeada por aparición, borde fino del mismo tono más oscuro, letra en una píldora arriba a la izquierda. Usa `measureBoxes()` para x y los pentagramas medidos (`staffRowsRef`) para y según el alcance. Un tramo que cruza un salto de renglón se dibuja en un rectángulo por renglón. Hover y clic se calculan con las coordenadas del mouse sobre el contenedor (el SVG no recibe eventos). Se redibuja en render, zoom, resize, BPM y cambio de colores.

## B. Degradé de notas
- `analysis/degrade.ts` (pura): `buildBands` agrupa notas por renglón y pentagrama (mano derecha arriba, izquierda abajo), junta las cabezas a menos de 3 px en una parada, y corta la franja en un silencio mayor a un compás (95%) o al cambiar de renglón. Las paradas van en la x de la cabeza, no por duración. Los bordes se desvanecen; arriba y abajo hay un enmascarado suave.
- **Acorde: elegí el promedio en OKLab** (un color por parada) y no el corte vertical. Un acorde es un solo evento, una cinta con un color por posición queda más calma y legible; los colores individuales ya están en cabezas y plicas. Costo: el promedio de dos colores opuestos es un color que no es de ninguna nota.
- Nota con color apagado (rol `enabled: false`): no pone parada.
- **Contraste:** `maxIntensityForContrast` busca la mayor intensidad con que una nota negra sigue en 4,5:1 sobre cada color de la franja y sobre las mezclas a mitad de camino. Con los 12 colores de fábrica el tope es ~76%, así que el 35% por defecto lo cumple; el control llega hasta 60%. Si ella pone colores muy oscuros, la intensidad se limita y se avisa. Se asume papel blanco.
- Opciones en `hh.degrade.v1`.

## C. Interfaz
`LayerControls.tsx`, dentro de la fila "Capas": "Cajas de patrones" (+ "Ajustes de las cajas" en un popover: alcance, parecidos, intensidad, Otra combinación, Me gusta esta, Usar una combinación guardada / Quitar) y "Degradé de notas" (+ intensidad en línea). Ambas independientes de "Línea melódica". Aviso calmo: "Esta partitura no tiene compases que se repitan." Partitura de prueba: `public/prototipos/patrones-ejemplo.musicxml`.

## Pruebas
`tests/patterns.test.ts`, `tests/patternColors.test.ts` (colores, almacén y opciones), `tests/degrade.test.ts`. Total de la suite: 190.

## Límites conocidos
- Los bordes de las cajas salen de la mitad entre la última nota de un compás y la primera del siguiente, no de la barra de compás real.
- Solo compases enteros; no motivos más cortos. Los parecidos son solo de compases sueltos.
- Dos voces en una misma mano comparten franja.
- Con la línea y las cajas a la vez, la línea queda arriba; no probado con teclas de colores apagadas en el navegador.
