# Server Differences Notes

**Date**: 2025-10-16
**Local**: `/Users/kadenliu/Documents/GitHub/navix202501`
**Remote**: `root@14.103.248.138:/root/morphic`
**SSH Key**: `/Users/xxXxx/GenAI2025/NaviX/key1010.pem`

---

## Major Differences

### 1. Git Repository Status
- **Local**: Full git repository with version control
  - Branch: `main`
  - Uncommitted changes: 1 deleted file (`NaviX PRD 0928.pdf`)
  - Recent commits: 5cdc597, 030c2bb, 29ec758, dc24781, af965ea
- **Remote**: NOT a git repository (no `.git` directory)
  - Plain files deployment without version control

### 2. Configuration Files
- **Remote has**:
  - `.env.local` (with actual API keys) - Modified: 2025-10-12 00:03:35
  - `.env.local.backup.20251012_000319` (backup copy)
  - `CLAUDE.md`

- **Local has**:
  - Only `.env.local.example` (template file)
  - No active `.env.local` configuration

### 3. File Timestamps
- **Remote**: Files dated Oct 9-12, 2025 (older)
- **Local**: Files dated Oct 16, 2025 (more recent)

### 4. File Count Differences
- **README.md**: Remote (228 lines) vs Local (226 lines) - Minor difference
- **TypeScript files**: Both have 200 files (same)
- **package.json**: Both version 0.1.0 (same)

---

## Remote Environment Configuration

From `.env.local` on remote server:
- OpenAI API Key: Configured (sk-CajFjykUhZzW60f9Bcabag)
- Custom LLM Proxy: https://llmproxy-production-c34f.up.railway.app/v1
- Tavily API Key: Configured
- Firecrawl API Key: Configured

---

## Notes

1. Remote appears to be a **production/deployed instance** without git tracking
2. Local is the **development environment** with full git version control
3. Remote has active API keys configured while local only has example templates
4. Both environments have identical code structure (200 TS files, same package version)
5. Remote server user is `root` (not `ubuntu`)

---

## SSH Connection

```bash
ssh -i "/Users/xxXxx/GenAI2025/NaviX/key1010.pem" root@14.103.248.138
```

Remote project location: `/root/morphic`
