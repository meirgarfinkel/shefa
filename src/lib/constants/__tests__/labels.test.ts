import { describe, it, expect } from "vitest";
import { dayOfWeekEnum, jobTypeEnum, workArrangementEnum } from "@/db/schema/enums";
import { DAY_LABELS, DAY_ORDER, JOB_TYPE_LABELS, ARRANGEMENT_LABELS } from "@/lib/constants/labels";

describe("label maps", () => {
  it("uses the canonical job-type values", () => {
    expect(JOB_TYPE_LABELS).toEqual({
      FULL_TIME: "Full-time",
      PART_TIME: "Part-time",
      EITHER: "Full or part-time",
    });
  });

  it("uses the canonical arrangement values", () => {
    expect(ARRANGEMENT_LABELS).toEqual({
      ON_SITE: "On-site",
      REMOTE: "Remote",
      HYBRID: "Hybrid",
    });
  });

  it("DAY_ORDER matches the day enum order", () => {
    expect(DAY_ORDER).toEqual([...dayOfWeekEnum.enumValues]);
  });

  // Completeness guards: a future enum addition that forgets a label fails here.
  it("has a label for every day", () => {
    for (const day of dayOfWeekEnum.enumValues) {
      expect(DAY_LABELS[day]).toBeTruthy();
    }
  });

  it("has a label for every job type", () => {
    for (const type of jobTypeEnum.enumValues) {
      expect(JOB_TYPE_LABELS[type]).toBeTruthy();
    }
  });

  it("has a label for every work arrangement", () => {
    for (const arrangement of workArrangementEnum.enumValues) {
      expect(ARRANGEMENT_LABELS[arrangement]).toBeTruthy();
    }
  });
});
