import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, type ReactNode } from "react";
import { SpaShell } from "@/components/SpaShell";
import { Button } from "@/components/ui/button";
import { Minus, Plus, AlertCircle, Phone as PhoneIcon, Check } from "@/lib/lucide-react";
import {
  getPropertyById,
  fetchPropertyFromCloud,
  saveOrUpdateDraftLead,
  saveStepOneSubmission,
  type Property,
  DEFAULT_PROPERTY,
} from "@/lib/property-store";
import { formatUSPhone, isValidUSPhone } from "@/lib/phone-utils";
import { dispatchApplicationEmail } from "@/lib/deep-analysis";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tell the Landlord About Yourself · Homqero Rentals USA" },
      { name: "description", content: "Homqero rental prescreener: share employment, income, credit score and move-in details with the landlord." },
      { property: "og:title", content: "Tell the Landlord About Yourself · Homqero Rentals USA" },
      { property: "og:description", content: "Quick rental prescreener for US apartments and homes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const employment = ["Employed full-time", "Employed part-time", "Self-employed", "Student", "Retired", "Other"];
const credit = ["350 – 599", "600 – 649", "650 – 699", "700 – 749", "750 – 850", "I don't know my credit score"];

function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="border-t border-border pt-8 scroll-mt-20">
      <h2 className="font-serif text-2xl font-bold text-foreground">{title}</h2>
      <div className="mt-5 space-y-6">{children}</div>
    </section>
  );
}

function Q({
  id,
  label,
  hint,
  error,
  required,
  children,
}: {
  id?: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      id={id}
      className={`scroll-mt-24 transition-colors rounded-lg p-1.5 ${
        error ? "border border-red-500/80 bg-red-50/40 dark:bg-red-950/20 ring-1 ring-red-500/20 p-3" : ""
      }`}
    >
      <p className={`text-sm font-bold ${error ? "text-red-700 dark:text-red-400" : "text-foreground"}`}>
        {label}
        {required && <span className="text-red-600 dark:text-red-400 ml-1">*</span>}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground font-medium">{hint}</p>}
      {children && <div className="mt-3">{children}</div>}
      {error && (
        <p className="mt-2 text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}
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
  const [people, setPeople] = useState(0);
  const [adults, setAdults] = useState(0);
  const [childrenCount, setChildrenCount] = useState(0);
  const [hasPets, setHasPets] = useState(false);
  const [petOptionChosen, setPetOptionChosen] = useState(false);
  const [petDetails, setPetDetails] = useState("");
  const [smoking, setSmoking] = useState("");
  const [wantsShowing, setWantsShowing] = useState(false);
  const [showingOptionChosen, setShowingOptionChosen] = useState(false);
  const [showingTypes, setShowingTypes] = useState<string[]>([]);
  const [viewingDate, setViewingDate] = useState("");
  const [viewingTime, setViewingTime] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("");
  const [questions, setQuestions] = useState("");

  // Validation error state
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Worker referral code from share link (?ref=CODE)
  const [refCode, setRefCode] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref) setRefCode(ref.trim().toUpperCase());
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
      ownerId: property.ownerId,
      ownerName: property.ownerName,
      referralCode: property.referralCode || refCode || undefined,
      firstName,
      lastName,
      email,
      phone,
      income,
      creditRange,
      moveInDate,
      people,
      adults,
      children: childrenCount,
      hasPets,
      petDetails,
      smoking,
      wantsShowing,
      showingTypes,
      viewingDate,
      viewingTime,
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
    adults,
    childrenCount,
    hasPets,
    petDetails,
    smoking,
    wantsShowing,
    showingTypes,
    viewingDate,
    viewingTime,
    source,
    questions,
  ]);

  const handleToggleEmployment = (item: string) => {
    setSelectedEmployment((prev) => {
      const next = prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item];
      if (errors.employment && next.length > 0) {
        setErrors((errs) => ({ ...errs, employment: "" }));
      }
      return next;
    });
  };

  const handleToggleShowingType = (val: string) => {
    setShowingTypes((prev) => {
      const next = prev.includes(val) ? prev.filter((i) => i !== val) : [...prev, val];
      if (errors.showingTypes && next.length > 0) {
        setErrors((errs) => ({ ...errs, showingTypes: "" }));
      }
      syncDraft({ showingTypes: next });
      return next;
    });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatUSPhone(e.target.value);
    setPhone(formatted);
    if (errors.phone && isValidUSPhone(formatted)) {
      setErrors((errs) => ({ ...errs, phone: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 1. Employment
    if (selectedEmployment.length === 0) {
      newErrors.employment = "Please select at least one employment status.";
    }
    const numIncome = parseFloat(income.replace(/[^0-9.]/g, ""));
    if (!income.trim() || isNaN(numIncome) || numIncome <= 0) {
      newErrors.income = "Please enter your total monthly household income.";
    }
    if (!creditRange) {
      newErrors.creditRange = "Please select your estimated credit score range.";
    }

    // 2. Move-in Information
    if (!moveInDate) {
      newErrors.moveInDate = "Please choose your desired move-in date.";
    }
    if (adults + childrenCount < 1) {
      newErrors.people = "Please specify at least one adult or child living at this rental.";
    }
    if (!petOptionChosen) {
      newErrors.pets = "Please select whether you have pets.";
    } else if (hasPets && !petDetails.trim()) {
      newErrors.petDetails = "Please describe the pet breed, age, and weight.";
    }
    if (!smoking) {
      newErrors.smoking = "Please select your smoking status.";
    }
    if (!showingOptionChosen) {
      newErrors.showing = "Please select whether you are interested in a viewing.";
    } else if (wantsShowing) {
      if (showingTypes.length === 0) {
        newErrors.showingTypes = "Please select at least one viewing preference.";
      }
      if (!viewingDate) {
        newErrors.viewingDate = "Please select a preferred viewing date.";
      }
      if (!viewingTime) {
        newErrors.viewingTime = "Please select a preferred viewing time.";
      }
    }

    // 3. Contact Details
    if (!firstName.trim()) {
      newErrors.firstName = "Please enter your first name.";
    }
    if (!lastName.trim()) {
      newErrors.lastName = "Please enter your last name.";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      newErrors.email = "Please enter a valid email address.";
    }
    if (!phone.trim()) {
      newErrors.phone = "Please enter your phone number.";
    } else if (!isValidUSPhone(phone)) {
      newErrors.phone = "Please enter a valid 10-digit USA phone number, e.g. (555) 000-0000.";
    }

    setErrors(newErrors);

    // Scroll to first invalid field
    const errorKeys = Object.keys(newErrors);
    if (errorKeys.length > 0) {
      const firstKey = errorKeys[0]!;
      const targetElement =
        document.getElementById(`field-${firstKey}`) ||
        document.getElementById(`q-${firstKey}`) ||
        document.getElementById(`section-${firstKey}`);

      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
        const inputToFocus = targetElement.querySelector("input, select, textarea") as HTMLElement | null;
        if (inputToFocus) {
          setTimeout(() => inputToFocus.focus(), 300);
        }
      }
      return false;
    }

    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const submissionData = {
      propertyId: property.id,
      propertyAddress: property.address,
      ownerId: property.ownerId,
      ownerName: property.ownerName,
      referralCode: property.referralCode || refCode || undefined,
      firstName,
      lastName,
      email,
      phone,
      income,
      creditRange,
      moveInDate,
      people,
      adults,
      children: childrenCount,
      hasPets,
      petDetails,
      smoking,
      wantsShowing,
      showingTypes,
      viewingDate,
      viewingTime,
      source,
      questions,
      status: "pending_credit" as const,
    };

    saveStepOneSubmission(submissionData);

    // Dispatch deep analysis email notification in the background
    dispatchApplicationEmail(submissionData, property);

    nav({
      to: "/success",
      search: property.id ? { p: property.id } : undefined,
    });
  };

  return (
    <SpaShell>
      <form
        onSubmit={handleSubmit}
        noValidate
        onBlur={() => syncDraft()}
        className="mx-auto max-w-[520px] space-y-8"
      >
        <div>
          <h1 className="font-serif text-4xl font-bold text-foreground">
            Tell the landlord about yourself
          </h1>
          <p className="mt-3 text-sm text-muted-foreground font-medium">
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
              <span className="eyebrow text-[0.6rem] font-bold text-primary">Active Rental Listing</span>
              <p className="font-serif text-lg font-bold text-foreground">{property.address}</p>
              <p className="text-muted-foreground font-medium">{property.city}, {property.state} {property.zip}</p>
              <p className="mt-1 font-bold text-foreground">
                ${property.price} <span className="font-normal text-muted-foreground">/ month</span>
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 1: EMPLOYMENT */}
        <Section id="section-employment" title="Employment">
          <Q
            id="q-employment"
            label="Which best describes you?"
            hint="Select all that apply"
            required
            error={errors.employment}
          >
            <div id="field-employment" className="grid gap-2 sm:grid-cols-2">
              {employment.map((g) => (
                <label key={g} className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedEmployment.includes(g)}
                    onChange={() => handleToggleEmployment(g)}
                    className="accent-primary h-4 w-4 rounded"
                  />{" "}
                  {g}
                </label>
              ))}
            </div>
          </Q>

          <Q
            id="q-income"
            label="Total monthly income"
            hint="Include all household income: roommates, spouse, social security, vouchers, etc."
            required
            error={errors.income}
          >
            <div className="relative max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">$</span>
              <input
                id="field-income"
                type="text"
                inputMode="decimal"
                placeholder="4,500"
                value={income}
                onChange={(e) => {
                  setIncome(e.target.value);
                  if (errors.income) setErrors((errs) => ({ ...errs, income: "" }));
                }}
                className={`spa-field pl-7 font-bold ${
                  errors.income ? "border-red-500 bg-red-500/5 ring-1 ring-red-500/30" : ""
                }`}
              />
            </div>
          </Q>

          <Q
            id="q-creditRange"
            label="What is your estimated credit score?"
            hint="Your exact score will be verified after you complete an application."
            required
            error={errors.creditRange}
          >
            <div id="field-creditRange" className="grid gap-2">
              {credit.map((o) => (
                <label key={o} className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="credit"
                    value={o}
                    checked={creditRange === o}
                    onChange={() => {
                      setCreditRange(o);
                      if (errors.creditRange) setErrors((errs) => ({ ...errs, creditRange: "" }));
                    }}
                    className="accent-primary h-4 w-4"
                  />
                  <span>{o}</span>
                </label>
              ))}
            </div>
          </Q>
        </Section>

        {/* SECTION 2: MOVE-IN INFORMATION */}
        <Section id="section-moveInDate" title="Move-In Information">
          <Q
            id="q-moveInDate"
            label="Desired move-in date"
            required
            error={errors.moveInDate}
          >
            <input
              id="field-moveInDate"
              type="date"
              value={moveInDate}
              onChange={(e) => {
                setMoveInDate(e.target.value);
                if (errors.moveInDate) setErrors((errs) => ({ ...errs, moveInDate: "" }));
              }}
              className={`spa-field max-w-xs font-medium ${
                errors.moveInDate ? "border-red-500 bg-red-500/5 ring-1 ring-red-500/30" : ""
              }`}
            />
          </Q>

          <div id="q-people" className="space-y-3">
            <div>
              <p className="text-sm font-bold text-foreground">
                How many people would live at this rental? <span className="text-red-600 dark:text-red-400">*</span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground font-medium">
                Make sure to include yourself. Specify adults and children below.
              </p>
              {errors.people && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 animate-in fade-in duration-200">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.people}</span>
                </p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {/* Adults counter */}
              <div className={`flex items-center justify-between rounded-lg border p-3 shadow-2xs transition-colors ${
                errors.people ? "border-red-500 bg-red-500/5 ring-1 ring-red-500/20" : "border-border bg-card"
              }`}>
                <div>
                  <p className="text-sm font-bold text-foreground">Adults</p>
                  <p className="text-[0.7rem] text-muted-foreground font-medium">Age 18+</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Remove one adult"
                    onClick={() => {
                      const next = Math.max(0, adults - 1);
                      setAdults(next);
                      setPeople(next + childrenCount);
                      if (errors.people && next + childrenCount >= 1) {
                        setErrors((errs) => ({ ...errs, people: "" }));
                      }
                      syncDraft({ adults: next, people: next + childrenCount });
                    }}
                    disabled={adults <= 0}
                    className="h-8 w-8 rounded-full border-primary text-primary shadow-none cursor-pointer disabled:opacity-40"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="w-6 text-center font-bold text-base text-foreground">{adults}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Add one adult"
                    onClick={() => {
                      const next = adults + 1;
                      setAdults(next);
                      setPeople(next + childrenCount);
                      if (errors.people) {
                        setErrors((errs) => ({ ...errs, people: "" }));
                      }
                      syncDraft({ adults: next, people: next + childrenCount });
                    }}
                    className="h-8 w-8 rounded-full border-primary text-primary shadow-none cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Children counter */}
              <div className={`flex items-center justify-between rounded-lg border p-3 shadow-2xs transition-colors ${
                errors.people ? "border-red-500 bg-red-500/5 ring-1 ring-red-500/20" : "border-border bg-card"
              }`}>
                <div>
                  <p className="text-sm font-bold text-foreground">Children</p>
                  <p className="text-[0.7rem] text-muted-foreground font-medium">Under 18</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Remove one child"
                    onClick={() => {
                      const next = Math.max(0, childrenCount - 1);
                      setChildrenCount(next);
                      setPeople(adults + next);
                      if (errors.people && adults + next >= 1) {
                        setErrors((errs) => ({ ...errs, people: "" }));
                      }
                      syncDraft({ children: next, people: adults + next });
                    }}
                    disabled={childrenCount <= 0}
                    className="h-8 w-8 rounded-full border-primary text-primary shadow-none cursor-pointer disabled:opacity-40"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="w-6 text-center font-bold text-base text-foreground">{childrenCount}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Add one child"
                    onClick={() => {
                      const next = childrenCount + 1;
                      setChildrenCount(next);
                      setPeople(adults + next);
                      if (errors.people) {
                        setErrors((errs) => ({ ...errs, people: "" }));
                      }
                      syncDraft({ children: next, people: adults + next });
                    }}
                    className="h-8 w-8 rounded-full border-primary text-primary shadow-none cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <Q
            id="q-pets"
            label="Do you have any pets?"
            required
            error={errors.pets || errors.petDetails}
          >
            <div id="field-pets" className="flex flex-wrap gap-x-6 gap-y-2">
              {["Yes", "No"].map((option) => (
                <label key={option} className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="pets"
                    value={option}
                    checked={petOptionChosen && (hasPets ? option === "Yes" : option === "No")}
                    onChange={() => {
                      setPetOptionChosen(true);
                      setHasPets(option === "Yes");
                      if (errors.pets) setErrors((errs) => ({ ...errs, pets: "" }));
                    }}
                    className="accent-primary h-4 w-4"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>

            {hasPets && (
              <div id="field-petDetails" className="mt-4">
                <label htmlFor="pet-details" className="text-sm font-bold text-foreground">
                  What Type of Pet(s)? <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                <textarea
                  id="pet-details"
                  name="petDetails"
                  rows={3}
                  maxLength={155}
                  value={petDetails}
                  placeholder="e.g. 1 Golden Retriever (45 lbs), 2 years old, trained"
                  onChange={(e) => {
                    setPetDetails(e.target.value.slice(0, 155));
                    if (errors.petDetails) setErrors((errs) => ({ ...errs, petDetails: "" }));
                  }}
                  className={`spa-field mt-2 ${
                    errors.petDetails ? "border-red-500 bg-red-500/5 ring-1 ring-red-500/30" : ""
                  }`}
                />
                <p className="mt-1 text-xs text-muted-foreground">{petDetails.length} / 155 characters used</p>
              </div>
            )}
          </Q>

          <Q
            id="q-smoking"
            label="Do you smoke?"
            required
            error={errors.smoking}
          >
            <div id="field-smoking" className="flex flex-wrap gap-x-6 gap-y-2">
              {["Yes", "No", "Outside only"].map((option) => (
                <label key={option} className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="smoke"
                    value={option}
                    checked={smoking === option}
                    onChange={() => {
                      setSmoking(option);
                      if (errors.smoking) setErrors((errs) => ({ ...errs, smoking: "" }));
                    }}
                    className="accent-primary h-4 w-4"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </Q>

          <Q
            id="q-showing"
            label="Would you be interested in a viewing?"
            hint="See if the landlord will show the rental by video (FaceTime, Zoom, etc.) or in person."
            required
            error={errors.showing || errors.showingTypes || errors.viewingDate || errors.viewingTime}
          >
            <div id="field-showing" className="flex flex-wrap gap-x-6 gap-y-2">
              {["Yes", "No"].map((option) => (
                <label key={option} className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="show"
                    value={option}
                    checked={showingOptionChosen && (wantsShowing ? option === "Yes" : option === "No")}
                    onChange={() => {
                      setShowingOptionChosen(true);
                      setWantsShowing(option === "Yes");
                      if (errors.showing) setErrors((errs) => ({ ...errs, showing: "" }));
                    }}
                    className="accent-primary h-4 w-4"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>

            {wantsShowing && (
              <div className="mt-4 space-y-4 rounded-lg border border-border/70 bg-secondary/30 p-4">
                <fieldset id="field-showingTypes" className="space-y-2">
                  <legend className="text-sm font-bold text-foreground">
                    Preferred viewing type: <span className="text-red-600 dark:text-red-400">*</span>
                  </legend>
                  {errors.showingTypes && (
                    <p className="text-xs text-red-600 dark:text-red-400 font-semibold">{errors.showingTypes}</p>
                  )}
                  <div className="flex flex-wrap gap-4 pt-1">
                    <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        name="showingType"
                        value="in-person"
                        checked={showingTypes.includes("in-person")}
                        onChange={() => handleToggleShowingType("in-person")}
                        className="accent-primary h-4 w-4 rounded"
                      />
                      <span>In-person viewing</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        name="showingType"
                        value="virtual"
                        checked={showingTypes.includes("virtual")}
                        onChange={() => handleToggleShowingType("virtual")}
                        className="accent-primary h-4 w-4 rounded"
                      />
                      <span>Virtual viewing (FaceTime, Zoom, etc.)</span>
                    </label>
                  </div>
                </fieldset>

                {/* Preferred Date & Time Selection */}
                <div className="grid gap-3 pt-2 sm:grid-cols-2">
                  <div>
                    <label htmlFor="field-viewingDate" className="block text-xs font-bold text-foreground mb-1">
                      Preferred viewing date <span className="text-red-600 dark:text-red-400">*</span>
                    </label>
                    <input
                      id="field-viewingDate"
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                      value={viewingDate}
                      onChange={(e) => {
                        setViewingDate(e.target.value);
                        if (errors.viewingDate) setErrors((errs) => ({ ...errs, viewingDate: "" }));
                        syncDraft({ viewingDate: e.target.value });
                      }}
                      className={`spa-field w-full text-xs font-medium ${
                        errors.viewingDate ? "border-red-500 bg-red-500/5 ring-1 ring-red-500/30" : ""
                      }`}
                    />
                    {errors.viewingDate && (
                      <p className="mt-1 text-[0.7rem] text-red-600 dark:text-red-400 font-medium">{errors.viewingDate}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="field-viewingTime" className="block text-xs font-bold text-foreground mb-1">
                      Preferred viewing time <span className="text-red-600 dark:text-red-400">*</span>
                    </label>
                    <input
                      id="field-viewingTime"
                      type="time"
                      value={viewingTime}
                      onChange={(e) => {
                        setViewingTime(e.target.value);
                        if (errors.viewingTime) setErrors((errs) => ({ ...errs, viewingTime: "" }));
                        syncDraft({ viewingTime: e.target.value });
                      }}
                      className={`spa-field w-full text-xs font-medium ${
                        errors.viewingTime ? "border-red-500 bg-red-500/5 ring-1 ring-red-500/30" : ""
                      }`}
                    />
                    {errors.viewingTime && (
                      <p className="mt-1 text-[0.7rem] text-red-600 dark:text-red-400 font-medium">{errors.viewingTime}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Q>
        </Section>

        {/* SECTION 3: CONTACT DETAILS */}
        <Section id="section-contact" title="Contact Details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Q
              id="q-firstName"
              label="First name"
              required
              error={errors.firstName}
            >
              <input
                id="field-firstName"
                value={firstName}
                placeholder="Jane"
                onChange={(e) => {
                  setFirstName(e.target.value);
                  if (errors.firstName) setErrors((errs) => ({ ...errs, firstName: "" }));
                }}
                className={`spa-field font-medium ${
                  errors.firstName ? "border-red-500 bg-red-500/5 ring-1 ring-red-500/30" : ""
                }`}
              />
            </Q>

            <Q
              id="q-lastName"
              label="Last name"
              required
              error={errors.lastName}
            >
              <input
                id="field-lastName"
                value={lastName}
                placeholder="Doe"
                onChange={(e) => {
                  setLastName(e.target.value);
                  if (errors.lastName) setErrors((errs) => ({ ...errs, lastName: "" }));
                }}
                className={`spa-field font-medium ${
                  errors.lastName ? "border-red-500 bg-red-500/5 ring-1 ring-red-500/30" : ""
                }`}
              />
            </Q>

            <Q
              id="q-email"
              label="Email"
              required
              error={errors.email}
            >
              <input
                id="field-email"
                type="email"
                value={email}
                placeholder="jane.doe@example.com"
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((errs) => ({ ...errs, email: "" }));
                }}
                className={`spa-field font-medium ${
                  errors.email ? "border-red-500 bg-red-500/5 ring-1 ring-red-500/30" : ""
                }`}
              />
            </Q>

            <Q
              id="q-phone"
              label="Phone number"
              hint="USA 10-digit format only"
              required
              error={errors.phone}
            >
              <div className="relative">
                <input
                  id="field-phone"
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="(555) 000-0000"
                  maxLength={14}
                  className={`spa-field font-medium tracking-wide ${
                    errors.phone ? "border-red-500 bg-red-500/5 ring-1 ring-red-500/30" : ""
                  }`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground bg-secondary px-1.5 py-0.5 rounded border border-border">
                  USA
                </span>
              </div>
            </Q>
          </div>

          <Q id="q-source" label="How did you find this property?">
            <select
              id="field-source"
              name="source"
              aria-label="How did you find this property?"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="spa-field font-medium cursor-pointer"
            >
              <option value="">Select source...</option>
              {[
                ["ZILLOW", "Zillow"],
                ["CRAIGSLIST", "Craigslist"],
                ["APARTMENTS", "Apartments.com"],
                ["REALTOR", "Realtor.com"],
                ["FACEBOOK", "Facebook Marketplace"],
                ["ZUMPER", "Zumper"],
                ["APARTMENT_LIST", "Apartment List"],
                ["HOMES_COM", "Homes.com"],
                ["RENTLER", "Rentler"],
                ["REFERRAL", "Friend or Family Referral"],
                ["YARD_SIGN", "Yard Sign / Drove By"],
                ["OTHER", "Other Source"],
              ].map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Q>

          <Q id="q-questions" label="Any questions for the landlord? (optional)">
            <textarea
              id="field-questions"
              rows={4}
              value={questions}
              placeholder="e.g. Is off-street parking included? Are utilities covered?"
              onChange={(e) => setQuestions(e.target.value)}
              className="spa-field font-medium"
            />
          </Q>
        </Section>

        {/* Global validation summary alert if errors exist */}
        {Object.keys(errors).length > 0 && (
          <div className="rounded-xl border border-red-500/80 bg-red-500/10 p-4 text-xs font-semibold text-red-700 dark:text-red-300 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Please complete all required fields above</p>
              <p className="mt-0.5 text-red-600/90 dark:text-red-400">
                Sections highlighted in red need your attention before proceeding to the credit verification step.
              </p>
            </div>
          </div>
        )}

        <div className="text-center pt-2">
          <Button
            type="submit"
            className="h-11 rounded-full px-12 text-xs font-bold uppercase tracking-[0.2em] shadow-md hover:bg-espresso cursor-pointer transition-all"
          >
            Next
          </Button>
          <p className="mt-4 text-xs text-muted-foreground font-medium">
            By sending, you agree to our <Link to="/terms" className="underline hover:text-foreground font-bold">Terms of Use</Link> &amp; <Link to="/privacy" className="underline hover:text-foreground font-bold">Privacy Policy</Link>.
          </p>
        </div>
      </form>
    </SpaShell>
  );
}
