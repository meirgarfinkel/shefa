import { relations } from "drizzle-orm";
import { users, accounts, sessions } from "./auth";
import { seekerProfile, seekerLanguage } from "./seeker";
import { employerProfile, company } from "./employer";
import { jobPosting, jobLanguage } from "./job";
import { application } from "./application";
import { conversation, message } from "./conversation";
import { verificationPing, freshnessToken } from "./freshness";
import { notificationPreferences } from "./notification";
import { report } from "./report";
import { feedback } from "./feedback";
import { state, city } from "./geo";
import { language } from "./taxonomy";

export const usersRelations = relations(users, ({ one, many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  seekerProfile: one(seekerProfile, {
    fields: [users.id],
    references: [seekerProfile.userId],
  }),
  employerProfile: one(employerProfile, {
    fields: [users.id],
    references: [employerProfile.userId],
  }),
  companies: many(company),
  notificationPrefs: one(notificationPreferences, {
    fields: [users.id],
    references: [notificationPreferences.userId],
  }),
  jobs: many(jobPosting),
  applications: many(application),
  conversationsAsSeeker: many(conversation, { relationName: "ConversationSeeker" }),
  conversationsAsEmployer: many(conversation, { relationName: "ConversationEmployer" }),
  sentMessages: many(message),
  verificationPings: many(verificationPing),
  reports: many(report),
  feedback: many(feedback),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const seekerProfileRelations = relations(seekerProfile, ({ one, many }) => ({
  user: one(users, { fields: [seekerProfile.userId], references: [users.id] }),
  languages: many(seekerLanguage),
  verificationPings: many(verificationPing, { relationName: "SeekerPings" }),
}));

export const seekerLanguageRelations = relations(seekerLanguage, ({ one }) => ({
  seekerProfile: one(seekerProfile, {
    fields: [seekerLanguage.seekerProfileId],
    references: [seekerProfile.id],
  }),
  language: one(language, {
    fields: [seekerLanguage.languageId],
    references: [language.id],
  }),
}));

export const employerProfileRelations = relations(employerProfile, ({ one }) => ({
  user: one(users, { fields: [employerProfile.userId], references: [users.id] }),
}));

export const companyRelations = relations(company, ({ one, many }) => ({
  owner: one(users, { fields: [company.ownerId], references: [users.id] }),
  jobs: many(jobPosting),
}));

export const jobPostingRelations = relations(jobPosting, ({ one, many }) => ({
  employer: one(users, { fields: [jobPosting.employerId], references: [users.id] }),
  company: one(company, { fields: [jobPosting.companyId], references: [company.id] }),
  requiredLanguages: many(jobLanguage),
  applications: many(application),
  conversations: many(conversation),
  verificationPings: many(verificationPing, { relationName: "JobPings" }),
}));

export const jobLanguageRelations = relations(jobLanguage, ({ one }) => ({
  job: one(jobPosting, { fields: [jobLanguage.jobId], references: [jobPosting.id] }),
  language: one(language, { fields: [jobLanguage.languageId], references: [language.id] }),
}));

export const applicationRelations = relations(application, ({ one }) => ({
  seeker: one(users, { fields: [application.seekerId], references: [users.id] }),
  job: one(jobPosting, { fields: [application.jobId], references: [jobPosting.id] }),
}));

export const conversationRelations = relations(conversation, ({ one, many }) => ({
  seeker: one(users, {
    fields: [conversation.seekerId],
    references: [users.id],
    relationName: "ConversationSeeker",
  }),
  employer: one(users, {
    fields: [conversation.employerId],
    references: [users.id],
    relationName: "ConversationEmployer",
  }),
  job: one(jobPosting, { fields: [conversation.jobId], references: [jobPosting.id] }),
  messages: many(message),
}));

export const messageRelations = relations(message, ({ one }) => ({
  conversation: one(conversation, {
    fields: [message.conversationId],
    references: [conversation.id],
  }),
  sender: one(users, { fields: [message.senderId], references: [users.id] }),
}));

export const verificationPingRelations = relations(verificationPing, ({ one, many }) => ({
  user: one(users, { fields: [verificationPing.userId], references: [users.id] }),
  seekerProfile: one(seekerProfile, {
    fields: [verificationPing.seekerProfileId],
    references: [seekerProfile.id],
    relationName: "SeekerPings",
  }),
  job: one(jobPosting, {
    fields: [verificationPing.jobId],
    references: [jobPosting.id],
    relationName: "JobPings",
  }),
  freshnessTokens: many(freshnessToken),
}));

export const freshnessTokenRelations = relations(freshnessToken, ({ one }) => ({
  ping: one(verificationPing, {
    fields: [freshnessToken.pingId],
    references: [verificationPing.id],
  }),
}));

export const stateRelations = relations(state, ({ many }) => ({
  cities: many(city),
}));

export const cityRelations = relations(city, ({ one }) => ({
  state: one(state, { fields: [city.stateId], references: [state.id] }),
}));

export const languageRelations = relations(language, ({ many }) => ({
  seekerLanguages: many(seekerLanguage),
  jobLanguages: many(jobLanguage),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, { fields: [notificationPreferences.userId], references: [users.id] }),
}));

export const reportRelations = relations(report, ({ one }) => ({
  reporter: one(users, { fields: [report.reporterId], references: [users.id] }),
}));

export const feedbackRelations = relations(feedback, ({ one }) => ({
  user: one(users, { fields: [feedback.userId], references: [users.id] }),
}));
