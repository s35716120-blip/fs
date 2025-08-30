import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const user = await response.json();
        toast({
          title: "Login successful",
          description: `Welcome back, ${user.firstName}!`,
        });
        
        // Invalidate the auth query to force a refresh
        queryClient.invalidateQueries({ queryKey: ["/api/auth/status"] });
        
        // Small delay to ensure the query is invalidated before redirecting
        setTimeout(() => {
          setLocation('/');
        }, 100);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
         <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 relative overflow-hidden">
       {/* Background decorative elements */}
       <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
       <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-red-50/30 via-transparent to-blue-50/30" />
       
       {/* Metallic ring background elements */}
       <div className="absolute top-10 left-10 w-24 h-24 border-2 border-gray-300/20 rounded-full animate-spin-slow" />
       <div className="absolute top-32 right-16 w-16 h-16 border border-gray-400/30 rounded-full animate-pulse" />
       <div className="absolute bottom-16 left-32 w-20 h-20 border-2 border-red-300/40 rounded-full animate-spin-slow-reverse" />
       
       {/* Floating elements */}
       <div className="absolute top-20 left-20 w-32 h-32 bg-red-100 rounded-full blur-3xl opacity-30 animate-pulse" />
       <div className="absolute bottom-20 right-20 w-40 h-40 bg-blue-100 rounded-full blur-3xl opacity-30 animate-pulse delay-1000" />
       
       {/* Additional decorative rings */}
       <div className="absolute top-1/4 right-1/4 w-12 h-12 border border-gray-200/50 rounded-full animate-bounce" />
       <div className="absolute bottom-1/3 left-1/6 w-8 h-8 bg-gradient-to-br from-red-200 to-red-300 rounded-full opacity-60 animate-pulse delay-500" />
      
      <div className="w-full max-w-md relative z-10">
        <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-2xl">
          <CardHeader className="text-center pb-8">
                         {/* Brand Logo */}
             <div className="flex justify-center mb-6">
               <div className="relative">
                 {/* Metallic ring */}
                 <div className="w-20 h-20 border-4 border-gray-300 rounded-full flex items-center justify-center shadow-lg bg-gradient-to-br from-gray-100 to-gray-200">
                   {/* Inner ring */}
                   <div className="w-16 h-16 border-2 border-gray-400 rounded-full flex items-center justify-center bg-white">
                     {/* Red "r" */}
                     <span className="text-red-500 text-2xl font-bold tracking-tight">r</span>
                   </div>
                 </div>
                 {/* Subtle shadow */}
                 <div className="absolute inset-0 w-20 h-20 rounded-full bg-black/5 blur-sm -z-10" />
               </div>
             </div>
            
            <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
              Welcome to ROSAE
            </CardTitle>
            <CardDescription className="text-gray-600 text-base">
              Theatre Management System
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email Address
                </Label>
                                 <div className="relative">
                   <Input
                     id="email"
                     type="email"
                     placeholder="Enter your email"
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     required
                     disabled={isLoading}
                     className="h-12 pr-12 border-gray-200 focus:border-red-500 focus:ring-red-500/20 transition-colors"
                   />
                   <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                     <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                     </svg>
                   </div>
                 </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                                 <div className="relative">
                   <Input
                     id="password"
                     type={showPassword ? "text" : "password"}
                     placeholder="Enter your password"
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     required
                     disabled={isLoading}
                     className="h-12 pr-12 border-gray-200 focus:border-red-500 focus:ring-red-500/20 transition-colors"
                   />
                   <button
                     type="button"
                     className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
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

              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium text-base shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Logging in...</span>
                  </div>
                ) : (
                  <span>Log in</span>
                )}
              </Button>
            </form>

            <div className="text-center">
              <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-6" />
              <p className="text-sm text-gray-500">
                Don't have an account?{' '}
                <span className="text-red-600 font-medium">Contact your administrator</span>
              </p>
            </div>
          </CardContent>
        </Card>
        
        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-400">
            © 2024 ROSAE Theatre Management. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}