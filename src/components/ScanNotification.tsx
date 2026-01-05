'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle, User, Calendar, Clock, BookOpen, Award, AlertTriangle } from 'lucide-react';

interface ScanNotificationProps {
  show: boolean;
  onClose: () => void;
  data: {
    studentName: string;
    section: string;
    courseTitle: string;
    date: string;
    time: string;
    status: string;
    isAlreadyPresent?: boolean;
  } | null;
}

export default function ScanNotification({ show, onClose, data }: ScanNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show && data) {
      setIsVisible(true);
      // Auto-close after 3 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          onClose();
        }, 300); // Allow fade out animation
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [show, data, onClose]);

  if (!show || !data) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      {/* Backdrop */}
      <div className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`} />
      
      {/* Notification Card */}
      <div className={`relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all duration-300 pointer-events-auto ${
        isVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'
      }`}>
        {/* Close Button */}
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onClose(), 300);
          }}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        {/* Success/Warning Icon */}
        <div className="flex items-center justify-center mb-6">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
            data.isAlreadyPresent 
              ? 'bg-orange-100 dark:bg-orange-900' 
              : 'bg-green-100 dark:bg-green-900'
          }`}>
            {data.isAlreadyPresent ? (
              <AlertTriangle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            ) : (
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            )}
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {data.isAlreadyPresent ? 'Student Already Present' : 'Attendance Scanned Successfully'}
          </h2>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            data.isAlreadyPresent 
              ? 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200'
              : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
          }`}>
            {data.status}
          </div>
        </div>

        {/* Details Grid */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Student</p>
              <p className="font-semibold text-gray-900 dark:text-white">{data.studentName}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Course & Section</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {data.courseTitle} - {data.section}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Date</p>
              <p className="font-semibold text-gray-900 dark:text-white">{data.date}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-900 rounded-full flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Time</p>
              <p className="font-semibold text-gray-900 dark:text-white">{data.time}</p>
            </div>
          </div>
        </div>

        {/* Success/Warning Message */}
        <div className={`mt-6 p-4 rounded-lg border ${
          data.isAlreadyPresent 
            ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
            : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
        }`}>
          <div className="flex items-center justify-center space-x-2">
            {data.isAlreadyPresent ? (
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            ) : (
              <Award className="w-5 h-5 text-green-600 dark:text-green-400" />
            )}
            <p className={`font-medium ${
              data.isAlreadyPresent 
                ? 'text-orange-800 dark:text-orange-200'
                : 'text-green-800 dark:text-green-200'
            }`}>
              {data.isAlreadyPresent ? 'Student has already been marked present today' : 'Attendance recorded successfully'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
