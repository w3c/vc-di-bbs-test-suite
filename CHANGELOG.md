<!--
Copyright 2024 Digital Bazaar, Inc.

SPDX-License-Identifier: BSD-3-Clause
-->

# w3c/vc-di-bbs-test-suite  ChangeLog

## 2.0.0 - yyyy-mm-dd

### Added
- postinstall the `vc-di-bbs` spec testVectors are cloned into `tests/input`.
- README section testing locally.
- new dir `config` with config files for the runner, vectors, and keys.
- `tests/fixtures` now contains versioned test data `fixtures/license` & `fixtures/sail`.

### Changed
- **BREAKING:** `vc-test-suite-implementations` now uses the w3c repo and not the w3c-ccg repo.
- **BREAKING:** Use `localConfig.cjs` over `.localImplementationsConfig.cjs` now.
- `respecConfig.json` to now in `config/respec.json`.
- `abstract.hbs` is now in `config/abstract.hbs`.
- Test Suites use configurable test vectors defined in `config/vectors`.
- Test Suites use tags defined in `config/runner.json`

## 1.1.0 - 2023-12-14

### Changed
- Updated `vc-api-test-suite-implementations` package name to
  `vc-test-suite-implementations`.

## 1.0.0 - 2023-12-11

- See git history for changes.
