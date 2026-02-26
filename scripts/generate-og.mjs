/**
 * Build-time OG image generator.
 * Produces a static public/og.png that works on every platform
 * (Twitter/X, Facebook, Discord, LinkedIn, iMessage, etc.)
 */
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'fs';

const WIDTH = 1200;
const HEIGHT = 630;

// Fetch Inter font from Google Fonts
async function loadFont(weight) {
  const API = `https://fonts.googleapis.com/css2?family=Inter:wght@${weight}&display=swap`;
  const css = await fetch(API, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
  }).then((r) => r.text());

  const match = css.match(/src:\s*url\(([^)]+)\)/);
  if (!match) throw new Error(`Could not find font URL for weight ${weight}`);
  return fetch(match[1]).then((r) => r.arrayBuffer());
}

async function main() {
  const [regular, semibold, bold] = await Promise.all([
    loadFont(400),
    loadFont(600),
    loadFont(700),
  ]);

  const fonts = [
    { name: 'Inter', data: regular, weight: 400, style: 'normal' },
    { name: 'Inter', data: semibold, weight: 600, style: 'normal' },
    { name: 'Inter', data: bold, weight: 700, style: 'normal' },
  ];

  // Build element tree (plain objects — no JSX needed)
  const element = {
    type: 'div',
    props: {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '80px',
        background: 'linear-gradient(135deg, #09090b 0%, #14532d 100%)',
        fontFamily: 'Inter',
      },
      children: {
        type: 'div',
        props: {
          style: {
            display: 'flex',
            flexDirection: 'column',
            padding: '60px',
            borderRadius: '24px',
            background: 'rgba(24, 24, 27, 0.7)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
          },
          children: [
            // Brand row
            {
              type: 'div',
              props: {
                style: { display: 'flex', alignItems: 'center', marginBottom: '24px' },
                children: [
                  {
                    type: 'span',
                    props: {
                      style: { fontSize: '56px', fontWeight: 600, color: '#ffffff' },
                      children: 'aw',
                    },
                  },
                  {
                    type: 'span',
                    props: {
                      style: { fontSize: '56px', fontWeight: 600, color: '#4ade80' },
                      children: 'ai',
                    },
                  },
                  {
                    type: 'span',
                    props: {
                      style: { fontSize: '56px', fontWeight: 600, color: '#ffffff' },
                      children: 'reness',
                    },
                  },
                ],
              },
            },
            // Tagline
            {
              type: 'p',
              props: {
                style: { fontSize: '32px', color: '#a1a1aa', margin: '0 0 48px 0' },
                children: 'See the invisible cost of AI',
              },
            },
            // Metrics row
            {
              type: 'div',
              props: {
                style: { display: 'flex', gap: '80px' },
                children: [
                  metric('Water', 'Liters consumed', '#60a5fa'),
                  metric('Energy', 'kWh used', '#facc15'),
                  metric('Carbon', 'Grams emitted', '#4ade80'),
                ],
              },
            },
            // Footer
            {
              type: 'p',
              props: {
                style: { fontSize: '18px', color: '#52525b', marginTop: '48px' },
                children: 'Privacy-first \u00b7 No data stored \u00b7 awaireness.app',
              },
            },
          ],
        },
      },
    },
  };

  const svg = await satori(element, { width: WIDTH, height: HEIGHT, fonts });
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: WIDTH },
  });
  const png = resvg.render().asPng();

  writeFileSync('public/og.png', png);
  console.log('Generated public/og.png (%d KB)', Math.round(png.length / 1024));
}

function metric(label, sub, color) {
  return {
    type: 'div',
    props: {
      style: { display: 'flex', flexDirection: 'column' },
      children: [
        {
          type: 'span',
          props: {
            style: { fontSize: '44px', fontWeight: 700, color },
            children: label,
          },
        },
        {
          type: 'span',
          props: {
            style: { fontSize: '18px', color: '#71717a', marginTop: '4px' },
            children: sub,
          },
        },
      ],
    },
  };
}

main().catch((err) => {
  console.error('OG image generation failed:', err.message);
  process.exit(1);
});
