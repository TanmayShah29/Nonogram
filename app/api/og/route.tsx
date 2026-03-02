import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const caption = searchParams.get('caption') || 'Can you solve this puzzle? 🧩'
    const difficulty = searchParams.get('difficulty') || 'Medium'
    const size = searchParams.get('size') || '15×10'

    return new ImageResponse(
        (
            <div
                style={{
                    width: '1200px',
                    height: '630px',
                    background: '#faf7f2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'serif',
                    padding: '60px',
                    gap: '60px',
                }}
            >
                {/* Left: puzzle teaser */}
                <div style={{
                    width: '380px',
                    height: '380px',
                    background: '#f0ece6',
                    borderRadius: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '80px',
                }}>
                    🧩
                </div>

                {/* Right: text content */}
                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                }}>
                    <div style={{
                        fontSize: '18px',
                        color: '#f4845f',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                    }}>
                        REVELIO
                    </div>
                    <div style={{
                        fontSize: '52px',
                        color: '#1a1a1a',
                        lineHeight: 1.2,
                        fontStyle: 'italic',
                    }}>
                        {caption}
                    </div>
                    <div style={{
                        fontSize: '22px',
                        color: '#6b6560',
                    }}>
                        {size} grid · {difficulty}
                    </div>
                    <div style={{
                        fontSize: '20px',
                        color: '#b0a89e',
                        marginTop: '12px',
                    }}>
                        Solve the puzzle to reveal the hidden photo →
                    </div>
                </div>
            </div>
        ),
        {
            width: 1200,
            height: 630,
        }
    )
}
