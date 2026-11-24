import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations, trackConsoleErrors } from "./support/a11y";
import { mockSignOut, signedInAs } from "./support/auth-api";
import {
  bigPdf, cvFixture, cvServer, docxFile, emptyFile, fakePdf, mockCv, pdfFile, textFile, type ApiCvFixture, type TestFile,
} from "./support/cv-api";
import { mockProfileCatalog, mockStudentProfile } from "./support/profiles-api";

/*
 * Feature 006-cv, US1 (upload and download): the CV block on My profile (ui-spec S1).
 * The API is mocked with page.route (support/cv-api.ts); contract: specs/006-cv/contracts/cv-api.md.
 * Replace (S1a) and remove (S1b) are tested with their own stories.
 */

const EMAIL = "maya@sdu.edu.kz";

const block = (page: Page) => page.getByTestId("cv-block");
const zoneInput = (page: Page) => page.getByTestId("cv-zone").locator("input[type=file]");
const upload = (page: Page) => page.getByRole("button", { name: "Upload CV", exact: true });
const toast = (page: Page) => page.getByTestId("toast");

/** Student with a profile; the CV server starts with `cv` (none by default). The CV mock goes last so it wins. */
async function open(page: Page, cv: ApiCvFixture | null = null, bytes?: Buffer) {
  await signedInAs(page, "student", EMAIL);
  await mockProfileCatalog.ok(page);
  await mockStudentProfile.ok(page);
  const server = await cvServer(page, cv, bytes);
  await page.goto("/app/profile");
  await expect(page.getByTestId("profile-identity")).toContainText("Maya Akhmetova");
  await expect(block(page)).not.toHaveAttribute("aria-busy", "true");
  return server;
}

const choose = (page: Page, file: TestFile) => zoneInput(page).setInputFiles(file);

async function expectNoHorizontalScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
}

test.describe("US1 upload", () => {
  test("no CV: the drop zone with the rules, nothing is sent", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const server = await open(page);
    await expect(block(page).getByRole("heading", { name: "CV" })).toBeVisible();
    await expect(page.getByTestId("cv-none")).toHaveText("No CV yet");
    await expect(page.getByTestId("cv-zone")).toContainText("Choose a file");
    await expect(page.getByTestId("cv-zone")).toContainText("PDF or DOCX, up to 5 MB.");
    await expect(page.getByRole("button", { name: "Download" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Replace" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(0);
    expect(server.posts).toHaveLength(0);
    await expectNoA11yViolations(page);
    expect(errors).toEqual([]);
  });

  test("choosing a file stores nothing; Upload CV stores it, announces it and moves focus to the stored CV", async ({ page }) => {
    const server = await open(page);
    await choose(page, pdfFile("Maya_Akhmetova_CV_2026.pdf", 530 * 1024));
    const chosen = page.getByTestId("cv-chosen");
    await expect(chosen).toContainText("Maya_Akhmetova_CV_2026.pdf");
    await expect(chosen).toContainText("PDF · 530 KB");
    await expect(upload(page)).toBeFocused(); // file chosen -> Upload CV
    expect(server.posts).toHaveLength(0);
    await expectNoA11yViolations(page);

    await upload(page).click();
    await expect(toast(page)).toContainText("CV uploaded");
    const stored = page.getByTestId("cv-stored");
    await expect(stored).toContainText("Maya_Akhmetova_CV_2026.pdf");
    await expect(page.getByTestId("cv-status")).toContainText("Uploaded 25 Nov 2026");
    await expect(stored).toBeFocused();
    await expect(stored).toHaveAccessibleName("Your CV: Maya_Akhmetova_CV_2026.pdf");
    await expect(page.getByTestId("cv-none")).toHaveCount(0);
    expect(server.posts).toEqual([{ name: "Maya_Akhmetova_CV_2026.pdf", size: 530 * 1024, contentType: "application/octet-stream" }]);
    await expectNoA11yViolations(page);

    await page.reload();
    await expect(page.getByTestId("cv-stored")).toContainText("Maya_Akhmetova_CV_2026.pdf"); // survives a reload
  });

  test("a DOCX with a Cyrillic name travels percent-encoded and comes back whole", async ({ page }) => {
    const server = await open(page);
    const name = "Резюме Майя Ахметова 2026.docx";
    await choose(page, docxFile(name, 4096));
    await expect(page.getByTestId("cv-chosen")).toContainText("DOCX · 4 KB");
    await upload(page).click();
    await expect(page.getByTestId("cv-stored")).toHaveAccessibleName(`Your CV: ${name}`);
    expect(server.posts[0].name).toBe(name);
  });

  test("Cancel drops the chosen file and returns focus to the zone", async ({ page }) => {
    const server = await open(page);
    await choose(page, pdfFile());
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByTestId("cv-zone")).toBeVisible();
    await expect(zoneInput(page)).toBeFocused();
    expect(server.posts).toHaveLength(0);
  });

  test("a double click sends one request", async ({ page }) => {
    const server = await open(page);
    await choose(page, pdfFile());
    await upload(page).dblclick();
    await expect(page.getByTestId("cv-stored")).toBeVisible();
    expect(server.posts).toHaveLength(1);
    await expect(toast(page)).toHaveCount(1);
  });

  test("a second choice replaces a first that is still being read", async ({ page }) => {
    await open(page);
    await zoneInput(page).setInputFiles(fakePdf("first.pdf"));
    await zoneInput(page).setInputFiles(pdfFile("second.pdf"));
    await expect(page.getByTestId("cv-chosen")).toContainText("second.pdf");
    await expect(page.getByTestId("cv-error")).toHaveCount(0);
    await expect(block(page)).not.toContainText("damaged");
  });

  test("an unreadable file is refused with the damaged-file wording and no unhandled error", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await open(page);
    // a File whose bytes cannot be read: slice().arrayBuffer() rejects
    await page.evaluate(() => {
      const bad = new File(["%PDF-1.4"], "locked.pdf", { type: "application/pdf" });
      bad.slice = () => ({ arrayBuffer: () => Promise.reject(new DOMException("not readable", "NotReadableError")) }) as unknown as Blob;
      const input = document.querySelector<HTMLInputElement>("[data-testid=cv-zone] input[type=file]")!;
      const dt = new DataTransfer();
      dt.items.add(bad);
      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await expect(block(page)).toContainText("This file is damaged or not a real PDF or DOCX.");
    await expect(page.getByTestId("cv-chosen")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});

test.describe("US1 refusals", () => {
  const CLIENT: [string, () => TestFile, string][] = [
    ["format", () => textFile("cv.txt"), "This isn't a PDF or DOCX file."],
    ["empty", () => emptyFile(), "This file is empty."],
    ["too large", () => bigPdf(), "This file is larger than 5 MB."],
    ["content", () => fakePdf(), "This file is damaged or not a real PDF or DOCX."],
  ];

  for (const [label, make, text] of CLIENT) {
    test(`client check, ${label}: refused beside the zone, rules stay visible, nothing is sent`, async ({ page }) => {
      const server = await open(page);
      await choose(page, make());
      await expect(page.getByTestId("cv-zone")).toContainText("PDF or DOCX, up to 5 MB.");
      await expect(block(page).getByRole("alert")).toContainText(text);
      await expect(page.getByTestId("cv-chosen")).toHaveCount(0);
      expect(server.posts).toHaveLength(0);
      if (label === "format") await expectNoA11yViolations(page);
    });
  }

  test("a refusal is replaced by the next good choice", async ({ page }) => {
    await open(page);
    await choose(page, textFile());
    await expect(block(page).getByRole("alert")).toBeVisible();
    await choose(page, pdfFile());
    await expect(page.getByTestId("cv-chosen")).toBeVisible();
    await expect(block(page).getByRole("alert")).toHaveCount(0);
  });

  const SERVER: [string, "empty" | "format" | "too-large" | "name", string][] = [
    ["cv_empty", "empty", "This file is empty."],
    ["cv_format_unsupported", "format", "This isn't a PDF or DOCX file."],
    ["cv_too_large", "too-large", "This file is larger than 5 MB."],
    ["cv_name_invalid", "name", "This isn't a PDF or DOCX file."],
  ];

  for (const [code, kind, text] of SERVER) {
    test(`server ${code}: the pending file is dropped and the refusal shows in the zone`, async ({ page }) => {
      const server = await open(page);
      server.failPost(kind);
      await choose(page, pdfFile());
      await upload(page).click();
      await expect(block(page).getByRole("alert")).toContainText(text);
      await expect(page.getByTestId("cv-zone")).toContainText("PDF or DOCX, up to 5 MB.");
      await expect(page.getByTestId("cv-chosen")).toHaveCount(0);
      await expect(zoneInput(page)).toBeFocused();
      expect(server.posts).toHaveLength(1);
      expect(server.current()).toBeNull(); // nothing stored
      await expect(toast(page)).toHaveCount(0);
    });
  }
});

test.describe("US1 failure and retry", () => {
  for (const kind of ["network", "server", "timeout"] as const) {
    test(`${kind}: the file stays selected and Upload CV tries again without choosing it again`, async ({ page }) => {
      const server = await open(page);
      server.failPost(kind);
      await choose(page, pdfFile("Maya_Akhmetova_CV.pdf"));
      await upload(page).click();
      const error = page.getByTestId("cv-error");
      await expect(error).toContainText("Couldn't upload your CV. Your file is still selected, so you can try again.");
      await expect(page.getByTestId("cv-chosen")).toContainText("Maya_Akhmetova_CV.pdf");
      await expect(upload(page)).toBeEnabled();
      if (kind === "network") await expectNoA11yViolations(page);

      await upload(page).click();
      await expect(page.getByTestId("cv-stored")).toContainText("Maya_Akhmetova_CV.pdf");
      await expect(toast(page)).toContainText("CV uploaded");
      expect(server.posts).toHaveLength(2);
      expect(server.posts[1]).toEqual(server.posts[0]);
    });
  }

  test("the answer is lost, the retry gets cv_exists for the same file: it counts as uploaded", async ({ page }) => {
    const server = await open(page);
    server.failPost("lose-answer");
    await choose(page, pdfFile("Maya_Akhmetova_CV.pdf", 3000));
    await upload(page).click();
    await expect(page.getByTestId("cv-error")).toBeVisible();
    await upload(page).click();
    await expect(page.getByTestId("cv-stored")).toContainText("Maya_Akhmetova_CV.pdf");
    await expect(toast(page)).toContainText("CV uploaded");
    await expect(page.getByTestId("cv-notice")).toHaveCount(0);
    await expect(page.getByTestId("cv-error")).toHaveCount(0);
  });

  test("another tab added a CV meanwhile: the current CV is shown with a notice, the draft is dropped", async ({ page }) => {
    const server = await open(page);
    await choose(page, pdfFile("Maya_Akhmetova_CV_2026.pdf"));
    server.elsewhere(cvFixture({ id: "cv-9", file_name: "Other_tab_CV.docx", format: "docx", size_bytes: 20_000 }));
    await upload(page).click();
    const notice = page.getByTestId("cv-notice");
    await expect(notice).toContainText("A CV was added in another tab");
    await expect(notice).toContainText("This is the current CV. Nothing was overwritten.");
    await expect(page.getByTestId("cv-stored")).toContainText("Other_tab_CV.docx");
    await expect(page.getByTestId("cv-chosen")).toHaveCount(0);
    expect(server.current()!.id).toBe("cv-9"); // not overwritten
    await expectNoA11yViolations(page);
    await notice.getByRole("button", { name: /dismiss|close/i }).click();
    await expect(notice).toHaveCount(0);
  });

  test("a 401 on upload goes to sign-in like the rest of the app", async ({ page }) => {
    const server = await open(page);
    await mockSignOut.ok(page);
    server.failPost("unauthorized");
    await choose(page, pdfFile());
    await upload(page).click();
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("a 403 student_profile_required goes to onboarding like a missing profile", async ({ page }) => {
    const server = await open(page);
    server.failPost("no-profile");
    await choose(page, pdfFile());
    await upload(page).click();
    await expect(page).toHaveURL(/\/onboarding/);
  });
});

test.describe("US1 load", () => {
  test("loading: the skeleton, busy block, the profile is already real", async ({ page }) => {
    await signedInAs(page, "student", EMAIL);
    await mockProfileCatalog.ok(page);
    await mockStudentProfile.ok(page);
    let release!: () => void;
    const held = new Promise<void>((r) => { release = r; });
    await page.route(/\/api\/student\/cv(\?.*)?$/, async (r) => {
      await held;
      await r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ cv: cvFixture(), limits: { formats: ["pdf", "docx"], max_bytes: 5242880 } }) });
    });
    await page.goto("/app/profile");
    await expect(block(page)).toHaveAttribute("aria-busy", "true");
    await expect(page.getByTestId("profile-identity")).toContainText("Maya Akhmetova");
    await expect(page.getByTestId("cv-none")).toHaveCount(0); // loading never says "no CV"
    await expectNoA11yViolations(page);
    release();
    await expect(page.getByTestId("cv-stored")).toBeVisible();
  });

  test("the CV request failing: an error with Try again, never 'No CV yet'; the profile is intact", async ({ page }) => {
    await signedInAs(page, "student", EMAIL);
    await mockProfileCatalog.ok(page);
    await mockStudentProfile.ok(page);
    const server = await cvServer(page, cvFixture());
    server.failGet("server", "server"); // the query retries once by itself
    await page.goto("/app/profile");
    const failed = page.getByTestId("cv-load-error");
    await expect(failed).toContainText("Couldn't load your CV");
    await expect(failed).toContainText("Check your connection and try again.");
    await expect(page.getByTestId("cv-none")).toHaveCount(0);
    await expect(page.getByTestId("profile-identity")).toContainText("Maya Akhmetova");
    await expect(page.getByRole("button", { name: "Edit profile" })).toBeEnabled();
    await expectNoA11yViolations(page);
    await failed.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByTestId("cv-stored")).toContainText("Maya_Akhmetova_CV.pdf");
    await expect(failed).toHaveCount(0);
  });

  test("a network failure of the CV request is the same error state", async ({ page }) => {
    await signedInAs(page, "student", EMAIL);
    await mockProfileCatalog.ok(page);
    await mockStudentProfile.ok(page);
    const server = await cvServer(page, null);
    server.failGet("network", "network");
    await page.goto("/app/profile");
    await expect(page.getByTestId("cv-load-error")).toBeVisible();
    await expect(page.getByTestId("profile-identity")).toContainText("Maya Akhmetova");
  });

  test("a profile that fails to load leaves the CV block working", async ({ page }) => {
    await signedInAs(page, "student", EMAIL);
    await mockProfileCatalog.ok(page);
    await mockCv.stored(page);
    await mockStudentProfile.serverError(page);
    await page.goto("/app/profile");
    await expect(page.getByText("Couldn't load your profile")).toBeVisible();
  });
});

test.describe("US1 download", () => {
  test("Download saves the file under the stored name with the stored bytes", async ({ page }) => {
    const bytes = pdfFile("x.pdf", 777).buffer;
    const server = await open(page, cvFixture({ id: "cv-1", file_name: "Maya_Akhmetova_CV.pdf", size_bytes: 777 }), bytes);
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download" }).click()]);
    expect(download.suggestedFilename()).toBe("Maya_Akhmetova_CV.pdf");
    const { readFile } = await import("node:fs/promises");
    expect(Buffer.compare(await readFile((await download.path())!), bytes)).toBe(0);
    expect(server.downloads).toEqual(["cv-1"]);
    await expect(page.getByTestId("cv-error")).toHaveCount(0);
  });

  test("the file name from the metadata is used, Cyrillic included", async ({ page }) => {
    const name = "Резюме_Майя_Ахметова.pdf";
    await open(page, cvFixture({ file_name: name }));
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download" }).click()]);
    expect(download.suggestedFilename()).toBe(name);
  });

  test("a failed download shows an inline error, the CV stays, and it can be dismissed", async ({ page }) => {
    const server = await open(page, cvFixture());
    server.failFile("server");
    await page.getByRole("button", { name: "Download" }).click();
    const error = page.getByTestId("cv-error");
    await expect(error).toContainText("Couldn't download your CV. Try again.");
    await expect(page.getByTestId("cv-stored")).toContainText("Maya_Akhmetova_CV.pdf");
    await expectNoA11yViolations(page);
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download" }).click()]);
    expect(download.suggestedFilename()).toBe("Maya_Akhmetova_CV.pdf");
    await expect(error).toHaveCount(0);
  });

  test("the network fails during download: same inline error", async ({ page }) => {
    const server = await open(page, cvFixture());
    server.failFile("network");
    await page.getByRole("button", { name: "Download" }).click();
    await expect(page.getByTestId("cv-error")).toContainText("Couldn't download your CV.");
  });

  test("cv_changed (replaced in another tab): the current CV and a notice", async ({ page }) => {
    const server = await open(page, cvFixture());
    server.elsewhere(cvFixture({ id: "cv-7", file_name: "Newer_CV.docx", format: "docx" }));
    await page.getByRole("button", { name: "Download" }).click();
    await expect(page.getByTestId("cv-notice")).toContainText("Your CV was replaced in another tab");
    await expect(page.getByTestId("cv-stored")).toContainText("Newer_CV.docx");
    await expectNoA11yViolations(page);
  });

  test("cv_changed (removed in another tab): the drop zone and a notice", async ({ page }) => {
    const server = await open(page, cvFixture());
    server.elsewhere(null);
    await page.getByRole("button", { name: "Download" }).click();
    const notice = page.getByTestId("cv-notice");
    await expect(notice).toContainText("Your CV was removed in another tab");
    await expect(notice).toContainText("There is no CV now. You can upload a new one.");
    await expect(page.getByTestId("cv-zone")).toBeVisible();
    await expect(page.getByTestId("cv-stored")).toHaveCount(0);
    await expect(zoneInput(page)).toBeFocused();
  });
});

test.describe("US1 layout", () => {
  test("a 100-character Cyrillic name does not scroll the page sideways", async ({ page }) => {
    const name = `${"Резюме_Майя_Ахметова_".repeat(5).slice(0, 95)}.docx`;
    await open(page, cvFixture({ file_name: name, format: "docx" }));
    await expect(page.getByTestId("cv-stored")).toHaveAccessibleName(`Your CV: ${name}`);
    await expectNoHorizontalScroll(page);
    await expectNoA11yViolations(page);
  });

  test("below 1024 the identity link jumps to the CV block and focuses it", async ({ page }) => {
    test.skip(!page.viewportSize() || page.viewportSize()!.width >= 1024, "mobile only");
    await open(page);
    const jump = page.getByTestId("cv-jump");
    await expect(jump).toHaveText("Add CV");
    await jump.click();
    await expect(block(page)).toBeFocused();
    await expectNoHorizontalScroll(page);
  });

  test("from 1024 the identity link is hidden", async ({ page }) => {
    test.skip(!page.viewportSize() || page.viewportSize()!.width < 1024, "desktop only");
    await open(page, cvFixture());
    await expect(page.getByTestId("cv-jump")).toBeHidden();
  });

  test("the identity link says CV uploaded when one is stored", async ({ page }) => {
    test.skip(!page.viewportSize() || page.viewportSize()!.width >= 1024, "mobile only");
    await open(page, cvFixture());
    await expect(page.getByTestId("cv-jump")).toHaveText("CV uploaded");
  });
});
