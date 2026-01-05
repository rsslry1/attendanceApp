import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getDayRange, formatDate, formatTime } from '@/lib/attendance';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

    // Create PDF
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(20);
    doc.text('Attendance Report', 14, 22);

    // Add subtitle
    doc.setFontSize(11);
    const filterText = [
      courseId && `Course: ${attendance[0]?.course.title || ''}`,
      studentId && `Student: ${attendance[0]?.student.firstName} ${attendance[0]?.student.lastName || ''}`,
      date && `Date: ${date}`,
    ].filter(Boolean).join(' | ');
    doc.text(filterText || 'All Records', 14, 30);

    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 36);

    // Prepare data for table
    const tableData = attendance.map((record) => [
      formatDate(record.date),
      record.student.studentId,
      `${record.student.firstName} ${record.student.lastName}`,
      record.student.section,
      record.course.title,
      record.status,
      record.timeIn ? formatTime(record.timeIn) : '-',
      record.timeOut ? formatTime(record.timeOut) : '-',
    ]);

    // Add table
    autoTable(doc, {
      startY: 44,
      head: [['Date', 'Student ID', 'Name', 'Section', 'Course', 'Status', 'Time In', 'Time Out']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] },
      styles: { fontSize: 9 },
    });

    // Calculate and add summary
    const presentCount = attendance.filter((a) => a.status === 'PRESENT').length;
    const lateCount = attendance.filter((a) => a.status === 'LATE').length;
    const absentCount = attendance.filter((a) => a.status === 'ABSENT').length;

    const finalY = (doc as any).lastAutoTable.finalY || 44;
    doc.setFontSize(10);
    doc.text(`Summary:`, 14, finalY + 10);
    doc.text(`Present: ${presentCount}`, 14, finalY + 16);
    doc.text(`Late: ${lateCount}`, 14, finalY + 22);
    doc.text(`Absent: ${absentCount}`, 14, finalY + 28);

    // Generate buffer
    const buffer = Buffer.from(doc.output('arraybuffer'));

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="attendance_${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
