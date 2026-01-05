import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getDayRange } from '@/lib/attendance';
import * as XLSX from 'xlsx';

export async function POST(req: NextRequest) {
  try {
    const { courseId, studentId, date } = await req.json();

    const where: any = {};
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

    // Prepare data for Excel
    const data = attendance.map((record) => ({
      Date: record.date.toLocaleDateString(),
      'Student ID': record.student.studentId,
      Name: `${record.student.firstName} ${record.student.lastName}`,
      Section: record.student.section,
      Course: record.course.title,
      Schedule: record.course.schedule,
      Room: record.course.room || '',
      Status: record.status,
      'Time In': record.timeIn?.toLocaleTimeString() || '',
      'Time Out': record.timeOut?.toLocaleTimeString() || '',
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="attendance_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
