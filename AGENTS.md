# Reel Studio Kit

This folder makes reels and videos in code. For any reel, short, video, motion, voice, sound, cover or caption request, use the **reel-studio** skill (`skills/reel-studio/SKILL.md`, installed to `~/.claude/skills/reel-studio`). For general promos, explainers or AI footage, use **video-studio**.

- Read `skills/reel-studio/references/brand-context.md` first. If it still has `[FILL IN]` fields, ask the user to fill them.
- Story first: three lines (problem → turn → payoff) shown to the user before any art, voice or code.
- Tools are in `studio/tools/`; the npm scripts are listed in `README.md`. Reels live in `src/<slug>/`, finished films in `reels/<slug>/`.
- Renders run on this machine: `npm run reel:render -- src/<slug> --draft`, then `--version v1`.
- Keys only in `.env`. Never print, paste or commit them.
- Ask before every commit, push, post and paid generation. Never delete an older version of a film.
- If a tool is missing, run `npm run studio:doctor` and follow what it prints.
