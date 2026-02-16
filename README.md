# @dwsm/changelog-mcp

Universeller MCP Server für Changelog-Management. Funktioniert mit jedem MCP-fähigen KI-Assistenten (Claude Code, Cursor, Windsurf, Cline, Claude Desktop).

**Das Problem:** KI-Assistenten löschen versehentlich Changelog-Inhalte, vergessen Versionsnummern oder formatieren inkonsistent.

**Die Lösung:** Ein MCP Server der Changelog-Einträge sicher hinzufügt (Append-Only), Versionen automatisch berechnet und Backups erstellt - bevor etwas kaputtgehen kann.

---

## Installation

```bash
npm install @dwsm/changelog-mcp
```

## Client-Konfiguration

### Claude Code

```bash
claude mcp add changelog -- npx -y @dwsm/changelog-mcp
```

Oder in `.mcp.json` im Projekt-Root:

```json
{
  "mcpServers": {
    "changelog": {
      "command": "npx",
      "args": ["-y", "@dwsm/changelog-mcp"]
    }
  }
}
```

### Claude Desktop

In `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "changelog": {
      "command": "npx",
      "args": ["-y", "@dwsm/changelog-mcp"]
    }
  }
}
```

### Cursor / Windsurf / Cline

```json
{
  "changelog": {
    "command": "npx",
    "args": ["-y", "@dwsm/changelog-mcp"]
  }
}
```

---

## Tools

| Tool | Beschreibung |
|------|-------------|
| `init_changelog` | Erstellt eine neue Changelog-Datei + Config |
| `get_current_version` | Liest die aktuelle Version aus dem Changelog |
| `get_next_version` | Berechnet die nächste Version (major/minor/patch) |
| `preview_entry` | Zeigt Vorschau eines Eintrags ohne zu schreiben |
| `add_entry` | Schreibt einen Eintrag (Append-Only mit Backup) |
| `search_changelog` | Durchsucht das Changelog (Freitext, Version, Kategorie) |
| `get_entry` | Gibt den vollständigen Block einer Version zurück |
| `get_config` | Zeigt die aktive Konfiguration |

---

## Konfiguration

Funktioniert ohne Konfiguration mit sinnvollen Standardwerten. Für individuelle Einstellungen eine Config-Datei anlegen.

### Standard-Config

```json
{
  "format": "keep-a-changelog",
  "changelog": {
    "file": "CHANGELOG.md",
    "path": "./",
    "encoding": "utf-8",
    "entrySpacing": 2
  },
  "backup": {
    "enabled": true,
    "path": "./changelog-backups",
    "strategy": "daily",
    "maxFiles": 30
  },
  "versioning": {
    "mode": "semver",
    "prefix": "",
    "fixedMajor": null,
    "fixedMinor": null
  },
  "dateFormat": "YYYY-MM-DD",
  "language": "en"
}
```

### Eigene Config-Datei

Für individuelle Einstellungen eine `changelog-mcp-config.json` oder `.changelog-mcp.json` im Projekt-Root anlegen. Nur geänderte Felder müssen angegeben werden - alles andere wird mit den Standardwerten aufgefüllt.

Soll die Config an einem anderen Ort liegen, den Pfad über die Umgebungsvariable `CHANGELOG_MCP_CONFIG` setzen.

Der Server sucht die Config in dieser Reihenfolge:

1. **`CHANGELOG_MCP_CONFIG`** Umgebungsvariable (expliziter Pfad zum Configfile)
2. **`changelog-mcp-config.json`** oder **`.changelog-mcp.json`** im aktuellen Arbeitsverzeichnis
3. Gleiche Dateinamen im **Git-Root**
4. **Standard-Config** (siehe oben)

#### Eigener Config-Pfad

Config-Pfad als `env` in der MCP-Server-Konfiguration (`.mcp.json`) setzen:

```json
{
  "mcpServers": {
    "changelog": {
      "command": "npx",
      "args": ["-y", "@dwsm/changelog-mcp"],
      "env": {
        "CHANGELOG_MCP_CONFIG": "./documentation/changelog/changelog-mcp-config.json"
      }
    }
  }
}
```

### Beispiel: Individuelle Config

```json
{
  "format": "dwsm",
  "changelog": {
    "file": "CHANGELOG.md",
    "path": "./documentation/changelog",
    "encoding": "utf-8",
    "entrySpacing": 1
  },
  "backup": {
    "enabled": true,
    "path": "./documentation/changelog/backups",
    "strategy": "always",
    "maxFiles": 15
  },
  "versioning": {
    "mode": "patch-only",
    "prefix": "v",
    "fixedMajor": 1,
    "fixedMinor": 0
  },
  "dateFormat": "YYYY-MM-DD",
  "language": "de"
}
```

Nur geänderte Felder müssen angegeben werden - alles andere wird mit Standardwerten aufgefüllt.

### Config-Felder

#### `format` - Changelog-Format

| Format | Beschreibung |
|--------|-------------|
| `keep-a-changelog` | [keepachangelog.com](https://keepachangelog.com) Standard (Standard) |
| `conventional` | Conventional Commits Format |
| `dwsm` | DWSM Format - freie Kategorien, kompaktes Layout |

##### Keep a Changelog (Standard)

Kategorien: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`

```json
{ "format": "keep-a-changelog" }
```

```markdown
## [0.1.0] - 2026-02-11

### Added
- Neue Export-Funktion implementiert
  - PDF-Report-Generierung
  - Excel-Export für Backtesting

### Files
- export.ts - Export-Klasse erstellt
- templates/report.html - Report-Template
```

##### Conventional Changelog

Kategorien: `Features`, `Bug Fixes`, `Performance`, `Reverts`, `Breaking Changes`

```json
{ "format": "conventional" }
```

```markdown
## 0.1.0 (2026-02-11)

### Features

* Neue Export-Funktion implementiert
  * PDF-Report-Generierung
  * Excel-Export für Backtesting
```

##### DWSM

Alle Kategorien frei wählbar. Empfohlen: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`, `Documentation`

```json
{ "format": "dwsm" }
```

```markdown
v0.1.0 (2026-02-11)

### Added
- Neue Export-Funktion implementiert
  - PDF-Report-Generierung

### Files
  - `export.ts`
  - `templates/report.html`
```

#### `changelog` - Datei-Einstellungen

| Feld | Standard | Beschreibung |
|------|----------|-------------|
| `file` | `"CHANGELOG.md"` | Dateiname |
| `path` | `"./"` | Verzeichnis relativ zum Projekt-Root |
| `encoding` | `"utf-8"` | Zeichenkodierung |
| `entrySpacing` | `2` | Anzahl Leerzeilen zwischen Einträgen |

#### `backup` - Backup-Einstellungen

| Feld | Standard | Beschreibung |
|------|----------|-------------|
| `enabled` | `true` | Backup-System aktiv/inaktiv |
| `path` | `"./changelog-backups"` | Backup-Verzeichnis |
| `strategy` | `"daily"` | `"always"` / `"daily"` / `"none"` |
| `maxFiles` | `30` | Max. Anzahl Backup-Dateien |

#### `versioning` - Versionierung

| Feld | Standard | Beschreibung |
|------|----------|-------------|
| `mode` | `"semver"` | Versionierungs-Modus |
| `prefix` | `""` | Präfix (z.B. `"v"` für v1.2.3) |
| `fixedMajor` | `null` | Feste Major-Version (für `patch-only`) |
| `fixedMinor` | `null` | Feste Minor-Version (für `patch-only`) |

**Versionierungs-Modi:**

| Modus | Beispiel | Beschreibung |
|-------|---------|-------------|
| `semver` | 1.2.3 | Frei wählbar via bump-Parameter (Standard) |
| `patch-only` | 0.1.42 | Feste Major.Minor, nur Patch zählt hoch |

**`patch-only` Beispiel** - Major/Minor über Config steuerbar:

```json
{
  "versioning": {
    "mode": "patch-only",
    "fixedMajor": 0,
    "fixedMinor": 1
  }
}
```

Versionen: `0.1.0` → `0.1.1` → `0.1.2` → ...
Umstellung auf `0.2.0`: einfach `"fixedMinor": 2` setzen.

---

## Empfehlung: Slash-Command in Claude Code

Für maximalen Komfort empfiehlt es sich, in Claude Code einen eigenen Slash-Command `/changelog` anzulegen. Damit lässt sich mit einem einzigen Befehl ein Changelog-Eintrag erstellen - ohne jedes Mal den Ablauf erklären zu müssen.

### Einrichtung

Erstelle die Datei `.claude/commands/changelog.md` im Projekt-Root:

```markdown
Erstelle einen Changelog-Eintrag für die soeben abgeschlossene Änderung.

Ablauf:
1. Analysiere die aktuellen Änderungen (git diff, git status)
2. Nutze `preview_entry` um den Eintrag zu prüfen
3. Frage den User ob der Eintrag passt
4. Nutze `add_entry` um den Eintrag zu schreiben

$ARGUMENTS
```

### Verwendung

```bash
# Einfach aufrufen - analysiert automatisch die Änderungen
/changelog
```

Der Command analysiert die aktuellen Git-Änderungen, erstellt eine Vorschau und schreibt den Eintrag nach Bestätigung ins Changelog. Kategorien, Bump-Typen und weitere Optionen werden der KI automatisch vom MCP Server über die Tool-Schemas bereitgestellt - sie müssen nicht im Command definiert werden.

---

## Plattformkompatibilität

Funktioniert überall wo Node.js 18+ läuft:

| Umgebung | Status |
|----------|--------|
| Windows (CMD/PowerShell) | Unterstützt |
| Windows (Git Bash) | Unterstützt |
| Linux | Unterstützt |
| WSL | Unterstützt |
| macOS | Unterstützt |

Alle Pfade werden intern mit `path.resolve()` / `path.join()` aufgelöst - keine hardcodierten Separatoren.

---

## Lizenz

MIT License – siehe [LICENSE](LICENSE) für Details.