import { expect, test, type Page } from "@playwright/test";
import { E2E_OTHER, E2E_OWNER } from "../../playwright.config";
import { TEST_PASSWORD } from "../support/supabase";
import { addDaysStr, formatDate, todayInTimeZone, weekStart } from "../../src/lib/training/dates";

// One athlete's journey, in order. Every step talks to the real database.
test.describe.configure({ mode: "serial" });

const today = todayInTimeZone("America/Denver");
const tuesday = addDaysStr(weekStart(today), 1);
const wednesday = addDaysStr(weekStart(today), 2);
const thursday = addDaysStr(weekStart(today), 3);

let page: Page;
let rideUrl = "";

async function signIn(p: Page, email: string) {
  await p.goto("/login");
  await p.getByLabel("Email").fill(email);
  await p.getByLabel("Password").fill(TEST_PASSWORD);
  await p.getByRole("button", { name: "Sign in", exact: true }).click();
}

const day = (date: string) => page.locator(`[data-testid="calendar-day"][data-date="${date}"]`);
const dialog = () => page.getByRole("dialog");

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
});
test.afterAll(async () => {
  await page.close();
});

test("protected pages redirect signed-out visitors to sign in", async () => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/calendar");
  await expect(page).toHaveURL(/\/login\?next=%2Fcalendar/);
});

test("1. sign in, with a clear error for bad credentials", async () => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(E2E_OWNER);
  await page.getByLabel("Password").fill("definitely-wrong");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("That email and password don't match")).toBeVisible();

  await signIn(page, E2E_OWNER);
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByLabel("What should we call you?").fill("Evan");
  await expect(page.getByRole("switch", { name: /starter plan/i })).toBeChecked();
  await page.getByRole("button", { name: "Start training" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});

test("2. dashboard loads with the race countdown and seeded facts", async () => {
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Evan");
  await expect(page.getByRole("heading", { name: "IRONMAN California" })).toBeVisible();
  const expectedDays = Math.round((Date.parse("2027-10-24") - Date.parse(today)) / 86_400_000);
  await expect(page.getByTestId("countdown-days")).toHaveText(expectedDays.toLocaleString("en-US"));
  await expect(page.getByText("13h 44m")).toBeVisible();
  await expect(page.getByRole("link", { name: /Morning Swim/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Post-Swim Sauna/ }).first()).toBeVisible();
  // Seeded swim has no duration and the sauna is recovery: neither adds training time.
  if (weekStart(today) === "2026-11-16") await expect(page.getByTestId("week-actual-hours")).toHaveText("0.0");
});

test("3. log a swim", async () => {
  await page.getByRole("main").getByRole("button", { name: "Log workout" }).click();
  await dialog().getByRole("radio", { name: "Swim" }).click();
  await dialog().getByLabel("Title").fill("E2E Swim");
  await dialog().getByLabel("Date").fill(today);
  await dialog().getByRole("textbox", { name: /^Duration/ }).fill("30");
  await dialog().getByRole("textbox", { name: /^Distance/ }).fill("1200");
  await expect(dialog().getByText("Average 2:30 /100yd")).toBeVisible();
  await dialog().getByRole("button", { name: "Save workout" }).click();
  await expect(page.getByText("Workout logged")).toBeVisible();
  await expect(dialog()).toBeHidden();
  await expect(page.getByRole("link", { name: /E2E Swim/ }).first()).toBeVisible();
  await expect(page.getByTestId("week-actual-hours")).toHaveText("0.5");
});

test("4. edit the swim, and the change survives a reload", async () => {
  await page.goto("/activities?q=E2E+Swim");
  await page.getByRole("link", { name: /E2E Swim/ }).click();
  await expect(page).toHaveURL(/\/activities\/[0-9a-f-]{36}/);
  await page.getByRole("button", { name: "Edit" }).click();
  await dialog().getByRole("textbox", { name: /^Distance/ }).fill("1500");
  await dialog().getByLabel("Notes").fill("Felt smooth.");
  await dialog().getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Workout updated")).toBeVisible();
  await expect(page.getByText("1,500 yd")).toBeVisible();
  await page.reload();
  await expect(page.getByText("1,500 yd")).toBeVisible();
  await expect(page.getByText("2:00 /100yd")).toBeVisible();
  await expect(page.getByText("Felt smooth.")).toBeVisible();
});

test("5. create a planned bike workout", async () => {
  await page.goto("/calendar");
  await day(tuesday).hover();
  await day(tuesday).getByRole("button", { name: /^Plan a session/ }).click();
  await dialog().getByRole("radio", { name: "Bike" }).click();
  await dialog().getByLabel("Title").fill("E2E Ride");
  await expect(dialog().getByLabel("Date")).toHaveValue(tuesday);
  await dialog().getByRole("textbox", { name: /^Duration/ }).fill("40");
  await dialog().getByLabel(/^Workout structure/).selectOption("easy_aerobic");
  await dialog().getByRole("button", { name: "Add to plan" }).click();
  await expect(page.getByText("Session planned")).toBeVisible();
  const chip = day(tuesday).getByRole("button", { name: /^Planned: E2E Ride/ });
  await expect(chip).toBeVisible();
  await chip.click();
  await expect(dialog().getByText("Easy aerobic", { exact: true })).toBeVisible(); // 10 / 25 / 5 structure
  await expect(dialog().getByText("25m")).toBeVisible();
  await page.keyboard.press("Escape");
});

test("6. move the bike workout: drag and drop, then the tap alternative", async () => {
  // Drag Tuesday → Wednesday
  const chip = day(tuesday).getByRole("button", { name: /E2E Ride/ });
  const from = (await chip.boundingBox())!;
  const to = (await day(wednesday).boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 12, from.y + from.height / 2 + 12, { steps: 3 });
  await page.mouse.move(to.x + to.width / 2, to.y + to.height - 60, { steps: 10 });
  await page.mouse.up();
  await expect(page.getByText(`E2E Ride moved to ${formatDate(wednesday, "EEEE, MMM d")}`).first()).toBeVisible();
  await expect(day(wednesday).getByRole("button", { name: /E2E Ride/ })).toBeVisible();
  await expect(day(tuesday).getByRole("button", { name: /E2E Ride/ })).toHaveCount(0);

  // Dialog-based move Wednesday → Thursday (keyboard / touch alternative)
  await day(wednesday).getByRole("button", { name: /E2E Ride/ }).click();
  await dialog().getByRole("button", { name: "Move one day later" }).click();
  await expect(day(thursday).getByRole("button", { name: /E2E Ride.*rescheduled/ })).toBeVisible();

  await page.reload();
  await expect(day(thursday).getByRole("button", { name: /E2E Ride/ })).toBeVisible();
  await expect(day(wednesday).getByRole("button", { name: /E2E Ride/ })).toHaveCount(0);
  await day(thursday).getByRole("button", { name: /E2E Ride/ }).click();
  await expect(dialog().getByText(`Moved from ${formatDate(tuesday, "EEE, MMM d")}`)).toBeVisible();
  await page.keyboard.press("Escape");
});

test("7. complete the planned bike workout", async () => {
  await expect(page.getByTestId("calendar-planned")).not.toHaveText("0.0 h");
  await day(thursday).getByRole("button", { name: /E2E Ride/ }).click();
  await dialog().getByRole("button", { name: "Log completion" }).click();
  await expect(dialog().getByRole("heading", { name: "Log planned workout" })).toBeVisible();
  await expect(dialog().getByLabel("Title")).toHaveValue("E2E Ride");
  await expect(dialog().getByRole("radio", { name: "Bike" })).toBeChecked();
  await expect(dialog().getByText("Planned: 40m")).toBeVisible();
  await expect(dialog().getByRole("textbox", { name: /^Duration/ })).toHaveValue(""); // never prefilled from the plan
  await dialog().getByRole("textbox", { name: /^Duration/ }).fill("42");
  await dialog().getByRole("button", { name: "Save workout" }).click();
  await expect(page.getByText("Workout logged")).toBeVisible();

  const done = page.locator('[data-testid="session-chip"][data-status="completed"]', { hasText: "E2E Ride" });
  await expect(done.first()).toBeVisible();

  // The logged ride is a real activity linked to the plan.
  await page.goto("/activities?q=E2E+Ride");
  await page.getByRole("link", { name: /E2E Ride/ }).click();
  await expect(page.getByText("Completed a planned session")).toBeVisible();
  await expect(page.getByText("42m").first()).toBeVisible();
  await expect(page).toHaveURL(/\/activities\/[0-9a-f-]{36}/);
  rideUrl = new URL(page.url()).pathname;
});

test("8. dashboard and charts reflect the new workouts", async () => {
  await page.goto("/dashboard");
  await expect(page.getByTestId("week-actual-hours")).toHaveText("1.2"); // 30m swim + 42m ride
  await page.goto("/progress");
  const card = (title: string) => page.locator("figure", { has: page.getByRole("heading", { name: title }) });
  await expect(card("Weekly training hours")).toContainText("This week: 1.2 h");
  await expect(card("Cycling hours per week")).toContainText("0.7 h over the last 12 weeks");
  await expect(card("Planned versus completed")).toContainText("1.2 h completed");
  await expect(card("Consistency")).toContainText("1 of");
  await expect(card("Weekly training hours").locator("svg.recharts-surface").first()).toBeVisible();
  await expect(card("Running hours per week")).toContainText("Not enough data yet");
});

test("9. delete an activity (with confirmation); the planned session reopens", async () => {
  await page.goto(rideUrl);
  await page.getByRole("button", { name: "Delete activity" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("Delete this workout?");
  await page.getByRole("alertdialog").getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("heading", { name: "E2E Ride" })).toBeVisible();

  await page.getByRole("button", { name: "Delete activity" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page).toHaveURL(/\/activities$/);
  await expect(page.getByRole("link", { name: /E2E Ride/ })).toHaveCount(0);

  await page.goto(rideUrl);
  await expect(page.getByText("Off course.")).toBeVisible();

  await page.goto("/calendar");
  await expect(page.locator('[data-testid="session-chip"][data-status="planned"]', { hasText: "E2E Ride" }).first()).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByTestId("week-actual-hours")).toHaveText("0.5");
});

test("10. another account cannot read this athlete's data", async () => {
  await page.goto("/activities?q=E2E+Swim");
  await page.getByRole("link", { name: /E2E Swim/ }).click();
  await expect(page).toHaveURL(/\/activities\/[0-9a-f-]{36}/);
  const swimUrl = new URL(page.url()).pathname;

  await page.goto("/settings");
  await page.getByRole("main").getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);

  await signIn(page, E2E_OTHER);
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("Pick a finish line.")).toBeVisible();
  await expect(page.getByText("Your log starts here")).toBeVisible();

  await page.goto("/activities");
  await expect(page.getByText("No workouts logged yet")).toBeVisible();
  await page.goto(swimUrl);
  await expect(page.getByText("Off course.")).toBeVisible();
  await page.goto("/calendar");
  await expect(page.getByTestId("calendar-grid")).toBeVisible();
  await expect(page.getByTestId("session-chip")).toHaveCount(0);
  await expect(page.getByTestId("activity-chip")).toHaveCount(0);
  await page.goto("/roadmap");
  await expect(page.getByText("No phases yet")).toBeVisible();
  // The starter plan is never offered to anyone but the owner.
  await page.goto("/settings");
  await expect(page.getByText("IRONMAN California starter plan")).toHaveCount(0);
});
