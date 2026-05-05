#!/bin/bash
# ULP Claude Code Skills - Install Script
# Usage: ./install.sh [TARGET_PROJECT_DIR]
#        Default target: ~/projects/ulp

set -euo pipefail

TARGET="${1:-$HOME/projects/ulp}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$SCRIPT_DIR/.claude/skills"

# Color codes
G='\033[0;32m'  # green
Y='\033[0;33m'  # yellow
R='\033[0;31m'  # red
B='\033[1m'     # bold
N='\033[0m'     # reset

echo -e "${B}ULP Claude Code Skills - Installer${N}"
echo "------------------------------------"
echo ""

# Validate source
if [ ! -d "$SOURCE_DIR" ]; then
    echo -e "${R}ERROR: Source directory not found: $SOURCE_DIR${N}"
    echo "Make sure you're running this script from the unzipped bundle directory."
    exit 1
fi

SKILL_COUNT=$(find "$SOURCE_DIR" -name "SKILL.md" | wc -l | tr -d ' ')
echo -e "${G}Found $SKILL_COUNT skills in source bundle.${N}"
echo ""

# Validate / create target
if [ ! -d "$TARGET" ]; then
    echo -e "${Y}Target directory does not exist: $TARGET${N}"
    read -p "Create it? [y/N]: " CREATE
    if [ "${CREATE,,}" = "y" ]; then
        mkdir -p "$TARGET"
        echo -e "${G}Created $TARGET${N}"
    else
        echo "Aborted."
        exit 1
    fi
fi

TARGET_SKILLS_DIR="$TARGET/.claude/skills"

# Backup existing
if [ -d "$TARGET_SKILLS_DIR" ]; then
    BACKUP_DIR="$TARGET/.claude/skills.backup.$(date +%Y%m%d_%H%M%S)"
    echo -e "${Y}Existing skills directory found.${N}"
    echo "Backing up to: $BACKUP_DIR"
    mv "$TARGET_SKILLS_DIR" "$BACKUP_DIR"
fi

# Copy
mkdir -p "$TARGET/.claude"
cp -r "$SOURCE_DIR" "$TARGET_SKILLS_DIR"

# Verify
INSTALLED_COUNT=$(find "$TARGET_SKILLS_DIR" -name "SKILL.md" | wc -l | tr -d ' ')

echo ""
echo -e "${G}✓ Installed $INSTALLED_COUNT skills to $TARGET_SKILLS_DIR${N}"
echo ""
echo -e "${B}Verify your installation:${N}"
echo "  cd $TARGET"
echo "  claude"
echo "  /skills list"
echo ""
echo -e "${B}Skills installed:${N}"
ls "$TARGET_SKILLS_DIR" | grep -v README.md | sort | sed 's/^/  - /'
echo ""
echo -e "${G}Done.${N}"
