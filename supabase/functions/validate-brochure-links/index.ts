import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Batch size for processing
const BATCH_SIZE = 25;

// Patterns indicating soft 404 or error pages
const SOFT_404_PATTERNS = [
  "page not found",
  "404 error",
  "file not found",
  "resource not found",
  "the page you requested",
  "does not exist",
  "has been removed",
  "no longer available",
  "blobnotfound", // Azure blob storage
  "the specified blob does not exist",
  "resourcenotfound",
];

// User agents for different scenarios
const DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

interface ValidationResult {
  id: string;
  link: string;
  status: "ok" | "broken" | "error" | "redirect" | "restricted";
  error?: string;
}

async function validateLink(id: string, link: string): Promise<ValidationResult> {
  // Check for invalid or empty URLs
  if (!link || link.trim() === "" || link.toLowerCase() === "brochure") {
    return { id, link, status: "broken", error: "Empty or placeholder URL" };
  }

  // Validate URL format
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return { id, link, status: "broken", error: "Invalid URL format" };
  }

  // Only check HTTP/HTTPS URLs
  if (!["http:", "https:"].includes(url.protocol)) {
    return { id, link, status: "broken", error: "Non-HTTP protocol" };
  }

  try {
    // Custom headers for CBRE links
    const isCBRE = url.hostname.includes("cbre");
    const headers: HeadersInit = {
      "User-Agent": DEFAULT_USER_AGENT,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    };
    
    if (isCBRE) {
      headers["Referer"] = "https://www.cbre.com/";
    }

    // Use HEAD first, fall back to GET if needed
    let response: Response;
    try {
      response = await fetch(link, {
        method: "HEAD",
        headers,
        redirect: "follow",
      });
    } catch {
      // Some servers don't support HEAD, try GET
      response = await fetch(link, {
        method: "GET",
        headers,
        redirect: "follow",
      });
    }

    const statusCode = response.status;

    // Success responses
    if (statusCode >= 200 && statusCode < 300) {
      return { id, link, status: "ok" };
    }

    // Redirects that resolved successfully
    if (statusCode >= 300 && statusCode < 400) {
      return { id, link, status: "redirect" };
    }

    // 403 on PDF files - often means the file exists but is access-restricted
    // This is common for protected brochures that work when accessed from the original site
    if (statusCode === 403) {
      const isPDF = link.toLowerCase().endsWith(".pdf") || 
                    response.headers.get("content-type")?.includes("pdf");
      if (isPDF) {
        return { id, link, status: "restricted" };
      }
      return { id, link, status: "broken", error: `HTTP ${statusCode} Forbidden` };
    }

    // 404 or other client errors
    if (statusCode >= 400 && statusCode < 500) {
      return { id, link, status: "broken", error: `HTTP ${statusCode}` };
    }

    // Server errors
    if (statusCode >= 500) {
      return { id, link, status: "error", error: `HTTP ${statusCode}` };
    }

    return { id, link, status: "ok" };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    
    // Check for common network errors
    if (errorMessage.includes("ENOTFOUND") || errorMessage.includes("getaddrinfo")) {
      return { id, link, status: "broken", error: "Domain not found" };
    }
    if (errorMessage.includes("ETIMEDOUT") || errorMessage.includes("timeout")) {
      return { id, link, status: "error", error: "Request timeout" };
    }
    if (errorMessage.includes("ECONNREFUSED")) {
      return { id, link, status: "broken", error: "Connection refused" };
    }
    if (errorMessage.includes("certificate")) {
      return { id, link, status: "error", error: "SSL certificate error" };
    }

    return { id, link, status: "error", error: errorMessage };
  }
}

async function checkForSoft404(link: string): Promise<boolean> {
  try {
    const response = await fetch(link, {
      method: "GET",
      headers: { "User-Agent": DEFAULT_USER_AGENT },
    });

    // Only check HTML responses for soft 404s
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return false;
    }

    const body = await response.text();
    const lowerBody = body.toLowerCase();

    // Check for soft 404 patterns
    for (const pattern of SOFT_404_PATTERNS) {
      if (lowerBody.includes(pattern)) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's org from auth
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's org (use first org if user belongs to multiple)
    const { data: orgMembers } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .limit(1);

    if (!orgMembers || orgMembers.length === 0) {
      return new Response(JSON.stringify({ error: "No org found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgId = orgMembers[0].org_id;

    // Fetch listings with links that haven't been checked recently or never checked
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: listings, error: fetchError } = await supabase
      .from("market_listings")
      .select("id, link")
      .eq("org_id", orgId)
      .not("link", "is", null)
      .neq("link", "")
      .or(`link_last_checked.is.null,link_last_checked.lt.${oneDayAgo}`)
      .limit(BATCH_SIZE);

    if (fetchError) {
      console.error("Error fetching listings:", fetchError);
      return new Response(JSON.stringify({ error: "Failed to fetch listings" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!listings || listings.length === 0) {
      return new Response(JSON.stringify({
        message: "No links to validate",
        checked: 0,
        ok: 0,
        broken: 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[validate-brochure-links] Checking ${listings.length} links...`);

    // Validate all links in parallel
    const results = await Promise.all(
      listings.map(listing => validateLink(listing.id, listing.link!))
    );

    // For "ok" HTML responses, do additional soft 404 check
    const refinedResults = await Promise.all(
      results.map(async (result) => {
        if (result.status === "ok") {
          const isSoft404 = await checkForSoft404(result.link);
          if (isSoft404) {
            return { ...result, status: "broken" as const, error: "Soft 404 detected" };
          }
        }
        return result;
      })
    );

    // Update database
    const now = new Date().toISOString();
    let okCount = 0;
    let brokenCount = 0;
    let errorCount = 0;

    for (const result of refinedResults) {
      // Map status to stored value (restricted counts as ok since file exists)
      let linkStatus: string;
      if (result.status === "ok" || result.status === "restricted" || result.status === "redirect") {
        linkStatus = "ok";
        okCount++;
      } else if (result.status === "broken") {
        linkStatus = "broken";
        brokenCount++;
      } else {
        linkStatus = "error";
        errorCount++;
      }

      const { error: updateError } = await supabase
        .from("market_listings")
        .update({
          link_status: linkStatus,
          link_last_checked: now,
        })
        .eq("id", result.id);

      if (updateError) {
        console.error(`Failed to update listing ${result.id}:`, updateError);
      }
    }

    // Check remaining count
    const { count: remainingCount } = await supabase
      .from("market_listings")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .not("link", "is", null)
      .neq("link", "")
      .or(`link_last_checked.is.null,link_last_checked.lt.${oneDayAgo}`);

    console.log(`[validate-brochure-links] Completed: ${okCount} ok, ${brokenCount} broken, ${errorCount} errors`);

    return new Response(JSON.stringify({
      message: "Link validation complete",
      checked: refinedResults.length,
      ok: okCount,
      broken: brokenCount,
      errors: errorCount,
      remaining: remainingCount || 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Error in validate-brochure-links:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
