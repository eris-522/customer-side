export interface OvertimeRateItem {
  id: string;
  name: string;
  rate: number;
  unit: string;
  perPerson: boolean;
  defaultCount?: number;
  description: string;
}

export const OVERTIME_SERVICE_RATES: OvertimeRateItem[] = [
  {
    id: "catering",
    name: "Catering Service",
    rate: 4000,
    unit: "per hour",
    perPerson: false,
    description: "Extended dining service, buffet stations & waitstaff floor service",
  },
  {
    id: "soundsLights",
    name: "Sounds & Lights",
    rate: 1500,
    unit: "per hour",
    perPerson: false,
    description: "Sound system, party lights & audio engineer technician extension",
  },
  {
    id: "photoBooth",
    name: "Photo Booth",
    rate: 1000,
    unit: "per hour",
    perPerson: false,
    description: "Unlimited photo prints, customized backdrop, props & attendant",
  },
  {
    id: "emcee",
    name: "Emcee / Host",
    rate: 500,
    unit: "per hour",
    perPerson: false,
    description: "Professional program host / master of ceremonies extension",
  },
  {
    id: "coordinators",
    name: "Coordinators",
    rate: 300,
    unit: "per hour per person",
    perPerson: true,
    defaultCount: 2,
    description: "On-site event coordination team (₱300/hr per coordinator)",
  },
  {
    id: "photoVideo",
    name: "Photo & Video",
    rate: 2500,
    unit: "per hour",
    perPerson: false,
    description: "Professional photographer & videographer coverage extension",
  },
  {
    id: "mobileBar",
    name: "Mobile Bar",
    rate: 1500,
    unit: "per hour",
    perPerson: false,
    description: "Open mobile bar, professional bartenders & cocktail service",
  },
];

export interface PrebookedOvertimeState {
  catering: number;
  soundsLights: number;
  photoBooth: number;
  emcee: number;
  coordinators: { hours: number; count: number };
  photoVideo: number;
  mobileBar: number;
}

export const DEFAULT_PREBOOKED_OVERTIME: PrebookedOvertimeState = {
  catering: 0,
  soundsLights: 0,
  photoBooth: 0,
  emcee: 0,
  coordinators: { hours: 0, count: 2 },
  photoVideo: 0,
  mobileBar: 0,
};

const clampInt = (val: unknown, min: number, max: number, fallback = 0): number => {
  const num = Number(val);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(num)));
};

export const calculatePrebookedOvertimeFee = (
  ot: PrebookedOvertimeState | null | undefined
): number => {
  if (!ot) return 0;
  return (
    clampInt(ot.catering, 0, 12, 0) * 4000 +
    clampInt(ot.soundsLights, 0, 12, 0) * 1500 +
    clampInt(ot.photoBooth, 0, 12, 0) * 1000 +
    clampInt(ot.emcee, 0, 12, 0) * 500 +
    clampInt(ot.coordinators?.hours, 0, 12, 0) *
      clampInt(ot.coordinators?.count, 1, 20, 2) *
      300 +
    clampInt(ot.photoVideo, 0, 12, 0) * 2500 +
    clampInt(ot.mobileBar, 0, 12, 0) * 1500
  );
};

export const validateTimeString = (
  str: string
): { valid: boolean; minutes: number; error?: string } => {
  if (!str || typeof str !== "string" || !str.trim()) {
    return { valid: false, minutes: 0, error: "Actual end time is required." };
  }
  const s = str.trim();

  // 12-hour format: e.g. "08:00 AM", "8:00 AM", "11:30 PM", "11:30pm"
  const regex12 = /^([0]?[1-9]|1[0-2]):([0-5][0-9])\s*(AM|PM)$/i;
  // 24-hour format: e.g. "08:00", "14:30", "23:59"
  const regex24 = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;

  const match12 = s.match(regex12);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const period = match12[3].toUpperCase();
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return { valid: true, minutes: hours * 60 + minutes };
  }

  const match24 = s.match(regex24);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    return { valid: true, minutes: hours * 60 + minutes };
  }

  return {
    valid: false,
    minutes: 0,
    error: "Invalid time format. Please enter a valid time (e.g. 03:00 PM or 15:00).",
  };
};

export const timeStringToMinutes = (str: string): number => {
  const res = validateTimeString(str);
  return res.valid ? res.minutes : 0;
};

export const minutesTo12h = (mins: number): string => {
  const normalized = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = m < 10 ? `0${m}` : `${m}`;
  return `${String(displayH).padStart(2, "0")}:${displayM} ${period}`;
};

export const calculateServiceWindow = (
  startTimeStr: string,
  extraCateringHours: number = 0
) => {
  const safeExtraHours = clampInt(extraCateringHours, 0, 12, 0);
  const hasSelectedTime = Boolean(startTimeStr && startTimeStr.trim());
  const effectiveStart = hasSelectedTime ? startTimeStr.trim() : "07:00 PM";
  const startMins = timeStringToMinutes(effectiveStart);
  const standardEndMins = startMins + 4 * 60;
  const extendedEndMins = standardEndMins + safeExtraHours * 60;

  const startFormatted = minutesTo12h(startMins);
  const standardEndFormatted = minutesTo12h(standardEndMins);
  const extendedEndFormatted = minutesTo12h(extendedEndMins);

  return {
    isDefaultFallback: !hasSelectedTime,
    startTimeLabel: startFormatted,
    standardEndTimeLabel: standardEndFormatted,
    extendedEndTimeLabel: extendedEndFormatted,
    standardWindowText: `${startFormatted} – ${standardEndFormatted}`,
    extendedWindowText: `${startFormatted} – ${extendedEndFormatted}`,
    hasExtraHours: safeExtraHours > 0,
    extraCateringHours: safeExtraHours,
    totalDurationHours: 4 + safeExtraHours,
  };
};

export interface BilledOvertimeService {
  id: string;
  name: string;
  rate: number;
  perPerson: boolean;
  count: number;
  hours: number;
  subtotal: number;
}

export interface DayOfOvertimeResult {
  valid: boolean;
  minutesOver: number;
  billableOtHours: number;
  servicesBilled: BilledOvertimeService[];
  totalFee: number;
  isOvertime: boolean;
  error?: string;
}

/**
 * Contract Rule: "1 minute equals 1 hour OT"
 * If actual end time exceeds scheduled end time by even 1 minute, Math.ceil(minutesOver / 60) hours are billed.
 */
export const calculateDayOfOvertime = (
  scheduledEndStr: string,
  actualEndStr: string,
  selectedServiceIds: string[] = ["catering"],
  coordinatorCount: number = 2
): DayOfOvertimeResult => {
  if (!scheduledEndStr || !actualEndStr || !actualEndStr.trim()) {
    return {
      valid: false,
      minutesOver: 0,
      billableOtHours: 0,
      servicesBilled: [],
      totalFee: 0,
      isOvertime: false,
      error: "Actual end time is required.",
    };
  }

  const schedVal = validateTimeString(scheduledEndStr);
  const actVal = validateTimeString(actualEndStr);

  if (!actVal.valid) {
    return {
      valid: false,
      minutesOver: 0,
      billableOtHours: 0,
      servicesBilled: [],
      totalFee: 0,
      isOvertime: false,
      error: actVal.error || "Invalid actual end time format.",
    };
  }

  if (!schedVal.valid) {
    return {
      valid: false,
      minutesOver: 0,
      billableOtHours: 0,
      servicesBilled: [],
      totalFee: 0,
      isOvertime: false,
      error: "Invalid scheduled end time.",
    };
  }

  const schedMins = schedVal.minutes;
  const actMins = actVal.minutes;

  let minutesOver = actMins - schedMins;
  // Handle genuine cross-midnight overtime (evening end >= 6:00 PM finishing <= 5:00 AM within 8h)
  if (
    minutesOver < 0 &&
    schedMins >= 18 * 60 &&
    actMins <= 5 * 60 &&
    actMins + 24 * 60 - schedMins <= 8 * 60
  ) {
    minutesOver += 24 * 60;
  } else if (minutesOver > 12 * 60 && schedMins < 4 * 60 && actMins >= 20 * 60) {
    // Scheduled end after midnight (12:00 AM–3:59 AM) that wrapped up early before midnight
    minutesOver -= 24 * 60;
  }

  if (minutesOver < -6 * 60) {
    return {
      valid: false,
      minutesOver: 0,
      billableOtHours: 0,
      servicesBilled: [],
      totalFee: 0,
      isOvertime: false,
      error:
        "Actual end time appears to be an AM/PM mismatch compared to the scheduled end time. Please double-check AM/PM.",
    };
  }

  // Prevent unrealistic overtime (> 12 hours)
  if (minutesOver > 12 * 60) {
    return {
      valid: false,
      minutesOver,
      billableOtHours: Math.ceil(minutesOver / 60),
      servicesBilled: [],
      totalFee: 0,
      isOvertime: true,
      error: "Overtime cannot exceed 12 hours on an event. Please check the actual end time.",
    };
  }

  if (minutesOver <= 0) {
    return {
      valid: true,
      minutesOver: 0,
      billableOtHours: 0,
      servicesBilled: [],
      totalFee: 0,
      isOvertime: false,
    };
  }

  const billableOtHours = Math.ceil(minutesOver / 60);

  const servicesBilled = selectedServiceIds
    .map((id) => {
      const rateItem = OVERTIME_SERVICE_RATES.find((r) => r.id === id);
      if (!rateItem) return null;
      const count = rateItem.perPerson ? clampInt(coordinatorCount, 1, 20, 2) : 1;
      const subtotal = billableOtHours * rateItem.rate * count;
      return {
        id: rateItem.id,
        name: rateItem.name,
        rate: rateItem.rate,
        perPerson: Boolean(rateItem.perPerson),
        count,
        hours: billableOtHours,
        subtotal,
      };
    })
    .filter(Boolean) as BilledOvertimeService[];

  const totalFee = servicesBilled.reduce((sum, s) => sum + s.subtotal, 0);

  return {
    valid: true,
    minutesOver,
    billableOtHours,
    servicesBilled,
    totalFee,
    isOvertime: true,
  };
};

/**
 * Checks if a specific overtime vendor service is included in the chosen package.
 * Catering Service is core and always included in every catering package.
 * Other services (Sounds & Lights, Photo Booth, Emcee, Coordinators, Photo & Video, Mobile Bar)
 * are only eligible for overtime if included in the package's inclusions.
 */
export const isServiceIncludedInPackage = (serviceId: string, pkg: any): boolean => {
  if (!pkg) return true;
  if (serviceId === "catering") return true;

  const rawInclusions = Array.isArray(pkg.inclusions) ? pkg.inclusions : [];
  const inclusions = rawInclusions.map((i: any) => String(i).toLowerCase().trim());
  const hasInclusion = (patterns: string[]) =>
    patterns.some((p: string) => inclusions.some((inc: string) => inc.includes(p)));

  switch (serviceId) {
    case "soundsLights":
      return hasInclusion(["sound", "light", "audio", "pa system"]);
    case "photoBooth":
      return hasInclusion(["photobooth", "photo booth", "photo-booth"]);
    case "emcee":
      return hasInclusion(["emcee", "host", "dj/emcee", "dj / emcee", "master of ceremonies"]);
    case "coordinators":
      return hasInclusion(["coordinator", "coordination", "planner"]);
    case "photoVideo": {
      const withoutPhotoBooth = inclusions.map((inc: string) =>
        inc.replace(/photo[\s-]*booth/gi, "").trim()
      );
      return [
        "photo & video",
        "photo and video",
        "photo/video",
        "photography",
        "photographer",
        "videographer",
        "videography",
        "video coverage",
        "photo coverage",
        "sde",
      ].some((p: string) => withoutPhotoBooth.some((inc: string) => inc.includes(p)));
    }
    case "mobileBar":
      return hasInclusion(["mobile bar", "bar service", "bartender", "cocktail bar"]);
    default:
      return true;
  }
};
