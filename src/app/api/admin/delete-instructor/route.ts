import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Admin password - in production, use proper authentication
const ADMIN_PASSWORD = 'superadmin123';

export async function POST(req: NextRequest) {
  try {
    const { password, instructorEmail } = await req.json();

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid admin password' }, { status: 401 });
    }

    if (!instructorEmail) {
      return NextResponse.json({ error: 'Instructor email is required' }, { status: 400 });
    }

    // Find the instructor
    const instructor = await db.user.findUnique({
      where: { email: instructorEmail },
    });

    if (!instructor) {
      return NextResponse.json({ error: 'Instructor not found' }, { status: 404 });
    }

    // Delete instructor's data in correct order
    // 1. Delete attendance records for instructor's courses
    const instructorCourses = await db.course.findMany({
      where: { instructorId: instructor.id },
      select: { id: true }
    });

    if (instructorCourses.length > 0) {
      await db.attendance.deleteMany({
        where: {
          courseId: {
            in: instructorCourses.map(course => course.id)
          }
        }
      });

      // 2. Delete enrollments for instructor's courses
      await db.enrollment.deleteMany({
        where: {
          courseId: {
            in: instructorCourses.map(course => course.id)
          }
        }
      });

      // 3. Delete instructor's courses
      await db.course.deleteMany({
        where: { instructorId: instructor.id }
      });
    }

    // 4. Delete the instructor account
    await db.user.delete({
      where: { id: instructor.id }
    });

    return NextResponse.json({ 
      message: `Instructor ${instructorEmail} and all their data have been deleted successfully` 
    });
  } catch (error) {
    console.error('Delete instructor error:', error);
    return NextResponse.json({ error: 'Failed to delete instructor' }, { status: 500 });
  }
}
