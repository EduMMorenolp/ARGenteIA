#!/bin/bash
# ─── ARGenteIA — Server Manager (CLI) ──────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[1;34m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'
PID_FILE="$SCRIPT_DIR/.server.pid"
LOG_FILE="$SCRIPT_DIR/.server.log"

show_header() {
    echo ""
    echo -e "${BLUE}${BOLD}  🤖 ARGenteIA Server Manager${NC}"
    echo -e "  ─────────────────────────────"
    echo ""
}

get_status() {
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        return 0  # Running
    else
        rm -f "$PID_FILE"
        return 1  # Stopped
    fi
}

show_status() {
    if get_status; then
        local pid=$(cat "$PID_FILE")
        echo -e "  Estado: ${GREEN}● Activo${NC} (PID: $pid, Puerto: 19666)"
    else
        echo -e "  Estado: ${RED}● Detenido${NC}"
    fi
    echo ""
}

start_server() {
    if get_status; then
        echo -e "  ${YELLOW}El servidor ya está corriendo.${NC}"
        return
    fi

    if [ ! -f "dist/index.js" ]; then
        echo -e "  ${RED}✗ dist/index.js no encontrado. Ejecutá ./instalar.sh primero.${NC}"
        return
    fi

    echo -e "  ${BLUE}Iniciando servidor...${NC}"
    NODE_ENV=production nohup node dist/index.js > "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    sleep 1

    if get_status; then
        echo -e "  ${GREEN}✓ Servidor iniciado (PID: $(cat "$PID_FILE"))${NC}"
        echo -e "  ${BLUE}→ http://localhost:19666${NC}"
    else
        echo -e "  ${RED}✗ El servidor no pudo iniciar. Revisá el log:${NC}"
        echo -e "  ${YELLOW}  cat $LOG_FILE${NC}"
    fi
}

stop_server() {
    if ! get_status; then
        echo -e "  ${YELLOW}El servidor no está corriendo.${NC}"
        return
    fi

    local pid=$(cat "$PID_FILE")
    echo -e "  ${BLUE}Deteniendo servidor (PID: $pid)...${NC}"
    kill "$pid" 2>/dev/null
    sleep 1
    kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null
    rm -f "$PID_FILE"
    echo -e "  ${GREEN}✓ Servidor detenido.${NC}"
}

show_log() {
    if [ -f "$LOG_FILE" ]; then
        echo -e "  ${BOLD}📋 Últimas 30 líneas del log:${NC}"
        echo "  ─────────────────────────────"
        tail -30 "$LOG_FILE" | sed 's/^/  /'
    else
        echo -e "  ${YELLOW}No hay log disponible.${NC}"
    fi
}

edit_config() {
    local config="$SCRIPT_DIR/config.json"
    if [ ! -f "$config" ]; then
        echo -e "  ${RED}config.json no encontrado. Ejecutá ./instalar.sh primero.${NC}"
        return
    fi
    "${EDITOR:-nano}" "$config"
}

# ─── Menú principal ───────────────────────────────────────────────────

show_menu() {
    show_header
    show_status
    echo "  Opciones:"
    echo "    1) Iniciar servidor"
    echo "    2) Detener servidor"
    echo "    3) Ver log"
    echo "    4) Abrir en navegador"
    echo "    5) Editar config.json"
    echo "    6) Salir"
    echo ""
    echo -n "  Elegí una opción [1-6]: "
}

# ─── Loop principal ───────────────────────────────────────────────────

while true; do
    clear
    show_menu
    read -r choice
    echo ""

    case $choice in
        1) start_server ;;
        2) stop_server ;;
        3) show_log ;;
        4)
            if command -v xdg-open &> /dev/null; then
                xdg-open "http://localhost:19666" 2>/dev/null
            elif command -v open &> /dev/null; then
                open "http://localhost:19666"
            else
                echo -e "  ${BLUE}→ http://localhost:19666${NC}"
            fi
            ;;
        5) edit_config ;;
        6)
            echo -e "  ${GREEN}¡Hasta luego!${NC}"
            echo ""
            exit 0
            ;;
        *) echo -e "  ${RED}Opción inválida.${NC}" ;;
    esac

    echo ""
    echo "  Presioná Enter para continuar..."
    read -r
done
