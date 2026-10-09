# Interactive reports

The standalone HTML embeds the validated model, summary, optional changes and phase plan. It needs no CDN, network access or service. Search, schema/kind/status filters, node inspection, keyboard selection, zoom/pan, direct/transitive impact, path evidence, risk filtering, change lists and review phases are implemented. Foreign-key edges use a dotted stroke, parsed references a dashed stroke, recorded catalogs a solid stroke. Color is supplementary.

Rendering is capped at 350 visible nodes. The model/export remains complete and a cap message provides per-schema totals. Narrow filters to inspect omitted nodes. Layout groups by schema on a deterministic grid; it is not a force-directed layout and large dense graphs can overlap. The shortest path panel is better evidence than arrow placement. SVG/JSON exports work; PNG export is unavailable. CLI Mermaid/DOT exports are deterministic and independent of browser layout.

The detail panel previews up to 40 shortest paths and 16 steps per path, with explicit truncation messages. Browser traversal stores one predecessor per node to bound graph memory. CLI impact provides complete paths; exported model JSON retains every node and edge. A 1,000-node browser test checks the cap, omitted-schema totals, path preview, and selection beyond the initial graph window.

`tests/test_browser.py` exercises offline navigation, search, node selection, reverse highlights, filters, zoom, keyboard controls, exports, risk views and sequence tabs. Cross-artifact tests compare JSON state, Markdown inventory and model counts. Automated UI success does not prove perceptual quality or SQL correctness. Screenshots must come from actual runs and be inspected before claiming review.
