import {
  BEHAVIOURAL_SIGNALS,
  type BehaviouralSignal,
  type WritingEvent,
} from "@proofpath/types";

export type SignalScores = Record<BehaviouralSignal, number>;

const DEFAULT_WEIGHTS: Record<BehaviouralSignal, number> = Object.fromEntries(
  BEHAVIOURAL_SIGNALS.map((s: BehaviouralSignal) => [s, 1 / BEHAVIOURAL_SIGNALS.length])
) as Record<BehaviouralSignal, number>;

export interface ExtractorContext {
  events: WritingEvent[];
  word_count: number;
  session_ids: string[];
}

function clamp(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function groupBySession(events: WritingEvent[]): Map<string, WritingEvent[]> {
  const map = new Map<string, WritingEvent[]>();
  for (const e of events) {
    const sid = (e as WritingEvent & { session_id?: string }).session_id ?? "default";
    const list = map.get(sid) ?? [];
    list.push(e);
    map.set(sid, list);
  }
  return map;
}

function extractTypingSpeedConsistency(events: WritingEvent[]): number {
  const keystrokes = events.filter((e) => e.type === "keystroke");
  if (keystrokes.length < 10) return 50;
  const intervals: number[] = [];
  for (let i = 1; i < keystrokes.length; i++) {
    const gap = keystrokes[i].ts - keystrokes[i - 1].ts;
    if (gap > 0 && gap < 5000) intervals.push(gap);
  }
  if (!intervals.length) return 50;
  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const variance = intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / intervals.length;
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;
  return clamp(100 - cv * 50);
}

function extractPasteRatio(events: WritingEvent[], wordCount: number): number {
  const pastes = events.filter((e) => e.type === "paste");
  const pastedChars = pastes.reduce(
    (sum, e) => sum + ((e.payload.length as number) ?? 0),
    0
  );
  const ratio = wordCount > 0 ? pastedChars / (wordCount * 5) : 0;
  return clamp(100 - ratio * 100);
}

function extractAiInsertionRatio(events: WritingEvent[]): number {
  const inserts = events.filter((e) => e.type === "ai_insert");
  const offered = inserts.reduce(
    (sum, e) => sum + ((e.payload.chars_offered as number) ?? 0),
    0
  );
  const inserted = inserts.reduce(
    (sum, e) => sum + ((e.payload.chars_inserted as number) ?? 0),
    0
  );
  if (offered === 0) return 100;
  return clamp((inserted / offered) * 100);
}

function extractPauseBeforeContent(events: WritingEvent[]): number {
  const pauses = events.filter((e) => e.type === "pause");
  const meaningful = pauses.filter(
    (e) => ((e.payload.duration_ms as number) ?? 0) >= 3000
  );
  if (!meaningful.length) return 70;
  const before = meaningful.filter((p) => ((p.payload.position as number) ?? 0) > 0).length;
  return clamp(50 + (before / meaningful.length) * 50);
}

function extractSessionEntropy(events: WritingEvent[]): number {
  const sessions = groupBySession(events);
  if (sessions.size <= 1) return 60;
  const counts = [...sessions.values()].map((s) => s.length);
  const total = counts.reduce((a, b) => a + b, 0);
  if (!total) return 50;
  let entropy = 0;
  for (const c of counts) {
    const p = c / total;
    if (p > 0) entropy -= p * Math.log2(p);
  }
  const maxE = Math.log2(sessions.size);
  return clamp(40 + (entropy / maxE) * 60);
}

function extractEditDirectionality(events: WritingEvent[]): number {
  const positions = events
    .filter((e) => e.type === "keystroke" && e.payload.position != null)
    .map((e) => e.payload.position as number);
  if (positions.length < 5) return 68;
  let backward = 0;
  for (let i = 1; i < positions.length; i++) {
    if (positions[i] < positions[i - 1]) backward++;
  }
  return clamp(50 + (1 - backward / (positions.length - 1)) * 50);
}

function extractBurstPauseRegularity(events: WritingEvent[]): number {
  const keystrokes = events
    .filter((e) => e.type === "keystroke")
    .sort((a, b) => a.ts - b.ts);
  if (keystrokes.length < 15) return 72;
  const bursts: number[] = [];
  let burst = 0;
  for (let i = 1; i < keystrokes.length; i++) {
    if (keystrokes[i].ts - keystrokes[i - 1].ts < 500) burst++;
    else if (burst > 0) {
      bursts.push(burst);
      burst = 0;
    }
  }
  if (bursts.length < 3) return 72;
  const mean = bursts.reduce((a, b) => a + b, 0) / bursts.length;
  const variance = bursts.reduce((a, b) => a + (b - mean) ** 2, 0) / bursts.length;
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;
  return clamp(100 - cv * 40);
}

function extractCrossSessionConsistency(events: WritingEvent[]): number {
  const sessions = groupBySession(events);
  if (sessions.size <= 1) return 75;
  const speeds: number[] = [];
  for (const sess of sessions.values()) {
    const ks = sess.filter((e) => e.type === "keystroke").sort((a, b) => a.ts - b.ts);
    if (ks.length < 5) continue;
    const intervals: number[] = [];
    for (let i = 1; i < ks.length; i++) {
      const g = ks[i].ts - ks[i - 1].ts;
      if (g > 0 && g < 5000) intervals.push(g);
    }
    if (intervals.length) speeds.push(intervals.reduce((a, b) => a + b, 0) / intervals.length);
  }
  if (speeds.length < 2) return 75;
  const mean = speeds.reduce((a, b) => a + b, 0) / speeds.length;
  const variance = speeds.reduce((a, b) => a + (b - mean) ** 2, 0) / speeds.length;
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
  return clamp(100 - cv * 60);
}

function extractAiQueryComplexity(events: WritingEvent[]): number {
  const queries = events.filter((e) => e.type === "ai_query");
  if (!queries.length) return 85;
  const avg =
    queries.reduce((s, e) => s + ((e.payload.query_length as number) ?? 0), 0) /
    queries.length;
  if (avg < 30) return 90;
  if (avg < 100) return 75;
  return clamp(100 - (avg - 100) / 5);
}

function extractFirstSessionVolume(events: WritingEvent[], wordCount: number): number {
  const sessions = groupBySession(events);
  if (!sessions.size || !wordCount) return 70;
  const first = [...sessions.entries()].sort(
    (a, b) => Math.min(...a[1].map((e) => e.ts)) - Math.min(...b[1].map((e) => e.ts))
  )[0][1];
  const firstKs = first.filter((e) => e.type === "keystroke").length;
  const totalKs = events.filter((e) => e.type === "keystroke").length;
  if (!totalKs) return 70;
  const ratio = firstKs / totalKs;
  if (ratio > 0.85) return clamp(100 - ratio * 50);
  return clamp(60 + (1 - ratio) * 40);
}

function extractDeletionPattern(events: WritingEvent[]): number {
  const deletes = events.filter((e) => e.type === "delete");
  if (!deletes.length) return 80;
  const large = deletes.filter((d) => ((d.payload.chars_deleted as number) ?? 0) > 50).length;
  return clamp(100 - (large / deletes.length) * 80);
}

function extractThinkingPauseDistribution(events: WritingEvent[]): number {
  const pauses = events.filter((e) => e.type === "pause");
  const long = pauses.filter((p) => ((p.payload.duration_ms as number) ?? 0) >= 10000);
  if (!pauses.length) return 65;
  return clamp(50 + (long.length / pauses.length) * 50);
}

function extractTimeToFirstWord(events: WritingEvent[]): number {
  if (!events.length) return 75;
  const sessionStarts = new Map<string, number>();
  for (const e of events) {
    const sid = (e as WritingEvent & { session_id?: string }).session_id ?? "default";
    const cur = sessionStarts.get(sid);
    if (cur === undefined || e.ts < cur) sessionStarts.set(sid, e.ts);
  }
  const gaps: number[] = [];
  for (const e of events) {
    if (e.type === "keystroke") {
      const sid = (e as WritingEvent & { session_id?: string }).session_id ?? "default";
      gaps.push(e.ts - (sessionStarts.get(sid) ?? e.ts));
    }
  }
  if (!gaps.length) return 75;
  const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  if (avg > 120_000) return 35;
  if (avg > 30_000) return 55;
  return clamp(100 - avg / 2000);
}

function extractRevisionDepth(events: WritingEvent[]): number {
  const deletes = events.filter((e) => e.type === "delete").length;
  const keystrokes = events.filter((e) => e.type === "keystroke").length;
  if (!keystrokes) return 65;
  return clamp(100 - (deletes / keystrokes) * 200);
}

export function extractSignals(ctx: ExtractorContext): SignalScores {
  const { events, word_count } = ctx;

  return {
    typing_speed_consistency: extractTypingSpeedConsistency(events),
    pause_before_content_ratio: extractPauseBeforeContent(events),
    revision_depth_score: extractRevisionDepth(events),
    paste_to_original_ratio: extractPasteRatio(events, word_count),
    session_distribution_entropy: extractSessionEntropy(events),
    edit_directionality: extractEditDirectionality(events),
    burst_pause_regularity: extractBurstPauseRegularity(events),
    cross_session_consistency: extractCrossSessionConsistency(events),
    ai_insertion_ratio: extractAiInsertionRatio(events),
    ai_query_complexity: extractAiQueryComplexity(events),
    first_session_volume: extractFirstSessionVolume(events, word_count),
    deletion_pattern: extractDeletionPattern(events),
    thinking_pause_distribution: extractThinkingPauseDistribution(events),
    time_to_first_word: extractTimeToFirstWord(events),
  };
}

export function computeAuthenticityScore(
  signals: SignalScores,
  weights: Record<BehaviouralSignal, number> = DEFAULT_WEIGHTS
): number {
  let total = 0;
  let weightSum = 0;
  for (const key of BEHAVIOURAL_SIGNALS) {
    const w = weights[key] ?? 0;
    total += (signals[key] ?? 50) * w;
    weightSum += w;
  }
  return clamp(weightSum > 0 ? total / weightSum : 50);
}

export function triageFromScore(score: number): "green" | "amber" | "red" {
  if (score >= 70) return "green";
  if (score >= 40) return "amber";
  return "red";
}
