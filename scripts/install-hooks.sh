#!/bin/sh
# Installs the git pre-commit hook: before every commit, run "bun run check" (type check + tests).
# Run it once per clone:  sh scripts/install-hooks.sh
set -e
ROOT="$(git rev-parse --show-toplevel)"
HOOK="$ROOT/.git/hooks/pre-commit"
mkdir -p "$ROOT/.git/hooks"
cat > "$HOOK" <<'HOOK_EOF'
#!/bin/sh
# Installed by scripts/install-hooks.sh. Blocks the commit if the checks fail.
cd "$(git rev-parse --show-toplevel)" || exit 1
if command -v bun >/dev/null 2>&1; then
  BUN=bun
else
  BUN="$HOME/.bun/bin/bun"
  # The "check" script calls plain "bun" inside, so make it findable too.
  PATH="$HOME/.bun/bin:$PATH"
  export PATH
fi
echo "Corriendo las pruebas antes de guardar (bun run check)..."
if ! "$BUN" run check; then
  echo ""
  echo "Alguna prueba falló: el commit NO se hizo. Corregí lo que falla y probá de nuevo."
  exit 1
fi
HOOK_EOF
chmod +x "$HOOK"
echo "Listo: hook instalado en $HOOK"
