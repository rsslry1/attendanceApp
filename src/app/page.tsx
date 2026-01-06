'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import QRCode from 'qrcode';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { formatDate, formatTime, formatDateTime } from '@/lib/attendance';
import FloatingCamera from '@/components/FloatingCamera';
import ScanNotification from '@/components/ScanNotification';
import { Trash, Search } from 'lucide-react';

type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT';

interface User {
  id: string;
  email: string;
  name: string;
}

interface Student {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  email?: string;
  section: string;
  qrSecret: string;
}

interface Course {
  id: string;
  title: string;
  description?: string;
  schedule: string;
  room?: string;
  startTime: string;
  endTime: string;
  gracePeriod: number;
  allowTimeOut: boolean;
}

interface Attendance {
  id: string;
  courseId: string;
  studentId: string;
  courseTitle: string;
  studentName: string;
  section: string;
  date: string;
  status: AttendanceStatus;
  timeIn?: string;
  timeOut?: string;
}

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState<User | null>(null);
  
  // Authentication states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  // Student management states
  const [students, setStudents] = useState<Student[]>([]);
  const [studentDialog, setStudentDialog] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentForm, setStudentForm] = useState({
    studentId: '',
    firstName: '',
    lastName: '',
    email: '',
    section: '',
  });
  const [qrDialog, setQrDialog] = useState(false);
  const [qrImage, setQrImage] = useState('');
  
  // Student filtering states
  const [studentSearch, setStudentSearch] = useState('');
  const [studentSectionFilter, setStudentSectionFilter] = useState('all');

  // Course management states
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseDialog, setCourseDialog] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    schedule: '',
    room: '',
    startTime: '',
    endTime: '',
    gracePeriod: 15,
    allowTimeOut: false,
  });

  // Scanner states
  const [selectedCourse, setSelectedCourse] = useState('');
  const [scanResult, setScanResult] = useState('');
  const [scannerActive, setScannerActive] = useState(false);
  const [recentScans, setRecentScans] = useState<Attendance[]>([]);
  const [scannerInstance, setScannerInstance] = useState<Html5QrcodeScanner | null>(null);
  const [lastScanTime, setLastScanTime] = useState(0);
  const [scanNotification, setScanNotification] = useState<{
    studentName: string;
    section: string;
    courseTitle: string;
    date: string;
    time: string;
    status: string;
    isAlreadyPresent?: boolean;
  } | null>(null);
  const [scanMode, setScanMode] = useState<'time-in' | 'time-out' | 'auto'>('auto');

  // Attendance history states
  const [attendanceHistory, setAttendanceHistory] = useState<Attendance[]>([]);
  const [selectedCourseHistory, setSelectedCourseHistory] = useState('all');
  const [selectedStudentHistory, setSelectedStudentHistory] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  
  // Delete confirmation states
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState<Attendance | null>(null);
  const [deletePassword, setDeletePassword] = useState('');

  // Determine scan mode based on course settings
  const determineScanMode = async (courseId: string): Promise<'time-in' | 'time-out' | 'auto'> => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return 'auto';
    
    if (!course.allowTimeOut) {
      return 'time-in'; // Course only allows time-in
    }
    
    // For courses that allow time-out, we need to check if there are existing records
    // For now, we'll use 'auto' mode and let the API handle the logic
    return 'auto';
  };

  // Update scan mode when course changes
  useEffect(() => {
    if (selectedCourse) {
      determineScanMode(selectedCourse).then(setScanMode);
    } else {
      setScanMode('auto');
    }
  }, [selectedCourse, courses]);

  // Initialize
  useEffect(() => {
    const storedUser = localStorage.getItem('attendance_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
  }, []);

  // Load data when user is set (either from localStorage or login/register)
  useEffect(() => {
    if (user && isAuthenticated) {
      console.log('👤 User state updated, loading data for:', user.id);
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    console.log('🔄 Starting data fetch...');
    await Promise.all([
      fetchStudents(),
      fetchCourses(),
      fetchAttendanceHistory(),
    ]);
    // Wait a moment for state updates to complete
    setTimeout(() => {
      console.log('📈 Data fetch completed. Current state:');
      console.log('- Students:', students.length);
      console.log('- Courses:', courses.length);
      console.log('- Attendance History:', attendanceHistory.length);
    }, 100);
  };

  // Authentication functions
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      if (res.ok) {
        console.log('✅ Login successful, redirecting to dashboard and fetching data...');
        const userData = await res.json();
        setUser(userData);
        setIsAuthenticated(true);
        setActiveTab('dashboard');
        localStorage.setItem('attendance_user', JSON.stringify(userData));
        toast({ title: 'Success', description: 'Logged in successfully' });
      } else {
        const error = await res.json();
        toast({ title: 'Error', description: error.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Login failed', variant: 'destructive' });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: registerName,
          email: registerEmail,
          password: registerPassword,
        }),
      });

      if (res.ok) {
        console.log('✅ Registration successful, redirecting to dashboard and fetching data...');
        const userData = await res.json();
        setUser(userData);
        setIsAuthenticated(true);
        setActiveTab('dashboard');
        localStorage.setItem('attendance_user', JSON.stringify(userData));
        toast({ title: 'Success', description: 'Account created successfully' });
      } else {
        const error = await res.json();
        toast({ title: 'Error', description: error.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Registration failed', variant: 'destructive' });
    }
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('attendance_user');
    setStudents([]);
    setCourses([]);
    setAttendanceHistory([]);
    setRecentScans([]);
  };

  // Student management functions
  const fetchStudents = async () => {
    try {
      console.log('📚 fetchStudents called, user:', user);
      if (!user) {
        console.log('📚 No user found, skipping students fetch');
        setStudents([]);
        return;
      }
      
      console.log('📚 Fetching students for instructor:', user.id);
      const res = await fetch(`/api/students?instructorId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        console.log('📚 Students fetched:', data.length, 'students');
        setStudents(data);
      } else {
        console.error('❌ Failed to fetch students, status:', res.status);
      }
    } catch (error) {
      console.error('❌ Failed to fetch students:', error);
    }
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingStudent ? `/api/students/${editingStudent.id}` : '/api/students';
      const method = editingStudent ? 'PUT' : 'POST';

      const requestBody: any = { ...studentForm };
      if (!editingStudent && user) {
        requestBody.instructorId = user.id;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (res.ok) {
        await fetchStudents();
        setStudentDialog(false);
        setEditingStudent(null);
        setStudentForm({ studentId: '', firstName: '', lastName: '', email: '', section: '' });
        toast({ title: 'Success', description: `Student ${editingStudent ? 'updated' : 'created'} successfully` });
      } else {
        const error = await res.json();
        toast({ title: 'Error', description: error.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save student', variant: 'destructive' });
    }
  };

  const handleDeleteStudent = async (id: string) => {
    try {
      const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchStudents();
        toast({ title: 'Success', description: 'Student deleted successfully' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete student', variant: 'destructive' });
    }
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setStudentForm({
      studentId: student.studentId,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email || '',
      section: student.section,
    });
    setStudentDialog(true);
  };

  const handleOpenStudentDialog = () => {
    setEditingStudent(null);
    setStudentForm({ studentId: '', firstName: '', lastName: '', email: '', section: '' });
    setStudentDialog(true);
  };

  const handleShowQR = async (student: Student) => {
    try {
      const res = await fetch(`/api/students/${student.id}/qr`);
      if (res.ok) {
        const { qrCode } = await res.json();
        setQrImage(qrCode);
        setQrDialog(true);
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to generate QR code', variant: 'destructive' });
    }
  };

  // Course management functions
  const fetchCourses = async () => {
    try {
      if (!user) {
        setCourses([]);
        return;
      }
      
      console.log('📖 Fetching courses for instructor:', user.id);
      const res = await fetch(`/api/courses?instructorId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        console.log('📖 Courses fetched:', data.length, 'courses');
        setCourses(data);
      } else {
        console.error('❌ Failed to fetch courses, status:', res.status);
      }
    } catch (error) {
      console.error('❌ Failed to fetch courses:', error);
    }
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCourse ? `/api/courses/${editingCourse.id}` : '/api/courses';
      const method = editingCourse ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...courseForm, instructorId: user?.id }),
      });

      if (res.ok) {
        await fetchCourses();
        setCourseDialog(false);
        setEditingCourse(null);
        setCourseForm({
          title: '',
          description: '',
          schedule: '',
          room: '',
          startTime: '',
          endTime: '',
          gracePeriod: 15,
          allowTimeOut: false,
        });
        toast({ title: 'Success', description: `Course ${editingCourse ? 'updated' : 'created'} successfully` });
      } else {
        const error = await res.json();
        toast({ title: 'Error', description: error.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save course', variant: 'destructive' });
    }
  };

  const handleDeleteCourse = async (id: string) => {
    try {
      const res = await fetch(`/api/courses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchCourses();
        toast({ title: 'Success', description: 'Course deleted successfully' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete course', variant: 'destructive' });
    }
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setCourseForm({
      title: course.title,
      description: course.description || '',
      schedule: course.schedule,
      room: course.room || '',
      startTime: course.startTime,
      endTime: course.endTime,
      gracePeriod: course.gracePeriod,
      allowTimeOut: course.allowTimeOut,
    });
    setCourseDialog(true);
  };

  const handleOpenCourseDialog = () => {
    setEditingCourse(null);
    setCourseForm({
      title: '',
      description: '',
      schedule: '',
      room: '',
      startTime: '',
      endTime: '',
      gracePeriod: 15,
      allowTimeOut: false,
    });
    setCourseDialog(true);
  };

  // Scanner functions
  const startScanner = async () => {
    if (!selectedCourse) {
      toast({ title: 'Error', description: 'Please select a course first', variant: 'destructive' });
      return;
    }

    setScannerActive(true);
    
    // Wait for the floating camera to mount
    setTimeout(() => {
      const readerElement = document.getElementById('floating-reader');
      if (!readerElement) {
        console.error('Floating reader element not found');
        toast({ title: 'Error', description: 'Scanner initialization failed', variant: 'destructive' });
        setScannerActive(false);
        return;
      }
      
      const scanner = new Html5QrcodeScanner('floating-reader', { 
        fps: 10, 
        qrbox: 250,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      }, false);
      setScannerInstance(scanner);

      scanner.render(
        async (decodedText) => {
          await handleScan(decodedText);
        },
        (error) => {
          // Ignore scan errors
        }
      );
    }, 500);
  };

  const stopScanner = () => {
    if (scannerInstance) {
      try {
        scannerInstance.clear();
      } catch (error) {
        console.log('Scanner already stopped');
      }
      setScannerInstance(null);
    }
    setScannerActive(false);
  };

  const handleScan = async (qrData: string) => {
    if (!selectedCourse || !user) return;

    // Implement 1.5 second cooldown
    const currentTime = Date.now();
    if (currentTime - lastScanTime < 1500) {
      return; // Ignore scans within 1.5 seconds
    }

    try {
      const res = await fetch('/api/attendance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrData,
          courseId: selectedCourse,
          instructorId: user.id,
        }),
      });

      if (res.ok) {
        const attendance = await res.json();
        setScanResult(attendance.message);
        
        // Check if this scan already exists in recentScans to avoid duplicates
        const existingScanIndex = recentScans.findIndex(scan => scan.id === attendance.id);
        let updatedRecentScans;
        if (existingScanIndex !== -1) {
          // Update existing scan
          updatedRecentScans = [...recentScans];
          updatedRecentScans[existingScanIndex] = attendance;
        } else {
          // Add new scan
          updatedRecentScans = [attendance, ...recentScans].slice(0, 10);
        }
        setRecentScans(updatedRecentScans);
        
        // Update last scan time
        setLastScanTime(currentTime);
        
        // Show overlay notification
        const course = courses.find(c => c.id === selectedCourse);
        const scanDateTime = new Date();
        const dateStr = scanDateTime.toLocaleDateString();
        const timeStr = scanDateTime.toLocaleTimeString();
        
        // Determine if this was time-in or time-out
        const isTimeOut = attendance.timeOut && new Date(attendance.timeOut).getTime() === new Date(attendance.timeIn).getTime();
        const scanType = isTimeOut ? 'Time Out' : 'Time In';
        
        // Check if student is already present based on the message
        const isAlreadyPresent = attendance.message && (
          attendance.message.includes('already scanned in today') || 
          attendance.message.includes('already scanned out today')
        );
        
        setScanNotification({
          studentName: attendance.studentName,
          section: attendance.section,
          courseTitle: course?.title || 'Unknown',
          date: dateStr,
          time: timeStr,
          status: isAlreadyPresent ? 'Already Present' : `${scanType} - ${attendance.status}`,
          isAlreadyPresent
        });
        
        // Also show a simple toast for quick feedback
        toast({ 
          title: isAlreadyPresent ? 'Student Already Present' : 'Attendance Recorded', 
          description: attendance.message || `${attendance.studentName} - ${attendance.status}`,
          variant: isAlreadyPresent ? 'destructive' : 'default',
          duration: 2000
        });
      } else {
        const error = await res.json();
        setScanResult(error.error || 'Scan failed');
        toast({ title: 'Scan Failed', description: error.error || 'Invalid QR code', variant: 'destructive' });
      }
    } catch (error) {
      setScanResult('Scan failed');
      toast({ title: 'Scan Error', description: 'Network error occurred', variant: 'destructive' });
    }
  };

  // Attendance history functions
  const fetchAttendanceHistory = async () => {
    try {
      if (!user) {
        setAttendanceHistory([]);
        return;
      }
      
      console.log('📊 Fetching attendance history for instructor:', user.id);
      let url = '/api/attendance';
      const params = new URLSearchParams();
      params.append('instructorId', user.id);
      if (selectedCourseHistory && selectedCourseHistory !== 'all') params.append('courseId', selectedCourseHistory);
      if (selectedStudentHistory && selectedStudentHistory !== 'all') params.append('studentId', selectedStudentHistory);
      if (filterDate) params.append('date', filterDate);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        console.log('📊 Attendance history fetched:', data.length, 'records');
        setAttendanceHistory(data);
      } else {
        console.error('❌ Failed to fetch attendance history, status:', res.status);
      }
    } catch (error) {
      console.error('❌ Failed to fetch attendance:', error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAttendanceHistory();
    }
  }, [selectedCourseHistory, selectedStudentHistory, filterDate]);

  // Fetch attendance history when switching to history tab
  useEffect(() => {
    if (isAuthenticated && activeTab === 'history') {
      fetchAttendanceHistory();
    }
  }, [activeTab]);

  // Fetch students when switching to students tab
  useEffect(() => {
    if (isAuthenticated && activeTab === 'students') {
      fetchStudents();
    }
  }, [activeTab]);

  // Fetch courses when switching to courses tab
  useEffect(() => {
    if (isAuthenticated && activeTab === 'courses') {
      fetchCourses();
    }
  }, [activeTab]);

  // Cleanup scanner on component unmount
  useEffect(() => {
    return () => {
      if (scannerInstance) {
        try {
          scannerInstance.clear();
        } catch (error) {
          console.log('Scanner cleanup on unmount');
        }
      }
    };
  }, [scannerInstance]);

  // Export functions
  const handleExportExcel = async () => {
    try {
      const res = await fetch('/api/attendance/export/excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: selectedCourseHistory === 'all' ? undefined : selectedCourseHistory,
          studentId: selectedStudentHistory === 'all' ? undefined : selectedStudentHistory,
          date: filterDate,
        }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
        toast({ title: 'Success', description: 'Excel file downloaded' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Export failed', variant: 'destructive' });
    }
  };

  const handleExportPDF = async () => {
    try {
      const res = await fetch('/api/attendance/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: selectedCourseHistory === 'all' ? undefined : selectedCourseHistory,
          studentId: selectedStudentHistory === 'all' ? undefined : selectedStudentHistory,
          date: filterDate,
        }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_${new Date().toISOString().split('T')[0]}.pdf`;
        a.click();
        toast({ title: 'Success', description: 'PDF file downloaded' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Export failed', variant: 'destructive' });
    }
  };

  const handleDeleteAttendance = async () => {
    if (!selectedAttendance || !deletePassword) return;

    try {
      const res = await fetch(`/api/attendance/${selectedAttendance.id}?password=${encodeURIComponent(deletePassword)}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchAttendanceHistory();
        setDeleteDialog(false);
        setSelectedAttendance(null);
        setDeletePassword('');
        toast({ title: 'Success', description: 'Attendance record deleted successfully' });
      } else {
        const error = await res.json();
        toast({ title: 'Error', description: error.error || 'Failed to delete attendance record', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete attendance record', variant: 'destructive' });
    }
  };

  const openDeleteDialog = (attendance: Attendance) => {
    setSelectedAttendance(attendance);
    setDeletePassword('');
    setDeleteDialog(true);
  };

  // Get unique sections for filtering
  const getUniqueSections = () => {
    const sections = [...new Set(students.map(student => student.section))];
    return sections.sort();
  };

  // Filter students based on search and section filter
  const getFilteredStudents = () => {
    return students.filter(student => {
      const matchesSearch = studentSearch === '' || 
        student.studentId.toLowerCase().includes(studentSearch.toLowerCase()) ||
        student.firstName.toLowerCase().includes(studentSearch.toLowerCase()) ||
        student.lastName.toLowerCase().includes(studentSearch.toLowerCase()) ||
        `${student.firstName} ${student.lastName}`.toLowerCase().includes(studentSearch.toLowerCase()) ||
        (student.email && student.email.toLowerCase().includes(studentSearch.toLowerCase()));
      
      const matchesSection = studentSectionFilter === 'all' || student.section === studentSectionFilter;
      
      return matchesSearch && matchesSection;
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex flex-col items-center space-y-3">
              <img 
                src="/ICAS Logo Blue TRBG White Logo BG v2.png" 
                alt="Present ko sir! Logo" 
                className="h-12 w-auto"
              />
              <div className="text-center">
                <CardTitle className="text-2xl font-bold">Present ko sir!</CardTitle>
                <CardDescription>
                  QR Code Attendance System
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="instructor@school.edu"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Sign In
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Full Name</Label>
                    <Input
                      id="register-name"
                      placeholder="Dr. John Smith"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="instructor@school.edu"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Create Account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src="/ICAS Logo Blue TRBG White Logo BG v2.png" 
              alt="Present ko sir! Logo" 
              className="h-8 w-auto"
            />
            <div>
              <h1 className="text-2xl font-bold">Present ko sir!</h1>
              <p className="text-sm text-muted-foreground">Welcome, {user?.name}</p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="outline">
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="scanner">Scanner</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard">
            <div className="grid gap-6 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{students.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{courses.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today's Scans</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {attendanceHistory.filter(a => 
                      a.date === new Date().toISOString().split('T')[0]
                    ).length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Recent Scans</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{recentScans.length}</div>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Recent Attendance Scans</CardTitle>
              </CardHeader>
              <CardContent>
                {recentScans.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No scans recorded yet</p>
                ) : (
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {recentScans.map((scan) => (
                        <div key={`dashboard-scan-${scan.id}-${scan.date}`} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{scan.studentName}</p>
                            <p className="text-sm text-muted-foreground">{scan.courseTitle}</p>
                          </div>
                          <Badge variant={scan.status === 'PRESENT' ? 'default' : 'secondary'}>
                            {scan.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Students</CardTitle>
                    <CardDescription>Manage students and their QR codes</CardDescription>
                  </div>
                  <Dialog open={studentDialog} onOpenChange={setStudentDialog}>
                    <DialogTrigger asChild>
                      <Button onClick={handleOpenStudentDialog}>Add Student</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingStudent ? 'Edit Student' : 'Add New Student'}</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleSaveStudent} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="student-id">Student ID</Label>
                          <Input
                            id="student-id"
                            placeholder="2024001"
                            value={studentForm.studentId}
                            onChange={(e) => setStudentForm({ ...studentForm, studentId: e.target.value })}
                            required
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="first-name">First Name</Label>
                            <Input
                              id="first-name"
                              value={studentForm.firstName}
                              onChange={(e) => setStudentForm({ ...studentForm, firstName: e.target.value })}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="last-name">Last Name</Label>
                            <Input
                              id="last-name"
                              value={studentForm.lastName}
                              onChange={(e) => setStudentForm({ ...studentForm, lastName: e.target.value })}
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email (Optional)</Label>
                          <Input
                            id="email"
                            type="email"
                            value={studentForm.email}
                            onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="section">Section</Label>
                          <Input
                            id="section"
                            placeholder="CS-A"
                            value={studentForm.section}
                            onChange={(e) => setStudentForm({ ...studentForm, section: e.target.value })}
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full">
                          {editingStudent ? 'Update' : 'Create'} Student
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filter Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="student-search">Search Students</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="student-search"
                        placeholder="Search by ID, name, or email..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="section-filter">Filter by Section</Label>
                    <Select value={studentSectionFilter} onValueChange={setStudentSectionFilter}>
                      <SelectTrigger id="section-filter">
                        <SelectValue placeholder="All sections" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All sections</SelectItem>
                        {getUniqueSections().map((section) => (
                          <SelectItem key={section} value={section}>
                            {section}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredStudents().map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>{student.studentId}</TableCell>
                        <TableCell>{`${student.firstName} ${student.lastName}`}</TableCell>
                        <TableCell>{student.section}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleShowQR(student)}
                            >
                              QR Code
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditStudent(student)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteStudent(student.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {getFilteredStudents().length === 0 && students.length > 0 && (
                  <p className="text-muted-foreground text-center py-8">No students match your search criteria</p>
                )}
                {students.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">No students added yet</p>
                )}
              </CardContent>
            </Card>

            {/* QR Code Dialog */}
            <Dialog open={qrDialog} onOpenChange={setQrDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Student QR Code</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center space-y-4">
                  {qrImage && (
                    <img src={qrImage} alt="QR Code" className="border p-4 rounded-lg" />
                  )}
                  <p className="text-sm text-muted-foreground text-center">
                    Scan this QR code to record attendance
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="courses">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Courses</CardTitle>
                    <CardDescription>Manage courses and schedules</CardDescription>
                  </div>
                  <Dialog open={courseDialog} onOpenChange={setCourseDialog}>
                    <DialogTrigger asChild>
                      <Button onClick={handleOpenCourseDialog}>Add Course</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>{editingCourse ? 'Edit Course' : 'Add New Course'}</DialogTitle>
                      </DialogHeader>
                      <ScrollArea className="max-h-[70vh]">
                        <form onSubmit={handleSaveCourse} className="space-y-4 p-4">
                          <div className="space-y-2">
                            <Label htmlFor="course-title">Course Title</Label>
                            <Input
                              id="course-title"
                              placeholder="IT 101"
                              value={courseForm.title}
                              onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="course-description">Description</Label>
                            <Textarea
                              id="course-description"
                              placeholder="Introduction to Information Technology"
                              value={courseForm.description}
                              onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="course-schedule">Schedule</Label>
                            <Input
                              id="course-schedule"
                              placeholder="MWF 9:00-10:00 AM"
                              value={courseForm.schedule}
                              onChange={(e) => setCourseForm({ ...courseForm, schedule: e.target.value })}
                              required
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="course-room">Room</Label>
                              <Input
                                id="course-room"
                                placeholder="Room 101"
                                value={courseForm.room}
                                onChange={(e) => setCourseForm({ ...courseForm, room: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="grace-period">Grace Period (minutes)</Label>
                              <Input
                                id="grace-period"
                                type="number"
                                min="0"
                                value={courseForm.gracePeriod}
                                onChange={(e) => setCourseForm({ ...courseForm, gracePeriod: parseInt(e.target.value) })}
                                required
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="start-time">Start Time</Label>
                              <Input
                                id="start-time"
                                type="time"
                                value={courseForm.startTime}
                                onChange={(e) => setCourseForm({ ...courseForm, startTime: e.target.value })}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="end-time">End Time</Label>
                              <Input
                                id="end-time"
                                type="time"
                                value={courseForm.endTime}
                                onChange={(e) => setCourseForm({ ...courseForm, endTime: e.target.value })}
                                required
                              />
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="allow-timeout"
                              checked={courseForm.allowTimeOut}
                              onChange={(e) => setCourseForm({ ...courseForm, allowTimeOut: e.target.checked })}
                              className="rounded"
                            />
                            <Label htmlFor="allow-timeout">Allow Time-Out Scanning</Label>
                          </div>
                          <Button type="submit" className="w-full">
                            {editingCourse ? 'Update' : 'Create'} Course
                          </Button>
                        </form>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>Grace Period</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courses.map((course) => (
                      <TableRow key={course.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{course.title}</p>
                            <p className="text-sm text-muted-foreground">{course.description}</p>
                          </div>
                        </TableCell>
                        <TableCell>{course.schedule}</TableCell>
                        <TableCell>{course.room || '-'}</TableCell>
                        <TableCell>{course.gracePeriod} min</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditCourse(course)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteCourse(course.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Scanner Tab */}
          <TabsContent value="scanner">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>QR Code Scanner</CardTitle>
                  <CardDescription>Scan student QR codes to record attendance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="course-select">Select Course</Label>
                    <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                      <SelectTrigger id="course-select">
                        <SelectValue placeholder="Choose a course" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.title} - {course.schedule}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    {!scannerActive ? (
                      <Button onClick={startScanner} disabled={!selectedCourse}>
                        Start Scanner
                      </Button>
                    ) : (
                      <Button onClick={stopScanner} variant="destructive">
                        Stop Scanner
                      </Button>
                    )}
                  </div>

                  {scanResult && (
                    <Alert>
                      <AlertDescription>{scanResult}</AlertDescription>
                    </Alert>
                  )}

                  {scannerActive && (
                    <div className="mt-4">
                      <div id="reader" className="w-full max-w-md mx-auto"></div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {recentScans.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Scans - This Session</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <div className="space-y-2">
                        {recentScans.map((scan) => (
                          <div key={`scanner-scan-${scan.id}-${scan.date}`} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">{scan.studentName}</p>
                              <p className="text-sm text-muted-foreground">{scan.courseTitle}</p>
                              <p className="text-xs text-muted-foreground">{scan.section}</p>
                            </div>
                            <div className="text-right">
                              <Badge variant={scan.status === 'PRESENT' ? 'default' : 'secondary'}>
                                {scan.status}
                              </Badge>
                              {scan.timeIn && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  In: {formatTime(new Date(scan.timeIn))}
                                </p>
                              )}
                              {scan.timeOut && (
                                <p className="text-sm text-muted-foreground">
                                  Out: {formatTime(new Date(scan.timeOut))}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Attendance History</CardTitle>
                    <CardDescription>View and export attendance records</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleExportExcel} variant="outline">
                      Export Excel
                    </Button>
                    <Button onClick={handleExportPDF} variant="outline">
                      Export PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="filter-course">Filter by Course</Label>
                    <Select value={selectedCourseHistory} onValueChange={setSelectedCourseHistory}>
                      <SelectTrigger id="filter-course">
                        <SelectValue placeholder="All courses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All courses</SelectItem>
                        {courses.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="filter-student">Filter by Student</Label>
                    <Select value={selectedStudentHistory} onValueChange={setSelectedStudentHistory}>
                      <SelectTrigger id="filter-student">
                        <SelectValue placeholder="All students" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All students</SelectItem>
                        {students.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.firstName} {student.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="filter-date">Filter by Date</Label>
                    <Input
                      id="filter-date"
                      type="date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                    />
                  </div>
                </div>

                <ScrollArea className="h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Section</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Time In</TableHead>
                        <TableHead>Time Out</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceHistory.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>{formatDate(new Date(record.date))}</TableCell>
                          <TableCell>{record.studentName}</TableCell>
                          <TableCell>{record.courseTitle}</TableCell>
                          <TableCell>{record.section}</TableCell>
                          <TableCell>
                            <Badge variant={record.status === 'PRESENT' ? 'default' : 'secondary'}>
                              {record.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {record.timeIn ? formatTime(new Date(record.timeIn)) : '-'}
                          </TableCell>
                          <TableCell>
                            {record.timeOut ? formatTime(new Date(record.timeOut)) : '-'}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openDeleteDialog(record)}
                            >
                              <Trash className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {attendanceHistory.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">No attendance records found</p>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Floating Camera */}
      <FloatingCamera 
        isActive={scannerActive} 
        onStop={stopScanner}
        scanMode={scanMode}
      />

      {/* Scan Notification Overlay */}
      <ScanNotification
        show={!!scanNotification}
        onClose={() => setScanNotification(null)}
        data={scanNotification}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Attendance Record</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Please enter the admin password to delete this attendance record.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="delete-password">Admin Password</Label>
              <Input
                id="delete-password"
                type="password"
                placeholder="Enter password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                required
              />
            </div>
            {selectedAttendance && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm font-medium mb-2">Record to be deleted:</p>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <p><strong>Student:</strong> {selectedAttendance.studentName}</p>
                  <p><strong>Course:</strong> {selectedAttendance.courseTitle}</p>
                  <p><strong>Date:</strong> {formatDate(new Date(selectedAttendance.date))}</p>
                  <p><strong>Status:</strong> {selectedAttendance.status}</p>
                </div>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteDialog(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteAttendance}
                disabled={!deletePassword}
              >
                Delete Record
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm mt-auto">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          Present ko sir! © {new Date().getFullYear()} - QR Code Attendance System
        </div>
      </footer>
    </div>
  );
}
