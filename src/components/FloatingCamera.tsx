'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, Maximize2, Minimize2, LogIn, LogOut } from 'lucide-react';

interface FloatingCameraProps {
  isActive: boolean;
  onStop: () => void;
  scanMode?: 'time-in' | 'time-out' | 'auto';
}

export default function FloatingCamera({ isActive, onStop, scanMode = 'auto' }: FloatingCameraProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: 100 });
  const [size, setSize] = useState({ width: 400, height: 300 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        
        // Keep within viewport bounds
        const boundedX = Math.max(0, Math.min(newX, window.innerWidth - size.width));
        const boundedY = Math.max(0, Math.min(newY, window.innerHeight - size.height));
        
        setPosition({ x: boundedX, y: boundedY });
      } else if (isResizing) {
        const newWidth = Math.max(300, e.clientX - position.x);
        const newHeight = Math.max(200, e.clientY - position.y);
        setSize({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, position, size]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
  };

  if (!isActive) return null;

  return (
    <div
      ref={containerRef}
      className={`fixed bg-white dark:bg-slate-800 border rounded-lg shadow-2xl z-50 ${
        isMaximized ? 'top-4 left-4 right-4 bottom-4 w-auto h-auto' : ''
      }`}
      style={
        !isMaximized
          ? {
              left: `${position.x}px`,
              top: `${position.y}px`,
              width: `${size.width}px`,
              height: isMinimized ? 'auto' : `${size.height}px`
            }
          : {}
      }
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 border-b cursor-move bg-gray-50 dark:bg-slate-700 rounded-t-lg"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="ml-2 text-sm font-medium">QR Scanner</span>
          
          {/* Scan Mode Indicator */}
          <div className="ml-auto mr-2 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
            {scanMode === 'time-in' && (
              <>
                <LogIn className="w-3 h-3" />
                <span>Time In</span>
              </>
            )}
            {scanMode === 'time-out' && (
              <>
                <LogOut className="w-3 h-3" />
                <span>Time Out</span>
              </>
            )}
            {scanMode === 'auto' && (
              <span>Auto</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-6 w-6 p-0"
          >
            {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMaximized(!isMaximized)}
            className="h-6 w-6 p-0"
          >
            <Maximize2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onStop}
            className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Camera Content */}
      {!isMinimized && (
        <div className="relative" style={{ height: isMaximized ? 'calc(100% - 48px)' : 'calc(100% - 48px)' }}>
          <div id="floating-reader" className="w-full h-full"></div>
          
          {/* Resize Handle */}
          {!isMaximized && (
            <div
              className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
              onMouseDown={handleResizeStart}
            >
              <div className="absolute bottom-1 right-1 w-2 h-2 border-r-2 border-b-2 border-gray-400"></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
