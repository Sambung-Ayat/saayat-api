import { createHmac, timingSafeEqual } from 'crypto';

const SECRET = process.env.CHALLENGE_SECRET || 'dev-secret-change-me-in-production';

export interface ChallengePayload {
  correctId: number;
  currentAyahId: number;
  choiceMap: Record<string, number>;
  exp: number;
}

export function generateChallenge(correctId: number, currentAyahId: number, choiceMap: Record<string, number>): string {
  const payload: ChallengePayload = {
    correctId,
    currentAyahId,
    choiceMap,
    exp: Date.now() + 1000 * 60 * 10, // 10 minutes expiry
  };

  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', SECRET)
    .update(payloadStr)
    .digest('base64url');

  return `${payloadStr}.${signature}`;
}

export function verifyChallenge(token: string): ChallengePayload | null {
  try {
    const [payloadStr, signature] = token.split('.');
    if (!payloadStr || !signature) return null;

    const expectedSignature = createHmac('sha256', SECRET)
      .update(payloadStr)
      .digest('base64url');

    // Use timingSafeEqual to prevent timing attacks
    const isValid = timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) return null;

    const payload: ChallengePayload = JSON.parse(
      Buffer.from(payloadStr, 'base64url').toString()
    );

    if (Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch (e) {
    return null;
  }
}
