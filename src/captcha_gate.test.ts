import { enrollLearner } from "./captcha_gate.ts";

type MockResponse = { status: number; headers: Headers; json: () => Promise<unknown> };
const response = (body: unknown, status = 200): MockResponse => ({ status, headers: new Headers(), json: async () => body });

process.env.INFRAI_API_KEY = "test-key";
process.env.INFRAI_WIDGET_RECORD_ID = "test-widget";
const accepted = await enrollLearner({ learnerId: "l-1", email: "a@example.com", courseId: "math", deadline: "2026-12-01", captchaToken: "good", ip: "127.0.0.1" }, async () => response({ ok: true, data: { success: true, score: 0.9 } }) as Response);
if (accepted.courseId !== "math") throw new Error("accepted captcha should create the course enrollment");

let rejected = false;
try {
  await enrollLearner({ learnerId: "l-2", email: "b@example.com", courseId: "math", deadline: "2026-12-01", captchaToken: "low", ip: "127.0.0.1" }, async () => response({ ok: true, data: { success: false, score: 0.1 } }) as Response);
} catch (error) {
  rejected = (error as Error).message.includes("captcha");
}
if (!rejected) throw new Error("low captcha score must reject signup");
console.log("captcha gate test passed");
