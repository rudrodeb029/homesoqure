import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";
import { ArrowRight, Upload, Check, X, AlertCircle } from "@/lib/lucide-react";
import { SpaShell } from "@/components/SpaShell";
import {
  getPropertyById,
  markSubmissionCompleted,
  getLatestSubmission,
  type Property,
  type Submission,
  DEFAULT_PROPERTY,
} from "@/lib/property-store";
import { dispatchApplicationEmail, openApplicationEmailClient } from "@/lib/deep-analysis";

export const Route = createFileRoute("/success")({
  head: () => ({
    meta: [
      { title: "Complete Your Free Credit Score · Homqero Rentals USA" },
      { name: "description", content: "Check your credit score for free and upload a screenshot so the landlord can verify it." },
      { property: "og:title", content: "Complete Your Free Credit Score · Homqero Rentals USA" },
      { property: "og:description", content: "Free credit score check for your rental application — no impact on your score." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Success,
});

const steps = [
  "Open the free credit check below and sign up or sign in.",
  "Once your score appears, take a screenshot of that page.",
  "Upload the screenshot here so the landlord can verify your score.",
];

function compressImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1200;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
          resolve(dataUrl);
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function Success() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadContainerRef = useRef<HTMLDivElement>(null);
  const [property, setProperty] = useState<Property>(DEFAULT_PROPERTY);
  const [fileName, setFileName] = useState("");
  const [fileDataUrl, setFileDataUrl] = useState("");
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const propId = params.get("p") || params.get("property");
      setProperty(getPropertyById(propId));
    }
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setUploadError("");
    setIsProcessingFile(true);
    try {
      const compressedUrl = await compressImage(file);
      setFileDataUrl(compressedUrl);
    } catch {
      // fallback to basic reader
      const reader = new FileReader();
      reader.onload = () => setFileDataUrl(reader.result as string);
      reader.readAsDataURL(file);
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleRemoveFile = () => {
    setFileName("");
    setFileDataUrl("");
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  };

  const handleSubmit = () => {
    if (!fileName || !fileDataUrl) {
      setUploadError("Please upload your credit score screenshot to complete your application.");
      uploadContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsSubmitting(true);
    markSubmissionCompleted(fileName, fileDataUrl);

    // Prepare complete application submission
    const active = getLatestSubmission();
    const completedSubmission: Submission = active
      ? {
          ...active,
          status: "completed",
          screenshotName: fileName,
          screenshotUrl: fileDataUrl,
        }
      : {
          id: `HQ-${Date.now().toString().slice(-6)}`,
          propertyId: property.id,
          propertyAddress: property.address,
          status: "completed",
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          income: "",
          creditRange: "",
          moveInDate: "",
          people: 1,
          hasPets: false,
          smoking: "No",
          wantsShowing: false,
          source: "Direct",
          screenshotName: fileName,
          screenshotUrl: fileDataUrl,
          submittedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        };

    // 1. Dispatch final completed application email to Firestore mail queue & local analysis
    dispatchApplicationEmail(completedSubmission, property);

    // 2. Open user's email client with title and all applicant information formatted
    openApplicationEmailClient(completedSubmission, property);

    // 3. Keep other all same: navigate smoothly to confirmation page
    setTimeout(() => {
      navigate({
        to: "/confirmation",
        search: property.id ? { p: property.id } : undefined,
      });
    }, 350);
  };

  return (
    <SpaShell>
      <div className="mx-auto max-w-[520px]">
        {/* Selected Property Header Tag */}
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/80 px-3 py-1 text-xs text-muted-foreground">
          <span>Applying for:</span>
          <strong className="text-foreground">{property.address}, {property.city}</strong>
          <span>(${property.price}/mo)</span>
        </div>

        <h1 className="font-serif text-4xl font-bold text-foreground">
          Complete your free credit score
        </h1>
        <p className="mt-3 text-sm text-muted-foreground font-medium">
          Landlords ask for a recent credit score before approving an application. Checking it below is free and will not affect your score.
        </p>

        <ol className="mt-8 space-y-5">
          {steps.map((s, i) => (
            <li key={s} className="flex items-start gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-primary">
                {i + 1}
              </span>
              <p className="pt-1.5 text-sm font-medium text-foreground">{s}</p>
            </li>
          ))}
        </ol>

        <a
          href={property.creditCheckUrl || "#"}
          target={property.creditCheckUrl && property.creditCheckUrl !== "#" ? "_blank" : undefined}
          rel="noopener noreferrer"
          className="mt-8 flex items-center justify-between gap-4 rounded-lg bg-espresso p-5 text-primary-foreground transition hover:opacity-95"
        >
          <span>
            <span className="block font-serif text-xl font-bold text-accent">Check your credit score — free</span>
            <span className="mt-1 block text-sm text-primary-foreground/80 font-medium">
              Opens in a new tab · takes about 2 minutes · no impact on your score
            </span>
          </span>
          <ArrowRight className="h-5 w-5 shrink-0 text-accent" />
        </a>

        {/* Screenshot Upload Container */}
        <div
          ref={uploadContainerRef}
          className={`mt-4 rounded-lg border p-5 transition-all scroll-mt-24 ${
            uploadError
              ? "border-red-500 bg-red-500/5 ring-2 ring-red-500/20"
              : "border-border bg-card"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="font-bold text-foreground">
              Upload your credit score screenshot <span className="text-red-600 dark:text-red-400">*</span>
            </p>
          </div>
          <p className="mt-1 text-sm text-muted-foreground font-medium">
            PNG, JPG or PDF · one clear, full-page screenshot taken today is enough
          </p>

          {fileDataUrl ? (
            <div className="mt-4 rounded-lg border border-border bg-secondary/30 overflow-hidden">
              <div className="max-h-56 overflow-hidden bg-black/5 flex items-center justify-center p-2">
                <img
                  src={fileDataUrl}
                  alt="Credit score screenshot"
                  className="max-h-52 w-auto object-contain rounded shadow-xs"
                />
              </div>
              <div className="p-3 border-t border-border flex items-center justify-between bg-card text-xs">
                <div className="flex items-center gap-2 truncate pr-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="font-bold text-foreground truncate">{fileName}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="text-primary hover:underline font-bold cursor-pointer"
                  >
                    Change
                  </button>
                  <span className="text-muted-foreground">·</span>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="text-red-600 hover:underline font-bold cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={isProcessingFile}
              onClick={() => fileRef.current?.click()}
              className={`mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-10 text-center transition cursor-pointer ${
                uploadError
                  ? "border-red-500 bg-red-500/10 text-red-700"
                  : "border-input bg-secondary/50 hover:border-primary"
              }`}
            >
              <Upload className={`h-6 w-6 ${uploadError ? "text-red-600" : "text-primary"}`} />
              <span className="text-sm font-bold text-foreground">
                {isProcessingFile ? "Processing screenshot..." : (fileName || "Tap to choose a file")}
              </span>
              {!fileName && <span className="text-xs text-muted-foreground font-medium">or drag and drop it here</span>}
            </button>
          )}

          {uploadError && (
            <p className="mt-3 text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{uploadError}</span>
            </p>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <div className="mt-8 text-center">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="h-11 rounded-full bg-primary px-12 text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground shadow-md transition hover:bg-espresso disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? "Submitting..." : "Submit Application"}
          </button>
          <p className="mt-4 text-xs text-muted-foreground font-medium">
            {fileName
              ? "Screenshot attached. Press Submit Application to deliver to the landlord."
              : "Attach your screenshot above, then press Submit Application to send it to the landlord."}
          </p>
        </div>
      </div>
    </SpaShell>
  );
}
