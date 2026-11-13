import { expect, type Page } from "@playwright/test";
import { E2E_USER } from "./local-supabase";

export async function login(page: Page) {
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill(E2E_USER.email);
  await page.getByLabel("Mot de passe").fill(E2E_USER.password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByRole("heading", { level: 1, name: /Bonjour|Bonsoir/ })).toBeVisible();
}

/** Choisit un résultat ; réessaie tant que la page n'est pas interactive (hydratation). */
export async function choose(page: Page, name: "Réussi" | "À retravailler") {
  const button = page.getByRole("button", { name: new RegExp(name) });
  await expect(async () => {
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true", { timeout: 500 });
  }).toPass();
}
