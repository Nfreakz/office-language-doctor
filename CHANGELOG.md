# Changelog

## Unreleased

### Added

- official public custom domain `https://language-doctor.cecolab.cat/`, including canonical, Open Graph, Twitter/X and JSON-LD URLs so shared links use the project social preview image;

- full-width public hero layout with a visible voluntary Buy Me a Coffee action for NeoRS at `https://buymeacoffee.com/neors`;
- repeatable Windows/Office live-VBA validation harness for DOCM and PPTM, kept manual via `workflow_dispatch` so normal CI does not require desktop Office;
- exact ODS fragment coordinates in audit locations, including column names beyond Z, repeated rows/columns and merged ranges; the same sheet + cell/range labels flow into local CSV/JSON exports.

### Validation

- OTT, OTP and OTS passed a real LibreOffice 25.2.3.2 headless engine round-trip on 2026-10-02;
- the template round-trip preserved text while changing proofing locale from `en-US` to `ca-ES`;
- OTS preserved `=SUM(B1:B2)` and its result `42`;
- the approved runner was checked for live VBA automation but has no Word/PowerPoint executable, App Path or COM registration, so live macro execution remains pending rather than being marked as passed;
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

- live VBA execution before/after repair has not yet been validated with a real macro-enabled fixture;
- OTT, OTP and OTS are supported through the shared ODF engine but still lack representative manual template validation;
- XLSX is not a proofing-language repair target;
- legacy binary `.doc`, `.ppt` and `.xls` formats remain out of scope;
- language detection is advisory, and Catalan / Valencian remains an explicit user choice.
