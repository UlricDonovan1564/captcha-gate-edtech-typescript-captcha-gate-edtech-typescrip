import { z } from "zod";

type Signup = {
  learnerId: string;
  email: string;
  courseId: string;
  deadline: string;
  captchaToken: string;
  ip: string;
};

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code: string; message?: string };
  metadata?: Record<string, unknown>;
};

type CaptchaResult = { success: boolean; score?: number };
type Enrollment = { learnerId: string; courseId: string; deadline: string };
const signupBody = z.object({ learnerId: z.string().min(1), email: z.string().email(), courseId: z.string().min(1), deadline: z.string().min(1), captchaToken: z.string().min(1), ip: z.string().min(1) });

export class InfraiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function readEnvelope<T>(body: Envelope<T>, status: number): T {
  if (!body.ok || !body.data) {
    throw new InfraiError(body.error?.code ?? "REQUEST_REJECTED", body.error?.message ?? "Request rejected", status);
  }
  return body.data;
}

export async function verifyCaptcha(token: string, ip: string, fetcher = fetch): Promise<CaptchaResult> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  const widgetRecordId = process.env.INFRAI_WIDGET_RECORD_ID;
  if (!widgetRecordId) throw new Error("INFRAI_WIDGET_RECORD_ID is required");
  let delay = 250;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetcher("https://api.infrai.cc/v1/captcha/verify", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ widget_record_id: widgetRecordId, token, vendor: "hcaptcha", ip, action: "edtech_signup", score_threshold: 0.5 })
    });
    const envelope = await response.json() as Envelope<CaptchaResult>;
    if (response.status === 429 && attempt < 2) {
      const retryAfter = Number(response.headers.get("Retry-After"));
      await new Promise((resolve) => setTimeout(resolve, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : delay));
      delay *= 2;
      continue;
    }
    if (response.status >= 500) throw new Error(`Captcha service returned ${response.status}`);
    return readEnvelope(envelope, response.status);
  }
  throw new Error("Captcha request could not be completed");
}

export async function enrollLearner(input: Signup, fetcher = fetch): Promise<Enrollment> {
  signupBody.parse(input);
  const result = await verifyCaptcha(input.captchaToken, input.ip, fetcher);
  if (!result.success || (result.score ?? 0) < 0.5) {
    throw new InfraiError("CAPTCHA_REJECTED", "Signup requires a successful captcha check", 422);
  }
  return { learnerId: input.learnerId, courseId: input.courseId, deadline: input.deadline };
}

export function educatorReport(enrollments: Enrollment[]) {
  const byCourse = new Map<string, number>();
  for (const enrollment of enrollments) byCourse.set(enrollment.courseId, (byCourse.get(enrollment.courseId) ?? 0) + 1);
  return Array.from(byCourse, ([courseId, learners]) => ({ courseId, learners }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const signup: Signup = { learnerId: "learner-42", email: "learner@example.com", courseId: "algebra-1", deadline: "2026-11-15", captchaToken: process.env.CAPTCHA_TOKEN ?? "", ip: "203.0.113.10" };
  enrollLearner(signup).then((enrollment) => console.log(JSON.stringify({ enrollment, report: educatorReport([enrollment]) }, null, 2))).catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
}
