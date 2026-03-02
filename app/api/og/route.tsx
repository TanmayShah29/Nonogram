import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const title = searchParams.get('title') || 'A puzzle is waiting for you';
        const dim = searchParams.get('dim') || '15x15';
        const diff = searchParams.get('diff') || 'Balanced';

        return new ImageResponse(
            (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#faf7f2',
                        padding: '40px',
                    }}
                >
                    {/* Decorative background grid */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            display: 'flex',
                            flexWrap: 'wrap',
                            opacity: 0.05,
                        }}
                    >
                        {Array.from({ length: 400 }).map((_, i) => (
                            <div
                                key={i}
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    border: '1px solid #000',
                                }}
                            />
                        ))}
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            backgroundColor: 'white',
                            borderRadius: '40px',
                            padding: '60px',
                            boxShadow: '0 20px 80px rgba(0,0,0,0.1)',
                            border: '1px solid rgba(0,0,0,0.05)',
                        }}
                    >
                        <div
                            style={{
                                fontSize: 80,
                                fontFamily: 'serif',
                                fontStyle: 'italic',
                                fontWeight: 'bold',
                                color: '#f4845f',
                                marginBottom: 20,
                            }}
                        >
                            Revelio
                        </div>

                        <div
                            style={{
                                fontSize: 40,
                                fontWeight: 'bold',
                                color: '#2d2d2d',
                                textAlign: 'center',
                                marginBottom: 10,
                                maxWidth: '800px',
                            }}
                        >
                            {title}
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                gap: '20px',
                                marginTop: '10px',
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 24,
                                    fontFamily: 'monospace',
                                    color: '#6b6661',
                                    backgroundColor: '#f3f0eb',
                                    padding: '8px 20px',
                                    borderRadius: '100px',
                                }}
                            >
                                {dim}
                            </div>
                            <div
                                style={{
                                    fontSize: 24,
                                    fontFamily: 'monospace',
                                    color: '#6b6661',
                                    backgroundColor: '#f3f0eb',
                                    padding: '8px 20px',
                                    borderRadius: '100px',
                                }}
                            >
                                {diff}
                            </div>
                        </div>

                        <div
                            style={{
                                marginTop: '40px',
                                fontSize: 30,
                                color: '#b0a89e',
                            }}
                        >
                            Scan or click to reveal the photo
                        </div>
                    </div>
                </div>
            ),
            {
                width: 1200,
                height: 630,
            }
        );
    } catch (e: any) {
        return new Response(`Failed to generate the image`, {
            status: 500,
        });
    }
}
