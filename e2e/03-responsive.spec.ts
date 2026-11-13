import { expect, test } from "@playwright/test";
import { login } from "./helpers";

const PAGES = ["/", "/aujourdhui", "/programme", "/exercices", "/repertoire", "/parcours", "/progression", "/parametres"];

test("les écrans tiennent dans la largeur, sans défilement horizontal", async ({ page }, testInfo) => {
  await login(page);
  for (const path of PAGES) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `défilement horizontal sur ${path}`).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: `test-results/ecrans/${testInfo.project.name}${path === "/" ? "-accueil" : path.replace(/\//g, "-")}.png`,
      fullPage: true,
      animations: "disabled",
    });
  }
});
