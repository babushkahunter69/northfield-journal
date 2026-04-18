import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Northfield Journal';
export const size = {
  width: 1200,
  height: 630
};
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px',
          background: 'linear-gradient(135deg, #f8f5ef 0%, #efe7da 100%)',
          color: '#172036'
        }}
      >
        <div
          style={{
            fontSize: 34,
            letterSpacing: 8,
            textTransform: 'uppercase',
            color: '#9c6b2f'
          }}
        >
          Thoughtful education coverage
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.02 }}>
            Northfield Journal
          </div>
          <div style={{ fontSize: 36, lineHeight: 1.35, maxWidth: 900 }}>
            Thoughtful writing on learning, teaching, and education.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 28,
            color: '#334155'
          }}
        >
          <div>northfieldjournal.com</div>
          <div>Independent education publication</div>
        </div>
      </div>
    ),
    size
  );
}