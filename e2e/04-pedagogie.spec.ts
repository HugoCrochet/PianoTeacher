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
  await page.goto("/repertoire/nouveau?mode=suggestions");
  await page.getByRole("button", { name: /^Ajouter / }).nth(1).click();
  await expect(page).toHaveURL(/\/repertoire\/[0-9a-f-]{36}(\?nouveau=1)?(#partition)?$/);
  await expect(page.getByRole("heading", { name: "Passages" })).toBeVisible();

  await page.getByLabel("Nombre de mesures du morceau").fill("20");
  await page.getByLabel("Mesures par passage").fill("8");
  await page.getByRole("button", { name: "Découper" }).click();
  for (const label of ["Mesures 1–8", "Mesures 9–16", "Mesures 17–20"]) {
    await expect(page.getByRole("listitem").filter({ hasText: label })).toContainText("Pas encore travaillé");
  }

  await page.getByText("Ajouter un passage à la main").click();
  await page.getByLabel("Nom du passage").fill("Coda");
  await page.getByLabel("Tempo visé (optionnel)").fill("60");
  await page.getByRole("button", { name: "Ajouter le passage" }).click();
  await expect(page.getByText("Passage ajouté.")).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "60 BPM visés" })).toContainText("Coda");

  await page.getByText("Supprimer un passage").click();
  await page.getByRole("button", { name: "Supprimer le passage Coda" }).click();
  await expect(page.getByText("60 BPM visés")).toHaveCount(0);
  await expect(page.getByRole("listitem").filter({ hasText: "Mesures 1–8" }).first()).toBeVisible();
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

test("répertoire : ajout pré-rempli, statut en un geste, liste filtrable", async ({ page }) => {
  await login(page);
  await page.goto("/repertoire/nouveau");
  await expect(page.getByLabel("Compositeur ou titre")).toBeVisible();
  await expect(page.getByText("Open Opus")).toBeVisible();
  // Saisie libre : la fiche est seule à l'écran, sans champs superflus.
  await page.getByRole("link", { name: "Saisie libre" }).click();
  await expect(page.getByLabel("Titre", { exact: true })).toBeVisible();
  await expect(page.getByLabel(/Difficulté ressentie/)).toHaveCount(0);
  await expect(page.getByLabel(/Pour toi, c’est une pièce/)).toHaveCount(0);
  await expect(page.getByLabel("Courant")).toHaveCount(0);

  // Retour de « Choisir » (sans appel réseau) : la fiche pré-remplie est en haut de page.
  const search = "https://imslp.org/wiki/Special:Search?search=Chopin%20Waltz%20in%20A%20minor%2C%20B.150";
  const prefill = new URLSearchParams({
    titre: "Valse en la mineur, B.150",
    compositeur: "Frédéric Chopin",
    genre: "romantic",
    partition: search,
    q: "chopin valse",
  });
  await page.goto(`/repertoire/nouveau?${prefill.toString()}`);
  await expect(page.getByRole("link", { name: "Choisir une autre œuvre" })).toHaveAttribute("href", /q=chopin/);
  await expect(page.getByLabel("Titre", { exact: true })).toHaveValue("Valse en la mineur, B.150");
  await expect(page.getByLabel("Titre", { exact: true })).toBeInViewport();
  await expect(page.getByLabel("Compositeur", { exact: true })).toHaveValue("Frédéric Chopin");
  await expect(page.getByLabel("Genre")).toHaveValue("romantic");
  await expect(page.getByLabel(/^Lien/)).toHaveValue(search);

  // Un lien de partition étranger à IMSLP n'est pas pré-rempli.
  await page.goto(`/repertoire/nouveau?titre=Test&partition=${encodeURIComponent("https://exemple.com/x.pdf")}`);
  await expect(page.getByLabel(/^Lien/)).toHaveValue("");

  // Ajout « pour plus tard » : la fiche s'ouvre sur la partition, avec la recherche IMSLP.
  await page.goto(`/repertoire/nouveau?${prefill.toString()}`);
  await page.getByRole("button", { name: "Ajouter le morceau" }).click();
  await expect(page).toHaveURL(/\/repertoire\/[0-9a-f-]{36}\?nouveau=1#partition$/);
  await expect(page.getByText("Morceau ajouté")).toBeVisible();
  await expect(page.getByRole("link", { name: "Trouver la partition sur IMSLP" })).toHaveAttribute("href", search);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Valse en la mineur, B.150");
  await expect(page.getByText("Frédéric Chopin · Romantique")).toBeVisible();
  await expect(page.getByRole("button", { name: /À découvrir/ })).toHaveAttribute("aria-pressed", "true");
  // Les actions rares sont repliées.
  await expect(page.getByRole("button", { name: "Supprimer définitivement" })).toBeHidden();

  // Liste : onglet « À découvrir », recherche sans accents, puis « Commencer » en un geste.
  await page.goto("/repertoire?onglet=a-decouvrir");
  const row = page.getByRole("listitem").filter({ hasText: "Valse en la mineur, B.150" });
  await expect(row).toContainText("Frédéric Chopin · Romantique");
  await page.goto("/repertoire?onglet=a-decouvrir&q=VALSE+chopin");
  await expect(row).toBeVisible();
  await page.goto("/repertoire?onglet=a-decouvrir&q=mozart");
  await expect(page.getByText("Aucun morceau ne correspond")).toBeVisible();
  await page.goto("/repertoire?onglet=a-decouvrir");
  await page.getByRole("button", { name: "Commencer Valse en la mineur, B.150" }).click();
  await expect(row).toHaveCount(0);
  await page.getByRole("link", { name: /^En cours/ }).click();
  await expect(row).toBeVisible();

  // Fiche : le statut se change d'un geste.
  await row.getByRole("link", { name: "Valse en la mineur, B.150" }).click();
  await expect(page.getByRole("button", { name: /En cours/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "En pause" }).click();
  await expect(page.getByRole("button", { name: /En pause/ })).toHaveAttribute("aria-pressed", "true");
  await page.goto("/repertoire?onglet=en-pause");
  await expect(row).toBeVisible();
});
