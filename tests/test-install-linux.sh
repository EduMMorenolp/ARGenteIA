#!/bin/bash
# ─── ARGenteIA — Test de instalación Linux ──────────────────────────────

DISTRO=$(grep PRETTY_NAME /etc/os-release 2>/dev/null | cut -d'"' -f2 || echo "Desconocido")
NODE_VER=$(node -v 2>/dev/null || echo "No instalado")

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  Test: instalar.sh                                   ║"
echo "║  Distro: $DISTRO"
echo "║  Node: $NODE_VER"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

PASS=0
FAIL=0

check() {
    local code=$1
    local name=$2
    if [ "$code" -eq 0 ]; then
        echo "  ✓ $name"
        PASS=$((PASS + 1))
    else
        echo "  ✗ $name"
        FAIL=$((FAIL + 1))
    fi
}

# --- Si EXPECT_FAIL=1, esperamos que falle (sin Node) ---
if [ "${EXPECT_FAIL:-0}" = "1" ]; then
    echo "  Modo: Esperando fallo (sin Node.js)"
    echo ""
    bash instalar.sh 2>&1
    EXIT_CODE=$?

    echo ""
    echo "════════════════ RESULTADOS ════════════════"

    [ "$EXIT_CODE" -ne 0 ]
    check $? "instalar.sh fallo correctamente sin Node (exit=$EXIT_CODE)"

    echo ""
    echo "  Pasaron: $PASS | Fallaron: $FAIL"
    echo ""
    if [ "$FAIL" -gt 0 ]; then
        echo "  ✗ TEST FALLIDO"
        exit 1
    else
        echo "  ✓ TEST EXITOSO"
        exit 0
    fi
fi

# --- Test completo con Node disponible ---
echo "  Modo: Instalacion completa"
echo ""

bash instalar.sh 2>&1
EXIT_CODE=$?

echo ""
echo "════════════════ RESULTADOS ════════════════"

check $EXIT_CODE "instalar.sh exitó con código 0"

[ -f config.json ]
check $? "config.json creado"

command -v pnpm &>/dev/null
check $? "pnpm disponible"

if command -v pnpm &>/dev/null; then
    echo "        pnpm version: $(pnpm -v)"
fi

[ -d node_modules ]
check $? "node_modules existe"

echo ""
echo "  Pasaron: $PASS | Fallaron: $FAIL"
echo ""
if [ "$FAIL" -gt 0 ]; then
    echo "  ✗ TEST FALLIDO"
    exit 1
else
    echo "  ✓ TEST EXITOSO"
    exit 0
fi
