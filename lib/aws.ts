export type NotificationType = 'booking' | 'payment' | 'refund';
const runtimeImport = async <T>(name: string) => (new Function('n', 'return import(n)')(name) as Promise<T>);

async function getSnsClient() {
  const mod = await runtimeImport<{ SNSClient: new (config: unknown) => unknown }>('@aws-sdk/client-sns');
  return new mod.SNSClient({ region: process.env.AWS_REGION || 'ap-south-1' }) as { send: (cmd: unknown) => Promise<unknown> };
}

async function getSqsClient() {
  const mod = await runtimeImport<{ SQSClient: new (config: unknown) => unknown }>('@aws-sdk/client-sqs');
  return new mod.SQSClient({ region: process.env.AWS_REGION || 'ap-south-1' }) as { send: (cmd: unknown) => Promise<{ Messages?: { Body?: string; ReceiptHandle?: string }[] }> };
}

export async function publishSnsNotification(payload: { type: NotificationType; userId: string; message: string; timestamp: string; extra?: Record<string, unknown> }) {
  const topicArn = process.env.AWS_SNS_TOPIC_ARN || 'arn:aws:sns:ap-south-1:478122456633:Ticketpulse';
  if (!topicArn) {
    console.warn('[aws] AWS_SNS_TOPIC_ARN not configured');
    return { sent: false };
  }

  try {
    const mod = await runtimeImport<{ PublishCommand: new (input: unknown) => unknown }>('@aws-sdk/client-sns');
    const sns = await getSnsClient();
    await sns.send(new mod.PublishCommand({
      TopicArn: topicArn,
      Message: JSON.stringify(payload)
    }));
    return { sent: true };
  } catch (error) {
    console.error('[aws] SNS publish failed', error);
    throw error;
  }
}

export async function sendOtpSms(phoneNumber: string, otpCode: string) {
  try {
    const mod = await runtimeImport<{ PublishCommand: new (input: unknown) => unknown }>('@aws-sdk/client-sns');
    const sns = await getSnsClient();
    await sns.send(new mod.PublishCommand({
      PhoneNumber: phoneNumber,
      Message: `Your TicketPulse OTP is ${otpCode}. Valid for 5 minutes.`
    }));
    return { sent: true };
  } catch (error) {
    console.error('[aws] OTP SMS publish failed', error);
    return { sent: false, error: (error as Error).message };
  }
}

export async function pushOtpAuditToQueue(payload: Record<string, unknown>) {
  const queueUrl = process.env.AWS_SQS_QUEUE_URL || 'https://sqs.ap-south-1.amazonaws.com/478122456633/myqueus';
  if (!queueUrl) return { queued: false, reason: 'queue url missing' };
  try {
    const sqsMod = await runtimeImport<{ SendMessageCommand: new (input: unknown) => unknown }>('@aws-sdk/client-sqs');
    const sqs = await getSqsClient();
    await sqs.send(new sqsMod.SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(payload)
    }));
    return { queued: true };
  } catch (error) {
    console.error('[aws] OTP SQS enqueue failed', error);
    return { queued: false, error: (error as Error).message };
  }
}

export async function consumeSqsMessages(handler: (body: string) => Promise<void>, retries = 3) {
  const queueUrl = process.env.AWS_SQS_QUEUE_URL || 'https://sqs.ap-south-1.amazonaws.com/478122456633/myqueus';
  if (!queueUrl) {
    console.warn('[aws] AWS_SQS_QUEUE_URL not configured');
    return;
  }

  const sqsMod = await runtimeImport<{ ReceiveMessageCommand: new (input: unknown) => unknown; DeleteMessageCommand: new (input: unknown) => unknown }>('@aws-sdk/client-sqs');
  const sqs = await getSqsClient();
  const response = await sqs.send(new sqsMod.ReceiveMessageCommand({ QueueUrl: queueUrl, MaxNumberOfMessages: 10, WaitTimeSeconds: 10 }));

  for (const message of response.Messages || []) {
    let attempt = 0;
    while (attempt < retries) {
      attempt += 1;
      try {
        await handler(message.Body || '');
        if (message.ReceiptHandle) {
          await sqs.send(new sqsMod.DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: message.ReceiptHandle }));
        }
        break;
      } catch (error) {
        console.error(`[aws] SQS handler failed attempt ${attempt}`, error);
        if (attempt >= retries) throw error;
      }
    }
  }
}
