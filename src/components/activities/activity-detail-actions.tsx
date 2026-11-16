"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Link2, Link2Off, Loader2, Pencil, Trash2 } from "lucide-react";
import type { Activity } from "@/types";
import { deleteActivity, getLinkOptions, setActivityLink, type LinkOptions } from "@/app/actions/activities";
import { formatDate } from "@/lib/training/dates";
import { DISCIPLINES } from "@/lib/training/disciplines";
import { useAction } from "@/hooks/use-action";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { NativeSelect } from "@/components/ui/input";
import { useWorkoutLog } from "./workout-log-provider";

export function ActivityActions({ activity }: { activity: Activity }) {
  const { openLog } = useWorkoutLog();
  const router = useRouter();
  const { pending, run } = useAction();
  const [confirm, setConfirm] = React.useState(false);

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={() => openLog({ activity })}>
        <Pencil />
        Edit
      </Button>
      <Button variant="outline" onClick={() => setConfirm(true)} aria-label="Delete activity" className="text-danger hover:text-danger">
        <Trash2 />
        <span className="hidden sm:inline">Delete</span>
      </Button>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete this workout?"
        description={
          <>
            “{activity.title}” will be removed from your log and totals. This can&apos;t be undone.
            {activity.planned_session_id ? " Its planned session will go back to “planned”." : ""}
          </>
        }
        pending={pending}
        onConfirm={() =>
          run(() => deleteActivity(activity.id), {
            onSuccess: () => {
              setConfirm(false);
              router.replace("/activities");
            },
          })
        }
      />
    </div>
  );
}

type LinkedSession = { id: string; title: string; dateLabel: string; planned: string; date: string };

export function ActivityPlanLink({ activity, session }: { activity: Activity; session: LinkedSession | null }) {
  const { pending, run } = useAction();
  const [options, setOptions] = React.useState<LinkOptions["sessions"] | null>(null);
  const [choice, setChoice] = React.useState("");

  React.useEffect(() => {
    if (session) return;
    let cancelled = false;
    getLinkOptions(activity.activity_date).then((res) => {
      if (!cancelled) setOptions(res.ok ? res.data.sessions.filter((s) => s.status !== "completed") : []);
    });
    return () => {
      cancelled = true;
    };
  }, [activity.activity_date, session]);

  if (session) {
    return (
      <div>
        <p className="flex items-center gap-2 text-sm font-medium">
          <Link2 className="size-4 text-forest" />
          Completed a planned session
        </p>
        <p className="mt-2 text-sm">{session.title}</p>
        <p className="tnum text-[13px] text-muted-ink">
          {session.dateLabel} · planned {session.planned}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={`/calendar?date=${session.date}`}>View on calendar</Link>
          </Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setActivityLink(activity.id, null))}>
            {pending ? <Loader2 className="animate-spin" /> : <Link2Off />}
            Unlink
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm font-medium">Unplanned workout</p>
      <p className="mt-1 text-[13px] leading-relaxed text-muted-ink">Not linked to a planned session. Link it to mark a nearby session as completed.</p>
      {options === null ? (
        <p className="mt-3 text-xs text-faint-ink">Looking for nearby sessions…</p>
      ) : options.length === 0 ? (
        <p className="mt-3 text-xs text-faint-ink">No open planned sessions within three days of this workout.</p>
      ) : (
        <div className="mt-3 grid gap-2">
          <NativeSelect aria-label="Planned session to link" value={choice} onChange={(e) => setChoice(e.target.value)}>
            <option value="">Choose a session…</option>
            {options.map((s) => (
              <option key={s.id} value={s.id}>
                {formatDate(s.session_date, "EEE MMM d")} · {s.title} ({DISCIPLINES[s.activity_type].label})
              </option>
            ))}
          </NativeSelect>
          <Button size="sm" variant="secondary" disabled={!choice || pending} onClick={() => run(() => setActivityLink(activity.id, choice))} className="w-fit">
            {pending ? <Loader2 className="animate-spin" /> : <Link2 />}
            Link to plan
          </Button>
        </div>
      )}
    </div>
  );
}
