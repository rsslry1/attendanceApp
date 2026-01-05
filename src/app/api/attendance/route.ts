import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getDayRange } from '@/lib/attendance';

// GET attendance records with optional filters
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');
    const studentId = searchParams.get('studentId');
    const date = searchParams.get('date');
    const instructorId = searchParams.get('instructorId');

    if (!instructorId) {
      // If no instructorId provided, return empty array for security
      return NextResponse.json([]);
    }

    const where: any = { instructorId };
    if (courseId) where.courseId = courseId;
    if (studentId) where.studentId = studentId;
    if (date) {
      const { start, end } = getDayRange(new Date(date));
      where.date = {
        gte: start,
        lte: end,
      };
    }

    const attendance = await db.attendance.findMany({
      where,
      include: {
        course: true,
        student: true,
      },
      orderBy: { date: 'desc' },
    });

    const formatted = attendance.map((record) => ({
      id: record.id,
      courseId: record.courseId,
      studentId: record.studentId,
      courseTitle: record.course.title,
      studentName: `${record.student.firstName} ${record.student.lastName}`,
      section: record.student.section,
      date: record.date.toISOString(),
      status: record.status,
      timeIn: record.timeIn?.toISOString(),
      timeOut: record.timeOut?.toISOString(),
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
  }
}
