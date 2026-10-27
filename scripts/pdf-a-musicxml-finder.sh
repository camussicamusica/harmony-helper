#!/bin/bash
# Called by the Finder Quick Action "Pasar a MusicXML": runs the converter and reports
# with macOS notifications, since there is no Terminal window to read.

SCRIPT="$HOME/code/harmony-helper/scripts/pdf-a-musicxml.sh"

notify() {
  osascript -e "display notification \"$1\" with title \"Pasar a MusicXML\"" >/dev/null 2>&1
}

count=$#
if [ "$count" -eq 1 ]; then
  notify "Leyendo $(basename "$1")… tarda 1 a 3 minutos por página."
else
  notify "Leyendo $count partituras… tarda 1 a 3 minutos por página."
fi

out="$("$SCRIPT" "$@" 2>&1)"
summary="$(echo "$out" | tail -1)"

if echo "$out" | grep -q "Con problemas: 0"; then
  notify "Listo. $summary. El .mxl está al lado del PDF."
else
  notify "Terminó con problemas. $summary."
fi
