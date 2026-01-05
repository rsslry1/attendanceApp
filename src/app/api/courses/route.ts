import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET all courses
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const instructorId = searchParams.get('instructorId');

    if (instructorId) {
      // Only return courses belonging to the specified instructor
      const courses = await db.course.findMany({
        where: { instructorId },
        orderBy: { title: 'asc' },
      });
      return NextResponse.json(courses);
    } else {
      // If no instructorId provided, return empty array for security
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}

// POST create course
export async function POST(req: NextRequest) {
  try {
    const { title, description, schedule, room, startTime, endTime, gracePeriod, allowTimeOut, instructorId } = await req.json();

    if (!title || !schedule || !startTime || !endTime || !instructorId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const course = await db.course.create({
      data: {
        title,
        description: description || null,
        schedule,
        room: room || null,
        startTime,
        endTime,
        gracePeriod: gracePeriod || 15,
        allowTimeOut: allowTimeOut || false,
        instructorId,
      },
    });

    return NextResponse.json(course);
  } catch (error) {
    console.error('Error creating course:', error);
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 });
  }
}
