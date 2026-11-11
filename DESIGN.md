---
name: Scholar Persona
description: A minimal scientific research portrait with footnotes.
colors:
  paper: "#fff"
  ink: "#171717"
  muted: "#686868"
  rule: "#dededb"
  soft: "#f6f6f4"
  ink-hover: "#3e3e3b"
typography:
  display:
    fontFamily: "'Scholar Serif', Georgia, 'Songti SC', 'SimSun', serif"
    fontSize: "clamp(60px, 7.4vw, 94px)"
    fontWeight: 400
    lineHeight: 0.99
    letterSpacing: "-0.038em"
  headline:
    fontFamily: "'Scholar Serif', Georgia, 'Songti SC', 'SimSun', serif"
    fontSize: "clamp(45px, 6vw, 76px)"
    fontWeight: 400
    lineHeight: 1.07
    letterSpacing: "-0.035em"
  title:
    fontFamily: "'Scholar Serif', Georgia, 'Songti SC', 'SimSun', serif"
    fontSize: "28px"
    fontWeight: 400
    lineHeight: 1.3
  body:
    fontFamily: "Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: "16px"
    lineHeight: 1.6
  prose:
    fontFamily: "Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: "15px"
    lineHeight: 1.9
  label:
    fontFamily: "Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: "12px"
    lineHeight: 1.6
  note:
    fontFamily: "Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: "11px"
    lineHeight: 1.6
rounded:
  square: "0"
spacing:
  compact: "12px"
  regular: "16px"
  group: "24px"
  section: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.square}"
    padding: "18px 24px"
  button-primary-hover:
    backgroundColor: "{colors.ink-hover}"
  button-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    padding: "10px 15px"
  button-text:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    padding: "6px 0"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.square}"
    padding: "17px 20px"
  language-navigation:
    typography: "{typography.label}"
  boundary:
    backgroundColor: "{colors.soft}"
    textColor: "{colors.ink}"
    padding: "25px 29px"
---

# Design System: Scholar Persona

## Overview

**Creative North Star: "A research portrait with footnotes"**

A research portrait with footnotes. The interface is extremely minimal and scientific: white paper, black ink, generous whitespace, and thin rules. Its character comes from serif headings and deliberate reading rhythm.

English is the default, with a persistent Chinese toggle. Both languages keep the same visual hierarchy; Chinese display and prose use their own sizing and line-height adjustments.

**Key Characteristics:**
- White and ink with restrained neutral grays.
- Serif identity and headings; neutral sans-serif reading and controls.
- Flat, rectangular controls and ruled lists.
- Inspectable numbered sources and native disclosures.

Recorded from `public/styles.css`, `public/index.html`, and `public/app.mjs`, checked in English and Chinese at desktop and mobile sizes. Public screenshots are in `docs/images/`.

## Colors

The palette uses literal white, near-black ink, and quiet neutral grays.

### Primary
- **Ink:** main text, primary action, strong section rules, focus outlines, and selected text background.
- **Ink Hover:** the primary action's hover fill.

### Neutral
- **Paper:** the page, fields, and outlined actions.
- **Muted:** supporting prose, affiliations, metadata, and source links.
- **Rule:** thin separators between related sections and list rows.
- **Soft:** the analogy boundary and targeted source paper.

**The Ink on Paper Rule.** Ink carries the action and reading hierarchy; grays support metadata, separators, and the analogy boundary.

## Typography

**Display Font:** self-hosted Noto Serif SC, exposed as **Scholar Serif**, with Georgia, Songti SC, SimSun, and serif fallbacks. The local `editorial-serif.woff` is preloaded and uses `font-display: swap`.
**Body Font:** Arial, with PingFang SC, Microsoft YaHei, and sans-serif fallbacks.

**Character:** serif headings give the text its intellectual and editorial identity. Arial is the intentional neutral face for controls, metadata, and sustained reading.

### Hierarchy
- **Display:** the large home and loading questions. English emphasis uses italic serif; Chinese emphasis stays upright.
- **Headline:** the historical likeness in a report; its introduction is a smaller line within the same heading.
- **Title:** author and section headings. Related headings vary from (23–32px) by level and context.
- **Body / Prose:** general interface text and bounded report reading. Report prose is limited to (72ch), with a larger lead (17px / 1.85).
- **Label / Note:** compact actions and supporting metadata. Numeric citations and publication metadata use tabular numerals.

At the mobile breakpoint, English home display is (76px), loading display (65px), report headline (51px), and prose (14px / 1.9). Chinese uses a home display of (57px), loading display (48px), and report headline (47px); Chinese prose has line-height (2). Small-screen overrides keep metadata at (11px).

**The Type Has Roles Rule.** Keep serif display and section headings separate from sans-serif prose, metadata, and controls.

## Layout

A centered page shell has a maximum width of (1120px) and horizontal padding of (48px). Above (1500px), it becomes (1220px) with (70px) padding. At (760px) and below, padding is (26px); at (360px) and below, it is (20px).

The header is a horizontal wordmark/navigation pair above a fine rule. Large openings have generous breathing room. Desktop report sections pair a (220px) heading column with a reading column and a (50px) gap. The method section uses two equal columns with one concise paragraph. Both become single-column on mobile; the input/action row also stacks. Long candidate names and report text wrap within the available width. The footer contains the project name and source link. The static showcase replaces the search form with its three example links.

Spacing is contextual rather than a strict modular scale. The frontmatter records recurring compact, regular, group, and section intervals. Body measures range from (60ch) for short explanation to (72ch) for report prose.

Print uses a (14mm) page inset, suppresses navigation and action chrome, and retains the report's two-column section structure.

## Elevation & Depth

**The Flat Surface Rule.** Use whitespace, thin rules, and the quiet boundary fill to separate content; the shipped interface uses no shadows.

Only the transient toast floats above the page; it is a flat ink rectangle. Depth never depends on a shadow or blurred backdrop.

## Shapes

Controls are rectangular with square corners. Separators and field strokes are thin (1px). Arrow, external-link, and disclosure icons are authored outline SVGs with current-color strokes (1.4px), round caps, and round joins. Native paper disclosures switch from plus to minus by hiding the vertical SVG stroke when open.

## Components

### Buttons
- **Primary:** ink fill and paper text, with a right-facing SVG arrow; its text is (14px / 1.3). Hover changes the fill, with a short background transition (0.15s).
- **Outlined:** paper fill and ink stroke for selecting a researcher; hover inverts to ink and paper.
- **Text:** underlined, unfilled actions for returning, dismissing, saving, and printing.
- **Focus / Disabled:** buttons and links have an ink outline (2px), offset (5px). Disabled actions use opacity (0.5) and a waiting cursor.

### Inputs / Fields
A square, paper field shares a continuous ink border with the desktop action. The field has no independent border on desktop; on mobile it gains its own stroke and a minimum height of (61px). Focus uses an inset outline (2px). Errors are visible text beneath the field with an ink bottom rule.

### Navigation
The wordmark is serif; the method link and language control are sans-serif. The active language is ink and underlined; the inactive language is muted. Language buttons retain minimum dimensions of (28px × 36px). The method link is hidden on mobile.

### Ruled Lists and Source Disclosures
Candidate rows use a serif name, compact neutral metadata, and an outlined action. Paper rows use a small number, sans-serif title, supporting metadata, and an SVG disclosure. Opening a paper reveals its abstract and underlined source links. Inline numbered references open the corresponding paper and move focus to its summary; the target receives the soft fill.

### Analogy Boundary
A quiet soft-background paragraph separates the interpretation's boundary from the surrounding report. Its label is slightly larger than its body; it remains flat and square.

### Historical Person

User-requested factual portraits sit beside the main historical name and short biography. Use a grayscale, uncropped image in a (260px) desktop column and (124px) mobile column, with a source, creator, and license underneath. The biography follows the identity and achievements without a repeated name heading; it occupies the left column on desktop and spans the full width on mobile. The paragraph introduces the historical person and their major contribution or honour. Research-method connections belong in the following analysis. Notable works and major honours use compact definition rows; Nobel awards link to the official award page and display their year. There are no award badges or decorative frames. A portrait documents the already chosen person and never determines the match.

### Loading and Report Reveal
An indeterminate ink segment travels along a thin rule over (2.4s); it does not communicate percentage. The report enters over (0.55s) with a small upward reveal, fade, and blur clearance. Reduced-motion mode removes animations and smooth scrolling and shows a static full-width muted loading line. Motion values live in the sidecar.

## Do's and Don'ts

### Do:
- **Do** preserve the white background, ink action, and neutral metadata.
- **Do** keep reading measures bounded and allow long names and bilingual copy to wrap.
- **Do** retain visible keyboard focus, underlined text actions, and authored inline SVG icons.
- **Do** respect reduced motion and keep the loading line indeterminate.

### Don't:
- **Don't** add decorative color, gradients, or decorative imagery. Historical portraits are user-requested factual content and remain secondary to the typography.
- **Don't** turn candidate or paper rows into rounded, elevated cards.
- **Don't** use text glyphs as icons or shrink screen metadata below the implemented 11px floor.
