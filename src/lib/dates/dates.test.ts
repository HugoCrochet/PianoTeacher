import { describe, expect, it } from "vitest";
import { addDays, diffDays, formatLongDate, formatMinutes, isIsoDate, isoWeekday, todayInTimeZone, weekStartOf } from ".";

describe("dates", () => {
  it("donne la date locale de l'utilisateur, pas celle du serveur", () => {
    const now = new Date("2026-11-13T23:30:00Z");
    expect(todayInTimeZone("Europe/Paris", now)).toBe("2026-11-14");
    expect(todayInTimeZone("America/New_York", now)).toBe("2026-11-13");
    expect(todayInTimeZone("fuseau/invalide", now)).toBe("2026-11-14");
  });

  it("calcule le lundi de la semaine", () => {
    expect(weekStartOf("2026-11-13")).toBe("2026-11-09");
    expect(weekStartOf("2026-11-15")).toBe("2026-11-09");
    expect(weekStartOf("2026-11-09")).toBe("2026-11-09");
    expect(isoWeekday("2026-11-15")).toBe(7);
  });

  it("additionne des jours en traversant mois et changement d'heure", () => {
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(diffDays("2026-11-13", "2026-11-09")).toBe(4);
  });

  it("valide les dates ISO", () => {
    expect(isIsoDate("2026-11-13")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("13/11/2026")).toBe(false);
  });

  it("affiche en français", () => {
    expect(formatLongDate("2026-11-13")).toBe("vendredi 13 novembre");
    expect(formatMinutes(220)).toBe("3 h 40");
    expect(formatMinutes(25)).toBe("25 min");
  });
});
