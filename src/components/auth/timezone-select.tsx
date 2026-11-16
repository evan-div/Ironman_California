"use client";

import * as React from "react";
import { NativeSelect } from "@/components/ui/input";

const FALLBACK = ["America/Denver", "America/Los_Angeles", "America/Chicago", "America/New_York", "Europe/London", "UTC"];

function zones(current: string): string[] {
  let list: string[] = FALLBACK;
  try {
    list = Intl.supportedValuesOf("timeZone");
  } catch {
    // Older browsers: fall back to a short list.
  }
  return list.includes(current) ? list : [current, ...list];
}

export function TimezoneSelect(props: Omit<React.ComponentProps<typeof NativeSelect>, "children"> & { value: string }) {
  const options = React.useMemo(() => zones(props.value), [props.value]);
  return (
    <NativeSelect {...props}>
      {options.map((z) => (
        <option key={z} value={z}>
          {z.replace(/_/g, " ")}
        </option>
      ))}
    </NativeSelect>
  );
}
