import { useState, type ReactNode } from "react";
import { draftToSalary, formatSalary, salaryMessage, type SalaryDraft } from "@/lib/money";
import { Icon, industryIcon } from "@/components/icons";
import {
  Avatar, Button, Card, ChangeSummary, Checkbox, ChoiceCard, Combobox, type ComboboxOption, ChoiceCardGroup, Chip, ChoiceGroup, Container, Count, DecisionInbox, EmptyState,
  FilterMenu, Modal, NotificationStack, NumberTicker, OtpInput, PageHeader, PasswordField, ProfileMenu,
  ProgressTracker, Radio, SalaryField, SectionLabel, SectionTitle, SegmentedControl, SelectField, ShimmerText, Skeleton,
  SmartRecommendation, Switch, Tag, TextareaField, TextField, TextLink, ThinkingLoader, TipsPanel, Tray, toast,
} from "@/components/ui";
import { Stack } from "@/components/layout";
import styles from "./styleguide-page.module.css";

/*
 * Living reference of the Novio design system. Agents compare new UI against this page.
 * Every new component or pattern gets a section here.
 */

const COLORS = [
  "page", "tray", "surface", "fill", "row-hover", "ink", "text", "muted", "muted-strong", "faint",
  "line", "line-subtle", "line-strong", "accent", "accent-tint", "success", "success-tint", "danger",
  "destructive", "destructive-tint", "warning", "warning-tint", "rose", "rose-tint", "violet", "violet-tint",
];

const TYPE = [
  ["display", "Find work that fits your skills"],
  ["h1", "Internships for you"],
  ["h2", "Recommended this week"],
  ["h3", "Backend Intern (Python)"],
  ["title", "Smart recommendation"],
  ["body", "Kaspi.kz is looking for a backend intern who knows Python and SQL."],
  ["sm", "Secondary UI text, buttons sm, hints and footers"],
  ["caption", "Skill chips and small meta"],
  ["xs", "Counts and timestamps"],
  ["tag", "Tag label"],
] as const;

const SECTIONS = [
  ["foundations", "Foundations"],
  ["buttons", "Buttons"],
  ["forms", "Forms"],
  ["choice-cards", "Choice cards"],
  ["display", "Display"],
  ["surfaces", "Surfaces"],
  ["feedback", "Feedback"],
  ["affect", "affect-ui components"],
  ["examples", "Novio examples"],
] as const;

const YEARS = ["1st", "2nd", "3rd", "4th", "5th", "6th"].map((y, i) => ({ value: String(i + 1), label: `${y} year` }));
const SIZES = [
  ["1_10", "1–10"], ["11_50", "11–50"], ["51_200", "51–200"], ["201_1000", "201–1000"], ["1000_plus", "1000+"],
].map(([value, label]) => ({ value, label: `${label} employees` }));
const UNIVERSITIES = [
  { value: "sdu", label: "Suleyman Demirel University", description: "Almaty" },
  { value: "kbtu", label: "Kazakh-British Technical University", description: "Almaty" },
  { value: "nu", label: "Nazarbayev University", description: "Astana" },
  { value: "aitu", label: "Astana IT University", description: "Astana" },
];
const INDUSTRIES = [
  ["it", "IT & software"], ["finance", "Finance & banking"], ["education", "Education"], ["healthcare", "Healthcare"],
  ["retail", "Retail & e-commerce"], ["manufacturing", "Manufacturing"], ["media", "Media & marketing"],
  ["government", "Government & public sector"], ["consulting", "Consulting"], ["other", "Other"],
].map(([value, label]) => ({ value, label, icon: industryIcon(value) }));
const FORMATS = [
  { value: "onsite", label: "On-site", description: "At the office every day" },
  { value: "hybrid", label: "Hybrid", description: "Some days at home" },
  { value: "remote", label: "Remote", description: "From anywhere in Kazakhstan" },
];

const CURRENCIES = [
  { value: "KZT", label: "Tenge", symbol: "₸" }, { value: "USD", label: "US dollar", symbol: "$" },
  { value: "EUR", label: "Euro", symbol: "€" }, { value: "RUB", label: "Russian ruble", symbol: "₽" },
];

function SalaryFieldDemo() {
  const [value, setValue] = useState<SalaryDraft>({ min: "1000000", max: "", currency: "KZT" });
  const [bad, setBad] = useState<SalaryDraft>({ min: "500000", max: "300000", currency: "USD" });
  const shown = formatSalary(draftToSalary(value), CURRENCIES);
  return (
    <div className={styles.grid}>
      <Demo label="Type, delete in the middle, paste “1,000,000 ₸”">
        <Tray padding="lg" footer={<span data-testid="salary-shown">{shown ?? "No salary"}</span>}>
          <SalaryField label="Salary" optional hint="Per month. Fill one or both amounts" value={value} onChange={setValue} currencies={CURRENCIES} data-testid="sg-salary" />
        </Tray>
      </Demo>
      <Demo label="Error · from is greater than to">
        <Tray padding="lg">
          <SalaryField label="Salary" optional error={salaryMessage(bad)} value={bad} onChange={setBad} currencies={CURRENCIES} />
        </Tray>
      </Demo>
    </div>
  );
}

function ChoiceCardsDemo() {
  const [year, setYear] = useState("3");
  const [industry, setIndustry] = useState("it");
  const [uni, setUni] = useState("");
  const [otherOn, setOtherOn] = useState(false);
  const [formats, setFormats] = useState<string[]>(["hybrid"]);
  const [tried, setTried] = useState(false);
  const [errYear, setErrYear] = useState("");

  return (
    <>
      <div className={styles.grid}>
        <Demo label="sm · compact answers, columns={3}">
          <Tray padding="lg">
            <ChoiceCardGroup legend="Year of study" name="sg-year" size="sm" columns={3} options={YEARS} value={year} onChange={setYear} data-testid="cc-year" />
          </Tray>
        </Demo>
        <Demo label="sm · longer labels, min={140}">
          <Tray padding="lg">
            <ChoiceCardGroup legend="Company size" name="sg-size" size="sm" min={140} columns={3} options={SIZES} defaultValue="11_50" />
          </Tray>
        </Demo>
        <Demo label="md · description, + typed Other (children)">
          <Tray padding="lg">
            <Stack gap={16}>
              <ChoiceCardGroup
                legend="University"
                hint="Pick yours or type it in."
                name="sg-uni"
                options={UNIVERSITIES}
                value={otherOn ? "" : uni}
                onChange={(v) => { setOtherOn(false); setUni(v); }}
                data-testid="cc-university"
              >
                <ChoiceCard value="other" label="Other" description="Not in the list" checked={otherOn} onChange={() => setOtherOn(true)} />
              </ChoiceCardGroup>
              {otherOn && <TextField label="Your university" placeholder="e.g. Narxoz University" />}
            </Stack>
          </Tray>
        </Demo>
        <Demo label="Checkbox type · several answers">
          <Tray padding="lg">
            <ChoiceCardGroup type="checkbox" legend="Work format" name="sg-format" options={FORMATS} value={formats} onChange={setFormats} data-testid="cc-format" />
          </Tray>
        </Demo>
        <Demo label="Error · aria-invalid + message">
          <Tray padding="lg" footer={<Button size="sm" onClick={() => setTried(true)}>Continue</Button>}>
            <ChoiceCardGroup
              legend="Year of study"
              name="sg-year-error"
              size="sm"
              columns={3}
              options={YEARS}
              value={errYear}
              onChange={(v) => { setErrYear(v); setTried(false); }}
              error={tried && !errYear ? "Choose your year of study" : undefined}
              data-testid="cc-error"
            />
          </Tray>
        </Demo>
        <Demo label="Disabled · one option, and the whole group">
          <Tray padding="lg">
            <Stack gap={20}>
              <ChoiceCardGroup legend="Looking for" name="sg-look" size="sm" columns={2} defaultValue="internship" options={[{ value: "internship", label: "Internship" }, { value: "job", label: "Full-time job", disabled: true }]} />
              <ChoiceCardGroup legend="Industry" name="sg-ind-off" disabled defaultValue="finance" options={INDUSTRIES.slice(1, 3)} data-testid="cc-disabled" />
            </Stack>
          </Tray>
        </Demo>
      </div>
      <Demo label="md · icon tile — a wizard step at form width (560): 2 columns, 1 below 520" wide>
        <div className={styles.formWidth}>
          <Tray padding="lg" footer={<span>You can change this later in your company profile.</span>}>
            <ChoiceCardGroup legend="Industry" name="sg-industry" options={INDUSTRIES} value={industry} onChange={setIndustry} data-testid="cc-industry" />
          </Tray>
        </div>
      </Demo>
    </>
  );
}

function Section({ id, title, note, children }: { id: string; title: string; note?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className={styles.section} data-testid={`styleguide-${id}`}>
      <div className={styles.sectionHead}>
        <SectionTitle>{title}</SectionTitle>
        {note && <p className={styles.sectionNote}>{note}</p>}
      </div>
      {children}
    </section>
  );
}

/* Combobox demo data (styleguide-local; features keep their own lists) */
const SG_UNIVERSITIES: ComboboxOption[] = [
  ["Al-Farabi Kazakh National University", "Almaty", ["KazNU", "Al-Farabi"]],
  ["Astana IT University", "Astana", ["AITU"]],
  ["International Information Technology University", "Almaty", ["IITU"]],
  ["Kazakh-British Technical University", "Almaty", ["KBTU"]],
  ["KIMEP University", "Almaty", []],
  ["L.N. Gumilyov Eurasian National University", "Astana", ["ENU", "Gumilyov"]],
  ["Nazarbayev University", "Astana", ["NU"]],
  ["Satbayev University", "Almaty", ["KazNTU"]],
  ["Suleyman Demirel University", "Kaskelen", ["SDU"]],
].map(([label, city, keywords]) => ({ value: label as string, label: label as string, description: city as string, keywords: keywords as string[] }));

const SG_CITIES: ComboboxOption[] = [
  "Aksu", "Aktau", "Aktobe", "Almaty", "Aral", "Arkalyk", "Arys", "Astana", "Atbasar", "Atyrau", "Ayagoz", "Baikonur",
  "Balkhash", "Ekibastuz", "Esik", "Kandyagash", "Karaganda", "Karatau", "Kaskelen", "Kentau", "Khromtau", "Kokshetau",
  "Konaev", "Kostanay", "Kulsary", "Kyzylorda", "Lisakovsk", "Oral", "Oskemen", "Pavlodar", "Petropavl", "Ridder",
  "Rudny", "Saran", "Sarkand", "Satbayev", "Semey", "Shakhtinsk", "Shchuchinsk", "Shu", "Shymkent", "Stepnogorsk",
  "Talgar", "Taldykorgan", "Taraz", "Temirtau", "Turkistan", "Ushtobe", "Zaisan", "Zhanaozen", "Zharkent", "Zhezkazgan",
  "Zhitikara", "Zyryanovsk",
].map((c) => ({
  value: c,
  label: c,
  keywords: ({ Astana: ["Nur-Sultan", "Akmola"], Almaty: ["Alma-Ata"], Oral: ["Uralsk"], Oskemen: ["Ust-Kamenogorsk"],
    Petropavl: ["Petropavlovsk"], Semey: ["Semipalatinsk"], Konaev: ["Kapchagay"] } as Record<string, string[]>)[c],
}));

function ComboboxDemo() {
  const [university, setUniversity] = useState("Kazakh-British Technical University");
  const [city, setCity] = useState("");
  const [continued, setContinued] = useState("");
  return (
    <div className={styles.stack}>
      <Combobox
        label="University"
        value={university}
        onChange={setUniversity}
        options={SG_UNIVERSITIES}
        allowCreate
        createLabel={(t) => <>Use <strong>“{t}”</strong></>}
        clearable
        inFlow
        placeholder="Search, e.g. KBTU"
        hint="Objects with a city line and aliases · createLabel “Use” · clearable · inFlow: the list pushes Continue down"
        data-testid="sg-combobox-university"
      />
      <div className={styles.row}>
        <Button size="sm" onClick={() => setContinued(university)} data-testid="sg-combobox-continue">Continue</Button>
        <span role="status">{continued && `Continued with ${continued}`}</span>
      </div>
      <Combobox
        label="City"
        value={city}
        onChange={setCity}
        options={SG_CITIES}
        placeholder="Choose a city"
        hint={`${SG_CITIES.length} options, all reachable by scrolling and keys · former names find the city`}
        data-testid="sg-combobox-city"
      />
    </div>
  );
}

function Demo({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={wide ? styles.wide : undefined}>
      <SectionLabel>{label}</SectionLabel>
      {children}
    </div>
  );
}

export function StyleguidePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [chips, setChips] = useState(["Internship", "Almaty", "Python"]);

  return (
    <Container className={styles.page}>
      <PageHeader
        eyebrow="Novio design system"
        title="Styleguide"
        description="affect-ui (Light + Classic) tokens, ported components and Novio primitives. Build new UI from these pieces."
        actions={<><TextLink to="/styleguide/templates">Page templates →</TextLink><TextLink to="/prototypes" tone="muted">Prototypes</TextLink></>}
      />
      <nav className={styles.nav} aria-label="Sections">
        {SECTIONS.map(([id, label]) => (
          <a key={id} href={`#${id}`}>{label}</a>
        ))}
      </nav>

      <Section id="foundations" title="Foundations" note="Values live in src/styles/tokens.css. Use var(--token), never raw values.">
        <Demo label="Colour tokens (--color-*)">
          <div className={styles.swatches}>
            {COLORS.map((name) => (
              <div key={name} className={styles.swatch}>
                <div className={styles.swatchChip} style={{ background: `var(--color-${name})` }} />
                <code>{name}</code>
              </div>
            ))}
          </div>
        </Demo>
        <Demo label="Type scale (--text-* / --leading-*)">
          <div>
            {TYPE.map(([name, sample]) => (
              <div key={name} className={styles.typeRow}>
                <code>{name}</code>
                <span
                  style={{
                    fontSize: `var(--text-${name})`,
                    lineHeight: `var(--leading-${name})`,
                    letterSpacing: ["display", "h1", "h2", "h3", "title"].includes(name) ? `var(--tracking-${name})` : undefined,
                    fontWeight: ["display", "h1", "h2", "h3"].includes(name) ? 600 : name === "title" || name === "tag" ? 500 : 400,
                  }}
                >
                  {sample}
                </span>
              </div>
            ))}
          </div>
        </Demo>
        <div className={styles.grid}>
          <Demo label="Radius (nested: tray › card › control › chip)">
            <div className={styles.boxes}>
              {["tiny", "chip", "control", "card", "card-lg", "tray-lg"].map((r) => (
                <div key={r} className={styles.box} style={{ borderRadius: `var(--radius-${r})`, boxShadow: "var(--shadow-hairline)" }}>{r}</div>
              ))}
            </div>
          </Demo>
          <Demo label="Elevation (--shadow-*)">
            <div className={styles.boxes}>
              {["hairline", "raised", "control", "panel", "popover", "floating"].map((s) => (
                <div key={s} className={styles.box} style={{ borderRadius: "var(--radius-control)", boxShadow: `var(--shadow-${s})` }}>{s}</div>
              ))}
            </div>
          </Demo>
        </div>
      </Section>

      <Section id="buttons" title="Buttons" note="affect-ui button. One primary per card or view; primary is the rightmost in a footer.">
        <div className={styles.grid}>
          <Demo label="Variants">
            <div className={styles.row}>
              <Button>Save changes</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Delete</Button>
            </div>
          </Demo>
          <Demo label="Sizes, icons, states">
            <div className={styles.row}>
              <Button variant="secondary" size="sm" icon={<Icon name="add" />}>Add skill</Button>
              <Button iconRight={<Icon name="arrowRight" />}>Continue</Button>
              <Button variant="secondary" size="lg">Large</Button>
              <Button variant="secondary" icon={<Icon name="saved" />} aria-label="Save vacancy" />
              <Button variant="secondary" loading>Uploading CV</Button>
              <Button variant="secondary" disabled>Disabled</Button>
            </div>
          </Demo>
        </div>
      </Section>

      <Section id="forms" title="Forms" note="Label above, error replaces the hint: red edge + red icon, calm text.">
        <div className={styles.grid}>
          <Demo label="Text fields">
            <div className={styles.stack}>
              <TextField label="Email" type="email" placeholder="you@university.edu" autoComplete="email" />
              <TextField label="University" defaultValue="Suleyman Demirel University" hint="As written in your diploma" />
              <PasswordField label="Password" defaultValue="wrong-password" error="That password didn't work. 2 tries left." />
            </div>
          </Demo>
          <Demo label="Select, textarea">
            <div className={styles.stack}>
              <SelectField label="Year of study" placeholder="Choose a year" options={[{ value: "1", label: "1st year" }, { value: "2", label: "2nd year" }, { value: "3", label: "3rd year" }, { value: "4", label: "4th year" }, { value: "grad", label: "Graduate", description: "Finished in the last 2 years" }]} />
              <TextareaField label="About you" optional placeholder="A few sentences recruiters will read first" />
              <TextField label="Student ID" defaultValue="STU-004217" readOnly hint="Read-only" />
            </div>
          </Demo>
          <Demo label="Checkbox, radio, switch">
            <div className={styles.stack}>
              <ChoiceGroup legend="Work format">
                <Checkbox label="On-site" defaultChecked />
                <Checkbox label="Hybrid" defaultChecked />
                <Checkbox label="Remote" description="Only companies that hire remotely in Kazakhstan" />
              </ChoiceGroup>
              <ChoiceGroup legend="Looking for">
                <Radio name="looking" label="Internship" defaultChecked />
                <Radio name="looking" label="Full-time job" />
              </ChoiceGroup>
              <Switch label="Email me new matches" defaultChecked />
            </div>
          </Demo>
          <Demo label="Combobox — single, searchable">
            <ComboboxDemo />
          </Demo>
          <Demo label="OTP (affect-ui) — email verification">
            <Tray>
              <OtpInput label="Verification code" length={6} separator={3} onResend={() => toast("Code sent")} resendIn={30} />
            </Tray>
          </Demo>
        </div>
      </Section>

      <Section
        id="choice-cards"
        title="Choice cards"
        note="Ready-made answers in a wizard step: a radio or checkbox drawn as a tile. Arrow keys move inside a radio group; Space toggles a checkbox. See patterns.md §16 for cards vs radio vs select vs SegmentedControl."
      >
        <ChoiceCardsDemo />
      </Section>

      <Section
        id="salary-field"
        title="Salary field"
        note="Monthly salary as From and To amounts plus a currency: one row when wide, stacked when narrow, with From and To kept visible inside the fields. Digits group as you type (the caret stays after the same digit), numeric keyboard on mobile, no spinners, no native select. The same formatSalary() text is used on every card and page."
      >
        <SalaryFieldDemo />
      </Section>

      <Section id="display" title="Display">
        <div className={styles.grid}>
          <Demo label="Tags">
            <div className={styles.row}>
              <Tag>Remote</Tag>
              <Tag tone="accent">Internship</Tag>
              <Tag tone="success">Applied</Tag>
              <Tag tone="warning">Closes soon</Tag>
              <Tag tone="danger">Rejected</Tag>
              <Tag tone="rose">New</Tag>
              <Tag tone="violet">Beta</Tag>
            </div>
          </Demo>
          <Demo label="Chips, counts">
            <div className={styles.row}>
              {chips.map((c) => (
                <Chip key={c} onRemove={() => setChips((all) => all.filter((x) => x !== c))}>{c}</Chip>
              ))}
              <Chip>Static chip</Chip>
              <Count>12</Count>
            </div>
          </Demo>
          <Demo label="Avatars">
            <div className={styles.row}>
              <Avatar name="Maya Akhmetova" size="sm" />
              <Avatar name="Maya Akhmetova" />
              <Avatar name="Maya Akhmetova" size="lg" />
              <Avatar name="Kaspi" shape="square" />
              <Avatar name="Epam Systems" shape="square" tone="neutral" />
            </div>
          </Demo>
          <Demo label="Links">
            <div className={styles.row}>
              <TextLink to="/styleguide">Default link</TextLink>
              <TextLink to="/styleguide" tone="muted">Muted link</TextLink>
            </div>
          </Demo>
        </div>
      </Section>

      <Section id="surfaces" title="Surfaces" note="Tray + card is the signature container. Header and footer sit on the tray.">
        <div className={styles.grid}>
          <Demo label="Tray with footer">
            <Tray footer={<><span>Updated 2 min ago</span><div className={styles.row}><Button variant="secondary" size="sm">Cancel</Button><Button size="sm">Save</Button></div></>}>
              <p>The white card holds the content; secondary info and actions live on the gray tray below.</p>
            </Tray>
          </Demo>
          <Demo label="Tray with header (lg)">
            <Tray size="lg" header={<span style={{ color: "var(--color-warning)" }}>2 need your reply</span>}>
              <p>Use the header for one status line about the content below.</p>
            </Tray>
          </Demo>
          <Demo label="Standalone card">
            <Card>
              <p>For page sections and grids. Inside a tray use Tray.</p>
            </Card>
          </Demo>
          <Demo label="Modal">
            <Button variant="secondary" onClick={() => setModalOpen(true)}>Open modal</Button>
            <Modal
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              title="Withdraw application?"
              description="Kaspi.kz will no longer see your application for Backend Intern. You can apply again later."
              footer={<><Button variant="secondary" size="sm" onClick={() => setModalOpen(false)}>Keep it</Button><Button variant="destructive" size="sm" onClick={() => { setModalOpen(false); toast("Application withdrawn"); }}>Withdraw</Button></>}
            />
          </Demo>
        </div>
      </Section>

      <Section id="feedback" title="Feedback" note="Every data view handles loading, empty, error and success.">
        <div className={styles.grid}>
          <Demo label="Loading — skeleton (affect shimmer-loader)">
            <Tray>
              <div className={styles.vacancyHead}>
                <Skeleton width={40} height={40} radius={12} />
                <div className={styles.vacancyMain} style={{ display: "grid", gap: 8 }}>
                  <Skeleton width="70%" height={14} />
                  <Skeleton width="45%" height={12} />
                </div>
              </div>
            </Tray>
          </Demo>
          <Demo label="Loading — AI / matching (thinking-loader)">
            <div className={styles.stack}>
              <ThinkingLoader phases={["Reading your profile", "Comparing skills", "Ranking vacancies"]} />
              <ShimmerText>Finding matches…</ShimmerText>
            </div>
          </Demo>
          <Demo label="Empty">
            <Tray>
              <EmptyState
                icon={<Icon name="vacancy" size={20} />}
                title="No applications yet"
                description="Apply to an internship and track its status here."
                actions={<Button size="sm" icon={<Icon name="search" />}>Browse internships</Button>}
              />
            </Tray>
          </Demo>
          <Demo label="Error">
            <Tray>
              <EmptyState tone="error" title="Couldn't load vacancies" description="Check your connection and try again." actions={<Button variant="secondary" size="sm">Try again</Button>} />
            </Tray>
          </Demo>
          <Demo label="Toasts">
            <div className={styles.row}>
              <Button variant="secondary" size="sm" onClick={() => toast("Saved to bookmarks")}>Neutral</Button>
              <Button variant="secondary" size="sm" onClick={() => toast.success("Application sent", { description: "Kaspi.kz usually replies within 5 days." })}>Success</Button>
              <Button variant="secondary" size="sm" onClick={() => toast.error("Couldn't upload CV", { description: "The file is larger than 5 MB." })}>Error</Button>
            </div>
          </Demo>
        </div>
      </Section>

      <Section id="affect" title="affect-ui components" note="Ported 1:1. Use them as they are; see each file's header for its source.">
        <div className={styles.grid}>
          <Demo label="Segmented control">
            <div className={styles.stack}>
              <SegmentedControl
                aria-label="Opportunity type"
                defaultValue="internships"
                options={[
                  { value: "all", label: "All" },
                  { value: "internships", label: "Internships", count: 24 },
                  { value: "jobs", label: "Jobs", count: 8 },
                ]}
              />
              <SegmentedControl
                aria-label="Billing"
                variant="underline"
                defaultValue="matches"
                options={[
                  { value: "matches", label: "Best matches" },
                  { value: "newest", label: "Newest", badge: <Tag tone="accent">12 new</Tag> },
                ]}
              />
            </div>
          </Demo>
          <Demo label="Filter menu">
            <FilterMenu
              defaultOpen={["type"]}
              groups={[
                { id: "type", label: "Type", options: [{ id: "intern", label: "Internship" }, { id: "full", label: "Full-time" }, { id: "part", label: "Part-time" }] },
                { id: "city", label: "City", options: [{ id: "ala", label: "Almaty" }, { id: "ast", label: "Astana" }, { id: "rem", label: "Remote" }] },
                { id: "field", label: "Field", options: [{ id: "be", label: "Backend" }, { id: "fe", label: "Frontend" }, { id: "data", label: "Data" }] },
              ]}
              defaultValue={{ type: ["intern"], city: ["ala"] }}
            />
          </Demo>
          <Demo label="Profile menu">
            <ProfileMenu
              name="Maya Akhmetova"
              email="maya@sdu.edu.kz"
              items={[
                { id: "profile", label: "Profile", icon: <Icon name="profile" size={18} /> },
                { id: "settings", label: "Settings", icon: <Icon name="settings" size={18} /> },
                { id: "saved", label: "Saved", icon: <Icon name="saved" size={18} />, badge: "New" },
                { id: "logout", label: "Log out", icon: <Icon name="logout" size={18} /> },
              ]}
              setup={{ done: 3, total: 5, next: "Add your skills" }}
            />
          </Demo>
          <Demo label="Progress tracker">
            <ProgressTracker
              title="Get ready to apply"
              steps={[
                { id: "1", label: "Verify your email", done: true },
                { id: "2", label: "Add your university", done: true },
                { id: "3", label: "Add at least 5 skills" },
                { id: "4", label: "Upload your CV" },
              ]}
            />
          </Demo>
          <Demo label="Smart recommendation">
            <SmartRecommendation
              title="Strong match"
              options={[
                { id: "be", label: "Apply to Backend Intern", reason: <>You have <strong>4 of 5</strong> required skills. Add Docker to your profile to match fully.</>, signal: 3 },
                { id: "data", label: "Apply to Data Intern", reason: <>You have <strong>3 of 6</strong> skills — SQL and Python carry the most weight.</>, signal: 2 },
              ]}
            />
          </Demo>
          <Demo label="Decision inbox">
            <DecisionInbox
              decisions={[
                { id: "1", title: "Interview with Kaspi.kz on Tue, 14:00?", detail: "Backend Intern · online · 45 min", primary: "Accept", secondary: "Suggest time" },
                { id: "2", title: "Epam sent you an offer", detail: "Data Intern · 3 months · paid", primary: "Review", secondary: "Later" },
              ]}
            />
          </Demo>
          <Demo label="Notification stack">
            <NotificationStack
              notices={[
                { id: "1", badge: "New", title: "Summer internships are open", text: "42 companies posted internships for June–August.", action: { label: "Browse" } },
                { id: "2", title: "Profile tip", text: "Profiles with a CV get 3× more replies." },
              ]}
            />
          </Demo>
          <Demo label="Tips panel" wide>
            <TipsPanel
              title="Getting started"
              tips={[
                { id: "1", title: "Add skills", description: "Matching starts from your skills.", action: "Add skills", primary: true },
                { id: "2", title: "Upload CV", description: "Recruiters see it with every application.", action: "Upload" },
                { id: "3", title: "Set preferences", description: "City, format and field of work.", action: "Set up" },
              ]}
            />
          </Demo>
          <Demo label="Change summary">
            <ChangeSummary
              title="Your profile this week"
              period="Last 7 days"
              changes={[
                { label: "Profile views", change: "+18", tone: "good", direction: "up" },
                { label: "New matches", change: "+6", tone: "good", direction: "up" },
                { label: "Replies", change: "−1", tone: "bad", direction: "down" },
              ]}
            />
          </Demo>
          <Demo label="Number ticker">
            <div className={styles.row} style={{ fontSize: "var(--text-h1)", fontWeight: 600 }}>
              <NumberTicker value={87} />%
            </div>
          </Demo>
        </div>
      </Section>

      <Section id="examples" title="Novio examples" note="Compositions built only from the pieces above.">
        <div className={styles.grid}>
          <Demo label="Vacancy card with skill match">
            <Tray
              data-testid="vacancy-card"
              footer={
                <>
                  <span className={styles.match}>Strong match · 3 of 5 skills</span>
                  <div className={styles.row}>
                    <Button variant="secondary" size="sm" icon={<Icon name="saved" />}>Save</Button>
                    <Button size="sm">Apply</Button>
                  </div>
                </>
              }
            >
              <div className={styles.vacancyHead}>
                <Avatar name="Kaspi" shape="square" />
                <div className={styles.vacancyMain}>
                  <div className={styles.vacancyTitleRow}>
                    <h3 className={styles.vacancyTitle}>Backend Intern (Python)</h3>
                    <Tag tone="accent">Internship</Tag>
                  </div>
                  <p className={styles.vacancyMeta}>Kaspi.kz · Almaty · Hybrid · 3 months</p>
                </div>
              </div>
              <div className={styles.skills} aria-label="Skills">
                {["Python", "FastAPI", "SQL"].map((s) => (
                  <span key={s} className={styles.skill} data-match=""><Icon name="check" size={12} strokeWidth={2.4} />{s}</span>
                ))}
                {["Docker", "Redis"].map((s) => (
                  <span key={s} className={styles.skill}>{s}</span>
                ))}
              </div>
            </Tray>
          </Demo>
          <Demo label="Sign-in card">
            <Tray footerAlign="center" footer={<span>No account?&nbsp;<TextLink to="/styleguide">Create one</TextLink></span>} padding="lg">
              <form className={styles.stack} onSubmit={(e) => e.preventDefault()} aria-label="Sign in">
                <TextField label="Email" type="email" placeholder="you@university.edu" autoComplete="email" />
                <PasswordField label="Password" placeholder="Your password" />
                <Button type="submit">Sign in</Button>
              </form>
            </Tray>
          </Demo>
        </div>
      </Section>
    </Container>
  );
}
