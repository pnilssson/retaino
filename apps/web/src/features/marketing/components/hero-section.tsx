'use client';

import { motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { routes } from '@/lib/routes';

const tickerTarget = 35_240;

const heroMetrics = [
  {
    label: 'messages sent through Retaino',
    value: '35K+'
  },
  {
    label: 'cheaper than paid acquisition',
    value: '12x'
  },
  {
    label: 'average ROI',
    value: '800%'
  },
  {
    label: 'extra ad spend required',
    value: '$0'
  }
] as const;

function createMosaicTiles(columns: number, tile: number, gap: number) {
  const pitch = tile + gap;

  return Array.from({ length: columns }, (_, row) =>
    Array.from({ length: columns - row }, (_, column) => ({
      id: `${row}-${column}`,
      overlayOpacity:
        (row + column * 2) % 8 === 0
          ? 0.34
          : (row * 3 + column * 5) % 13 === 0
            ? 0.24
            : 0.14,
      x: (row + column) * pitch,
      y: row * pitch
    }))
  ).flat();
}

const desktopMosaicTileSize = 34;
const desktopMosaicGap = 6;
const desktopMosaicColumns = 12;
const desktopMosaicPitch = desktopMosaicTileSize + desktopMosaicGap;
const desktopMosaicSize =
  desktopMosaicColumns * desktopMosaicPitch - desktopMosaicGap;
const desktopMosaicTiles = createMosaicTiles(
  desktopMosaicColumns,
  desktopMosaicTileSize,
  desktopMosaicGap
);

const mobileMosaicTileSize = 13;
const mobileMosaicGap = 2;
const mobileMosaicColumns = 9;
const mobileMosaicPitch = mobileMosaicTileSize + mobileMosaicGap;
const mobileMosaicSize =
  mobileMosaicColumns * mobileMosaicPitch - mobileMosaicGap;
const mobileMosaicTiles = createMosaicTiles(
  mobileMosaicColumns,
  mobileMosaicTileSize,
  mobileMosaicGap
);

function SmsTicker() {
  const shouldReduceMotion = useReducedMotion();
  const [count, setCount] = useState(tickerTarget - 420);

  useEffect(() => {
    if (shouldReduceMotion) {
      return;
    }

    const startValue = tickerTarget - 420;
    const duration = 1900;
    const start = performance.now();

    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 4;
      setCount(Math.round(startValue + (tickerTarget - startValue) * eased));

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    const frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [shouldReduceMotion]);

  return (
    <motion.p
      animate={{ opacity: 1, y: 0 }}
      className="text-sm text-foreground"
      initial={{ opacity: 0, y: 8 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.45 }}
    >
      <span className="font-semibold">SMS sent through Retaino:</span>{' '}
      <span className="tabular-nums text-muted-foreground">
        {count.toLocaleString('en-US')}
      </span>
    </motion.p>
  );
}

function MosaicCorner() {
  return (
    <>
      <div
        className="pointer-events-none absolute z-20 sm:hidden"
        style={{
          height: mobileMosaicSize,
          right: mobileMosaicGap,
          top: mobileMosaicGap,
          width: mobileMosaicSize
        }}
      >
        <svg
          aria-hidden="true"
          className="text-primary"
          height={mobileMosaicSize}
          style={{ maxWidth: 'none' }}
          viewBox={`0 0 ${mobileMosaicSize} ${mobileMosaicSize}`}
          width={mobileMosaicSize}
        >
          {mobileMosaicTiles.map((tile) => (
            <rect
              fill="currentColor"
              height={mobileMosaicTileSize}
              key={tile.id}
              rx="2"
              width={mobileMosaicTileSize}
              x={tile.x}
              y={tile.y}
            />
          ))}
        </svg>
      </div>

      <div
        className="pointer-events-none absolute hidden sm:block"
        style={{
          height: desktopMosaicSize,
          right: desktopMosaicGap,
          top: desktopMosaicGap,
          width: desktopMosaicSize
        }}
      >
        <svg
          aria-hidden="true"
          className="text-primary"
          height={desktopMosaicSize}
          style={{ maxWidth: 'none' }}
          viewBox={`0 0 ${desktopMosaicSize} ${desktopMosaicSize}`}
          width={desktopMosaicSize}
        >
          <defs>
            {desktopMosaicTiles.map((tile) => (
              <pattern
                height="3"
                id={`mosaic-dot-${tile.id}`}
                key={tile.id}
                patternUnits="userSpaceOnUse"
                width="3"
              >
                <circle
                  cx="1"
                  cy="1"
                  fill={`rgb(255 255 255 / ${tile.overlayOpacity})`}
                  r="1"
                />
              </pattern>
            ))}
          </defs>
          {desktopMosaicTiles.map((tile) => (
            <g key={tile.id} opacity="0.9">
              <rect
                fill="currentColor"
                height={desktopMosaicTileSize}
                rx="2"
                width={desktopMosaicTileSize}
                x={tile.x}
                y={tile.y}
              />
              <rect
                fill={`url(#mosaic-dot-${tile.id})`}
                height={desktopMosaicTileSize}
                rx="2"
                width={desktopMosaicTileSize}
                x={tile.x}
                y={tile.y}
              />
            </g>
          ))}
        </svg>
      </div>
    </>
  );
}

export function HeroSection() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="bg-background">
      <div className="mx-auto w-full max-w-7xl border-x">
        <div className="relative isolate w-screen overflow-hidden sm:w-auto">
          <MosaicCorner />

          <div className="relative z-10 flex min-h-[33rem] items-center px-5 pb-16 pt-[5.5rem] sm:min-h-[34rem] sm:px-8 sm:py-[4.5rem] lg:min-h-[43rem] lg:px-20 lg:py-0 xl:px-24">
            <div className="max-w-[58rem]">
              <SmsTicker />

              <motion.h1
                animate={{ opacity: 1, y: 0 }}
                className="mt-10 max-w-[21rem] text-[2.15rem] leading-[1.06] tracking-normal text-foreground sm:max-w-[49rem] sm:text-5xl lg:text-[3.05rem]"
                initial={{ opacity: 0, y: 16 }}
                transition={{
                  delay: shouldReduceMotion ? 0 : 0.08,
                  duration: shouldReduceMotion ? 0 : 0.55
                }}
              >
                Keep the customers you already paid to acquire,{' '}
                <span className="text-muted-foreground">
                  and turn existing relationships into booked appointments.
                </span>
              </motion.h1>

              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="mt-9 flex flex-col items-center gap-2.5 sm:flex-row sm:items-stretch"
                initial={{ opacity: 0, y: 14 }}
                transition={{
                  delay: shouldReduceMotion ? 0 : 0.24,
                  duration: shouldReduceMotion ? 0 : 0.45
                }}
              >
                <Button asChild className="h-11 px-5 text-[0.95rem]" size="lg">
                  <Link href={routes.signIn} prefetch={false}>
                    Get started
                  </Link>
                </Button>
                <Button
                  asChild
                  className="h-11 bg-background px-5 text-[0.95rem]"
                  size="lg"
                  variant="outline"
                >
                  <Link href={routes.signIn} prefetch={false}>
                    Sign in
                  </Link>
                </Button>
              </motion.div>
            </div>
          </div>
        </div>

        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="grid border-y bg-background/90 backdrop-blur sm:grid-cols-2 lg:grid-cols-4"
          initial={{ opacity: 0, y: 14 }}
          transition={{
            delay: shouldReduceMotion ? 0 : 0.32,
            duration: shouldReduceMotion ? 0 : 0.45
          }}
        >
          {heroMetrics.map((metric, index) => (
            <div
              className={[
                'min-h-28 border-b p-5 last:border-b-0 sm:px-8 sm:py-7 sm:[&:nth-child(n+3)]:border-b-0 lg:border-b-0',
                index % 2 === 1 ? 'sm:border-l' : '',
                index > 0 ? 'lg:border-l' : ''
              ].join(' ')}
              key={metric.label}
            >
              <p className="text-4xl leading-none tracking-normal text-foreground sm:text-[2.9rem]">
                {metric.value}
              </p>
              <p className="mt-3 max-w-48 text-sm leading-5 text-muted-foreground">
                {metric.label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
