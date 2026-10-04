# Changelog

## Unreleased

### Added

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

### Validation

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
