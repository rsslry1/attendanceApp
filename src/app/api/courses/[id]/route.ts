import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PUT update course
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { title, description, schedule, room, startTime, endTime, gracePeriod, allowTimeOut } = await req.json();

    const course = await db.course.update({
      where: { id },
      data: {
        title,
        description: description || null,
        schedule,
        room: room || null,
        startTime,
        endTime,
        gracePeriod: gracePeriod || 15,
        allowTimeOut: allowTimeOut || false,
      },
    });

    return NextResponse.json(course);
  } catch (error) {
    console.error('Error updating course:', error);
    return NextResponse.json({ error: 'Failed to update course' }, { status: 500 });
  }
}

// DELETE course
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.course.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting course:', error);
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 });
  }
}
