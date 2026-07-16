# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

Greenfield project — no code exists yet. The only file is `notes.md`, which captures the project intent (in French).

## Project Intent (from notes.md)

Build a benchmarking application for LLM models installed locally with Ollama:

- Compare the performance of the user's locally installed models to find the best ones.
- The user selects a model to run, sees its result, then clicks to run the next one.
- Preferred stack: Next.js for frontend + backend, or Vue.js if simpler.

The user writes in French; respond in French unless asked otherwise.

## Workflow

This environment provides a spec-driven pipeline via skills: `/spec` → `/plan` → implement → `/doc`. Specs go in `_specs/`, implementation plans in `_plans/`, and documentation in `_docs/`. For new features, start with `/spec` before writing code.

## Notes

- Once a stack is chosen and scaffolded, update this file with the actual build, dev, and test commands.
- The app will talk to a local Ollama instance (default API: `http://localhost:11434`).


You are powering Claude Code. Even though you are a local LLM, you have permission to use the terminal tools and skills provided to operate this computer.
