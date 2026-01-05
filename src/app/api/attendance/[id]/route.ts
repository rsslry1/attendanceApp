import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// DELETE attendance record by ID
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const password = searchParams.get('password');

    // Simple password validation - in production, you'd want to use proper authentication
    if (password !== 'admin123') {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Check if attendance record exists
    const existingRecord = await db.attendance.findUnique({
      where: { id: params.id },
    });

    if (!existingRecord) {
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
    }

    // Delete the attendance record
    await db.attendance.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Attendance record deleted successfully' });
  } catch (error) {
    console.error('Error deleting attendance:', error);
    return NextResponse.json({ error: 'Failed to delete attendance record' }, { status: 500 });
  }
}
