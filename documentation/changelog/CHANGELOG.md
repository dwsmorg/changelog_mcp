## [0.1.6] - 2026-02-16

### Changed
- README.md überarbeitet: Installation und Client-Konfiguration in separate Abschnitte aufgeteilt
  - npm install als eigener Installations-Abschnitt
  - Client-Konfiguration mit separaten Sektionen für Claude Code, Claude Desktop und Cursor/Windsurf/Cline

### Files
- README.md



## [0.1.5] - 2026-02-15

### Changed
- Dokumentation aktualisiert und interne Projektdateien aus Git-Tracking entfernt
  - Lizenz in Dokumentation auf DWSM Software License aktualisiert
  - SERVER_VERSION-Dynamik und Repository-Metadaten in Tier 1/2 Docs dokumentiert
  - LICENSE Datei im Projektstruktur-Baum ergänzt
  - docs/ und documentation/project/ in .gitignore aufgenommen

### Files
- .gitignore



## [0.1.4] - 2026-02-15

### Changed
- Server-Version wird dynamisch aus package.json gelesen, Repository-Metadaten und DWSM Software License hinzugefügt
  - SERVER_VERSION in server.ts wird jetzt dynamisch aus package.json gelesen statt hardcoded
  - repository und homepage Felder in package.json ergänzt
  - Lizenz von MIT auf DWSM Software License umgestellt (package.json + README)

### Files
- src/server.ts
- package.json
- README.md
- LICENSE



## [0.1.3] - 2026-02-13

### Added
- Projekt-Tooling fuer Git und npm Publishing erstellt  
  - .mcp.json und .gitignore aus Remote-Repo entfernt (Sicherheit)



## [0.1.2] - 2026-02-13

### Added
- Paket auf npm veroeffentlicht als @dwsm/changelog-mcp
  - Installierbar via npx -y @dwsm/changelog-mcp
  - Scoped Package unter @dwsm Organisation
  - Alle 8 MCP Tools funktional getestet (12/12 Tests bestanden)



## [0.1.1] - 2026-02-13

### Changed
- README fuer npm-Nutzer optimiert, Entwickler-Dokumentation separiert
  - Workflow- und Entwicklungs-Sektion aus README in development.md verschoben
  - init_changelog im Workflow ergaenzt
  - Sicherheitskette auf 10 Schritte aktualisiert (Zod, Path Traversal, Symlink, Auto-Split)
  - development.md mit Setup, Publishing und Authentifizierung erstellt



## [0.1.0] - 2026-02-11

### Added
- MCP Server Grundstruktur mit stdio Transport implementiert
  - Entry Point mit Shebang fuer npx-Ausfuehrung
  - Server Setup mit Tool-Registrierung
  - Config-System mit Zero-Config Fallback
