import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  CheckCircle, 
  AlertCircle, 
  Plus,
  Edit3,
  Trash2,
  Filter,
  Search,
  MessageSquare,
  Star,
  CalendarDays
} from "lucide-react";

interface FollowUp {
  id: number;
  customerName: string;
  phoneNumber: string;
  followUpDate: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed' | 'cancelled';
  note: string;
  createdBy: string;
  createdAt: string;
  completedAt?: string;
  category: string;
}

export default function FollowUps() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [filteredFollowUps, setFilteredFollowUps] = useState<FollowUp[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [isAddingFollowUp, setIsAddingFollowUp] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUp | null>(null);
  
  const [newFollowUp, setNewFollowUp] = useState({
    customerName: "",
    phoneNumber: "",
    followUpDate: "",
    priority: "medium" as const,
    note: "",
    category: "general"
  });

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

  // Load mock follow-ups data
  useEffect(() => {
    const mockFollowUps: FollowUp[] = [
      {
        id: 1,
        customerName: "John Doe",
        phoneNumber: "+91 9876543210",
        followUpDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
        priority: "high",
        status: "pending",
        note: "Customer interested in premium package for anniversary celebration",
        createdBy: user?.firstName || "Admin",
        createdAt: new Date().toISOString(),
        category: "sales"
      },
      {
        id: 2,
        customerName: "Jane Smith",
        phoneNumber: "+91 9876543211",
        followUpDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0], // Day after tomorrow
        priority: "medium",
        status: "pending",
        note: "Follow up on booking cancellation and offer alternative dates",
        createdBy: user?.firstName || "Admin",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        category: "support"
      },
      {
        id: 3,
        customerName: "Mike Johnson",
        phoneNumber: "+91 9876543212",
        followUpDate: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday
        priority: "low",
        status: "completed",
        note: "Thank customer for feedback and inform about new shows",
        createdBy: "Sarah",
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        completedAt: new Date(Date.now() - 86400000).toISOString(),
        category: "feedback"
      },
      {
        id: 4,
        customerName: "Emily Davis",
        phoneNumber: "+91 9876543213",
        followUpDate: new Date().toISOString().split('T')[0], // Today
        priority: "high",
        status: "pending",
        note: "Customer complained about seating arrangement, offer compensation",
        createdBy: user?.firstName || "Admin",
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        category: "complaint"
      }
    ];
    
    setFollowUps(mockFollowUps);
    setFilteredFollowUps(mockFollowUps);
  }, [user]);

  // Filter follow-ups based on search and filters
  useEffect(() => {
    let filtered = followUps;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(followUp =>
        followUp.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        followUp.phoneNumber.includes(searchTerm) ||
        followUp.note.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(followUp => followUp.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== "all") {
      filtered = filtered.filter(followUp => followUp.priority === priorityFilter);
    }

    setFilteredFollowUps(filtered);
  }, [followUps, searchTerm, statusFilter, priorityFilter]);

  const addFollowUp = () => {
    if (!newFollowUp.customerName || !newFollowUp.phoneNumber || !newFollowUp.followUpDate || !newFollowUp.note) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const followUp: FollowUp = {
      id: Date.now(),
      ...newFollowUp,
      status: "pending",
      createdBy: user?.firstName || "User",
      createdAt: new Date().toISOString()
    };

    setFollowUps([followUp, ...followUps]);
    setNewFollowUp({
      customerName: "",
      phoneNumber: "",
      followUpDate: "",
      priority: "medium",
      note: "",
      category: "general"
    });
    setIsAddingFollowUp(false);

    toast({
      title: "Follow-up Added",
      description: "Follow-up has been scheduled successfully",
    });
  };

  const updateFollowUpStatus = (id: number, status: FollowUp['status']) => {
    setFollowUps(followUps.map(followUp => 
      followUp.id === id 
        ? { 
            ...followUp, 
            status, 
            completedAt: status === 'completed' ? new Date().toISOString() : undefined 
          }
        : followUp
    ));

    toast({
      title: "Status Updated",
      description: `Follow-up marked as ${status}`,
    });
  };

  const deleteFollowUp = (id: number) => {
    setFollowUps(followUps.filter(followUp => followUp.id !== id));
    toast({
      title: "Follow-up Deleted",
      description: "Follow-up has been removed",
    });
  };

  const openWhatsApp = (phoneNumber: string) => {
    // Remove any non-digit characters and format for WhatsApp
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${cleanNumber}`;
    window.open(whatsappUrl, '_blank');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-600/20 text-red-400 border-red-600/30';
      case 'medium': return 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30';
      case 'low': return 'bg-green-600/20 text-green-400 border-green-600/30';
      default: return 'bg-gray-600/20 text-gray-400 border-gray-600/30';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-600/20 text-green-400 border-green-600/30';
      case 'pending': return 'bg-blue-600/20 text-blue-400 border-blue-600/30';
      case 'cancelled': return 'bg-red-600/20 text-red-400 border-red-600/30';
      default: return 'bg-gray-600/20 text-gray-400 border-gray-600/30';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'sales': return 'bg-purple-600/20 text-purple-400 border-purple-600/30';
      case 'support': return 'bg-blue-600/20 text-blue-400 border-blue-600/30';
      case 'complaint': return 'bg-red-600/20 text-red-400 border-red-600/30';
      case 'feedback': return 'bg-green-600/20 text-green-400 border-green-600/30';
      default: return 'bg-gray-600/20 text-gray-400 border-gray-600/30';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN');
  };

  const isOverdue = (followUpDate: string, status: string) => {
    if (status === 'completed' || status === 'cancelled') return false;
    return new Date(followUpDate) < new Date();
  };

  const isToday = (dateString: string) => {
    const today = new Date().toDateString();
    const date = new Date(dateString).toDateString();
    return today === date;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-rosae-black flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <CalendarDays className="w-8 h-8 text-rosae-red" />
              Follow-up Management
            </h2>
            <p className="text-gray-400">Track and manage customer follow-ups</p>
          </div>
          <Dialog open={isAddingFollowUp} onOpenChange={setIsAddingFollowUp}>
            <DialogTrigger asChild>
              <Button className="bg-rosae-red hover:bg-rosae-dark-red">
                <Plus className="w-4 h-4 mr-2" />
                Add Follow-up
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-rosae-dark-gray border-gray-600">
              <DialogHeader>
                <DialogTitle className="text-white">Schedule New Follow-up</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Customer Name *</Label>
                    <Input
                      value={newFollowUp.customerName}
                      onChange={(e) => setNewFollowUp({...newFollowUp, customerName: e.target.value})}
                      className="bg-gray-800 border-gray-600 text-white"
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Phone Number *</Label>
                    <Input
                      value={newFollowUp.phoneNumber}
                      onChange={(e) => setNewFollowUp({...newFollowUp, phoneNumber: e.target.value})}
                      className="bg-gray-800 border-gray-600 text-white"
                      placeholder="+91 9876543210"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Follow-up Date *</Label>
                    <Input
                      type="date"
                      value={newFollowUp.followUpDate}
                      onChange={(e) => setNewFollowUp({...newFollowUp, followUpDate: e.target.value})}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Priority</Label>
                    <Select value={newFollowUp.priority} onValueChange={(value: any) => setNewFollowUp({...newFollowUp, priority: value})}>
                      <SelectTrigger className="bg-gray-800 border-gray-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-300">Category</Label>
                  <Select value={newFollowUp.category} onValueChange={(value) => setNewFollowUp({...newFollowUp, category: value})}>
                    <SelectTrigger className="bg-gray-800 border-gray-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="support">Support</SelectItem>
                      <SelectItem value="complaint">Complaint</SelectItem>
                      <SelectItem value="feedback">Feedback</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-300">Follow-up Note *</Label>
                  <Textarea
                    value={newFollowUp.note}
                    onChange={(e) => setNewFollowUp({...newFollowUp, note: e.target.value})}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="Enter follow-up details..."
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={addFollowUp} className="bg-green-600 hover:bg-green-700">
                    Schedule Follow-up
                  </Button>
                  <Button onClick={() => setIsAddingFollowUp(false)} variant="outline" className="border-gray-600 text-gray-300">
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters and Search */}
        <Card className="bg-rosae-dark-gray border-gray-600 mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search by customer name, phone, or note..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32 bg-gray-800 border-gray-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-32 bg-gray-800 border-gray-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Follow-ups List */}
        <div className="space-y-4">
          {filteredFollowUps.length === 0 ? (
            <Card className="bg-rosae-dark-gray border-gray-600">
              <CardContent className="p-8 text-center">
                <CalendarDays className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No Follow-ups Found</h3>
                <p className="text-gray-400">
                  {searchTerm || statusFilter !== "all" || priorityFilter !== "all" 
                    ? "Try adjusting your search or filters" 
                    : "Schedule your first follow-up to get started"
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredFollowUps.map((followUp) => (
              <Card key={followUp.id} className="bg-rosae-dark-gray border-gray-600">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-rosae-red rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-white">{followUp.customerName}</h3>
                          <p className="text-gray-400 text-sm flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {followUp.phoneNumber}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <Badge className={getPriorityColor(followUp.priority)}>
                          {followUp.priority.charAt(0).toUpperCase() + followUp.priority.slice(1)} Priority
                        </Badge>
                        <Badge className={getStatusColor(followUp.status)}>
                          {followUp.status.charAt(0).toUpperCase() + followUp.status.slice(1)}
                        </Badge>
                        <Badge className={getCategoryColor(followUp.category)}>
                          {followUp.category.charAt(0).toUpperCase() + followUp.category.slice(1)}
                        </Badge>
                        {isOverdue(followUp.followUpDate, followUp.status) && (
                          <Badge className="bg-red-600/20 text-red-400 border-red-600/30">
                            Overdue
                          </Badge>
                        )}
                        {isToday(followUp.followUpDate) && followUp.status === 'pending' && (
                          <Badge className="bg-orange-600/20 text-orange-400 border-orange-600/30">
                            Due Today
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <Label className="text-gray-400 text-sm">Follow-up Date</Label>
                          <p className="text-white flex items-center gap-1">
                            <Calendar className="w-4 h-4 text-rosae-red" />
                            {formatDate(followUp.followUpDate)}
                          </p>
                        </div>
                        <div>
                          <Label className="text-gray-400 text-sm">Created By</Label>
                          <p className="text-white">{followUp.createdBy}</p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <Label className="text-gray-400 text-sm">Note</Label>
                        <p className="text-white">{followUp.note}</p>
                      </div>

                      <div className="text-xs text-gray-400">
                        Created: {formatDateTime(followUp.createdAt)}
                        {followUp.completedAt && (
                          <span className="ml-4">Completed: {formatDateTime(followUp.completedAt)}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        onClick={() => openWhatsApp(followUp.phoneNumber)}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        WhatsApp
                      </Button>
                      
                      {followUp.status === 'pending' && (
                        <>
                          <Button
                            onClick={() => updateFollowUpStatus(followUp.id, 'completed')}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Complete
                          </Button>
                          <Button
                            onClick={() => updateFollowUpStatus(followUp.id, 'cancelled')}
                            size="sm"
                            variant="outline"
                            className="border-gray-600 text-gray-300"
                          >
                            <AlertCircle className="w-4 h-4 mr-2" />
                            Cancel
                          </Button>
                        </>
                      )}
                      
                      <Button
                        onClick={() => deleteFollowUp(followUp.id)}
                        size="sm"
                        variant="outline"
                        className="border-red-600/50 text-red-400 hover:bg-red-600/20"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}