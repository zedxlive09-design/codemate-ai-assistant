# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

CodeMate is a **Tauri 2** desktop app: a React/TypeScript frontend that talks to a Rust backend via Tauri commands. It is an "offline AI coding assistant" with chat, a file explorer, terminal, model manager, and ~40 toggleable side panels.

## Commands

```bash
npm install              # install frontend deps (required first)
npm run tauri dev        # FULL dev: Vite (port 1420) + Rust backend + Tauri window; opens DevTools in debug
npm run tauri build      # production bundle -> src-tauri/target/release/bundle/
npm run dev              # frontend only (Vite). Limited: invoke() calls fail without the Tauri host.
npm run build            # tsc typecheck + vite build -> dist/ (also runs before tauri build)
```

- **No test runner and no linter are configured.** There are no `test`/`lint` scripts. Type errors surface via `tsc` in `npm run build`.
- Rust compilation happens through the Tauri CLI (`tauri dev`/`tauri build`); you rarely invoke `cargo` directly. If needed, run it from `src-tauri/`.
- Non-Windows dev needs the usual Tauri system deps (webkit2gtk etc. on Linux; Xcode CLT on macOS). Windows needs the MSVC C++ build tools.
- Vite dev server is pinned to **port 1420** (`strictPort`); HMR on 1421. `vite.config.ts` ignores `src-tauri/**`.

## Architecture: the big picture

```
React/TS frontend  ──invoke()──▶  Rust backend (Tauri commands)  ──HTTP──▶  Ollama server (localhost:11434)
        │                                  │
   Zustand store                    Managed State<Mutex<ModelState>>
```

### Inference runs in a SEPARATE Ollama process — not in-app
The README/SETUP.md describe **llama.cpp with direct GGUF loading, but the code has migrated to Ollama** (see `model.rs`, "PHASE 9+ Ollama Backend"). The Rust backend does **not** bundle an inference engine or compile llama.cpp; it issues HTTP requests to `OLLAMA_BASE_URL` (`http://localhost:11434`, in `src-tauri/src/model.rs`). Consequences:
- Ollama must be installed and running (`ollama serve`); models come from Ollama (`ollama pull <name>`), not from a `.gguf` you point at.
- The only Rust HTTP dep is `reqwest` — there is no `llama-cpp`/`llama_cpp_rs` crate.
- Trust the code, not the docs, on this point.

### Demo mode
With no model loaded, `ChatInput` (`src/components/ChatInput.tsx`) fabricates plausible client-side responses so the UI is usable. The live chat path is `ChatArea` → `ChatInput.generateResponseStreaming`, which calls `modelCommands.generateStreaming` and listens for token events. The reusable `src/hooks/useStreamingGeneration.ts` exists but is **not** used by the chat path.

### Streaming is event-based, not return-value-based
`generate_streaming` emits Tauri **events** as it reads Ollama's NDJSON stream. Event-name constants live in `src-tauri/src/commands/model.rs` (`EVENT_GENERATION_TOKEN`, `..._COMPLETE`, `..._ERROR`, `EVENT_MODEL_STATUS_CHANGED`, plus `model:pull-progress`). The frontend subscribes via `@tauri-apps/api/event` (`listen`), surfaced through `modelEvents` in `src/lib/tauri.ts`.
- Cancellation is client-side only: `stop_generation` is a backend no-op (Ollama can't cancel mid-stream); the frontend sets an abort flag and ignores further tokens.

### Frontend state
One Zustand store with the `persist` middleware (`src/store/useStore.ts`), persisted to localStorage under key `ai-assistant-storage` (only a subset is persisted — see `partialize`). Nearly every side panel (Settings, Terminal, Git, Snippets, Plugins, Stats, Profile, Memory, …) is toggled by a `show*` boolean + `toggle*` action in this store, and most are stacked in the right panel container in `App.tsx`. Many are UI scaffolding/stubs in progress (the app self-labels "v2.2 Phase 6").

### The Tauri command bridge
`src/lib/tauri.ts` is the single typed gateway to the backend: `modelCommands`, `fileCommands`, `projectCommands`, `terminalCommands`, `appCommands`, and `modelEvents`. `fileCommands` uses the Tauri FS/dialog plugins directly (not custom Rust).

## Adding or changing a Tauri command

The full round-trip has four touchpoints:

1. **Rust command** — add `#[tauri::command] pub async fn ...` in `src-tauri/src/commands/{model,project,system}.rs`.
2. **Register it** — add to `tauri::generate_handler![...]` in `src-tauri/src/lib.rs`. Forgetting this gives a "command not found" runtime error.
3. **TS bridge** — add a wrapper in `src/lib/tauri.ts`.
4. **TS type** — add the matching interface in `src/types/index.ts`.

**Naming convention (important):** the frontend calls `invoke('snake_case_name', { camelCaseArg })`; Tauri maps `camelCaseArg` → Rust param `camel_case_arg`. Rust response structs use `#[serde(rename = "camelCase")]` so their JSON matches the TS types. Keep field names aligned across the Rust struct, the TS interface, and the `invoke` arg keys — mismatches here are the most common source of silent `undefined`/parse failures.

## Gotchas that look right but aren't

- **`masterPrompt.ts` is dead code for chat.** It is not imported anywhere; `ChatInput` sends the **raw user message** to Ollama with no system prompt prepended. Wiring the master prompt (and conversation history) into the prompt is a likely task — don't assume it's already happening.
- **Two commands in `tauri.ts` have no backend implementation:** `terminalCommands.killProcess` (`kill_process`) and `appCommands.openExternal` (`open_external`) are declared on the frontend but **not registered** in `lib.rs` — they fail at runtime.
- **`CommandResult.stderr`** (`src-tauri/src/commands/system.rs`) is misnamed — it holds the exit **code** (`u32`), not stderr output. Stderr text is not captured.
- **Stale docs:** README.md and SETUP.md still describe llama.cpp/GGUF-only flow and a wrong bundle path (`src-target/release/bundle/`); the real path is `src-tauri/target/release/bundle/`.
- A large `Qwen_Image-Q4_K_M.gguf` (~13 GB) sits in the working tree. It is gitignored (`*.gguf`) and is **not** needed for the Ollama-based build.
- `withGlobalTauri: true` is set, so `window.__TAURI__` is available; CSP is disabled (`null`).

## Key files

- `src-tauri/src/lib.rs` — app entry, plugin registration, **command registry** (`invoke_handler!`), managed state setup.
- `src-tauri/src/model.rs` — Ollama API types, `generate_text_async`/`generate_text_streaming`, model listing/pulling, `OLLAMA_BASE_URL`.
- `src-tauri/src/commands/{model,project,system}.rs` — the `#[tauri::command]` functions.
- `src/lib/tauri.ts` — typed frontend↔backend bridge (and the `modelEvents` event helpers).
- `src/store/useStore.ts` — the Zustand store backing the whole UI.
- `src/components/ChatInput.tsx` — the live chat path (prompt assembly, streaming listeners, demo mode).
- `src/lib/masterPrompt.ts` — system-prompt architecture (currently unused by chat).
