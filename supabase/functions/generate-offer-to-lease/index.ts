import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import PizZip from "https://esm.sh/pizzip@3.1.4";
import Docxtemplater from "https://esm.sh/docxtemplater@3.44.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── STATIC TEXT CONSTANTS ────────────────────────────────────────────────────

const AGENCY_DISCLOSURE_TENANT = (agentName: string) =>
  `The Tenant and the Landlord acknowledge that ${agentName} ("Agent") of the Brokerage has disclosed that the Agent is representing the sole interest of the Tenant as the Tenant's Agent.`;

const AGENCY_DISCLOSURE_LANDLORD = (agentName: string) =>
  `The Tenant and the Landlord acknowledge that ${agentName} ("Agent") of the Brokerage has disclosed that the Agent is representing the sole interest of the Landlord as the Landlord's Agent.`;

const EARLY_OCC_NO_DATE = `prior to the Commencement Date`;

const BUSINESS_OPERATION_EXCLUSIVE = `The Tenant shall be permitted to operate business during this period.`;

const FREE_RENT_HEADER = `FREE BASIC RENT`;

const FREE_RENT_CLAUSE = (numMonths: string, startMonth: string, startYear: string) =>
  `The Landlord will grant the Tenant the first ${numMonths} month(s) of the lease term, wherein the Tenant shall not pay to the Landlord the monthly Basic Rent amount for this period.\nThe Tenant will be responsible for paying to the Landlord during this period the monthly amount of Additional Rent plus GST. Payment of monthly Basic Rent to the Landlord will begin on the first day of ${startMonth} ${startYear}.`;

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-CA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function parseAmount(str: string): number {
  return parseFloat((str || "0").replace(/[^0-9.]/g, "")) || 0;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const input = await req.json();
    const {
      llCorporateName, llBrokerageName, llAgentName,
      llAgentPhone, llAgentEmail, llBrokerageAddress,
      tenantCorporateName, tenantBrokerageName, tenantAgentName,
      tenantAgentPhone, tenantAgentEmail, tenantBrokerageAddress,
      cvAgentName, cvAgentPhone, cvAgentEmail,
      agencyLLorTenant,
      premisesAddress, premisesCity, premisesSF,
      termLength, commencementDate, expiryDate,
      earlyOccupancyDate, earlyOccType,
      year1BasicRent, year2BasicRent, year3BasicRent, year4BasicRent,
      year5BasicRent, year6BasicRent, year7BasicRent, year8BasicRent,
      year9BasicRent, year10BasicRent,
      basicRentStartMonth, basicRentStartYear,
      additionalRentBudgetYear, additionalRentCostPerFoot,
      freeBasicRent, numMonthsFree,
      useOfPremises, municipalityForPermitting,
      depositBrokerage, depositSection,
      optionToRenewLength, parkingComment,
      tenantConditionTimeline, landlordConditionTimeline,
      offerMonth, offerYear, acceptanceDeadline, acceptanceForWho,
      orgId, userId,
    } = input;

    // ── Agency Disclosure
    const agencyDisclosure = agencyLLorTenant === "Tenant"
      ? AGENCY_DISCLOSURE_TENANT(cvAgentName)
      : AGENCY_DISCLOSURE_LANDLORD(cvAgentName);

    // ── Early Occupancy
    const earlyOccupancyText = !earlyOccupancyDate || earlyOccupancyDate.trim() === ""
      ? EARLY_OCC_NO_DATE
      : `no later than ${earlyOccupancyDate}`;

    const businessOperation = earlyOccType === "exclusive"
      ? BUSINESS_OPERATION_EXCLUSIVE
      : "";

    // ── Size
    const size = parseAmount(premisesSF);

    // ── Rent Table
    const rentRates = [
      year1BasicRent, year2BasicRent, year3BasicRent, year4BasicRent,
      year5BasicRent, year6BasicRent, year7BasicRent, year8BasicRent,
      year9BasicRent, year10BasicRent,
    ];

    const rentRows = rentRates
      .map((rateStr: string, i: number) => {
        if (!rateStr || rateStr.trim() === "") return null;
        const rate = parseAmount(rateStr);
        const annual = rate * size;
        const monthly = annual / 12;
        return {
          year: `Year ${i + 1}`,
          rate: formatCurrency(rate),
          annual: formatCurrency(annual),
          monthly: formatCurrency(monthly),
        };
      })
      .filter(Boolean);

    // ── Additional Rent
    const additionalRentRate = parseAmount(additionalRentCostPerFoot);
    const additionalRentTotalPerMonth = (additionalRentRate * size) / 12;

    // ── Free Rent
    let freeBasicRentHeader = "";
    let freeBasicRentParagraph = "";
    if (freeBasicRent === "Yes") {
      freeBasicRentHeader = FREE_RENT_HEADER;
      freeBasicRentParagraph = FREE_RENT_CLAUSE(numMonthsFree, basicRentStartMonth, basicRentStartYear);
    }

    // ── Deposit Calculations
    const GST = 0.05;
    const year1Rate = parseAmount(year1BasicRent);
    const firstMonthBasic = (year1Rate * size) / 12;
    const firstMonthBasicGST = firstMonthBasic * GST;
    const opRent = additionalRentTotalPerMonth;
    const opGST = opRent * GST;
    const totalDueOnSigning = firstMonthBasic + firstMonthBasicGST + opRent + opGST;

    let lastYearRate = 0;
    for (let i = rentRates.length - 1; i >= 0; i--) {
      if (rentRates[i] && rentRates[i].trim() !== "") {
        lastYearRate = parseAmount(rentRates[i]);
        break;
      }
    }
    const lastMonthBasic = (lastYearRate * size) / 12;
    const depositSubtotal = lastMonthBasic + opRent;
    const depositGST = depositSubtotal * GST;
    const securityDeposit = depositSubtotal + depositGST;
    const totalDeposit = securityDeposit + totalDueOnSigning;

    // ── Template Data — keys must match {FieldName} in the .docx template exactly
    const templateData = {
      "LL Corporate Name": llCorporateName,
      "LL Brokerage Name": llBrokerageName,
      "LL Agent Name": llAgentName,
      "LL Agent Phone": llAgentPhone,
      "LL Agent Email": llAgentEmail,
      "LL Brokerage Address": llBrokerageAddress,
      "Tenant Corporate Name": tenantCorporateName,
      "Tenant Brokerage Name": tenantBrokerageName,
      "Tenant Agent Name": tenantAgentName,
      "Tenant Agent Phone": tenantAgentPhone,
      "Tenant Agent Email": tenantAgentEmail,
      "Tenant Brokerage Address": tenantBrokerageAddress,
      "CV Agent Name": cvAgentName,
      "CV Agent Phone": cvAgentPhone,
      "CV Agent Email": cvAgentEmail,
      AgencyDisclosure: agencyDisclosure,
      "Premises Address": premisesAddress,
      "Premises City": premisesCity,
      "Premises SF": premisesSF,
      "Term Length": termLength,
      "Commencement Date": commencementDate,
      "Expiry Date": expiryDate,
      "Early Occupancy Date": earlyOccupancyText,
      EarlyOccType: earlyOccType,
      businessOperation: businessOperation,
      rentRows: rentRows,
      "Basic Rent Start Month": basicRentStartMonth,
      "Basic Rent Start Year": basicRentStartYear,
      "Additional Rent Budget Year": additionalRentBudgetYear,
      "Additional Rent Cost Per Foot": `$${additionalRentRate.toFixed(2)}`,
      "Additional Rent Total Per Month": formatCurrency(additionalRentTotalPerMonth),
      "FREE BASIC RENT HEADER": freeBasicRentHeader,
      "Free Basic Rent Paragraph": freeBasicRentParagraph,
      "Use of Premises": useOfPremises,
      "Municipality for Permitting": municipalityForPermitting,
      "Deposit Brokerage": depositBrokerage,
      depositSection: depositSection,
      FirstMonthBasicRent: formatCurrency(firstMonthBasic),
      GSTonBasicRent: formatCurrency(firstMonthBasicGST),
      FirstMonthOpRent: formatCurrency(opRent),
      GSTonOpRent: formatCurrency(opGST),
      TotalDueOnSigning: formatCurrency(totalDueOnSigning),
      SecurityDeposit: formatCurrency(securityDeposit),
      TotalDepositIncludingAbove: formatCurrency(totalDeposit),
      "Option to Renew Length": optionToRenewLength,
      ParkingComment: parkingComment,
      "Tenant Condition Timeline": tenantConditionTimeline,
      "Landlord Condition Timeline": landlordConditionTimeline,
      "Offer Month": offerMonth,
      "Offer Year": offerYear,
      acceptanceDeadline: acceptanceDeadline,
      acceptanceForWho: acceptanceForWho,
    };

    // ── Fetch template from Supabase Storage
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: templateBlob, error: templateError } = await supabaseAdmin.storage
      .from("offer-templates")
      .download("offer-to-lease.docx");

    if (templateError || !templateBlob) {
      throw new Error(`Failed to fetch template: ${templateError?.message}`);
    }

    // ── Fill template
    const templateBuffer = await templateBlob.arrayBuffer();
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });
    doc.setData(templateData);
    doc.render();

    const docxBuffer = doc.getZip().generate({ type: "uint8array" });

    // ── Save .docx to storage
    const timestamp = Date.now();
    const tenantSlug = (tenantCorporateName || "Tenant")
      .replace(/[^a-zA-Z0-9]/g, "_")
      .substring(0, 30);
    const filename = `OTL_${tenantSlug}_${timestamp}`;
    const docxPath = `${orgId}/${filename}.docx`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("offer-documents")
      .upload(docxPath, docxBuffer, {
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    // ── Generate signed download URL
    const { data: signedData } = await supabaseAdmin.storage
      .from("offer-documents")
      .createSignedUrl(docxPath, 3600);

    // ── Save record to offer_documents
    const { data: record, error: insertError } = await supabaseAdmin
      .from("offer_documents")
      .insert({
        user_id: userId,
        org_id: orgId,
        document_type: "offer_to_lease",
        tenant_name: tenantCorporateName,
        premises_address: premisesAddress,
        premises_city: premisesCity,
        docx_path: docxPath,
        form_data: input,
      })
      .select()
      .single();

    if (insertError) throw new Error(`DB insert failed: ${insertError.message}`);

    return new Response(
      JSON.stringify({
        success: true,
        id: record.id,
        docxUrl: signedData?.signedUrl,
        docxPath,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-offer-to-lease error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
