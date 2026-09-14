import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'google_apps_script', 'Code.gs');
    if (fs.existsSync(filePath)) {
      const code = fs.readFileSync(filePath, 'utf8');
      return new NextResponse(code, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
    }

    return NextResponse.json({ error: 'Code.gs file not found' }, { status: 404 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load code';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
