// Shared state-machine logic for the two-attempt graduation exam cap.
//
// The exact same eligibility decision has to be made in four places, and
// they must never disagree with each other:
//   1. app/api/exam/submit/route.ts       - the REAL enforcement (server,
//      Admin SDK, cannot be bypassed by the client).
//   2. app/portal/exam/page.tsx / components/learning/ExamPortal.tsx - a
//      client-side UX gate so a student isn't walked through the whole
//      device/ID-verification flow only to be rejected at the final submit.
//      This is a convenience layer on top of (1), never a substitute for it.
//   3. app/api/admin/approve-retake/route.ts - only allows an admin to
//      approve a retake when the student is genuinely in the
//      failed-attempt-1-awaiting-review state.
//   4. app/admin/students/[studentId]/page.tsx - only shows the "Approve
//      Retake" button when (3) would actually succeed.
//
// Keeping the logic in one pure, dependency-free function means all four
// call sites read from a single source of truth instead of four
// hand-copied re-implementations that can quietly drift apart.
//
// Data model: users/{uid}.examResults[courseId] gains three fields on top
// of the pre-existing { status, score, gradedAt, diplomaUrl }:
//   - attempt: 1 | 2            which attempt this result reflects.
//   - retakeApproved: boolean   true once an admin has cleared a second
//                                attempt after a failed first attempt.
//   - retakeApprovedBy / retakeApprovedAt   audit trail (admin uid + ISO
//                                timestamp) for the approval action.
//
// State machine (this is the whole business rule):
//   no result yet                             -> attempt 1 allowed
//   status "passed" (whichever attempt)        -> done, no more attempts
//   status "failed", attempt 1, not approved   -> blocked, awaiting review
//   status "failed", attempt 1, approved       -> attempt 2 allowed
//   status "failed", attempt 2                 -> done, hard cap reached
//   record exists but doesn't match a recognized shape -> blocked, fails
//                                closed pending investigation (never
//                                silently grants a new attempt)
//
// Deliberately no separate "attemptsExhausted" boolean is stored anywhere -
// it's fully derivable from `attempt` + `status`, so there's nothing that
// can fall out of sync with the fields that actually matter.

export type ExamAttemptStatus = "passed" | "failed";

export interface ExamResultRecord {
    status?: ExamAttemptStatus;
    score?: number;
    gradedAt?: string;
    diplomaUrl?: string | null;
    attempt?: 1 | 2;
    retakeApproved?: boolean;
    retakeApprovedBy?: string;
    retakeApprovedAt?: string;
    /** Required note an admin enters explaining why a retake was approved
     *  (what they reviewed, any context). Set by
     *  app/api/admin/approve-retake/route.ts. */
    retakeApprovalNotes?: string;
}

export type ExamIneligibleReason = "passed" | "awaiting-review" | "attempts-exhausted" | "invalid-record";

export type ExamAttemptEligibility =
    | { eligible: true; attemptNumber: 1 | 2 }
    | { eligible: false; reason: ExamIneligibleReason };

/**
 * Given a student's current examResults[courseId] (or undefined/null if
 * they have never attempted this exam), decide whether they may start a
 * new attempt right now, and if so, which attempt number it would be.
 */
export function getExamAttemptEligibility(
    result: ExamResultRecord | null | undefined
): ExamAttemptEligibility {
    // Genuine "no result at all" - examResults[courseId] is completely
    // absent/undefined on the user doc. This is the only case that grants
    // a fresh attempt 1 with no existing record.
    if (result === null || result === undefined) {
        return { eligible: true, attemptNumber: 1 };
    }

    // A record exists but doesn't match a fully-recognized shape (e.g. no
    // `status` at all, or a `status` that isn't "passed"/"failed"). This
    // isn't reachable through any real code path today - every writer of
    // examResults[courseId] always sets a valid status - but exam-integrity
    // logic should fail CLOSED, not open: block the attempt and surface it
    // for investigation rather than silently granting a new attempt on data
    // we don't recognize.
    if (result.status !== "passed" && result.status !== "failed") {
        return { eligible: false, reason: "invalid-record" };
    }

    if (result.status === "passed") {
        return { eligible: false, reason: "passed" };
    }

    // status === "failed". Treat a missing `attempt` (e.g. a result graded
    // through the manual admin grading tool, or before this field existed)
    // as attempt 1 - the safe default that still requires admin approval
    // before a second attempt.
    const attempt = result.attempt ?? 1;

    if (attempt >= 2) {
        return { eligible: false, reason: "attempts-exhausted" };
    }

    if (result.retakeApproved === true) {
        return { eligible: true, attemptNumber: 2 };
    }

    return { eligible: false, reason: "awaiting-review" };
}

// Single source of truth for this copy - components/learning/ExamAttemptGate.tsx
// and app/portal/dashboard/page.tsx both render these strings directly rather
// than hand-rolling their own similar-but-different text, so there's exactly
// one place this copy lives and it can never drift between screens. Where a
// student is genuinely stuck waiting (awaiting-review) or blocked for good
// (attempts-exhausted), the surfaces that render this text also render a
// real mailto:/tel: contact link alongside it - the contact details
// themselves (support@skylinesafetyservices.com / the phone number on
// app/contact/page.tsx) live in those components since this file has no
// JSX, but the wording of what to expect lives here.
/** Student-facing copy for each way a student can be blocked from starting an attempt. */
export const EXAM_INELIGIBLE_MESSAGES: Record<ExamIneligibleReason, string> = {
    passed:
        "You've already passed this exam. There's nothing left to do here - you can find your diploma in the Documents section of your portal.",
    "awaiting-review":
        "Your first attempt is being reviewed by our academics team, typically within 2-3 business days. You'll receive an email as soon as you're cleared for a retake - there's nothing to schedule or start right now. Questions in the meantime? Reach out to our team.",
    "attempts-exhausted":
        "You've used both of your allowed attempts for this exam. Per our exam policy, no further attempts are possible. If you believe this is an error, reach out to our team.",
    "invalid-record":
        "There's an issue with your exam record that needs to be reviewed by our team before you can continue. Please reach out to us and we'll sort it out.",
};
