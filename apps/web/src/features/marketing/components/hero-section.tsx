'use client';

import {
  motion,
  useReducedMotion,
} from 'motion/react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { routes } from '@/lib/routes';

const heroMetrics = [
  {
    label: 'of SMS messages read within 3 minutes',
    value: '90%'
  },
  {
    label: 'want appointment scheduling texts',
    value: '85%'
  },
  {
    label: 'say text is best for a response',
    value: '59%'
  },
  {
    label: 'booking-system switch required',
    value: '0'
  }
] as const;

export function HeroSection() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="bg-background">
      <div className="mx-auto w-full max-w-7xl">
        <div className="relative isolate w-screen overflow-hidden sm:w-auto">
          <div className="relative z-10 flex min-h-[33rem] items-center px-5 pb-16 pt-[5.5rem] sm:min-h-[34rem] sm:px-8 sm:py-[4.5rem] lg:min-h-[43rem] lg:px-20 lg:py-0 xl:px-24">
            <div className="max-w-[58rem]">
              <motion.h1
                animate={{ opacity: 1, y: 0 }}
                className="max-w-[22rem] text-[2.15rem] leading-[1.06] tracking-normal text-foreground sm:max-w-[50rem] sm:text-5xl lg:text-[3.05rem]"
                initial={{ opacity: 0, y: 16 }}
                transition={{
                  delay: shouldReduceMotion ? 0 : 0.08,
                  duration: shouldReduceMotion ? 0 : 0.55
                }}
              >
                Keep the clients you already paid to acquire{' '}
                <span className="text-muted-foreground">
                  by turning existing relationships into booked appointments.
                </span>
              </motion.h1>

              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="mt-9 flex flex-col items-start gap-2.5 sm:flex-row sm:items-stretch"
                initial={{ opacity: 0, y: 14 }}
                transition={{
                  delay: shouldReduceMotion ? 0 : 0.28,
                  duration: shouldReduceMotion ? 0 : 0.45
                }}
              >
                <Button asChild className="h-11 px-5 text-[0.95rem]" size="lg">
                  <Link href={routes.signIn} prefetch={false}>
                    Start reactivation
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
          className="mb-12 grid grid-cols-2 border-x border-y bg-background/90 backdrop-blur sm:mb-16 lg:grid-cols-4"
          initial={{ opacity: 0, y: 14 }}
          transition={{
            delay: shouldReduceMotion ? 0 : 0.32,
            duration: shouldReduceMotion ? 0 : 0.45
          }}
        >
          {heroMetrics.map((metric, index) => (
            <div
              className={[
                'min-h-24 p-4 sm:min-h-28 sm:px-8 sm:py-7',
                index < 2 ? 'border-b lg:border-b-0' : '',
                index % 2 === 1 ? 'border-l' : '',
                index > 0 ? 'lg:border-l' : ''
              ].join(' ')}
              key={metric.label}
            >
              <p className="text-3xl leading-none tracking-normal text-foreground sm:text-[2.9rem]">
                {metric.value}
              </p>
              <p className="mt-2 max-w-40 text-xs leading-4 text-muted-foreground sm:mt-3 sm:max-w-48 sm:text-sm sm:leading-5">
                {metric.label}
              </p>
            </div>
          ))}
        </motion.div>

      </div>
    </section>
  );
}
