import { json } from '@/lib/serviceState';
import { getDependencyHealth, getRuntimeConfig } from '@/lib/runtimeConfig';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const config = getRuntimeConfig();
  const dependencies = await getDependencyHealth();
  const isHealthy = dependencies.every((dependency) => dependency.status === 'up');

  return json(
    {
      status: isHealthy ? 'ok' : 'degraded',
      service: 'ticketpulse-app',
      architecture: config.architecture,
      dependencies,
      checkedAt: new Date().toISOString()
    },
    isHealthy ? 200 : 503
  );
}
