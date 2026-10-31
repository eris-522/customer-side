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

export const calculatePrebookedOvertimeFee = (
  ot: PrebookedOvertimeState | null | undefined
): number => {
  if (!ot) return 0;
  return (
    (Number(ot.catering) || 0) * 4000 +
    (Number(ot.soundsLights) || 0) * 1500 +
    (Number(ot.photoBooth) || 0) * 1000 +
    (Number(ot.emcee) || 0) * 500 +
    ((Number(ot.coordinators?.hours) || 0) *
      (Number(ot.coordinators?.count) || 2) *
      300) +
    (Number(ot.photoVideo) || 0) * 2500 +
    (Number(ot.mobileBar) || 0) * 1500
  );
};

export const timeStringToMinutes = (str: string): number => {
  if (!str) return 0;
  const s = str.trim();
  let hours = 0;
  let minutes = 0;
  if (s.toUpperCase().includes("AM") || s.toUpperCase().includes("PM")) {
    const parts = s.split(" ");
    if (parts.length === 2) {
      const [time, period] = parts;
      const tParts = time.split(":");
      hours = parseInt(tParts[0], 10) || 0;
      minutes = parseInt(tParts[1] || "0", 10) || 0;
      if (period.toUpperCase() === "PM" && hours !== 12) hours += 12;
      if (period.toUpperCase() === "AM" && hours === 12) hours = 0;
    }
  } else {
    const parts = s.split(":");
    hours = parseInt(parts[0], 10) || 0;
    minutes = parseInt(parts[1] || "0", 10) || 0;
  }
  return hours * 60 + minutes;
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
  const hasSelectedTime = Boolean(startTimeStr && startTimeStr.trim());
  const effectiveStart = hasSelectedTime ? startTimeStr.trim() : "07:00 PM";
  const startMins = timeStringToMinutes(effectiveStart);
  const standardEndMins = startMins + 4 * 60;
  const extendedEndMins = standardEndMins + (extraCateringHours || 0) * 60;

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
    hasExtraHours: (extraCateringHours || 0) > 0,
    extraCateringHours: extraCateringHours || 0,
    totalDurationHours: 4 + (extraCateringHours || 0),
  };
};

/**
 * Contract Rule: "1 minute equals 1 hour OT"
 * If actual end time exceeds scheduled end time by even 1 minute, Math.ceil(minutesOver / 60) hours are billed.
 */
export const calculateDayOfOvertime = (
  scheduledEndStr: string,
  actualEndStr: string,
  selectedServiceIds: string[] = ["catering"],
  coordinatorCount: number = 2
) => {
  if (!scheduledEndStr || !actualEndStr) {
    return {
      minutesOver: 0,
      billableOtHours: 0,
      servicesBilled: [],
      totalFee: 0,
      isOvertime: false,
    };
  }

  const schedMins = timeStringToMinutes(scheduledEndStr);
  const actMins = timeStringToMinutes(actualEndStr);

  let minutesOver = actMins - schedMins;
  // Handle cross-midnight events (e.g., scheduled 11:00 PM = 1380m, actual 01:15 AM = 75m)
  if (minutesOver < 0 && actMins < 12 * 60 && schedMins >= 12 * 60) {
    minutesOver += 24 * 60;
  }

  if (minutesOver <= 0) {
    return {
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
      const count = rateItem.perPerson ? Math.max(1, coordinatorCount) : 1;
      const subtotal = billableOtHours * rateItem.rate * count;
      return {
        id: rateItem.id,
        name: rateItem.name,
        rate: rateItem.rate,
        perPerson: rateItem.perPerson,
        count,
        hours: billableOtHours,
        subtotal,
      };
    })
    .filter(Boolean) as Array<{
    id: string;
    name: string;
    rate: number;
    perPerson: boolean;
    count: number;
    hours: number;
    subtotal: number;
  }>;

  const totalFee = servicesBilled.reduce((sum, s) => sum + s.subtotal, 0);

  return {
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
  const inclusions = rawInclusions.map((i) => String(i).toLowerCase().trim());
  const hasInclusion = (patterns) =>
    patterns.some((p) => inclusions.some((inc) => inc.includes(p)));

  switch (serviceId) {
    case "soundsLights":
      return hasInclusion(["sound", "light", "audio", "pa system"]);
    case "photoBooth":
      return hasInclusion(["photobooth", "photo booth", "photo-booth"]);
    case "emcee":
      return hasInclusion(["emcee", "host", "dj/emcee", "dj / emcee", "master of ceremonies"]);
    case "coordinators":
      return hasInclusion(["coordinator", "coordination", "planner"]);
    case "photoVideo":
      return hasInclusion(["photo", "video", "coverage", "photographer", "videographer"]);
    case "mobileBar":
      return hasInclusion(["mobile bar", "bar service", "bartender", "cocktail bar"]);
    default:
      return true;
  }
};
