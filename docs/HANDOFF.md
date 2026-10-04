# HANDOFF · Office Language Doctor

## Project identity

Application: **Office Language Doctor**

NeoRS application repository: `Nfreakz/office-language-doctor`

Public URL: `https://language-doctor.cecolab.cat/`

Public author/maintainer identity: **NeoRS**

License: **MPL-2.0**. Copyright 2026 NeoRS.

This application is independent from every other NeoRS application. Do not reuse credentials, deployment assumptions, local paths, runners or implementation decisions from another NeoRS repository without explicit confirmation.

## Current verified state

- Branch: `main`
- Clean public root: `65dac5d41f44f3b34fc85d6f4e4247b7dd7a4c79`
- Version: `0.5.0`
- Release state: **published Community Edition**
- Public licensing: **MPL-2.0**
- Annotated tag: `v0.5.0` pins the validated clean release baseline
- GitHub Release: **Office Language Doctor 0.5.0 Community Edition**
- Release published: **2026-09-30**
- Public deployment source: `gh-pages / (root)`
- Public branches: `main` and `gh-pages`
- Clean local reconstruction snapshot: verified on the approved local runner before rebuilding this repository
- Repository reconstruction: completed on 2026-09-30 with no pre-0.5.0 history carried into the new repository

Version `0.5.0` is the first public Community Edition release in the rebuilt repository. The public `main` history starts at the clean 0.5.0 product root, and the release tag pins the validated release baseline after CI/Pages restoration.

Changes after the release tag must accumulate under Unreleased without automatically changing the package version.

Current Unreleased work includes paragraph-aware Word auditing, explicit paragraph review controls, expanded European language coverage, dedicated near-neighbor detector regressions, ambiguous-fragment safety, a real-world Office fragment corpus, synthetic full-document DOCX/PPTX regression, full-document Smart Fix policy validation, a reliable post-repair audit session, localized user-facing document errors, exclusive document operations and cooperative large-document scanning. The package version remains 0.5.0.

## Product scope

Office Language Doctor is a privacy-first browser utility for auditing and repairing proofing-language metadata without uploading the document.

The current public UI advertises **17 repairable formats**.

| Family | Formats | Manual validation |
| --- | --- | --- |
| Word OOXML | DOCX, DOCM, DOTX, DOTM | All four open correctly after repair in Microsoft Word; DOCM live VBA execution validated before and after public web repair |
| PowerPoint OOXML | PPTX, PPTM, POTX, POTM, PPSX, PPSM | All six open correctly after repair in Microsoft PowerPoint; PPTM live VBA execution validated before and after public web repair |
| OpenDocument Text | ODT, OTT | ODT manually validated; OTT real LibreOffice 25.2.3.2 engine round-trip validated |
| OpenDocument Presentation | ODP, OTP | ODP manually validated; OTP real LibreOffice 25.2.3.2 engine round-trip validated |
| OpenDocument Spreadsheet | ODS, OTS | ODS manually validated; OTS real LibreOffice 25.2.3.2 engine round-trip validated with formula preservation |
| Rich Text Format | RTF | Automated scan/repair coverage plus representative manual Microsoft Word open/repair validation |

Legacy `.doc`, `.ppt` and `.xls` remain out of scope.

XLSX is not a proofing-language repair target because SpreadsheetML does not expose the same per-text language metadata used by WordprocessingML/DrawingML. A future XLSX text-language audit would be a separate feature.

## Current capabilities

- stored proofing-language audit;
- local advisory language detection across 29 language families, including all 24 official EU languages;
- medium/high-confidence mismatch reporting;
- conservative Smart Fix;
- context-aware Word paragraph detection for short/ambiguous runs;
- paragraph-aware Word audit grouping with collapsible run-level detail;
- explicit paragraph review actions for compatible run-level fixes;
- Catalan / Spanish / English interface localization with a persistent browser-local preference;
- explicit direct vs paragraph-context detection diagnostics;
- explicit Catalan vs Valencian choice;
- all 24 official EU languages are available for detection/repair; additional supported families are Catalan/Valencian, Galician, Basque, Norwegian Bokmål and Turkish;
- human-readable fragment locations;
- stored-language source diagnostics;
- audit filters and bounded pagination at 10 / 25 / 50 / 100 visible items, while CSV/JSON export still covers the full document;
- repaired copies are immediately rescanned in-browser so the active audit, Smart Fix state and exported report reflect the repaired file without a manual re-upload;
- explicit Smart Fix review decisions are preserved across that repaired-file rescan for fragments that remain actionable, including deliberate deselection and Catalan / Valencian target choice;
- analysis and repair operations are exclusive in the browser UI; drag-and-drop remains intercepted while busy so a second file cannot start an overlapping scan or fall through to browser default file handling;
- repair CTA state calculations also honor the busy flag, so audit re-renders cannot accidentally re-enable global or Smart Fix actions; locale switching is disabled during active operations to prevent status/state rewrites;
- the native file input is reset immediately after capturing the selected File so the same document can be selected again for a fresh audit without a page reload;
- Word, PowerPoint, OpenDocument and RTF detection loops cooperatively yield after sustained CPU slices so large documents do not monopolize the browser event loop;
- document/package failures use stable engine error codes and localized CA / ES / EN UI messages; unexpected library errors fall back to a localized generic message instead of exposing raw technical text;
- replacement analysis is transactional at the UI boundary: a corrupt or unsupported new file cannot erase an already valid audit session or its review state;
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
- low-confidence detector candidates are normalized to unknown and therefore cannot become mismatches or Smart Fix selections; matching and undetected fragments are not preselected;
- short/non-linguistic values such as `2026` remain unchanged;
- detections inferred from Word paragraph context are suggestions only and are never preselected automatically;
- a paragraph review action may select multiple compatible reliable mismatches only after an explicit user click; conflicting evidence, mixed detected tags or paragraphs without contextual evidence do not receive a grouped action;
- Catalan / Valencian paragraph review requires one explicit variant choice before any run fixes are selected.

Exact labels such as `Català:`, `Valencià:`, `Galego:` and `Euskara:` are handled before the general short-text cutoff.

Galician promotion remains constrained to cases where Franc already ranks Galician first and the configured anchor evidence is present.

Current detected language families: Catalan/Valencian, Galician, Basque, Spanish, English, French, Portuguese, German, Italian, Dutch, Polish, Romanian, Czech, Swedish, Danish, Norwegian Bokmål, Finnish, Hungarian, Greek, Turkish, Slovak, Slovenian, Croatian, Bulgarian, Estonian, Irish, Latvian, Lithuanian and Maltese. This includes every official language of the European Union. English and Portuguese family matching treats regional variants as the same language for mismatch purposes. Norwegian Bokmål detection uses `nb-NO`, while stored `no-NO` / `nn-NO` tags are treated as the same Norwegian family for mismatch comparison to avoid false regional mismatches.

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

Word detection can use the normalized text of the containing paragraph when an individual run is too short or ambiguous. Paragraph context is used only when the paragraph detection is medium/high confidence, the paragraph contains multiple text runs, the current run contains linguistic text, and no reliably detected run in the paragraph contradicts the paragraph language. Each Word fragment now carries a paragraph group identity and normalized paragraph text. The audit UI renders multi-run paragraphs as one collapsed readable unit, then exposes the underlying runs only when the user expands it; repair remains strictly run-level. Direct detections, paragraph-context detections, stored-language inheritance and rejected conflicting paragraph evidence are visible diagnostics. Contextual Smart Fix suggestions remain review-only. For a non-conflicting paragraph with multiple compatible reliable mismatches, the UI can offer an explicit paragraph review action that selects the underlying run-level fixes in one step. This is selection only: it never auto-preselects contextual fixes and never repairs until the user activates the normal selected-fix repair action. Catalan / Valencian requires an explicit paragraph-level variant choice first. Regression covers the real-world eight-run pattern observed in Word proofing markup (`Benvinguts a la sessió. Aquesta prova valida el document.`), with punctuation left undetected, plus grouping isolation so distinct paragraphs/languages cannot be merged by audit ordering.

DOCX manual validation confirmed Catalan, Galician and Basque repairs. DOCM, DOTX and DOTM passed structural/open validation in Word.

On 2026-10-02, a real DOCM containing a VBA macro was repaired through the public web app. The macro executed successfully in Microsoft Word before repair and executed successfully again afterward. Automated variant regression also preserves `vbaProject.bin` byte-for-byte in DOCM packages.

## PowerPoint engine

The audit covers:

- slides;
- notes;
- charts;
- SmartArt data.

Master/layout placeholder text is excluded from the user-facing audit.

PPTX manual validation covered Catalan, Galician, Basque and mixed-language repairs.

PPTM, POTX, POTM, PPSX and PPSM passed manual open/repair validation in PowerPoint.

On 2026-10-02, a real PPTM containing a VBA macro was repaired through the public web app. The macro executed successfully in Microsoft PowerPoint before repair and executed successfully again afterward. Automated regression also preserves `vbaProject.bin` byte-for-byte in PPTM packages.

## OpenDocument engine

ODT, ODP and ODS share one ODF engine.

Observed language representation includes:

- Catalan: `fo:language="ca" fo:country="ES"`
- Galician: `fo:language="gl" fo:country="ES"`
- Basque: `fo:language="eu" fo:country="ES"`
- Valencian: `style:rfc-language-tag="ca-ES-valencia" fo:language="ca" fo:country="ES"`

ODS resolves `table-cell` style language as an inherited fallback for cell text. Fragment repair creates a more specific text/paragraph style so formulas, numeric values and number formats remain unchanged.

Manual validation completed for ODT, ODP and ODS in LibreOffice Writer, Impress and Calc.

OTT, OTP and OTS are supported through the shared engine and automated checks. On 2026-10-02 they also passed a real LibreOffice 25.2.3.2 headless engine round-trip in an external Linux environment. Each template reopened successfully after an `en-US → ca-ES` language change with text preserved; OTP retained its slide content, and OTS preserved `=SUM(B1:B2)` with result `42`. This is real LibreOffice-engine validation, not a visual GUI/manual validation.

The ODF scanner reports `Document content` for text documents, numbered slides for presentations, and exact sheet + cell/range coordinates for spreadsheets. ODS coordinate resolution handles self-closing empty cells, repeated rows/columns, covered cells, merged ranges and columns beyond Z. Examples covered by regression include `Sheet: Budget Q4 · AB1`, `AC1:AD1`, `A1:A2` and `B3:C4`. These labels are used consistently in the UI and local CSV/JSON audit exports.

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
- supports the configured language set, including Valencian LCID 2051, British English 2057, Brazilian Portuguese 1046, Dutch 1043, Polish 1045, Romanian 1048, Czech 1029, Swedish 1053, Danish 1030, Norwegian Bokmål 1044, Finnish 1035, Hungarian 1038, Greek 1032, Turkish 1055, Slovak 1051, Slovenian 1060, Croatian 1050, Bulgarian 1026, Estonian 1061, Irish 2108, Latvian 1062, Lithuanian 1063 and Maltese 1082.

Automated regression covers Catalan, Galician and Basque mismatches, selected repair, re-scan to zero mismatches, Unicode and hex escapes, plus LCID round trips for the expanded European language set.

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
- detection source (`direct`, `paragraph-context` or `none` when no language was detected);
- confidence;
- audit status;
- selected repair target;
- technical part;
- one-based run number.

CSV cells beginning with `=`, `+`, `-` or `@` are neutralized before export.

## Public UI / identity

The public identity is **NeoRS**. `Nfreakz` is used only where technically required by the GitHub repository URL. The public application URL is the CECO Lab subdomain.

Current landing page state:

- the complete UI is available in Catalan, Spanish and English;
- the initial interface language follows the browser language when it is Catalan, Spanish or English, otherwise English is used;
- the CA / ES / EN selector stores the choice only in browser local storage; no backend or account is involved;
- dynamic analysis, repair, Smart Fix, paragraph diagnostics and pagination copy are localized as well as the landing page;
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
- visit counter remains a secondary footer element;
- hero copy uses the full available content width instead of leaving an unused right column;
- GitHub and issue actions are consolidated in the footer instead of being duplicated in the header;
- Buy Me a Coffee uses the approved NeoRS URL `https://buymeacoffee.com/neors` as a subdued footer link rather than a prominent hero CTA;
- support is voluntary, unlocks no features and does not alter the MPL-2.0 Community Edition license.

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
- `src/lib/document/audit-view.ts`: bounded audit pagination and post-repair view-state rules
- `src/lib/document/errors.ts`: stable format/package/repair error codes kept independent from UI translations
- `src/lib/document/cooperative.ts`: time-budgeted event-loop yielding for CPU-heavy document scan passes
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

CI push runs are coalesced per branch with GitHub Actions `concurrency`; when a newer commit arrives on the same branch, stale in-progress/queued validation is cancelled so the self-hosted runner validates the latest branch state instead of draining obsolete commits.

The workflow verifies both `RUNNER_NAME` and `COMPUTERNAME`.

The public repository does not execute CI on untrusted `pull_request` events.

Current automated checks:

- PowerPoint XML regression;
- language detector calibration across all 29 supported families, including all 24 official EU languages, Nordic-language separation and conservative Estonian/Latvian rescue calibration;
- neighboring-language duel regression across Iberian Romance, Czech/Slovak, Croatian/Slovenian, Swedish/Danish/Norwegian, Finnish/Estonian and Latvian/Lithuanian samples;
- ambiguous-fragment safety covering neutral codes/values, multilingual labels, short title-case/project metadata, compact authorship lines and short reliable-language controls;
- real-world Office fragment corpus covering document chrome, contact blocks, table content, project names, short titles, headings and footers;
- synthetic full-document DOCX/PPTX corpus covering location correctness, selective repair, final zero-mismatch repair, text preservation and unrelated binary preservation;
- full-document Smart Fix corpus proving automatic selection is limited to high-confidence direct non-Catalan/Valencian mismatches while medium-confidence, contextual, variant-choice, matching and non-linguistic fragments remain untouched;
- DOCX scan + repair, including context-aware recovery for Word paragraphs split into short proofing runs;
- ODF scan + repair, including exact ODS cell/range coordinates across repeated and merged geometry;
- variant routing and macro-binary preservation;
- Smart Fix safety policy, including explicit paragraph review eligibility and rejection cases;
- fragment diagnostics labels;
- CA / ES / EN interface localization and location-label localization;
- localized document error regression, including corrupt package inputs and raw-error leak prevention;
- cooperative scan scheduler regression covering budget thresholds, avoided unnecessary yields and slice reset behavior;
- paragraph-aware audit grouping and paragraph/language isolation;
- large-audit session regression covering 12,000 fragments, bounded pagination, post-repair filter fallback, iterative repaired-file naming and preservation of explicit Smart Fix review decisions across repair rescans;
- CSV/JSON audit report serialization, including detection source;
- RTF scan + repair;
- public UI identity, trust links, sample asset and logo, including exclusive busy-state/dropzone guards, failed replacement-scan session preservation and re-render-safe repair CTA locking;
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
- publishes `public/CNAME`, preserving `language-doctor.cecolab.cat` on every generated `gh-pages` deployment;
- publishes `robots.txt` and `sitemap.xml` for the custom domain;
- Vite uses `base: './'`.

The rebuilt v0.5.0 public baseline passed the local Windows CI suite and the Pages deployment workflow recreated `gh-pages` successfully before the GitHub Release was republished.

## Release policy

Current package version is `0.5.0`.

Version 0.5.0 is the first public Community Edition release in the rebuilt repository and is distributed under MPL-2.0 unless a file states otherwise. The annotated v0.5.0 tag pins the validated clean release baseline. Do not create a new patch/minor version for every PR; future changes should accumulate coherently under Unreleased until the next deliberate release.

## Remaining validation / next steps

1. Optional: perform a visual/manual GUI pass for OTT / OTP / OTS. Real LibreOffice 25.2.3.2 engine round-trip validation is complete.
2. When a genuinely large real-world document is available, do one browser/device manual pass to complement the 12,000-fragment automated scale regression.
3. Keep XLSX audit-only work separate from metadata repair.

## Historical ODS fixture note

The first synthetic ODS formula fixture omitted the OpenFormula `of` namespace declaration. LibreOffice therefore rewrote its formula incorrectly on re-save.

That was a fixture defect, not evidence of a Language Doctor repair defect.

The corrected v3 fixture declares:

`xmlns:of="urn:oasis:names:tc:opendocument:xmlns:of:1.2"`

and was verified in LibreOffice to preserve `SUM(B1:B2) = 42` before language repair.
