export type PulseAction = {
  title: string;
  description: string;
  type: "community" | "plan" | "event" | "reminder";
};

export type PulseResult = {
  id: string;
  input: string;
  intent: string;
  time: string;
  budget: string;
  distance: string;
  activity: string;
  constraints: string[];
  actions: PulseAction[];
  createdAt: string;
};

export type GroupPlan = {
  id: string;
  title: string;
  timeframe: string;
  participants: string[];
  tasks: string[];
  availability: { label: string; value: string }[];
  budget: string;
  checklist: string[];
  createdAt: string;
};

export type ShareResource = {
  id: string;
  name: string;
  type: "document" | "album" | "location" | "invite" | "link";
  audience: "Public" | "Private" | "Selected people" | "Selected community";
  expiry: string;
  status: "Active" | "Revoked";
  downloads: number;
  lastAccessed: string;
  canDownload: boolean;
};

export type CommitmentTimer = {
  id: string;
  title: string;
  targetAt: string;
  status: "running" | "paused" | "done";
  assignee: string;
  milestones: string[];
};

const PULSE_KEY = "shareezy-pulse-result";
const GROUP_KEY = "shareezy-group-plan";
const SHARES_KEY = "shareezy-share-control";
const TIMERS_KEY = "shareezy-commitment-timers";

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const value = window.localStorage.getItem(key);
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function matchKeywords(raw: string, terms: string[]) {
  const lower = raw.toLowerCase();
  return terms.some((term) => lower.includes(term));
}

export function parsePulseIntent(raw: string): PulseResult {
  const normalized = raw.trim();
  const deadline = matchKeywords(normalized, ["tonight", "this evening", "evening"])
    ? "Tonight"
    : matchKeywords(normalized, ["weekend", "this weekend"])
      ? "This weekend"
      : matchKeywords(normalized, ["tomorrow"])
        ? "Tomorrow"
        : "Flexible";

  const activity = matchKeywords(normalized, ["football", "soccer"])
    ? "Football / sports"
    : matchKeywords(normalized, ["study", "study partner", "revision"])
      ? "Study session"
      : matchKeywords(normalized, ["dinner", "food", "lunch"])
        ? "Group dinner"
        : matchKeywords(normalized, ["borrow", "tool", "borrow a tool"])
          ? "Borrow & share items"
          : matchKeywords(normalized, ["trip", "travel"])
            ? "Weekend trip"
            : matchKeywords(normalized, ["event", "events"])
              ? "Local events"
              : "Community meetup";

  const budget = matchKeywords(normalized, ["low budget", "budget", "cheap", "affordable"])
    ? "Under ₹1,500"
    : matchKeywords(normalized, ["free"])
      ? "Free or low-cost"
      : "Flexible budget";
  const distance = matchKeywords(normalized, ["nearby", "close", "within 2km", "near me"])
    ? "Within 2 km"
    : matchKeywords(normalized, ["walking", "walkable"])
      ? "Walkable distance"
      : "Flexible radius";

  const constraints = [] as string[];
  if (matchKeywords(normalized, ["budget", "low-budget", "cheap"]))
    constraints.push("Cost-sensitive");
  if (matchKeywords(normalized, ["nearby", "close", "near me"])) constraints.push("Local & nearby");
  if (matchKeywords(normalized, ["evening", "tonight"])) constraints.push("Evening time");
  if (matchKeywords(normalized, ["team", "group"])) constraints.push("Group-friendly");
  if (constraints.length === 0) constraints.push("Open to suggestions");

  const actions: PulseAction[] = [
    {
      title: "Find matching local groups",
      description: `Look for nearby communities and public spaces aligned with ${activity.toLowerCase()}.`,
      type: "community",
    },
    {
      title: "Draft an invite",
      description: `Create a concise group invite for ${deadline.toLowerCase()} with a ${budget.toLowerCase()} budget focus.`,
      type: "plan",
    },
    {
      title: "Confirm timing and participants",
      description: `Check availability windows and set the next reminder for ${deadline.toLowerCase()}.`,
      type: "event",
    },
  ];

  return {
    id: `${Date.now()}`,
    input: normalized,
    intent: activity,
    time: deadline,
    budget,
    distance,
    activity,
    constraints,
    actions,
    createdAt: new Date().toISOString(),
  };
}

export function createPulseResult(raw: string) {
  const result = parsePulseIntent(raw);
  writeStorage(PULSE_KEY, result);
  return result;
}

export function loadPulseResult() {
  return readStorage<PulseResult | null>(PULSE_KEY, null);
}

export function createGroupPlan(input: string) {
  const normalized = input.trim() || "Weekend group plan";
  const plan: GroupPlan = {
    id: `${Date.now()}`,
    title: normalized.length > 42 ? `${normalized.slice(0, 42).trim()}…` : normalized,
    timeframe: "This week",
    participants: ["You", "Team", "Nearby friends"],
    tasks: [
      "Confirm timing and meeting point",
      "Share the shortlist with participants",
      "Create a backup option if the first plan is full",
    ],
    availability: [
      { label: "Best slot", value: "Sat · 6:30 PM" },
      { label: "Backup", value: "Sun · 10:00 AM" },
      { label: "Budget", value: "Under ₹1,500" },
    ],
    budget: "Flexible",
    checklist: ["Route", "Budget", "Guest list", "Reminder"],
    createdAt: new Date().toISOString(),
  };

  writeStorage(GROUP_KEY, plan);
  return plan;
}

export function loadGroupPlan() {
  return readStorage<GroupPlan | null>(GROUP_KEY, null);
}

export function createShareResourceDraft() {
  const seed: ShareResource[] = [
    {
      id: "share-1",
      name: "Weekend itinerary",
      type: "document",
      audience: "Selected people",
      expiry: "24h",
      status: "Active",
      downloads: 6,
      lastAccessed: "1 hour ago",
      canDownload: true,
    },
    {
      id: "share-2",
      name: "Group dinner plan",
      type: "link",
      audience: "Selected community",
      expiry: "3 days",
      status: "Active",
      downloads: 12,
      lastAccessed: "Today",
      canDownload: false,
    },
    {
      id: "share-3",
      name: "Local event map",
      type: "location",
      audience: "Public",
      expiry: "Never",
      status: "Active",
      downloads: 19,
      lastAccessed: "2 days ago",
      canDownload: false,
    },
  ];

  writeStorage(SHARES_KEY, seed);
  return seed;
}

export function loadShareResources() {
  const stored = readStorage<ShareResource[] | null>(SHARES_KEY, null);
  return stored ?? createShareResourceDraft();
}

export function saveShareResources(resources: ShareResource[]) {
  writeStorage(SHARES_KEY, resources);
}

export function createCommitmentTimers() {
  const initial: CommitmentTimer[] = [
    {
      id: "timer-1",
      title: "Group dinner prep",
      targetAt: new Date(Date.now() + 1000 * 60 * 75).toISOString(),
      status: "running",
      assignee: "You",
      milestones: ["Invite sent", "Budget reviewed", "Handover complete"],
    },
    {
      id: "timer-2",
      title: "Study session",
      targetAt: new Date(Date.now() + 1000 * 60 * 120).toISOString(),
      status: "paused",
      assignee: "Team",
      milestones: ["Topics selected", "Reminder sent", "Session check-in"],
    },
  ];
  writeStorage(TIMERS_KEY, initial);
  return initial;
}

export function loadCommitmentTimers() {
  const stored = readStorage<CommitmentTimer[] | null>(TIMERS_KEY, null);
  return stored ?? createCommitmentTimers();
}

export function saveCommitmentTimers(timers: CommitmentTimer[]) {
  writeStorage(TIMERS_KEY, timers);
}
