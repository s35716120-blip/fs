import { useEffect, useState } from "react";
import Layout from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function LoginTrackerPage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/api/login";
      return;
    }
  }, [isAuthenticated, isLoading]);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (email) params.append('email', email);
      const res = await fetch(`/api/login-tracker?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to load login tracker');
      }
      const data = await res.json();
      setRows(data);
    } catch (e: any) {
      alert(e.message || 'Failed to load login tracker');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRows(); }, []);

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Login Tracker</h2>
            <p className="text-gray-400">View user login/logout activity</p>
          </div>
        </div>

        <Card className="bg-rosae-dark-gray border-gray-600 mb-4">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm text-gray-400">Start Date</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-gray-800 border-gray-600 text-white" />
              </div>
              <div>
                <label className="text-sm text-gray-400">End Date</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-gray-800 border-gray-600 text-white" />
              </div>
              <div>
                <label className="text-sm text-gray-400">Email</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" className="bg-gray-800 border-gray-600 text-white" />
              </div>
              <div className="flex items-end">
                <Button onClick={fetchRows} className="bg-rosae-red hover:bg-rosae-dark-red w-full" disabled={loading}>
                  {loading ? 'Loading...' : 'Apply Filters'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-rosae-dark-gray border-gray-600">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 text-sm border-b border-gray-600">
                    <th className="p-3">Login Time</th>
                    <th className="p-3">Logout Time</th>
                    <th className="p-3">Duration (min)</th>
                    <th className="p-3">User</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Device</th>
                    <th className="p-3">IP</th>
                    <th className="p-3">User Agent</th>
                  </tr>
                </thead>
                <tbody className="text-white">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-gray-400">No records</td>
                    </tr>
                  ) : rows.map((r: any) => (
                    <tr key={r.id} className="border-b border-gray-700">
                      <td className="p-3">{new Date(r.loginTime).toLocaleString()}</td>
                      <td className="p-3">{r.logoutTime ? new Date(r.logoutTime).toLocaleString() : '-'}</td>
                      <td className="p-3">{r.sessionDurationSec ? Math.round(r.sessionDurationSec / 60) : '-'}</td>
                      <td className="p-3">{r.userId}</td>
                      <td className="p-3">{r.email || '-'}</td>
                      <td className="p-3">{((r.firstName || '') + ' ' + (r.lastName || '')).trim() || '-'}</td>
                      <td className="p-3">{r.deviceType || '-'}</td>
                      <td className="p-3">{r.ipAddress || '-'}</td>
                      <td className="p-3 max-w-[380px] truncate" title={r.userAgent}>{r.userAgent || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}