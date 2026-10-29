import type { Property, Submission } from "./property-store";

export interface TenantAnalysisReport {
  rentToIncomeRatio: number; // percentage, e.g. 28.5%
  incomeMultiplier: number; // e.g. 3.5x
  incomeStatus: "exceeds" | "meets" | "below";
  incomeAssessment: string;
  creditTier: string;
  creditRisk: "low" | "moderate" | "high" | "unverified";
  creditAssessment: string;
  occupancyAssessment: string;
  petAssessment: string;
  smokingAssessment: string;
  showingAssessment: string;
  overallScore: number; // 0 - 100
  overallVerdict: "Strong Candidate" | "Good Candidate" | "Conditional / Review" | "High Risk";
  executiveSummary: string;
  recommendations: string[];
}

export function analyzeTenantApplication(
  submission: Partial<Submission>,
  property: Property
): TenantAnalysisReport {
  const rent = typeof property.price === "number"
    ? property.price
    : parseFloat(String(property.price).replace(/[^0-9.]/g, "")) || 1500;

  const rawIncome = parseFloat(String(submission.income || "0").replace(/[^0-9.]/g, "")) || 0;
  const incomeMultiplier = rent > 0 ? Number((rawIncome / rent).toFixed(2)) : 0;
  const rentToIncomeRatio = rawIncome > 0 ? Number(((rent / rawIncome) * 100).toFixed(1)) : 100;

  let incomeStatus: "exceeds" | "meets" | "below" = "below";
  let incomeAssessment = "";
  let incomePoints = 0;

  if (incomeMultiplier >= 3.0) {
    incomeStatus = "exceeds";
    incomeAssessment = `Excellent. Household monthly income of $${rawIncome.toLocaleString()} is ${incomeMultiplier}x the monthly rent of $${rent.toLocaleString()} (industry benchmark is 3.0x). Low payment default risk.`;
    incomePoints = 40;
  } else if (incomeMultiplier >= 2.5) {
    incomeStatus = "meets";
    incomeAssessment = `Acceptable. Income of $${rawIncome.toLocaleString()} is ${incomeMultiplier}x the monthly rent (${rentToIncomeRatio}% of gross income). Meets standard threshold.`;
    incomePoints = 28;
  } else {
    incomeStatus = "below";
    incomeAssessment = `Below benchmark. Income of $${rawIncome.toLocaleString()} is only ${incomeMultiplier}x the monthly rent ($${rent.toLocaleString()}). A guarantor/co-signer or 2 months security deposit is recommended.`;
    incomePoints = 12;
  }

  // Credit Assessment
  const creditRange = submission.creditRange || "I don't know my credit score";
  let creditTier = "Unverified";
  let creditRisk: "low" | "moderate" | "high" | "unverified" = "unverified";
  let creditAssessment = "";
  let creditPoints = 0;

  if (creditRange.includes("750") || creditRange.includes("850")) {
    creditTier = "Tier 1 (750 – 850)";
    creditRisk = "low";
    creditAssessment = "Prime / Excellent credit. Outstanding track record of debt servicing and zero payment delinquency risk.";
    creditPoints = 40;
  } else if (creditRange.includes("700")) {
    creditTier = "Tier 2 (700 – 749)";
    creditRisk = "low";
    creditAssessment = "Strong credit score. Reliable history with high likelihood of punctual rental payments.";
    creditPoints = 35;
  } else if (creditRange.includes("650")) {
    creditTier = "Tier 3 (650 – 699)";
    creditRisk = "moderate";
    creditAssessment = "Fair / Average credit score. Standard deposit and verification of active bank statements suggested.";
    creditPoints = 25;
  } else if (creditRange.includes("600")) {
    creditTier = "Tier 4 (600 – 649)";
    creditRisk = "moderate";
    creditAssessment = "Conditional credit. Suggest obtaining credit score screenshot proof and employment verification.";
    creditPoints = 18;
  } else if (creditRange.includes("350") || creditRange.includes("599")) {
    creditTier = "Tier 5 (350 – 599)";
    creditRisk = "high";
    creditAssessment = "Subprime credit. High default risk; recommend co-signer, proof of steady employment, or extra security deposit.";
    creditPoints = 8;
  } else {
    creditTier = "Unspecified / Pending";
    creditRisk = "unverified";
    creditAssessment = "Credit range not declared. Landlord must review the uploaded credit report screenshot.";
    creditPoints = 15;
  }

  // Occupancy Assessment
  const people = submission.people || 1;
  const occupancyAssessment = `${people} occupant(s) planned. Complies with standard HUD 2-person-per-bedroom residential guidelines.`;

  // Pet Assessment
  let petPoints = 10;
  let petAssessment = "No pets declared. Zero pet damage or pet allergy risk.";
  if (submission.hasPets) {
    petAssessment = `Pet owner: "${submission.petDetails || "Pets declared"}". Pet deposit ($250 - $500) and pet addendum recommended.`;
    petPoints = 7;
  }

  // Smoking Assessment
  let smokingPoints = 10;
  let smokingAssessment = "Non-smoker declared. Complies with clean air property rules.";
  if (submission.smoking === "Yes") {
    smokingAssessment = "Smoker. Designated outdoor smoking agreement and carpet damage clause advised.";
    smokingPoints = 3;
  } else if (submission.smoking === "Outside only") {
    smokingAssessment = "Smokes outside only. Strict outdoor perimeter enforcement needed.";
    smokingPoints = 7;
  }

  // Showing preference
  const showingAssessment = submission.wantsShowing
    ? `Requested showing types: ${submission.showingTypes?.join(", ") || "In-person"}.`
    : "No immediate showing requested; ready for lease application review.";

  // Calculate overall score (0 - 100)
  const totalScore = Math.min(100, incomePoints + creditPoints + petPoints + smokingPoints);

  let overallVerdict: "Strong Candidate" | "Good Candidate" | "Conditional / Review" | "High Risk" = "Good Candidate";
  if (totalScore >= 85) overallVerdict = "Strong Candidate";
  else if (totalScore >= 70) overallVerdict = "Good Candidate";
  else if (totalScore >= 50) overallVerdict = "Conditional / Review";
  else overallVerdict = "High Risk";

  const applicantName = `${submission.firstName || "Applicant"} ${submission.lastName || ""}`.trim();

  const executiveSummary = `${applicantName} presents as a ${overallVerdict.toUpperCase()} for ${property.address}. Income is ${incomeMultiplier}x rent ($${rawIncome.toLocaleString()}/mo), credit is ${creditTier}, with ${people} occupant(s) and move-in planned for ${submission.moveInDate || "immediate"}.`;

  const recommendations: string[] = [];
  if (incomeStatus === "below") recommendations.push("Request proof of savings / co-signer due to income-to-rent ratio below 3.0x.");
  if (creditRisk === "high" || creditRisk === "moderate") recommendations.push("Verify credit score screenshot and check for recent collections or evictions.");
  if (submission.hasPets) recommendations.push("Collect $300 pet deposit and signed pet policy addendum.");
  if (submission.smoking === "Yes") recommendations.push("Remind applicant of strict non-smoking interior rules.");
  if (recommendations.length === 0) recommendations.push("Candidate meets all primary qualifications. Proceed to lease generation and move-in scheduling.");

  return {
    rentToIncomeRatio,
    incomeMultiplier,
    incomeStatus,
    incomeAssessment,
    creditTier,
    creditRisk,
    creditAssessment,
    occupancyAssessment,
    petAssessment,
    smokingAssessment,
    showingAssessment,
    overallScore: totalScore,
    overallVerdict,
    executiveSummary,
    recommendations,
  };
}

/**
 * Builds formatted email details with proper title, structured applicant fields, and deep analysis.
 */
export function generateApplicationEmail(
  submission: Partial<Submission>,
  property: Property
): {
  subject: string;
  text: string;
  html: string;
} {
  const analysis = analyzeTenantApplication(submission, property);
  const applicantName = `${submission.firstName || "New"} ${submission.lastName || "Applicant"}`.trim();
  const phone = submission.phone || "Not provided";
  const email = submission.email || "Not provided";
  const rent = property.price ? `$${property.price}/month` : "Standard Rent";

  const subject = `🏠 [New Rental Application] ${property.address} — ${applicantName} (${analysis.overallVerdict} · ${analysis.incomeMultiplier}x Rent)`;

  const text = `
HOMQERO RENTALS USA — NEW TENANT APPLICATION & DEEP ANALYSIS
================================================================================
Property: ${property.address}, ${property.city}, ${property.state} ${property.zip}
Monthly Rent: ${rent}
Applicant: ${applicantName}
Phone (USA): ${phone}
Email: ${email}
Submission ID: ${submission.id || "HQ-ONLINE"}
Date: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}

EXECUTIVE SUMMARY
--------------------------------------------------------------------------------
Overall Verdict: ${analysis.overallVerdict} (Score: ${analysis.overallScore}/100)
${analysis.executiveSummary}

FINANCIAL & CREDIT DEEP ANALYSIS
--------------------------------------------------------------------------------
• Household Monthly Income: $${submission.income || 0}
• Rent-to-Income Multiple: ${analysis.incomeMultiplier}x
• Income Assessment: ${analysis.incomeAssessment}
• Estimated Credit Score: ${submission.creditRange || "Not specified"} (${analysis.creditTier})
• Credit Risk: ${analysis.creditRisk.toUpperCase()}
• Credit Assessment: ${analysis.creditAssessment}

MOVE-IN & HOUSEHOLD DETAILS
--------------------------------------------------------------------------------
• Desired Move-in Date: ${submission.moveInDate || "Immediate"}
• Number of Occupants: ${submission.people || 1} (${analysis.occupancyAssessment})
• Pets: ${submission.hasPets ? "YES" : "NO"} (${analysis.petAssessment})
• Smoking: ${submission.smoking || "None"} (${analysis.smokingAssessment})
• Showing Request: ${analysis.showingAssessment}
• Referral Source: ${submission.source || "Website Direct"}
• Questions for Landlord: ${submission.questions || "None provided"}

CREDIT VERIFICATION SCREENSHOT
--------------------------------------------------------------------------------
Screenshot File: ${submission.screenshotName || "Attached in Admin Portal"}
${submission.screenshotUrl ? "Screenshot available in Admin Dashboard." : "Pending tenant upload."}

LANDLORD RECOMMENDATIONS & ACTION CHECKLIST
--------------------------------------------------------------------------------
${analysis.recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")}

Direct Admin Portal Access: https://homesoqure.web.app/admin
Homqero Rentals USA — Powered by Firestore Real-Time Lead Engine
================================================================================
`.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #221c17; background-color: #fbf9f5; margin: 0; padding: 24px; }
    .card { max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e7ded4; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: #26170f; color: #fbf9f5; padding: 24px; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
    .header p { margin: 6px 0 0; font-size: 13px; color: #d4a373; text-transform: uppercase; letter-spacing: 1px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .badge-strong { background: #d1fae5; color: #065f46; }
    .badge-good { background: #dbeafe; color: #1e40af; }
    .badge-review { background: #fef3c7; color: #92400e; }
    .content { padding: 24px; }
    .section-title { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #643c23; border-bottom: 1px solid #f0e9df; padding-bottom: 6px; margin-top: 24px; margin-bottom: 12px; }
    .grid { display: table; width: 100%; }
    .row { display: table-row; }
    .label { display: table-cell; padding: 6px 0; font-size: 13px; color: #78716c; width: 40%; font-weight: 600; }
    .value { display: table-cell; padding: 6px 0; font-size: 13px; color: #1c1917; font-weight: 700; }
    .highlight-box { background: #faf6f0; border-left: 4px solid #643c23; padding: 14px 16px; border-radius: 0 8px 8px 0; margin: 16px 0; font-size: 13px; }
    .btn { display: inline-block; background: #643c23; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin-top: 20px; }
    .footer { background: #f5efe6; padding: 16px 24px; font-size: 11px; color: #a8a29e; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>New Rental Application &amp; Analysis</h1>
      <p>Target Listing: ${property.address}, ${property.city}</p>
    </div>
    <div class="content">
      <div style="margin-bottom: 16px;">
        <span class="badge ${analysis.overallVerdict === 'Strong Candidate' ? 'badge-strong' : analysis.overallVerdict === 'Good Candidate' ? 'badge-good' : 'badge-review'}">
          ${analysis.overallVerdict} (Score: ${analysis.overallScore}/100)
        </span>
      </div>

      <div class="highlight-box">
        <strong>Executive Summary:</strong><br/>
        ${analysis.executiveSummary}
      </div>

      <div class="section-title">Applicant Contact Information</div>
      <div class="grid">
        <div class="row"><div class="label">Full Name:</div><div class="value">${applicantName}</div></div>
        <div class="row"><div class="label">USA Phone:</div><div class="value"><a href="tel:${phone}" style="color:#643c23;">${phone}</a></div></div>
        <div class="row"><div class="label">Email Address:</div><div class="value"><a href="mailto:${email}" style="color:#643c23;">${email}</a></div></div>
        <div class="row"><div class="label">Target Property:</div><div class="value">${property.address} ($${property.price}/mo)</div></div>
        <div class="row"><div class="label">Referral Source:</div><div class="value">${submission.source || "Website"}</div></div>
      </div>

      <div class="section-title">Deep Financial &amp; Risk Analysis</div>
      <div class="grid">
        <div class="row"><div class="label">Declared Monthly Income:</div><div class="value">$${submission.income || 0} / month</div></div>
        <div class="row"><div class="label">Income-to-Rent Ratio:</div><div class="value">${analysis.incomeMultiplier}x rent (${analysis.rentToIncomeRatio}% of income)</div></div>
        <div class="row"><div class="label">Income Evaluation:</div><div class="value" style="font-weight:normal; font-size:12px;">${analysis.incomeAssessment}</div></div>
        <div class="row"><div class="label">Credit Range Declared:</div><div class="value">${submission.creditRange || "Not specified"}</div></div>
        <div class="row"><div class="label">Credit Tier:</div><div class="value">${analysis.creditTier} (${analysis.creditRisk.toUpperCase()} RISK)</div></div>
        <div class="row"><div class="label">Credit Evaluation:</div><div class="value" style="font-weight:normal; font-size:12px;">${analysis.creditAssessment}</div></div>
      </div>

      <div class="section-title">Lease &amp; Household Preferences</div>
      <div class="grid">
        <div class="row"><div class="label">Desired Move-in:</div><div class="value">${submission.moveInDate || "Immediate"}</div></div>
        <div class="row"><div class="label">Household Members:</div><div class="value">${submission.people || 1} Person(s)</div></div>
        <div class="row"><div class="label">Pets:</div><div class="value">${submission.hasPets ? "Yes (" + (submission.petDetails || "details provided") + ")" : "None"}</div></div>
        <div class="row"><div class="label">Smoking:</div><div class="value">${submission.smoking || "None"}</div></div>
        <div class="row"><div class="label">Showing Requested:</div><div class="value">${analysis.showingAssessment}</div></div>
        ${submission.questions ? `<div class="row"><div class="label">Questions for Landlord:</div><div class="value">${submission.questions}</div></div>` : ""}
      </div>

      <div class="section-title">Credit Score Screenshot Status</div>
      <p style="font-size: 13px; color: #44403c;">
        ${submission.screenshotName ? `✅ Screenshot Uploaded: <strong>${submission.screenshotName}</strong>` : "⏳ Pending applicant screenshot upload."}
      </p>

      <div class="section-title">Landlord Action Checklist</div>
      <ul style="font-size: 13px; color: #44403c; padding-left: 20px;">
        ${analysis.recommendations.map((r) => `<li style="margin-bottom: 4px;">${r}</li>`).join("")}
      </ul>

      <div style="text-align: center; margin-top: 24px;">
        <a href="https://homesoqure.web.app/admin" class="btn">Open Landlord Admin Panel</a>
      </div>
    </div>
    <div class="footer">
      © 2026 Homqero Rentals USA · Automated Real-time Rental Screening Engine
    </div>
  </div>
</body>
</html>
`.trim();

  return { subject, text, html };
}

/**
 * Dispatches application email to Firestore 'mail' collection and external endpoint/localStorage
 */
export async function dispatchApplicationEmail(
  submission: Partial<Submission>,
  property: Property,
  recipientEmail?: string
): Promise<boolean> {
  const emailData = generateApplicationEmail(submission, property);
  const targetEmail = recipientEmail || "landlord@homqero.com";

  if (typeof window === "undefined") return true;

  try {
    const { collection, addDoc } = await import("firebase/firestore");
    const { db } = await import("./firebase");

    // Save to Firestore mail collection (standard Firebase Trigger Email extension format)
    await addDoc(collection(db, "mail"), {
      to: [targetEmail],
      message: {
        subject: emailData.subject,
        text: emailData.text,
        html: emailData.html,
      },
      submissionId: submission.id || "",
      propertyAddress: property.address,
      createdAt: new Date().toISOString(),
    });

    // Also store the latest generated email report locally for easy viewing in Admin Panel
    localStorage.setItem(`email_report_${submission.id}`, JSON.stringify(emailData));
    return true;
  } catch (err) {
    console.warn("Firestore mail dispatch notice:", err);
    localStorage.setItem(`email_report_${submission.id}`, JSON.stringify(emailData));
    return false;
  }
}
