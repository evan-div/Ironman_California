"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkoutLog, type LogOptions } from "./workout-log-provider";

export function LogWorkoutButton({
  options,
  children = "Log workout",
  ...props
}: Omit<React.ComponentProps<typeof Button>, "onClick"> & { options?: LogOptions }) {
  const { openLog } = useWorkoutLog();
  return (
    <Button onClick={() => openLog(options)} {...props}>
      <Plus />
      {children}
    </Button>
  );
}
