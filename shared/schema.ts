import { sql } from "drizzle-orm";
import {
  index,
  sqliteTable,
  text,
  integer,
  real,
} from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Sessions
export const sessions = sqliteTable(
  "sessions",
  {
    sid: text("sid").primaryKey(),
    sess: text("sess").notNull(),
    expire: text("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// Users
export const users = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .default(
      sql`(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' ||
           substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))`
    ),
  email: text("email").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  passwordHash: text("password_hash"),
  role: text("role").default("employee"),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
});

// Bookings
export const bookings = sqliteTable("bookings", {
  id: text("id").primaryKey().default(
    sql`(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
         substr(hex(randomblob(2)),2) || '-' ||
         substr('89ab',abs(random()) % 4 + 1, 1) ||
         substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))`
  ),
  theatreName: text("theatre_name").notNull(),
  timeSlot: text("time_slot").notNull(),
  guests: integer("guests").notNull(),
  customerName: text("customer_name").notNull(),
  phoneNumber: text("phone_number"),
  age: integer("age"),
  totalAmount: real("total_amount").notNull().default(0),
  cashAmount: real("cash_amount").notNull().default(0),
  upiAmount: real("upi_amount").notNull().default(0),
  snacksAmount: real("snacks_amount").notNull().default(0),
  snacksCash: real("snacks_cash").notNull().default(0),
  snacksUpi: real("snacks_upi").notNull().default(0),
  bookingDate: text("booking_date").notNull(),
  isEighteenPlus: integer("is_eighteen_plus", { mode: "boolean" }).notNull().default(true),
  eighteenPlusReason: text("eighteen_plus_reason"),
  eighteenPlusDescription: text("eighteen_plus_description"),
  visited: integer("visited", { mode: "boolean" }).notNull().default(true),
  visitedReason: text("visited_reason"),
  visitedDescription: text("visited_description"),
  repeatCount: integer("repeat_count").notNull().default(0),
  createdBy: text("created_by").references(() => users.id),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
});

// Expenses
export const expenses = sqliteTable("expenses", {
  id: text("id").primaryKey().default(
    sql`(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
         substr(hex(randomblob(2)),2) || '-' ||
         substr('89ab',abs(random()) % 4 + 1, 1) ||
         substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))`
  ),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  expenseDate: text("expense_date").notNull(),
  createdBy: text("created_by").references(() => users.id),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

// Leave Applications
export const leaveApplications = sqliteTable("leave_applications", {
  id: text("id").primaryKey().default(
    sql`(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
         substr(hex(randomblob(2)),2) || '-' ||
         substr('89ab',abs(random()) % 4 + 1, 1) ||
         substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))`
  ),
  userId: text("user_id").references(() => users.id).notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  reason: text("reason").notNull(),
  status: text("status").default("pending"),
  reviewedBy: text("reviewed_by").references(() => users.id),
  reviewedAt: text("reviewed_at"),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

// Activity Logs
export const activityLogs = sqliteTable("activity_logs", {
  id: text("id").primaryKey().default(
    sql`(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
         substr(hex(randomblob(2)),2) || '-' ||
         substr('89ab',abs(random()) % 4 + 1, 1) ||
         substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))`
  ),
  userId: text("user_id").references(() => users.id).notNull(),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id"),
  details: text("details"),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

// Calendar Events
export const calendarEvents = sqliteTable("calendar_events", {
  id: text("id").primaryKey().default(
    sql`(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
         substr(hex(randomblob(2)),2) || '-' ||
         substr('89ab',abs(random()) % 4 + 1, 1) ||
         substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))`
  ),
  bookingId: text("booking_id").references(() => bookings.id).notNull(),
  googleCalendarEventId: text("google_calendar_event_id"),
  title: text("title").notNull(),
  description: text("description"),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  location: text("location"),
  status: text("status").default("confirmed"),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
});

// Sales Reports
export const salesReports = sqliteTable("sales_reports", {
  id: text("id").primaryKey().default(
    sql`(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
         substr(hex(randomblob(2)),2) || '-' ||
         substr('89ab',abs(random()) % 4 + 1, 1) ||
         substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))`
  ),
  reportDate: text("report_date").notNull(),
  totalRevenue: real("total_revenue").notNull().default(0),
  foodSales: real("food_sales").notNull().default(0),
  screenSales: real("screen_sales").notNull().default(0),
  totalBookings: integer("total_bookings").notNull().default(0),
  totalGuests: integer("total_guests").notNull().default(0),
  avgBookingValue: real("avg_booking_value").notNull().default(0),
  createdBy: text("created_by").references(() => users.id),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

// Configurations
export const configurations = sqliteTable("configurations", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedBy: text("updated_by").references(() => users.id),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
});

/* ---------------- SCHEMAS ---------------- */

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
  repeatCount: true,
}).extend({
  guests: z.coerce.number().min(1),
  customerName: z.string().min(1, "Customer name is required"),
  phoneNumber: z.string().min(10).max(15).optional(),
  age: z.coerce.number().min(1).max(120).optional(),
  totalAmount: z.coerce.number().min(0),
  cashAmount: z.coerce.number().min(0),
  upiAmount: z.coerce.number().min(0),
  snacksAmount: z.coerce.number().min(0).optional(),
  snacksCash: z.coerce.number().min(0).optional(),
  snacksUpi: z.coerce.number().min(0).optional(),
  isEighteenPlus: z.boolean().default(true),
  eighteenPlusReason: z.string().optional(),
  eighteenPlusDescription: z.string().optional(),
  visited: z.boolean().default(true),
  visitedReason: z.string().optional(),
  visitedDescription: z.string().optional(),
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdBy: true,
  createdAt: true,
}).extend({
  amount: z.coerce.number().min(0),
  creatorName: z.string().optional(),
});

export const insertLeaveApplicationSchema = createInsertSchema(leaveApplications).omit({
  id: true,
  status: true,
  reviewedBy: true,
  reviewedAt: true,
  createdAt: true,
});

export const upsertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,   // ✅ fixed camelCase
  lastName: true,    // ✅ fixed camelCase
  profileImageUrl: true,
  role: true,
});

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSalesReportSchema = createInsertSchema(salesReports).omit({
  id: true,
  createdBy: true,
  createdAt: true,
});

export const insertConfigurationSchema = createInsertSchema(configurations).omit({
  updatedAt: true,
});

/* ---------------- TYPES ---------------- */
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertConfiguration = z.infer<typeof insertConfigurationSchema>;
export type Configuration = typeof configurations.$inferSelect;
export type InsertLeaveApplication = z.infer<typeof insertLeaveApplicationSchema>;
export type LeaveApplication = typeof leaveApplications.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertSalesReport = z.infer<typeof insertSalesReportSchema>;
export type SalesReport = typeof salesReports.$inferSelect;
