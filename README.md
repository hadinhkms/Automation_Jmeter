# JMeter Web UI

JMeter Web UI is a browser-based test plan editor that keeps the familiar Apache JMeter desktop workflow: a Test Plan tree on the left, the selected component editor on the right, application commands above, and live run status below.

This repository contains a frontend-only MVP. It edits an internal test-plan model, imports and exports JMX, and simulates a run locally; it does not execute Apache JMeter yet.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Vite prints the local URL, normally `http://localhost:5173`.

## Validate and build

```bash
npm run typecheck
npm run lint
npm run build
```

The production output is written to `dist/`.

## MVP capabilities

- A recursive Test Plan tree with expand/collapse, selection, inline rename, enable/disable, delete, duplicate, cut/copy/paste, and move up/down.
- Centralized parent/child rules for adding JMeter components from the right-click menu.
- A component-specific editor with shared name, comments, and enabled fields.
- Complete MVP editors for Test Plan, Thread Group, HTTP Request, HTTP Request Defaults, header/cookie/CSV config, controllers, timer, extractors, assertion, and JSR223 components.
- Editable parameter, file, header, cookie, variable, and assertion tables.
- JMX import through `DOMParser` and JMX export through browser XML APIs.
- Internal clipboard clones every descendant with a fresh ID.
- Mock Start, Stop, Shutdown, live metrics, clear results, View Results Tree, Summary Report, and Aggregate Report.
- JMeter-oriented toolbar/menu states and keyboard shortcuts.

## Supported JMeter components

- Test Plan and User Defined Variables
- Thread Group
- HTTP Request Defaults, HTTP Request, HTTP Header Manager, HTTP Cookie Manager, CSV Data Set Config
- Transaction Controller, If Controller, Loop Controller
- Constant Timer
- JSON Extractor, Regular Expression Extractor
- Response Assertion
- JSR223 Sampler, PreProcessor, PostProcessor, and Assertion
- View Results Tree, Summary Report, and Aggregate Report

Unknown JMeter elements are imported as `UnsupportedComponent`. Their original component XML and original class name are retained, the node remains visible in the tree, and export writes the original component element back into the generated JMX.

## JMX limitations

- The parser maps the common properties used by the supported editors; uncommon plugin-specific or advanced properties on otherwise supported components are not yet represented in the internal model.
- Unsupported component elements and their parsed child tree are preserved on a best-effort basis. Namespace context and unusual XML formatting may be normalized by `XMLSerializer`.
- JMX export targets the standard JMeter 5.6 component/hashTree structure, but it is not a byte-for-byte round trip.
- Save only clears the current in-memory dirty state. Export JMX is the durable persistence path in this MVP.
- Mock listeners contain representative local data and do not read JTL files.

## Architecture

- `src/store/` owns editor, clipboard, tree, dirty, and mock-run state through Zustand.
- `src/jmx/` isolates component mappings, parsing, and writing.
- `src/services/` defines local project and mock execution interfaces for future backend replacement.
- `src/editors/` contains the component editor router and focused editor groups.
- `src/rules/` centralizes component parent/child validation.

The intended next phase replaces the local project/execution services with a REST API backed by Spring Boot, JMeter CLI, and JTL result processing. The UI state and editor components do not depend on that future transport.
