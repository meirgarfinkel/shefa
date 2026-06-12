// Canonical display-label maps for enum values used across the UI.
// Keyed by enum string value; indexed with a `?? value` fallback at call sites,
// so the loose `Record<string, string>` typing is intentional.

export const DAY_LABELS: Record<string, string> = {
  SUN: "Sun",
  MON: "Mon",
  TUE: "Tue",
  WED: "Wed",
  THU: "Thu",
  FRI: "Fri",
  SAT: "Sat",
};

// Sun → Sat ordering, used to sort work-day lists before display.
export const DAY_ORDER = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  EITHER: "Full or part-time",
};

export const ARRANGEMENT_LABELS: Record<string, string> = {
  ON_SITE: "On-site",
  REMOTE: "Remote",
  HYBRID: "Hybrid",
};

export const FEEDBACK_CATEGORY_LABELS: Record<string, string> = {
  BUG: "Bug report",
  IMPROVEMENT: "Suggestion",
  THANKS: "Thanks",
  OTHER: "Other",
};

export const FEEDBACK_STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  REVIEWED: "Reviewed",
  RESOLVED: "Resolved",
};
