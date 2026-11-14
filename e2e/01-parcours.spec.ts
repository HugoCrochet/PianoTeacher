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

  // Outils de séance : minuteur (horloge simulée), métronome, mode pupitre.
  await page.clock.install();
  await page.reload();
  await expect(page.getByRole("timer")).toBeVisible();
  const startTimer = page.getByRole("button", { name: "Démarrer" });
  await expect(async () => {
    await startTimer.click({ timeout: 500 });
    await expect(page.getByText("En cours")).toBeVisible({ timeout: 500 });
  }).toPass();
  await page.clock.fastForward("03:00");
  await expect(page.getByLabel("Durée réelle (min)")).toHaveValue("3");
  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByText("En pause")).toBeVisible();
  await page.getByRole("button", { name: "Remettre à zéro" }).click();

  const bpmValue = page.getByRole("listitem").filter({ hasText: "Métronome" });
  const before = Number((await bpmValue.locator(".tabular-nums").innerText()).replace(/\D/g, ""));
  await page.getByRole("button", { name: /Accélérer de 2 BPM/ }).click();
  await expect(bpmValue.locator(".tabular-nums")).toContainText(String(before + 2));
  const play = page.getByRole("button", { name: /Lancer|Arrêter/ });
  await play.click();
  await expect(play).toHaveAttribute("aria-pressed", "true");
  await play.click();
  await expect(play).toHaveAttribute("aria-pressed", "false");

  const pupitre = page.getByRole("button", { name: "Mode pupitre" });
  await pupitre.click();
  await expect(pupitre).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.getByRole("button", { name: "Mode pupitre" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Mode pupitre" }).click();
  await expect(page.getByRole("button", { name: "Mode pupitre" })).toHaveAttribute("aria-pressed", "false");

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

  // Bilan, calendrier, temps par domaine, jalons : uniquement à partir des résultats réels.
  await expect(page.getByRole("heading", { name: "Bilan de la semaine dernière" })).toBeVisible();
  await expect(page.getByText("Une semaine de pause")).toBeVisible();
  await expect(page.getByRole("img", { name: /^1 jour de pratique sur les 12 dernières semaines/ })).toBeVisible();
  await expect(page.getByRole("img", { name: /^Cette semaine : .+ 5 min/ })).toBeVisible();
  await expect(page.getByText("✓ Première séance enregistrée")).toBeVisible();
  await expect(page.getByText("Prochain jalon : 10 jours de pratique")).toBeVisible();

  await page.goto("/parametres");
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/\/connexion$/);
});
