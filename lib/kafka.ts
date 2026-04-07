const TOPICS = ['event.created', 'event.updated', 'booking.confirmed', 'booking.cancelled', 'payment.completed'] as const;

type TopicName = typeof TOPICS[number];

let producerRef: { send: (payload: unknown) => Promise<unknown> } | null = null;
const runtimeImport = async <T>(name: string) => (new Function('n', 'return import(n)')(name) as Promise<T>);

async function initProducerWithRetry(retries = 3): Promise<{ send: (payload: unknown) => Promise<unknown> } | null> {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const mod = await runtimeImport<{ Kafka: new (...args: unknown[]) => { producer: (opts: unknown) => { connect: () => Promise<void>; send: (payload: unknown) => Promise<unknown> } } }>('kafkajs');
      const kafka = new mod.Kafka({
        clientId: process.env.KAFKA_CLIENT_ID || 'ticketpulse-api',
        brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
      });
      const producer = kafka.producer({ allowAutoTopicCreation: true });
      await producer.connect();
      return producer;
    } catch (error) {
      console.error(`[kafka] producer connect attempt ${attempt} failed`, error);
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
  return null;
}

export async function getKafkaProducer() {
  if (!producerRef) producerRef = await initProducerWithRetry();
  return producerRef;
}

export async function publishKafkaEvent(topic: TopicName, data: { eventId?: string; bookingId?: string; payload: Record<string, unknown> }) {
  if (!TOPICS.includes(topic)) throw new Error(`Unsupported topic: ${topic}`);

  const message = {
    ...data,
    timestamp: new Date().toISOString()
  };

  const producer = await getKafkaProducer();
  if (!producer) {
    console.warn('[kafka] producer unavailable, message skipped', { topic, message });
    return { queued: false };
  }

  try {
    await producer.send({
      topic,
      messages: [{ value: JSON.stringify(message) }]
    });
    return { queued: true };
  } catch (error) {
    console.error('[kafka] publish failed', { topic, error });
    throw error;
  }
}

export { TOPICS };
