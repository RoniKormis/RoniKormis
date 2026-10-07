# Claude Code mods

## context-band

A band above the prompt showing context, 5-hour and weekly usage bars (green <70%, yellow 70–85%, red >85%) and a 59-minute countdown since your last message. It also adds a status line entry, a toast when context passes 70%, and a toast when the timer runs out.

Install once (user scope = every session on this machine):

```
/plugin install context-band --marketplace RoniKormis/RoniKormis
```

Answer `y` to add the marketplace, then pick the user scope.

### Handoff button

Press **Handoff ↗** in the band (when Claude is idle). It runs `/handoff`, takes the `*handoff*.md` file that run writes, opens a new Terminal window in the same folder, starts `claude`, runs `/remote-control`, and sends: "Read now.md first, then continue the work from the handoff at <path>". The old window stays open.

The first time, macOS asks to let Claude Code control Terminal: allow it.

Update an existing install with `/plugin update context-band` (or reinstall).
