import { useEffect } from "react";
import { q, setVal, toNum } from "../utils/dom";
import { usePricing } from "./usePricing";


const n = (v: any, fallback = 0): number => {
  const num = Number(v);
  return Number.isFinite(num) ? num : fallback;
};


export function useServiceCalcs(deps: any[]) {
  const PRICING = usePricing();

  useEffect(() => {

    const recalcSani = () => {

      let fixtures = toNum(q("saniTotalFixtures")?.value);


      if (!fixtures) {
        const bowls = toNum(q("saniBowls")?.value);
        const urinals = toNum(q("saniUrinals")?.value);
        const sinks = toNum(q("saniSinks")?.value);
        fixtures = bowls + urinals + sinks;
        if (fixtures) setVal("saniTotalFixtures", fixtures);
      }


      const region = PRICING?.sani?.useRegion === "outside" ? "outside" : "inside";
      const baseRate =
        region === "inside"
          ? n(PRICING?.sani?.insidePrice, 0)
          : n(PRICING?.sani?.outsidePrice, 0);


      const rateEl = q("saniRatePerFixture");
      let rate = toNum(rateEl?.value);
      if (!rate && rateEl) {
        rate = baseRate;
        rateEl.value = baseRate.toFixed(2);
      }


      const allInclEl = q("saniAllInclusiveRate");
      if (allInclEl && !allInclEl.value) {
        allInclEl.value = baseRate.toFixed(2);
      }


      const regMin =
        region === "inside"
          ? n(PRICING?.sani?.insideMin, 0)
          : n(PRICING?.sani?.outsideMin, 0);


      const minWeeklyEl = q("saniMinWeeklyCharge");
      if (minWeeklyEl && !toNum(minWeeklyEl.value) && regMin > 0) {
        minWeeklyEl.value = regMin.toFixed(2);
      }


      const tripEl = q("tripCharge");
      let trip = toNum(tripEl?.value);
      const defaultTrip = n(PRICING?.trip?.standard, 0);
      if (!trip && tripEl && defaultTrip > 0) {
        trip = defaultTrip;
        tripEl.value = trip.toFixed(2);
      }


      let weekly = fixtures * rate;
      weekly = Math.max(weekly, regMin || 0);


      const smallThreshold = n(PRICING?.sani?.smallThreshold, 0);
      const smallMin = n(PRICING?.sani?.smallMin, 0);

      if (fixtures > 0 && smallThreshold > 0 && fixtures <= smallThreshold) {
        weekly = Math.max(weekly, smallMin);
      }


      weekly += trip;

      if (weekly > 0) {
        setVal("saniWeeklyTotal", weekly.toFixed(2));
      }


      const freqRaw = (q("saniFrequency")?.value || "").toLowerCase();
      let visitsPerMonth = 0;
      if (freqRaw.includes("week") && freqRaw.includes("bi")) {
        visitsPerMonth = 2; 
      } else if (freqRaw.includes("week")) {
        visitsPerMonth = 4; 
      } else if (freqRaw.includes("month")) {
        visitsPerMonth = 1; 
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


    const recalcRpm = () => {

      const smallQty = toNum(q("rpmSmallQty")?.value);
      const mediumQty = toNum(q("rpmMediumQty")?.value);
      const largeQty = toNum(q("rpmLargeQty")?.value);


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


    const simpleTriples: [string, string, string][] = [

      ["fdStandardQty", "fdStandardRate", "fdStandardTotal"],
      ["fdLargeQty", "fdLargeRate", "fdLargeTotal"],

      ["scrBathFixturesQty", "scrBathFixturesRate", "scrBathFixturesTotal"],
      ["scrNonBathQty", "scrNonBathRate", "scrNonBathTotal"],

      ["hsFillsQty", "hsFillsRate", "hsFillsTotal"],

      ["mmBathroomsQty", "mmBathroomsRate", "mmBathroomsTotal"],
      ["mmExtraNonBathQty", "mmExtraNonBathRate", "mmExtraNonBathTotal"],
      ["mmStandaloneQty", "mmStandaloneRate", "mmStandaloneTotal"],

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


    const handler = () => {
      recalcSani();
      recalcRpm();
      recalcSimpleCalcs();
    };


    handler();


    const watchNames = [

      "saniTotalFixtures",
      "saniBowls",
      "saniUrinals",
      "saniSinks",
      "saniRatePerFixture",
      "saniMinWeeklyCharge",
      "tripCharge",
      "saniFrequency",
      "agreementMonths",

      "rpmSmallQty",
      "rpmSmallRate",
      "rpmMediumQty",
      "rpmMediumRate",
      "rpmLargeQty",
      "rpmLargeRate",
      "rpmTripCharge",
      "rpmInstallMultiplier",
      "rpmFrequency",

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

  }, [PRICING, ...deps]);
}
