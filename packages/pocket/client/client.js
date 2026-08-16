window.__ModuleLoader__.load({
  id: "dsh-wdx-pocket",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    // The DSH client module system provides react as a module, never as a
    // global. esbuild keeps react external (see the build config above) and
    // its classic JSX transform emits bare React.createElement calls for the
    // mobile components (which import only named hooks, not React itself), so
    // the bundle must bind React itself - otherwise every mobile component
    // crashes at render time with "ReferenceError: React is not defined".
    var React = require("react");
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// wdx-dsh-plugins/packages/pocket/client/index.jsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject,
  name: () => name,
  redactStatus: () => redactStatus
});
module.exports = __toCommonJS(index_exports);
var import_react2 = require("react");

// wdx-dsh-plugins/packages/pocket/client/api.js
var POCKET_RPC_CHANNEL = "/dsh-wdx-pocket";
var POCKET_ENDPOINTS = Object.freeze({
  status: "pocket.status",
  tunnelStart: "tunnel.start",
  tunnelStop: "tunnel.stop",
  frpGenConfig: "frp.genConfig",
  frpTest: "frp.test",
  version: "pocket.version",
  update: "pocket.update",
  restart: "pocket.restart"
});
var POCKET_TUNNEL_MODES = Object.freeze(["quick", "named", "frp"]);
var POCKET_TUNNEL_MODE_LABELS = Object.freeze({
  quick: "\u5FEB\u901F\u96A7\u9053\uFF08\u96F6\u914D\u7F6E\uFF09| Quick",
  named: "\u547D\u540D\u96A7\u9053\uFF08\u81EA\u6709\u57DF\u540D\uFF09| Named",
  frp: "frp\uFF08\u81EA\u6709\u670D\u52A1\u5668\uFF09| frp"
});
function compareVersions(a, b) {
  const pa = String(a).replace(/^[vV]/, "").split(".");
  const pb = String(b).replace(/^[vV]/, "").split(".");
  for (let i = 0; i < 3; i++) {
    const x = parseInt(pa[i], 10) || 0;
    const y = parseInt(pb[i], 10) || 0;
    if (x !== y) return x - y;
  }
  const aPre = String(a).replace(/^[vV]/, "").match(/-.*$/)?.[0] ?? "";
  const bPre = String(b).replace(/^[vV]/, "").match(/-.*$/)?.[0] ?? "";
  if (!aPre && !bPre) return 0;
  if (!aPre) return 1;
  if (!bPre) return -1;
  const aParts = aPre.slice(1).split(".");
  const bParts = bPre.slice(1).split(".");
  const len = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < len; i++) {
    const ax = aParts[i] ?? "";
    const bx = bParts[i] ?? "";
    if (ax === bx) continue;
    const aNum = /^\d+$/.test(ax);
    const bNum = /^\d+$/.test(bx);
    if (aNum && bNum) return Number(ax) - Number(bx);
    if (aNum) return 1;
    if (bNum) return -1;
    return ax < bx ? -1 : 1;
  }
  return 0;
}
function redactStatus(s) {
  return {
    proxyRunning: s?.proxyRunning === true,
    proxyPort: s?.proxyPort ?? null,
    lanUrl: s?.lanUrl ?? null,
    lanQr: s?.lanQr ?? null,
    tunnelRunning: s?.tunnelRunning === true,
    tunnelUrl: s?.tunnelUrl ?? null,
    tunnelQr: s?.tunnelQr ?? null,
    tunnelState: s?.tunnelState ?? { phase: "idle" },
    tunnelMode: s?.tunnelMode ?? null,
    tunnelModes: s?.tunnelModes ?? [...POCKET_TUNNEL_MODES],
    namedConfig: s?.namedConfig ?? null,
    frpConfig: s?.frpConfig ?? null,
    namedCandidates: s?.namedCandidates ?? [],
    detect: s?.detect ?? null,
    dshPort: s?.dshPort ?? null
  };
}

// wdx-dsh-plugins/packages/pocket/client/mobile/MobileNavToggle.tsx
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
function MobileNavToggle({ toggleSidebar, t }) {
  const toggleExplorer = () => {
    const frame = document.querySelector('[data-mobile-nav="frame"]');
    if (frame === null) return;
    if (frame.hasAttribute("data-aionui-explorer-open")) {
      frame.removeAttribute("data-aionui-explorer-open");
    } else {
      frame.setAttribute("data-aionui-explorer-open", "");
    }
  };
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      "data-mobile-nav": "toggle",
      "aria-label": t("open"),
      title: t("open"),
      onClick: () => toggleSidebar()
    },
    /* @__PURE__ */ React.createElement(import_dsh_client_ui_primitives.IconPanelLeftOutline16, { size: 16 })
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      "data-mobile-nav": "files",
      "aria-label": t("files"),
      title: t("files"),
      onClick: toggleExplorer
    },
    /* @__PURE__ */ React.createElement(import_dsh_client_ui_primitives.IconFolderOpenOutline16, { size: 16 })
  ));
}

// wdx-dsh-plugins/packages/pocket/client/mobile/MobileNavOverlay.tsx
var import_react = require("react");
var import_dsh_client_ui_primitives2 = require("@deepseek-ai/dsh-client-ui-primitives");
var MOBILE_QUERY = "(max-width: 1023px)";
function useMobile() {
  const [mobile, setMobile] = (0, import_react.useState)(() => window.matchMedia(MOBILE_QUERY).matches);
  (0, import_react.useEffect)(() => {
    const query = window.matchMedia(MOBILE_QUERY);
    const onChange = (event) => setMobile(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return mobile;
}
function findFrame() {
  return document.querySelector("[data-shell-overlay]")?.parentElement ?? null;
}
function MobileNavOverlay({ toggleSidebar, t }) {
  const mobile = useMobile();
  const [open, setOpen] = (0, import_react.useState)(false);
  const [fabVisible, setFabVisible] = (0, import_react.useState)(false);
  (0, import_react.useLayoutEffect)(() => {
    if (!mobile) {
      setOpen(false);
      return;
    }
    const frame = findFrame();
    if (frame === null) return;
    frame.setAttribute("data-mobile-nav", "frame");
    const sync = () => setOpen(!frame.hasAttribute("data-sidebar-collapsed"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(frame, { attributes: true, attributeFilter: ["data-sidebar-collapsed"] });
    return () => {
      observer.disconnect();
      frame.removeAttribute("data-mobile-nav");
    };
  }, [mobile]);
  (0, import_react.useEffect)(() => {
    if (!mobile) {
      setFabVisible(false);
      return;
    }
    const sync = () => setFabVisible(document.querySelector('[data-phase="active"]') === null);
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-phase"]
    });
    return () => observer.disconnect();
  }, [mobile]);
  (0, import_react.useEffect)(() => {
    if (!mobile || !open) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape" && document.querySelector('[aria-modal="true"]') === null) toggleSidebar();
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [mobile, open, toggleSidebar]);
  (0, import_react.useEffect)(() => {
    if (!mobile || !open) return;
    const onDrawerClick = (event) => {
      if (document.querySelector('[aria-modal="true"]') !== null) return;
      const target = event.target;
      if (target === null) return;
      const drawer = document.querySelector('[data-mobile-nav="frame"] > :first-child');
      if (drawer === null || !drawer.contains(target)) return;
      if (target.closest('[class*="sessionRow"] button') !== null) return;
      const navigates = target.closest(
        'button[data-dsh-taskboard-entry], button[data-dsh-ssh-entry], [class*="newSession"], [class*="sessionRow"], [class*="searchResultRow"], [class*="searchResultWorkspace"]'
      );
      if (navigates !== null) toggleSidebar();
    };
    document.addEventListener("click", onDrawerClick, true);
    return () => document.removeEventListener("click", onDrawerClick, true);
  }, [mobile, open, toggleSidebar]);
  if (!mobile) return null;
  return /* @__PURE__ */ React.createElement(React.Fragment, null, open && /* @__PURE__ */ React.createElement(
    "div",
    {
      "data-mobile-nav": "backdrop",
      role: "button",
      "aria-label": t("backdrop"),
      onClick: () => toggleSidebar()
    }
  ), fabVisible && !open && /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      "data-mobile-nav": "fab",
      "aria-label": t("open"),
      title: t("open"),
      onClick: () => toggleSidebar()
    },
    /* @__PURE__ */ React.createElement(import_dsh_client_ui_primitives2.IconPanelLeftOutline16, { size: 18 })
  ));
}

// wdx-dsh-plugins/packages/pocket/client/mobile/MobileDrawerFooter.tsx
var import_dsh_client_ui_primitives3 = require("@deepseek-ai/dsh-client-ui-primitives");
function MobileDrawerFooter({ useSessions, downloadSessionLog, toggleSidebar, t }) {
  const sessionId = useSessions((state) => state.current);
  const openExplorer = () => {
    document.querySelector('[data-mobile-nav="frame"]')?.setAttribute("data-aionui-explorer-open", "");
    toggleSidebar();
  };
  return /* @__PURE__ */ React.createElement("div", { "data-mobile-nav": "drawer-actions" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      "data-mobile-nav": "explorer",
      "aria-label": t("files"),
      title: t("files"),
      onClick: openExplorer
    },
    /* @__PURE__ */ React.createElement(import_dsh_client_ui_primitives3.IconPanelLeftOutline16, { size: 14 }),
    /* @__PURE__ */ React.createElement("span", null, t("files"))
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      "data-mobile-nav": "session-log",
      "aria-label": t("sessionLog"),
      title: t("sessionLog"),
      disabled: sessionId === void 0,
      onClick: () => {
        if (sessionId !== void 0) downloadSessionLog(sessionId);
      }
    },
    /* @__PURE__ */ React.createElement(import_dsh_client_ui_primitives3.IconDownloadOutline16, { size: 14 }),
    /* @__PURE__ */ React.createElement("span", null, t("sessionLog"))
  ));
}

// wdx-dsh-plugins/packages/pocket/client/mobile/mobile.css.ts
var MOBILE_CSS = `
/* ---------- base control styles (rendered at any width, hidden where unused) ---------- */

[data-mobile-nav="toggle"],
[data-mobile-nav="files"] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex: none;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--dsw-alias-label-secondary, inherit);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
[data-mobile-nav="toggle"]:hover,
[data-mobile-nav="files"]:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, .06));
}
[data-mobile-nav="toggle"]:focus-visible,
[data-mobile-nav="files"]:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary, #4f6ef7);
  outline-offset: 1px;
}

/* Drawer footer actions: the relocated Session log download plus the Files
   action that opens the dsh-web-ui explorer sheet. */
[data-mobile-nav="drawer-actions"] {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
[data-mobile-nav="session-log"],
[data-mobile-nav="explorer"] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, .12));
  border-radius: 12px;
  background: transparent;
  color: var(--dsw-alias-label-primary, inherit);
  font-family: inherit;
  font-size: 13px;
  line-height: 20px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
[data-mobile-nav="session-log"]:hover:not(:disabled),
[data-mobile-nav="explorer"]:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, .06));
}
[data-mobile-nav="session-log"]:disabled {
  color: var(--dsw-alias-label-dimmed, rgba(0, 0, 0, .35));
  cursor: default;
}

/* Floating fallback button (hero / blank phases without a session header).
   The top clears the camera band below the status bar; when the client has
   set viewport-fit=cover the safe-area inset moves it below the notch too. */
[data-mobile-nav="fab"] {
  position: absolute;
  top: calc(env(safe-area-inset-top, 0px) + 72px);
  left: 10px;
  z-index: 21;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  padding: 0;
  border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, .12));
  border-radius: 50%;
  background: var(--dsw-alias-button-floating-fill, #ffffff);
  color: var(--dsw-alias-label-primary, inherit);
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(0, 0, 0, .18);
  -webkit-tap-highlight-color: transparent;
}
[data-mobile-nav="fab"]:hover {
  background: var(--dsw-alias-button-floating-hover, rgba(0, 0, 0, .08));
}
[data-mobile-nav="fab"]:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary, #4f6ef7);
  outline-offset: 2px;
}

/* Dimmed backdrop under the open drawer; above every column, below the drawer. */
[data-mobile-nav="backdrop"] {
  position: absolute;
  inset: 0;
  z-index: 30;
  background: rgba(0, 0, 0, .45);
  cursor: pointer;
  animation: dsh-mobile-nav-fade .2s var(--ds-ease-in-out, ease-in-out);
  -webkit-tap-highlight-color: transparent;
}
@keyframes dsh-mobile-nav-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
/* Settings sheet entrance: the official dialog mounts with no animation at
   all, so it snaps in. Fade + slight rise/scale reads as a proper sheet. */
@keyframes dsh-mobile-nav-sheet-in {
  from {
    opacity: 0;
    transform: translateY(14px) scale(.98);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
/* Preview sheet rise: the aionui preview column opens as a bottom sheet. */
@keyframes dsh-mobile-nav-sheet-up {
  from {
    opacity: 0;
    transform: translateY(28px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/* ---------- mobile-only layout ---------- */

@media (max-width: 1023px) {
  /* --- Phone chrome ---
     The system status bar stays visible (no fullscreen). Two adjustments
     make it behave:
     - touch-action: manipulation kills double-tap-to-zoom (and the 300ms
       tap delay) while keeping pan and pinch zoom; the client also
       suppresses legacy-iOS gesturestart as a fallback.
     - With the client's viewport-fit=cover, env(safe-area-inset-top) is the
       status bar / notch height; the rules below push the app content below
       it so the status bar never covers anything. Off notched phones (or in
       a normal browser tab where the layout viewport already sits below the
       status bar) the inset is 0 and nothing shifts. */
  html,
  body {
    touch-action: manipulation !important;
  }

  /* AppFrame: the drawer takes the sidebar column out of grid flow, so the
     remaining in-flow items (center, details) land in tracks 1..2: give the
     center every pixel and keep the details track at zero. The top padding
     clears the status bar / notch for every in-flow surface (session header,
     messages, composer); the absolutely-positioned drawer is unaffected (its
     containing block is the frame's padding box, i.e. still the frame top). */
  [data-mobile-nav="frame"] {
    position: relative !important;
    grid-template-columns: minmax(0, 1fr) 0 0 !important;
    padding-top: env(safe-area-inset-top, 0px) !important;
  }

  /* The sidebar column (first grid child) becomes a left drawer. The drawer
     hugs the sidebar content exactly (the wide sidebar carries an inline
     width, ~280px): a fixed 92vw box would leave a white strip where the
     container background shows beside the content.
     Closed state: translateX(-110%) \u2014 more than -100% of the max-content
     width \u2014 guarantees the whole drawer (and its shadow, had it one) leaves
     the viewport. A mere -100% leaves a sliver on screen; -105% (as used
     before) left 14px of the drawer plus a long 32px-blur shadow gradient
     visible along the left edge of the main UI. No box-shadow at all: the
     dimmed backdrop already separates drawer from content. */
  [data-mobile-nav="frame"] > :first-child {
    position: absolute !important;
    inset: 0 auto 0 0 !important;
    width: max-content !important;
    max-width: 92vw !important;
    z-index: 40 !important;
    transform: translateX(-110%);
    transition: transform .28s var(--ds-ease-in-out, ease-in-out);
    background: var(--dsw-alias-bg-base, #ffffff);
    /* Keep the drawer's own content below the status bar / notch: the drawer
       spans the full frame height (its absolute containing block is the
       frame's padding box, so the frame's own safe-area padding does NOT
       reach it). The drawer background paints the status-bar strip, which
       the client's theme-color meta matches, so the strip reads seamless. */
    padding-top: env(safe-area-inset-top, 0px) !important;
    /* Kill the official sidebarCol right border: with the backdrop the edge
       reads cleanly, and the settings dialog (width:100% of this box) stays
       pixel-flush with the drawer. */
    border-right: none !important;
  }

  /* Expanded state (frame without data-sidebar-collapsed) slides the drawer in.
     The open state must be transform:none \u2014 NOT translateX(0): an identity
     transform still makes the drawer the containing block for fixed-position
     descendants (the settings dialog's .VOzbGW_overlay is portaled into the
     sidebar DOM). With the identity transform the wide settings sheet
     (100vw-16) overflows the 280px drawer, the dialog's focus scrolls the
     overflow:hidden drawer to scrollLeft=102, and every static child (plus the
     fixed overlay) shifts 102px off-screen. With transform:none the overlay is
     viewport-anchored: it dims the full screen and the sheet sits at left:8. */
  [data-mobile-nav="frame"]:not([data-sidebar-collapsed]) > :first-child {
    transform: none !important;
  }

  /* Drag handles are useless on touch and would float over the drawer. */
  [data-side="sidebar"],
  [data-side="details"] {
    display: none !important;
  }

  /* --- Conversation text on mobile ---
     The official message flow keeps desktop's 32px side gutters and 16px
     type. On a phone: shrink the type a notch and widen the lines by
     trimming the gutters (the sidebar drawer list keeps its size). The
     flow's scroll container is the only _scroll element holding markdown
     <p> paragraphs \u2014 the composer's own scroll (textarea) is excluded
     via :has(p). */
  /* The official main scroll body reserves scrollbar-gutter for desktop
     scrollbars (8px), which shoves every column off-center on a phone.
     Classic desktop scrollbars (Edge/Chrome) also occupy ~8-17px in a
     phone-sized viewport, shifting the column further. Mobile scrolling
     is touch/wheel, so remove the scrollbar entirely on phones: the
     column is then exactly centered in every browser. */
  [data-phase] [class$="_scrollBody"] {
    scrollbar-gutter: auto !important;
    scrollbar-width: none !important;
  }
  [data-phase] [class$="_scrollBody"]::-webkit-scrollbar {
    display: none !important;
    width: 0 !important;
    height: 0 !important;
  }
  /* Message action rows (copy / run-time badges) can overflow the right
     edge on narrow screens \u2014 keep them inside the message width. */
  [data-phase] [class$="_actions"] {
    overflow: hidden !important;
  }
  [data-phase] [class$="_actions"] [class$="_timeEnd"] {
    flex: 0 1 auto !important;
    min-width: 0 !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  [data-phase] [class$="_scroll"]:has(p) {
    padding-left: 20px !important;
    padding-right: 20px !important;
    font-size: 15px !important;
  }
  /* The official markdown styles set an explicit 16px on paragraphs and
     list items, so the container's inherited 15px is not enough. User
     messages render their text in a div whose class carries _text_
     (16px too) \u2014 cover it as well. */
  [data-phase] [class$="_scroll"]:has(p) p,
  [data-phase] [class$="_scroll"]:has(p) li,
  [data-phase] [class$="_scroll"]:has(p) [class*="_text_"] {
    font-size: 15px !important;
  }

  /* --- Composer bottom row on mobile ---
     The official row gives the model pill (trailing) flex:0 0 auto, which
     squeezes the agent-permission pill (modes) down to 15px: the pill's
     chevron then overflows on top of the model name. Let the permission
     pill keep its natural width and let the model pill shrink instead.
     Anchored by the composer card (:has(textarea)): row = last child,
     tools = first child, permission pill = its 2nd child, model pill =
     row's last child. */
  [data-phase] [class*="_card"]:has(textarea) > :last-child {
    gap: 8px !important;
  }
  [data-phase] [class*="_card"]:has(textarea) > :last-child > :first-child {
    gap: 8px !important;
  }
  [data-phase] [class*="_card"]:has(textarea) > :last-child > :first-child > :nth-child(2) {
    flex: 0 0 auto !important;
  }
  [data-phase] [class*="_card"]:has(textarea) > :last-child > :last-child {
    flex: 1 1 auto !important;
    min-width: 0 !important;
  }

  /* --- Session header on mobile ---
     Layout goal: [toggle] [session title] [mode badge] in a row, with the
     Session log capsule removed from the header (relocated to the drawer
     footer). Stable structural hooks only:
       [data-phase] header                     the session header element
       header > :first-child                   titleRow (titleCluster + utilities)
       header > :first-child > :last-child     headerUtilities (Session log seat) */
  [data-phase] header {
    padding-right: 12px !important;
  }
  /* Give the title row a lane clear of the absolutely-placed toggle, then
     balance the header: with header padding-right 12px, a 20px left
     padding puts the title's geometric center exactly on the viewport
     center (measured 195/195 at 390px). */
  [data-phase] header > :first-child {
    padding-left: 20px !important;
  }
  /* The directory toggle sits at the far left of the header (the header
     is position:relative; the data-slot wrappers are display:contents). */
  [data-mobile-nav="toggle"] {
    position: absolute !important;
    left: 8px !important;
    top: 12px !important;
    z-index: 2 !important;
  }
  /* The Files action sits at the FAR RIGHT of the header so it reads as a
     distinct control from the directory toggle on the left (which opens
     the history sidebar). */
  [data-mobile-nav="files"] {
    position: absolute !important;
    left: auto !important;
    right: 8px !important;
    top: 12px !important;
    z-index: 2 !important;
  }
  /* Session log download: gone from the header row on mobile (the utilities
     seat holds only the session-log-export capsule). */
  [data-phase] header > :first-child > :last-child {
    display: none !important;
  }

  /* --- Settings dialog on mobile ---
     Desktop: 800px two-column flex (188px nav + content). Mobile: a
     near-full-width sheet \u2014 nav tabs wrap into rows on top, option rows
     stay horizontal (title+description left, control right). Structural
     selectors are scoped to the unique aria-modal dialog; every
     settings-specific rule is gated with
     :has(> :first-child > :last-child > button) \u2014 the settings nav tab
     list holds <button> tabs, so the transient export dialog (the same
     primitives Modal, header(title+close)+description+body) keeps its
     official centered card layout. Requires :has() support
     (Chromium 105+, 2022). */
  [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])) {
    position: absolute !important;
    left: 8px !important;
    /* Fixed top (no translateY): a transform on the panel combined with the
       panel overflowing the max-content drawer shifts the fixed overlay's
       coordinate frame, dragging the whole sidebar content off-screen. The
       safe-area inset keeps the sheet below the status bar / notch. */
    top: calc(env(safe-area-inset-top, 0px) + 12px) !important;
    width: calc(100vw - 16px) !important;
    max-width: calc(100vw - 16px) !important;
    /* Height follows the content (no dead space under a short page); it
       caps at 100dvh-24 (less the safe-area top) and the options area
       scrolls only then. */
    height: auto !important;
    max-height: min(800px, calc(100vh - 24px - env(safe-area-inset-top, 0px))) !important;
    max-height: min(800px, calc(100dvh - 24px - env(safe-area-inset-top, 0px))) !important;
    flex-direction: column !important;
    border-radius: 14px !important;
    animation: dsh-mobile-nav-sheet-in .22s var(--ds-ease-out, ease-in-out);
  }
  /* The settings sheet's dimmed mask fades in with the panel (the mask is
     the first child of the overlay that directly contains the sheet). */
  :has(> [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"]))) > :first-child {
    animation: dsh-mobile-nav-fade .18s var(--ds-ease-out, ease-in-out);
  }
  @media (prefers-reduced-motion: reduce) {
    [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])),
    :has(> [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"]))) > :first-child {
      animation: none !important;
    }
  }
  /* The export dialog (not the settings sheet) must never overflow the
     viewport: the official centered card can be wider than 390px. */
  [aria-modal="true"]:not(:has(> :first-child > :last-child > button)) {
    max-width: calc(100vw - 32px) !important;
  }
  /* Nav bar: hide the "Settings" caption (redundant on a full-width sheet)
     and wrap the tab list so every tab is visible \u2014 a horizontal scroll cut
     the last tab ("Plugins") off with no affordance to scroll. */
  [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])) > :first-child {
    width: 100% !important;
    flex-direction: row !important;
    align-items: center !important;
    gap: 6px !important;
    padding: 10px 12px 8px !important;
  }
  [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])) > :first-child > :first-child {
    display: none !important;
  }
  [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])) > :first-child > :last-child {
    flex-direction: row !important;
    flex-wrap: wrap !important;
    width: 100% !important;
    gap: 6px !important;
    overflow: visible !important;
  }
  /* Content toolbar (Open configuration file + close): spread to the edges
     instead of clustering right with a dead zone on the left. The toolbar
     children carry official auto-margins that would defeat space-between,
     so neutralize them. The close button gets a round tappable base so it
     reads as its own control, not part of the outline button. */
  [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])) > :last-child > :first-child {
    justify-content: space-between !important;
    align-items: center !important;
    padding: 0 12px !important;
    min-height: 40px !important;
  }
  [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])) > :last-child > :first-child > * {
    margin-left: 0 !important;
    margin-right: 0 !important;
  }
  [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])) > :last-child > :first-child > :last-child {
    width: 32px !important;
    height: 32px !important;
    border-radius: 50% !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, .06)) !important;
  }
  /* Appearance mode cards: the official cube row renders three tall
     vertical cards (~268px) that eat half the sheet. Turn them into a
     compact horizontal trio (icon + label inline, equal widths).
     Relies on the official cube-row class name of this version. */
  [aria-modal="true"] [class$="_cubeRow"] {
    gap: 6px !important;
  }
  [aria-modal="true"] [class$="_cubeRow"] > * {
    flex: 1 1 0 !important;
    flex-direction: row !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 6px !important;
    padding: 10px 8px !important;
    min-height: 0 !important;
  }
  /* Content: the options scroll area gets bottom breathing room so the last
     row never sits flush against the sheet's rounded corner. */
  [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])) > :last-child {
    flex: 1 1 auto !important;
    min-height: 0 !important;
  }
  [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])) > :last-child > :last-child {
    padding: 0 12px 24px !important;
  }

  /* ---------- dsh-web-ui family compatibility ----------
     The linxin666 plugin suite extends the shell frame directly:
       - aionui-panel appends two trailing grid columns (explorer / preview)
         plus absolute drag handles to [data-dsh-frame]; its 5-track inline
         grid is already overridden above, but the handles and columns would
         still float over the main UI. On mobile the columns leave the grid
         as floating bottom sheets and keep their own visibility state \u2014
         the suite's collapse chevron / preview tabs still work, so no
         feature is lost. The task-board / ssh plugins inject sidebar
         entries and center-column takeover panels; the entries need
         spacing and the kanban needs scrollable columns. */

  /* Touch devices: the drag handles are useless \u2014 the floating expand
     button is the opener. */
  .aionui-explorer-handle,
  .aionui-preview-handle {
    display: none !important;
  }

  /* Shared base: both columns leave the grid as floating panels. The
     explorer is gated shut by default (its own persisted expanded state
     must never cover the mobile UI on load); the header Files action opens
     it via the frame marker below, and the sheet's own collapse chevron
     clears it. Preview stays owned by the suite (hidden while no tab is
     open). The per-column rules below override the geometry. */
  [data-aionui-explorer-col],
  [data-aionui-preview-col] {
    position: fixed !important;
    z-index: 55 !important;
    background: var(--aion-bg-base, #ffffff) !important;
    border-left: none !important;
  }
  /* Explorer (file tree) bottom sheet: bottom edge aligned exactly with
     the composer card's bottom line \u2014 the card sits 36px above the
     viewport bottom (8px composer padding + the 28px stats strip below
     the card), so the sheet uses the same 36px bottom offset. */
  [data-aionui-explorer-col] {
    visibility: hidden !important;
    left: 8px !important;
    right: 8px !important;
    top: auto !important;
    bottom: 36px !important;
    width: auto !important;
    height: min(55dvh, 460px) !important;
    max-height: calc(100dvh - 44px) !important;
    border-radius: 14px !important;
    overflow: hidden !important;
    box-shadow: 0 -4px 28px rgba(0, 0, 0, .18) !important;
    animation: dsh-mobile-nav-sheet-up .24s var(--ds-ease-out, ease-in-out) !important;
  }
  /* Preview (file content) bottom sheet. Gated shut by default: the suite
     persists open preview tabs in localStorage and restores them on load,
     which would pop the sheet over the fresh UI. The client only sets the
     frame marker after the user taps a file row in the explorer; the
     suite's own collapse chevron clears it via the visibility watcher. */
  [data-aionui-preview-col] {
    visibility: hidden !important;
    position: fixed !important;
    left: 8px !important;
    right: 8px !important;
    top: auto !important;
    bottom: 40px !important;
    width: auto !important;
    height: min(50dvh, 420px) !important;
    max-height: calc(100dvh - 48px) !important;
    border-radius: 14px !important;
    overflow: hidden !important;
    box-shadow: 0 -4px 28px rgba(0, 0, 0, .18) !important;
    z-index: 56 !important;
    animation: dsh-mobile-nav-sheet-up .24s var(--ds-ease-out, ease-in-out) !important;
  }
  /* User-opened preview sheet (frame marker, set on file-row tap). */
  [data-mobile-nav="frame"][data-aionui-preview-open] [data-aionui-preview-col] {
    visibility: visible !important;
  }
  /* The Files action opens the explorer sheet (frame marker). */
  [data-mobile-nav="frame"][data-aionui-explorer-open] [data-aionui-explorer-col] {
    visibility: visible !important;
  }
  /* The open drawer must never sit under a sheet: while the frame is in the
     narrow-expanded state both sheets yield (later in the file than the
     open marker rule, so it wins at equal specificity). */
  [data-mobile-nav="frame"]:not([data-sidebar-collapsed]) [data-aionui-explorer-col],
  [data-mobile-nav="frame"]:not([data-sidebar-collapsed]) [data-aionui-preview-col] {
    visibility: hidden !important;
  }
  /* The suite's own expand button reads the store state we bypass on
     mobile \u2014 hide it; the header Files action is the opener. */
  .aionui-floating-expand {
    display: none !important;
  }

  /* dsh-web-ui sidebar entries (task board / ssh) sit flush against each
     other \u2014 give the injected rows breathing room. */
  button[data-dsh-taskboard-entry],
  button[data-dsh-ssh-entry] {
    margin-bottom: 8px !important;
  }

  /* Task board: five kanban columns at minmax(0,1fr) crush into ~78px phone
     strips. Give every column a usable minimum and let the row scroll. */
  [data-dsh-taskboard-board] > [class$="_columns"] {
    grid-template-columns: repeat(5, minmax(240px, 1fr)) !important;
    overflow-x: auto !important;
  }
  /* The floating button must not float over a takeover panel (task board /
     ssh own the center column while active). */
  html[data-dsh-taskboard-active] [data-mobile-nav="fab"],
  html[data-dsh-ssh-active] [data-mobile-nav="fab"],
  html[data-dsh-taskboard-active] [data-mobile-nav="backdrop"],
  html[data-dsh-ssh-active] [data-mobile-nav="backdrop"] {
    display: none !important;
  }
  /* Board header: let the search field take the slack instead of squeezing
     the action buttons. */
  [data-dsh-taskboard-board] > [class$="_boardHeader"] [class$="_search"] {
    flex: 1 1 auto !important;
    min-width: 80px !important;
  }

  /* ---------- dsh-web-ui polish: plugin market search ----------
     The market tab row (Discover / Themes / Installed + the plugin search
     box) is a no-wrap flex: at 390px the tabs plus the ~218px search box
     (~475px total) overflow the ~334px sheet and the search box runs off
     the right edge of the screen (it also forces a horizontal scrollbar on
     the sheet's options area). Let the row wrap: the tabs keep the first
     line and the search box gets its own full-width second line. */

  [aria-modal="true"] [class$="_tabs"] {
    flex-wrap: wrap !important;
    row-gap: 8px !important;
  }
  [aria-modal="true"] [class$="_searchInline"] {
    flex: 1 1 100% !important;
    width: 100% !important;
    max-width: 100% !important;
  }

  /* ---------- dsh-usage-stats polish: usage & balance panel ----------
     The panel's stats row shows three token counters side by side
     (today / month / total). The counters use tabular nowrap figures whose
     min-content width overflows the ~336px panel body on a phone: figures
     clip at the row's edges and the panel grows a horizontal scrollbar.
     Stack the three counters vertically \u2014 full-width rows, so the figures
     always fit. */

  [class*="usg_"][class$="_statsRow"] {
    flex-direction: column !important;
  }
  [class*="usg_"][class$="_stat"] {
    flex: 0 0 auto !important;
    width: 100% !important;
    min-width: 0 !important;
  }

  /* ---------- dsh-web-ui polish: settings sheet ----------
     The official dialog is a desktop two-column form; on a phone the
     label/control split leaves a huge dead gap and long descriptions wrap
     into tall stacks. Stack each row (text above, control full-width) and
     compact the nav tabs into an even wrap. */

  /* Nav tabs: a stable 3-per-row grid (two clean rows instead of a ragged
     wrap) with tighter cells. */
  [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])) > :first-child > :last-child {
    display: grid !important;
    grid-template-columns: repeat(3, 1fr) !important;
    gap: 6px !important;
  }
  [aria-modal="true"] [class$="_navCell"] {
    padding: 6px 8px !important;
    gap: 6px !important;
    font-size: 13px !important;
    justify-content: flex-start !important;
  }
  [aria-modal="true"] [class$="_navCell"] svg {
    width: 14px !important;
    height: 14px !important;
    flex: none !important;
  }
  /* Setting rows: text on top, control below at full width. */
  [aria-modal="true"] [class$="_section"] [class$="_row"] {
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 8px !important;
  }
  [aria-modal="true"] [class$="_section"] [class$="_row"] > :first-child {
    width: 100% !important;
    max-width: none !important;
  }
  [aria-modal="true"] [class$="_section"] [class$="_row"] > :last-child {
    width: 100% !important;
    max-width: none !important;
  }
  /* Appearance mode group: give the cube row a consistent bordered
     segmented look (the official borders differ per state). */
  [aria-modal="true"] [class$="_cubeRow"] > * {
    border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, .12)) !important;
  }

  /* ---------- dsh-web-ui polish: explorer sheet ----------
     The aionui explorer was designed for a desktop side column: compact the
     header, search box and tree rows so a phone shows more entries, and pad
     the scroll bottom so the last row never sits flush on the edge. */

  [data-aionui-explorer-col] [class$="_tabBar"] {
    height: 36px !important;
  }
  [data-aionui-explorer-col] [class$="_tabBtn"],
  [data-aionui-explorer-col] [class$="_tabBtnActive"] {
    padding: 0 12px !important;
    font-size: 13px !important;
  }
  [data-aionui-explorer-col] [class$="_searchBox"] {
    height: 32px !important;
    font-size: 13px !important;
  }
  [data-aionui-explorer-col] [class$="_treeRow"] {
    height: 30px !important;
    font-size: 13px !important;
  }
  [data-aionui-explorer-col] [class$="_treeRow"] svg {
    width: 14px !important;
    height: 14px !important;
  }
  [data-aionui-explorer-col] [class$="_scrollArea"] {
    padding-bottom: 28px !important;
  }

  /* ---------- dsh-web-ui polish: drawer footer ----------
     The injected footer actions (Files + Session log) become two equal pill
     buttons instead of text-width capsules. */

  /* The official footerActions row also hosts the remote-web-ui entry
     row (two icon buttons); without wrapping the two groups squeeze each
     other on one line. Wrap so each group gets its own full-width row. */
  [data-mobile-nav="frame"] [class$="_footerActions"] {
    flex-wrap: wrap !important;
    gap: 6px !important;
  }
  [data-mobile-nav="drawer-actions"] {
    width: 100% !important;
  }
  [data-mobile-nav="drawer-actions"] > button {
    flex: 1 1 0 !important;
    padding: 0 8px !important;
    white-space: nowrap !important;
  }

  /* ---------- dsh-web-ui polish: floating pet ----------
     The whale-girl pet (dsh-pet) floats at the viewport corner with a
     persisted, draggable position. On phones the pet is scaled down so
     it does not dominate the screen; the plugin's own drag + persist
     still work (the position itself is left alone \u2014 the mobile default
     position is seeded via the pet API to just above the composer). */

  body > [class$="_float"]:has([class$="_sprite"][role="button"]) {
    transform: scale(.66);
    transform-origin: bottom right;
  }
  /* While a modal dialog (settings sheet / export) owns the screen the pet
     floats ABOVE it and covers the dialog content; modal semantics say the
     background is inert, so hide the pet for the modal's lifetime. */
  body:has([aria-modal="true"]) > [class$="_float"]:has([class$="_sprite"][role="button"]) {
    display: none !important;
  }

  /* ---------- dsh-web-ui polish: conversation stats line ----------
     The official session-status row (turns / steps / LLM time / TTFT /
     cache) is long. The client marks the exact row with
     [data-mobile-nav="stats"] (text-anchored, hashed classes can't be
     targeted). Layout: ONE fixed-height (28px) flex strip that scrolls
     horizontally \u2014 the full metrics stream stays reachable by swiping,
     the row never grows vertically, no ellipsis or fade, 12px gaps
     between metric groups, a 2px scrollbar as the swipe affordance. */

  [data-mobile-nav="stats"] {
    display: flex !important;
    flex-flow: row nowrap !important;
    align-items: center !important;
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    height: 28px !important;
    min-height: 28px !important;
    max-height: 28px !important;
    box-sizing: border-box !important;
    white-space: nowrap !important;
    overflow-x: auto !important;
    overflow-y: hidden !important;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-x: contain;
    scrollbar-width: thin !important;
    scrollbar-color: var(--dsw-alias-border-l1, rgba(0, 0, 0, .28)) transparent !important;
    padding: 0 0 4px !important;
    line-height: 20px !important;
    font-size: 12px !important;
  }
  [data-mobile-nav="stats"]::-webkit-scrollbar {
    height: 2px !important;
  }
  [data-mobile-nav="stats"]::-webkit-scrollbar-thumb {
    background: var(--dsw-alias-label-tertiary, rgba(0, 0, 0, .3)) !important;
    border-radius: 2px !important;
  }
  [data-mobile-nav="stats"]::-webkit-scrollbar-track {
    background: transparent !important;
  }
  [data-mobile-nav="stats"] > * {
    display: flex !important;
    flex: 0 0 auto !important;
    flex-flow: row nowrap !important;
    align-items: center !important;
    width: max-content !important;
    min-width: max-content !important;
    max-width: none !important;
    white-space: nowrap !important;
    margin-right: 12px !important;
    padding: 0 !important;
  }
  [data-mobile-nav="stats"] > *:last-child {
    margin-right: 0 !important;
  }
  [data-mobile-nav="stats"] * {
    white-space: nowrap !important;
  }

  /* ---------- hero composer on mobile ----------
     The official hero card carries a 2-line textarea plus a tall tool row,
     which reads oversized on a phone. Tighten the empty-state rhythm: keep
     the official centered hero, shrink the textarea line box, slim the card
     padding and the tool row, and close the gap under the headline. */

  [data-phase="hero"] [class$="_card"]:has(textarea) {
    padding-top: 6px !important;
    gap: 8px !important;
  }
  /* The official composer autosizes the textarea and writes an inline
     height (2 lines on the hero empty state) on the textarea's scroll/grow
     wrappers. :placeholder-shown lets us collapse the EMPTY state to one
     line with !important; as soon as the user types, the pseudo-class no
     longer matches and the autosizer's inline height takes over again \u2014 so
     multi-line growth keeps working. */
  [data-phase="hero"] textarea:placeholder-shown {
    height: 28px !important;
  }
  [data-phase="hero"] [class$="_card"]:has(textarea:placeholder-shown) > [class$="_scroll"],
  [data-phase="hero"] [class$="_card"]:has(textarea:placeholder-shown) [class$="_grow"] {
    height: 28px !important;
  }
  [data-phase="hero"] [class$="_card"]:has(textarea) > [class$="_row"] {
    padding-top: 2px !important;
  }
  [data-phase="hero"] [class$="_headline"] {
    line-height: 1.15 !important;
    margin-bottom: 0 !important;
  }
  [data-phase="hero"] [class$="_stack"] {
    gap: 0 !important;
  }
}

/* ---------- desktop: the mobile controls must never appear ---------- */

@media (min-width: 1024px) {
  [data-mobile-nav="toggle"],
  [data-mobile-nav="files"],
  [data-mobile-nav="fab"],
  [data-mobile-nav="backdrop"],
  [data-mobile-nav="session-log"],
  [data-mobile-nav="explorer"],
  [data-mobile-nav="drawer-actions"] {
    display: none !important;
  }
}
`;

// wdx-dsh-plugins/packages/pocket/client/mobile/locales.ts
var NS = "mobileNav";
var zh = {
  "open": "\u6253\u5F00\u76EE\u5F55",
  "close": "\u6536\u8D77\u76EE\u5F55",
  "backdrop": "\u70B9\u51FB\u5173\u95ED\u76EE\u5F55",
  "sessionLog": "\u5BFC\u51FA\u4F1A\u8BDD\u65E5\u5FD7",
  "files": "\u6587\u4EF6\u6D4F\u89C8"
};
var en = {
  "open": "Open directory",
  "close": "Close directory",
  "backdrop": "Click to close directory",
  "sessionLog": "Session log",
  "files": "Files"
};

// wdx-dsh-plugins/packages/pocket/client/mobile/mobile-apply.tsx
function mobileApply(ctx) {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-mobile-nav: dictionaries");
  ctx.effect(() => {
    const tag = document.createElement("style");
    tag.dataset.plugin = "@dsh-external/dsh-mobile-nav";
    tag.dataset.pluginCss = "@dsh-external/dsh-mobile-nav/mobile.css";
    tag.textContent = MOBILE_CSS;
    document.head.appendChild(tag);
    return () => {
      tag.remove();
    };
  }, "dsh-mobile-nav: styles");
  ctx.effect(() => {
    const narrow = window.matchMedia("(max-width: 1023px)");
    const viewport = document.querySelector('meta[name="viewport"]');
    const originalViewport = viewport?.content ?? "";
    const themeMeta = document.createElement("meta");
    themeMeta.name = "theme-color";
    const bodyBg = () => getComputedStyle(document.body).backgroundColor;
    const sync = () => {
      if (viewport !== null) viewport.content = "width=device-width, initial-scale=1, viewport-fit=cover";
      themeMeta.content = bodyBg();
      if (themeMeta.parentElement === null) document.head.appendChild(themeMeta);
    };
    const restore = () => {
      if (viewport !== null) viewport.content = originalViewport;
      themeMeta.remove();
    };
    const onGestureStart = (event) => event.preventDefault();
    if (narrow.matches) sync();
    const onChange = (event) => event.matches ? sync() : restore();
    narrow.addEventListener("change", onChange);
    const observer = new MutationObserver(() => {
      if (narrow.matches) themeMeta.content = bodyBg();
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-ds-dark-theme"] });
    document.addEventListener("gesturestart", onGestureStart);
    return () => {
      narrow.removeEventListener("change", onChange);
      observer.disconnect();
      document.removeEventListener("gesturestart", onGestureStart);
      restore();
    };
  }, "dsh-mobile-nav: status bar theme + viewport + zoom guard");
  ctx.effect(() => {
    const narrow = window.matchMedia("(max-width: 1023px)");
    if (!narrow.matches) return () => {
    };
    const onChevronClick = (event) => {
      const target = event.target;
      if (target === null || !target.closest(".aionui-collapse-chevron")) return;
      document.querySelector('[data-mobile-nav="frame"]')?.removeAttribute("data-aionui-explorer-open");
    };
    document.addEventListener("click", onChevronClick, true);
    return () => document.removeEventListener("click", onChevronClick, true);
  }, "dsh-mobile-nav: aionui explorer close marker");
  ctx.effect(() => {
    const narrow = window.matchMedia("(max-width: 1023px)");
    if (!narrow.matches) return () => {
    };
    const frame = () => document.querySelector('[data-mobile-nav="frame"]');
    const onTap = (event) => {
      const target = event.target;
      if (target === null) return;
      if (target.closest('[data-aionui-explorer-col] [class$="_treeRow"]') === null) return;
      frame()?.setAttribute("data-aionui-preview-open", "");
    };
    const sync = () => {
      const pv = document.querySelector("[data-aionui-preview-col]");
      if (pv === null) return;
      if (getComputedStyle(pv).visibility === "hidden") frame()?.removeAttribute("data-aionui-preview-open");
    };
    document.addEventListener("click", onTap, true);
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ["style"] });
    sync();
    return () => {
      document.removeEventListener("click", onTap, true);
      observer.disconnect();
    };
  }, "dsh-mobile-nav: preview sheet open marker");
  ctx.effect(() => {
    const narrow = window.matchMedia("(max-width: 1023px)");
    if (!narrow.matches) return () => {
    };
    const moveTps = (stats) => {
      if ([...stats.children].some((c) => /^TPS\s+\d/.test((c.textContent ?? "").trim()))) return;
      const stack = stats.closest('[class$="_composerStack"]');
      if (stack === null) return;
      for (const el of stack.querySelectorAll("div")) {
        const text = (el.textContent ?? "").trim();
        if (!/^TPS\s+\d/.test(text)) continue;
        if (el.children.length > 0) continue;
        stats.appendChild(el);
        return;
      }
    };
    const mark = () => {
      for (const root of document.querySelectorAll('[data-phase] [class$="_root"]')) {
        if (root.closest('[class$="_composerStack"]') === null) continue;
        const text = root.textContent ?? "";
        if (!/(turns|steps|\bLLM\b|轮|步)/.test(text)) continue;
        if (root.querySelector("textarea") !== null) continue;
        root.setAttribute("data-mobile-nav", "stats");
        moveTps(root);
        return;
      }
    };
    const observer = new MutationObserver(mark);
    observer.observe(document.body, { childList: true, subtree: true });
    mark();
    return () => {
      observer.disconnect();
    };
  }, "dsh-mobile-nav: stats line marker");
  ctx.effect(() => {
    const narrow = window.matchMedia("(max-width: 1023px)");
    if (!narrow.matches) return () => {
    };
    const cols = ["[data-aionui-explorer-col]", "[data-aionui-preview-col]"];
    const seen = /* @__PURE__ */ new Map();
    const play = (el) => {
      el.animate(
        [
          { opacity: 0, transform: "translateY(28px)" },
          { opacity: 1, transform: "none" }
        ],
        { duration: 280, easing: "cubic-bezier(.16, 1, .3, 1)", fill: "backwards" }
      );
    };
    const check = () => {
      for (const sel of cols) {
        const el = document.querySelector(sel);
        if (el === null) continue;
        const visible = getComputedStyle(el).visibility === "visible";
        const prev = seen.get(sel) ?? false;
        if (visible && !prev) play(el);
        seen.set(sel, visible);
      }
    };
    const observer = new MutationObserver(check);
    observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ["style", "class", "data-aionui-explorer-open"] });
    check();
    return () => {
      observer.disconnect();
    };
  }, "dsh-mobile-nav: sheet rise animation replay");
  ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register({
    name: "conversation.session.header.actions",
    id: "mobile-nav-toggle",
    order: 10,
    locale: NS,
    inject: () => ({
      toggleSidebar: () => ctx.layout.toggleSidebar()
    })
  }, MobileNavToggle));
  ctx.slots.inject("shell.overlay", () => ctx.slots.register({
    name: "shell.overlay",
    id: "mobile-nav-overlay",
    order: 10,
    locale: NS,
    inject: () => ({
      toggleSidebar: () => ctx.layout.toggleSidebar()
    })
  }, MobileNavOverlay));
  ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
    name: "sidebar.footer.action",
    id: "mobile-nav-session-log",
    order: 10,
    locale: NS,
    inject: () => ({
      downloadSessionLog: (sessionId) => ctx.sessionLogDownload.download(sessionId),
      toggleSidebar: () => ctx.layout.toggleSidebar()
    })
  }, MobileDrawerFooter));
}

// wdx-dsh-plugins/packages/pocket/client/index.jsx
var name = "dsh-wdx-pocket";
var inject = ["slots", "connection", "layout", "locale", "sessionLogDownload"];
var styles = {
  card: { background: "var(--dsw-alias-bg-layer-1,#fff)", border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)", borderRadius: 12, padding: "14px 16px", maxWidth: 480 },
  block: { borderTop: "1px solid var(--dsw-alias-border-l2,#e5e7eb)", marginTop: 12, paddingTop: 12 },
  muted: { color: "var(--dsw-alias-label-tertiary,#8b93a1)", fontSize: 12 },
  code: { fontFamily: "ui-monospace,Menlo,monospace", fontSize: 12, wordBreak: "break-all", margin: "4px 0 8px" },
  primary: { font: "inherit", cursor: "pointer", border: "none", background: "var(--dsw-alias-brand-primary,#4f6ef7)", color: "#fff", borderRadius: 8, padding: "6px 14px", fontSize: 13 },
  btn: { font: "inherit", cursor: "pointer", border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)", background: "var(--dsw-alias-bg-layer-1,#fff)", borderRadius: 8, padding: "6px 14px", fontSize: 13 },
  qr: { width: 220, height: 220, borderRadius: 8, border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)", margin: "6px 0" },
  warn: { color: "var(--dsw-alias-state-warn-primary,#b45309)", fontSize: 12 },
  input: { font: "inherit", width: "100%", boxSizing: "border-box", border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)", background: "var(--dsw-alias-bg-layer-1,#fff)", color: "inherit", borderRadius: 8, padding: "6px 10px", fontSize: 13, marginTop: 4 },
  label: { fontSize: 12, color: "var(--dsw-alias-label-secondary,#6b7280)" },
  select: { font: "inherit", border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)", background: "var(--dsw-alias-bg-layer-1,#fff)", color: "inherit", borderRadius: 8, padding: "6px 10px", fontSize: 13, marginTop: 4, width: "100%" },
  routeCard: { border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)", borderRadius: 10, padding: "10px 12px", marginTop: 8, cursor: "pointer", background: "var(--dsw-alias-bg-layer-1,#fff)" },
  routeCardActive: { border: "1px solid var(--dsw-alias-brand-primary,#4f6ef7)", background: "var(--dsw-alias-bg-layer-2,#f3f4f6)" },
  checkOk: { color: "var(--dsw-alias-state-success-primary,#16a34a)", fontSize: 12 },
  checkBad: { color: "var(--dsw-alias-state-error-primary,#dc2626)", fontSize: 12 }
};
function PocketSettingsTab({ rpcCall }) {
  const [status, setStatus] = (0, import_react2.useState)(null);
  const [busy, setBusy] = (0, import_react2.useState)(false);
  const [error, setError] = (0, import_react2.useState)(null);
  const [tunnelState, setTunnelState] = (0, import_react2.useState)(null);
  const [restartNotice, setRestartNotice] = (0, import_react2.useState)(false);
  const [updateInfo, setUpdateInfo] = (0, import_react2.useState)(null);
  const [route, setRoute] = (0, import_react2.useState)(null);
  const [namedTunnelName, setNamedTunnelName] = (0, import_react2.useState)("");
  const [namedUrl, setNamedUrl] = (0, import_react2.useState)("");
  const [frpServerAddr, setFrpServerAddr] = (0, import_react2.useState)("");
  const [frpServerPort, setFrpServerPort] = (0, import_react2.useState)("7000");
  const [frpGen, setFrpGen] = (0, import_react2.useState)(null);
  const [frpTest, setFrpTest] = (0, import_react2.useState)(null);
  const [frpTesting, setFrpTesting] = (0, import_react2.useState)(false);
  const call = async (endpoint, payload) => {
    const res = await rpcCall(endpoint, payload);
    if (!res?.ok) throw new Error(res?.error?.message ?? "RPC failed");
    return res.value;
  };
  const load = async () => {
    try {
      const s = await call(POCKET_ENDPOINTS.status, {});
      setStatus(s);
      setTunnelState(s.tunnelState ?? null);
      if (s.restartNotice) {
        setRestartNotice(true);
        setUpdateInfo(null);
        if (!sessionStorage.getItem("dshp-auto-reloaded")) {
          sessionStorage.setItem("dshp-auto-reloaded", "1");
          setTimeout(() => {
            try {
              location.reload();
            } catch {
            }
          }, 2e3);
        }
      }
    } catch {
    }
  };
  (0, import_react2.useEffect)(() => {
    load();
    const t = setInterval(load, 3e3);
    return () => clearInterval(t);
  }, []);
  (0, import_react2.useEffect)(() => {
    try {
      sessionStorage.removeItem("dshp-auto-reloaded");
    } catch {
    }
  }, []);
  (0, import_react2.useEffect)(() => {
    let alive = true;
    (async () => {
      try {
        const v = await call(POCKET_ENDPOINTS.version, {});
        const meta = await (await fetch("https://registry.npmjs.org/dsh-wdx-pocket/latest")).json();
        if (!alive) return;
        const latest = typeof meta?.version === "string" ? meta.version : null;
        if (latest && v.current && compareVersions(latest, v.current) > 0) {
          setUpdateInfo({ current: v.current, latest, updating: false, result: null });
        } else if (v.current && v.loaded && compareVersions(v.current, v.loaded) > 0) {
          setUpdateInfo({ current: v.current, latest: v.current, updating: false, result: "ok", updated: true });
        }
      } catch {
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  const restartPocket = async () => {
    setUpdateInfo((u) => ({ ...u, restarting: true }));
    try {
      await Promise.race([
        call(POCKET_ENDPOINTS.restart, {}),
        new Promise((_, rej) => setTimeout(() => rej(new Error("restart requested (no reply within 3s)")), 3e3))
      ]);
      setUpdateInfo((u) => ({ ...u, restarting: true, result: "ok" }));
    } catch (err) {
      const msg = String(err?.message ?? "");
      if (/connection|socket|fetch|network|abort|cancelled|ECONN|disconnect|closed|timeout/i.test(msg)) {
        setUpdateInfo((u) => ({ ...u, restarting: true, result: "ok" }));
        return;
      }
      setUpdateInfo((u) => ({ ...u, restarting: false, result: "fail", output: err.message }));
    }
  };
  const runUpdate = async () => {
    setUpdateInfo((u) => ({ ...u, updating: true, result: null }));
    try {
      const r = await call(POCKET_ENDPOINTS.update, {});
      setUpdateInfo((u) => ({
        ...u,
        updating: false,
        result: r.ok ? "ok" : "fail",
        autoRestart: r.autoRestart === true,
        output: r.output ?? r.error
      }));
    } catch (err) {
      setUpdateInfo((u) => ({ ...u, updating: false, result: "fail", output: err.message }));
    }
  };
  const startTunnel = async () => {
    setBusy(true);
    setError(null);
    setTunnelState({ phase: "starting", detail: "\u6B63\u5728\u5F00\u542F\u2026", startedAt: Date.now() });
    const detect2 = status?.detect;
    const mode = route;
    const config = mode === "named" ? {
      tunnelName: detect2?.tunnels?.[0]?.name || namedTunnelName.trim() || "",
      url: detect2?.url || namedUrl.trim() || void 0
    } : mode === "frp" ? { serverAddr: frpServerAddr.trim(), serverPort: Number(frpServerPort) || 7e3 } : void 0;
    try {
      setStatus(await call(POCKET_ENDPOINTS.tunnelStart, { mode, config }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const stopTunnel = async () => {
    try {
      setStatus(await call(POCKET_ENDPOINTS.tunnelStop, {}));
    } catch {
    }
  };
  const genFrps = async () => {
    try {
      setFrpGen(await call(POCKET_ENDPOINTS.frpGenConfig, {}));
    } catch (err) {
      setError(err.message);
    }
  };
  const testFrp = async () => {
    setFrpTesting(true);
    setFrpTest(null);
    try {
      setFrpTest(await call(POCKET_ENDPOINTS.frpTest, {
        config: { serverAddr: frpServerAddr.trim(), serverPort: Number(frpServerPort) || 7e3 }
      }));
    } catch (err) {
      setFrpTest({ ok: false, error: err.message });
    } finally {
      setFrpTesting(false);
    }
  };
  (0, import_react2.useEffect)(() => {
    if (!status) return;
    const detect2 = status.detect;
    if (detect2?.tunnels?.length) setNamedTunnelName((v) => v || detect2.tunnels[0].name);
    if (status.namedConfig) {
      const c = status.namedConfig;
      if (c.url) setNamedUrl((v) => v || c.url);
    }
    if (status.frpConfig) {
      const c = status.frpConfig;
      if (c.serverAddr) setFrpServerAddr((v) => v || c.serverAddr);
      if (c.serverPort) setFrpServerPort((v) => v || String(c.serverPort));
    }
  }, [status]);
  const lanUrl = status?.lanUrl;
  const tunnelUrl = status?.tunnelUrl;
  const tunnelPhase = tunnelState?.phase ?? "idle";
  const tunnelStarting = ["downloading", "starting", "registering"].includes(tunnelPhase);
  const tunnelStateDetail = tunnelState?.detail ?? "";
  const tunnelStateStarted = tunnelState?.startedAt ?? null;
  return (0, import_react2.createElement)(
    "div",
    { style: styles.card },
    (0, import_react2.createElement)(
      "div",
      { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 } },
      (0, import_react2.createElement)(
        "div",
        null,
        (0, import_react2.createElement)("strong", null, "\u{1F4F1} wdx Pocket \xB7 \u624B\u673A\u8BBF\u95EE | wdx Pocket \xB7 Phone access"),
        (0, import_react2.createElement)("div", { style: styles.muted }, "\u624B\u673A\u626B\u7801\u6253\u5F00\u7684\u5C31\u662F\u7535\u8111\u4E0A\u7684\u8FD9\u4E2A\u754C\u9762\uFF0C\u5B9E\u65F6\u540C\u6B65 | the phone shows this exact screen, live")
      ),
      (0, import_react2.createElement)(
        "div",
        { style: { fontSize: 12, color: "var(--dsw-alias-label-tertiary,#8b93a1)", whiteSpace: "nowrap" } },
        "wdx"
      )
    ),
    // 重启后提示（进程在后台运行，停止方法）——左侧蓝色色条
    restartNotice ? (0, import_react2.createElement)(
      "div",
      { style: { ...styles.block, borderLeft: "4px solid var(--dsw-alias-brand-primary,#4f6ef7)", borderRadius: 8, background: "var(--dsw-alias-bg-layer-2,#f3f4f6)", padding: "10px 12px" } },
      (0, import_react2.createElement)(
        "div",
        { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 } },
        (0, import_react2.createElement)("div", { style: { fontWeight: 600, fontSize: 13 } }, "\u{1F504} \u5DF2\u91CD\u542F | Restarted"),
        (0, import_react2.createElement)("button", { style: styles.btn, onClick: () => setRestartNotice(false) }, "\u77E5\u9053\u4E86 | OK")
      ),
      (0, import_react2.createElement)("div", { style: styles.muted, marginTop: 4, wordBreak: "break-all" }, `\u8FDB\u7A0B\u5728\u540E\u53F0\u8FD0\u884C\uFF08\u4E0D\u6302\u7EC8\u7AEF\uFF09\u3002\u5982\u9700\u505C\u6B62\uFF1A${status?.killHint ?? `lsof -ti :${status?.dshPort ?? 3080} | xargs kill -9`}`)
    ) : null,
    // 更新提示——左侧黄色色条（提示有新版本）；单状态：有更新/更新中/已更新自动重启，不并存
    updateInfo ? (0, import_react2.createElement)(
      "div",
      { style: { ...styles.block, borderLeft: "4px solid var(--dsw-alias-state-warn-primary,#b45309)", borderRadius: 8, background: "var(--dsw-alias-bg-layer-2,#f3f4f6)", padding: "10px 12px" } },
      (0, import_react2.createElement)(
        "div",
        { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 } },
        (0, import_react2.createElement)(
          "div",
          { style: { fontWeight: 600, fontSize: 13 } },
          updateInfo.updated ? `\u2705 \u5DF2\u66F4\u65B0 v${updateInfo.current}\uFF0C\u91CD\u542F\u751F\u6548 | Updated \u2014 restart to apply` : updateInfo.result === "ok" ? updateInfo.autoRestart ? `\u2705 \u5DF2\u66F4\u65B0 v${updateInfo.latest}\uFF0C\u6B63\u5728\u81EA\u52A8\u91CD\u542F\u2026 | updated \u2014 restarting\u2026` : `\u2705 \u5DF2\u66F4\u65B0 v${updateInfo.latest} | Updated` : `\u{1F4E6} \u65B0\u7248\u672C v${updateInfo.latest} | Update available`
        ),
        updateInfo.result !== "ok" ? (0, import_react2.createElement)("button", { style: styles.primary, onClick: runUpdate, disabled: updateInfo.updating }, updateInfo.updating ? "\u66F4\u65B0\u4E2D\u2026" : `\u66F4\u65B0\u5230 v${updateInfo.latest} | Update`) : updateInfo.autoRestart ? (0, import_react2.createElement)("button", { style: styles.btn, disabled: true }, "\u6B63\u5728\u91CD\u542F\u751F\u6548\u2026 | restarting\u2026") : (0, import_react2.createElement)("button", { style: styles.primary, onClick: restartPocket, disabled: updateInfo.restarting }, updateInfo.restarting ? "\u91CD\u542F\u4E2D\u2026" : "\u{1F504} \u91CD\u542F dsh web \u751F\u6548 | Restart now")
      ),
      (0, import_react2.createElement)(
        "div",
        { style: styles.muted, marginTop: 4 },
        updateInfo.result === "ok" ? updateInfo.autoRestart ? "\u2705 \u5DF2\u66F4\u65B0\uFF0C\u6B63\u5728\u81EA\u52A8\u91CD\u542F\u751F\u6548\uFF0C\u8BF7\u7A0D\u5019\u5237\u65B0 | updated \u2014 restarting automatically, refresh shortly" : "\u2705 \u5DF2\u66F4\u65B0\uFF0C\u91CD\u542F dsh web \u751F\u6548 | updated \u2014 restart dsh web" : updateInfo.result === "fail" ? `\u274C \u5931\u8D25\uFF1A${updateInfo.output || "\u672A\u77E5"}\uFF08\u624B\u52A8\u66F4\u65B0\uFF1Adsh plugin --profile web update dsh-wdx-pocket --latest -w\uFF09` : `\u5F53\u524D v${updateInfo.current} \u2192 \u6700\u65B0 v${updateInfo.latest}`
      )
    ) : null,
    // 局域网
    (0, import_react2.createElement)(
      "div",
      { style: styles.block },
      (0, import_react2.createElement)("div", { style: { fontWeight: 600, fontSize: 13 } }, "\u{1F4F6} \u5C40\u57DF\u7F51\uFF08\u540C\u4E00 WiFi\uFF09| LAN"),
      lanUrl ? (0, import_react2.createElement)(
        "div",
        null,
        (0, import_react2.createElement)("img", { src: status.lanQr, alt: "LAN QR", style: styles.qr }),
        (0, import_react2.createElement)("div", { style: styles.code }, lanUrl),
        (0, import_react2.createElement)("div", { style: styles.muted }, "\u624B\u673A\u8FDE\u63A5\u540C\u4E00 WiFi \u540E\u626B\u7801\u5373\u53EF\u6253\u5F00")
      ) : (0, import_react2.createElement)("div", { style: styles.muted }, "\u4EE3\u7406\u672A\u5C31\u7EEA\u2026 | proxy starting\u2026")
    ),
    // 公网（三模式：快速隧道 / 命名隧道 / frp，设置页可切换）
    (0, import_react2.createElement)(
      "div",
      { style: styles.block },
      (0, import_react2.createElement)("div", { style: { fontWeight: 600, fontSize: 13 } }, "\u{1F310} \u516C\u7F51\uFF08\u4EBA\u5728\u5916\u9762\uFF09| Anywhere"),
      tunnelUrl ? (0, import_react2.createElement)(
        "div",
        null,
        (0, import_react2.createElement)("img", { src: status.tunnelQr, alt: "Tunnel QR", style: styles.qr }),
        (0, import_react2.createElement)("div", { style: styles.code }, tunnelUrl),
        (0, import_react2.createElement)(
          "div",
          { style: styles.muted },
          `\u5F53\u524D\u65B9\u5F0F\uFF1A${POCKET_TUNNEL_MODE_LABELS[status.tunnelMode ?? "quick"] ?? status.tunnelMode ?? "quick"} \xB7 ` + (status.tunnelMode === "quick" ? "URL \u6BCF\u6B21\u91CD\u542F\u81EA\u52A8\u6362\u65B0" : "URL \u56FA\u5B9A\uFF0C\u8BF7\u52FF\u516C\u5F00")
        ),
        (0, import_react2.createElement)("div", { style: styles.warn, marginTop: 4 }, "\u{1F511} \u94FE\u63A5\u5DF2\u6CC4\u9732\uFF1F\u5FEB\u901F\u96A7\u9053\u91CD\u542F\u5373\u6362\u65B0\uFF1B\u547D\u540D/frp \u6A21\u5F0F URL \u56FA\u5B9A\uFF0C\u8BF7\u4FDD\u6301\u79C1\u5BC6 | URL leaked? Restart to rotate quick-tunnel URLs; named/frp URLs are fixed \u2014 keep them private"),
        (0, import_react2.createElement)("button", { style: styles.btn, onClick: stopTunnel }, "\u5173\u95ED\u516C\u7F51 | Stop")
      ) : (0, import_react2.createElement)(
        "div",
        null,
        (0, import_react2.createElement)(
          "div",
          { style: styles.muted },
          "\u539F\u7406\uFF1A\u4F60\u7684\u7535\u8111\u6CA1\u6709\u516C\u7F51 IP\uFF0C\u624B\u673A\u5728\u5916\u9762\u8FDE\u4E0D\u4E0A\u3002\u7A7F\u900F = \u627E\u4E00\u4E2A\u300C\u4E2D\u8F6C\u7AD9\u300D\uFF1A\u7535\u8111\u4E3B\u52A8\u8FDE\u4E0A\u5B83\uFF0C\u624B\u673A\u8BBF\u95EE\u5B83\uFF0C\u5B83\u628A\u8BF7\u6C42\u8F6C\u7ED9\u4F60\u7535\u8111\u3002\u9009\u4E00\u6761\u8DEF\u5373\u53EF\uFF1A| How it works: your PC has no public IP \u2014 pick a relay route:"
        ),
        // 路线卡片（自己选，不做推荐）
        (0, import_react2.createElement)(
          "div",
          { style: { ...styles.routeCard, ...route === "quick" ? styles.routeCardActive : {} }, onClick: () => setRoute("quick") },
          (0, import_react2.createElement)("div", { style: { fontWeight: 600, fontSize: 13 } }, "\u{1F680} \u5FEB\u901F\u96A7\u9053 | Quick tunnel"),
          (0, import_react2.createElement)("div", { style: styles.muted, marginTop: 2 }, "\u4EC0\u4E48\u90FD\u4E0D\u7528\u51C6\u5907\uFF0C\u70B9\u5F00\u542F\u5C31\u80FD\u7528\uFF1B\u7F3A\u70B9\uFF1A\u56FD\u5185\u7F51\u7EDC\u53EF\u80FD\u6253\u4E0D\u5F00 | zero setup; may be blocked in mainland China")
        ),
        (0, import_react2.createElement)(
          "div",
          { style: { ...styles.routeCard, ...route === "named" ? styles.routeCardActive : {} }, onClick: () => setRoute("named") },
          (0, import_react2.createElement)("div", { style: { fontWeight: 600, fontSize: 13 } }, "\u{1F310} Cloudflare \u96A7\u9053 | Named tunnel"),
          (0, import_react2.createElement)("div", { style: styles.muted, marginTop: 2 }, "\u7528\u81EA\u5DF1\u7684\u57DF\u540D\u8D70 Cloudflare \u514D\u8D39\u4E2D\u8F6C\uFF1B\u56FD\u5185\u80FD\u4E0D\u80FD\u901A\u770B\u8FD0\u6C14 | your own domain via Cloudflare; China access not guaranteed")
        ),
        (0, import_react2.createElement)(
          "div",
          { style: { ...styles.routeCard, ...route === "frp" ? styles.routeCardActive : {} }, onClick: () => setRoute("frp") },
          (0, import_react2.createElement)("div", { style: { fontWeight: 600, fontSize: 13 } }, "\u{1F5A5} \u81EA\u5DF1\u7684\u670D\u52A1\u5668 | Your server"),
          (0, import_react2.createElement)("div", { style: styles.muted, marginTop: 2 }, "\u6700\u7A33\uFF0C\u56FD\u5185\u5168\u94FE\u8DEF\u76F4\u8FDE\uFF1B\u9700\u8981\u4E00\u53F0\u6709\u516C\u7F51 IP \u7684\u670D\u52A1\u5668\uFF08\u51E0\u5341\u5757/\u5E74\u90A3\u79CD\u5C31\u884C\uFF09| most stable; needs a cheap VPS")
        ),
        // ---- 路线内容：快速隧道（0 填写）----
        route === "quick" ? (0, import_react2.createElement)(
          "div",
          { style: { marginTop: 10 } },
          (0, import_react2.createElement)("div", { style: styles.muted }, "\u514D\u8D39\u4E2D\u8F6C\uFF0CURL \u6BCF\u6B21\u5F00\u542F\u81EA\u52A8\u6362\u65B0\uFF08\u9002\u5408\u4E34\u65F6\u7528/\u6D4B\u8BD5\uFF09| free relay, URL rotates each start"),
          (0, import_react2.createElement)("button", { style: { ...styles.primary, marginTop: 10 }, onClick: startTunnel, disabled: busy || tunnelStarting }, busy ? "\u5F00\u542F\u4E2D\u2026" : "\u5F00\u542F\u516C\u7F51\u8BBF\u95EE | Enable")
        ) : null,
        // ---- 路线内容：Cloudflare 隧道（全自动检测，0~1 填写）----
        route === "named" ? (0, import_react2.createElement)(
          "div",
          { style: { marginTop: 10 } },
          (0, import_react2.createElement)("div", { style: styles.label }, "\u81EA\u52A8\u68C0\u6D4B | Auto-detected"),
          (0, import_react2.createElement)(
            "div",
            { style: { marginTop: 4 } },
            (0, import_react2.createElement)(
              "div",
              { style: detect?.hasCloudflared ? styles.checkOk : styles.checkBad },
              `${detect?.hasCloudflared ? "\u2705" : "\u274C"} \u7535\u8111\u5DF2\u5B89\u88C5 cloudflared${detect?.hasCloudflared ? "" : "\uFF08\u5B89\u88C5\uFF1Anpm i -g cloudflared\uFF0C\u6216 winget install cloudflared\uFF09"}`
            ),
            (0, import_react2.createElement)(
              "div",
              { style: { ...detect?.hasCredentials ? styles.checkOk : styles.checkBad, marginTop: 2 } },
              `${detect?.hasCredentials ? "\u2705" : "\u274C"} \u627E\u5230\u547D\u540D\u96A7\u9053${detect?.hasCredentials ? `\uFF1A${detect.tunnels.map((t) => t.name).join("\u3001")}` : "\uFF08\u521B\u5EFA\uFF1Acloudflared tunnel create \u96A7\u9053\u540D\uFF09"}`
            ),
            (0, import_react2.createElement)(
              "div",
              { style: { ...detect?.url ? styles.checkOk : styles.checkBad, marginTop: 2 } },
              `${detect?.url ? "\u2705" : "\u274C"} \u8BC6\u522B\u5230\u4F60\u7684\u57DF\u540D${detect?.url ? `\uFF1A${detect.url}` : "\uFF08\u5373\u7ED1\u5B9A\u5728\u96A7\u9053\u4E0A\u7684\u57DF\u540D\uFF0CCloudflare \u9762\u677F DNS \u91CC\u80FD\u770B\u5230\uFF09"}`
            )
          ),
          detect?.url ? null : (0, import_react2.createElement)(
            "div",
            { style: { marginTop: 8 } },
            (0, import_react2.createElement)("div", { style: styles.label }, "\u4F60\u7684\u57DF\u540D\uFF08\u4E8C\u7EF4\u7801\u5185\u5BB9\uFF09| Your domain"),
            (0, import_react2.createElement)("input", { style: styles.input, value: namedUrl, onChange: (e) => setNamedUrl(e.target.value), placeholder: "https://live.example.com" })
          ),
          (0, import_react2.createElement)("div", { style: styles.muted, marginTop: 6 }, "\u4EE5\u4E0A\u5168\u90E8\u81EA\u52A8\u8BC6\u522B\uFF08\u53EA\u8BFB\u4F60\u7684 cloudflared \u914D\u7F6E\uFF0C\u7EDD\u4E0D\u4FEE\u6539\uFF09| all auto-detected, read-only"),
          (0, import_react2.createElement)("button", { style: { ...styles.primary, marginTop: 10 }, onClick: startTunnel, disabled: busy || tunnelStarting || !(detect?.hasCredentials || namedUrl.trim()) }, busy ? "\u5F00\u542F\u4E2D\u2026" : "\u5F00\u542F\u516C\u7F51\u8BBF\u95EE | Enable")
        ) : null,
        // ---- 路线内容：自己的服务器（填 1 个 IP + 一键生成服务器配置）----
        route === "frp" ? (0, import_react2.createElement)(
          "div",
          { style: { marginTop: 10 } },
          (0, import_react2.createElement)("div", { style: styles.label }, "\u670D\u52A1\u5668 IP\uFF08\u5FC5\u586B\uFF09| Server IP"),
          (0, import_react2.createElement)("input", { style: styles.input, value: frpServerAddr, onChange: (e) => setFrpServerAddr(e.target.value), placeholder: "123.45.67.89" }),
          (0, import_react2.createElement)("div", { style: styles.muted, marginTop: 4 }, "\u5C31\u662F\u4F60\u4E91\u670D\u52A1\u5668\u63A7\u5236\u53F0\u663E\u793A\u7684\u300C\u516C\u7F51 IP\u300D\uFF08\u4E70\u670D\u52A1\u5668\u90A3\u5BB6\u7684\u63A7\u5236\u53F0\u91CC\u80FD\u770B\u5230\uFF09| the public IP shown in your cloud console"),
          (0, import_react2.createElement)(
            "div",
            { style: { marginTop: 8 } },
            frpGen ? (0, import_react2.createElement)(
              "div",
              null,
              (0, import_react2.createElement)("div", { style: styles.label }, "\u2460 \u628A\u4E0B\u9762\u5185\u5BB9\u4FDD\u5B58\u5230\u670D\u52A1\u5668\uFF08\u6587\u4EF6\u540D frps.toml\uFF09| save on your server as frps.toml"),
              (0, import_react2.createElement)("pre", { style: { ...styles.code, background: "var(--dsw-alias-bg-layer-2,#f3f4f6)", padding: 8, borderRadius: 8, whiteSpace: "pre-wrap", maxHeight: 160, overflow: "auto", marginTop: 4 } }, frpGen.toml),
              (0, import_react2.createElement)("div", { style: { ...styles.label, marginTop: 8 } }, "\u2461 \u5728\u670D\u52A1\u5668\u4E0A\u8FD0\u884C\uFF08\u670D\u52A1\u5668\u9700\u88C5\u6709 frps\uFF1B\u4E0B\u8F7D frp \u89E3\u538B\u5373\u5F97\uFF09| run on your server"),
              (0, import_react2.createElement)("div", { style: styles.code }, frpGen.command),
              (0, import_react2.createElement)("div", { style: styles.muted, marginTop: 4 }, "token \u5DF2\u81EA\u52A8\u914D\u5BF9\uFF0C\u672C\u673A\u65E0\u9700\u586B\u5199 | token auto-paired, nothing to fill here")
            ) : (0, import_react2.createElement)("button", { style: styles.btn, onClick: genFrps }, "\u2460 \u751F\u6210\u670D\u52A1\u5668\u914D\u7F6E | Generate server config")
          ),
          (0, import_react2.createElement)(
            "div",
            { style: { marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" } },
            (0, import_react2.createElement)("button", { style: styles.btn, onClick: testFrp, disabled: frpTesting || !frpServerAddr.trim() }, frpTesting ? "\u6D4B\u8BD5\u4E2D\u2026" : "\u2461 \u6D4B\u8BD5\u8FDE\u63A5 | Test"),
            (0, import_react2.createElement)("button", { style: styles.primary, onClick: startTunnel, disabled: busy || tunnelStarting || !frpServerAddr.trim() }, busy ? "\u5F00\u542F\u4E2D\u2026" : "\u2462 \u5F00\u542F\u516C\u7F51\u8BBF\u95EE | Enable")
          ),
          frpTest ? (0, import_react2.createElement)(
            "div",
            { style: { marginTop: 6, fontSize: 12, color: frpTest.ok ? "var(--dsw-alias-state-success-primary,#16a34a)" : "var(--dsw-alias-state-error-primary,#dc2626)" } },
            frpTest.ok ? "\u2705 \u670D\u52A1\u5668\u8FDE\u63A5\u6210\u529F\uFF0C\u53EF\u4EE5\u5F00\u542F\u4E86" : `\u274C ${frpTest.error}`
          ) : null
        ) : null,
        tunnelStarting ? (0, import_react2.createElement)(
          "div",
          { style: { marginTop: 8, fontSize: 12, color: "var(--dsw-alias-label-secondary,#6b7280)" } },
          `\u23F3 ${tunnelStateDetail}\uFF08\u5DF2\u7B49\u5F85 ${Math.floor((Date.now() - (tunnelStateStarted || Date.now())) / 1e3)} \u79D2\uFF09\u2026`
        ) : tunnelPhase === "error" ? (0, import_react2.createElement)(
          "div",
          { style: { marginTop: 8, fontSize: 12, color: "var(--dsw-alias-state-error-primary,#dc2626)" } },
          `\u274C \u5F00\u542F\u5931\u8D25\uFF1A${tunnelStateDetail || "\u672A\u77E5\u9519\u8BEF | failed"}\uFF08\u53EF\u91CD\u8BD5\uFF1B\u82E5\u662F\u4EE3\u7406/VPN \u95EE\u9898\u89C1 README \u6392\u969C\uFF09`
        ) : (0, import_react2.createElement)(
          "div",
          null,
          (0, import_react2.createElement)("div", { style: styles.warn, marginTop: 8 }, "\u26A0\uFE0F DSH \u80FD\u6267\u884C\u7535\u8111\u4EE3\u7801\uFF1A\u4E8C\u7EF4\u7801/URL \u5C31\u662F\u94A5\u5319\uFF0C\u8BF7\u52FF\u53D1\u7ED9\u522B\u4EBA | the QR/URL is the key \u2014 never share it"),
          (0, import_react2.createElement)("div", { style: styles.muted, marginTop: 4 }, "\u5FEB\u901F\u96A7\u9053\u91CD\u542F\u5373\u6362\u65B0\uFF1B\u547D\u540D/frp \u6A21\u5F0F URL \u56FA\u5B9A\uFF0C\u6CC4\u9732\u540E\u8BF7\u5C3D\u5FEB\u5904\u7406 | Quick URLs rotate on restart; named/frp URLs are fixed \u2014 act fast if leaked")
        )
      )
    ),
    error ? (0, import_react2.createElement)("div", { style: { color: "var(--dsw-alias-state-error-primary,#dc2626)", fontSize: 12, marginTop: 8 } }, `\u274C ${error}`) : null,
    // 页面最底部：反馈入口
    (0, import_react2.createElement)(
      "div",
      { style: { ...styles.block, textAlign: "center" } },
      (0, import_react2.createElement)(
        "a",
        { href: "https://github.com/wudexiong/wdx-dsh-plugins/issues", target: "_blank", rel: "noreferrer", style: { fontSize: 12, color: "var(--dsw-alias-label-secondary,#6b7280)", textDecoration: "none" } },
        "\u6709\u95EE\u9898\uFF1F\u6B22\u8FCE\u5230 GitHub Issues \u53CD\u9988 \u{1F64F} | Questions? Open an issue on GitHub"
      )
    )
  );
}
function apply(ctx) {
  mobileApply(ctx);
  const rpcCall = (endpoint, payload, signal) => ctx.connection.rpc.call(POCKET_RPC_CHANNEL, endpoint, payload, signal);
  ctx.slots.inject(
    "settings.section",
    () => ctx.slots.register(
      {
        name: "settings.section",
        id: "pocket",
        order: 1,
        label: () => "\u624B\u673A\u8BBF\u95EE",
        inject: () => ({ rpcCall })
      },
      PocketSettingsTab
    )
  );
}

    return module.exports;
  }
});
