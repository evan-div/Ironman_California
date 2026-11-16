"use client";

import * as React from "react";
import type { Activity, ActivityType, PlannedSession, Profile } from "@/types";
import { ActivityFormDialog } from "./activity-form-dialog";

export type LogOptions = {
  /** Calendar date to log against (defaults to today). */
  date?: string;
  type?: ActivityType;
  /** Planned session being completed: the new activity is linked to it. */
  session?: PlannedSession;
  /** Existing activity to edit. */
  activity?: Activity;
};

type WorkoutLogContextValue = {
  openLog: (options?: LogOptions) => void;
  profile: Profile;
  today: string;
};

const WorkoutLogContext = React.createContext<WorkoutLogContextValue | null>(null);

export function useWorkoutLog() {
  const ctx = React.use(WorkoutLogContext);
  if (!ctx) throw new Error("useWorkoutLog must be used inside WorkoutLogProvider");
  return ctx;
}

/** Makes the one log-workout dialog available from anywhere in the app shell. */
export function WorkoutLogProvider({ profile, today, children }: { profile: Profile; today: string; children: React.ReactNode }) {
  const [state, setState] = React.useState<{ open: boolean; options: LogOptions; nonce: number }>({ open: false, options: {}, nonce: 0 });

  const openLog = React.useCallback((options: LogOptions = {}) => {
    setState((s) => ({ open: true, options, nonce: s.nonce + 1 }));
  }, []);

  const value = React.useMemo(() => ({ openLog, profile, today }), [openLog, profile, today]);

  return (
    <WorkoutLogContext value={value}>
      {children}
      <ActivityFormDialog
        key={state.nonce}
        open={state.open}
        onOpenChange={(open) => setState((s) => ({ ...s, open }))}
        options={state.options}
        profile={profile}
        today={today}
      />
    </WorkoutLogContext>
  );
}
