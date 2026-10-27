#!/bin/bash
# Pasa partituras en PDF a MusicXML (.mxl) con Audiveris, para abrirlas en Harmony Helper.
#
# Uso:
#   ~/code/harmony-helper/scripts/pdf-a-musicxml.sh partitura.pdf [otra.pdf ...]
#
# El .mxl queda al lado del PDF, con el mismo nombre. Si ya existe uno, no lo pisa:
# guarda "nombre-2.mxl", "nombre-3.mxl"… (nunca se borran versiones anteriores).

AUDIVERIS="$HOME/Applications/Audiveris.app/Contents/MacOS/Audiveris"
[ -x "$AUDIVERIS" ] || AUDIVERIS="/Applications/Audiveris.app/Contents/MacOS/Audiveris"

if [ ! -x "$AUDIVERIS" ]; then
  echo "No encuentro Audiveris. Tiene que estar en Aplicaciones (Audiveris.app)."
  exit 1
fi

if [ "$#" -eq 0 ]; then
  echo "Uso: pdf-a-musicxml.sh partitura.pdf [otra.pdf ...]"
  echo "Tip: escribí el comando, dejá un espacio y arrastrá el PDF a la Terminal."
  exit 1
fi

ok=0
fail=0
for pdf in "$@"; do
  if [ ! -f "$pdf" ]; then
    echo "✗ No existe: $pdf"
    fail=$((fail + 1))
    continue
  fi

  dir="$(cd "$(dirname "$pdf")" && pwd)"
  base="$(basename "$pdf")"
  name="${base%.*}"

  # Audiveris works in a scratch folder; only the .mxl comes back next to the PDF.
  work="$(mktemp -d -t pdf-a-musicxml)"
  echo "… Leyendo \"$base\" (tarda 1 a 3 minutos por página)"
  "$AUDIVERIS" -batch -export -output "$work" "$pdf" > "$work/audiveris.log" 2>&1

  found="$(find "$work" -name '*.mxl' | head -1)"
  if [ -z "$found" ]; then
    echo "✗ No pude leer \"$base\". Puede ser un escaneo muy borroso o una imagen sin pentagramas."
    echo "  Detalle técnico guardado en: $work/audiveris.log"
    fail=$((fail + 1))
    continue
  fi

  target="$dir/$name.mxl"
  n=2
  while [ -e "$target" ]; do
    target="$dir/$name-$n.mxl"
    n=$((n + 1))
  done
  mv "$found" "$target"

  measures="$(unzip -p "$target" '*.xml' 2>/dev/null | grep -c '<measure ')"
  echo "✓ Listo: $target ($measures compases leídos)"
  echo "  Revisá en la app que las notas estén bien: el lector siempre se equivoca en algo."
  rm -rf "$work"
  ok=$((ok + 1))
done

echo ""
echo "Convertidas: $ok · Con problemas: $fail"
[ "$fail" -eq 0 ]
