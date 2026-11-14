import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test.describe.configure({ mode: "serial" });

test("parcours : cercle des tonalités et fiche de compétence", async ({ page }) => {
  await login(page);
  await page.goto("/parcours");
  await expect(page.getByRole("heading", { name: /Les 12 tonalités/ })).toBeVisible();
  await expect(page.getByRole("img", { name: /tonalités travaillées sur 24/ })).toBeVisible();
  await expect(page.getByText(/Prochaines à découvrir :|Toutes les tonalités ont été travaillées/)).toBeVisible();

  await page.getByRole("link", { name: /Clé de fa : lignes et interlignes/ }).click();
  await expect(page).toHaveURL(/\/parcours\/lec-fa-portee$/);
  await expect(page.getByRole("heading", { level: 1, name: "Clé de fa : lignes et interlignes" })).toBeVisible();
  await expect(page.getByText(/Objectif :/)).toBeVisible();
  await expect(page.getByText("Réussites au total")).toBeVisible();
  await expect(page.getByText(/jamais acquise sur une seule réussite/)).toBeVisible();
  await page.getByRole("link", { name: /Clé de fa : les lignes/ }).click();
  await expect(page).toHaveURL(/\/exercices\/lecture-fa-lignes$/);
});

test("répertoire : découper un morceau en passages", async ({ page }) => {
  await login(page);
  await page.goto("/repertoire?onglet=suggestions");
  await page.getByRole("button", { name: "Ajouter à mes morceaux" }).nth(1).click();
  await expect(page).toHaveURL(/\/repertoire\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Passages" })).toBeVisible();

  await page.getByLabel("Nombre de mesures du morceau").fill("20");
  await page.getByLabel("Mesures par passage").fill("8");
  await page.getByRole("button", { name: "Découper" }).click();
  await expect(page.getByText("3 passages ajoutés.")).toBeVisible();
  for (const label of ["Mesures 1–8", "Mesures 9–16", "Mesures 17–20"]) {
    await expect(page.getByRole("listitem").filter({ hasText: label })).toContainText("Pas encore travaillé");
  }

  await page.getByLabel("Nom du passage").fill("Coda");
  await page.getByLabel("Tempo visé (optionnel)").fill("60");
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "Coda" })).toContainText("60 BPM visés");

  await page.getByRole("button", { name: "Supprimer le passage Coda" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "Coda" })).toHaveCount(0);
  await expect(page.getByRole("listitem").filter({ hasText: "Mesures 1–8" })).toBeVisible();
});
