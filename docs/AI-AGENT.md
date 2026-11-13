# Brave AI Assistant

The academy's conversational agent for the website and Android app. It answers from
the **live database**, runs authenticated tools, escalates to humans with a ticket,
and speaks through a natural voice interface.

It is not a prerecorded phone menu. Every conversation is grounded in current courses,
payments, progress and approved knowledge. When a language-model key is configured,
the agent uses tool-calling for natural reasoning; without a key, the built-in
knowledge engine still performs intent detection, retrieval and the same tools.

---

## 1. What it can do

| Area | Behaviour |
| --- | --- |
| Course discovery | Search the published catalogue, explain levels, duration, outcomes, requirements and prices |
| Recommendations | Match goals (solar, security, electrical, networking, access) to programmes |
| Enrolment | Explain registration, checkout, unlocking and the Android app |
| Payments | Explain Paystack, verification, receipts and refunds; check status after sign-in |
| Learning | Explain modules, lesson types, progress and next lesson; check progress after sign-in |
| Exams | Explain pass marks, prerequisites, time limits, attempts and certificate issuance |
| Certificates | Explain eligibility and verification; list the signed-in student's certificates |
| Account help | Password reset guidance without ever asking for credentials |
| Escalation | Collect the issue, create a support ticket with a reference, notify the admin console |
| Voice | Listen, transcribe, answer aloud, allow interruption, mute and text fallback |

Private data is only available after authentication. Tools enforce this server-side.

---

## 2. Architecture

```
Website widget / Android app
        │  text or speech
        ▼
POST /api/agent/chat
        │
        ├── rate limit, settings, session
        ├── conversation + message persistence
        ├── retrieval over courses, FAQs, announcements, knowledge docs
        ├── provider
        │     ├── OpenAI tool-calling loop
        │     ├── Gemini grounded generation
        │     └── Local knowledge engine (no key required)
        ├── tools ──► Prisma ──► live academy data
        └── reply + suggestions + ticket reference
```

| File | Responsibility |
| --- | --- |
| `app/api/agent/chat` | Public chat endpoint |
| `app/api/agent/bootstrap` | Widget identity, greeting, voice config, availability |
| `app/api/agent/tts` / `transcribe` | Optional premium speech (OpenAI) |
| `lib/agent/index.ts` | Orchestration, conversation memory, provider fallback |
| `lib/agent/tools.ts` | Authorised tools + LLM tool declarations |
| `lib/agent/knowledge.ts` | Retrieval and live course search |
| `lib/agent/local.ts` | Grounded conversational engine and intent handling |
| `lib/agent/llm.ts` | OpenAI/Gemini adapters and system prompt |
| `components/agent/VoiceAgent.tsx` | Floating website widget, speech recognition and synthesis |
| `mobile/lib/screens/agent.dart` | Android voice assistant |
| `app/admin/ai-agent` | Administrator console |

---

## 3. Conversations and memory

Each conversation stores:

- channel (`WEB`, `ANDROID`), optional user, title;
- messages with role, content, intent and tools used;
- a small context object (last course, last intent, pending ticket);
- escalation flag and linked support tickets.

The agent uses the last messages to resolve follow-ups such as “how much is it?”.
Conversation IDs are session-scoped in the browser and are never exposed to another
student's account. Private tools read only the signed-in user.

---

## 4. Tools

| Tool | Auth | Purpose |
| --- | --- | --- |
| `search_courses` | Public | Published catalogue, prices, categories |
| `get_course_details` | Public | Curriculum, outcomes, requirements, assessments |
| `get_faqs` | Public | Approved help content |
| `get_academy_info` | Public | Contacts and support hours |
| `check_enrollment` | Student | Active enrolments |
| `check_payment_status` | Student | Orders and transaction references |
| `get_learning_progress` | Student | Lesson completion and next lesson |
| `check_certificate` | Student | Certificates and eligibility |
| `create_support_ticket` | Public/Student | Human escalation with reference |

Rules enforced in the prompt and in code:

- never invent prices or payment status;
- never confirm a payment without `status = PAID`;
- never reveal another student's data;
- never request passwords, PINs or OTPs;
- escalate when uncertain.

---

## 5. Language model providers

Set **one** of these in the environment:

| Variable | Effect |
| --- | --- |
| `OPENAI_API_KEY` | Full tool-calling conversation, optional server voice and Whisper |
| `GEMINI_API_KEY` | Grounded generation; private intents are handled locally |
| none | Local knowledge engine with live tools and retrieval |

Optional:

```env
AGENT_MODEL=gpt-4.1-mini          # or gemini-2.5-flash
AGENT_TTS_MODEL=gpt-4o-mini-tts
AGENT_STT_MODEL=whisper-1
```

The provider automatically falls back to the local engine if an API call fails, so
the widget never goes silent.

---

## 6. Voice experience

Website:

- Web Speech API for recognition (`en-NG`, with `en-GB`/`en-US` fallbacks);
- speech synthesis voice preference: Nigerian English, then natural British female,
  then any English voice;
- microphone permission is requested explicitly; denial switches to text;
- speaking is cancelled the moment the user starts the microphone or clicks Stop;
- server voice is used when `OPENAI_API_KEY` is present and the admin selects a
  non-browser voice; otherwise browser speech is used;
- mute, stop, end and replay controls are always visible;
- live interim transcript and a listening indicator.

Android:

- `speech_to_text` uses the system recognizer with `en_NG`;
- `flutter_tts` speaks replies with `en-NG`, falling back to `en-GB`;
- starting the microphone stops speech for barge-in;
- text input works when the microphone is unavailable.

Accessibility: `prefers-reduced-motion` removes ambient animation on the web; the
widget is keyboard accessible and labelled for screen readers.

---

## 7. Administrator console

**Admin → AI assistant** provides:

- live on/off toggle;
- identity, greeting, tone, voice, speech rate/pitch, escalation email;
- additional instructions (protected accuracy/privacy rules still apply);
- anonymous access policy;
- knowledge documents with publish state;
- conversation transcripts with intent and tool trace;
- support tickets with status, priority, internal notes;
- analytics: conversations, messages, escalations, containment, top intents.

Every course, FAQ and announcement is indexed automatically — publishing a course
makes it immediately available to the assistant without retraining.

---

## 8. Human escalation

When the student asks for a person, or the agent cannot answer confidently:

1. The agent collects a short description and email (or uses the signed-in account).
2. It creates a `SupportTicket` with a reference like `BS-TKT-…`.
3. The ticket appears under **Admin → AI assistant → Tickets**.
4. The student receives the reference and expected response time.
5. Administrators can assign, prioritise, resolve and add internal notes.

---

## 9. Privacy and security

- Authentication is checked by the server for every private tool.
- The model never receives another student's records; private intents are resolved
  locally even when a non-tool LLM is configured.
- No password, PIN, OTP or card data is requested or stored.
- Conversations store the text replies and user messages for quality and escalation.
  Microphone audio itself is not stored by Brave Skill; browser/OS speech services may
  process it according to their policies.
- The privacy policy explains AI transcripts, consent and retention.
- Rate limiting: 30 messages/minute per IP, plus provider timeouts.
- Admin transcripts are restricted to authenticated administrators and are subject to
  the academy's data protection policy.

Future telephony (SIP/WhatsApp) can reuse the same orchestration by posting into
`runAgent` with a different channel.

---

## 10. API examples

Bootstrap:

```bash
curl https://academy.emyphilltech.com.ng/api/agent/bootstrap
```

Chat:

```bash
curl -X POST https://academy.emyphilltech.com.ng/api/agent/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"How much is the solar course?","channel":"WEB"}'
```

Response:

```json
{
  "ok": true,
  "conversationId": "cm...",
  "reply": "Solar Installation and Inverter Technology: it costs ₦85,000...",
  "intent": "pricing",
  "suggestions": ["What does it include?", "How do I enrol?"],
  "toolsUsed": ["get_course_details"],
  "escalated": false
}
```

Authenticated status uses the normal `bs_session` cookie; the Android app forwards it.

---

## 11. Testing checklist

- [ ] Ask about every course and verify the price matches the admin console.
- [ ] Ask a follow-up (“how long is it?”) and confirm context is retained.
- [ ] Ask for a recommendation for solar, CCTV and networking.
- [ ] Ask a payment question anonymously → sign-in guidance, no private data.
- [ ] Sign in, ask for progress → correct percentages and next lesson.
- [ ] Ask for a certificate → correct serial and eligibility.
- [ ] Ask for a human → ticket created with a reference; visible in admin.
- [ ] Deny microphone permission → text fallback still works.
- [ ] Start speaking while the agent is talking → speech stops.
- [ ] Disable the agent in admin → widget disappears and API refuses.
- [ ] Publish a new course → ask the agent about it immediately.

---

## 12. Troubleshooting

| Symptom | Fix |
| --- | --- |
| Widget missing | `ai.enabled` is false or bootstrap failed; check `/api/agent/bootstrap` |
| “Knowledge engine” answers | No `OPENAI_API_KEY` / `GEMINI_API_KEY`; local engine is active by design |
| No voice output | Browser has no speech synthesis, or the user muted; server voice requires a key |
| Microphone unavailable | Browser permission, HTTPS requirement, or unsupported browser; use text |
| Wrong price | Prices come from the course table; correct the course in admin |
| Payment status wrong | Never cached; the tool reads the order. Verify the reference belongs to the signed-in account |
| Ticket not visible | Check Admin → AI assistant → Tickets and the conversation link |
| Provider errors | Check Worker/server logs; the agent falls back automatically |
