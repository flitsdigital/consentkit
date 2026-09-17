import { test, expect } from "@playwright/test";

test("URL invullen → preview toont accent, Copy to Webflow zet application/json op de clipboard", async ({ page }) => {
  await page.route("**/api/extract**", (route) =>
    route.fulfill({ json: { variables: [{ name: "--_colors---primary", value: "#0f4c81" }], colors: [{ value: "#0f4c81", count: 9 }], radii: [{ value: "16px", count: 3 }], fontSizes: { p: "17px" }, body: { color: "#222222", background: "#ffffff" } } }),
  );
  await page.goto("/");
  await page.getByPlaceholder("https://klant.webflow.io/").fill("https://veenstra-edelmetaal.webflow.io/");
  await page.getByRole("button", { name: "Stijl ophalen" }).click();

  await expect(page.getByText("#0f4c81").first()).toBeVisible();
  const frame = page.frameLocator('[data-testid="preview"]');
  await expect(frame.locator("[data-cb-action=accept]")).toHaveCSS("background-color", "rgb(15, 76, 129)");
  await expect(page).toHaveURL(/cb-color-accent=%230f4c81/);
  await expect(page).toHaveURL(/key=veenstra_consent/);

  // clipboardData.setData('application/json') onderscheppen (execCommand('copy') zet niets in de headless clipboard)
  await page.evaluate(() => {
    window.addEventListener("copy", (e) => ((window as unknown as { __wf: string }).__wf = e.clipboardData!.getData("application/json")));
  });
  await page.getByRole("button", { name: "Exporteren" }).first().click();
  await page.getByRole("button", { name: "Copy to Webflow" }).click();
  const json = await page.evaluate(() => (window as unknown as { __wf: string }).__wf);
  expect(JSON.parse(json).type).toBe("@webflow/XscpData");
});
