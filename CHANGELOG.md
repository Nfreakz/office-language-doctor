# Changelog

## Unreleased

No unreleased product changes after the 0.6.0 release.

## 0.6.0 · Community Edition — 2026-10-04

Office Language Doctor 0.6.0 expands the Community Edition with full EU official-language coverage, CA / ES / EN UI localization, paragraph-aware review, reliable missing-tag repair, safer repeated-repair sessions, localized errors, large-document responsiveness and stronger end-to-end regression coverage.

### Added

- reliable fragments with no stored proofing-language tag are now surfaced as review issues and can be repaired after explicit user selection; they are never auto-preselected by Smart Fix;
- repaired downloads are immediately rescanned in-browser so counters, filters, Smart Fix state and CSV/JSON reports follow the repaired copy without a manual re-upload;
- complete EU official-language coverage by adding Estonian, Irish, Latvian, Lithuanian and Maltese detection/repair targets, bringing the detector to 29 language families;
- public CA / ES / EN copy now highlights support for all 24 official EU languages instead of listing every detected family inline;
- third European language coverage pack with Greek, Turkish, Slovak, Slovenian, Croatian and Bulgarian detection/repair targets, including RTF LCID mappings and public CA/ES/EN coverage copy;
- second European language coverage pack with Danish, Norwegian Bokmål, Finnish and Hungarian detection/repair targets, including RTF LCID support and detector regressions;
- expanded language detection from 9 to 14 language families by adding Dutch, Polish, Romanian, Czech and Swedish;
- RTF LCID support for `en-GB`, `pt-BR`, `nl-NL`, `pl-PL`, `ro-RO`, `cs-CZ` and `sv-SE`;
- Catalan, Spanish and English interface localization with a visible CA / ES / EN selector, browser-language initialization and local preference persistence;
- localization of dynamic audit, repair, diagnostic, pagination and status copy, not just the public landing page;
- explicit paragraph review actions that select multiple compatible Word run fixes only after user confirmation, while blocking grouped selection for conflicting or mixed-language evidence and preserving the Catalan / Valencian choice;
- paragraph-aware Word audit UX that collapses multiple internal runs into one readable paragraph summary while preserving individual run-level review and repair;
- explicit audit diagnostics for direct detection, paragraph-context detection, conflicting paragraph evidence and stored-language inheritance;
- `detectionSource` in local CSV/JSON audit reports;
- context-aware Word detection that can classify short/ambiguous runs from reliable same-paragraph language evidence while keeping repair at individual-run granularity; contextual suggestions are explicitly marked and never auto-preselected;
- official public custom domain `https://language-doctor.cecolab.cat/`, including canonical, Open Graph, Twitter/X and JSON-LD URLs so shared links use the project social preview image;

- full-width public hero layout with a visible voluntary Buy Me a Coffee action for NeoRS at `https://buymeacoffee.com/neors`;
- repeatable Windows/Office live-VBA validation harness for DOCM and PPTM, kept manual via `workflow_dispatch` so normal CI does not require desktop Office;
- exact ODS fragment coordinates in audit locations, including column names beyond Z, repeated rows/columns and merged ranges; the same sheet + cell/range labels flow into local CSV/JSON exports.

### Changed

- the active audit panel is now inert while a scan or repair is running, so per-language mappings, Smart Fix checkboxes, paragraph review actions, filters and pagination cannot mutate review state after the operation has already captured its inputs;
- Word paragraph review actions now treat compatible reliable missing proofing-language tags as review issues alongside mismatches, preserving explicit-only selection, contextual-evidence requirements and Catalan / Valencian choice;
- the audit `Issues` view and issue counters now cover both reliable language mismatches and reliable missing proofing-language tags while the detector's `likelyMismatches` metric remains unchanged;
- CSV/JSON audit reports now emit `detection_source: none` when no language was detected instead of incorrectly labelling undetected fragments as direct detections;
- busy-state exclusivity is now enforced by the button-state calculators themselves, preventing filter/re-render interactions from re-enabling repair actions during an active scan or repair; CA / ES / EN switching is also locked until the operation completes;
- a failed attempt to analyse a replacement file no longer destroys the previously valid document session; the existing audit, review decisions and paragraph state remain available while the localized error is reported;
- explicit Smart Fix review decisions now survive post-repair rescans for fragments that remain actionable, so a high-confidence suggestion the user deliberately unchecked is not silently preselected again on the next pass;
- the file picker now clears its native selection after capturing the chosen File, allowing the exact same document to be selected again for a fresh audit without reloading the page;
- language detection in Word, PowerPoint, OpenDocument and RTF scans now cooperatively yields after sustained CPU work, keeping the browser responsive on large documents without changing detection or repair results;
- document analysis/repair is now exclusive at the UI boundary: drag-and-drop remains intercepted but is ignored safely while work is in progress, preventing overlapping scans, premature control re-enabling and browser default file handling;
- recoverable document/package errors now use stable internal error codes and are localized at the UI boundary in Catalan, Spanish and English; unknown library exceptions fall back to localized generic messages instead of leaking raw technical English;
- audit page sizes are bounded to 10 / 25 / 50 / 100 visible items; full CSV/JSON export remains available for the complete document, avoiding an accidental thousands-row DOM render;
- iterative repair filenames no longer stack repeated `-language-fixed` / `-language-smart-fixed` suffixes;
- short title-case metadata and compact authorship lines are treated conservatively as non-prose; Spanish and Portuguese long-form rescues use multiple language-specific anchors to recover reliable Office headings without lowering global thresholds;
- low-confidence detector candidates are now normalized to unknown instead of exposing an unreliable language label; exact labels and medium/high detections are unchanged;
- simplified the public header so GitHub and issue actions are no longer duplicated; both remain available in the footer;
- moved Buy Me a Coffee from the prominent yellow hero action to a subdued footer link;
- corrected the public interface language-coverage copy from 14 to 18 detected families after the second European coverage pack.

### Validation

- cross-format missing-tag regression proves scan → manual review eligibility → selected repair → re-scan for DOCX, PPTX, ODT, ODP, ODS and RTF, including text preservation and no automatic preselection;
- audit-session regression now proves reviewed Smart Fix selections, explicit deselections and Catalan/Valencian target choices survive a repair rescan while resolved fragments disappear and genuinely new issues keep their fresh defaults;
- cooperative-scan scheduling regression verifies time-budgeted yielding, no unnecessary pauses under budget and slice reset after yielding;
- localized-error regression covers every document error code in CA/ES/EN plus corrupt DOCX, PPTX, ODF and RTF inputs and confirms unknown exceptions do not leak their raw message;
- audit-session scale regression exercises 12,000 Word-style fragments, paragraph grouping, bounded pagination, post-repair filter fallback and iterative repaired-file naming;
- full-document Smart Fix regression now also serializes the repaired scan into the audit report, closing the analyse → review → repair → report loop;
- full-document Smart Fix regression now scans synthetic DOCX/PPTX packages and proves that only high-confidence direct non-Catalan/Valencian mismatches are automatically selected; medium-confidence Portuguese, Catalan/Valencian choices, Word paragraph-context suggestions, correct-language text and non-linguistic values remain untouched after the Smart Fix pass;
- synthetic full-document corpus now builds DOCX and PPTX packages in memory, validates Word body/table/header/footer and PowerPoint slide/notes/chart/SmartArt locations, proves selective repair leaves unselected mismatches untouched, completes a second pass to zero mismatches, preserves all text and checks an unrelated binary sentinel byte-for-byte;
- real-world Office fragment corpus now checks document chrome, contact blocks, table values/headings, project names, mixed labels, short titles, headings and footers using unknown/safe/reliable expectations;
- ambiguous-fragment safety regression covers neutral codes/values, multilingual slash-separated labels and short reliable-language controls so uncertain fragments prefer unknown instead of a false mismatch;
- dedicated neighboring-language duel regression now exercises 15 adversarial samples across Iberian Romance, Czech/Slovak, Croatian/Slovenian, Swedish/Danish/Norwegian, Finnish/Estonian and Latvian/Lithuanian groups;
- detector calibration now covers 29 language families, including dedicated long-form samples and exact-label checks for Estonian, Irish, Latvian, Lithuanian and Maltese;
- RTF regression validates LCID mapping and selected-repair round trips for `et-EE`, `ga-IE`, `lv-LV`, `lt-LT` and `mt-MT`;
- detector calibration now covers 24 supported language families, with dedicated long-form samples for Greek, Turkish, Slovak, Slovenian, Croatian and Bulgarian;
- RTF regression now validates LCID mapping and selected-repair round trips for the six third-pack languages;
- detector calibration now covers 18 supported language families and explicitly checks Nordic-family separation plus Norwegian regional-family matching;
- RTF regression now validates Danish, Norwegian Bokmål, Finnish and Hungarian LCID round-trip mapping and selected repair;
- detector regression now exercises reliable long-form samples for all 14 supported language families plus exact language-name labels;
- RTF regression verifies the new LCID mappings and end-to-end selected repair for Dutch, Polish, Romanian, Czech and Swedish;
- interface localization regression covers translation-key parity, browser-language resolution, interpolation and human-readable location localization;
- Smart Fix regression now covers paragraph review eligibility, including same-language grouping, Catalan / Valencian variant choice, conflict rejection, mixed-language rejection and the requirement for contextual evidence;
- paragraph-grouping regression keeps separate Word paragraphs and different detected languages isolated even when their runs are interleaved by audit ordering/filtering;
- report regression covers direct and paragraph-context `detectionSource` serialization;
- Word regression now covers paragraph identity metadata in addition to a real-world proofing-fragmentation pattern where one Catalan sentence is split into eight runs by Word/proofing markup; seven linguistic runs recover Catalan from paragraph context while punctuation remains undetected;
- OTT, OTP and OTS passed a real LibreOffice 25.2.3.2 headless engine round-trip on 2026-10-02;
- the template round-trip preserved text while changing proofing locale from `en-US` to `ca-ES`;
- OTS preserved `=SUM(B1:B2)` and its result `42`;
- live VBA execution was manually validated end-to-end on 2026-10-02 for both DOCM and PPTM through the public web app: the real macros executed successfully before and after Language Doctor repair;
- ODS coordinate regression covers self-closing empty cells, a 27-column offset (`AB1`), repeated columns (`AC1:AD1`), repeated rows (`A1:A2`) and a merged 2×2 range (`B3:C4`).

## 0.5.0 · Community Edition — 2026-09-30

Office Language Doctor 0.5.0 is the initial public Community Edition baseline.

### Added

- support for 17 repairable formats across Word, PowerPoint, OpenDocument and RTF;
- Word variants: DOCX, DOCM, DOTX and DOTM;
- PowerPoint variants: PPTX, PPTM, POTX, POTM, PPSX and PPSM;
- OpenDocument variants: ODT, OTT, ODP, OTP, ODS and OTS;
- RTF audit and selected repair using `\\langN` / `\\deflangN`;
- conservative Smart Fix selection;
- explicit Catalan / Valencian review;
- human-readable fragment locations and stored-language source diagnostics;
- numbered slide locations for OpenDocument presentations;
- sheet-name locations for OpenDocument spreadsheets;
- local CSV and JSON audit exports using the same human-readable locations as the UI;
- extension- and MIME-preserving repaired downloads;
- downloadable public RTF sample;
- NeoRS product identity, public GitHub links, social preview and search metadata;
- Community Edition licensing under Mozilla Public License 2.0;
- Issues-only external feedback policy without inviting external code contributions.

### Validation

- DOCX, DOCM, DOTX and DOTM open correctly after representative repair in Microsoft Word;
- PPTX, PPTM, POTX, POTM, PPSX and PPSM open correctly after representative repair in Microsoft PowerPoint;
- ODT, ODP and ODS have representative manual validation in LibreOffice;
- RTF passed representative manual Microsoft Word open/repair validation on 2026-09-30;
- automated checks preserve `vbaProject.bin` byte-for-byte in representative DOCM and PPTM packages;
- ODF regression coverage includes multi-slide ODP and multi-sheet ODS locations.

### Known limitations

- OTT, OTP and OTS have real LibreOffice 25.2.3.2 engine round-trip validation; an additional visual/manual GUI pass remains optional.
- XLSX is not a proofing-language repair target;
- legacy binary `.doc`, `.ppt` and `.xls` formats remain out of scope;
- language detection is advisory, and Catalan / Valencian remains an explicit user choice.
