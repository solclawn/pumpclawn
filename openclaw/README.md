# OpenClaw Agent Integration (Solclaw)

This repo includes an OpenClaw workspace at `openclaw/workspace`. Point your OpenClaw config to that folder so the agent uses these files.

## Quick setup

1) Install OpenClaw (if not already installed):

```bash
curl -fsSL https://openclaw.bot/install.sh | bash
```

2) Create/initialize the workspace (OpenClaw will seed missing files automatically):

```bash
openclaw setup --workspace /home/funboy/SolClaw/openclaw/workspace
```

3) Set your OpenClaw config to use this workspace:

```json5
// ~/.openclaw/openclaw.json
{
  agents: {
    defaults: {
      workspace: "/home/funboy/SolClaw/openclaw/workspace"
    }
  }
}
```

## Workspace files

- `AGENTS.md` — Solclaw agent instructions
- `SOUL.md` — boundaries, tone, values
- `TOOLS.md` — external tool notes
- `BOOTSTRAP.md` — first‑run checklist

## Notes

- The OpenClaw config lives at `~/.openclaw/openclaw.json` and accepts JSON5. It controls the default workspace and agent settings. The workspace is the agent’s default cwd and memory anchor.
- `openclaw setup` initializes the workspace and can (re)create missing files.
- If you prefer to use a different path, update `agents.defaults.workspace` accordingly.
