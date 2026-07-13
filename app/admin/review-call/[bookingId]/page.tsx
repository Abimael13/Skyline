"use client";

import { use } from "react";
import { ReviewCallAdminView } from "@/components/admin/ReviewCallAdminView";

type Params = Promise<{ bookingId: string }>;

export default function AdminReviewCallPage(props: { params: Params }) {
    const { bookingId } = use(props.params);
    return <ReviewCallAdminView bookingId={bookingId} />;
}
