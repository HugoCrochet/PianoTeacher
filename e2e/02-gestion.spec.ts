import { expect, test } from "@playwright/test";
import { login } from "./helpers";

const PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
);

test.describe.configure({ mode: "serial" });

test("répertoire : suggestion, partition PDF privée, suppression", async ({ page, browser }) => {
  await login(page);
  // L'ajout est accessible en haut de la liste, sans faire défiler.
  await page.goto("/repertoire");
  await page.getByRole("link", { name: "Ajouter un morceau" }).click();
  await page.getByRole("link", { name: "Suggestions" }).click();
  await expect(page).toHaveURL(/mode=suggestions/);
  await page.getByRole("button", { name: /^Ajouter / }).first().click();
  await expect(page).toHaveURL(/\/repertoire\/[0-9a-f-]{36}(\?nouveau=1)?(#partition)?$/);
  await expect(page.getByRole("heading", { name: "Partition" })).toBeVisible();

  // Un fichier qui n'est pas un PDF est refusé.
  const input = page.getByLabel(/Importer une partition/);
  await input.setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("bonjour") });
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByText("Seuls les fichiers PDF sont acceptés.")).toBeVisible();

  await input.setInputFiles({ name: "ma-partition.pdf", mimeType: "application/pdf", buffer: PDF });
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByRole("link", { name: "Ouvrir la partition" })).toBeVisible();
  await expect(page.getByText(/ma-partition\.pdf/)).toBeVisible();

  // Lecture par URL signée pour le propriétaire…
  const href = await page.getByRole("link", { name: "Ouvrir la partition" }).getAttribute("href");
  const opened = await page.request.get(href!);
  expect(opened.status()).toBe(200);
  expect(opened.headers()["content-type"]).toContain("application/pdf");
  // …et aucun accès sans session.
  const anonymous = await browser.newContext();
  const refused = await anonymous.request.get(`http://localhost:3100${href}`, { maxRedirects: 0 });
  expect(refused.status()).toBe(307);
  expect(refused.headers()["location"]).toContain("/connexion");
  await anonymous.close();

  // La suppression est rangée à part et demande une confirmation.
  await expect(page.getByRole("button", { name: "Supprimer la partition" })).toBeHidden();
  await page.getByText("Remplacer ou supprimer la partition").click();
  await page.getByRole("button", { name: "Supprimer la partition" }).click();
  await expect(page.getByText("Coche la case pour confirmer la suppression de la partition.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Ouvrir la partition" })).toBeVisible();
  await page.getByLabel(/le fichier PDF sera supprimé/).check();
  await page.getByRole("button", { name: "Supprimer la partition" }).click();
  await expect(page.getByRole("link", { name: "Ouvrir la partition" })).toHaveCount(0);

  // La pièce en cours entre dans le programme à venir.
  await page.goto("/programme");
  await expect(page.getByText(/Pourquoi : pièce en cours/).first()).toBeVisible();
});

test("programme : une modification manuelle survit à la régénération, sauf confirmation", async ({ page }) => {
  await login(page);
  await page.goto("/programme");
  await page.getByText("Modifier").last().click();
  await page.getByRole("button", { name: "Supprimer du programme" }).last().click();
  await expect(page.getByText("modifié par toi").first()).toBeVisible();
  await expect(page.getByText(/Tu as modifié ce programme à la main/)).toBeVisible();

  await page.getByRole("button", { name: "Régénérer" }).click();
  await expect(page.getByText("tes modifications sont conservées")).toBeVisible();
  await expect(page.getByText("modifié par toi").first()).toBeVisible();

  await page.getByLabel("Remplacer aussi mes modifications").check();
  await page.getByRole("button", { name: "Régénérer" }).click();
  await expect(page.getByText("modifications manuelles remplacées")).toBeVisible();
  await expect(page.getByText("modifié par toi")).toHaveCount(0);
});

test("exercices : filtre et ajout au programme", async ({ page }) => {
  await login(page);
  await page.goto("/exercices?domaine=improvisation");
  await expect(page.getByRole("link", { name: "Ostinato do–sol" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Hanon nº 1" })).toHaveCount(0);
  await page.getByRole("link", { name: "Ostinato do–sol" }).click();
  await expect(page.getByText(/Tempo visé : 72 BPM/)).toBeVisible();
  await page.getByRole("button", { name: "Ajouter au programme" }).click();
  await expect(page.getByText("Ajouté au programme.")).toBeVisible();
  await page.goto("/aujourdhui");
  await expect(page.getByText("Pourquoi : ajouté par toi")).toBeVisible();
});

test("paramètres et export", async ({ page }) => {
  await login(page);
  await page.goto("/parametres");
  await page.getByLabel("Prénom").fill("Camille");
  await page.getByLabel("Minutes par jour, le week-end").fill("45");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText(/Réglages enregistrés/)).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Camille");

  const csv = await page.request.get("/export?format=csv");
  expect(csv.status()).toBe(200);
  expect(await csv.text()).toContain("date;domaine;intitule;minutes;bpm;resultat");
  const json = await page.request.get("/export?format=json");
  const body = (await json.json()) as { practice_logs: unknown[]; profile: { display_name: string } };
  expect(body.practice_logs.length).toBeGreaterThan(0);
  expect(body.profile.display_name).toBe("Camille");
});
