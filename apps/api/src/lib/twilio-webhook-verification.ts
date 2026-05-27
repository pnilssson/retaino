import type { TwilioConfig } from './twilio-rest-client';

export async function verifyTwilioWebhook(
  config: TwilioConfig,
  input: {
    url: string;
    headers: Headers;
    body: string;
  },
) {
  const signature = input.headers.get('x-twilio-signature');

  if (!config.authToken || !signature) {
    return false;
  }

  if (
    input.headers.get('content-type')?.toLowerCase().includes('application/json') &&
    !(await hasValidJsonBodyHash(input.url, input.body))
  ) {
    return false;
  }

  const expectedSignature = await signTwilioWebhook({
    authToken: config.authToken,
    url: input.url,
    body: input.body,
    contentType: input.headers.get('content-type') ?? '',
  });

  return constantTimeEqual(signature, expectedSignature);
}

async function signTwilioWebhook(input: {
  authToken: string;
  url: string;
  body: string;
  contentType: string;
}) {
  const baseString = twilioSignatureBaseString(input);
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(input.authToken),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(baseString),
  );

  return bytesToBase64(new Uint8Array(signature));
}

function twilioSignatureBaseString(input: {
  url: string;
  body: string;
  contentType: string;
}) {
  if (input.contentType.toLowerCase().includes('application/json')) {
    return input.url;
  }

  const params = Array.from(new URLSearchParams(input.body).entries()).sort(
    ([left], [right]) => {
      if (left < right) {
        return -1;
      }

      if (left > right) {
        return 1;
      }

      return 0;
    },
  );

  return params.reduce(
    (baseString, [key, value]) => `${baseString}${key}${value}`,
    input.url,
  );
}

async function hasValidJsonBodyHash(url: string, body: string) {
  const bodyHash = new URL(url).searchParams.get('bodySHA256');

  if (!bodyHash) {
    return false;
  }

  return constantTimeEqual(bodyHash, await sha256Hex(body));
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

function constantTimeEqual(left: string, right: string) {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    difference |=
      (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }

  return difference === 0;
}
