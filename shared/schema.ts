import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  lastActive: timestamp("last_active").defaultNow(),
  ownerId: integer("owner_id").notNull(),
  sessionId: text("session_id").notNull().unique(),
  password: text("password"),
  maxParticipants: integer("max_participants"),
});

export const participants = pgTable("participants", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  userId: integer("user_id"),
  displayName: text("display_name").notNull(),
  type: text("type").notNull().default("human"), // "human" or "ai"
  aiModel: text("ai_model"),
  personality: text("personality"),
  avatar: text("avatar"),
  color: text("color"),
  isActive: boolean("is_active").default(true),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  senderId: integer("sender_id").notNull(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  type: text("type").notNull().default("ai"), // "ai" or "human"
  metadata: jsonb("metadata"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertProjectSchema = createInsertSchema(projects).pick({
  name: true,
  description: true,
  status: true,
  ownerId: true,
  sessionId: true,
  password: true,
  maxParticipants: true,
});

export const insertParticipantSchema = createInsertSchema(participants).pick({
  projectId: true,
  userId: true,
  displayName: true,
  type: true,
  aiModel: true,
  personality: true,
  avatar: true,
  color: true,
  isActive: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  projectId: true,
  senderId: true,
  content: true,
  type: true,
  metadata: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type InsertParticipant = z.infer<typeof insertParticipantSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Participant = typeof participants.$inferSelect;
export type Message = typeof messages.$inferSelect;

// Client-side models
export type SessionUser = {
  id: string;
  displayName: string;
  avatar?: string;
  color: string;
  type: "human" | "ai";
  aiModel?: string;
  isActive: boolean;
};

export type SessionProject = {
  id: string;
  name: string;
  description?: string;
  status: "active" | "draft" | "scheduled";
  created: Date;
  lastActive: Date;
  ownerId: string;
  sessionId: string;
  password?: string;
  maxParticipants?: number;
  participants: SessionUser[];
};

export type SessionMessage = {
  id: string;
  projectId: string;
  sender: SessionUser;
  content: string;
  timestamp: Date;
  type: "ai" | "human";
  metadata?: any;
};

export type AIProvider = {
  id: string;
  name: string;
  models: string[];
  apiKeyRequired: boolean;
  supportsBrowser: boolean;
};

export type AIPersonality = {
  name: string;
  projectId: string;
  userId: string;
  aiModel: string;
  coreTraits: string[];
  keyInterests: string[];
  conversationStyle: string[];
  viewpoints: string[];
  systemPrompt: string;
};
