import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateQRSecret } from '@/lib/crypto';

// GET all students
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const instructorId = searchParams.get('instructorId');

    if (!instructorId) {
      // If no instructorId provided, return empty array for security
      return NextResponse.json([]);
    }

    // Get students enrolled in instructor's courses
    const students = await db.student.findMany({
      where: {
        enrollments: {
          some: {
            course: {
              instructorId: instructorId
            }
          }
        }
      },
      orderBy: { lastName: 'asc' },
    });
    
    return NextResponse.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
  }
}

// POST create student
export async function POST(req: NextRequest) {
  try {
    const { studentId, firstName, lastName, email, section, instructorId } = await req.json();

    if (!studentId || !firstName || !lastName || !section) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if student ID already exists
    const existingStudent = await db.student.findUnique({ where: { studentId } });
    if (existingStudent) {
      return NextResponse.json({ error: 'Student ID already exists' }, { status: 400 });
    }

    const qrSecret = generateQRSecret();
    const student = await db.student.create({
      data: {
        studentId,
        firstName,
        lastName,
        email: email || null,
        section,
        qrSecret,
      },
    });

    // If instructorId provided, enroll student in all instructor's courses
    if (instructorId) {
      const instructorCourses = await db.course.findMany({
        where: { instructorId },
        select: { id: true }
      });

      // Create enrollments for all courses
      for (const course of instructorCourses) {
        try {
          await db.enrollment.create({
            data: {
              studentId: student.id,
              courseId: course.id,
            },
          });
        } catch (error) {
          // Ignore duplicate enrollment errors
          console.log('Enrollment already exists or failed:', error);
        }
      }
    }

    return NextResponse.json(student);
  } catch (error) {
    console.error('Error creating student:', error);
    return NextResponse.json({ error: 'Failed to create student' }, { status: 500 });
  }
}
