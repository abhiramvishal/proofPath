import { attachCapture, initCapture } from "./capture";

const SUBMISSION_ID_KEY = "proofpath_submission_id";

// Word Online renders in an iframe with the canvas editor. We wait for the
// main editing surface to appear before attaching capture.
const WORD_EDITOR_SELECTORS = [
  ".WACViewPanel",       // Word Online view panel
  ".canvasWrapper",      // canvas-based editor
  "#WACViewPanel_EditingElement", // editing element in newer builds
  "[contenteditable]",   // fallback for OXML-backed editables
];

function findEditorRoot(): Element | null {
  for (const selector of WORD_EDITOR_SELECTORS) {
    const el = document.querySelector(selector);
    if (el) return el;
  }
  return null;
}

function tryAttach(submissionId: string, attempts = 0): void {
  const root = findEditorRoot();
  if (root) {
    initCapture({ submissionId });
    // Word Online uses pointer events on the canvas rather than keyboard events
    // directly on the editor — attach at document level so we catch all paths.
    attachCapture(document);
    console.info("[ProofPath] Word Online capture active on", root.tagName);
    return;
  }

  if (attempts < 20) {
    setTimeout(() => tryAttach(submissionId, attempts + 1), 500);
  } else {
    // Last resort: attach at document level even without editor confirmation
    initCapture({ submissionId });
    attachCapture(document);
    console.warn("[ProofPath] Word Online editor not found — attached at document level");
  }
}

chrome.storage.local.get(SUBMISSION_ID_KEY, (data) => {
  const submissionId = (data[SUBMISSION_ID_KEY] as string) || "extension-pending";
  // Word Online loads the editor asynchronously; wait for it.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => tryAttach(submissionId));
  } else {
    tryAttach(submissionId);
  }
});
