#!/usr/bin/env bash
# Интерактивное меню бэкапов: создание / загрузка (restore) / просмотр архива.
# Облака: Yandex (rclone yandex) и VK = Mail Cloud (rclone mailru / CLOUD_VK).
# Запуск: sudo bash /opt/tennis/scripts/tennis_backup.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=backup_common.sh
source "$SCRIPT_DIR/backup_common.sh"

C_RESET=$'\033[0m'
C_RED=$'\033[31m'
C_BLUE=$'\033[34m'
C_BOLD=$'\033[1m'
C_DIM=$'\033[2m'

# Цвета по TTY stdin (stdout часто в $(…) при выборе меню).
if [[ ! -t 0 ]]; then
  C_RESET= C_RED= C_BLUE= C_BOLD= C_DIM=
fi

color_cloud() {
  case "${1:-}" in
    yandex) printf '%sYandex%s' "$C_RED" "$C_RESET" ;;
    vk) printf '%sVK%s' "$C_BLUE" "$C_RESET" ;;
    *) printf '%s' "$1" ;;
  esac
}

# Из data_2026-10-15_08-30-00.db.gz / backup_2026-10-15_08-30-00 → 15.10.2026 08:30
format_stamp_display() {
  local raw="$1"
  local s
  s=$(echo "$raw" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}-[0-9]{2}' | head -n1 || true)
  if [[ -z "$s" ]]; then
    printf '%s' "$raw"
    return
  fi
  local y=${s:0:4} m=${s:5:2} d=${s:8:2} H=${s:11:2} M=${s:14:2}
  printf '%s.%s.%s %s:%s' "$d" "$m" "$y" "$H" "$M"
}

# sort key YYYYMMDDHHMMSS
stamp_sort_key() {
  local raw="$1"
  local s
  s=$(echo "$raw" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}-[0-9]{2}' | head -n1 || true)
  if [[ -z "$s" ]]; then
    echo "00000000000000"
    return
  fi
  echo "${s//[_-]/}"
}

print_entry_line() {
  local disp="$1" cloud="$2" kind="$3" prefix="${4:-}"
  printf '%s%s  %s  %s%s\n' "$prefix" "$disp" "$(color_cloud "$cloud")" "$kind" "$C_RESET"
}

# UI в stderr — иначе cloud=$(ask_cloud) захватывает пункты меню вместо «yandex».
ask_cloud() {
  # $1 allow_both=1|0
  local allow_both="${1:-1}"
  echo "" >&2
  echo "Облако:" >&2
  echo "  [1] Yandex" >&2
  echo "  [2] VK (Mail Cloud)" >&2
  if [[ "$allow_both" == "1" ]]; then
    echo "  [3] оба" >&2
  fi
  echo "  [q] назад" >&2
  while true; do
    read -rp "> " c </dev/tty || return 1
    case "$c" in
      1) printf '%s\n' yandex; return 0 ;;
      2) printf '%s\n' vk; return 0 ;;
      3)
        if [[ "$allow_both" == "1" ]]; then
          printf '%s\n' both
          return 0
        fi
        ;;
      q|Q) return 1 ;;
    esac
    echo "Неверный выбор." >&2
  done
}

ask_kind() {
  echo "" >&2
  echo "Тип бэкапа:" >&2
  echo "  [1] DB" >&2
  echo "  [2] STORAGE" >&2
  echo "  [3] FULL" >&2
  echo "  [q] назад" >&2
  while true; do
    read -rp "> " c </dev/tty || return 1
    case "$c" in
      1) printf '%s\n' db; return 0 ;;
      2) printf '%s\n' storage; return 0 ;;
      3) printf '%s\n' full; return 0 ;;
      q|Q) return 1 ;;
    esac
    echo "Неверный выбор." >&2
  done
}

kind_label() {
  case "$1" in
    db) echo DB ;;
    storage) echo STORAGE ;;
    full) echo FULL ;;
    *) echo "$1" ;;
  esac
}

# Собирает строки: sortkey|disp|cloud|KIND|id
# id = filename or backup_dir or "storage-mirror"
collect_entries_for_cloud() {
  local cloud="$1"
  local root
  root="$(cloud_root "$cloud")" || return 0
  local f key disp

  while IFS= read -r f; do
    [[ -n "$f" ]] || continue
    key=$(stamp_sort_key "$f")
    disp=$(format_stamp_display "$f")
    printf '%s|%s|%s|DB|%s\n' "$key" "$disp" "$cloud" "$f"
  done < <(rclone lsf "${root%/}/db/" --files-only 2>/dev/null | grep -E '^data_.*\.db\.gz$' || true)

  while IFS= read -r f; do
    [[ -n "$f" ]] || continue
    key=$(stamp_sort_key "$f")
    disp=$(format_stamp_display "$f")
    printf '%s|%s|%s|FULL|%s\n' "$key" "$disp" "$cloud" "$f"
  done < <(rclone lsf "${root%/}/full/" --dirs-only 2>/dev/null | sed 's/\///' | grep -E '^backup_' || true)

  # legacy full
  while IFS= read -r f; do
    [[ -n "$f" ]] || continue
    key=$(stamp_sort_key "$f")
    disp=$(format_stamp_display "$f")
    printf '%s|%s|%s|FULL|%s\n' "$key" "$disp" "$cloud" "$f"
  done < <(rclone lsf "${root%/}/" --dirs-only 2>/dev/null | sed 's/\///' | grep -E '^backup_' || true)

  # STORAGE — зеркало (одна актуальная копия); время = newest file если есть
  local newest=""
  newest=$(rclone lsl "${root%/}/storage" --max-depth 8 2>/dev/null | awk 'NF>=4 {print $2"_"$3}' | sort -r | head -n1 || true)
  if [[ -n "$newest" ]]; then
    # rclone lsl date looks like 2026-10-15 08:30:01.000000000 — normalize
    local ymd hms
    ymd=$(echo "$newest" | cut -d_ -f1)
    hms=$(echo "$newest" | cut -d_ -f2 | cut -d. -f1)
    if [[ "$ymd" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] && [[ -n "$hms" ]]; then
      local stamp="${ymd}_${hms//:/-}"
      key=$(stamp_sort_key "$stamp")
      disp=$(format_stamp_display "$stamp")
      printf '%s|%s|%s|STORAGE|storage-mirror\n' "$key" "$disp" "$cloud"
    else
      printf '00000000000000|зеркало (актуальное)|%s|STORAGE|storage-mirror\n' "$cloud"
    fi
  elif rclone lsf "${root%/}/storage/" --dirs-only 2>/dev/null | head -n1 | grep -q .; then
    printf '00000000000000|зеркало (актуальное)|%s|STORAGE|storage-mirror\n' "$cloud"
  fi
}

collect_entries() {
  local mode="$1" # yandex|vk|both
  case "$mode" in
    yandex) collect_entries_for_cloud yandex ;;
    vk) collect_entries_for_cloud vk ;;
    both)
      collect_entries_for_cloud yandex
      collect_entries_for_cloud vk
      ;;
  esac
}

menu_create() {
  local cloud kind
  cloud=$(ask_cloud 1) || return 0
  kind=$(ask_kind) || return 0
  set_remote_roots_for_cloud "$cloud"
  echo ""
  echo "Создание: $(kind_label "$kind") → remotes: $REMOTE_ROOTS"
  read -rp "Запустить? (y/n): " conf
  [[ "$conf" == "y" ]] || return 0
  set +e
  case "$kind" in
    db) REMOTE_ROOTS="$REMOTE_ROOTS" bash "$SCRIPT_DIR/backup_db.sh" --force ;;
    storage) REMOTE_ROOTS="$REMOTE_ROOTS" bash "$SCRIPT_DIR/backup_storage.sh" --force ;;
    full) REMOTE_ROOTS="$REMOTE_ROOTS" bash "$SCRIPT_DIR/backup_full.sh" --force ;;
  esac
  local rc=$?
  set -e
  if [[ "$rc" -ne 0 ]]; then
    echo "Ошибка создания бэкапа (exit $rc)." >&2
  else
    echo "Готово."
  fi
}

menu_restore() {
  local cloud kind
  cloud=$(ask_cloud 0) || return 0
  kind=$(ask_kind) || return 0
  REMOTE_ROOT="$(cloud_root "$cloud")"
  export REMOTE_ROOT
  # не читать REMOTE_ROOTS для restore одного облака
  unset REMOTE_ROOTS || true

  if [[ "$kind" == "storage" ]]; then
    echo ""
    print_entry_line "$(format_stamp_display "$(date +%Y-%m-%d_%H-%M-%S)")" "$cloud" "STORAGE" "  "
    echo "STORAGE — зеркало (без истории версий)."
    read -rp "Восстановить storage/ с $(color_cloud "$cloud")? (y/n): " conf
    [[ "$conf" == "y" ]] || return 0
    RESTORE_CONFIRM=y RESTORE_STOP_PB=y bash "$SCRIPT_DIR/restore_storage.sh"
    return 0
  fi

  echo ""
  echo "Снимки ($(kind_label "$kind"), $(color_cloud "$cloud")):"
  local -a lines=()
  local -a ids=()
  local line key disp cld k id
  while IFS= read -r line; do
    [[ -n "$line" ]] || continue
    IFS='|' read -r key disp cld k id <<<"$line"
    case "$kind" in
      db) [[ "$k" == "DB" ]] || continue ;;
      full) [[ "$k" == "FULL" ]] || continue ;;
    esac
    lines+=("$line")
    ids+=("$id")
  done < <(collect_entries_for_cloud "$cloud" | sort -t'|' -k1,1r)

  if [[ ${#lines[@]} -eq 0 ]]; then
    echo "Снимки не найдены."
    return 0
  fi

  local i
  for i in "${!lines[@]}"; do
    IFS='|' read -r key disp cld k id <<<"${lines[$i]}"
    print_entry_line "$disp" "$cld" "$k" "  [$i] "
  done

  local choice
  while true; do
    read -rp "Номер снимка (или q): " choice
    [[ "$choice" == "q" || "$choice" == "Q" ]] && return 0
    if [[ "$choice" =~ ^[0-9]+$ ]] && [[ "$choice" -lt ${#ids[@]} ]]; then
      break
    fi
    echo "Неверный ввод."
  done

  local selected="${ids[$choice]}"
  echo "Выбран: $selected"
  read -rp "Восстановить на сервер? (y/n): " conf
  [[ "$conf" == "y" ]] || return 0

  set +e
  case "$kind" in
    db)
      REMOTE_ROOT="$REMOTE_ROOT" RESTORE_SELECTED="$selected" RESTORE_CONFIRM=y \
        bash "$SCRIPT_DIR/restore_db.sh"
      ;;
    full)
      REMOTE_ROOT="$REMOTE_ROOT" RESTORE_SELECTED="$selected" RESTORE_CONFIRM=y \
        bash "$SCRIPT_DIR/restore_full.sh"
      ;;
  esac
  local rc=$?
  set -e
  if [[ "$rc" -ne 0 ]]; then
    echo "Ошибка восстановления (exit $rc)." >&2
  fi
}

menu_view() {
  local cloud
  cloud=$(ask_cloud 1) || return 0
  echo ""
  echo "${C_BOLD}Архив бэкапов${C_RESET}"
  echo ""

  local -a all=()
  while IFS= read -r line; do
    [[ -n "$line" ]] || continue
    all+=("$line")
  done < <(collect_entries "$cloud" | sort -t'|' -k1,1r)

  if [[ ${#all[@]} -eq 0 ]]; then
    echo "Бэкапы не найдены."
    return 0
  fi

  local line key disp cld k id
  for line in "${all[@]}"; do
    IFS='|' read -r key disp cld k id <<<"$line"
    print_entry_line "$disp" "$cld" "$k" "  "
  done

  echo ""
  echo "${C_BOLD}Последний бэкап (5 последних):${C_RESET}"
  local n=0
  for line in "${all[@]}"; do
    [[ $n -lt 5 ]] || break
    IFS='|' read -r key disp cld k id <<<"$line"
    print_entry_line "$disp" "$cld" "$k" "  "
    n=$((n + 1))
  done
  echo ""
  read -rp "Enter — в меню… " _
}

main_menu() {
  while true; do
    echo ""
    echo "${C_BOLD}=== Tennis Backup ===${C_RESET}"
    echo "  [1] Создание бэкапа"
    echo "  [2] Загрузка бэкапа (restore на сервер)"
    echo "  [3] Просмотр архива бэкапов"
    echo "  [q] Выход"
    read -rp "> " m
    case "$m" in
      1) menu_create ;;
      2) menu_restore ;;
      3) menu_view ;;
      q|Q) echo "Выход."; exit 0 ;;
      *) echo "Неверный выбор." ;;
    esac
  done
}

main_menu
