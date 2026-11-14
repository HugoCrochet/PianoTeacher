import { expect, test } from "@playwright/test";
import { choose, login } from "./helpers";
import { E2E_USER } from "./local-supabase";

test.describe.configure({ mode: "serial" });

test("une page privée sans session redirige vers la connexion", async ({ page }) => {
  await page.goto("/progression");
  await expect(page).toHaveURL(/\/connexion$/);
  const exported = await page.request.get("/export?format=json", { maxRedirects: 0 });
  expect(exported.status()).toBeGreaterThanOrEqual(300);
});

test("un mauvais mot de passe affiche une erreur en français", async ({ page }) => {
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill(E2E_USER.email);
  await page.getByLabel("Mot de passe").fill("mauvais");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByText("E-mail ou mot de passe incorrect")).toBeVisible();
});

test("connexion → séance → résultat + BPM → historique, puis déconnexion", async ({ page }) => {
  await login(page);

  await page.getByRole("link", { name: /Aujourd’hui/ }).click();
  const weekend = [0, 6].includes(new Date().getDay());
  await expect(page.getByText(`${weekend ? 60 : 25} minutes, dans cet ordre.`)).toBeVisible();
  await expect(page.getByText(/Pourquoi :/).first()).toBeVisible();
  const taskCount = await page.getByRole("listitem").count();
  expect(taskCount).toBeGreaterThanOrEqual(3);

  await page.getByRole("button", { name: "Commencer la séance" }).click();
  await expect(page).toHaveURL(/\/aujourdhui\/seance$/);
  await expect(page.getByText(`tâche 1 sur ${taskCount}`)).toBeVisible();

  // Le résultat se corrige avant validation.
  const validate = page.getByRole("button", { name: "Valider et continuer" });
  await expect(validate).toBeDisabled();
  const title = await page.getByRole("heading", { level: 1 }).innerText();
  await choose(page, "À retravailler");
  await choose(page, "Réussi");
  await expect(page.getByRole("button", { name: /À retravailler/ })).toHaveAttribute("aria-pressed", "false");
  const bpm = page.getByLabel(/BPM atteint/);
  if (await bpm.count()) await bpm.fill("72");
  await page.getByLabel("Durée réelle (min)").fill("5");
  await validate.click();
  await expect(page.getByText(`tâche 2 sur ${taskCount}`)).toBeVisible();

  await choose(page, "À retravailler");
  await page.getByLabel("Durée réelle (min)").fill("5");
  await validate.click();
  await expect(page.getByText(`tâche 3 sur ${taskCount}`)).toBeVisible();

  // Interrompre puis reprendre.
  await page.getByRole("link", { name: "Aujourd’hui" }).click();
  await page.getByRole("button", { name: "Reprendre la séance" }).click();
  await page.getByRole("button", { name: "Passer" }).click();
  if (taskCount > 3) {
    await expect(page.getByText(`tâche 4 sur ${taskCount}`)).toBeVisible();
    await page.getByRole("button", { name: "Terminer la séance" }).click();
    await expect(page).toHaveURL(/\/aujourdhui$/);
  }

  // Historique : la donnée persiste après rechargement.
  await page.goto("/progression");
  await page.reload();
  await expect(page.getByText("Derniers résultats")).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: title }).filter({ hasText: "Réussi" })).toBeVisible();
  await expect(page.getByText(/1 tâche à retravailler/)).toBeVisible();

  // Les statistiques ne comptent que le réalisé (2 × 5 min saisies), pas le planifié.
  await expect(page.getByText("10 min cette semaine.")).toBeVisible();

  await page.goto("/parametres");
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/\/connexion$/);
});
