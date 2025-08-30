import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import Layout from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookingModal } from "@/components/booking-modal";
import { useState } from "react";
import { 
  IndianRupee, 
  Ticket, 
  Banknote, 
  CreditCard,
  TrendingUp,
  ArrowUp
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from "recharts";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: dailyRevenue, isLoading: isDailyRevenueLoading, error: dailyRevenueError } = useQuery<any[]>({
    queryKey: ["/api/analytics/daily-revenue"],
  });

  const { data: paymentMethods, isLoading: isPaymentMethodsLoading, error: paymentMethodsError } = useQuery<any>({
    queryKey: ["/api/analytics/payment-methods"],
  });

  const { data: timeSlots, isLoading: isTimeSlotsLoading, error: timeSlotsError } = useQuery<any[]>({
    queryKey: ["/api/analytics/time-slots"],
  });

  const { data: recentBookings, isLoading: isRecentBookingsLoading, error: recentBookingsError } = useQuery<any[]>({
    queryKey: ["/api/bookings", "20"],
  });

  // Handle errors
  useEffect(() => {
    const errors = [dailyRevenueError, paymentMethodsError, timeSlotsError, recentBookingsError];
    errors.forEach(error => {
      if (error && isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      }
    });
  }, [dailyRevenueError, paymentMethodsError, timeSlotsError, recentBookingsError, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-rosae-black flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  // Calculate today's stats
  const todayRevenue = dailyRevenue?.[0]?.revenue || 0;
  const todayBookings = dailyRevenue?.[0]?.bookings || 0;
  const yesterdayRevenue = dailyRevenue?.[1]?.revenue || 0;
  const revenueChange = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0;

  const cashAmount = paymentMethods?.cash || 0;
  const upiAmount = paymentMethods?.upi || 0;
  const totalPayments = cashAmount + upiAmount;
  const cashPercentage = totalPayments > 0 ? (cashAmount / totalPayments) * 100 : 0;
  const upiPercentage = totalPayments > 0 ? (upiAmount / totalPayments) * 100 : 0;

  const pieData = [
    { name: 'Cash', value: cashPercentage, amount: cashAmount },
    { name: 'UPI', value: upiPercentage, amount: upiAmount },
  ];

  const COLORS = ['#10B981', '#8B5CF6'];

  const formatCurrency = (value: number) => {
    return `₹${value.toLocaleString('en-IN')}`;
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white" data-testid="text-page-title">Dashboard Overview</h2>
            <p className="text-gray-400">Welcome back, manage your theatre operations</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              onClick={() => setIsBookingModalOpen(true)}
              className="bg-rosae-red hover:bg-rosae-dark-red px-6 py-2"
              data-testid="button-quick-booking"
            >
              <Ticket className="mr-2 w-4 h-4" />
              Quick Booking
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-rosae-dark-gray border-gray-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Today's Revenue</p>
                  <p className="text-3xl font-bold text-white" data-testid="text-today-revenue">
                    {formatCurrency(todayRevenue)}
                  </p>
                  <p className="text-green-400 text-sm mt-1">
                    <ArrowUp className="inline w-3 h-3 mr-1" />
                    +{revenueChange.toFixed(1)}% from yesterday
                  </p>
                </div>
                <div className="w-12 h-12 bg-rosae-red/20 rounded-lg flex items-center justify-center">
                  <IndianRupee className="text-rosae-red text-xl" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-rosae-dark-gray border-gray-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Bookings</p>
                  <p className="text-3xl font-bold text-white" data-testid="text-total-bookings">
                    {todayBookings}
                  </p>
                  <p className="text-green-400 text-sm mt-1">
                    <TrendingUp className="inline w-3 h-3 mr-1" />
                    Today's count
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Ticket className="text-blue-400 text-xl" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-rosae-dark-gray border-gray-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Cash Payments</p>
                  <p className="text-3xl font-bold text-white" data-testid="text-cash-payments">
                    {formatCurrency(cashAmount)}
                  </p>
                  <p className="text-gray-400 text-sm mt-1">{cashPercentage.toFixed(1)}% of total</p>
                </div>
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Banknote className="text-green-400 text-xl" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-rosae-dark-gray border-gray-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">UPI Payments</p>
                  <p className="text-3xl font-bold text-white" data-testid="text-upi-payments">
                    {formatCurrency(upiAmount)}
                  </p>
                  <p className="text-gray-400 text-sm mt-1">{upiPercentage.toFixed(1)}% of total</p>
                </div>
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <CreditCard className="text-purple-400 text-xl" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Daily Revenue Chart */}
          <Card className="bg-rosae-dark-gray border-gray-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white" data-testid="text-daily-revenue-title">Daily Revenue</h3>
              </div>
              <div className="h-64">
                {isDailyRevenueLoading ? (
                  <div className="flex items-center justify-center h-full text-gray-400">Loading...</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number) => [formatCurrency(value), 'Revenue']} />
                      <Bar dataKey="revenue" fill="#DC2626" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods Pie Chart */}
          <Card className="bg-rosae-dark-gray border-gray-600">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold text-white mb-6" data-testid="text-payment-methods-title">Payment Methods</h3>
              <div className="h-64">
                {isPaymentMethodsLoading ? (
                  <div className="flex items-center justify-center h-full text-gray-400">Loading...</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={40}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number, name) => [`${value.toFixed(1)}%`, name]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Bookings & Time Slot Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Bookings */}
          <div className="lg:col-span-2">
            <Card className="bg-rosae-dark-gray border-gray-600">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-white" data-testid="text-recent-bookings-title">Recent Bookings</h3>
                  <Button 
                    variant="ghost" 
                    className="text-rosae-red hover:text-rosae-dark-red"
                    onClick={() => window.location.href = "/bookings"}
                    data-testid="button-view-all-bookings"
                  >
                    View All
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  {isRecentBookingsLoading ? (
                    <div className="flex items-center justify-center h-32 text-gray-400">Loading...</div>
                  ) : recentBookings && recentBookings.length > 0 ? (
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-gray-400 text-sm border-b border-gray-600">
                          <th className="pb-3">Theatre</th>
                          <th className="pb-3">Time</th>
                          <th className="pb-3">Guests</th>
                          <th className="pb-3">Amount</th>
                          <th className="pb-3">Payment</th>
                        </tr>
                      </thead>
                      <tbody className="text-white">
                        {recentBookings.slice(0, 5).map((booking: any) => (
                          <tr key={booking.id} className="border-b border-gray-700" data-testid={`row-booking-${booking.id}`}>
                            <td className="py-3">{booking.theatreName}</td>
                            <td className="py-3 text-gray-300">{booking.timeSlot}</td>
                            <td className="py-3">{booking.guests}</td>
                            <td className="py-3 font-medium">{formatCurrency(Number(booking.totalAmount))}</td>
                            <td className="py-3">
                              <span className="px-2 py-1 bg-green-600/20 text-green-400 rounded-full text-xs">
                                {Number(booking.cashAmount) > 0 && Number(booking.upiAmount) > 0 ? 'Mixed' : 
                                 Number(booking.cashAmount) > 0 ? 'Cash' : 'UPI'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center py-8 text-gray-400">No bookings found</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Time Slot Performance */}
          <Card className="bg-rosae-dark-gray border-gray-600">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold text-white mb-6" data-testid="text-time-slot-performance-title">Time Slot Performance</h3>
              <div className="space-y-4">
                {isTimeSlotsLoading ? (
                  <div className="flex items-center justify-center h-32 text-gray-400">Loading...</div>
                ) : timeSlots && timeSlots.length > 0 ? (
                  timeSlots.map((slot: any) => {
                    const maxRevenue = Math.max(...timeSlots.map((s: any) => s.revenue));
                    const occupancyPercentage = maxRevenue > 0 ? (slot.revenue / maxRevenue) * 100 : 0;
                    
                    return (
                      <div key={slot.timeSlot} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg" data-testid={`card-slot-${slot.timeSlot}`}>
                        <div>
                          <p className="text-white font-medium">{slot.timeSlot}</p>
                          <p className="text-gray-400 text-sm">{slot.bookings} bookings</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-medium">{formatCurrency(slot.revenue)}</p>
                          <div className="w-16 bg-gray-700 rounded-full h-2 mt-1">
                            <div 
                              className="bg-rosae-red h-2 rounded-full" 
                              style={{ width: `${occupancyPercentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-400">No time slot data available</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <BookingModal 
          isOpen={isBookingModalOpen} 
          onClose={() => setIsBookingModalOpen(false)} 
        />
      </div>
    </Layout>
  );
}
