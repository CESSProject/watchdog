'use client'

import {NextRequest, NextResponse} from 'next/server';

export async function middleware(request: NextRequest) {

    const cookies = request.cookies;
    const token = cookies.get('WatchdogToken');

    if (!token) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*'], // Add paths that need token validation
};