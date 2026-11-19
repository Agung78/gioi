# Neon compute change — 2026-11-18

Project `gioi-database` (`solitary-dream-97204835`), branch `main` (`br-steep-recipe-b3e09c01`), endpoint `ep-shiny-mode-b396dj4j`, Launch plan, AWS Singapore. Used by `gioi-api` on Vercel.

## Change
| | Before | After |
|---|---|---|
| Autoscaling | 1 CU fixed (min 1, max 1) | **0.5 CU min, 1 CU max** |
| RAM | ~4 GB | ~2 GB floor, ~4 GB ceiling |
| Scale to zero | on, 5 min | unchanged |

Done via console: Computes → Edit. Saving restarted the compute and briefly dropped connections.

## Why
- Usage since Nov 7: 83.72 CU-hrs (~11 days), so ~84 awake hours at 1 CU. Awake hours are billed at the full 1 CU even when idle.
- Monitoring, last hour and last 2 days (read off the charts, approximate):
  - CPU used under ~0.05 vCPU, no sustained peaks.
  - RAM used + cached peaks around 1 GB of 4 GB.
  - Endpoint inactive most of the time; small, occasional row writes.
- 0.25 CU (~1 GB RAM) rejected: observed memory already ~1 GB, no cache headroom.
- Max kept at 1 CU: CPU is nearly idle, no reason to raise it.
- Expected saving: up to ~half of compute cost per awake hour (~$9 -> ~$4.50 per 11 days, rough; pricing unverified; Launch has a monthly minimum).

## Verify later
- Compare CU-hrs on Overview (Usage panel) after ~24 h and ~1 week against 83.72 CU-hrs / 11 days (~7.6 CU-hrs/day).
- Monitoring -> Postgres -> RAM/CPU: if RAM stays pinned near 2 GB or CPU spikes, it scales to 1 CU on its own; if it sits at 1 CU for hours, look at queries/indexes in `gioi/apps/api` instead of resizing.
- Check `gioi-api` for connection errors around the restart (not tested at the time).

## Rollback
Computes -> Edit -> move "Scale from" back to 1 CU -> Save.

## Options not taken
- 0.25–1 CU: try only after a day of RAM data shows well under 1 GB.
- Raising max above 1 CU: no data supports it.
