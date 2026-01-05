import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateQRPayload, payloadToString } from '@/lib/crypto';
import QRCode from 'qrcode';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const student = await db.student.findUnique({ where: { id } });
    
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Generate QR payload
    const payload = generateQRPayload(student.studentId, student.qrSecret);
    const payloadString = payloadToString(payload);

    // Generate QR code as data URL
    const qrCode = await QRCode.toDataURL(payloadString, {
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'H',
    });

    return NextResponse.json({ qrCode });
  } catch (error) {
    console.error('Error generating QR code:', error);
    return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 });
  }
}
