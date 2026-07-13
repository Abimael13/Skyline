// Server-side session recording for the proctored graduation exam.
//
// WHY THIS EXISTS: this business must keep a record of the proctored exam
// for FDNY audit purposes. Live classroom sessions are already recorded via
// Zoom's own cloud recording, external to this app - nothing to build there.
// The graduation exam, however, runs on LiveKit (not Zoom -
// components/learning/ExamPortal.tsx, components/admin/LiveProctorDashboard.tsx),
// and until this file existed there was no recording anywhere in that flow.
//
// HOW IT WORKS: LiveKit Cloud's server SDK exposes an EgressClient that can
// start/stop a "room composite" recording (everything published in a room,
// composited into one file) and upload the result directly to a cloud
// storage bucket. This app already has a Firebase Storage bucket
// (NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET), which is backed by Google Cloud
// Storage, so LiveKit's GCS egress output is used, authenticated with the
// SAME Firebase Admin service account already configured for this app
// (FIREBASE_ADMIN_*) - no new secret is introduced.
//
// IMPORTANT CAVEAT (see the written report to the owner for the full
// explanation): this code can start an egress request and get back an
// egress ID, and it can ask LiveKit to stop it, but it can NOT independently
// confirm from here that the Firebase Admin service account has been
// GRANTED Storage Object write permission on the target bucket in Google
// Cloud Console IAM. If that permission is missing, the start/stop calls
// will still appear to succeed (LiveKit accepts the request and only fails
// later, during the actual upload), and the true failure will only surface
// via the egress webhook (see app/api/livekit/egress-webhook/route.ts) or by
// an admin trying to actually open a recording (getExamRecordingPlaybackUrl
// below checks the file really exists in the bucket before handing back a
// link, which is the most reliable way this app can confirm a recording
// truly succeeded).
import { EgressClient, EgressInfo, EncodedFileOutput, EncodedFileType, GCPUpload, WebhookConfig } from "livekit-server-sdk";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { getAdminApp } from "@/lib/firebaseAdmin";

export type ExamRecordingStatus =
    | "recording"
    // The egress request to LiveKit genuinely succeeded (a real recording is
    // running right now) but the follow-up Firestore write that should have
    // recorded that as "recording" failed (transient network blip, quota,
    // etc). This status still carries a real egressId, so
    // stopExamRoomRecording can find and stop it - unlike "failed", which
    // means no recording ever actually started. Treated the same as
    // "recording" everywhere that matters (stopping, "already recording"
    // checks) - it just flags to admins that the initial status write didn't
    // land cleanly.
    | "recording_unconfirmed"
    | "completed"
    | "failed"
    | "stop_failed"
    | "not_configured";

export interface ExamRecordingEntry {
    status: ExamRecordingStatus;
    egressId?: string;
    filepath?: string;
    bucket?: string;
    startedAt?: FirebaseFirestore.FieldValue | Date;
    startedByAdminUid?: string;
    endedAt?: FirebaseFirestore.FieldValue | Date | null;
    stoppedByAdminUid?: string | null;
    stopReason?: string | null;
    error?: string | null;
}

interface ExamRecordingConfig {
    apiKey: string;
    apiSecret: string;
    egressHost: string;
    bucket: string;
    credentialsJson: string;
    webhookUrl?: string;
}

// Reads everything needed to actually place an egress request, or returns
// null if any required piece is missing. Nothing here is hardcoded - it all
// comes from the same environment variables already used elsewhere in this
// app (app/api/livekit/token/route.ts, lib/firebaseAdmin.ts).
function getExamRecordingConfig(): ExamRecordingConfig | null {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
    const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!apiKey || !apiSecret || !wsUrl || !bucket || !projectId || !clientEmail || !privateKey) {
        return null;
    }

    // EgressClient (and every other livekit-server-sdk RPC client) wants an
    // http(s) host, but this app's LiveKit URL is the websocket URL used by
    // the browser (wss://...livekit.cloud) - same LiveKit Cloud project,
    // different protocol for a different API.
    const egressHost = wsUrl.replace(/^wss:\/\//, "https://").replace(/^ws:\/\//, "http://");

    // LiveKit's GCP egress upload authenticates with a standard GCP service
    // account key JSON - the same shape Google Cloud Console generates for a
    // downloaded key. This is built from the SAME Firebase Admin credentials
    // lib/firebaseAdmin.ts already uses (project_id/client_email/private_key
    // is the exact minimal field set its cert() call relies on), rather than
    // requiring a second, separate GCS secret to be configured. Google's
    // OAuth2 JWT-bearer token flow only needs these three fields plus a type
    // marker - private_key_id and client_id are optional metadata, not
    // required to mint an access token.
    const credentialsJson = JSON.stringify({
        type: "service_account",
        project_id: projectId,
        client_email: clientEmail,
        private_key: privateKey,
        token_uri: "https://oauth2.googleapis.com/token",
    });

    // Only wire up the egress webhook (real, LiveKit-confirmed "did the
    // upload actually finish" status) if this app is running at a real
    // public HTTPS URL - LiveKit Cloud's servers cannot reach
    // http://localhost. NEXT_PUBLIC_APP_URL is currently set to a localhost
    // value in this environment's .env.local, so the webhook will simply be
    // skipped (recording still starts/stops fine - it just won't get the
    // extra webhook-confirmed status update) until that variable is set to
    // this app's real deployed HTTPS URL. See the written report.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const webhookUrl = appUrl && appUrl.startsWith("https://") ? `${appUrl}/api/livekit/egress-webhook` : undefined;

    return { apiKey, apiSecret, egressHost, bucket, credentialsJson, webhookUrl };
}

export function isExamRecordingConfigured(): boolean {
    return getExamRecordingConfig() !== null;
}

function sessionRef(sessionId: string) {
    return getFirestore(getAdminApp()).collection("exam_sessions").doc(sessionId);
}

// Recordings are stored keyed by attempt number (recordings.1, recordings.2)
// on the exam_sessions doc, the same "keyed by attempt" convention already
// used for examSubmissions (see app/api/exam/submit/route.ts) - a session
// doc is reused across a student's two allowed attempts, so a single
// unkeyed `recording` field would let a retake's recording silently
// overwrite attempt 1's recording reference, which defeats the entire point
// of keeping these for FDNY audit purposes.
async function writeRecordingEntry(sessionId: string, attemptNumber: number, entry: Partial<ExamRecordingEntry>) {
    await sessionRef(sessionId).set(
        {
            recordings: {
                [String(attemptNumber)]: entry,
            },
        },
        { merge: true }
    );
}

type StartResult = { ok: true; egressId: string; filepath: string } | { ok: false; error: string };

export async function startExamRoomRecording(params: {
    sessionId: string;
    roomName: string;
    uid: string;
    attemptNumber: number;
    startedByAdminUid: string;
}): Promise<StartResult> {
    const { sessionId, roomName, uid, attemptNumber, startedByAdminUid } = params;
    const config = getExamRecordingConfig();

    if (!config) {
        const error = "Recording is not configured (missing LiveKit or storage environment variables).";
        await writeRecordingEntry(sessionId, attemptNumber, { status: "not_configured", error });
        return { ok: false, error };
    }

    const filepath = `exam-recordings/${uid}/${sessionId}_attempt${attemptNumber}_${Date.now()}.mp4`;

    // Declared outside the try block so the catch block below can tell
    // whether the egress call itself actually succeeded (in which case
    // `info.egressId` is a real, currently-recording egress) versus never
    // having been obtained at all (in which case nothing ever started).
    let info: EgressInfo | undefined;

    try {
        const egressClient = new EgressClient(config.egressHost, config.apiKey, config.apiSecret);

        const output = new EncodedFileOutput({
            fileType: EncodedFileType.MP4,
            filepath,
            output: {
                case: "gcp",
                value: new GCPUpload({ credentials: config.credentialsJson, bucket: config.bucket }),
            },
        });

        info = await egressClient.startRoomCompositeEgress(roomName, output, {
            webhooks: config.webhookUrl ? [new WebhookConfig({ url: config.webhookUrl })] : undefined,
        });

        await writeRecordingEntry(sessionId, attemptNumber, {
            status: "recording",
            egressId: info.egressId,
            filepath,
            bucket: config.bucket,
            startedAt: FieldValue.serverTimestamp(),
            startedByAdminUid,
            error: null,
        });

        return { ok: true, egressId: info.egressId, filepath };
    } catch (error: any) {
        const message = error?.message || "Failed to start recording.";
        console.error("Failed to start exam room recording:", error);

        if (info?.egressId) {
            // The egress request genuinely succeeded - LiveKit is recording
            // this room right now - and only the follow-up Firestore write
            // above failed. Losing the egressId here would orphan a real,
            // running recording that stopExamRoomRecording could never find
            // (it requires status === "recording" && an egressId). Persist
            // the egressId under a distinct status instead of "failed" so it
            // stays discoverable and stoppable, and tell the caller the
            // recording is in fact running.
            await writeRecordingEntry(sessionId, attemptNumber, {
                status: "recording_unconfirmed",
                egressId: info.egressId,
                filepath,
                bucket: config.bucket,
                startedByAdminUid,
                error: message,
            }).catch(() => {});
            return { ok: true, egressId: info.egressId, filepath };
        }

        await writeRecordingEntry(sessionId, attemptNumber, {
            status: "failed",
            filepath,
            bucket: config.bucket,
            startedByAdminUid,
            error: message,
        }).catch(() => {});
        return { ok: false, error: message };
    }
}

export async function stopExamRoomRecording(params: {
    sessionId: string;
    attemptNumber: number;
    stoppedByAdminUid?: string;
    reason: string;
}): Promise<void> {
    const { sessionId, attemptNumber, stoppedByAdminUid, reason } = params;

    const snap = await sessionRef(sessionId).get();
    const recording: ExamRecordingEntry | undefined = snap.data()?.recordings?.[String(attemptNumber)];

    const isActive = recording?.status === "recording" || recording?.status === "recording_unconfirmed";
    if (!recording || !isActive || !recording.egressId) {
        // Nothing actively recording for this attempt - nothing to stop.
        // This is the normal case for exams that were never authorized (no
        // recording ever started) or whose recording already failed/stopped.
        return;
    }

    const config = getExamRecordingConfig();
    if (!config) return;

    // Tracks whether the stopEgress() call itself succeeded, so the catch
    // block below can tell a genuine stop failure apart from a case where
    // the recording really did stop and only the follow-up Firestore write
    // failed - the same orphaning pattern as the start side above, just in
    // reverse (mislabeling a stopped recording "stop_failed" instead of
    // losing track of a still-running one).
    let egressStopped = false;

    try {
        const egressClient = new EgressClient(config.egressHost, config.apiKey, config.apiSecret);
        await egressClient.stopEgress(recording.egressId);
        egressStopped = true;
        await writeRecordingEntry(sessionId, attemptNumber, {
            ...recording,
            status: "completed",
            endedAt: FieldValue.serverTimestamp(),
            stoppedByAdminUid: stoppedByAdminUid || null,
            stopReason: reason,
        });
    } catch (error: any) {
        console.error("Failed to stop exam room recording:", error);
        await writeRecordingEntry(sessionId, attemptNumber, {
            ...recording,
            status: egressStopped ? "completed" : "stop_failed",
            endedAt: egressStopped ? FieldValue.serverTimestamp() : recording.endedAt ?? null,
            stoppedByAdminUid: egressStopped ? stoppedByAdminUid || null : recording.stoppedByAdminUid ?? null,
            stopReason: egressStopped ? reason : recording.stopReason ?? null,
            error: error?.message || "Unknown error stopping recording.",
        }).catch(() => {});
    }
}

type PlaybackResult = { ok: true; url: string } | { ok: false; error: string };

// Generates a short-lived, admin-only signed URL to actually view a
// completed recording. This also confirms the file genuinely exists in
// storage before handing back a link - the most reliable way this app can
// verify, from here, that a recording truly succeeded end to end (Firestore
// status alone only reflects that LiveKit *accepted* the start/stop
// request, not that the upload itself completed - see the module doc
// comment above).
export async function getExamRecordingPlaybackUrl(params: {
    sessionId: string;
    attemptNumber: number;
}): Promise<PlaybackResult> {
    const snap = await sessionRef(params.sessionId).get();
    const recording: ExamRecordingEntry | undefined = snap.data()?.recordings?.[String(params.attemptNumber)];

    if (!recording || !recording.filepath) {
        return { ok: false, error: "No recording was made for this exam attempt." };
    }

    const bucketName = recording.bucket || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
        return { ok: false, error: "Storage bucket is not configured." };
    }

    try {
        const bucket = getStorage(getAdminApp()).bucket(bucketName);
        const file = bucket.file(recording.filepath);
        const [exists] = await file.exists();
        if (!exists) {
            return {
                ok: false,
                error:
                    recording.status === "recording" || recording.status === "recording_unconfirmed"
                        ? "This recording is still in progress."
                        : "The recording file was not found in storage. It may have failed to upload - see the recording status and error on this session for details.",
            };
        }
        const [url] = await file.getSignedUrl({
            action: "read",
            expires: Date.now() + 60 * 60 * 1000, // 1 hour
        });
        return { ok: true, url };
    } catch (error: any) {
        console.error("Failed to generate exam recording playback URL:", error);
        return { ok: false, error: error?.message || "Failed to generate a playback link." };
    }
}

// Called from app/api/livekit/egress-webhook/route.ts once LiveKit Cloud
// confirms an egress has actually ended (successfully or not). Finds the
// matching attempt entry by egress ID (rather than trusting attempt number
// from the webhook payload, which doesn't carry one) so a stale/duplicate
// webhook for a previous attempt's egress can never clobber a newer
// recording's status.
export async function applyEgressWebhookUpdate(params: {
    roomName: string;
    egressId: string;
    ended: boolean;
    errorMessage?: string;
}): Promise<void> {
    const EXAM_ROOM_PREFIX = "exam-";
    if (!params.roomName.startsWith(EXAM_ROOM_PREFIX)) return;

    const uid = params.roomName.slice(EXAM_ROOM_PREFIX.length);
    const sessionId = `${uid}_f89-flsd`;

    const snap = await sessionRef(sessionId).get();
    const recordings: Record<string, ExamRecordingEntry> = snap.data()?.recordings || {};

    const matchedAttempt = Object.keys(recordings).find((attempt) => recordings[attempt]?.egressId === params.egressId);
    if (!matchedAttempt) return;

    const current = recordings[matchedAttempt];
    const failed = Boolean(params.errorMessage);

    await writeRecordingEntry(sessionId, Number(matchedAttempt), {
        ...current,
        status: params.ended ? (failed ? "failed" : "completed") : current.status,
        error: failed ? params.errorMessage : current.error ?? null,
        endedAt: params.ended ? FieldValue.serverTimestamp() : current.endedAt ?? null,
    });
}
