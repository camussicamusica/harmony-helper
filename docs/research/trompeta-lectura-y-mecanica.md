---
type: reference
updated: 2026-10-29
tags: [harmony-helper, trompeta, investigacion]
---

# Trompeta: lectura y mecánica (investigación para Harmony Helper)

Solo investigación. No se tocó código. Todo lo que no pude confirmar con una fuente dice "(verificar)".

Cómo leer este archivo:

- Los nombres de nota van en español primero y la letra entre paréntesis: Do (C), Si♭ (B♭).
- Las funciones se escriben Tón / Subd / Dom.
- "Escrita" = lo que está en la partitura. "Suena" = lo que se escucha (altura real, "concierto").
- Los números de centésimos (cents) los calculé yo con `1200 × log2(razón)`, no los copié de memoria. Un centésimo es 1/100 de semitono.
- Varias fuentes web fallaron al bajarlas (403 o certificado vencido). Donde solo vi el resumen del buscador, lo aclaro como "segunda mano".

---

## 1. Trompeta en Si♭ (B♭): escrito vs. suena

### 1.1 Lo básico

1. La trompeta más común es la de Si♭ (B♭). Suena una segunda mayor (un tono) más grave de lo que está escrito.
2. Escrito Do (C) → suena Si♭ (B♭). Escrito Re (D) → suena Do (C).
3. Fuentes: [Wikipedia, Trumpet](https://en.wikipedia.org/wiki/Trumpet); [Wikipedia, Transposing instrument](https://en.wikipedia.org/wiki/Transposing_instrument) (el nombre de la trompeta sale de lo que suena cuando se escribe Do).
4. Para pasar de altura real a lo que lee la trompeta: subir todo una segunda mayor.
5. Para pasar de lo que lee la trompeta a lo que suena: bajar todo una segunda mayor.

### 1.2 Efecto en la armadura de clave

- Regla: la tonalidad escrita queda una segunda mayor arriba de la real. En el círculo de quintas son 2 pasos hacia el lado de los sostenidos.
- Resultado: la armadura escrita tiene 2 sostenidos más o 2 bemoles menos que la real.
- Fuente de la regla práctica ("sumar 2 sostenidos"): [Jade Bultitude, Transposition for Trumpet](https://jadebultitude.com/transposition-for-trumpet/). Ojo: esa página tiene un ejemplo inconsistente (Mi♭ mayor), así que usé la regla y calculé yo la tabla.

Tabla (calculada por la regla; verificada contra los ejemplos Do→Re y Mi♭→Fa de la fuente):

| Tonalidad real (suena) | Armadura real | Tonalidad escrita | Armadura escrita |
|---|---|---|---|
| Si♭ (B♭) mayor | 2♭ | Do (C) mayor | sin alteraciones |
| Fa (F) mayor | 1♭ | Sol (G) mayor | 1♯ |
| Mi♭ (E♭) mayor | 3♭ | Fa (F) mayor | 1♭ |
| La♭ (A♭) mayor | 4♭ | Si♭ (B♭) mayor | 2♭ |
| Re♭ (D♭) mayor | 5♭ | Mi♭ (E♭) mayor | 3♭ |
| Do (C) mayor | sin alteraciones | Re (D) mayor | 2♯ |
| Sol (G) mayor | 1♯ | La (A) mayor | 3♯ |
| Re (D) mayor | 2♯ | Mi (E) mayor | 4♯ |
| La (A) mayor | 3♯ | Si (B) mayor | 5♯ |
| Mi (E) mayor | 4♯ | Fa♯ (F♯) mayor | 6♯ |

- Menores: igual, la relativa menor sube lo mismo. Ejemplo: La (A) menor real → Si (B) menor escrito (2♯).
- Casos extremos (por ejemplo, real Si (B) mayor → escrito Do♯ (C♯) mayor, 7♯): la armadura escrita puede pasar de 7 y obligar a re-escribir en la enarmónica (otra grafía del mismo sonido). Cómo lo resuelve cada editor: (verificar).

### 1.3 Tonalidades escritas habituales para trompetistas

- Dato que no pude confirmar con una fuente citable: en banda y en jazz, las tonalidades reales más frecuentes (Si♭, Mi♭, Fa, La♭ mayor) dan escritas Do, Fa, Sol, Si♭. Por eso a la trompeta le "caen cómodas" las armaduras de 0 a 2 alteraciones. (verificar)
- Dato sí respaldado: el currículo de trompeta de la Eastman Community Music School empieza con escalas mayores de hasta 2 sostenidos o bemoles (Nivel I) y recién después las restantes (Nivel II). Fuente: [Trumpet Curriculum, Eastman (Nance)](https://esm.rochester.edu/community/?p=690).
- Para la app: la armadura que ve la trompetista no es la de la pieza real. Ver sección "Qué significa para la app".

### 1.4 Otras trompetas (breve)

| Trompeta | Qué pasa | Fuente / estado |
|---|---|---|
| Do (C) | No transpone: escrito = suena | [Wikipedia, Trumpet](https://en.wikipedia.org/wiki/Trumpet) |
| Re (D) | Suena una 2ª mayor más aguda de lo escrito | Resumen de buscador, segunda mano; (verificar) |
| Mi♭ (E♭) | Suena una 3ª menor más aguda de lo escrito | Resumen de buscador, segunda mano; (verificar) |
| La (A) | Suena una 3ª menor más grave de lo escrito | Resumen de buscador; (verificar) |
| Piccolo en Si♭ | Una octava arriba de la trompeta común; el largo de tubo es la mitad | [Wikipedia, Trumpet](https://en.wikipedia.org/wiki/Trumpet) |
| Piccolo en La | Mismo concepto, en La (A) | [Wikipedia, Trumpet](https://en.wikipedia.org/wiki/Trumpet) |
| Cornetín (cornet) en Si♭ | Mismas digitaciones y mismas notas escritas que la trompeta; cambian calibre y boquilla | thewholehorn.com (ver sección 3) |

- Intervalos exactos de la piccolo (aparecen "7ª menor arriba" en Si♭ y "6ª mayor arriba" en La en un foro de VSL): dependen de si el editor escribe la parte una octava abajo. (verificar)
- Partes de Do (C) vienen sin transposición: un trompetista de Si♭ las lee "una segunda mayor arriba" de memoria o con un instrumento de Do.

### 1.5 Cómo lo codifica MusicXML

1. MusicXML guarda las alturas como notas **escritas** de la parte. El elemento `<transpose>` dice qué hay que **sumarle a lo escrito** para obtener lo que suena. Fuente: [W3C MusicXML 4.0, `<transpose>`](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/transpose).
2. Hijos de `<transpose>` (en este orden): `<diatonic>` (opcional), `<chromatic>` (obligatorio), `<octave-change>` (opcional), `<double>` (opcional). Mismo enlace.
3. `<chromatic>` son los semitonos; `<diatonic>` son los pasos de nombre de nota. Sirve para deletrear bien (Si♭ vs La♯).
4. Ejemplo para Trompeta en Si♭: `<diatonic>-1</diatonic>` y `<chromatic>-2</chromatic>`. Es el ejemplo del tutorial de W3C según el buscador. No pude abrir esa página para ver el XML literal. (verificar)
5. Trompeta en Re (D) sería el espejo (`+1` / `+2`) y en Mi♭ (E♭) (`+2` / `+3`), deducido por la misma lógica. (verificar contra un archivo real)
6. El elemento va dentro de `<attributes>` de la primera medida de la parte. Si `<transpose>` tiene el atributo `number`, se aplica a un solo pentagrama. Si falta, a toda la parte. Mismo enlace del W3C.
7. `<octave-change>` no está incluido en `<chromatic>`: el chromatic solo cuenta semitonos dentro de la octava; hay que sumar ambos. Fuente: resumen de buscador del tutorial MusicXML (segunda mano).
8. Hilo de LilyPond: A♯ trompeta (diatonic −2, chromatic −2) suena igual que Si♭ y `musicxml2ly`, MuseScore y Finale los tratan igual aunque el `diatonic` los distinga. Fuente: [lilypond-user, mail-archive](https://www.mail-archive.com/lilypond-user@gnu.org/msg122220.html) (vía buscador).
9. Interruptor "tono de concierto" (concert pitch) en MuseScore/Finale/Sibelius: es una opción de **visualización**. Con concert pitch encendido el editor muestra lo que suena; apagado muestra lo escrito. Qué escribe cada programa en el XML cuando exportás con el interruptor encendido (si omite `<transpose>` o escribe alturas de concierto): (verificar). Los foros de MuseScore (por ejemplo [Trumpet part is not being transposed](https://musescore.org/en/node/344354) y [MusicXML – transposing instrument parts](https://musescore.org/en/node/319877)) tratan el problema, pero no los pude abrir (403).
10. Consecuencia para el parser de la app: leer `<transpose>`, y guardar las dos alturas por nota: `escrita` y `suena = escrita + transposición`. No asumir cuál de las dos trae el archivo si falta `<transpose>`.

---

## 2. Debate: ¿colorear por nota escrita o por nota que suena?

No decido. Acá van los argumentos, las fuentes y lo que no encontré.

### 2.1 Qué encontré sobre trompetistas con oído absoluto

- Hay un hilo en Trumpet Herald, "Having perfect pitch and playing a transposing instrument" (2005). Mi acceso fue de segunda mano (resumen de buscador, la página dio 403). Dice, resumido: el que tiene oído absoluto y digita Do en una trompeta en Si♭ escucha Si♭, y eso choca con lo que piensa que toca. Un trompetista de toda la vida cuenta que se acostumbró a llamar "Si" a lo que concierto es La. Otro dice tener "oído absoluto relativo a la trompeta en Si♭". Enlace: [Trumpet Herald, t=38102](https://www.trumpetherald.com/forum/viewtopic.php?t=38102). (verificar leyendo el hilo completo)
- Wikipedia sobre oído absoluto: la música escuchada "en la tonalidad equivocada" puede confundir; algunos tienen "oído absoluto desplazado" (todo medio tono más alto o bajo) cuando aprendieron los nombres de nota en un instrumento afinado distinto; el oído absoluto se superpone genéticamente con la sinestesia, y en un estudio ~20 % de las personas con oído absoluto eran también sinestetas. Fuente: [Wikipedia, Absolute pitch](https://en.wikipedia.org/wiki/Absolute_pitch). La página no menciona instrumentos transpositores.
- Sinestesia y nota "creída": un caso de estudio (vía buscador) cuenta que una sinesteta daba los mismos colores a las notas que **creía** estar tocando, aunque el sintetizador estuviera transpuesto en secreto. Es decir: en ese caso el color seguía a la nota "pensada", no a la frecuencia. Otro reporte habla de una variante donde los colores aparecen al **leer** música y no al oírla, disparados por los nombres o símbolos. Fuente: [The Synesthesia Tree, tone colour / musical note colour](https://www.thesynesthesiatree.com/2021/03/tone-colour-musical-note-colour.html) (segunda mano). No son estudios de trompetistas.
- Pedagogía de bronces: la universidad JMU enseña a transponer por intervalos de memoria, pasando o no por la altura de concierto. Para una ejecución en vivo recomiendan transponer directo entre instrumentos y no hacer el paso intermedio. Fuente: [JMU Brass Pedagogy, Approaches](https://sites.lib.jmu.edu/brasspedagogy/2016/05/25/approaches/).
- Wikipedia: un músico que toca varios instrumentos de la misma familia lee igual en todos porque las digitaciones coinciden con las mismas notas escritas. Fuente: [Wikipedia, Transposing instrument](https://en.wikipedia.org/wiki/Transposing_instrument).
- **No encontré** (ni libros ni estudios): ninguna fuente que mida si trompetistas sinestetas con oído absoluto colorean por escrita o por real. Los reportes son anecdóticos. Tampoco hay reporte de trompetistas sinestetas en las búsquedas que hice.

### 2.2 Argumentos a favor de colorear por la nota escrita

1. Es lo que la trompetista ve en la partitura y lo que hace con los dedos: Do escrito = sin válvulas siempre, en cualquier pieza.
2. Una trompetista que piensa "en Si♭" (como describen los trompetistas del hilo) asocia el color a la nota leída.
3. El color por lo que se lee es coherente con sinestesias disparadas por el símbolo o el nombre de la nota.
4. La armadura que muestra la app coincide con la del papel. La tarjeta de armadura no confunde.
5. Todas las trompetas en Si♭ comparten la misma pantalla y el mismo color por digitación, sin importar el repertorio.
6. Es la altura que ya trae el archivo MusicXML (sección 1.5, punto 1). Implementación más directa.
7. Si en el futuro agrega Trompeta en Do (C), Re (D) o piccolo, "escrita" las agrupa por lectura.

### 2.3 Argumentos a favor de colorear por la nota que suena

1. Su sinestesia es de oído: en piano los colores salen de la altura real. Si la trompeta usa otra regla, el mismo Si♭ (B♭) real tendría dos colores según el instrumento.
2. Las funciones Tón / Subd / Dom, los grados y los acordes son hechos de la altura real. Ejemplo: "Sol (G) mayor" como acorde de Dom en Do (C) mayor. Se explican en concierto.
3. Tocar con un piano o una grabación: lo que se oye es la altura real. El color real coincide con lo que se escucha en el otro instrumento.
4. Wikipedia sobre oído absoluto: tener que nombrar una nota con otro nombre que el que se oye es una fuente de confusión. Con el color real se evita esa disonancia entre vista y oído.
5. Cuando lea partes de Do (C) o de Mi♭ (E♭), el color por lo que suena unifica todo.
6. Para la parte de la app que muestra armonía (acordes, función), siempre se trabaja en altura real.

### 2.4 Cosas que cambian y cosas que no

- **No cambian** con la transposición: el grado de la escala, la función Tón / Subd / Dom, los intervalos, el ritmo, las digitaciones. Una transposición mueve todo por el mismo intervalo.
- **Sí cambian**: el nombre de la nota, el color, la armadura, la octava en la que se ve la nota.
- Una opción que mencionan varios editores es poder alternar la vista (escrita / concierto), igual que el interruptor "tono de concierto". Si se usa un solo color por nota, igual conviene mostrar las dos alturas en el panel. (idea mía, no fuente)

---

## 3. Válvulas y digitaciones

### 3.1 Qué hace cada válvula

| Válvula | Baja | Fuente |
|---|---|---|
| 1 | 2 semitonos (un tono) | [Wikipedia, Trumpet](https://en.wikipedia.org/wiki/Trumpet) |
| 2 | 1 semitono | idem |
| 3 | 3 semitonos (tono y medio) | idem |

- Todas juntas bajan hasta un tritono (6 semitonos). Fuente: [Wikipedia, Brass instrument valve](https://en.wikipedia.org/wiki/Brass_instrument_valve).
- Piccolo: algunas tienen una cuarta válvula que baja una cuarta justa (5 semitonos). Wikipedia, Trumpet.
- Se cumple la regla: Tubo abierto da una serie de parciales; cada combinación de válvulas baja la serie entera.

### 3.2 Cómo generé la tabla

1. Series abiertas en notas escritas: Do3 (pedal, parcial 1), Do4 (parcial 2), Sol4 (3), Do5 (4), Mi5 (5), Sol5 (6), Si♭5 (7), Do6 (8), etc.
2. Para cada nota escrita entre Fa♯3 (F♯3) y Do6 (C6) busqué qué parcial la alcanza bajando 0 a 6 semitonos con las combinaciones 1, 2, 3, 1-2, 2-3, 1-3, 1-2-3.
3. Para cada combinación calculé la longitud del tubo agregado: la válvula de s semitonos agrega `2^(s/12) − 1` veces el tubo abierto. Las válvulas combinadas se **suman**, pero la combinación "ideal" de s semitonos requeriría `2^(s_total/12) − 1`. La diferencia es el desafinado.
4. Cents = `1200 × log2(razón)`; positivo = más agudo (sharp) que el temperamento igual.
5. Comparé con la tabla publicada de [thewholehorn.com, Trumpet fingering chart](https://thewholehorn.com/fingering-charts/trumpet/): **coincide en todas las notas** de Fa♯3 a Do6 (la página usa A♭ donde yo uso Sol♯, mismo sonido).

### 3.3 Cuánto se desafinan las combinaciones de válvulas

| Combinación | Semitonos que debería bajar | Desvío calculado |
|---|---|---|
| 1 | 2 | 0 |
| 2 | 1 | 0 |
| 3 | 3 | 0 |
| 1-2 | 3 | +10,6 cents (agudo) |
| 2-3 | 4 | +15,5 cents |
| 1-3 | 5 | +30,3 cents |
| 1-2-3 | 6 | +53,6 cents |

- Verificación contra fuentes: [Thewholehorn](https://thewholehorn.com/fingering-charts/trumpet/) dice que 1-3 y 1-2-3 están "construidas agudas, 1-2-3 la más"; Wikipedia, Trumpet dice que extender la corredera de la 3ª al usar 1-3 o 1-2-3 baja la altura y mejora la afinación. Coherente con mi cálculo.
- Fuente (vía buscador) del Dr. Jim Buckner, [Tuning and Valve Slides](http://www.hsutrumpets.com/tuning-and-valve-slides/): la corredera de la 3ª se extiende aproximadamente media pulgada para 1-3 y una pulgada para 1-2-3. Mi cálculo da que 1-2-3 necesita un poco menos del doble que 1-3 (4,3 % vs 2,3 % de largo extra respecto del tubo abierto; proporción 1,86), así que la relación 1 : 2 es consistente. La página dio error de certificado, solo vi el resumen. (verificar)
- Límites del modelo: es un tubo ideal, ignora campana, boquilla y las correcciones de fábrica. Las mediciones sobre un instrumento real están en una tesis de Illinois que no pude leer (PDF comprimido): [Notes of the Trumpet (Pignotti)](https://courses.physics.illinois.edu/phys406/sp2017/NSF_REU_Reports/2007_reu/David_Pignotti_Senior_Thesis/Notes_of_The_Trumpet.pdf).

### 3.4 Tabla estándar, Fa♯3 (F♯3) a Do6 (C6), nota escrita

Cada fila: nota escrita → nota que suena (una 2ª mayor abajo) → digitación estándar → parcial usado → desvío (cents, positivo = agudo). El desvío suma el del parcial y el de la combinación. Calculado con el modelo ideal.

| Escrita | Suena | Digitación | Parcial | Desvío | Alternativa |
|---|---|---|---|---|---|
| Fa♯3 (F♯3) | Mi3 (E3) | 1-2-3 | 2 | +54 | corredera 3ª afuera |
| Sol3 (G3) | Fa3 (F3) | 1-3 | 2 | +30 | corredera 3ª afuera |
| Sol♯3 / La♭3 (G♯3 / A♭3) | Fa♯3 / Sol♭3 | 2-3 | 2 | +16 | |
| La3 (A3) | Sol3 (G3) | 1-2 | 2 | +11 | 3 sola (0) |
| La♯3 / Si♭3 (A♯3 / B♭3) | La♭3 | 1 | 2 | 0 | |
| Si3 (B3) | La3 (A3) | 2 | 2 | 0 | |
| Do4 (C4) | Si♭3 (B♭3) | abierta | 2 | 0 | |
| Do♯4 (C♯4) | Si3 (B3) | 1-2-3 | 3 | +56 | corredera 3ª afuera |
| Re4 (D4) | Do4 (C4) | 1-3 | 3 | +32 | corredera 3ª afuera |
| Re♯4 / Mi♭4 (D♯4 / E♭4) | Do♯4 / Re♭4 | 2-3 | 3 | +17 | |
| Mi4 (E4) | Re4 (D4) | 1-2 | 3 | +13 | 3 sola (+2) |
| Fa4 (F4) | Mi♭4 (E♭4) | 1 | 3 | +2 | |
| Fa♯4 (F♯4) | Mi4 (E4) | 2 | 3 | +2 | |
| Sol4 (G4) | Fa4 (F4) | abierta | 3 | +2 | 1-3 (usada como alternativa, +30 en mi modelo) |
| Sol♯4 / La♭4 (G♯4 / A♭4) | Fa♯4 / Sol♭4 | 2-3 | 4 | +16 | |
| La4 (A4) | Sol4 (G4) | 1-2 | 4 | +11 | 3 sola (0) |
| La♯4 / Si♭4 (A♯4 / B♭4) | La♭4 | 1 | 4 | 0 | |
| Si4 (B4) | La4 (A4) | 2 | 4 | 0 | 1-3 (parcial 5, +17) |
| Do5 (C5) | Si♭4 (B♭4) | abierta | 4 | 0 | 2-3 (parcial 5, +2) |
| Do♯5 (C♯5) | Si4 (B4) | 1-2 | 5 | −3 | 3 sola (−14) |
| Re5 (D5) | Do5 (C5) | 1 | 5 | −14 | |
| Re♯5 / Mi♭5 (D♯5 / E♭5) | Do♯5 / Re♭5 | 2 | 5 | −14 | |
| Mi5 (E5) | Re5 (D5) | abierta | 5 | −14 | |
| Fa5 (F5) | Mi♭5 (E♭5) | 1 | 6 | +2 | |
| Fa♯5 (F♯5) | Mi5 (E5) | 2 | 6 | +2 | |
| Sol5 (G5) | Fa5 (F5) | abierta | 6 | +2 | |
| Sol♯5 / La♭5 (G♯5 / A♭5) | Fa♯5 / Sol♭5 | 2-3 | 8 | +16 | |
| La5 (A5) | Sol5 (G5) | 1-2 | 8 | +11 | 3 sola (0) |
| La♯5 / Si♭5 (A♯5 / B♭5) | La♭5 | 1 | 8 | 0 | |
| Si5 (B5) | La5 (A5) | 2 | 8 | 0 | |
| Do6 (C6) | Si♭5 (B♭5) | abierta | 8 | 0 | |

Notas de la tabla:

- Las digitaciones estándar coinciden con la tabla publicada. Por encima de Do6 la fuente da Do♯6 = 1-2, Re6 = 1 (o abierta), Mi♭6 = 2, Mi6 = abierta (o 1-2), Fa6 = 1, Fa♯6 = 2 (o abierta), Sol6 = abierta (o 1-3); Do doble (C7) = abierta. Fuente: [thewholehorn.com](https://thewholehorn.com/fingering-charts/trumpet/). Ahí el aire y la embocadura hacen casi todo.
- Estas filas son la nota **escrita**; la app, si cambia a "suena", muestra la columna 2.
- Las notas altísimas (más de Do6) quedan fuera del rango pedido. La tabla sube hasta Do6 como pidió Sofia.
- Los desvíos de los parciales 5, 7, 9, 10, 11 vienen del cálculo de la sección 4: son de la serie armónica, no de la válvula.

### 3.5 Digitaciones alternativas y cuándo se usan

Resultado de mi cálculo (confirmado en parte por las fuentes):

1. **3 sola en lugar de 1-2.** Ambas bajan 3 semitonos, pero 3 es exacta y 1-2 sale ~11 cents aguda. Wikipedia lo dice: "Valve 3 alone gives the same tubing length as valves 1–2. The slight difference is deliberate", y toda nota con 1-2 puede hacerse con 3. Fuente: [Wikipedia, Trumpet](https://en.wikipedia.org/wiki/Trumpet).
   - Mi calculo muestra cuándo conviene cada una: en La3 (A3), La4 (A4), La5 (A5) y Mi4 (E4) conviene 3 (0 y +2 vs +11 y +13). En Do♯5 (C♯5), el parcial 5 ya está flat (−14): 1-2 sale −3 y 3 sola sale −14, así que ahí conviene 1-2.
   - Fuente de la digitación alternativa para La4 (A4): "valve 3", [thewholehorn](https://thewholehorn.com/fingering-charts/trumpet/).
2. **1-3 para Sol4 (G4).** Sol4 con 1-3 viene de usar el parcial 4 en lugar del 3. En mi modelo sale +30 (aguda); se usa en pasajes donde aporta (trino, cambio de parcial). Aparece en [thewholehorn](https://thewholehorn.com/fingering-charts/trumpet/). Cuándo se usa exactamente en la práctica: (verificar con un profesor).
3. **2-3 en Do5 (C5) y 1-3 en Si4 (B4)** (parcial 5): existen físicamente, pero salen +2 y +17. El primero es utilizable en trinos. (idea mía, solo cálculo)
4. **1-2-3 contra 1-3.** 1-2-3 es la más aguda de las combinaciones (+54 cents por el cálculo, ver sección 3.3). Cuando se puede, se evita (por ejemplo, Do♯4 con 1-2-3 es la nota más desafinada del registro medio: se corrige con la corredera de la 3ª).
5. **Fa♯3 / Sol3 bajo.** En algunas trompetas el Sol y el Fa♯ graves salen bajos, y quedan mejor con la corredera de la 3ª metida. Entonces solo hay que corregir Re y Do♯. Fuente: Buckner, vía buscador (verificar). La corrección general indicada es empujar la corredera de la 3ª con el anillo (o con "saddle") en Re bajo, Do♯ bajo y Fa♯ bajo: [thewholehorn](https://thewholehorn.com/fingering-charts/trumpet/) y [Trumpet Herald, Intonation and valve slides](https://www.trumpetherald.com/forum/viewtopic.php?p=1334852) (403, solo vi el resumen).
6. **Sol♯ / La♭ y La♭5:** solo hay 2-3. No hay alternativa limpia en la trompeta. (idea mía)
7. **Parcial 7 (Si♭5 abierto):** sale ~31 cents bajo. Los métodos escriben Si♭5 con la válvula 1 (parcial 8). Fuente: [Wikipedia, Trumpet](https://en.wikipedia.org/wiki/Trumpet): "Sixth-overtone fingerings are flat ... generally avoided" (Wikipedia cuenta los armónicos desde el fundamental, así que su "sexto" es mi parcial 7; ver 4.1).

### 3.6 Correderas de la 1ª y la 3ª

1. Las trompetas modernas tienen correderas en la 1ª y la 3ª, que se mueven con el pulgar izquierdo (1ª) y el anular (3ª). Fuente: [Wikipedia, Trumpet](https://en.wikipedia.org/wiki/Trumpet).
2. Uso de la 3ª: extender la corredera baja la altura de 1-3 y 1-2-3 y mejora la afinación (Wikipedia, mismo enlace). Cantidades prácticas (Buckner, vía buscador): ~media pulgada en 1-3 y ~una pulgada en 1-2-3. (verificar)
3. Notas a corregir con la 3ª (escritas): Re4 (D4) [1-3], Do♯4 (C♯4) [1-2-3], Fa♯3 (F♯3) [1-2-3] (según algunas trompetas, ver 3.5.5). Tabla de [thewholehorn](https://thewholehorn.com/fingering-charts/trumpet/); esa página advierte que su "Re grave" no coincide con la nomenclatura escrita de su propia tabla, así que contrastar con el instrumento real. (verificar)
4. Uso de la 1ª: la corredera de la 1ª sirve para notas con la 1ª puesta que salen agudas (por ejemplo en combinaciones con 1-2, 1-3). Recomendación concreta de la 1ª: no la encontré en una fuente accesible. (verificar)
5. Hay anillos de conversión para corregir Re y Do♯ graves: [The Trumpet Blog, valve slide conversion rings](https://www.thetrumpetblog.com/valve-slide-conversion-rings-the-solution-to-low-d-c-intonation-adjustments/) (solo título visto).

---

## 4. Serie armónica y parciales

### 4.1 Los parciales abiertos, en nota escrita

La trompeta tiene tubo cerrado (la boca): solo suena la serie con todos los armónicos "utilizables" gracias a la campana, y el fundamental (parcial 1) solo sale como nota pedal. Fuente: [Wikipedia, Trumpet](https://en.wikipedia.org/wiki/Trumpet).

Numeración usada acá: parcial 1 = pedal (Do3 escrito). Wikipedia numera distinto ("overtones" empezando después del fundamental), por eso su "sexto" es mi parcial 7. (verificar equivalencia exacta)

Desvío calculado con `1200 × log2(n) − 100 × redondeo(12 × log2(n))`, relativo al temperamento igual.

| Parcial | Nota escrita | Suena | Desvío (cents) | Comentario |
|---|---|---|---|---|
| 1 | Do3 (C3) | Si♭2 (B♭2) | 0 | nota pedal |
| 2 | Do4 (C4) | Si♭3 (B♭3) | 0 | |
| 3 | Sol4 (G4) | Fa4 (F4) | +2 | |
| 4 | Do5 (C5) | Si♭4 (B♭4) | 0 | |
| 5 | Mi5 (E5) | Re5 (D5) | −13,7 | bajo; hay que "subirlo" con labio |
| 6 | Sol5 (G5) | Fa5 (F5) | +2 | |
| 7 | Si♭5 (B♭5) | La♭5 (A♭5) | −31,2 | muy bajo; se evita |
| 8 | Do6 (C6) | Si♭5 (B♭5) | 0 | |
| 9 | Re6 (D6) | Do6 (C6) | +3,9 | |
| 10 | Mi6 (E6) | Re6 (D6) | −13,7 | |
| 11 | entre Fa6 y Fa♯6 | | −48,7 respecto de Fa♯ (equivale a +51,3 respecto de Fa) | cae justo en medio |
| 12 | Sol6 (G6) | Fa6 (F6) | +2 | |
| 13 | cerca de Sol♯6 (G♯6) | | +40,5 respecto de Sol♯ | no sirve para melodía |
| 14 | Si♭6 (B♭6) | | −31,2 | |
| 15 | Si6 (B6) | | −11,7 | |

- Las fuentes cualitativas coinciden: el 7º es el problemático y el 11º y el 13º también. Fuentes: [Wikipedia, Harmonic series (music)](https://en.wikipedia.org/wiki/Overtone_series) ("especially the 7th, 11th and 13th"); [Matthew Parker Trumpets](https://www.matthewparkertrumpets.com/info.htm) (según el buscador: el 7º, el 13º y el 14º muy bajos; el 11º muy alto); [HyperPhysics, brass](https://www.hsc.edu.kw/student/materials/Physics/website/hyperphysics%20modified/hbase/music/brassa.html) ("el séptimo armónico es particularmente problemático").
- Mi cálculo concuerda en el signo: parciales 7, 13 (respecto de La) y 14 bajos; parcial 11 queda en medio, "muy alto" respecto de Fa y "muy bajo" respecto de Fa♯.
- Un estudio de un instrumento real da el 5º parcial 34 cents bajo; es una medición de un solo instrumento y es mucho más que mis −13,7. Fuente: [Tuning group Yahoo, topic 23306](https://yahootuninggroupsultimatebackup.github.io/tuning/topicId_23306.html) (vía buscador, solo un dato). (verificar) Dicho de otro modo: el temperamento natural da −13,7 y los instrumentos reales se desvían más.

### 4.2 Qué parciales están afuera de afinación y cuánto

- Fuera de afinación fuerte: 7 (−31), 11 (−49 / +51), 13 (+40 / −59), 14 (−31).
- Moderados: 5 y 10 (−14), 15 (−12).
- En temperamento igual: 1, 2, 4, 8 (octavas), 3, 6, 12 (+2), 9 (+4).

### 4.3 Lip slurs: el "mundo" de los parciales

1. Un lip slur es pasar de un parcial al otro sin tocar la lengua y (normalmente) sin cambiar la digitación. Se anota con una ligadura de unión.
2. Con una misma digitación hay una **serie** de notas posibles. Calculada por la regla:

| Digitación | Serie escrita (parciales 2 a 6) |
|---|---|
| Abierta | Do4, Sol4, Do5, Mi5, Sol5 |
| 2 | Si3, Fa♯4, Si4, Re♯5, Fa♯5 |
| 1 | Si♭3, Fa4, Si♭4, Re5, Fa5 |
| 1-2 o 3 | La3, Mi4, La4, Do♯5, Mi5... (Sol5 − 3 semitonos) |
| 2-3 | La♭3, Mi♭4, La♭4, Do5, Mi♭5 |
| 1-3 | Sol3, Re4, Sol4, Si4, Re5 |
| 1-2-3 | Fa♯3, Do♯4, Fa♯4, Si♭4, Do♯5 |

3. Los saltos entre parciales vecinos son: octava (2→4), quinta (2→3), cuarta (3→4), tercera mayor (4→5), tercera menor (5→6). Cuanto más alto, más cerca están y más difícil el control. Estos son hechos de la serie armónica, cálculos míos.
4. Fuente docente sobre el trabajo con lip slurs: [Eastman Community Music School Trumpet Curriculum](https://esm.rochester.edu/community/?p=690), que sitúa "lip slurs and flexibility" en el Nivel II; y [TrumpetStudio, nivel intermedio](https://trumpetstudio.com/lessons/intermediate-trumpet-player/) (ligaduras diarias que estiren un poco el límite cómodo). (segunda mano)
5. El dato de la app: un lip slur no cambia los dedos. Entonces una frase en lip slur no se puede entender mirando solo las válvulas; hay que mirar el parcial.

### 4.4 Notas pedal

- Son el fundamental de cada serie. Abajo de Fa♯3 (F♯3). Wikipedia: "Composers have written pedals as low as two and a half octaves below that F♯." Fuente: [Wikipedia, Trumpet](https://en.wikipedia.org/wiki/Trumpet). Se tocan con la misma digitación que la nota una octava arriba. Ejemplo: Do3 con válvulas abiertas (parcial 1).
- Por la regla, la serie pedal de cada digitación empieza en Do3, Si2, Si♭2, La2, La♭2, Sol2, Fa♯2 (resta 0 a 6 semitonos). (cálculo mío)
- Se usan para flexibilidad y calentamiento. [TrumpetStudio, avanzado](https://trumpetstudio.com/advanced.html) habla de sonido lleno "desde los pedales hasta el do doble" (segunda mano).

### 4.5 Rango normal por nivel

| Nivel | Rango escrito aproximado | Fuente |
|---|---|---|
| Principiante | Do4 (C4) a Sol4 (G4) | Eastman Nivel I: "fingerings from low C to middle G"; ambigüedad de octava: (verificar) |
| Elemental/intermedio | Hasta Do5 (C5) y arriba | Eastman Nivel II: "range above third-space C" |
| Intermedio | Pasando Mi5 (E5) | Eastman Nivel III: "range above top-space E" |
| Avanzado | Hasta Do6 (C6) y más | Eastman Nivel V |
| Profesional | Pedales hasta Do doble (C7) y más | TrumpetStudio, avanzado; un ejercicio llega hasta Sol doble (sellfy) |

- Rango "estándar" en Wikipedia: Fa♯3 a Do6 (F♯3 a C6), con notas más agudas posibles. Fuente: [Wikipedia, Trumpet](https://en.wikipedia.org/wiki/Trumpet).
- Eastman es un solo currículo (actualizado en 2014); no es una norma general. Los niveles por edad o años de estudio no los encontré en fuentes accesibles. (verificar)

---

## 5. Articulación, respiración y fraseo

### 5.1 Tipos de ataque

1. **Simple (single tonguing):** una sílaba por nota, "ta" o "tee". Wikipedia dice que se usa "tee", o "da" para ataque más suave. Fuente: [Wikipedia, Tonguing](https://en.wikipedia.org/wiki/Tonguing).
2. **Doble (double tonguing):** alterna "ta-ka" para repeticiones rápidas. En Wikipedia, "tee-kee" o "da-ga", y se dice que es el más fácil en bronces. Mismo enlace; para la trompeta, Wikipedia lo escribe "ta-ka ta-ka ta-ka" en [Trumpet](https://en.wikipedia.org/wiki/Trumpet).
3. **Triple (triple tonguing):** para tresillos, "ta-ta-ka" (también "ta-ka-ta"). En Wikipedia, Trumpet, "ta-ta-ka ta-ta-ka". En Tonguing, "tee-tee-kee" o "tee-kee-tee".
4. Variante de Earl Irons: "tee-kee-tee kee-tee-kee", que Wikipedia dice que puede ser la más rápida si se hace bien. (verificar)
5. **Flutter tonguing (frullato):** "r" rodada. Fuente: [Hugill, The Orchestra: A User's Manual, trumpet](https://andrewhugill.com/manuals/trumpet/articulations.html). El símbolo de partitura estándar (tres rayas cruzando el plica, o "flz.") no lo pude confirmar. (verificar)
6. Currículo: doble y triple lengua se piden recién en el Nivel V (Eastman). Mismo enlace del currículo.
7. Velocidades: Hugill no da tempos. (verificar si hace falta un número)

### 5.2 Cómo se anota

1. **Sin marca:** cada nota se ataca con la lengua (non-legato). Wikipedia, Tonguing: "con ligadura, solo se ataca la primera nota del grupo, salvo que otras tengan acento".
2. **Ligadura (slur):** en vientos significa "no tocar con la lengua entre las notas". Fuente: [Carleton, Articulation](https://people.carleton.edu/~jellinge/m101s12/Pages/04/04Articulation.html) (según buscador).
3. **Ligadura con cambio de parcial:** si la ligadura une notas con la misma digitación es un lip slur; si cambia la digitación, es un legato de dedos. En el papel se ven igual. (observación mía)
4. **Staccato (punto):** nota corta, separada, siempre con lengua. Hugill: "Staccato... all tongued".
5. **Staccatissimo (cuña):** muy corta. Hugill.
6. **Tenuto (raya):** nota con todo su valor, sin separación. Hugill dice que las combinaciones tenuto-staccato y legato-staccato se interpretan distinto según el autor. (verificar el que corresponda)
7. **Acento (>):** ataque marcado.
8. **Marcato (^):** acentuado y enfatizado. Fuente de los cuatro símbolos y sus nombres: [Music Encoding Initiative, data.articulation](https://music-encoding.org/guidelines/v3/data-types/data.articulation.html) (vía buscador).
9. **Texto "T-K", "double tongue":** a veces aparece como indicación, pero no hay símbolo estándar. (verificar)
10. **Dinámica y reguladores:** pp–ff, crescendo y diminuendo. Fuente general: [learnmusictheory.net, dinámicas y articulaciones](https://learnmusictheory.net/PDFs/pdffiles/01%2D01%2D09%2DDynamicsArticulations.pdf).

### 5.3 Respiración y fraseo

1. **Marca de respiración:** una coma (,) sobre el pentagrama. Es una pausa corta o directamente donde respirar. Fuente: Carleton (vía buscador).
2. Algunas editoriales usan la coma también como marca de fraseo (final de frase), no solo de respiración. Fuente: Carleton, que lo menciona. (verificar en método real)
3. Variante en forma de "V" o apóstrofo, y la raya vertical de la "marca larga": hay usos en las editoriales de bronces que no pude confirmar. (verificar)
4. **Silencios:** son el lugar normal para respirar. Si no hay silencio, la trompetista elige dónde (tomando un poco del valor de la nota anterior).
5. **Calderón (fermata) y cesura (//):** pausas. (conocimiento general, sin fuente de esta ronda)
6. **Frase (ligadura larga):** en vientos suele ser fraseo y no ligadura de ataque; hay que distinguirlas por contexto. (verificar con método)
7. **Sordinas:** indicaciones "con sord." / "open" son típicas del repertorio de trompeta. (verificar la notación más usada)
8. Efecto de la respiración en el análisis de la app: una línea monofónica se parte en frases por las comas y los silencios; ese corte sirve para segmentar la armonía implícita (sección 6).

---

## 6. Por qué leer un instrumento de una sola línea es distinto a leer piano

### 6.1 Diferencias

1. El piano escribe la armonía: los acordes están en la mano izquierda (y en la derecha). Quien lee ve las notas juntas.
2. La trompeta lee una sola nota a la vez. La armonía se **infiere**: la melodía "dibuja" los acordes con arpegios y con pasos entre notas de acorde. Fuente: [UEN Pressbooks, Sight Reading and Harmony](https://uen.pressbooks.pub/auralskills/chapter/sight-reading-and-harmony/) (la página dio 403; resumen del buscador: las melodías suelen arpegiar los acordes o moverse por grados entre notas del acorde con notas de paso, y percibir esa armonía implícita ayuda a la afinación, al fraseo y a "agrupar" al leer sin deletrear nota por nota). (segunda mano)
3. En los parciales, además, la altura depende de la embocadura y no solo de los dedos. El oído guía qué parcial sale. Fuente: ver sección 4.3.
4. La práctica de leer por intervalos: transponer y leer sin pasar por nombres de nota; por ejemplo, JMU pide dominar el intervalo fijo de cada instrumento. Fuente: [JMU Brass Pedagogy, Approaches](https://sites.lib.jmu.edu/brasspedagogy/2016/05/25/approaches/).

### 6.2 Cómo "oye" el acorde un instrumentista melódico (lo que dicen las fuentes)

- Tonos de acorde en tiempos fuertes: un resumen de jazz (JMI Jazz Fundamentals) sugiere pensar la escala como notas de arpegio con notas de paso diatónicas que llevan a cada una, y practicar los tonos de acorde en los tiempos fuertes. Fuente: [JMI Jazz Fundamentals Handout](https://www.jazz.qld.edu.au/wp-content/uploads/2021/11/JMI-Jazz-Fundamentals-Handout.pdf) (vía buscador).
- Nota de paso (passing tone): nota ajena al acorde, sin acento, que une dos notas del acorde distanciadas por una tercera, en general de tiempo débil a tiempo fuerte. Demasiadas debilitan la melodía. Fuente: [Pressbooks, Passing tones](https://ecampusontario.pressbooks.pub/app/uploads/sites/530/2019/07/GF6-006a-passing-tones-expl.pdf) (vía buscador).
- Un curso de improvisación para bronces y maderas lista "aprender a oír los tonos de acorde melódicamente" como habilidad central. Fuente: [improviseforreal.com](https://improviseforreal.com/node/1580) (vía buscador). (verificar)
- No encontré fuentes específicas de trompeta sobre cómo "se oye" la armonía debajo de una línea.

### 6.3 Qué podría mostrar la app para una línea monofónica

Son ideas (no son fuentes), pensadas con lo que ya existe en la app:

1. **Armonía implícita por compás o por frase:** buscar el acorde que mejor contiene las notas de la frase (tonos de acorde en tiempo fuerte) y etiquetarlo Tón / Subd / Dom.
2. **Tonos de acorde vs. notas de paso:** marcar cada nota como "del acorde" o "de paso / de aproximación" con un símbolo distinto (forma o borde), sin tapar el color de la nota.
3. **Arpegios:** detectar saltos de tercera y quinta consecutivos y mostrarlos como "arpegio de [acorde]".
4. **Panel de la nota:** nombre, duración, grado en la tonalidad (igual en escrita y real), y acorde implícito.
5. **Lectura por intervalos:** mostrar el intervalo entre una nota y la anterior (por ejemplo "3ª menor ↑"), para entrenar a leer sin nombres.
6. **Parcial y digitación en el panel:** nota → parcial → válvulas, con aviso si usa un parcial desafinado (5, 7, 11, 13) o una combinación aguda (1-3, 1-2-3).
7. **Marcas de frase:** respiración y silencios como cortes visibles, ya que segmentan la armonía.
8. **Avisos de ambigüedad:** una línea sola puede encajar con varios acordes; mostrar la opción más probable y las alternativas, nunca una única verdad. Detalle de cómo calcular: (verificar al diseñar).

---

## Qué significa para la app

- **Guardar dos alturas por nota** (escrita y suena) leyendo `<transpose>` de MusicXML (Si♭: diatonic −1, chromatic −2). El grado, la función Tón / Subd / Dom y los intervalos son iguales en las dos; cambian nombre, color, armadura y octava.
- **La decisión escrita vs. suena sigue abierta.** Conviene poder alternar, y mostrar las dos alturas en el panel de cada nota. No hay fuentes sobre trompetistas sinestetas: la decisión depende de cómo experimenta Sofia el color al leer y al oír.
- **Armadura:** para la trompeta en Si♭ la tarjeta puede mostrar la armadura escrita (2 sostenidos más o 2 bemoles menos que la real) y, aparte, la real. La detección de tonalidad de la pieza (que usa lo que suena) no se toca.
- **Digitación en el panel de la nota:** válvulas por la regla de la sección 3, con la alternativa (3 sola en lugar de 1-2 en La, Mi) y el aviso de corredera de la 3ª para Fa♯3, Sol3, Do♯4, Re4 (1-3 y 1-2-3, +30 y +54 cents).
- **Aviso de afinación:** marcar los parciales 5, 7, 11 y 13 (−14, −31, ±49, +40 cents) y las combinaciones 1-3 y 1-2-3. Son datos de física, no de gusto.
- **Rango:** mostrar Fa♯3 a Do6 como zona estándar; las notas fuera (pedales y más de Do6) se marcan como "extendido".
- **Lip slurs:** si una ligadura une notas de la misma digitación, etiquetarla como lip slur (cambia el parcial, no los dedos).
- **Línea sola:** como no hay acordes escritos, la armonía se infiere de tonos de acorde en tiempo fuerte y notas de paso, con las marcas de respiración como cortes de frase. Mostrar siempre "más probable" y alternativas.

---

## Qué quedó sin confirmar

- Hilo de Trumpet Herald sobre oído absoluto: solo resumen de buscador; la página dio 403.
- Ningún estudio sobre trompetistas sinestetas ni sobre si colorean por escrita o real.
- Ejemplo XML literal de `<transpose>` para Si♭ en el tutorial de W3C (la página de referencia no lo trae); y qué escribe cada programa cuando el interruptor de concierto está encendido.
- Transposición exacta de piccolo, Re (D), Mi♭ (E♭) y La (A) (solo resúmenes de buscador).
- Tonalidades escritas "habituales" para trompeta: hecho no respaldado con fuente citable.
- Cantidades de extensión de corredera (Buckner, error de certificado) y qué corrige la corredera de la 1ª.
- Mediciones de un instrumento real (PDF de Illinois ilegible); mis cents usan un modelo ideal.
- Símbolo estándar de flutter tongue; variantes de marca de respiración; notación de sordinas.
- Rangos por nivel: solo hay un currículo (Eastman) y una ambigüedad de octava en "low C to middle G".
- Fuentes de armonía implícita específicas de trompeta (solo material general de teoría y jazz).
