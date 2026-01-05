import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Admin password - in production, use proper authentication
const ADMIN_PASSWORD = 'superadmin123';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid admin password' }, { status: 401 });
    }

    // Delete all data in correct order to respect foreign key constraints
    await db.attendance.deleteMany({});
    await db.enrollment.deleteMany({});
    await db.student.deleteMany({});
    await db.course.deleteMany({});
    await db.user.deleteMany({});

    // Create a default admin account
    const { hashPassword } = await import('@/lib/crypto');
    const hashedPassword = await hashPassword('admin123');
    
    const adminUser = await db.user.create({
      data: {
        email: 'admin@attendance.local',
        password: hashedPassword,
        name: 'System Administrator',
      },
    });

    return NextResponse.json({ 
      message: 'Database reset successfully',
      adminAccount: {
        email: 'admin@attendance.local',
        password: 'admin123',
        name: 'System Administrator'
      }
    });
  } catch (error) {
    console.error('Database reset error:', error);
    return NextResponse.json({ error: 'Failed to reset database' }, { status: 500 });
  }
}
