# Changelog

## Unreleased

No changes yet.

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
