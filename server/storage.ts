import { sql, eq, desc, and, like } from "drizzle-orm";
import { db } from "./db";
import { 
  users, bookings, expenses, leaveApplications, activityLogs, 
  calendarEvents, salesReports, configurations, adSpends, dailyIncome 
} from "@shared/schema";
import bcrypt from "bcryptjs";

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

  async getBookingsByPhoneNumber(phoneNumber: string) {
    return db.query.bookings.findMany({
      where: eq(bookings.phoneNumber, phoneNumber),
      orderBy: (bookings, { desc }) => [desc(bookings.createdAt)],
    });
  },

  async getBookingById(bookingId: string) {
    return db.query.bookings.findFirst({
      where: eq(bookings.id, bookingId),
    });
  },

  async updateBooking(bookingId: string, updateData: any) {
    const result = await db.update(bookings)
      .set(updateData)
      .where(eq(bookings.id, bookingId))
      .returning();
    return result[0];
  },

  async deleteBooking(bookingId: string) {
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
    
    // Get filtered results
    const results = await db.select()
      .from(bookings)
      .where(whereClause)
      .orderBy(desc(bookings.createdAt))
      .limit(pageSize)
      .offset(offset);
    
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
    // Get today's date
    const today = new Date();
    const result = [];
    
    // Generate data for each day
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      // Query bookings for this date
      const dailyBookings = await db.query.bookings.findMany({
        where: eq(bookings.bookingDate, dateString)
      });
      
      // Calculate revenue and booking count
      const revenue = dailyBookings.reduce((sum, booking) => sum + Number(booking.totalAmount), 0);
      
      result.push({
        date: dateString,
        revenue,
        bookings: dailyBookings.length
      });
    }
    
    return result;
  },
  
  async getPaymentMethodBreakdown() {
    // Get all bookings
    const allBookings = await db.query.bookings.findMany();
    
    // Calculate totals
    const cash = allBookings.reduce((sum, booking) => sum + Number(booking.cashAmount), 0);
    const upi = allBookings.reduce((sum, booking) => sum + Number(booking.upiAmount), 0);
    
    return { cash, upi };
  },
  
  async getTimeSlotPerformance() {
    // Get all bookings
    const allBookings = await db.query.bookings.findMany();
    
    // Group by time slot
    const slotMap = new Map();
    
    allBookings.forEach(booking => {
      const slot = booking.timeSlot;
      if (!slotMap.has(slot)) {
        slotMap.set(slot, { timeSlot: slot, bookings: 0, revenue: 0 });
      }
      
      const slotData = slotMap.get(slot);
      slotData.bookings += 1;
      slotData.revenue += Number(booking.totalAmount);
    });
    
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
  }
};
