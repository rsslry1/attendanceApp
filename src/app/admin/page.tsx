'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { Trash2, RefreshCw, UserX } from 'lucide-react';

export default function AdminPage() {
  const [adminPassword, setAdminPassword] = useState('');
  const [instructorEmail, setInstructorEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleResetDatabase = async () => {
    if (!adminPassword) {
      toast({ title: 'Error', description: 'Admin password is required', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/reset-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword }),
      });

      if (res.ok) {
        const data = await res.json();
        toast({ 
          title: 'Success', 
          description: 'Database reset successfully. Admin account created.',
        });
        setAdminPassword('');
        
        // Show admin credentials
        alert(`Admin Account Created:\nEmail: ${data.adminAccount.email}\nPassword: ${data.adminAccount.password}`);
      } else {
        const error = await res.json();
        toast({ title: 'Error', description: error.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to reset database', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteInstructor = async () => {
    if (!adminPassword) {
      toast({ title: 'Error', description: 'Admin password is required', variant: 'destructive' });
      return;
    }

    if (!instructorEmail) {
      toast({ title: 'Error', description: 'Instructor email is required', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/delete-instructor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          password: adminPassword,
          instructorEmail: instructorEmail 
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast({ 
          title: 'Success', 
          description: data.message,
        });
        setInstructorEmail('');
      } else {
        const error = await res.json();
        toast({ title: 'Error', description: error.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete instructor', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-red-600 dark:text-red-400 mb-2">System Administration</h1>
          <p className="text-gray-600 dark:text-gray-400">Dangerous operations - use with caution</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Database Reset Card */}
          <Card className="border-red-200 dark:border-red-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <RefreshCw className="w-5 h-5" />
                Reset Database
              </CardTitle>
              <CardDescription>
                Delete ALL data and create a fresh admin account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
                <AlertDescription className="text-red-800 dark:text-red-200">
                  ⚠️ This will permanently delete ALL students, courses, attendance records, and instructor accounts!
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label htmlFor="admin-password-reset">Admin Password</Label>
                <Input
                  id="admin-password-reset"
                  type="password"
                  placeholder="Enter admin password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                />
              </div>

              <Button 
                onClick={handleResetDatabase}
                variant="destructive"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Reset Entire Database'}
              </Button>
            </CardContent>
          </Card>

          {/* Delete Instructor Card */}
          <Card className="border-orange-200 dark:border-orange-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                <UserX className="w-5 h-5" />
                Delete Instructor
              </CardTitle>
              <CardDescription>
                Delete a specific instructor and all their data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
                <AlertDescription className="text-orange-800 dark:text-orange-200">
                  ⚠️ This will delete the instructor account and all their courses, students, and attendance data!
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label htmlFor="admin-password-delete">Admin Password</Label>
                <Input
                  id="admin-password-delete"
                  type="password"
                  placeholder="Enter admin password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructor-email">Instructor Email</Label>
                <Input
                  id="instructor-email"
                  type="email"
                  placeholder="instructor@school.edu"
                  value={instructorEmail}
                  onChange={(e) => setInstructorEmail(e.target.value)}
                />
              </div>

              <Button 
                onClick={handleDeleteInstructor}
                variant="destructive"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Delete Instructor Account'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-600 dark:text-gray-400">Admin Credentials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>Admin Password:</strong> <code className="bg-gray-100 px-2 py-1 rounded">superadmin123</code></p>
              <p className="text-gray-600 dark:text-gray-400">
                After database reset, a default admin account will be created with:
              </p>
              <div className="ml-4 space-y-1">
                <p><strong>Email:</strong> admin@attendance.local</p>
                <p><strong>Password:</strong> admin123</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
