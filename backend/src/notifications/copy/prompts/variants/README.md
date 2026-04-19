# Prompt variants

Experiment overrides for copy-gen system prompts. Populated when M3.5
experiments launch. Naming convention: `<experiment-id>/<variant>.ts`,
exporting a `SystemPrompt`-shaped override keyed on `(personality, language)`.

Until then, this directory is intentionally empty — the baseline prompts
in `../system-prompts.ts` are the only prompts in rotation.
