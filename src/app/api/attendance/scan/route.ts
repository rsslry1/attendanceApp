import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseQRPayload, validateQRPayload, isQRPayloadExpired } from '@/lib/crypto';
import { calculateAttendanceStatus, getDayRange, parseTimeToDate } from '@/lib/attendance';

export async function POST(req: NextRequest) {
  try {
    const { qrData, courseId, instructorId } = await req.json();

    if (!qrData || !courseId) {
      return NextResponse.json({ error: 'QR data and course ID are required' }, { status: 400 });
    }

    // Parse QR payload
    const payload = parseQRPayload(qrData);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid QR code format' }, { status: 400 });
    }

    // Check if QR payload is expired (optional: uncomment to enable expiration)
    // if (isQRPayloadExpired(payload, 30)) {
    //   return NextResponse.json({ error: 'QR code has expired' }, { status: 400 });
    // }

    // Find student by student ID
    const student = await db.student.findUnique({
      where: { studentId: payload.studentId },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Validate QR authenticity
    const isValid = validateQRPayload(payload, student.qrSecret);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid QR code signature' }, { status: 400 });
    }

    // Get course details
    const course = await db.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Get today's date range
    const now = new Date();
    const { start, end } = getDayRange(now);

    // Check for existing attendance record for today
    const existingAttendance = await db.attendance.findFirst({
      where: {
        courseId,
        studentId: student.id,
        date: {
          gte: start,
          lte: end,
        },
      },
    });

    if (existingAttendance) {
      // If course allows time-out and no time-out recorded yet
      if (course.allowTimeOut && !existingAttendance.timeOut) {
        // Update with time-out
        const updated = await db.attendance.update({
          where: { id: existingAttendance.id },
          data: { timeOut: now },
          include: {
            course: true,
            student: true,
          },
        });

        return NextResponse.json({
          id: updated.id,
          courseId: updated.courseId,
          studentId: updated.studentId,
          courseTitle: updated.course.title,
          studentName: `${updated.student.firstName} ${updated.student.lastName}`,
          section: updated.student.section,
          date: updated.date.toISOString(),
          status: updated.status,
          timeIn: updated.timeIn?.toISOString(),
          timeOut: updated.timeOut?.toISOString(),
          message: `Time-out recorded for ${updated.student.firstName} ${updated.student.lastName}`,
        });
      } else {
        // Already has time-in or time-out
        const message = existingAttendance.timeOut
          ? `${student.firstName} ${student.lastName} already scanned out today`
          : `${student.firstName} ${student.lastName} already scanned in today`;

        return NextResponse.json({
          id: existingAttendance.id,
          courseId: existingAttendance.courseId,
          studentId: existingAttendance.studentId,
          courseTitle: course.title,
          studentName: `${student.firstName} ${student.lastName}`,
          section: student.section,
          date: existingAttendance.date.toISOString(),
          status: existingAttendance.status,
          timeIn: existingAttendance.timeIn?.toISOString(),
          timeOut: existingAttendance.timeOut?.toISOString(),
          message,
        });
      }
    }

    // Calculate attendance status
    const classStartTime = parseTimeToDate(course.startTime, now);
    const status = calculateAttendanceStatus(now, course.startTime, course.gracePeriod);

    // Create new attendance record
    const attendance = await db.attendance.create({
      data: {
        courseId,
        studentId: student.id,
        instructorId,
        date: now,
        status,
        timeIn: now,
      },
      include: {
        course: true,
        student: true,
      },
    });

    return NextResponse.json({
      id: attendance.id,
      courseId: attendance.courseId,
      studentId: attendance.studentId,
      courseTitle: attendance.course.title,
      studentName: `${attendance.student.firstName} ${attendance.student.lastName}`,
      section: attendance.student.section,
      date: attendance.date.toISOString(),
      status: attendance.status,
      timeIn: attendance.timeIn?.toISOString(),
      timeOut: attendance.timeOut?.toISOString(),
      message: `${attendance.status === 'PRESENT' ? 'Present' : 'Late'}: ${attendance.student.firstName} ${attendance.student.lastName}`,
    });
  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 });
  }
}
