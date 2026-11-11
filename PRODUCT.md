# Scholar Persona

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Native Node.js HTTP, ES modules, vanilla HTML/CSS/JavaScript, and a server-side DeepSeek adapter. No runtime npm dependencies. GitHub Pages hosts a separate static showcase.

## Users

Researchers exploring the intellectual character of their published work.

## Product Purpose

Look up a researcher by name, Google Scholar profile, ORCID, or OpenAlex. Read public publication metadata and available abstracts, then find a historical or modern intellectual whose approach resonates with that body of work.

## Capabilities and Constraints

- Default English, with Chinese/English switching across the interface and generated reports.
- Broad research area provides context; the main comparison concerns methods, questions, and patterns of evidence.
- Open nomination across historical figures, scientists, thinkers, and Nobel laureates; no fixed personality catalogue.
- Show the papers behind each observation and verify the historical identity against an external biography.
- EVERY research query enriches its chosen historical person through the same runtime lookup: resolve the live identity, find an attributed portrait, retrieve a short bilingual biography and major work/awards, then save the report. This must work with an empty person cache and must not depend on the demonstration cases. Portrait lookup tries Wikidata, the Wikipedia article image, and Commons files explicitly depicting the resolved person. Nobel awards are checked against NobelPrize.org using exact Wikidata identity. Cache verified material only as an optimization; existing reports use the same enrichment without regenerating the research interpretation.
- Ask the visitor to choose the right author when name search is ambiguous.
- Keep the limits of titles/abstracts, sampling, and coauthorship visible in the report's source notes.
- Development generation has a persistent 30-call cap. Failed provider attempts count. No automatic paid retries. Public operation requires its own approved budget and access controls.

## Brand Commitments

User's brief: an extremely minimal, scientific website, white background and black text. First version in English, with a Chinese toggle. Scholar Persona is a working product name chosen for this implementation.

## Evidence on Hand

OpenAlex, ORCID public endpoints and Wikipedia summary endpoints passed live read-only checks on 2026-11-11. Google Scholar is an identity entry route when its public page is accessible; the publication corpus is explicitly attributed to its actual source. The static showcase contains selected public examples, not an identity-to-match catalogue.

## Product Principles

- A memorable likeness backed by inspectable papers.
- Interpret the work; do not invent the researcher's private character or personal contribution.
- Language switching reuses the same report and makes no model call.
- A saved report opens without generating again.
