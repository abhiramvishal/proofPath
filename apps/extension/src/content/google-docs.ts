import { attachCapture, initCapture } from "./capture";

const SUBMISSION_ID_KEY = "proofpath_submission_id";

chrome.storage.local.get(SUBMISSION_ID_KEY, (data) => {
  const submissionId = (data[SUBMISSION_ID_KEY] as string) || "extension-pending";
  initCapture({ submissionId });
  attachCapture(document);
  console.info("[ProofPath] Google Docs capture active");
});
