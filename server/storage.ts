import { sql, eq, desc, and, like, gte, lte, inArray } from "drizzle-orm";
import { db } from "./db";
import { 
  users, bookings, expenses, leaveApplications, activityLogs, 
  calendarEvents, salesReports, configurations, adSpends, dailyIncome, customerTickets, loginTracker,
  leaveTypes, leaveBalances, notifications, feedbacks, followUps, refundRequests
} from "@shared/schema";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

// Create a storage interface for database operations
export const storage = {
  // User operations
  async findUserByEmail(email: string) {
    return db.query.users.findFirst({
      where: eq(users.email, email),
    });
  },
  
  async getUserByEmail(email: string) {
    return db.query.users.findFirst({
      where: eq(users.email, email),
    });
  },
  
  async getUser(id: string) {
    return db.query.users.findFirst({
      where: eq(users.id, id),
    });
  },
  
  async getAllUsers() {
    return db.query.users.findMany({
      orderBy: (users, { asc }) => [asc(users.firstName)],
    });
  },
  
  async createUser(userData: { email: string; password: string; firstName: string; lastName: string; role?: string }) {
    const passwordHash = await bcrypt.hash(userData.password, 10);
    const user = {
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      passwordHash,
      role: userData.role || 'employee'
    };
    const result = await db.insert(users).values(user).returning();
    return result[0];
  },
  
  async upsertUser(userData: any) {
    // Check if user exists
    const existingUser = await this.getUser(userData.id);
    
    if (existingUser) {
      // Update existing user
      const result = await db.update(users)
        .set(userData)
        .where(eq(users.id, userData.id))
        .returning();
      return result[0];
    } else {
      // Create new user
      const result = await db.insert(users).values(userData).returning();
      return result[0];
    }
  },

  async updateUserRole(userId: string, role: string) {
    const result = await db.update(users)
      .set({ role })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  },

  async deleteUser(userId: string) {
    await db.delete(users).where(eq(users.id, userId));
  },
  
  // Booking operations
  async createBooking(bookingData: any) {
    const result = await db.insert(bookings).values(bookingData).returning();
    return result[0];
  },

  // Refund workflow
  async createRefundRequest({ bookingId, amount, reason, requestedBy }: { bookingId: string; amount: number; reason: string; requestedBy: string; }) {
    // Create request
    const reqRow = (await db.insert(refundRequests).values({ bookingId, amount, reason, status: 'pending', requestedBy }).returning())[0];
    // Update booking to pending
    await db.update(bookings)
      .set({ refundStatus: 'pending', refundAmount: amount, refundReason: reason, refundRequestedBy: requestedBy, updatedAt: sql`(CURRENT_TIMESTAMP)` })
      .where(eq(bookings.id, bookingId));
    return reqRow;
  },

  async listRefundRequests({ status }: { status?: 'pending' | 'approved' | 'rejected' } = {}) {
    if (status) {
      return db.query.refundRequests.findMany({ where: eq(refundRequests.status as any, status) as any, orderBy: [desc(refundRequests.createdAt)] });
    }
    return db.query.refundRequests.findMany({ orderBy: [desc(refundRequests.createdAt)] });
  },

  async approveRefundRequest(id: string, approverId: string) {
    const reqRow = await db.query.refundRequests.findFirst({ where: eq(refundRequests.id, id) });
    if (!reqRow) return null;
    // Mark request approved
    const updatedReq = (await db.update(refundRequests)
      .set({ status: 'approved', approvedBy: approverId, updatedAt: sql`(CURRENT_TIMESTAMP)` })
      .where(eq(refundRequests.id, id))
      .returning())[0];
    // Update booking
    await db.update(bookings)
      .set({ refundStatus: 'approved', refundAmount: (reqRow as any).amount, refundReason: (reqRow as any).reason, refundedAt: new Date().toISOString(), refundApprovedBy: approverId, updatedAt: sql`(CURRENT_TIMESTAMP)` })
      .where(eq(bookings.id, (reqRow as any).bookingId));
    return updatedReq;
  },

  async rejectRefundRequest(id: string, approverId: string) {
    const reqRow = await db.query.refundRequests.findFirst({ where: eq(refundRequests.id, id) });
    if (!reqRow) return null;
    const updatedReq = (await db.update(refundRequests)
      .set({ status: 'rejected', approvedBy: approverId, updatedAt: sql`(CURRENT_TIMESTAMP)` })
      .where(eq(refundRequests.id, id))
      .returning())[0];
    // Reset booking refund fields except reason (keep)
    await db.update(bookings)
      .set({ refundStatus: 'rejected', refundAmount: 0, refundedAt: null as any, refundApprovedBy: approverId, updatedAt: sql`(CURRENT_TIMESTAMP)` })
      .where(eq(bookings.id, (reqRow as any).bookingId));
    return updatedReq;
  },

  async getBookingsByPhoneNumber(phoneNumber: string) {
    // Support partial matches by using LIKE and also try exact match prioritization
    const pattern = `%${phoneNumber}%`;
    return db.query.bookings.findMany({
      where: like(bookings.phoneNumber, pattern),
      orderBy: (bookings, { desc }) => [desc(bookings.createdAt)],
    });
  },

  async getBookingById(bookingId: string) {
    return db.query.bookings.findFirst({
      where: eq(bookings.id, bookingId),
    });
  },

  // Find a specific booking by phone number + date + time slot
  async getBookingByPhoneDateAndSlot(phoneNumber: string, bookingDate: string, timeSlot: string) {
    // Normalize inputs to be more tolerant (trim, case-insensitive)
    const pn = phoneNumber.trim();
    const dt = bookingDate.trim();
    const slot = timeSlot.trim();
    // Try exact first, then case-insensitive match if needed
    const exact = await db.query.bookings.findFirst({
      where: (bookings, { and, eq }) => and(
        eq(bookings.phoneNumber, pn),
        eq(bookings.bookingDate, dt),
        eq(bookings.timeSlot, slot)
      ),
      orderBy: [desc(bookings.createdAt)],
    });
    if (exact) return exact;

    // Fallback: compare normalized timeSlot in memory (case-insensitive)
    const rows = await db.query.bookings.findMany({
      where: (bookings, { and, eq }) => and(
        eq(bookings.phoneNumber, pn),
        eq(bookings.bookingDate, dt)
      ),
      orderBy: (bookings, { desc }) => [desc(bookings.createdAt)],
    });
    const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase();
    return rows.find(r => norm(r.timeSlot) === norm(slot));
  },

  async updateBooking(bookingId: string, updateData: any) {
    const result = await db.update(bookings)
      .set(updateData)
      .where(eq(bookings.id, bookingId))
      .returning();
    return result[0];
  },

  // Daily Income operations
  async listDailyIncome(filters?: { startDate?: string; endDate?: string; paymentType?: 'all' | 'cash' | 'upi' | 'other' }) {
    const whereParts: any[] = [];
    if (filters?.startDate) whereParts.push(gte(dailyIncome.date as any, filters.startDate));
    if (filters?.endDate) whereParts.push(lte(dailyIncome.date as any, filters.endDate));
    const whereClause = whereParts.length ? and(...whereParts) : undefined;
    const rows = await db.query.dailyIncome.findMany({ where: whereClause, orderBy: [desc(dailyIncome.date as any)] });

    if (!rows.length) return rows;

    // Build a set of dates we need refund adjustments for
    const dates = Array.from(new Set(rows.map(r => r.date)));
    const bookingsForDates = await db.query.bookings.findMany({
      where: inArray(bookings.bookingDate as any, dates as any),
    });

    // Build per-date refund breakdowns (pro-rate cash vs UPI) and refunded show counts
    const refundBreakdown = new Map<string, { total: number; cash: number; upi: number; refundedShows: number }>();
    for (const b of bookingsForDates as any[]) {
      const date = b.bookingDate as string;
      const isApprovedRefund = b.refundStatus === 'approved';
      const refundAmt = isApprovedRefund ? Math.max(0, Number(b.refundAmount || 0)) : 0;
      if (refundAmt <= 0) continue;
      const paidCash = Number(b.cashAmount || 0);
      const paidUpi = Number(b.upiAmount || 0);
      const paidTotal = paidCash + paidUpi;
      const totalAmount = Number(b.totalAmount || paidTotal || 0);
      // Pro-rate refund across payment modes; if nothing paid, assign to cash by default 0
      const cashShare = paidTotal > 0 ? (refundAmt * (paidCash / paidTotal)) : 0;
      const upiShare = Math.max(0, refundAmt - cashShare);
      const fullRefunded = totalAmount > 0 ? (refundAmt >= totalAmount - 0.01) : (refundAmt >= paidTotal - 0.01);
      const curr = refundBreakdown.get(date) || { total: 0, cash: 0, upi: 0, refundedShows: 0 };
      curr.total += refundAmt;
      curr.cash += cashShare;
      curr.upi += upiShare;
      if (fullRefunded) curr.refundedShows += 1;
      refundBreakdown.set(date, curr);
    }

    // Enrich rows with computed refunds and adjusted totals (do not persist here)
    const enriched = rows.map(r => {
      const cash = Number(r.cashReceived || 0);
      const upi = Number(r.upiReceived || 0);
      const other = Number(r.otherPayments || 0);
      const breakdown = refundBreakdown.get(r.date) || { total: 0, cash: 0, upi: 0, refundedShows: 0 };
      const adjustedCashReceived = Math.max(0, cash - breakdown.cash);
      const adjustedUpiReceived = Math.max(0, upi - breakdown.upi);
      const adjustedShows = Math.max(0, Number(r.numberOfShows || 0) - breakdown.refundedShows);
      const adjustedRevenue = Math.max(0, adjustedCashReceived + adjustedUpiReceived + other);
      return {
        ...r,
        refundTotal: breakdown.total,
        adjustedRevenue,
        adjustedShows,
        adjustedCashReceived,
        adjustedUpiReceived,
      } as any;
    });

    return enriched;
  },

  async createDailyIncome(data: any) {
    const res = await db.insert(dailyIncome).values(data).returning();
    return res[0];
  },

  async updateDailyIncome(id: string, data: any) {
    const res = await db.update(dailyIncome).set(data).where(eq(dailyIncome.id, id)).returning();
    return res[0];
  },

  async deleteDailyIncome(id: string) {
    await db.delete(dailyIncome).where(eq(dailyIncome.id, id));
    return true;
  },

  async getDailyIncomeByDate(date: string) {
    return db.query.dailyIncome.findFirst({ where: eq(dailyIncome.date as any, date) });
  },

  async syncDailyIncomeFromBookings(opts?: { startDate?: string; endDate?: string; mode?: 'overwrite' | 'upsert-missing' }) {
    // Fetch bookings in range or all
    const whereParts: any[] = [];
    if (opts?.startDate) whereParts.push(gte(bookings.bookingDate as any, opts.startDate));
    if (opts?.endDate) whereParts.push(lte(bookings.bookingDate as any, opts.endDate));
    const whereClause = whereParts.length ? and(...whereParts) : undefined;

    const all = await db.query.bookings.findMany({ where: whereClause });
    if (!all.length) return { updated: 0 };

    // Group by date and aggregate
    const byDate = new Map<string, { cash: number; upi: number; shows: number; refund: number }>();
    for (const b of all as any[]) {
      const d = b.bookingDate as string;
      const curr = byDate.get(d) || { cash: 0, upi: 0, shows: 0, refund: 0 };
      curr.cash += Number(b.cashAmount || 0);
      curr.upi += Number(b.upiAmount || 0);
      curr.shows += 1; // treat each booking as a show entry; adjust if you have separate show entity
      if (b.refundStatus === 'approved') curr.refund += Math.max(0, Number(b.refundAmount || 0));
      byDate.set(d, curr);
    }

    let updated = 0;
    for (const [date, agg] of byDate) {
      const gross = agg.cash + agg.upi; // otherPayments left as 0 for sync; can be extended
      const adjustedRevenue = Math.max(0, gross - agg.refund);
      const existing = await this.getDailyIncomeByDate(date);
      if (existing) {
        if ((opts?.mode || 'overwrite') === 'overwrite') {
          await this.updateDailyIncome(existing.id, {
            date,
            numberOfShows: agg.shows,
            cashReceived: agg.cash,
            upiReceived: agg.upi,
            otherPayments: existing.otherPayments || 0,
            adjustedShows: agg.shows,
            adjustedRevenue,
            refundTotal: agg.refund,
          });
          updated++;
        }
      } else {
        await this.createDailyIncome({
          date,
          numberOfShows: agg.shows,
          cashReceived: agg.cash,
          upiReceived: agg.upi,
          otherPayments: 0,
          adjustedShows: agg.shows,
          adjustedRevenue,
          refundTotal: agg.refund,
        });
        updated++;
      }
    }

    return { updated };
  },

  async deleteBooking(bookingId: string) {
    // Delete dependent records first to satisfy FK constraints
    try {
      await db.delete(feedbacks).where(eq(feedbacks.bookingId, bookingId));
    } catch {}
    try {
      await db.delete(customerTickets).where(eq(customerTickets.bookingId, bookingId));
    } catch {}
    try {
      await db.delete(followUps).where(eq(followUps.bookingId, bookingId));
    } catch {}
    try {
      await db.delete(calendarEvents).where(eq(calendarEvents.bookingId, bookingId));
    } catch {}

    // Finally delete the booking itself
    await db.delete(bookings).where(eq(bookings.id, bookingId));
  },

  async getBookingsByDateRange(startDate: string, endDate: string) {
    return db.query.bookings.findMany({
      where: (bookings, { and, gte, lte }) => and(
        gte(bookings.bookingDate, startDate),
        lte(bookings.bookingDate, endDate)
      ),
      orderBy: [desc(bookings.createdAt)]
    });
  },
  
  async getAllBookings(page: number = 1, pageSize: number = 10, filters?: {
    dateFilter?: string;
    phoneFilter?: string;
    bookingDateFilter?: string;
    repeatCountFilter?: string;
  }) {
    const offset = (page - 1) * pageSize;
    
    // Build where conditions
    const whereConditions: any[] = [];
    
    if (filters?.dateFilter) {
      const filterDate = filters.dateFilter;
      whereConditions.push(sql`DATE(${bookings.createdAt}) = ${filterDate}`);
    }
    
    if (filters?.phoneFilter) {
      whereConditions.push(like(bookings.phoneNumber, `%${filters.phoneFilter}%`));
    }
    
    if (filters?.bookingDateFilter) {
      whereConditions.push(eq(bookings.bookingDate, filters.bookingDateFilter));
    }
    
    if (filters?.repeatCountFilter) {
      whereConditions.push(eq(bookings.repeatCount, Number(filters.repeatCountFilter)));
    }
    
    // Combine conditions with AND
    const whereClause = whereConditions.length > 0 
      ? and(...whereConditions)
      : undefined;
    
    // Get filtered results joined with creator info
    const rows = await db
      .select({
        b: bookings,
        creatorEmail: users.email,
        creatorFirstName: users.firstName,
        creatorLastName: users.lastName,
      })
      .from(bookings)
      .leftJoin(users, eq(bookings.createdBy, users.id))
      .where(whereClause)
      .orderBy(desc(bookings.createdAt))
      .limit(pageSize)
      .offset(offset);

    const results = rows.map((r: any) => ({
      ...r.b,
      createdByEmail: r.creatorEmail || null,
      createdByName: ((r.creatorFirstName || '') + ' ' + (r.creatorLastName || '')).trim() || null,
    }));
    
    // Get total count for pagination with filters
    const countQuery = db.select({ count: sql`count(*)` })
      .from(bookings)
      .where(whereClause);
    const countResult = await countQuery.execute();
    const totalCount = Number(countResult[0]?.count || 0);
    
    return {
      bookings: results,
      pagination: {
        total: totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize)
      }
    };
  },
  
  // Tickets operations
  async createTicket(data: { bookingId: string; reason: string; notes?: string; timeSlot?: string; createdBy?: string }) {
    const result = await db.insert(customerTickets).values({
      bookingId: data.bookingId,
      reason: data.reason,
      notes: data.notes,
      timeSlot: data.timeSlot,
      createdBy: data.createdBy,
    }).returning();
    return result[0];
  },

  async updateTicket(id: string, update: Partial<{ reason: string; notes: string; status: string }>) {
    const result = await db.update(customerTickets)
      .set({ ...update, updatedAt: new Date().toISOString() })
      .where(eq(customerTickets.id, id))
      .returning();
    return result[0];
  },

  async softDeleteTicket(id: string) {
    const result = await db.update(customerTickets)
      .set({ status: 'deleted', deletedAt: new Date().toISOString() })
      .where(eq(customerTickets.id, id))
      .returning();
    return result[0];
  },

  async getTickets(params: {
    page?: number;
    pageSize?: number;
    bookingId?: string;
    phoneNumber?: string;
    reason?: string;
    timeSlot?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 10;
    const offset = (page - 1) * pageSize;

    const baseWhere: any[] = [sql`deleted_at IS NULL`];

    // Build query depending on whether phoneNumber filter is used
    if (params.phoneNumber) {
      // Join with bookings to filter by phone
      const whereJoinParts: any[] = [...baseWhere, eq(bookings.phoneNumber, params.phoneNumber)];
      if (params.reason) whereJoinParts.push(eq(customerTickets.reason, params.reason));
      if (params.timeSlot) whereJoinParts.push(eq(customerTickets.timeSlot, params.timeSlot));
      if (params.startDate && params.endDate) {
        whereJoinParts.push(and(gte(customerTickets.createdAt, params.startDate), lte(customerTickets.createdAt, params.endDate)));
      }
      if (params.bookingId) whereJoinParts.push(eq(customerTickets.bookingId, params.bookingId));
      const whereClause = and(...whereJoinParts);

      const rows = await db
        .select({ ticket: customerTickets })
        .from(customerTickets)
        .leftJoin(bookings, eq(bookings.id, customerTickets.bookingId))
        .where(whereClause)
        .orderBy(desc(customerTickets.createdAt))
        .limit(pageSize)
        .offset(offset);

      const countRes = await db
        .select({ count: sql`count(*)` })
        .from(customerTickets)
        .leftJoin(bookings, eq(bookings.id, customerTickets.bookingId))
        .where(whereClause)
        .execute();

      const total = Number(countRes[0]?.count || 0);
      const tickets = rows.map(r => r.ticket);
      return { tickets, pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
    } else {
      // No phone filter → simple table query
      const whereParts: any[] = [...baseWhere];
      if (params.bookingId) whereParts.push(eq(customerTickets.bookingId, params.bookingId));
      if (params.reason) whereParts.push(eq(customerTickets.reason, params.reason));
      if (params.timeSlot) whereParts.push(eq(customerTickets.timeSlot, params.timeSlot));
      if (params.startDate && params.endDate) {
        whereParts.push(and(gte(customerTickets.createdAt, params.startDate), lte(customerTickets.createdAt, params.endDate)));
      }
      const whereClause = and(...whereParts);

      const rows = await db.select().from(customerTickets)
        .where(whereClause)
        .orderBy(desc(customerTickets.createdAt))
        .limit(pageSize)
        .offset(offset);

      const countRes = await db.select({ count: sql`count(*)` })
        .from(customerTickets)
        .where(whereClause)
        .execute();
      const total = Number(countRes[0]?.count || 0);

      return { tickets: rows, pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
    }
  },

  // Expense operations
  async createExpense(expenseData: any) {
    const result = await db.insert(expenses).values(expenseData).returning();
    return result[0];
  },

  async getAllExpenses(limit?: number) {
    return db.query.expenses.findMany({
      orderBy: [desc(expenses.createdAt)],
      limit: limit
    });
  },

  async getExpensesByCategory(category: string) {
    return db.query.expenses.findMany({
      where: eq(expenses.category, category),
      orderBy: [desc(expenses.createdAt)]
    });
  },

  async getExpensesByDateRange(startDate: string, endDate: string) {
    return db.query.expenses.findMany({
      where: (expenses, { and, gte, lte }) => and(
        gte(expenses.expenseDate, startDate),
        lte(expenses.expenseDate, endDate)
      ),
      orderBy: [desc(expenses.createdAt)]
    });
  },

  // Login tracker operations
  async logLogin(entry: { userId: string; email?: string | null; deviceType?: string | null; userAgent?: string | null; ipAddress?: string | null }) {
    const now = new Date().toISOString();
    const row = await db.insert(loginTracker).values({
      id: randomUUID(),
      userId: entry.userId,
      email: entry.email || null,
      deviceType: entry.deviceType || null,
      userAgent: entry.userAgent || null,
      ipAddress: entry.ipAddress || null,
      loginTime: now,
    }).returning();
    return row[0];
  },

  async logLogout(userId: string) {
    // Find latest open session for user and close it
    const rows = await db.select().from(loginTracker)
      .where(and(eq(loginTracker.userId, userId), sql`logout_time IS NULL`))
      .orderBy(desc(loginTracker.loginTime))
      .limit(1);
    const open = rows[0];
    if (!open) return null;

    const logoutTime = new Date().toISOString();
    const durationSec = Math.max(0, Math.floor((new Date(logoutTime).getTime() - new Date(open.loginTime!).getTime()) / 1000));
    const updated = await db.update(loginTracker)
      .set({ logoutTime, sessionDurationSec: durationSec })
      .where(eq(loginTracker.id, open.id))
      .returning();
    return updated[0];
  },

  async listLogins(filters?: { startDate?: string; endDate?: string; userId?: string; email?: string }) {
    const where: any[] = [];
    if (filters?.startDate && filters?.endDate) {
      where.push(sql`login_time >= ${filters.startDate} AND login_time <= ${filters.endDate}`);
    }
    if (filters?.userId) where.push(eq(loginTracker.userId, filters.userId));
    if (filters?.email) where.push(eq(loginTracker.email, filters.email));
    const clause = where.length ? and(...where) : undefined;
    // Join users to include names and better identity info
    const rows = await db
      .select({
        log: loginTracker,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(loginTracker)
      .leftJoin(users, eq(loginTracker.userId, users.id))
      .where(clause)
      .orderBy(desc(loginTracker.loginTime));

    return rows.map((r: any) => ({
      ...r.log,
      firstName: r.firstName || null,
      lastName: r.lastName || null,
    }));
  },

  // Ad spend operations
  async createAdSpend(data: any) {
    try {
      console.log("Storage: Creating ad spend with data:", JSON.stringify(data, null, 2));
      const result = await db.insert(adSpends).values(data).returning();
      console.log("Storage: Ad spend created successfully:", result[0]);
      return result[0];
    } catch (error) {
      console.error("Storage: Error creating ad spend:", error);
      throw error;
    }
  },

  async updateAdSpend(id: string, update: any) {
    const result = await db.update(adSpends).set(update).where(eq(adSpends.id, id)).returning();
    return result[0];
  },

  async deleteAdSpend(id: string) {
    await db.delete(adSpends).where(eq(adSpends.id, id));
  },

  async getAdSpends(filters?: {
    startDate?: string;
    endDate?: string;
    campaignName?: string;
    platform?: string;
    maxCpl?: number;
  }) {
    // Build dynamic where clause
    const whereParts: any[] = [];

    if (filters?.startDate && filters?.endDate) {
      whereParts.push(sql`date >= ${filters.startDate} AND date <= ${filters.endDate}`);
    }
    if (filters?.campaignName) {
      whereParts.push(like(adSpends.campaignName, `%${filters.campaignName}%`));
    }
    if (filters?.platform) {
      whereParts.push(eq(adSpends.platform, filters.platform));
    }

    const whereClause = whereParts.length ? and(...whereParts) : undefined;

    const rows = await db.select().from(adSpends).where(whereClause).orderBy(desc(adSpends.date), desc(adSpends.createdAt));

    // Apply CPL filter in memory (requires computed value)
    if (typeof filters?.maxCpl === 'number') {
      return rows.filter(r => (r.totalLeads || 0) > 0 && (r.adSpend / r.totalLeads) <= (filters!.maxCpl as number));
    }

    return rows;
  },

  // Leave application operations
  async createLeaveApplication(leaveData: any) {
    const result = await db.insert(leaveApplications).values(leaveData).returning();
    return result[0];
  },

  async getLeaveApplications() {
    return db.query.leaveApplications.findMany({
      orderBy: [desc(leaveApplications.createdAt)]
    });
  },

  async updateLeaveStatus(applicationId: string, status: string, reviewedBy: string) {
    const result = await db.update(leaveApplications)
      .set({ 
        status, 
        reviewedBy, 
        reviewedAt: new Date().toISOString()
      })
      .where(eq(leaveApplications.id, applicationId))
      .returning();
    return result[0];
  },

  // Feedbacks operations
  async listFeedbacks(filters?: { collected?: boolean; theatreName?: string; date?: string; timeSlot?: string }, page: number = 1, pageSize: number = 20) {
    // Build simple where on feedbacks for prefiltering
    const whereParts: any[] = [];
    if (filters?.theatreName) whereParts.push(eq(feedbacks.theatreName, filters.theatreName));
    if (filters?.date) whereParts.push(eq(feedbacks.bookingDate, filters.date));
    if (filters?.timeSlot) whereParts.push(eq(feedbacks.timeSlot, filters.timeSlot));
    const whereClause = whereParts.length ? and(...whereParts) : undefined;

    // Join feedbacks with bookings to always have customerName/phoneNumber present
    const joined = await db
      .select({ fb: feedbacks, b: bookings })
      .from(feedbacks)
      .leftJoin(bookings, eq(feedbacks.bookingId, bookings.id))
      .where(whereClause)
      .orderBy(desc(feedbacks.createdAt));

    // Pick latest feedback per bookingId
    const latestByBooking = new Map<string, any>();
    for (const r of joined as any[]) {
      const f = r.fb;
      if (!latestByBooking.has(f.bookingId)) {
        latestByBooking.set(f.bookingId, {
          ...f,
          customerName: r.b?.customerName || null,
          phoneNumber: r.b?.phoneNumber || null,
        });
      }
    }

    // Convert to list and apply 'collected' filter on latest
    let list = Array.from(latestByBooking.values());
    if (typeof filters?.collected === 'boolean') {
      list = list.filter((r: any) => r.collected === filters.collected);
    }

    // Sort by createdAt DESC
    list.sort((a: any, b: any) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime());

    // Pagination over distinct bookings
    const total = list.length;
    const start = Math.max(0, (page - 1) * pageSize);
    const paged = list.slice(start, start + pageSize);

    return { rows: paged, pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
  },

  async getLatestFeedbackForBooking(bookingId: string) {
    const rows = await db.query.feedbacks.findMany({ where: eq(feedbacks.bookingId, bookingId), orderBy: [desc(feedbacks.createdAt)], limit: 1 });
    return rows?.[0] || null;
  },

  async upsertFeedback(data: { id?: string; bookingId: string; bookingDate?: string | null; timeSlot?: string | null; theatreName?: string | null; customerName?: string | null; phoneNumber?: string | null; collected: boolean; reason?: string | null; createdBy?: string | null }) {
    // If id provided, update that record without wiping existing denormalized fields
    if (data.id) {
      const existingRows = await db.query.feedbacks.findMany({ where: eq(feedbacks.id, data.id), limit: 1 });
      const existing = existingRows?.[0] as any;
      const res = await db.update(feedbacks)
        .set({
          bookingId: data.bookingId || existing?.bookingId,
          bookingDate: (data.bookingDate !== undefined ? data.bookingDate : existing?.bookingDate) ?? null,
          timeSlot: (data.timeSlot !== undefined ? data.timeSlot : existing?.timeSlot) ?? null,
          theatreName: (data.theatreName !== undefined ? data.theatreName : existing?.theatreName) ?? null,
          customerName: (data.customerName !== undefined ? data.customerName : existing?.customerName) ?? null,
          phoneNumber: (data.phoneNumber !== undefined ? data.phoneNumber : existing?.phoneNumber) ?? null,
          collected: data.collected,
          reason: data.collected ? null : (data.reason !== undefined ? data.reason : existing?.reason ?? null),
          updatedAt: sql`(CURRENT_TIMESTAMP)`
        })
        .where(eq(feedbacks.id, data.id))
        .returning();
      return res[0];
    }

    // Otherwise, upsert by latest feedback for the booking
    const latest = await db.query.feedbacks.findMany({
      where: eq(feedbacks.bookingId, data.bookingId),
      orderBy: [desc(feedbacks.createdAt)],
      limit: 1,
    });
    if (latest && latest[0]) {
      const cur = latest[0] as any;
      const res = await db.update(feedbacks)
        .set({
          bookingId: data.bookingId || cur.bookingId,
          bookingDate: (data.bookingDate !== undefined ? data.bookingDate : cur.bookingDate) ?? null,
          timeSlot: (data.timeSlot !== undefined ? data.timeSlot : cur.timeSlot) ?? null,
          theatreName: (data.theatreName !== undefined ? data.theatreName : cur.theatreName) ?? null,
          customerName: (data.customerName !== undefined ? data.customerName : cur.customerName) ?? null,
          phoneNumber: (data.phoneNumber !== undefined ? data.phoneNumber : cur.phoneNumber) ?? null,
          collected: data.collected,
          reason: data.collected ? null : (data.reason !== undefined ? data.reason : cur.reason ?? null),
          updatedAt: sql`(CURRENT_TIMESTAMP)`
        })
        .where(eq(feedbacks.id, latest[0].id))
        .returning();
      return res[0];
    }

    // No previous feedback → insert new
    const res = await db.insert(feedbacks)
      .values({
        bookingId: data.bookingId,
        bookingDate: data.bookingDate ?? null,
        timeSlot: data.timeSlot ?? null,
        theatreName: data.theatreName ?? null,
        customerName: data.customerName ?? null,
        phoneNumber: data.phoneNumber ?? null,
        collected: data.collected,
        reason: data.collected ? null : (data.reason ?? null),
        createdBy: data.createdBy ?? null,
      })
      .returning();
    return res[0];
  },

  // Follow-ups operations (extend for feedback type)
  async createFollowUpForFeedback(input: { bookingId?: string | null; customerName?: string | null; phoneNumber?: string | null; reason: string; dueAt?: string | null; createdBy?: string | null; }) {
    const res = await db.insert(followUps).values({
      bookingId: input.bookingId ?? null,
      customerName: input.customerName ?? null,
      phoneNumber: input.phoneNumber ?? null,
      reason: input.reason,
      type: 'feedback',
      status: 'pending',
      dueAt: input.dueAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdBy: input.createdBy ?? null,
    }).returning();
    return res[0];
  },

  async markFollowUpCompleted(id: string) {
    // 1) Mark follow-up as completed
    const updated = await db.update(followUps)
      .set({ status: 'completed', completedAt: new Date().toISOString() })
      .where(eq(followUps.id, id))
      .returning();

    // 2) If this follow-up relates to a booking, mark its feedback as collected and close other pending follow-ups
    try {
      const fu = await db.query.followUps.findFirst({ where: eq(followUps.id, id) });
      const bookingId = (fu as any)?.bookingId;
      if (bookingId) {
        // Update latest feedback to collected=true
        const fbRows = await db.query.feedbacks.findMany({
          where: eq(feedbacks.bookingId, bookingId),
          orderBy: [desc(feedbacks.createdAt)],
          limit: 1,
        });
        const latest = fbRows[0] as any;
        if (latest) {
          await db.update(feedbacks)
            .set({ collected: true, reason: null, updatedAt: sql`(CURRENT_TIMESTAMP)` })
            .where(eq(feedbacks.id, latest.id));
        } else {
          // Create a collected feedback record if none exists
          const booking = await db.query.bookings.findFirst({ where: eq(bookings.id, bookingId) });
          await db.insert(feedbacks).values({
            bookingId,
            bookingDate: (booking as any)?.bookingDate || null,
            timeSlot: (booking as any)?.timeSlot || null,
            theatreName: (booking as any)?.theatreName || null,
            customerName: (booking as any)?.customerName || null,
            phoneNumber: (booking as any)?.phoneNumber || null,
            collected: true,
            reason: null,
            createdBy: (fu as any)?.createdBy || null,
          });
        }

        // Close all other pending follow-ups for this booking and type 'feedback'
        const openFus = await db.query.followUps.findMany({
          where: and(eq(followUps.bookingId, bookingId), eq(followUps.type, 'feedback'), eq(followUps.status, 'pending')),
        });
        for (const x of openFus as any[]) {
          await db.update(followUps).set({ status: 'completed', completedAt: new Date().toISOString() }).where(eq(followUps.id, x.id));
        }
      }
    } catch (e) {
      console.warn('Failed to flip feedback to collected on follow-up completion:', e);
    }

    return updated[0];
  },

  async cancelFollowUp(id: string) {
    const res = await db.update(followUps)
      .set({ status: 'cancelled', completedAt: new Date().toISOString() })
      .where(eq(followUps.id, id))
      .returning();
    return res[0];
  },

  async closePendingFollowUpsForBooking(bookingId: string) {
    const pending = await db.query.followUps.findMany({
      where: and(eq(followUps.bookingId, bookingId), eq(followUps.type, 'feedback'), eq(followUps.status, 'pending')),
    });
    for (const p of pending as any[]) {
      await db.update(followUps).set({ status: 'completed', completedAt: new Date().toISOString() }).where(eq(followUps.id, p.id));
    }
    return pending.length;
  },

  async listFollowUps(filters?: { type?: string; status?: string }) {
    const whereParts: any[] = [];
    if (filters?.type) whereParts.push(eq(followUps.type, filters.type));
    if (filters?.status) whereParts.push(eq(followUps.status, filters.status));
    const whereClause = whereParts.length ? and(...whereParts) : undefined;
    return db.query.followUps.findMany({ where: whereClause, orderBy: [desc(followUps.createdAt)] });
  },

  async listBookingsNeedingFeedback(filters?: { theatreName?: string; date?: string; timeSlot?: string }, page: number = 1, pageSize: number = 20) {
    // Bookings where there is no collected=true feedback record
    const offset = (page - 1) * pageSize;

    const whereParts: any[] = [];
    if (filters?.theatreName) whereParts.push(eq(bookings.theatreName, filters.theatreName));
    if (filters?.date) whereParts.push(eq(bookings.bookingDate, filters.date));
    if (filters?.timeSlot) whereParts.push(eq(bookings.timeSlot, filters.timeSlot));
    const whereClause = whereParts.length ? and(...whereParts) : undefined;

    // Step 1: get candidate bookings
    const candidate = await db.query.bookings.findMany({ where: whereClause, orderBy: [desc(bookings.createdAt)], limit: pageSize, offset });
    const bookingIds = candidate.map(b => b.id);

    // Step 2: get feedbacks for these bookings and compute maps
    let collectedMap = new Map<string, boolean>();
    let latestFeedbackByBooking = new Map<string, any>();
    if (bookingIds.length) {
      const fbRows = await db.query.feedbacks.findMany({
        where: (feedbacks, { inArray }) => inArray(feedbacks.bookingId, bookingIds as any[]) as any,
      });
      for (const f of fbRows as any[]) {
        if (f.collected) collectedMap.set(f.bookingId, true);
        const prev = latestFeedbackByBooking.get(f.bookingId);
        if (!prev) {
          latestFeedbackByBooking.set(f.bookingId, f);
        } else {
          const prevT = new Date(prev.createdAt as any).getTime();
          const curT = new Date(f.createdAt as any).getTime();
          if (!Number.isFinite(prevT) || (Number.isFinite(curT) && curT > prevT)) {
            latestFeedbackByBooking.set(f.bookingId, f);
          }
        }
      }
    }

    // Step 3: filter out those already collected=true, and attach latest feedback state (if any)
    const rows = candidate
      .filter(b => !collectedMap.get(b.id))
      .map(b => {
        const fb = latestFeedbackByBooking.get(b.id);
        return {
          ...b,
          collected: fb?.collected ?? null,
          reason: fb?.reason ?? null,
        } as any;
      });

    // Count approximate total: use bookings count then subtract those with collected
    const totalRow = await db.select({ count: sql`COUNT(*)` }).from(bookings).where(whereClause);
    const totalApprox = Number(totalRow?.[0]?.count || 0);

    return { rows, pagination: { total: totalApprox, page, pageSize, totalPages: Math.ceil(totalApprox / pageSize) } };
  },

  // Feedback SLA: notify overdue follow-ups (>1 day)
  async notifyOverdueFeedbackFollowUps() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    // Find pending follow-ups of type 'feedback' past due and not yet notified
    const overdue = await db.select()
      .from(followUps)
      .where(and(eq(followUps.type, 'feedback'), eq(followUps.status, 'pending'), sql`${followUps.dueAt} < ${cutoff}`, sql`${followUps.notifiedOverdueAt} IS NULL`));

    if (!overdue.length) return [];

    // Notify admins and employees (per requirement) for each overdue
    const allUsers = await db.query.users.findMany();
    const toNotify = allUsers; // admins + employees

    const created: any[] = [];
    for (const fu of overdue as any[]) {
      for (const u of toNotify) {
        const n = await db.insert(notifications).values({
          userId: u.id,
          title: 'Feedback follow-up overdue',
          body: `Follow-up for booking ${fu.bookingId || ''} is overdue`,
          type: 'feedback',
          relatedType: 'follow_up',
          relatedId: fu.id,
        }).returning();
        created.push(n[0]);
      }
      await db.update(followUps).set({ notifiedOverdueAt: new Date().toISOString() }).where(eq(followUps.id, (fu as any).id));
    }
    return created;
  },

  async exportFeedbacksCSV(filters?: { collected?: boolean; theatreName?: string; date?: string; timeSlot?: string }) {
    const whereParts: any[] = [];
    if (typeof filters?.collected === 'boolean') whereParts.push(eq(feedbacks.collected, filters.collected));
    if (filters?.theatreName) whereParts.push(eq(feedbacks.theatreName, filters.theatreName));
    if (filters?.date) whereParts.push(eq(feedbacks.bookingDate, filters.date));
    if (filters?.timeSlot) whereParts.push(eq(feedbacks.timeSlot, filters.timeSlot));
    const whereClause = whereParts.length ? and(...whereParts) : undefined;

    const rows = await db.query.feedbacks.findMany({ where: whereClause, orderBy: [desc(feedbacks.createdAt)] });

    const headers = ['Booking ID','Theatre','Date','Time Slot','Collected','Reason','Created At'];
    const csv = [headers.join(',')].concat(rows.map((r: any) => [
      r.bookingId,
      r.theatreName || '',
      r.bookingDate || '',
      r.timeSlot || '',
      r.collected ? 'Yes' : 'No',
      (r.reason || '').replace(/"/g, '""'),
      r.createdAt
    ].map(v => typeof v === 'string' ? `"${v}"` : String(v)).join(','))).join('\n');
    return csv;
  },

  // Leave types operations
  async getLeaveTypes() {
    return db.query.leaveTypes.findMany();
  },

  async upsertLeaveType(data: { id?: string; code: string; name: string; defaultAnnual?: number; active?: boolean }) {
    if (data.id) {
      const result = await db.update(leaveTypes)
        .set({ code: data.code, name: data.name, defaultAnnual: data.defaultAnnual ?? 0, active: data.active ?? true })
        .where(eq(leaveTypes.id, data.id))
        .returning();
      return result[0];
    }
    const result = await db.insert(leaveTypes)
      .values({ code: data.code, name: data.name, defaultAnnual: data.defaultAnnual ?? 0, active: data.active ?? true })
      .returning();
    return result[0];
  },

  // Leave balance operations
  async getLeaveBalancesByUser(userId: string, year?: number) {
    const yr = year ?? new Date().getFullYear();
    return db.query.leaveBalances.findMany({
      where: and(eq(leaveBalances.userId, userId), eq(leaveBalances.year, yr))
    });
  },

  async setLeaveBalance(userId: string, leaveTypeCode: string, year: number, allocated: number) {
    // Try update, else insert
    const existing = await db.query.leaveBalances.findFirst({
      where: and(eq(leaveBalances.userId, userId), eq(leaveBalances.leaveTypeCode, leaveTypeCode), eq(leaveBalances.year, year))
    });
    if (existing) {
      const res = await db.update(leaveBalances)
        .set({ allocated })
        .where(eq(leaveBalances.id, existing.id))
        .returning();
      return res[0];
    }
    const res = await db.insert(leaveBalances)
      .values({ userId, leaveTypeCode, year, allocated, used: 0, carriedOver: 0 })
      .returning();
    return res[0];
  },

  async adjustLeaveUsed(userId: string, leaveTypeCode: string, year: number, delta: number) {
    const existing = await db.query.leaveBalances.findFirst({
      where: and(eq(leaveBalances.userId, userId), eq(leaveBalances.leaveTypeCode, leaveTypeCode), eq(leaveBalances.year, year))
    });
    if (!existing) {
      const res = await db.insert(leaveBalances)
        .values({ userId, leaveTypeCode, year, allocated: 0, used: Math.max(0, delta), carriedOver: 0 })
        .returning();
      return res[0];
    }
    const newUsed = Math.max(0, Number(existing.used) + delta);
    const res = await db.update(leaveBalances)
      .set({ used: newUsed })
      .where(eq(leaveBalances.id, existing.id))
      .returning();
    return res[0];
  },

  // Notifications operations
  async createNotification(data: { userId: string; title: string; body?: string; type?: string; relatedType?: string; relatedId?: string }) {
    const result = await db.insert(notifications).values({
      userId: data.userId,
      title: data.title,
      body: data.body ?? null,
      type: data.type ?? 'leave',
      relatedType: data.relatedType ?? null,
      relatedId: data.relatedId ?? null,
    }).returning();
    return result[0];
  },

  async listNotifications(userId: string) {
    return db.query.notifications.findMany({ where: eq(notifications.userId, userId), orderBy: [desc(notifications.createdAt)] });
  },

  async markNotificationRead(id: string, isRead: boolean = true) {
    const result = await db.update(notifications)
      .set({ isRead })
      .where(eq(notifications.id, id))
      .returning();
    return result[0];
  },

  // Calendar operations
  async createCalendarEvent(eventData: any) {
    const result = await db.insert(calendarEvents).values(eventData).returning();
    return result[0];
  },

  async getCalendarEventByBookingId(bookingId: string) {
    return db.query.calendarEvents.findFirst({
      where: eq(calendarEvents.bookingId, bookingId)
    });
  },

  async updateCalendarEvent(eventId: string, updateData: any) {
    const result = await db.update(calendarEvents)
      .set(updateData)
      .where(eq(calendarEvents.id, eventId))
      .returning();
    return result[0];
  },

  async deleteCalendarEvent(eventId: string) {
    await db.delete(calendarEvents).where(eq(calendarEvents.id, eventId));
  },
  
  // Activity log operations
  async logActivity(userId: string, action: string, resourceType: string, resourceId: string, details: string) {
    return db.insert(activityLogs).values({
      userId,
      action,
      resourceType,
      resourceId,
      details
    }).returning();
  },
  
  // Analytics operations
  async getDailyRevenue(days: number = 7) {
    // Helper to compute net amounts after approved refunds
    const computeNet = (b: any) => {
      const total = Number(b.totalAmount || 0);
      const cash = Number(b.cashAmount || 0);
      const upi = Number(b.upiAmount || 0);
      const isRefunded = (b.refundStatus === 'approved');
      const refund = isRefunded ? Math.max(0, Math.min(Number(b.refundAmount || 0), total)) : 0;
      // Proportionally split refund across payment methods based on original split
      let netTotal = Math.max(0, total - refund);
      if (total > 0 && refund > 0) {
        const cashShare = cash / total;
        const upiShare = upi / total;
        // We only need netTotal for this function
        return { netTotal };
      }
      return { netTotal };
    };

    // Get today's date
    const today = new Date();
    const result = [] as any[];

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateString = date.toISOString().split('T')[0];

      // Query bookings for this date
      const dailyBookings = await db.query.bookings.findMany({
        where: eq(bookings.bookingDate, dateString)
      });

      // Calculate net revenue and booking count
      const revenue = dailyBookings.reduce((sum, b) => sum + computeNet(b).netTotal, 0);

      result.push({
        date: dateString,
        revenue,
        bookings: dailyBookings.length
      });
    }

    return result;
  },

  async getPaymentMethodBreakdown() {
    // Helper to compute net cash/upi after approved refunds proportionally
    const computeNetSplit = (b: any) => {
      const total = Number(b.totalAmount || 0);
      const cash = Number(b.cashAmount || 0);
      const upi = Number(b.upiAmount || 0);
      const isRefunded = (b.refundStatus === 'approved');
      const refund = isRefunded ? Math.max(0, Math.min(Number(b.refundAmount || 0), total)) : 0;
      if (total <= 0 || refund <= 0) return { netCash: cash, netUpi: upi };
      const cashShare = cash / total;
      const upiShare = upi / total;
      const netCash = Math.max(0, cash - refund * cashShare);
      const netUpi = Math.max(0, upi - refund * upiShare);
      return { netCash, netUpi };
    };

    const allBookings = await db.query.bookings.findMany();
    let cash = 0;
    let upi = 0;
    for (const b of allBookings as any[]) {
      const { netCash, netUpi } = computeNetSplit(b);
      cash += netCash;
      upi += netUpi;
    }
    return { cash, upi };
  },

  async getTimeSlotPerformance() {
    const computeNet = (b: any) => {
      const total = Number(b.totalAmount || 0);
      const isRefunded = (b.refundStatus === 'approved');
      const refund = isRefunded ? Math.max(0, Math.min(Number(b.refundAmount || 0), total)) : 0;
      return Math.max(0, total - refund);
    };

    const allBookings = await db.query.bookings.findMany();

    const slotMap = new Map<string, { timeSlot: string; bookings: number; revenue: number }>();
    for (const booking of allBookings as any[]) {
      const slot = booking.timeSlot as string;
      if (!slotMap.has(slot)) {
        slotMap.set(slot, { timeSlot: slot, bookings: 0, revenue: 0 });
      }
      const slotData = slotMap.get(slot)!;
      slotData.bookings += 1;
      slotData.revenue += computeNet(booking);
    }

    return Array.from(slotMap.values());
  },
  
  // Configuration operations
  async getConfig() {
    // Default configuration
    const defaultConfig = {
      theatres: ['Theatre 1', 'Theatre 2', 'Theatre 3'],
      timeSlots: ['10:00 AM', '1:00 PM', '4:00 PM', '7:00 PM'],
      expenseCategories: ['Utilities', 'Maintenance', 'Staff Salaries', 'Equipment', 'Marketing', 'Rent', 'Supplies', 'Insurance', 'Other'],
      expenseCreators: ['Kumar', 'Rahul', 'Priya', 'Amit', 'Sneha']
    };
    
    try {
      // Get theatres configuration
      const theatresConfig = await db.query.configurations.findFirst({
        where: eq(configurations.key, 'theatres')
      });
      
      // Get time slots configuration
      const timeSlotsConfig = await db.query.configurations.findFirst({
        where: eq(configurations.key, 'timeSlots')
      });
      
      // Get expense categories configuration
      const expenseCategoriesConfig = await db.query.configurations.findFirst({
        where: eq(configurations.key, 'expenseCategories')
      });
      
      // Get expense creators configuration
      const expenseCreatorsConfig = await db.query.configurations.findFirst({
        where: eq(configurations.key, 'expenseCreators')
      });
      
      return {
        theatres: theatresConfig ? JSON.parse(theatresConfig.value) : defaultConfig.theatres,
        timeSlots: timeSlotsConfig ? JSON.parse(timeSlotsConfig.value) : defaultConfig.timeSlots,
        expenseCategories: expenseCategoriesConfig ? JSON.parse(expenseCategoriesConfig.value) : defaultConfig.expenseCategories,
        expenseCreators: expenseCreatorsConfig ? JSON.parse(expenseCreatorsConfig.value) : defaultConfig.expenseCreators
      };
    } catch (error) {
      console.error('Error fetching configuration:', error);
      return defaultConfig;
    }
  },
  
  async updateConfig({ theatres, timeSlots, expenseCategories, expenseCreators }: { theatres: string[], timeSlots: string[], expenseCategories?: string[], expenseCreators?: string[] }, userId: string) {
    try {
      // Update theatres configuration
      await db.insert(configurations)
        .values({
          key: 'theatres',
          value: JSON.stringify(theatres),
          updatedBy: userId
        })
        .onConflictDoUpdate({
          target: configurations.key,
          set: {
            value: JSON.stringify(theatres),
            updatedBy: userId,
            updatedAt: sql`(CURRENT_TIMESTAMP)`
          }
        });
      
      // Update time slots configuration
      await db.insert(configurations)
        .values({
          key: 'timeSlots',
          value: JSON.stringify(timeSlots),
          updatedBy: userId
        })
        .onConflictDoUpdate({
          target: configurations.key,
          set: {
            value: JSON.stringify(timeSlots),
            updatedBy: userId,
            updatedAt: sql`(CURRENT_TIMESTAMP)`
          }
        });
      
      // Update expense categories configuration if provided
      if (expenseCategories) {
        await db.insert(configurations)
          .values({
            key: 'expenseCategories',
            value: JSON.stringify(expenseCategories),
            updatedBy: userId
          })
          .onConflictDoUpdate({
            target: configurations.key,
            set: {
              value: JSON.stringify(expenseCategories),
              updatedBy: userId,
              updatedAt: sql`(CURRENT_TIMESTAMP)`
            }
          });
      }
      
      // Update expense creators configuration if provided
      if (expenseCreators) {
        await db.insert(configurations)
          .values({
            key: 'expenseCreators',
            value: JSON.stringify(expenseCreators),
            updatedBy: userId
          })
          .onConflictDoUpdate({
            target: configurations.key,
            set: {
              value: JSON.stringify(expenseCreators),
              updatedBy: userId,
              updatedAt: sql`(CURRENT_TIMESTAMP)`
            }
          });
      }
      
      return { theatres, timeSlots, expenseCategories, expenseCreators };
    } catch (error) {
      console.error('Error updating configuration:', error);
      throw error;
    }
  },
  
  // Sales report operations
  async getSalesReports() {
    return db.query.salesReports.findMany({
      orderBy: [desc(salesReports.createdAt)]
    });
  },

  async generateDailySalesReport(reportDate: string, reportData: any) {
    const result = await db.insert(salesReports).values({
      reportDate,
      ...reportData
    }).returning();
    return result[0];
  },

  // Daily Income operations
  async getDailyIncomes(filters?: { startDate?: string; endDate?: string; paymentType?: string }) {
    let whereConditions = [];
    
    if (filters?.startDate) {
      whereConditions.push(sql`${dailyIncome.date} >= ${filters.startDate}`);
    }
    
    if (filters?.endDate) {
      whereConditions.push(sql`${dailyIncome.date} <= ${filters.endDate}`);
    }
    
    return db.query.dailyIncome.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      orderBy: [desc(dailyIncome.date)]
    });
  },

  async createDailyIncome(incomeData: any) {
    const result = await db.insert(dailyIncome).values(incomeData).returning();
    return result[0];
  },

  async updateDailyIncome(id: string, incomeData: any) {
    const result = await db.update(dailyIncome)
      .set({ ...incomeData, updatedAt: sql`(CURRENT_TIMESTAMP)` })
      .where(eq(dailyIncome.id, id))
      .returning();
    return result[0];
  },

  async deleteDailyIncome(id: string) {
    const result = await db.delete(dailyIncome)
      .where(eq(dailyIncome.id, id))
      .returning();
    return result[0];
  },

  async getDailyIncomeById(id: string) {
    return db.query.dailyIncome.findFirst({
      where: eq(dailyIncome.id, id)
    });
  },

  async getDailyIncomeByDate(date: string) {
    const rows = await db.query.dailyIncome.findMany({
      where: eq(dailyIncome.date, date),
      orderBy: [desc(dailyIncome.createdAt as any)]
    });
    return rows[0] || null;
  },

  async syncDailyIncomeFromBookings(params: { startDate?: string; endDate?: string; mode?: 'overwrite' | 'skip' | 'merge' }, userId: string) {
    const whereParts: any[] = [];
    if (params.startDate) whereParts.push(sql`${bookings.bookingDate} >= ${params.startDate}`);
    if (params.endDate) whereParts.push(sql`${bookings.bookingDate} <= ${params.endDate}`);
    const whereClause = whereParts.length ? and(...whereParts) : undefined;

    const rows = await db.query.bookings.findMany({ where: whereClause });

    const byDate = new Map<string, { shows: Set<string>; cash: number; upi: number; other: number }>();
    for (const b of rows) {
      const d = b.bookingDate as string;
      if (!byDate.has(d)) byDate.set(d, { shows: new Set<string>(), cash: 0, upi: 0, other: 0 });
      const agg = byDate.get(d)!;
      agg.shows.add(`${b.theatreName}|${b.timeSlot}`);
      agg.cash += Number(b.cashAmount || 0) + Number(b.snacksCash || 0);
      agg.upi += Number(b.upiAmount || 0) + Number(b.snacksUpi || 0);
    }

    const results: any[] = [];
    for (const [date, agg] of byDate.entries()) {
      const existing = await this.getDailyIncomeByDate(date);
      const payload = {
        date,
        numberOfShows: agg.shows.size,
        cashReceived: agg.cash,
        upiReceived: agg.upi,
        otherPayments: 0,
      } as any;

      if (!existing) {
        results.push(await this.createDailyIncome({ ...payload, createdBy: userId }));
      } else if ((params.mode || 'overwrite') === 'overwrite') {
        results.push(await this.updateDailyIncome(existing.id, payload));
      } else if (params.mode === 'merge') {
        results.push(await this.updateDailyIncome(existing.id, {
          date,
          numberOfShows: Number(existing.numberOfShows || 0) + payload.numberOfShows,
          cashReceived: Number(existing.cashReceived || 0) + payload.cashReceived,
          upiReceived: Number(existing.upiReceived || 0) + payload.upiReceived,
          otherPayments: Number(existing.otherPayments || 0) + payload.otherPayments,
        }));
      } else {
        results.push(existing);
      }
    }

    return results;
  }
};
