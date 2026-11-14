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
  await expect(page).toHaveURL(/\/repertoire\/[0-9a-f-]{36}(\?nouveau=1)?(#partition)?$/);
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

test("improvisation : tirage d'une tonalité et d'une progression", async ({ page }) => {
  await login(page);
  await page.goto("/exercices");
  await page.getByRole("link", { name: "Tirage d’improvisation" }).click();
  await expect(page).toHaveURL(/\/improvisation$/);

  // Par défaut, le tirage reste dans les tonalités maîtrisées (ou travaillées, ou do/la pour commencer).
  await expect(page.getByText(/^Tirage (parmi tes tonalités|parmi les tonalités que tu as déjà travaillées|en do majeur ou la mineur)/)).toBeVisible();
  const draw = page.getByRole("button", { name: /^(Tirer|Nouveau tirage)$/ });
  await expect(async () => {
    await draw.click();
    await expect(page.getByRole("listitem").filter({ hasText: "Progression" })).toBeVisible({ timeout: 500 });
  }).toPass();
  for (let i = 0; i < 5; i += 1) {
    const chords = await page.getByRole("listitem").filter({ hasText: "Progression" }).innerText();
    expect(chords.split("|").length).toBeGreaterThanOrEqual(3);
    await page.getByRole("button", { name: "Nouveau tirage" }).click();
  }

  // On peut ouvrir aux 24 tonalités et imposer le mode et le nombre d'accords.
  await page.getByLabel("Essayer aussi d’autres tonalités").check();
  await expect(page.getByText(/parmi les 24 tonalités/)).toBeVisible();
  await page.getByRole("button", { name: "Mineur" }).click();
  await page.getByRole("button", { name: "4", exact: true }).click();
  await page.getByRole("button", { name: "Nouveau tirage" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "Tonalité" })).toContainText(/mineur/);
  const four = await page.getByRole("listitem").filter({ hasText: "Progression" }).innerText();
  expect(four.split("|")).toHaveLength(4);
});

test("répertoire : ajout pré-rempli (recherche d'œuvre), partition IMSLP, filtre par courant", async ({ page }) => {
  await login(page);
  await page.goto("/repertoire/nouveau");
  await expect(page.getByLabel("Chercher une œuvre (compositeur ou titre)")).toBeVisible();
  await expect(page.getByText("Open Opus")).toBeVisible();
  // Champs retirés de la fiche.
  await expect(page.getByLabel(/Difficulté ressentie/)).toHaveCount(0);
  await expect(page.getByLabel(/Pour toi, c’est une pièce/)).toHaveCount(0);

  // Retour de « Choisir » (sans appel réseau) : la fiche est pré-remplie.
  const search = "https://imslp.org/wiki/Special:Search?search=Chopin%20Waltz%20in%20A%20minor%2C%20B.150";
  const prefill = new URLSearchParams({
    titre: "Valse en la mineur, B.150",
    compositeur: "Frédéric Chopin",
    courant: "romantic",
    partition: search,
  });
  await page.goto(`/repertoire/nouveau?${prefill.toString()}#formulaire`);
  await expect(page.getByRole("heading", { name: "Vérifie la fiche" })).toBeVisible();
  await expect(page.getByLabel("Titre", { exact: true })).toHaveValue("Valse en la mineur, B.150");
  await expect(page.getByLabel("Compositeur", { exact: true })).toHaveValue("Frédéric Chopin");
  await expect(page.getByLabel("Courant")).toHaveValue("romantic");
  await expect(page.getByLabel("Lien de référence")).toHaveValue(search);

  // Un lien de partition étranger à IMSLP n'est pas pré-rempli.
  await page.goto(`/repertoire/nouveau?titre=Test&partition=${encodeURIComponent("https://exemple.com/x.pdf")}`);
  await expect(page.getByLabel("Lien de référence")).toHaveValue("");

  // Ajout : la fiche s'ouvre sur la partition, avec la recherche IMSLP.
  await page.goto(`/repertoire/nouveau?${prefill.toString()}#formulaire`);
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(page).toHaveURL(/\/repertoire\/[0-9a-f-]{36}\?nouveau=1#partition$/);
  await expect(page.getByText("Morceau ajouté")).toBeVisible();
  await expect(page.getByRole("link", { name: "Trouver la partition sur IMSLP" })).toHaveAttribute("href", search);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Valse en la mineur, B.150");
  await expect(page.getByText(/Frédéric Chopin · Romantique · En cours/)).toBeVisible();

  // Filtre par courant dans le répertoire (dès que deux courants sont présents).
  await page.goto("/repertoire");
  const filters = page.getByRole("navigation", { name: "Filtrer par courant" });
  if (await filters.count()) {
    await filters.getByRole("link", { name: "Romantique" }).click();
    await expect(page).toHaveURL(/courant=romantic/);
    await expect(page.getByRole("link", { name: "Valse en la mineur, B.150" })).toBeVisible();
  }
});
