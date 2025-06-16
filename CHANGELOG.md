# Changelog

## v1.1.0
### Changed
- Each check now has a `key` property (e.g., `headings`, `images`) which is used for CLI selection and as the base for the CSV export file name.
- The CLI `-k/--check` option now accepts the check's key (e.g., `-k images` or `-k headings`).
- Output CSV files are now named after the check key (e.g., `images.csv`, `headings.csv`).
- The `name` property of each check is now used for human-readable output only, not for CLI or file selection.

### Removed
- Removed support for using the check `name` as a CLI selector. Only the `key` is now supported.

### Documentation
- Updated documentation to clarify the use of check keys for CLI and output.

---

See the README for updated usage examples.
