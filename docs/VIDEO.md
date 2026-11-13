# Video delivery and Cloudflare Stream

Brave Skill supports two video backends. The default is private local/R2 storage and
requires no additional paid service. Cloudflare Stream is an optional upgrade and is
**not activated** until the owner approves the service and supplies credentials.

---

## 1. Default: private storage (active)

- Admin uploads MP4/WebM through the course builder or **Admin → Video library**.
- Files are stored outside `public/` in `STORAGE_DIR` (or R2 when configured).
- Playback goes through `/api/media/[assetId]?lessonId=...` after an entitlement and
  module-lock check. The lesson context prevents an asset reused elsewhere from
  bypassing a locked module.
- PDFs behave the same way.
- HTTP Range requests are supported for seeking and Android playback.
- Student email is overlaid on the player as a deterrence watermark.
- No Stream account, API key or per-minute charge is involved.

Limits: video 1GB, PDF 100MB, image 8MB, APK 300MB.

---

## 2. Optional: Cloudflare Stream

### What it adds

- Direct uploads from phone or computer using resumable TUS transfer.
- Upload progress in the admin video library.
- Server-generated signed playback tokens (RS256, short-lived).
- No public MP4 URLs.
- Per-student email watermark overlay.
- DRM where the Stream plan supports it (signed URLs are implemented; DRM is a
  Cloudflare plan/feature decision).
- Central library with replace/delete and lesson assignment.

### Activation (owner approval required)

1. Approve Cloudflare Stream usage and its billing.
2. In the Cloudflare dashboard, enable Stream and create:
   - account ID
   - Stream API token (Edit permission)
   - customer code (subdomain prefix)
   - signing key + key ID
3. Add server-side environment variables (never in frontend code):

```env
CLOUDFLARE_ACCOUNT_ID="..."
CLOUDFLARE_STREAM_API_TOKEN="..."
CLOUDFLARE_STREAM_CUSTOMER_CODE="..."
CLOUDFLARE_STREAM_SIGNING_KEY_ID="..."
CLOUDFLARE_STREAM_SIGNING_KEY="..."   # base64 PEM or PEM with \n
```

For Cloudflare deployment, set them as Worker secrets:

```bash
npx wrangler secret put CLOUDFLARE_STREAM_API_TOKEN
# repeat for the other values
```

4. Rebuild/redeploy the Worker.
5. Open **Admin → Video library**; the status banner changes to connected.
6. Upload a short test video, assign it to a lesson, and verify playback as an
   enrolled student and denial as a non-enrolled user.
7. Only then migrate real course videos.

**Until step 1 is approved, do not add these variables.** The upload screen will
continue to use private storage and will not call Cloudflare.

### Security model

| Control | Implementation |
| --- | --- |
| API token exposure | Server-only environment; never sent to the browser |
| Upload authorisation | `requireStaff`; instructor ownership checked when attaching |
| Playback authorisation | Session + enrolment + module lock via `lessonAccess` |
| Playback token | Short-lived RS256 token containing the video UID |
| Public MP4 | Not exposed; Stream requires signed playback |
| Watermark | Student email overlay; Stream-side watermarking can be enabled by plan |
| Deletion | Admin/instructor ownership check; removes Stream video + DB asset |
| Webhooks | Not used; completion is confirmed by the admin upload flow |

### API endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/admin/stream/status` | Whether Stream and signing are configured |
| POST | `/api/admin/stream/upload-url` | Create a resumable direct-upload URL |
| POST | `/api/admin/stream/complete` | Register the UID and optionally attach to a lesson |
| DELETE | `/api/admin/stream/[uid]` | Delete a Stream video |
| GET | `/api/stream/[lessonId]` | Issue a signed playback URL for an entitled student |

### Testing checklist (once credentials exist)

- [ ] Upload a 50MB+ file, pause/resume the network, confirm completion.
- [ ] Progress bar advances and upload survives a refresh with TUS retry.
- [ ] Signed URL expires and must be refreshed.
- [ ] A student not enrolled receives 403 from `/api/stream/[lessonId]`.
- [ ] A locked module receives the module-lock message.
- [ ] Watermark shows the correct student email.
- [ ] Deleted videos no longer play and lessons lose the asset.
- [ ] Instructor cannot attach a video to another instructor's course.
- [ ] DRM playback works on a supported device if the plan includes DRM.

Until these are run with real credentials, Stream must be described as
**integrated but not activated/tested live**.
