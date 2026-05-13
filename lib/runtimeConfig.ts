import net from 'node:net';

type DependencyName = 'db' | 'redis';
type DependencyKind = 'postgres' | 'redis';

type RuntimeDependency = {
  name: DependencyName;
  kind: DependencyKind;
  url: string;
  defaultPort: number;
};

export type DependencyHealth = {
  name: DependencyName;
  kind: DependencyKind;
  host: string;
  port: number;
  connection: string;
  status: 'up' | 'down';
  reason?: string;
};

const defaultConfig = {
  architecture: 'single-service',
  databaseUrl: 'postgresql://ticketpulse:ticketpulse@db:5432/ticketpulse',
  redisUrl: 'redis://redis:6379'
};

export function getRuntimeConfig() {
  return {
    architecture: process.env.APP_ARCHITECTURE || defaultConfig.architecture,
    databaseUrl: process.env.DATABASE_URL || defaultConfig.databaseUrl,
    redisUrl: process.env.REDIS_URL || defaultConfig.redisUrl
  };
}

function redactConnectionString(connectionString: string) {
  try {
    const parsed = new URL(connectionString);
    if (parsed.password) parsed.password = '***';
    return parsed.toString();
  } catch {
    return connectionString;
  }
}

function parseTarget(connectionString: string, fallbackPort: number) {
  const parsed = new URL(connectionString);
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : fallbackPort
  };
}

function checkTcpConnection(host: string, port: number, timeoutMs = 1000) {
  return new Promise<{ status: 'up' | 'down'; reason?: string }>((resolve) => {
    const socket = net.createConnection({ host, port });
    const finalize = (status: 'up' | 'down', reason?: string) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(reason ? { status, reason } : { status });
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finalize('up'));
    socket.once('timeout', () => finalize('down', 'Connection timed out'));
    socket.once('error', (error) => finalize('down', error.message));
  });
}

export async function getDependencyHealth() {
  const config = getRuntimeConfig();
  const dependencies: RuntimeDependency[] = [
    { name: 'db', kind: 'postgres', url: config.databaseUrl, defaultPort: 5432 },
    { name: 'redis', kind: 'redis', url: config.redisUrl, defaultPort: 6379 }
  ];

  return Promise.all(
    dependencies.map(async (dependency): Promise<DependencyHealth> => {
      const connection = redactConnectionString(dependency.url);

      try {
        const { host, port } = parseTarget(dependency.url, dependency.defaultPort);
        const result = await checkTcpConnection(host, port);

        return {
          name: dependency.name,
          kind: dependency.kind,
          host,
          port,
          connection,
          ...result
        };
      } catch (error) {
        return {
          name: dependency.name,
          kind: dependency.kind,
          host: '',
          port: dependency.defaultPort,
          connection,
          status: 'down',
          reason: error instanceof Error ? error.message : 'Invalid connection string'
        };
      }
    })
  );
}
