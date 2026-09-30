# HANDOFF · Office Language Doctor

## Project identity

Application: **Office Language Doctor**

NeoRS application repository: `Nfreakz/office-language-doctor`

Public URL: `https://nfreakz.github.io/office-language-doctor/`

Public author/maintainer identity: **NeoRS**

License: **MPL-2.0**. Copyright 2026 NeoRS.

This application is independent from every other NeoRS application. Do not reuse credentials, deployment assumptions, local paths, runners or implementation decisions from another NeoRS repository without explicit confirmation.

## Current verified state

- Branch: `main`
- Clean public root: `f3758a3128463e81ee2489ef9e04519ab8159d57`
- Version: `0.5.0`
- Release state: **published Community Edition**
- Public licensing: **MPL-2.0**
- Annotated tag: `v0.5.0` → `f3758a3128463e81ee2489ef9e04519ab8159d57`
- GitHub Release: **Office Language Doctor 0.5.0 Community Edition**
- Release published: **2026-09-30**
- Public deployment source: `gh-pages / (root)`
- Public branches after history reset: `main` and `gh-pages`
- Private pre-reset Git bundle: created successfully on the approved local runner before rewriting history

Version `0.5.0` is the first public Community Edition release and the first commit in the public `main` history. The release tag remains pinned to that clean root.

Changes after the release tag must accumulate under Unreleased without automatically changing the package version.

## Product scope

Office Language Doctor is a privacy-first browser utility for auditing and repairing proofing-language metadata without uploading the document.

The current public UI advertises **17 repairable formats**.

| Family | Formats | Manual validation |
| --- | --- | --- |
| Word OOXML | DOCX, DOCM, DOTX, DOTM | All four open correctly after repair in Microsoft Word; live VBA execution still pending |
| PowerPoint OOXML | PPTX, PPTM, POTX, POTM, PPSX, PPSM | All six open correctly after repair in Microsoft PowerPoint; live VBA execution still pending |
| OpenDocument Text | ODT, OTT | ODT validated; OTT automated-only |
| OpenDocument Presentation | ODP, OTP | ODP validated; OTP automated-only |
| OpenDocument Spreadsheet | ODS, OTS | ODS validated; OTS automated-only |
| Rich Text Format | RTF | Automated scan/repair coverage plus representative manual Microsoft Word open/repair validation |

Legacy `.doc`, `.ppt` and `.xls` remain out of scope.

XLSX is not a proofing-language repair target because SpreadsheetML does not expose the same per-text language metadata used by WordprocessingML/DrawingML. A future XLSX text-language audit would be a separate feature.

## Current capabilities

- stored proofing-language audit;
- local advisory language detection;
- medium/high-confidence mismatch reporting;
- conservative Smart Fix;
- explicit Catalan vs Valencian choice;
- human-readable fragment locations;
- stored-language source diagnostics;
- audit filters and pagination;
- selected-fragment repair;
- safe global remapping when mixed-language content is not detected;
- extension/MIME-preserving repaired downloads;
- local CSV and JSON audit export;
- CSV formula-prefix neutralization;
- downloadable RTF sample;
- NeoRS public identity and project links;
- document-check logo used as header mark and favicon;
- simple visit counter kept secondary in the footer.

## Smart Fix policy

Smart Fix must remain conservative:

- high-confidence non-Catalan/Valencian mismatches may be preselected;
- medium-confidence mismatches are suggestions only;
- Catalan/Valencian detections always require explicit variant choice;
- low-confidence, matching and undetected fragments are not preselected;
- short/non-linguistic values such as `2026` remain unchanged.

Exact labels such as `Català:`, `Valencià:`, `Galego:` and `Euskara:` are handled before the general short-text cutoff.

Galician promotion remains constrained to cases where Franc already ranks Galician first and the configured anchor evidence is present.

## Word engine

Audit coverage:

- main document;
- headers;
- footers;
- footnotes;
- endnotes;
- comments.

Effective proofing-language resolution order:

1. direct run `w:lang w:val`;
2. character style;
3. paragraph run properties;
4. paragraph style;
5. document default;
6. none.

Selected repair writes a direct `w:lang w:val` on the reviewed run.

DOCX manual validation confirmed Catalan, Galician and Basque repairs. DOCM, DOTX and DOTM passed structural/open validation in Word.

DOCM and DOTM fixtures used for manual testing did not contain live VBA.

Automated variant regression preserves `vbaProject.bin` byte-for-byte in DOCM packages.

## PowerPoint engine

The audit covers:

- slides;
- notes;
- charts;
- SmartArt data.

Master/layout placeholder text is excluded from the user-facing audit.

PPTX manual validation covered Catalan, Galician, Basque and mixed-language repairs.

PPTM, POTX, POTM, PPSX and PPSM passed manual open/repair validation in PowerPoint.

Macro-enabled manual fixtures did not contain live VBA. Automated regression preserves `vbaProject.bin` byte-for-byte in PPTM packages.

## OpenDocument engine

ODT, ODP and ODS share one ODF engine.

Observed language representation includes:

- Catalan: `fo:language="ca" fo:country="ES"`
- Galician: `fo:language="gl" fo:country="ES"`
- Basque: `fo:language="eu" fo:country="ES"`
- Valencian: `style:rfc-language-tag="ca-ES-valencia" fo:language="ca" fo:country="ES"`

ODS resolves `table-cell` style language as an inherited fallback for cell text. Fragment repair creates a more specific text/paragraph style so formulas, numeric values and number formats remain unchanged.

Manual validation completed for ODT, ODP and ODS in LibreOffice Writer, Impress and Calc.

OTT, OTP and OTS are supported through the shared engine and automated checks but are not manually validated. No current LibreOffice manual-test environment is available, so do not mark them as manually validated without a representative external/manual test.

The ODF scanner now reports fragment locations at the useful container level: `Document content` for text documents, numbered slides for presentations, and sheet names for spreadsheets. These labels are used consistently in the UI and local CSV/JSON audit exports.

## RTF engine

RTF has its own parser and repair path.

Current scope:

- reads `\deflangN` document defaults;
- reads `\langN` character language;
- understands `\plain` reset to document default;
- decodes Unicode `\uN` escapes;
- decodes Windows-1252 `\'hh` escapes;
- skips common non-user-facing destinations;
- repairs reviewed runs with scoped `{\langN ...}` groups;
- supports the same configured language set as the rest of the app, including Valencian LCID 2051.

Automated regression covers Catalan, Galician and Basque mismatches, selected repair, re-scan to zero mismatches, Unicode and hex escapes.

RTF passed a representative manual Microsoft Word validation on 2026-09-30 using `LanguageDoctor_TEST_20260930.rtf`.

Observed flow:

- initial scan: 3 likely mismatches, all stored as `en-US`;
- Catalan repaired to `ca-ES`;
- Basque repaired to `eu-ES`;
- Galician repaired to `gl-ES`;
- numeric `2026` remained `en-US` and non-linguistic;
- repaired file re-scan: 0 likely mismatches;
- Microsoft Word opened the repaired RTF without a corruption/repair warning;
- expected text and accents were preserved;
- Word displayed its normal Protected View warning for an Internet-downloaded file, which is not a document-format error.

This validates the representative RTF audit/repair path. It is not a claim of exhaustive compatibility with every RTF producer or embedded-object edge case.

## Audit reports

CSV and JSON reports are generated locally.

Each fragment can include:

- human-readable location;
- text;
- stored language tag;
- stored-language source;
- detected language tag;
- confidence;
- audit status;
- selected repair target;
- technical part;
- one-based run number.

CSV cells beginning with `=`, `+`, `-` or `@` are neutralized before export.

## Public UI / identity

The public identity is **NeoRS**. `Nfreakz` is used only where technically required by the GitHub repository/Pages URL.

Current landing page state:

- document-check SVG is the canonical product icon;
- Open Graph and Twitter/X use `social-preview.jpg` with `summary_large_image` metadata;
- the same SVG is used as favicon and header application mark;
- no `LD` placeholder remains;
- header says `A NeoRS open-source project`;
- footer says `Created and maintained by NeoRS.`;
- GitHub and Issues links point to `Nfreakz/office-language-doctor`;
- MPL-2.0 link points to the repository license;
- Supported formats / What does it change? / Privacy are permanently visible cards, not accordions;
- local processing / no upload is visible next to the file selector;
- the three-step workflow cue remains visible;
- the downloadable sample is `public/samples/LanguageDoctor_SAMPLE.rtf`;
- visit counter remains a secondary footer element.

## Privacy

Document contents, filenames and file bytes stay in the browser during analysis and repair.

There is no backend, database, account system or document upload endpoint.

The visit counter is a direct HitsCounter.dev image request:

- page-load count only;
- no analytics JavaScript SDK;
- no analysis/repair event tracking;
- no document content or filenames sent by application code;
- `referrerpolicy="no-referrer"`.

## Architecture

- `src/lib/document/types.ts`: format-neutral types
- `src/lib/document/engine.ts`: routes PPTX / DOCX / ODT / ODP / ODS / RTF
- `src/lib/language/detect.ts`: shared advisory detector
- `src/lib/language/smart-fix.ts`: Smart Fix policy
- `src/lib/pptx/*`: PowerPoint OOXML
- `src/lib/docx/*`: Word OOXML
- `src/lib/odf/*`: OpenDocument
- `src/lib/rtf/*`: RTF parser, LCID mapping and repair
- `src/lib/report/audit.ts`: CSV/JSON report generation
- `public/favicon.svg`: canonical document-check icon
- `public/social-preview.jpg`: canonical 600×315 social card adapted from the generated product presentation
- `docs/assets/office-language-doctor-preview.webp`: current README product screenshot, optimized from the original 1244×1125 capture
- `public/samples/LanguageDoctor_SAMPLE.rtf`: downloadable public sample

## CI / runner policy

No GitHub-hosted runner is used for project validation.

Approved runner:

- name: `DESKTOP-0NEP6ON`
- host: `DESKTOP-0NEP6ON`
- labels: `self-hosted`, `Windows`, `X64`

The workflow verifies both `RUNNER_NAME` and `COMPUTERNAME`.

The public repository does not execute CI on untrusted `pull_request` events.

Current automated checks:

- PowerPoint XML regression;
- language detector calibration;
- DOCX scan + repair;
- ODF scan + repair;
- variant routing and macro-binary preservation;
- Smart Fix safety policy;
- fragment diagnostics labels;
- CSV/JSON audit report serialization;
- RTF scan + repair;
- public UI identity, trust links, sample asset and logo;
- TypeScript + Vite production build.

## GitHub Pages deployment

Workflow: `.github/workflows/deploy-pages.yml`

Policy:

- triggers from `main` or manual workflow dispatch;
- runs only on the approved Windows self-hosted runner;
- builds Vite locally;
- verifies `dist/index.html`;
- force-updates the generated `gh-pages` branch;
- writes `.nojekyll`;
- Vite uses `base: './'`.

The v0.5.0 clean public baseline was built and deployed successfully before publication of the GitHub Release.

## Release policy

Current package version is `0.5.0`.

Version 0.5.0 is the first public Community Edition release and is distributed under MPL-2.0 unless a file states otherwise. The annotated v0.5.0 tag is pinned to the clean public root. Do not create a new patch/minor version for every PR; future changes should accumulate coherently under Unreleased until the next deliberate release.

## Remaining validation / next steps

1. Validate live VBA execution before/after repair using a real macro-enabled Word or PowerPoint fixture.
2. Validate OTT / OTP / OTS manually when a LibreOffice environment is available.
3. Consider finer-grained ODS cell coordinates only if repeated rows/columns and merged cells can be handled safely; slide/sheet-level locations are already implemented.
4. Keep XLSX audit-only work separate from metadata repair.

## Historical ODS fixture note

The first synthetic ODS formula fixture omitted the OpenFormula `of` namespace declaration. LibreOffice therefore rewrote its formula incorrectly on re-save.

That was a fixture defect, not evidence of a Language Doctor repair defect.

The corrected v3 fixture declares:

`xmlns:of="urn:oasis:names:tc:opendocument:xmlns:of:1.2"`

and was verified in LibreOffice to preserve `SUM(B1:B2) = 42` before language repair.
