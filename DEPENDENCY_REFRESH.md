# Development dependency refresh

Validated against upstream `7046fba3bdfe7682e482528adac18464fda36da0` on
2 October 2026. No version bump, release, tag, deployment, workflow change or
old-PR closure is part of this patch.

**Draft hold:** the security dependency patch has two observable upstream
behavior changes awaiting a compatibility decision: zero-duration completion
is synchronous in the old published browser bundle but occurs on the next
animation frame with the patched bundle/shim; plain-object option attachments
are deep-copied instead of retaining their original reference. Do not treat
passing tests as approval to merge these behavior changes.

## Scope and runtime compatibility

- Replace react-scripts 3.2/Jest's application-sized test tree with Node's test
  runner and jsdom 30.1.1. Replace Rollup 1 and legacy plugins with Rollup
  4.63.5 and maintained Babel/CommonJS/node-resolve plugins
- Pin direct development versions exactly. Keep Babel 7.29.7, compatible with
  @rollup/plugin-babel's Babel 7 peer; Babel 8 is not a compatible drop-in
- Use only JSX, class-property and object-rest/spread Babel transforms in the
  build, plus the CommonJS transform only in the source test harness
- Preserve the Node >=8 / npm >=5 library engines, React ^16.8.6 peer, named
  Circle/Line/SemiCircle exports, and CJS/ESM filenames and source maps. Modern
  development tools need Node 22.22.2+ or 24.15.0+
- Keep `progressbar.js: ^1.1.0`, but refresh the lock to 1.1.1. The original
  locked 1.1.0 has [GHSA-89qm-hm2x-mxm3](https://github.com/advisories/GHSA-89qm-hm2x-mxm3),
  a prototype-pollution vulnerability fixed in 1.1.1. An unchanged permissive
  manifest range does not prevent an external consumer from pinning an older,
  vulnerable dependency; this lock and the built bundles use the patched version

The runtime compatibility adjustment is separate from the tool replacement:

1. Load progressbar.js only when a shape mounts. Its 1.1.1 main is a browser
   bundle requiring `self` at load time. Lazy loading preserves plain Node
   import and server rendering without modifying globals
2. For an initial resolved `duration: 0`, pass the smallest positive duration to the
   animation method. Its newer Shifty engine uses `duration || 500`; directly
   forwarding zero would introduce a half-second animation. A positive value
   below timestamp precision gives completion on the next animation frame,
   including `offset` and custom interpolated values in the `step` callback.
   This removes the unintended half-second delay, but does **not** preserve the
   original browser bundle's synchronous completion or every intermediate
   callback during rapid same-frame updates
3. Import React through its CommonJS default and destructure Component/createRef.
   This also supports native ESM tests against React 16.8.6, whose CommonJS
   named exports are not inferred by current Node's ESM loader

The patched dependency's safe deep merge also copies plain-object
`options.attachment` values: callback content remains equal but object identity
differs. This follows from the upstream security fix, not a wrapper callback
rewrite. These tradeoffs are explicit review/decision gates, not claims of
perfect runtime equivalence.

## Characterization and known limitations

Before the tool replacement, seven mock-backed characterization tests covered
exports/shape selection, option precedence and undefined filtering, falsy
initial progress, progress/text updates, stable construction options, DOM prop
forwarding, imperative methods, custom Type overrides and unmount behavior.
Two actual-library SVG tests also passed using the original package's published
browser distribution. Its separately resolved Shifty 2.9.0 Node entry exported
`{ shifty: ... }`, so the original direct Node-entry integration failed with
`shifty.interpolate is not a function`; that baseline failure is not hidden.

These pre-existing component bugs remain intentionally separate:

- Remaining DOM props (including style/className/id) are saved only after the
  first render, while updates are disabled, so they are not forwarded
- Updated text is assigned to `shape.text` instead of calling the library's
  text API. It does not update the rendered text and can break later explicit
  destruction because the library expects that property to contain a DOM node
- Unmount does not invoke the existing destroy method
- The imperative value method returns the library's function rather than its
  numeric result. Mount-time options are not reconstructed on prop updates
- The legacy componentWillReceiveProps lifecycle emits React 16 warnings

Tests preserve these observations rather than silently repair them in a
dependency update. Initial progress zero remains skipped as before.

## Validation

- Clean Yarn 1.22.22 frozen installs with `--ignore-scripts`, then non-mutating
  lint, build and all 15 tests on Node 22.23.3 and Node 24.19.0
- Real progressbar.js SVG construction, styles, progress, text characterization
  and explicit cleanup in jsdom; all three shapes; CJS and native ESM output
- Node 8 / ES2017 parsing of both complete generated outputs
- Packed CJS import and server rendering on Node 8.0.0, 8.17.0, 22.23.3 and
  24.19.0, against React/ReactDOM 16.8.6, 16.11.0 and 16.14.0
- Packed CJS and native ESM real-library SVG tests on Node 22/24 against each
  of those three React versions, including zero-duration initial/update values
- Pack contents checked: both distribution files and maps, source, manifest,
  README and refresh notes; no development dependencies or test artifacts bundled as files

The native ESM test copies the bytes to a temporary .mjs file solely to select
Node's ESM semantics. The public .es.js filename and package type are unchanged.
jsdom uses `SVGElement.getTotalLength = () => 100`; geometry accuracy and actual
browser layout are not claimed. Old Node versions are only compatibility-test
targets, not recommended development environments.

## Dependency and supply-chain evidence

The old Yarn lock was read and audited before installing anything. It held
1,456 distinct name/version pairs; npm's advisory endpoint reported 86 affected
package names / 215 advisories, and OSV reported 107 affected name/version pairs.
The obsolete CRA tree was never installed or executed.

The replacement has 228 distinct name/version pairs, including platform-specific
optional packages. Both npm's full advisory endpoint and OSV batch queries
reported zero findings for the final graph. This includes development and
runtime dependencies; it is not a production-only audit. All resolved registry
URLs/integrities were compared with the primary npm registry metadata. Direct
pin engines, peers, publication dates and lifecycle scripts were inspected.
Installs used `--ignore-scripts`; only the reviewed lint/build/test commands ran.
The sole dependency install hook is optional macOS fsevents 2.3.3; it is not
installed on the Linux validation host.

The patched progressbar.js package includes prebundled code: its lodash.merge
module matches registry lodash.merge 4.6.2 exactly, and its Shifty code matches
registry Shifty 2.20.4 after excluding the source-map comment. Those versions
are also in the audited graph, so the bundled code was not mistaken for an
unexamined dependency copy.

Known compromised chalk 5.6.1 and debug 4.4.2 are absent. debug is 4.4.3; chalk
is absent. The old fsevents 1.x tree is removed; optional fsevents is 2.3.3.
Primary advisories: [chalk](https://github.com/advisories/GHSA-2v46-p5h4-248w),
[debug](https://github.com/advisories/GHSA-4x49-vf9v-38px),
[fsevents](https://github.com/advisories/GHSA-xv2f-5jw4-v95m).
A clean scan is time-specific evidence, not a guarantee against future findings.

## Lifecycle and merge gates

The full tracked tree has no GitHub Actions, automatic npm publication, tag or
deployment configuration. `.travis.yml` only selects Node 8/9 and is unchanged;
it is not evidence of a passing modern validation gate. `prepare` is a build
hook, not publication, and now uses `npm run build` rather than requiring Yarn
inside the lifecycle. No new publish hook was added. Public configuration alone
cannot prove the absence of external release integrations.

The default branch, active overlapping PRs, exact candidate head, independent
review and real required statuses must be rechecked before merge. Do not close
the old PRs merely because this document exists.

## Exact old-PR mapping

All 21 original PRs were re-read while open; each changes only yarn.lock. This
table includes secondary package changes in their actual patches. “Removed”
means no locator for that package remains anywhere in the new lock. Retained
versions below are the complete set in the new lock and were included in both
full scans. In particular, the old tar/follow-redirects/express destinations
are not used as a present-day security baseline.

| Old PR | Target and final outcome | Other package occurrences changed by old PR |
| --- | --- | --- |
| [#62](https://github.com/tiaanduplessis/react-progressbar/pull/62) | dot-prop removed | None |
| [#63](https://github.com/tiaanduplessis/react-progressbar/pull/63) | websocket-extensions removed | None |
| [#66](https://github.com/tiaanduplessis/react-progressbar/pull/66) | ssri removed | figgy-pudding removed |
| [#67](https://github.com/tiaanduplessis/react-progressbar/pull/67) | handlebars removed | uglify-js removed |
| [#69](https://github.com/tiaanduplessis/react-progressbar/pull/69) | hosted-git-info removed | None |
| [#70](https://github.com/tiaanduplessis/react-progressbar/pull/70) | dns-packet removed | safe-buffer removed |
| [#71](https://github.com/tiaanduplessis/react-progressbar/pull/71) | merge-deep removed | None |
| [#73](https://github.com/tiaanduplessis/react-progressbar/pull/73) | path-parse 1.0.7 | None |
| [#74](https://github.com/tiaanduplessis/react-progressbar/pull/74) | tar removed | chownr removed; fs-minipass removed; minipass removed; minizlib removed; mkdirp removed; safe-buffer removed; yallist 3.1.1 |
| [#75](https://github.com/tiaanduplessis/react-progressbar/pull/75) | tmpl removed | None |
| [#78](https://github.com/tiaanduplessis/react-progressbar/pull/78) | ajv 6.15.0 | fast-deep-equal 3.1.3; fast-json-stable-stringify 2.1.0; uri-js 4.4.1 |
| [#79](https://github.com/tiaanduplessis/react-progressbar/pull/79) | follow-redirects removed | None |
| [#81](https://github.com/tiaanduplessis/react-progressbar/pull/81) | color-string removed | None |
| [#82](https://github.com/tiaanduplessis/react-progressbar/pull/82) | ws removed | None |
| [#83](https://github.com/tiaanduplessis/react-progressbar/pull/83) | url-parse removed | None |
| [#85](https://github.com/tiaanduplessis/react-progressbar/pull/85) | eventsource removed | url-parse removed |
| [#86](https://github.com/tiaanduplessis/react-progressbar/pull/86) | terser removed | buffer-from removed; commander removed; source-map-support removed |
| [#87](https://github.com/tiaanduplessis/react-progressbar/pull/87) | decode-uri-component removed | None |
| [#88](https://github.com/tiaanduplessis/react-progressbar/pull/88) | qs removed | None |
| [#89](https://github.com/tiaanduplessis/react-progressbar/pull/89) | express removed | accepts removed; array-flatten removed; body-parser removed; bytes removed; call-bind removed; content-disposition removed; cookie removed; cookie-signature removed; depd removed; destroy removed; ee-first removed; encodeurl removed; escape-html removed; etag removed; finalhandler removed; forwarded removed; fresh removed; get-intrinsic removed; has-symbols removed; http-errors removed; ipaddr.js removed; media-typer removed; merge-descriptors removed; methods removed; mime-db removed; mime-types removed; ms 2.1.3; negotiator removed; object-inspect removed; on-finished removed; path-to-regexp removed; proxy-addr removed; qs removed; raw-body removed; safe-buffer removed; send removed; serve-static removed; setprototypeof removed; side-channel removed; statuses removed; toidentifier removed; type-is removed; unpipe removed; utils-merge removed; vary removed |
| [#90](https://github.com/tiaanduplessis/react-progressbar/pull/90) | json5 2.2.3 | minimist removed |
