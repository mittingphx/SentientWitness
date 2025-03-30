import { pgTable, text, timestamp, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// Enums
export const userTypeEnum = pgEnum("user_type", ["human", "ai"]);
export const projectStatusEnum = pgEnum("project_status", ["active", "draft", "scheduled"]);
export const messageTypeEnum = pgEnum("message_type", ["human", "ai"]);

// Database schemas
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  avatar: text("avatar"),
  color: text("color").notNull(),
  type: userTypeEnum("type").notNull().default("human"),
  aiModel: text("ai_model"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  status: projectStatusEnum("status").notNull().default("active"),
  created: timestamp("created").notNull().defaultNow(),
  lastActive: timestamp("last_active").notNull().defaultNow(),
  ownerId: text("owner_id").notNull().references(() => users.id),
  sessionId: text("session_id").notNull(),
  password: text("password"),
  maxParticipants: integer("max_participants"),
});

export const participants = pgTable("participants", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  userId: text("user_id").notNull().references(() => users.id),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
});

export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  senderId: text("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  type: messageTypeEnum("type").notNull(),
  metadata: text("metadata"), // JSON stringified
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).pick({
  displayName: true,
  avatar: true,
  color: true,
  type: true,
  aiModel: true,
  isActive: true,
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
  isActive: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  projectId: true,
  senderId: true,
  content: true,
  type: true,
  metadata: true,
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type InsertParticipant = z.infer<typeof insertParticipantSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Participant = typeof participants.$inferSelect;
export type Message = typeof messages.$inferSelect;

// Client-side types (for in-memory storage)
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
  messages: SessionMessage[];
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