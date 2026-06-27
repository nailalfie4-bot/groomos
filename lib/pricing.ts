/**
 * The Matting Meter — owner-declared, no AI.
 *
 * Given a service, the dog's size, and the owner's honest coat assessment, this
 * computes a transparent price + time quote using the groomer's configurable
 * settings. The "reason" string is written warmly, framed as care for the dog.
 */

import type {
  BookingQuote,
  CoatCondition,
  DogSize,
  Service,
  Settings,
} from "@/lib/types";

export const DEFAULT_SETTINGS: Settings = {
  bufferMin: 15,
  tangledFee: 10,
  tangledExtraMin: 30,
  mattedFee: 20,
  mattedExtraMin: 60,
  giantFee: 15,
  giantExtraMin: 15,
  remindersEnabled: true,
  defaultRebookWeeks: 6,
  depositEnabled: true,
  depositAmount: 10,
  cancellationNoticeHours: 48,
};

export const SIZE_LABEL: Record<DogSize, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
  giant: "Giant",
};

export const COAT_LABEL: Record<CoatCondition, string> = {
  smooth: "Smooth & brushed",
  tangled: "A bit tangled",
  matted: "Matted / pelted",
};

export const COAT_HELP: Record<CoatCondition, string> = {
  smooth: "Brushed regularly, no knots.",
  tangled: "A few knots or tangles to work through.",
  matted: "Tight matting close to the skin.",
};

export function computeQuote(
  service: Pick<Service, "priceGBP" | "durationMin">,
  size: DogSize,
  coat: CoatCondition,
  settings: Settings,
  petName = "your dog",
): BookingQuote {
  let mattingFee = 0;
  let mattingExtraMin = 0;
  if (coat === "tangled") {
    mattingFee = settings.tangledFee;
    mattingExtraMin = settings.tangledExtraMin;
  } else if (coat === "matted") {
    mattingFee = settings.mattedFee;
    mattingExtraMin = settings.mattedExtraMin;
  }

  let sizeFee = 0;
  let sizeExtraMin = 0;
  if (size === "giant") {
    sizeFee = settings.giantFee;
    sizeExtraMin = settings.giantExtraMin;
  }

  const totalPriceGBP = service.priceGBP + mattingFee + sizeFee;
  const totalDurationMin = service.durationMin + mattingExtraMin + sizeExtraMin;

  return {
    basePriceGBP: service.priceGBP,
    baseDurationMin: service.durationMin,
    mattingFee,
    mattingExtraMin,
    sizeFee,
    sizeExtraMin,
    totalPriceGBP,
    totalDurationMin,
    reason: buildReason(petName, size, coat, mattingExtraMin + sizeExtraMin),
  };
}

function buildReason(
  petName: string,
  size: DogSize,
  coat: CoatCondition,
  extraMin: number,
): string {
  if (coat === "smooth" && size !== "giant") return "";

  const bits: string[] = [];
  if (size === "giant") bits.push("a giant breed");
  if (coat === "tangled") bits.push("a bit of tangling");
  if (coat === "matted") bits.push("some matting to work through gently");

  const because =
    bits.length === 2
      ? `${bits[0]} with ${bits[1]}`
      : bits.join(" ");

  return `Because ${petName}'s ${because}, we've set aside ${extraMin} extra minutes so they're not rushed and stay comfortable.`;
}
