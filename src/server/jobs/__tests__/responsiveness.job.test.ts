import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { computeResponsivenessScore, runResponsivenessJob } from "../responsiveness.job";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

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
    employerProfile: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  };
}

function asDb(mock: ReturnType<typeof makeMockDb>): PrismaClient {
  return mock as unknown as PrismaClient;
}

const EMPLOYER_PROFILE_1 = {
  id: "ep-1",
  userId: "user-1",
  user: {
    conversationsAsA: [
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
    conversationsAsB: [],
  },
};

describe("runResponsivenessJob", () => {
  let mockDb: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    mockDb = makeMockDb();
    mockDb.employerProfile.update.mockResolvedValue({});
  });

  // ── Happy path ───────────────────────────────────────────────────────────────

  it("employer with 3 timely-replied conversations → isResponsive true, score set", async () => {
    mockDb.employerProfile.findMany.mockResolvedValue([EMPLOYER_PROFILE_1]);

    await runResponsivenessJob(asDb(mockDb));

    expect(mockDb.employerProfile.update).toHaveBeenCalledOnce();
    const call = mockDb.employerProfile.update.mock.calls[0]![0] as {
      where: { id: string };
      data: {
        isResponsive: boolean;
        responsivenessScore: number | null;
        responsivenessUpdatedAt: Date;
      };
    };
    expect(call.where.id).toBe("ep-1");
    expect(call.data.isResponsive).toBe(true);
    expect(call.data.responsivenessScore).toBeCloseTo(1.0);
    expect(call.data.responsivenessUpdatedAt).toBeInstanceOf(Date);
  });

  it("no employer profiles → no updates, no crash", async () => {
    mockDb.employerProfile.findMany.mockResolvedValue([]);

    await expect(runResponsivenessJob(asDb(mockDb))).resolves.toBeUndefined();

    expect(mockDb.employerProfile.update).not.toHaveBeenCalled();
  });

  it("employer with 0 conversations → score null, isResponsive false", async () => {
    mockDb.employerProfile.findMany.mockResolvedValue([
      {
        id: "ep-2",
        userId: "user-2",
        user: { conversationsAsA: [], conversationsAsB: [] },
      },
    ]);

    await runResponsivenessJob(asDb(mockDb));

    const call = mockDb.employerProfile.update.mock.calls[0]![0] as {
      data: { isResponsive: boolean; responsivenessScore: number | null };
    };
    expect(call.data.isResponsive).toBe(false);
    expect(call.data.responsivenessScore).toBeNull();
  });

  it("responsivenessUpdatedAt is always set, even when score is null", async () => {
    mockDb.employerProfile.findMany.mockResolvedValue([
      {
        id: "ep-3",
        userId: "user-3",
        user: { conversationsAsA: [], conversationsAsB: [] },
      },
    ]);

    const before = new Date();
    await runResponsivenessJob(asDb(mockDb));
    const after = new Date();

    const call = mockDb.employerProfile.update.mock.calls[0]![0] as {
      data: { responsivenessUpdatedAt: Date };
    };
    expect(call.data.responsivenessUpdatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(call.data.responsivenessUpdatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it("conversations from both conversationsAsA and conversationsAsB are counted", async () => {
    mockDb.employerProfile.findMany.mockResolvedValue([
      {
        id: "ep-4",
        userId: "user-4",
        user: {
          conversationsAsA: [
            {
              messages: [
                { senderId: "seeker-x", createdAt: hoursAgo(100) },
                { senderId: "user-4", createdAt: hoursAgo(90) },
              ],
            },
          ],
          conversationsAsB: [
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
      },
    ]);

    await runResponsivenessJob(asDb(mockDb));

    const call = mockDb.employerProfile.update.mock.calls[0]![0] as {
      data: { isResponsive: boolean };
    };
    // 3 scoreable, all replied → isResponsive true
    expect(call.data.isResponsive).toBe(true);
  });

  // ── Isolation: one failure doesn't stop others ───────────────────────────────

  it("update throws for first employer → second employer still updated", async () => {
    mockDb.employerProfile.findMany.mockResolvedValue([
      EMPLOYER_PROFILE_1,
      {
        id: "ep-5",
        userId: "user-5",
        user: {
          conversationsAsA: [
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
          conversationsAsB: [],
        },
      },
    ]);

    mockDb.employerProfile.update
      .mockRejectedValueOnce(new Error("DB timeout"))
      .mockResolvedValueOnce({});

    await expect(runResponsivenessJob(asDb(mockDb))).resolves.toBeUndefined();

    expect(mockDb.employerProfile.update).toHaveBeenCalledTimes(2);
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
          senderId: "user-ep7",
          createdAt: new Date(t.getTime() + i * 3_600_000 + 60 * 60 * 1000),
        });
      }
      return { messages: msgs };
    });

    mockDb.employerProfile.findMany.mockResolvedValue([
      {
        id: "ep-7",
        userId: "user-ep7",
        user: { conversationsAsA: conversations, conversationsAsB: [] },
      },
    ]);

    await runResponsivenessJob(asDb(mockDb));

    const call = mockDb.employerProfile.update.mock.calls[0]![0] as {
      data: { isResponsive: boolean; responsivenessScore: number };
    };
    expect(call.data.responsivenessScore).toBeCloseTo(0.7);
    expect(call.data.isResponsive).toBe(true);
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
          senderId: "user-ep8",
          createdAt: new Date(t.getTime() + i * 3_600_000 + 60 * 60 * 1000),
        });
      }
      return { messages: msgs };
    });

    mockDb.employerProfile.findMany.mockResolvedValue([
      {
        id: "ep-8",
        userId: "user-ep8",
        user: { conversationsAsA: conversations, conversationsAsB: [] },
      },
    ]);

    await runResponsivenessJob(asDb(mockDb));

    const call = mockDb.employerProfile.update.mock.calls[0]![0] as {
      data: { isResponsive: boolean };
    };
    expect(call.data.isResponsive).toBe(false);
  });
});
