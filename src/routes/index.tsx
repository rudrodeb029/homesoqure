import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type ReactNode } from "react";
import { SpaShell } from "@/components/SpaShell";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Home } from "lucide-react";
import {
  getPropertyById,
  fetchPropertyFromCloud,
  saveOrUpdateDraftLead,
  saveStepOneSubmission,
  type Property,
  DEFAULT_PROPERTY,
} from "@/lib/property-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tell the Landlord About Yourself · Homqero" },
      { name: "description", content: "Homqero rental prescreener: share employment, income, credit score and move-in details with the landlord." },
      { property: "og:title", content: "Tell the Landlord About Yourself · Homqero" },
      { property: "og:description", content: "Quick rental prescreener for US apartments and homes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const employment = ["Employed full-time", "Employed part-time", "Self-employed", "Student", "Retired", "Other"];
const credit = ["350 – 599", "600 – 649", "650 – 699", "700 – 749", "750 – 850", "I don't know my credit score"];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-border pt-8">
      <h2 className="font-serif text-2xl text-foreground">{title}</h2>
      <div className="mt-5 space-y-6">{children}</div>
    </section>
  );
}

function Q({ label, hint, children }: { label: string; hint?: string; children?: ReactNode }) {
  return (
    <div>
      <p className="text-sm font-semibold text-foreground">{label}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

function Radios({ name, options, col, onChange }: { name: string; options: string[]; col?: boolean; onChange?: (value: string) => void }) {
  return (
    <div className={col ? "grid gap-2" : "flex flex-wrap gap-x-6 gap-y-2"}>
      {options.map((o) => (
        <label key={o} className="flex items-center gap-2 text-sm">
          <input type="radio" name={name} value={o} onChange={() => onChange?.(o)} className="accent-primary" /> {o}
        </label>
      ))}
    </div>
  );
}

function HouseMark() {
  return (
    <svg viewBox="0 0 112 80" className="h-20 w-28 shrink-0 rounded bg-secondary text-primary" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M20 44 L56 16 L92 44" />
      <rect x="28" y="44" width="56" height="28" />
      <rect x="50" y="54" width="12" height="18" />
      <rect x="34" y="50" width="10" height="10" />
      <rect x="68" y="50" width="10" height="10" />
      <line x1="8" y1="72" x2="104" y2="72" />
    </svg>
  );
}

function Index() {
  const nav = useNavigate();
  const [property, setProperty] = useState<Property>(DEFAULT_PROPERTY);

  // Form states
  const [selectedEmployment, setSelectedEmployment] = useState<string[]>([]);
  const [income, setIncome] = useState("");
  const [creditRange, setCreditRange] = useState("");
  const [moveInDate, setMoveInDate] = useState("");
  const [people, setPeople] = useState(1);
  const [hasPets, setHasPets] = useState(false);
  const [petDetails, setPetDetails] = useState("");
  const [smoking, setSmoking] = useState("");
  const [wantsShowing, setWantsShowing] = useState(false);
  const [showingTypes, setShowingTypes] = useState<string[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("");
  const [questions, setQuestions] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const propId = params.get("p") || params.get("property");
      const loaded = getPropertyById(propId);
      setProperty(loaded);

      if (propId) {
        fetchPropertyFromCloud(propId).then((cloudProp) => {
          if (cloudProp) setProperty(cloudProp);
        });
      }
    }
  }, []);

  const syncDraft = (overrides: Record<string, unknown> = {}) => {
    saveOrUpdateDraftLead({
      propertyId: property.id,
      propertyAddress: property.address,
      firstName,
      lastName,
      email,
      phone,
      income,
      creditRange,
      moveInDate,
      people,
      hasPets,
      petDetails,
      smoking,
      wantsShowing,
      showingTypes,
      source,
      questions,
      status: "incomplete",
      ...overrides,
    });
  };

  // Real-time auto-sync to Admin Panel whenever user types or changes any input
  useEffect(() => {
    const timer = setTimeout(() => {
      syncDraft();
    }, 300);
    return () => clearTimeout(timer);
  }, [
    property.id,
    property.address,
    firstName,
    lastName,
    email,
    phone,
    income,
    creditRange,
    moveInDate,
    people,
    hasPets,
    petDetails,
    smoking,
    wantsShowing,
    showingTypes,
    source,
    questions,
  ]);

  const handleToggleEmployment = (item: string) => {
    setSelectedEmployment((prev) => {
      const next = prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item];
      return next;
    });
  };

  const handleToggleShowingType = (val: string) => {
    setShowingTypes((prev) => {
      const next = prev.includes(val) ? prev.filter((i) => i !== val) : [...prev, val];
      syncDraft({ showingTypes: next });
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    saveStepOneSubmission({
      propertyId: property.id,
      propertyAddress: property.address,
      firstName,
      lastName,
      email,
      phone,
      income,
      creditRange,
      moveInDate,
      people,
      hasPets,
      petDetails,
      smoking,
      wantsShowing,
      showingTypes,
      source,
      questions,
      status: "pending_credit",
    });

    nav({
      to: "/success",
      search: property.id ? { p: property.id } : undefined,
    });
  };

  return (
    <SpaShell>
      <form
        onSubmit={handleSubmit}
        onBlur={() => syncDraft()}
        className="mx-auto max-w-[520px] space-y-8"
      >
        <div>
          <h1 className="font-serif text-4xl text-foreground">
            Tell the landlord about <span className="font-script text-5xl text-primary">yourself</span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Answer a few questions so the landlord knows why you're a good fit for this rental.
          </p>

          {/* Dynamic Property Post Card */}
          <div className="mt-6 flex items-center gap-4 rounded-lg border border-border bg-card p-3 shadow-xs">
            {property.imageUrl ? (
              <img
                src={property.imageUrl}
                alt={property.address}
                className="h-20 w-28 shrink-0 rounded-md object-cover border border-border shadow-xs"
              />
            ) : (
              <HouseMark />
            )}
            <div className="text-sm">
              <span className="eyebrow text-[0.6rem] text-primary">Active Rental Listing</span>
              <p className="font-serif text-lg font-semibold text-foreground">{property.address}</p>
              <p className="text-muted-foreground">{property.city}, {property.state} {property.zip}</p>
              <p className="mt-1 font-semibold text-foreground">
                ${property.price} <span className="font-normal text-muted-foreground">/ month</span>
              </p>
            </div>
          </div>
        </div>

        <Section title="Employment">
          <Q label="Which best describes you?" hint="Select all that apply">
            <div className="grid gap-2 sm:grid-cols-2">
              {employment.map((g) => (
                <label key={g} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedEmployment.includes(g)}
                    onChange={() => handleToggleEmployment(g)}
                    className="accent-primary"
                  />{" "}
                  {g}
                </label>
              ))}
            </div>
          </Q>
          <Q label="Total monthly income" hint="Include all household income: roommates, spouse, social security, vouchers, etc.">
            <div className="relative max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <input
                type="number"
                min="0"
                required
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                className="spa-field pl-7"
              />
            </div>
          </Q>
          <Q label="What is your estimated credit score?" hint="Your exact score will be verified after you complete an application.">
            <Radios name="credit" options={credit} col onChange={(val) => setCreditRange(val)} />
          </Q>
        </Section>

        <Section title="Move-In Information">
          <Q label="Desired move-in date">
            <input
              type="date"
              required
              value={moveInDate}
              onChange={(e) => setMoveInDate(e.target.value)}
              className="spa-field max-w-xs"
            />
          </Q>
          <div className="flex items-center justify-between gap-4">
            <Q label="How many people would live at this rental?" hint="Make sure to include yourself." />
            <div className="flex shrink-0 items-center gap-3">
              <Button type="button" variant="outline" size="icon" aria-label="Remove one person" onClick={() => setPeople(Math.max(1, people - 1))} className="h-8 w-8 rounded-full border-primary text-primary shadow-none"><Minus /></Button>
              <span className="w-8 text-center font-semibold">{people}</span>
              <Button type="button" variant="outline" size="icon" aria-label="Add one person" onClick={() => setPeople(people + 1)} className="h-8 w-8 rounded-full border-primary text-primary shadow-none"><Plus /></Button>
            </div>
          </div>
          <Q label="Do you have any pets?">
            <Radios name="pets" options={["Yes", "No"]} onChange={(value) => setHasPets(value === "Yes")} />
            {hasPets && (
              <div className="mt-4">
                <label htmlFor="pet-details" className="text-sm font-semibold text-foreground">What Type of Pet(s)?</label>
                <textarea id="pet-details" name="petDetails" rows={3} maxLength={155} value={petDetails} onChange={(e) => setPetDetails(e.target.value.slice(0, 155))} aria-describedby="pet-character-count" className="spa-field mt-2" />
                <p id="pet-character-count" className="mt-1 text-xs text-muted-foreground">{petDetails.length} / 155 characters used</p>
              </div>
            )}
          </Q>
          <Q label="Do you smoke?"><Radios name="smoke" options={["Yes", "No", "Outside only"]} onChange={(v) => setSmoking(v)} /></Q>
          <Q label="Would you be interested in a showing?" hint="See if the landlord will show the rental by video (FaceTime, Zoom, etc.).">
            <Radios name="show" options={["Yes", "No"]} onChange={(value) => setWantsShowing(value === "Yes")} />
            {wantsShowing && (
              <fieldset className="mt-4 space-y-3">
                <legend className="mb-3 text-sm font-semibold text-foreground">Your preferred showing type:</legend>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="showingType"
                    value="in-person"
                    checked={showingTypes.includes("in-person")}
                    onChange={() => handleToggleShowingType("in-person")}
                    className="mt-1 accent-primary"
                  />
                  In-person showing
                </label>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="showingType"
                    value="virtual"
                    checked={showingTypes.includes("virtual")}
                    onChange={() => handleToggleShowingType("virtual")}
                    className="mt-1 accent-primary"
                  />
                  Virtual showing (FaceTime, Zoom, etc.)
                </label>
              </fieldset>
            )}
          </Q>
        </Section>

        <Section title="Contact Details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Q label="First name"><input required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="spa-field" /></Q>
            <Q label="Last name"><input required value={lastName} onChange={(e) => setLastName(e.target.value)} className="spa-field" /></Q>
            <Q label="Email"><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="spa-field" /></Q>
            <Q label="Phone number"><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="spa-field" /></Q>
          </div>
          <Q label="How did you find this property?">
            <select
              name="source"
              aria-label="How did you find this property?"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="spa-field"
            >
              <option value=""> </option>
              {[
                ["CRAIGSLIST", "Craigslist"],
                ["ZILLOW", "Zillow"],
                ["MP_ZUMPER", "Zumper"],
                ["FACEBOOK", "Facebook"],
                ["MP_APARTMENT_LIST", "Apartment List"],
                ["MP_REALTOR", "Realtor.com"],
                ["MP_APARTMENTS", "Apartments.com"],
                ["MP_CRAIGSLIST", "Craigslist"],
                ["RENTLER", "Rentler"],
                ["MP_HOMES", "Homes.com"],
                ["MP_HUNT", "Hunt"],
                ["MP_SHOW_ME_THE_RENT", "Show Me The Rent"],
                ["MP_ULOOP", "Uloop"],
                ["MP_COLLEGE_STUDENT_APARTMENTS", "College Student Apartments"],
                ["APARTMENT_ADVISOR", "Apartment Advisor"],
                ["MP_COLLEGE_RENTALS", "College Rentals"],
                ["RENTBERRY", "Rentberry"],
                ["RENTHOP", "RentHop"],
                ["MP_DWELLSY", "Dwellsy"],
                ["MP_RENTAL_SOURCE", "RentalSource"],
                ["REFERRAL", "Referral"],
                ["YARD_SIGN", "Yard Sign"],
                ["OTHER", "Other"],
                ["RENTAL_BEAST", "Rental Beast"],
              ].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Q>
          <Q label="Any questions for the landlord? (optional)">
            <textarea
              rows={4}
              value={questions}
              onChange={(e) => setQuestions(e.target.value)}
              className="spa-field"
            />
          </Q>
        </Section>

        <div className="text-center">
          <Button type="submit" className="h-10 rounded-full px-10 text-xs font-semibold uppercase tracking-[0.2em] shadow-none hover:bg-espresso">
            Next
          </Button>
          <p className="mt-4 text-xs text-muted-foreground">
            By sending, you agree to our <a className="underline" href="#">Terms of Use</a> &amp; <a className="underline" href="#">Privacy Policy</a>.
          </p>
        </div>
      </form>
    </SpaShell>
  );
}
