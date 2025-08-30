import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Shield, User, Clock, Plus, Eye, Trash2, Edit, EyeOff } from "lucide-react";

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: 'admin' | 'employee';
  createdAt?: string;
  updatedAt?: string;
}

interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'employee';
}

export default function UserManagement() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createUserData, setCreateUserData] = useState<CreateUserData>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'employee'
  });
  const [showPassword, setShowPassword] = useState(false);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isAuthenticated && user?.role === 'admin',
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: CreateUserData) => {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create user');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User created successfully",
        description: "The new user account has been created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsCreateDialogOpen(false);
      setCreateUserData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        role: 'employee'
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete user');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User deleted successfully",
        description: "The user account has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate(createUserData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-rosae-black flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';

  if (!isAdmin) {
    return (
      <Layout>
        <div className="p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="bg-rosae-dark-gray border-gray-600 max-w-md">
              <CardContent className="p-8 text-center">
                <Shield className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Access Restricted</h3>
                <p className="text-gray-400">
                  You need administrator privileges to access user management features.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">User Management</h2>
            <p className="text-gray-400">Create and manage employee accounts</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-rosae-red hover:bg-rosae-red/90">
                <Plus className="w-4 h-4 mr-2" />
                Create Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-rosae-dark-gray border-gray-600">
              <DialogHeader>
                <DialogTitle className="text-white">Create New Employee Account</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Add a new employee to the system with their login credentials.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName" className="text-white">First Name</Label>
                    <Input
                      id="firstName"
                      value={createUserData.firstName}
                      onChange={(e) => setCreateUserData({ ...createUserData, firstName: e.target.value })}
                      required
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-white">Last Name</Label>
                    <Input
                      id="lastName"
                      value={createUserData.lastName}
                      onChange={(e) => setCreateUserData({ ...createUserData, lastName: e.target.value })}
                      required
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email" className="text-white">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={createUserData.email}
                    onChange={(e) => setCreateUserData({ ...createUserData, email: e.target.value })}
                    required
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                                 <div>
                   <Label htmlFor="password" className="text-white">Password</Label>
                   <div className="relative">
                     <Input
                       id="password"
                       type={showPassword ? "text" : "password"}
                       value={createUserData.password}
                       onChange={(e) => setCreateUserData({ ...createUserData, password: e.target.value })}
                       required
                       className="bg-gray-800 border-gray-600 text-white pr-12"
                     />
                     <button
                       type="button"
                       className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-300 transition-colors"
                       onClick={() => setShowPassword(!showPassword)}
                     >
                       {showPassword ? (
                         <EyeOff className="h-5 w-5" />
                       ) : (
                         <Eye className="h-5 w-5" />
                       )}
                     </button>
                   </div>
                 </div>
                <div>
                  <Label htmlFor="role" className="text-white">Role</Label>
                  <Select
                    value={createUserData.role}
                    onValueChange={(value: 'admin' | 'employee') => 
                      setCreateUserData({ ...createUserData, role: value })
                    }
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createUserMutation.isPending}
                    className="bg-rosae-red hover:bg-rosae-red/90"
                  >
                    {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Users Table */}
        <Card className="bg-rosae-dark-gray border-gray-600">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Users className="w-5 h-5 mr-2" />
              All Users ({users.length})
            </CardTitle>
            <CardDescription className="text-gray-400">
              Manage user accounts and their permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="text-center py-8">
                <div className="text-gray-400">Loading users...</div>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">No users found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-600">
                      <TableHead className="text-gray-300">User</TableHead>
                      <TableHead className="text-gray-300">Email</TableHead>
                      <TableHead className="text-gray-300">Role</TableHead>
                      <TableHead className="text-gray-300">Created</TableHead>
                      <TableHead className="text-gray-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} className="border-gray-600">
                        <TableCell className="text-white">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-rosae-red/20 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-rosae-red" />
                            </div>
                            <div>
                              <div className="font-medium">
                                {user.firstName && user.lastName 
                                  ? `${user.firstName} ${user.lastName}`
                                  : 'Unknown User'
                                }
                              </div>
                              <div className="text-sm text-gray-400">ID: {user.id}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-white">{user.email}</TableCell>
                        <TableCell>
                          <Badge 
                            className={user.role === 'admin' 
                              ? 'bg-red-500/20 text-red-400' 
                              : 'bg-blue-500/20 text-blue-400'
                            }
                          >
                            {user.role === 'admin' ? 'Administrator' : 'Employee'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-400">
                          {user.createdAt ? formatDate(user.createdAt) : 'Unknown'}
                        </TableCell>
                                                 <TableCell>
                           <div className="flex items-center space-x-2">
                             <Button
                               size="sm"
                               variant="outline"
                               className="border-gray-600 text-gray-300 hover:bg-gray-700"
                               onClick={() => {
                                 // Show user details in a modal or alert
                                 const userDetails = `
Name: ${user.firstName} ${user.lastName}
Email: ${user.email}
Role: ${user.role}
ID: ${user.id}
Created: ${user.createdAt ? formatDate(user.createdAt) : 'Unknown'}
                                 `.trim();
                                 
                                 toast({
                                   title: "User Details",
                                   description: userDetails,
                                 });
                               }}
                             >
                               <Eye className="w-4 h-4" />
                             </Button>
                             <Button
                               size="sm"
                               variant="outline"
                               className="border-gray-600 text-gray-300 hover:bg-gray-700"
                               onClick={() => {
                                 // For now, just show a message. In the future, this could open an edit modal
                                 toast({
                                   title: "Edit User",
                                   description: `Edit functionality for ${user.firstName} ${user.lastName} will be implemented soon.`,
                                 });
                               }}
                             >
                               <Edit className="w-4 h-4" />
                             </Button>
                             <Button
                               size="sm"
                               variant="outline"
                               className="border-red-600 text-red-400 hover:bg-red-600/20"
                               onClick={() => {
                                 if (user.role === 'admin') {
                                   toast({
                                     title: "Cannot Delete Admin",
                                     description: "Admin users cannot be deleted",
                                     variant: "destructive",
                                   });
                                   return;
                                 }
                                 
                                 if (confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}? This action cannot be undone.`)) {
                                   deleteUserMutation.mutate(user.id);
                                 }
                               }}
                               disabled={deleteUserMutation.isPending}
                             >
                               <Trash2 className="w-4 h-4" />
                             </Button>
                           </div>
                         </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Admin Capabilities */}
        <Card className="bg-rosae-dark-gray border-gray-600 mt-6">
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-rosae-red" />
              Administrator Capabilities
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">User Management</h4>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                    Create new employee accounts
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                    View all user records and activities
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                    Manage user roles and permissions
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                    Monitor employee performance
                  </li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Data Access</h4>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                    View all bookings from all employees
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                    Access all expense records
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                    Generate comprehensive reports
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                    Export data for analysis
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
