import { TOPICS } from '@/lib/kafka';
import { consumeSqsMessages } from '@/lib/aws';
const runtimeImport = async <T>(name: string) => (new Function('n', 'return import(n)')(name) as Promise<T>);

async function runKafkaConsumer() {
  try {
    const mod = await runtimeImport<{ Kafka: new (config: unknown) => { consumer: (config: unknown) => { connect: () => Promise<void>; subscribe: (config: unknown) => Promise<void>; run: (config: unknown) => Promise<void> } } }>('kafkajs');
    const kafka = new mod.Kafka({
      clientId: process.env.KAFKA_CONSUMER_CLIENT_ID || 'ticketpulse-consumer',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
    });
    const consumer = kafka.consumer({ groupId: process.env.KAFKA_CONSUMER_GROUP || 'ticketpulse-group' });

    await consumer.connect();
    for (const topic of TOPICS) {
      await consumer.subscribe({ topic, fromBeginning: false });
    }

    await consumer.run({
      eachMessage: async ({ topic, message }: { topic: string; message: { value?: { toString: () => string } } }) => {
        const value = message.value?.toString() || '';
        console.log('[worker:kafka] consumed', { topic, value });
      }
    });
  } catch (error) {
    console.error('[worker:kafka] consumer failed', error);
    setTimeout(runKafkaConsumer, 2000);
  }
}

async function runSqsConsumer() {
  try {
    await consumeSqsMessages(async (body) => {
      console.log('[worker:sqs] consumed', body);
    });
  } catch (error) {
    console.error('[worker:sqs] poll failed', error);
  } finally {
    setTimeout(runSqsConsumer, 3000);
  }
}

runKafkaConsumer();
runSqsConsumer();
