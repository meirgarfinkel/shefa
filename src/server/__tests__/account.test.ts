import { describe, it, expect } from "vitest";
import {
  users,
  accounts,
  sessions,
  jobPosting,
  seekerProfile,
  employerProfile,
  conversation,
  message,
  application,
} from "@/db/schema";
import {
  anonymizedUserFields,
  anonymizedSeekerProfileFields,
  anonymizedEmployerProfileFields,
  softDeleteAccount,
} from "../account";

describe("anonymizedUserFields", () => {
  it("strips every piece of personal data and stamps deletedAt", () => {
    const now = new Date("2026-06-08T00:00:00.000Z");
    const fields = anonymizedUserFields("usr_123", now);

    expect(fields.name).toBeNull();
    expect(fields.phone).toBeNull();
    expect(fields.image).toBeNull();
    expect(fields.deletedAt).toBe(now);
  });

  it("replaces the email with a unique, non-routable placeholder", () => {
    const a = anonymizedUserFields("usr_123", new Date());
    const b = anonymizedUserFields("usr_456", new Date());

    // Non-routable so a real re-signup with the same Google email creates a fresh row.
    expect(a.email).toBe("deleted-usr_123@deleted.shefa.invalid");
    // Unique per user so the NOT NULL UNIQUE email constraint never collides.
    expect(a.email).not.toBe(b.email);
  });
});

describe("anonymized profile fields", () => {
  it("genericises the seeker profile and marks it DELETED", () => {
    expect(anonymizedSeekerProfileFields.status).toBe("DELETED");
    expect(anonymizedSeekerProfileFields.firstName).not.toMatch(/\w{2,}\s/); // generic, not a real name
    expect(anonymizedSeekerProfileFields.about).toBeNull();
    expect(anonymizedSeekerProfileFields.resumeUrl).toBeNull();
    expect(anonymizedSeekerProfileFields.educationLevel).toBeNull();
  });

  it("genericises the employer profile and marks it DELETED", () => {
    expect(anonymizedEmployerProfileFields.status).toBe("DELETED");
    expect(anonymizedEmployerProfileFields.roleAtCompany).toBeNull();
  });
});

describe("softDeleteAccount", () => {
  type RecordedUpdate = { table: unknown; payload: Record<string, unknown> };

  function makeDb() {
    const updates: RecordedUpdate[] = [];
    const deletes: unknown[] = [];
    // softDeleteAccount uses db.batch (the Neon HTTP driver has no interactive
    // transactions). The builders record synchronously at construction; batch just
    // awaits the lazy query objects, so a no-op resolve is enough here.
    const db = {
      update(table: unknown) {
        return {
          set(payload: Record<string, unknown>) {
            updates.push({ table, payload });
            return { where: () => ({}) };
          },
        };
      },
      delete(table: unknown) {
        deletes.push(table);
        return { where: () => ({}) };
      },
      batch: (_queries: unknown[]) => Promise.resolve([]),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { db: db as any, updates, deletes };
  }

  it("anonymizes the user, closes their jobs, and marks profiles DELETED", async () => {
    const { db, updates } = makeDb();
    await softDeleteAccount(db, "usr_1");

    const userUpdate = updates.find((u) => u.table === users);
    expect(userUpdate?.payload.email).toBe("deleted-usr_1@deleted.shefa.invalid");
    expect(userUpdate?.payload.deletedAt).toBeInstanceOf(Date);

    const jobUpdate = updates.find((u) => u.table === jobPosting);
    expect(jobUpdate?.payload.status).toBe("CLOSED");

    expect(updates.find((u) => u.table === seekerProfile)?.payload.status).toBe("DELETED");
    expect(updates.find((u) => u.table === employerProfile)?.payload.status).toBe("DELETED");
  });

  it("severs auth by deleting only Account and Session rows", async () => {
    const { db, deletes } = makeDb();
    await softDeleteAccount(db, "usr_1");

    expect(deletes).toContain(accounts);
    expect(deletes).toContain(sessions);
  });

  it("never destroys conversations, messages, or applications", async () => {
    const { db, deletes } = makeDb();
    await softDeleteAccount(db, "usr_1");

    expect(deletes).not.toContain(conversation);
    expect(deletes).not.toContain(message);
    expect(deletes).not.toContain(application);
  });
});
