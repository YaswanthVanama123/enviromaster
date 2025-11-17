import { useEffect } from "react";
import { q, setVal, toNum } from "../utils/dom";
import { usePricing } from "./usePricing";

// Helper: safely convert anything to a number
const n = (v: any, fallback = 0): number => {
  const num = Number(v);
  return Number.isFinite(num) ? num : fallback;
};

/**
 * Hook that wires pricing + formulas to the uncontrolled <input> fields
 * rendered by ServicesSection.
 *
 * Call: useServiceCalcs([groups])
 */
export function useServiceCalcs(deps: any[]) {
  const PRICING = usePricing();

  useEffect(() => {
    /** ---------------- RESTROOM & HYGIENE (Sani) ---------------- */
    const recalcSani = () => {
      // Total fixtures – main driver for SaniClean Weekly
      let fixtures = toNum(q("saniTotalFixtures")?.value);

      // If they still fill individual fields (old layout), fold them in:
      if (!fixtures) {
        const bowls = toNum(q("saniBowls")?.value);
        const urinals = toNum(q("saniUrinals")?.value);
        const sinks = toNum(q("saniSinks")?.value);
        fixtures = bowls + urinals + sinks;
        if (fixtures) setVal("saniTotalFixtures", fixtures);
      }

      // Determine regional rate (fall back to 0 if missing)
      const region = PRICING?.sani?.useRegion === "outside" ? "outside" : "inside";
      const baseRate =
        region === "inside"
          ? n(PRICING?.sani?.insidePrice, 0)
          : n(PRICING?.sani?.outsidePrice, 0);

      // Show per-fixture rate in the "All-Inclusive Rate Per Fixture" / @ field
      const rateEl = q("saniRatePerFixture");
      let rate = toNum(rateEl?.value);
      if (!rate && rateEl) {
        rate = baseRate;
        rateEl.value = baseRate.toFixed(2);
      }

      // Also show all-inclusive rate if you have a separate field
      const allInclEl = q("saniAllInclusiveRate");
      if (allInclEl && !allInclEl.value) {
        allInclEl.value = baseRate.toFixed(2);
      }

      // Minimum weekly charge from pricing (safe)
      const regMin =
        region === "inside"
          ? n(PRICING?.sani?.insideMin, 0)
          : n(PRICING?.sani?.outsideMin, 0);

      // Seed "Minimum Weekly Charge" field if empty
      const minWeeklyEl = q("saniMinWeeklyCharge");
      if (minWeeklyEl && !toNum(minWeeklyEl.value) && regMin > 0) {
        minWeeklyEl.value = regMin.toFixed(2);
      }

      // Trip charge – if empty, seed from standard trip pricing
      const tripEl = q("tripCharge");
      let trip = toNum(tripEl?.value);
      const defaultTrip = n(PRICING?.trip?.standard, 0);
      if (!trip && tripEl && defaultTrip > 0) {
        trip = defaultTrip;
        tripEl.value = trip.toFixed(2);
      }

      // Base weekly = fixtures * rate, respecting regional minimums
      let weekly = fixtures * rate;
      weekly = Math.max(weekly, regMin || 0);

      // Small-account rule: if fixtures <= smallThreshold, bump to smallMin
      const smallThreshold = n(PRICING?.sani?.smallThreshold, 0);
      const smallMin = n(PRICING?.sani?.smallMin, 0);

      if (fixtures > 0 && smallThreshold > 0 && fixtures <= smallThreshold) {
        weekly = Math.max(weekly, smallMin);
      }

      // Add trip
      weekly += trip;

      if (weekly > 0) {
        setVal("saniWeeklyTotal", weekly.toFixed(2));
      }

      // ----- Agreement math (monthly + contract total) -----
      const freqRaw = (q("saniFrequency")?.value || "").toLowerCase();
      let visitsPerMonth = 0;
      if (freqRaw.includes("week") && freqRaw.includes("bi")) {
        visitsPerMonth = 2; // Bi-weekly
      } else if (freqRaw.includes("week")) {
        visitsPerMonth = 4; // Weekly
      } else if (freqRaw.includes("month")) {
        visitsPerMonth = 1; // Monthly
      }

      let agreementMonths = toNum(q("agreementMonths")?.value);
      if (!agreementMonths) {
        agreementMonths = 15;
        setVal("agreementMonths", agreementMonths);
      }

      if (visitsPerMonth > 0 && agreementMonths > 0 && weekly > 0) {
        const monthly = weekly * visitsPerMonth;
        const contractTotal = monthly * agreementMonths;

        setVal("saniMonthlyCharge", monthly.toFixed(2));
        setVal("saniContractTotal", contractTotal.toFixed(2));
      }
    };

    /** ---------------- RPM WINDOW ---------------- */
    const recalcRpm = () => {
      // Quantities
      const smallQty = toNum(q("rpmSmallQty")?.value);
      const mediumQty = toNum(q("rpmMediumQty")?.value);
      const largeQty = toNum(q("rpmLargeQty")?.value);

      // Seed rates from backend pricing if empty (safe numeric)
      let smallRate = toNum(q("rpmSmallRate")?.value);
      let mediumRate = toNum(q("rpmMediumRate")?.value);
      let largeRate = toNum(q("rpmLargeRate")?.value);

      const defaultSmall = n(PRICING?.rpm?.rateSmall, 0);
      const defaultMedium = n(PRICING?.rpm?.rateMedium, 0);
      const defaultLarge = n(PRICING?.rpm?.rateLarge, 0);

      if (!smallRate && q("rpmSmallRate") && defaultSmall > 0) {
        smallRate = defaultSmall;
        setVal("rpmSmallRate", smallRate.toFixed(2));
      }
      if (!mediumRate && q("rpmMediumRate") && defaultMedium > 0) {
        mediumRate = defaultMedium;
        setVal("rpmMediumRate", mediumRate.toFixed(2));
      }
      if (!largeRate && q("rpmLargeRate") && defaultLarge > 0) {
        largeRate = defaultLarge;
        setVal("rpmLargeRate", largeRate.toFixed(2));
      }

      // Per-line totals
      const smallTotal = smallQty * smallRate;
      const mediumTotal = mediumQty * mediumRate;
      const largeTotal = largeQty * largeRate;

      if (smallQty || smallRate) {
        setVal("rpmSmallTotal", smallTotal.toFixed(2));
      }
      if (mediumQty || mediumRate) {
        setVal("rpmMediumTotal", mediumTotal.toFixed(2));
      }
      if (largeQty || largeRate) {
        setVal("rpmLargeTotal", largeTotal.toFixed(2));
      }

      const windowsTotal = smallTotal + mediumTotal + largeTotal;

      // Optional trip + install multiplier for per-visit total
      let rpmTrip = toNum(q("rpmTripCharge")?.value);
      const defaultRpmTrip = n(PRICING?.trip?.standard, 0);
      if (!rpmTrip && q("rpmTripCharge") && defaultRpmTrip > 0) {
        rpmTrip = defaultRpmTrip;
        setVal("rpmTripCharge", rpmTrip.toFixed(2));
      }

      let installMult = toNum(q("rpmInstallMultiplier")?.value);
      const defaultMult = n(PRICING?.rpm?.firstTimeMult, 1);
      if (!installMult && q("rpmInstallMultiplier")) {
        installMult = defaultMult;
        setVal("rpmInstallMultiplier", installMult.toFixed(2));
      }

      const perVisit = (windowsTotal + rpmTrip) * (installMult || 1);
      if (perVisit > 0) {
        setVal("rpmPerVisitTotal", perVisit.toFixed(2));
      }

      // Agreement math for RPM (monthly + contract)
      const freqRaw = (q("rpmFrequency")?.value || "").toLowerCase();
      let visitsPerMonth = 0;
      if (freqRaw.includes("week") && freqRaw.includes("bi")) {
        visitsPerMonth = 2;
      } else if (freqRaw.includes("week")) {
        visitsPerMonth = 4;
      } else if (freqRaw.includes("month")) {
        visitsPerMonth = 1;
      }

      const agreementMonths =
        toNum(q("agreementMonths")?.value) || 15;

      if (visitsPerMonth > 0 && agreementMonths > 0 && perVisit > 0) {
        const monthly = perVisit * visitsPerMonth;
        const contractTotal = monthly * agreementMonths;

        setVal("rpmMonthlyCharge", monthly.toFixed(2));
        setVal("rpmContractTotal", contractTotal.toFixed(2));
      }
    };

    /** ---------------- Generic qty × rate = total ----------------
     * For other atCharge rows (Foaming Drain, Scrub Service,
     * Hand Sanitizer, Micromax, SaniPod…)
     */
    const simpleTriples: [string, string, string][] = [
      // Foaming Drain
      ["fdStandardQty", "fdStandardRate", "fdStandardTotal"],
      ["fdLargeQty", "fdLargeRate", "fdLargeTotal"],
      // Scrub Service
      ["scrBathFixturesQty", "scrBathFixturesRate", "scrBathFixturesTotal"],
      ["scrNonBathQty", "scrNonBathRate", "scrNonBathTotal"],
      // Hand Sanitizer
      ["hsFillsQty", "hsFillsRate", "hsFillsTotal"],
      // Micromax Floor
      ["mmBathroomsQty", "mmBathroomsRate", "mmBathroomsTotal"],
      ["mmExtraNonBathQty", "mmExtraNonBathRate", "mmExtraNonBathTotal"],
      ["mmStandaloneQty", "mmStandaloneRate", "mmStandaloneTotal"],
      // SaniPod
      ["spWeeklyQty", "spWeeklyRate", "spWeeklyTotal"],
    ];

    const recalcSimpleCalcs = () => {
      simpleTriples.forEach(([qtyName, rateName, totalName]) => {
        const qty = toNum(q(qtyName)?.value);
        const rate = toNum(q(rateName)?.value);
        if (!qty && !rate) return;
        const total = qty * rate;
        setVal(totalName, total.toFixed(2));
      });
    };

    /** ---------------- Unified handler ---------------- */
    const handler = () => {
      recalcSani();
      recalcRpm();
      recalcSimpleCalcs();
    };

    // Initial run when form first mounts / pricing arrives
    handler();

    // Watch relevant field names for changes
    const watchNames = [
      // Sani
      "saniTotalFixtures",
      "saniBowls",
      "saniUrinals",
      "saniSinks",
      "saniRatePerFixture",
      "saniMinWeeklyCharge",
      "tripCharge",
      "saniFrequency",
      "agreementMonths",
      // RPM
      "rpmSmallQty",
      "rpmSmallRate",
      "rpmMediumQty",
      "rpmMediumRate",
      "rpmLargeQty",
      "rpmLargeRate",
      "rpmTripCharge",
      "rpmInstallMultiplier",
      "rpmFrequency",
      // Simple calc rows
      "fdStandardQty",
      "fdStandardRate",
      "fdLargeQty",
      "fdLargeRate",
      "scrBathFixturesQty",
      "scrBathFixturesRate",
      "scrNonBathQty",
      "scrNonBathRate",
      "hsFillsQty",
      "hsFillsRate",
      "mmBathroomsQty",
      "mmBathroomsRate",
      "mmExtraNonBathQty",
      "mmExtraNonBathRate",
      "mmStandaloneQty",
      "mmStandaloneRate",
      "spWeeklyQty",
      "spWeeklyRate",
    ];

    watchNames.forEach((name) => {
      const el = q(name);
      if (!el) return;
      el.addEventListener("input", handler);
      el.addEventListener("change", handler);
    });

    return () => {
      watchNames.forEach((name) => {
        const el = q(name);
        if (!el) return;
        el.removeEventListener("input", handler);
        el.removeEventListener("change", handler);
      });
    };
    // Include PRICING so when backend numbers load, it recomputes
  }, [PRICING, ...deps]);
}
