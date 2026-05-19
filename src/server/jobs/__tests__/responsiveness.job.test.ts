import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DbClient } from "@/db";
import { computeResponsivenessScore, runResponsivenessJob } from "../responsiveness.job";

vi.mock("@/db", () => ({ db: {} }));

// ── Helpers ────────────────────────────────────────────────────────────────────

const EMPLOYER_ID = "employer-user-1";
const SEEKER_ID = "seeker-user-1";

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

function hoursFromNow(base: Date, h: number): Date {
  return new Date(base.getTime() + h * 60 * 60 * 1000);
}

/** Build a minimal conversation object for computeResponsivenessScore */
function conv(messages: { senderId: string; createdAt: Date }[]) {
  return { messages };
}

// ── computeResponsivenessScore ─────────────────────────────────────────────────

describe("computeResponsivenessScore", () => {
  // ── Happy path ───────────────────────────────────────────────────────────────

  it("3 scoreable conversations, employer replies to all within 72h → score 1.0, isResponsive true", () => {
    const t0 = hoursAgo(100);
    const t1 = hoursAgo(80);
    const t2 = hoursAgo(60);

    const conversations = [
      conv([
        { senderId: SEEKER_ID, createdAt: t0 },
        { senderId: EMPLOYER_ID, createdAt: hoursFromNow(t0, 24) },
      ]),
      conv([
        { senderId: SEEKER_ID, createdAt: t1 },
        { senderId: EMPLOYER_ID, createdAt: hoursFromNow(t1, 12) },
      ]),
      conv([
        { senderId: SEEKER_ID, createdAt: t2 },
        { senderId: EMPLOYER_ID, createdAt: hoursFromNow(t2, 48) },
      ]),
    ];

    const result = computeResponsivenessScore(EMPLOYER_ID, conversations);

    expect(result.score).toBeCloseTo(1.0);
    expect(result.isResponsive).toBe(true);
    expect(result.scoreableCount).toBe(3);
  });

  it("5 scoreable conversations, employer replies to 4 within 72h → score ~0.8, isResponsive true", () => {
    const conversations = Array.from({ length: 5 }, (_, i) => {
      const t = hoursAgo(200 - i * 20);
      const messages: { senderId: string; createdAt: Date }[] = [
        { senderId: SEEKER_ID, createdAt: t },
      ];
      if (i < 4) {
        // timely reply for first 4
        messages.push({ senderId: EMPLOYER_ID, createdAt: hoursFromNow(t, 10) });
      }
      return conv(messages);
    });

    const result = computeResponsivenessScore(EMPLOYER_ID, conversations);

    expect(result.score).toBeCloseTo(0.8);
    expect(result.isResponsive).toBe(true);
  });

  it("3 scoreable conversations, employer replies to 2 → score ~0.667, isResponsive false (below 70%)", () => {
    const conversations = [
      conv([
        { senderId: SEEKER_ID, createdAt: hoursAgo(100) },
        { senderId: EMPLOYER_ID, createdAt: hoursAgo(90) },
      ]),
      conv([
        { senderId: SEEKER_ID, createdAt: hoursAgo(80) },
        { senderId: EMPLOYER_ID, createdAt: hoursAgo(70) },
      ]),
      conv([
        { senderId: SEEKER_ID, createdAt: hoursAgo(60) }, // no reply
      ]),
    ];

    const result = computeResponsivenessScore(EMPLOYER_ID, conversations);

    expect(result.score).toBeCloseTo(2 / 3);
    expect(result.isResponsive).toBe(false);
  });

  // ── Not enough conversations ─────────────────────────────────────────────────

  it("only 2 scoreable conversations, replies to both → score 1.0 but isResponsive false (< 3 threshold)", () => {
    const conversations = [
      conv([
        { senderId: SEEKER_ID, createdAt: hoursAgo(50) },
        { senderId: EMPLOYER_ID, createdAt: hoursAgo(40) },
      ]),
      conv([
        { senderId: SEEKER_ID, createdAt: hoursAgo(30) },
        { senderId: EMPLOYER_ID, createdAt: hoursAgo(20) },
      ]),
    ];

    const result = computeResponsivenessScore(EMPLOYER_ID, conversations);

    expect(result.score).toBeCloseTo(1.0);
    expect(result.isResponsive).toBe(false);
    expect(result.scoreableCount).toBe(2);
  });

  it("exactly 3 scoreable conversations, replies to all → isResponsive true (at threshold)", () => {
    const conversations = Array.from({ length: 3 }, (_, i) => {
      const t = hoursAgo(100 - i * 10);
      return conv([
        { senderId: SEEKER_ID, createdAt: t },
        { senderId: EMPLOYER_ID, createdAt: hoursFromNow(t, 5) },
      ]);
    });

    const result = computeResponsivenessScore(EMPLOYER_ID, conversations);

    expect(result.isResponsive).toBe(true);
  });

  // ── Zero / no scoreable conversations ───────────────────────────────────────

  it("zero conversations → score null, isResponsive false", () => {
    const result = computeResponsivenessScore(EMPLOYER_ID, []);

    expect(result.score).toBeNull();
    expect(result.isResponsive).toBe(false);
    expect(result.scoreableCount).toBe(0);
  });

  it("conversations where employer sent all messages, no seeker messages → 0 scoreable, score null", () => {
    const conversations = [
      conv([{ senderId: EMPLOYER_ID, createdAt: hoursAgo(50) }]),
      conv([{ senderId: EMPLOYER_ID, createdAt: hoursAgo(30) }]),
    ];

    const result = computeResponsivenessScore(EMPLOYER_ID, conversations);

    expect(result.score).toBeNull();
    expect(result.scoreableCount).toBe(0);
  });

  // ── 72-hour boundary ─────────────────────────────────────────────────────────

  it("employer replies at exactly 72h → counts as timely", () => {
    const t = hoursAgo(200);
    const conversations = Array.from({ length: 3 }, () =>
      conv([
        { senderId: SEEKER_ID, createdAt: t },
        { senderId: EMPLOYER_ID, createdAt: hoursFromNow(t, 72) },
      ]),
    );

    const result = computeResponsivenessScore(EMPLOYER_ID, conversations);

    expect(result.score).toBeCloseTo(1.0);
    expect(result.isResponsive).toBe(true);
  });

  it("employer replies at 72h + 1 minute → does NOT count as timely", () => {
    const t = hoursAgo(200);
    const replyTime = new Date(t.getTime() + 72 * 60 * 60 * 1000 + 60 * 1000); // 72h + 1min

    const conversations = [
      conv([
        { senderId: SEEKER_ID, createdAt: t },
        { senderId: EMPLOYER_ID, createdAt: replyTime },
      ]),
      conv([
        { senderId: SEEKER_ID, createdAt: hoursAgo(50) }, // unreplied
      ]),
      conv([
        { senderId: SEEKER_ID, createdAt: hoursAgo(40) }, // unreplied
      ]),
    ];

    const result = computeResponsivenessScore(EMPLOYER_ID, conversations);

    expect(result.score).toBeCloseTo(0);
    expect(result.isResponsive).toBe(false);
  });

  // ── Median computation ───────────────────────────────────────────────────────

  it("odd number of response times → median is middle value", () => {
    // Response times: 10h, 20h, 30h → median = 20h
    const conversations = [
      conv([
        { senderId: SEEKER_ID, createdAt: hoursAgo(200) },
        { senderId: EMPLOYER_ID, createdAt: hoursAgo(190) }, // 10h response
      ]),
      conv([
        { senderId: SEEKER_ID, createdAt: hoursAgo(100) },
        { senderId: EMPLOYER_ID, createdAt: hoursAgo(80) }, // 20h response
      ]),
      conv([
        { senderId: SEEKER_ID, createdAt: hoursAgo(60) },
        { senderId: EMPLOYER_ID, createdAt: hoursAgo(30) }, // 30h response
      ]),
    ];

    const result = computeResponsivenessScore(EMPLOYER_ID, conversations);

    expect(result.medianResponseHours).toBeCloseTo(20, 0);
  });

  it("even number of response times → median is average of two middle values", () => {
    // Response times: 10h, 20h, 30h, 40h → median = (20+30)/2 = 25h
    const conversations = [
      conv([
        { senderId: SEEKER_ID, createdAt: hoursAgo(200) },
        { senderId: EMPLOYER_ID, createdAt: hoursAgo(190) }, // 10h
      ]),
      conv([
        { senderId: SEEKER_ID, createdAt: hoursAgo(150) },
        { senderId: EMPLOYER_ID, createdAt: hoursAgo(130) }, // 20h
      ]),
      conv([
        { senderId: SEEKER_ID, createdAt: hoursAgo(100) },
        { senderId: EMPLOYER_ID, createdAt: hoursAgo(70) }, // 30h
      ]),
      conv([
        { senderId: SEEKER_ID, createdAt: hoursAgo(80) },
        { senderId: EMPLOYER_ID, createdAt: hoursAgo(40) }, // 40h
      ]),
    ];

    const result = computeResponsivenessScore(EMPLOYER_ID, conversations);

    expect(result.medianResponseHours).toBeCloseTo(25, 0);
  });

  it("no replies at all → medianResponseHours is null", () => {
    const conversations = Array.from({ length: 3 }, (_, i) =>
      conv([{ senderId: SEEKER_ID, createdAt: hoursAgo(100 - i * 10) }]),
    );

    const result = computeResponsivenessScore(EMPLOYER_ID, conversations);

    expect(result.medianResponseHours).toBeNull();
  });

  it("late replies (>72h) still contribute to median", () => {
    // Only late replies: 100h, 200h → median = 150h
    const conversations = [
      conv([
        { senderId: SEEKER_ID, createdAt: hoursAgo(400) },
        { senderId: EMPLOYER_ID, createdAt: hoursAgo(300) }, // 100h (late)
      ]),
      conv([
        { senderId: SEEKER_ID, createdAt: hoursAgo(300) },
        { senderId: EMPLOYER_ID, createdAt: hoursAgo(100) }, // 200h (late)
      ]),
      conv([{ senderId: SEEKER_ID, createdAt: hoursAgo(50) }]), // unreplied
    ];

    const result = computeResponsivenessScore(EMPLOYER_ID, conversations);

    expect(result.medianResponseHours).toBeCloseTo(150, 0);
    expect(result.score).toBeCloseTo(0); // 0/3 timely
  });

  // ── First-reply semantics ────────────────────────────────────────────────────

  it("employer initiated conversation but seeker replied first → seeker's first message is the trigger", () => {
    const t0 = hoursAgo(200);
    const seekerReply = hoursFromNow(t0, 48); // seeker replies 48h after employer's opening
    const employerResponse = hoursFromNow(seekerReply, 10); // employer responds 10h after seeker

    const conversations = Array.from({ length: 3 }, () =>
      conv([
        { senderId: EMPLOYER_ID, createdAt: t0 },
        { senderId: SEEKER_ID, createdAt: seekerReply },
        { senderId: EMPLOYER_ID, createdAt: employerResponse }, // 10h after seeker
      ]),
    );

    const result = computeResponsivenessScore(EMPLOYER_ID, conversations);

    expect(result.score).toBeCloseTo(1.0);
    // Median should be ~10h (time between seeker reply and employer's next message)
    expect(result.medianResponseHours).toBeCloseTo(10, 0);
  });

  it("only the employer's FIRST reply after a seeker message counts for timing", () => {
    // Seeker sends at t0, employer's first reply is at 80h (late), second at 100h
    const t0 = hoursAgo(300);
    const lateReply = hoursFromNow(t0, 80);
    const secondReply = hoursFromNow(t0, 100);

    const conversations = Array.from({ length: 3 }, () =>
      conv([
        { senderId: SEEKER_ID, createdAt: t0 },
        { senderId: EMPLOYER_ID, createdAt: lateReply },
        { senderId: EMPLOYER_ID, createdAt: secondReply },
      ]),
    );

    const result = computeResponsivenessScore(EMPLOYER_ID, conversations);

    // 80h > 72h → not timely
    expect(result.score).toBeCloseTo(0);
    expect(result.isResponsive).toBe(false);
    // Median is 80h (first reply in each conversation)
    expect(result.medianResponseHours).toBeCloseTo(80, 0);
  });
});

// ── runResponsivenessJob ───────────────────────────────────────────────────────

function makeMockDb() {
  return {
    query: {
      users: { findMany: vi.fn() },
    },
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockResolvedValue([]),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  };
}

// Conversations are directly on the User object (no `user` wrapper)
const EMPLOYER_1 = {
  id: "user-1",
  conversationsAsEmployer: [
    {
      messages: [
        { senderId: "seeker-1", createdAt: hoursAgo(100) },
        { senderId: "user-1", createdAt: hoursAgo(90) },
      ],
    },
    {
      messages: [
        { senderId: "seeker-1", createdAt: hoursAgo(80) },
        { senderId: "user-1", createdAt: hoursAgo(70) },
      ],
    },
    {
      messages: [
        { senderId: "seeker-1", createdAt: hoursAgo(60) },
        { senderId: "user-1", createdAt: hoursAgo(50) },
      ],
    },
  ],
};

describe("runResponsivenessJob", () => {
  let mockDb: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    mockDb = makeMockDb();
    // select().from() returns profile rows (one per employer)
    mockDb.select.mockReturnValue({
      from: vi.fn().mockResolvedValue([{ userId: "user-1" }]),
    });
  });

  // ── Happy path ───────────────────────────────────────────────────────────────

  it("employer with 3 timely-replied conversations → isResponsive true, score set", async () => {
    mockDb.query.users.findMany.mockResolvedValue([EMPLOYER_1]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await runResponsivenessJob(mockDb as any as DbClient);

    expect(mockDb.update).toHaveBeenCalledOnce();
    const setFn = mockDb.update.mock.results[0]!.value.set;
    const whereFn = setFn.mock.results[0]!.value.where;
    // Check the set call had isResponsive: true and responsivenessUpdatedAt
    const setCall = setFn.mock.calls[0]![0] as {
      isResponsive: boolean;
      responsivenessUpdatedAt: Date;
    };
    expect(setCall.isResponsive).toBe(true);
    expect(setCall.responsivenessUpdatedAt).toBeInstanceOf(Date);
    expect(whereFn).toHaveBeenCalled();
  });

  it("no employers → no updates, no crash", async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockResolvedValue([]),
    });
    mockDb.query.users.findMany.mockResolvedValue([]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(runResponsivenessJob(mockDb as any as DbClient)).resolves.toBeUndefined();

    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("employer with 0 conversations → score null, isResponsive false", async () => {
    mockDb.query.users.findMany.mockResolvedValue([{ id: "user-2", conversationsAsEmployer: [] }]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await runResponsivenessJob(mockDb as any as DbClient);

    const setCall = mockDb.update.mock.results[0]!.value.set.mock.calls[0]![0] as {
      isResponsive: boolean;
    };
    expect(setCall.isResponsive).toBe(false);
  });

  it("responsivenessUpdatedAt is always set, even when score is null", async () => {
    mockDb.query.users.findMany.mockResolvedValue([{ id: "user-3", conversationsAsEmployer: [] }]);

    const before = new Date();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await runResponsivenessJob(mockDb as any as DbClient);
    const after = new Date();

    const setCall = mockDb.update.mock.results[0]!.value.set.mock.calls[0]![0] as {
      responsivenessUpdatedAt: Date;
    };
    expect(setCall.responsivenessUpdatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(setCall.responsivenessUpdatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it("all conversationsAsEmployer are counted toward responsiveness score", async () => {
    mockDb.query.users.findMany.mockResolvedValue([
      {
        id: "user-4",
        conversationsAsEmployer: [
          {
            messages: [
              { senderId: "seeker-x", createdAt: hoursAgo(100) },
              { senderId: "user-4", createdAt: hoursAgo(90) },
            ],
          },
          {
            messages: [
              { senderId: "seeker-y", createdAt: hoursAgo(80) },
              { senderId: "user-4", createdAt: hoursAgo(70) },
            ],
          },
          {
            messages: [
              { senderId: "seeker-z", createdAt: hoursAgo(60) },
              { senderId: "user-4", createdAt: hoursAgo(50) },
            ],
          },
        ],
      },
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await runResponsivenessJob(mockDb as any as DbClient);

    const setCall = mockDb.update.mock.results[0]!.value.set.mock.calls[0]![0] as {
      isResponsive: boolean;
    };
    // 3 scoreable, all replied → isResponsive true
    expect(setCall.isResponsive).toBe(true);
  });

  // ── Isolation: one failure doesn't stop others ───────────────────────────────

  it("update throws for first employer → second employer still updated", async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockResolvedValue([{ userId: "user-1" }, { userId: "user-5" }]),
    });
    mockDb.query.users.findMany.mockResolvedValue([
      EMPLOYER_1,
      {
        id: "user-5",
        conversationsAsEmployer: [
          {
            messages: [
              { senderId: "seeker-a", createdAt: hoursAgo(100) },
              { senderId: "user-5", createdAt: hoursAgo(90) },
            ],
          },
          {
            messages: [
              { senderId: "seeker-b", createdAt: hoursAgo(80) },
              { senderId: "user-5", createdAt: hoursAgo(70) },
            ],
          },
          {
            messages: [
              { senderId: "seeker-c", createdAt: hoursAgo(60) },
              { senderId: "user-5", createdAt: hoursAgo(50) },
            ],
          },
        ],
      },
    ]);

    // First update throws, second resolves
    mockDb.update
      .mockReturnValueOnce({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error("DB timeout")),
        }),
      })
      .mockReturnValueOnce({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(runResponsivenessJob(mockDb as any as DbClient)).resolves.toBeUndefined();

    expect(mockDb.update).toHaveBeenCalledTimes(2);
  });

  // ── isResponsive threshold ────────────────────────────────────────────────────

  it("score exactly 0.7 (70%) with 3+ conversations → isResponsive true", async () => {
    // 7 out of 10 conversations replied to within 72h
    const t = hoursAgo(300);
    const conversations = Array.from({ length: 10 }, (_, i) => {
      const msgs: { senderId: string; createdAt: Date }[] = [
        { senderId: "seeker-x", createdAt: new Date(t.getTime() + i * 3_600_000) },
      ];
      if (i < 7) {
        msgs.push({
          senderId: "user-7",
          createdAt: new Date(t.getTime() + i * 3_600_000 + 60 * 60 * 1000),
        });
      }
      return { messages: msgs };
    });

    mockDb.query.users.findMany.mockResolvedValue([
      { id: "user-7", conversationsAsEmployer: conversations },
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await runResponsivenessJob(mockDb as any as DbClient);

    const setCall = mockDb.update.mock.results[0]!.value.set.mock.calls[0]![0] as {
      isResponsive: boolean;
    };
    expect(setCall.isResponsive).toBe(true);
  });

  it("score just below 0.7 with 3+ conversations → isResponsive false", async () => {
    // 6 out of 10 conversations replied to within 72h (0.6)
    const t = hoursAgo(300);
    const conversations = Array.from({ length: 10 }, (_, i) => {
      const msgs: { senderId: string; createdAt: Date }[] = [
        { senderId: "seeker-x", createdAt: new Date(t.getTime() + i * 3_600_000) },
      ];
      if (i < 6) {
        msgs.push({
          senderId: "user-8",
          createdAt: new Date(t.getTime() + i * 3_600_000 + 60 * 60 * 1000),
        });
      }
      return { messages: msgs };
    });

    mockDb.query.users.findMany.mockResolvedValue([
      { id: "user-8", conversationsAsEmployer: conversations },
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await runResponsivenessJob(mockDb as any as DbClient);

    const setCall = mockDb.update.mock.results[0]!.value.set.mock.calls[0]![0] as {
      isResponsive: boolean;
    };
    expect(setCall.isResponsive).toBe(false);
  });
});
