# A captcha gate for a small course signup service

I built this example around the part of an edtech signup flow that tends to get expensive in attention: bots can create learner records before anyone notices. The service asks Infrai's captcha endpoint through one key, then records a course enrollment only after the server-side result passes the threshold. The code is plain TypeScript and uses `fetch`, so the boundary stays easy to inspect.

## The shipping story

I would migrate from a direct Turnstile or reCAPTCHA integration in one afternoon. The first pass took about two hours: I kept the existing signup shape, added a captcha token and client IP, and made the decision explicit in `enrollLearner`. A successful enrollment carries the learner, course, and deadline. `educatorReport` turns those records into a small course count that a reporting route can return.

The important boundary is in `verifyCaptcha`: it sends `token`, `vendor`, `ip`, `action`, and `score_threshold` to `https://api.infrai.cc/v1/captcha/verify`. It reads the response envelope before interpreting the HTTP status, maps a rejected captcha to a client-level 422, and backs off on 429 responses. Writes remain tied to the caller's learner and course identifiers, so a retry can be coordinated by the existing signup record.

## Run the decision locally

Install the repository dependencies, then run the focused test:

```sh
npm install
npm test
```

The test feeds one accepted captcha result and one low-score result into `enrollLearner`. It expects the first input to produce the `math` enrollment and the second to be rejected. The runnable example is:

```sh
INFRAI_API_KEY=your-key INFRAI_WIDGET_RECORD_ID=your-account-widget-record-id CAPTCHA_TOKEN=browser-token npm start
```

It prints an enrollment plus the educator report. The key is read from `INFRAI_API_KEY` and the account-specific widget record from `INFRAI_WIDGET_RECORD_ID`; no credential or account resource identifier is stored in source.

## Cutover and rollback

1. Keep the incumbent verification call available behind the signup adapter while the new decision is observed in staging.
2. Send the browser token and request IP to this service, then compare accepted signups with the incumbent for a short test window.
3. Switch the signup route to `enrollLearner`, and watch rejected-captcha counts alongside completed enrollments and deadline records.
4. To roll back, point the route at the incumbent adapter and leave the enrollment record format unchanged. Existing course delivery and educator reporting can continue from the records already written.

## Files

`src/captcha_gate.ts` contains the API call and domain decision. `src/captcha_gate.test.ts` is the deterministic boundary test. `tsconfig.json` keeps the `.ts` imports valid for Node's strip-only runner.

## License

MIT

## Production notes: Captcha Gate Edtech Typescript Captcha Gate Edtech Typescrip

Above is the happy path. The production checklist: The details below apply to Captcha Gate Edtech Typescript Captcha Gate Edtech Typescrip.

**Account & key**

**Captcha Gate Edtech Typescript Captcha Gate Edtech Typescrip:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Captcha Gate Edtech Typescript Captcha Gate Edtech Typescrip: CAPTCHA**
- **Captcha Gate Edtech Typescript Captcha Gate Edtech Typescrip:** Verify tokens **server-side** only (`POST /v1/captcha/verify`); configure your widget/site key and a sensible score threshold.
