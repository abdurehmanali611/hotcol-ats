/** Forward hiring pipeline (excludes rejected / withdrawn). */
export const ATS_FORWARD_PIPELINE = [
  "applied",
  "screening",
  "interview",
  "offer",
  "offer_accepted",
] as const;

export type AtsForwardStatus = (typeof ATS_FORWARD_PIPELINE)[number];

export const ATS_APPLICATION_STATUSES = [
  ...ATS_FORWARD_PIPELINE,
  "rejected",
  "withdrawn",
] as const;

export type AtsApplicationStatus = (typeof ATS_APPLICATION_STATUSES)[number];

export function formatAtsStatusLabel(status: string) {
  return String(status || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function atsForwardIndex(status: string): number {
  return ATS_FORWARD_PIPELINE.indexOf(
    status as AtsForwardStatus,
  );
}

/** Immediate next forward stage, or null if terminal / exit status. */
export function atsNextForwardStatus(status: string): AtsForwardStatus | null {
  const i = atsForwardIndex(status);
  if (i < 0 || i >= ATS_FORWARD_PIPELINE.length - 1) return null;
  return ATS_FORWARD_PIPELINE[i + 1];
}

/** Later forward stages only (for MultiPass radios). */
export function atsForwardTargetsAfter(status: string): AtsForwardStatus[] {
  const i = atsForwardIndex(status);
  if (i < 0) return [];
  return ATS_FORWARD_PIPELINE.slice(i + 1);
}

export function atsCanPassFrom(status: string): boolean {
  return atsNextForwardStatus(status) != null;
}

export function atsCanMultiPassFrom(status: string): boolean {
  return atsForwardTargetsAfter(status).length > 0;
}
