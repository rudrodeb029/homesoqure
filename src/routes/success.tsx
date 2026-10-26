import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";
import { ArrowRight, Upload, Check, X, Image as ImageIcon } from "lucide-react";
import { SpaShell } from "@/components/SpaShell";
import { getPropertyById, markSubmissionCompleted, type Property, DEFAULT_PROPERTY } from "@/lib/property-store";

export const Route = createFileRoute("/success")({
  head: () => ({
    meta: [
      { title: "Complete Your Free Credit Score · Homqero" },
      { name: "description", content: "Check your credit score for free and upload a screenshot so the landlord can verify it." },
      { property: "og:title", content: "Complete Your Free Credit Score · Homqero" },
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
  const [property, setProperty] = useState<Property>(DEFAULT_PROPERTY);
  const [fileName, setFileName] = useState("");
  const [fileDataUrl, setFileDataUrl] = useState("");
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (!fileName) {
      fileRef.current?.click();
      return;
    }
    setIsSubmitting(true);
    markSubmissionCompleted(fileName, fileDataUrl);
    navigate({
      to: "/confirmation",
      search: property.id ? { p: property.id } : undefined,
    });
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

        <h1 className="font-serif text-4xl text-foreground">
          Complete your <span className="font-script text-5xl text-primary">free credit score</span>
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Landlords ask for a recent credit score before approving an application. Checking it below is free and will not affect your score.
        </p>

        <ol className="mt-8 space-y-5">
          {steps.map((s, i) => (
            <li key={s} className="flex items-start gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-primary">
                {i + 1}
              </span>
              <p className="pt-1.5 text-sm text-foreground">{s}</p>
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
            <span className="block font-serif text-xl text-accent">Check your credit score — free</span>
            <span className="mt-1 block text-sm text-primary-foreground/80">
              Opens in a new tab · takes about 2 minutes · no impact on your score
            </span>
          </span>
          <ArrowRight className="h-5 w-5 shrink-0 text-accent" />
        </a>

        <div className="mt-4 rounded-lg border border-border bg-card p-5">
          <p className="font-semibold text-foreground">Upload your credit score screenshot</p>
          <p className="mt-1 text-sm text-muted-foreground">
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
                  <span className="font-medium text-foreground truncate">{fileName}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="text-primary hover:underline font-medium cursor-pointer"
                  >
                    Change
                  </button>
                  <span className="text-muted-foreground">·</span>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="text-destructive hover:underline font-medium cursor-pointer"
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
              className="mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-input bg-secondary/50 px-4 py-10 text-center transition hover:border-primary cursor-pointer"
            >
              <Upload className="h-6 w-6 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                {isProcessingFile ? "Processing screenshot..." : (fileName || "Tap to choose a file")}
              </span>
              {!fileName && <span className="text-xs text-muted-foreground">or drag and drop it here</span>}
            </button>
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
            className="h-10 rounded-full bg-primary px-10 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground transition hover:bg-espresso disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
          <p className="mt-4 text-xs text-muted-foreground">
            {fileName
              ? "Screenshot attached. Press Submit to deliver to the landlord."
              : "Choose your screenshot above, then press Submit to send it to the landlord."}
          </p>
        </div>
      </div>
    </SpaShell>
  );
}
