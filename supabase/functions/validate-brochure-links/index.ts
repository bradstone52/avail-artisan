import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Process all links, but in parallel batches to avoid overwhelming servers
const CONCURRENT_BATCH_SIZE = 10;

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

    // Parse request body to check for force flag
    let forceRecheck = true; // Default to always re-check
    try {
      const body = await req.json();
      if (typeof body.force === "boolean") {
        forceRecheck = body.force;
      }
    } catch {
      // No body or invalid JSON, use default
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

    // Build query - either all links (force) or only unchecked/stale links
    let query = supabase
      .from("market_listings")
      .select("id, link")
      .eq("org_id", orgId)
      .not("link", "is", null)
      .neq("link", "");
    
    if (!forceRecheck) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      query = query.or(`link_last_checked.is.null,link_last_checked.lt.${oneDayAgo}`);
    }

    const { data: listings, error: fetchError } = await query;

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
        total: 0,
        ok: 0,
        broken: 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();

    // Run validation asynchronously so the HTTP request returns quickly
    // (prevents the browser from hanging / timing out while we process hundreds of links)
    const runValidation = async () => {
      console.log(`[validate-brochure-links] Checking ${listings.length} links...`);

      let okCount = 0;
      let brokenCount = 0;
      let errorCount = 0;
      let checkedCount = 0;

      // Process in concurrent batches and update DB after each batch for live progress
      for (let i = 0; i < listings.length; i += CONCURRENT_BATCH_SIZE) {
        const batch = listings.slice(i, i + CONCURRENT_BATCH_SIZE);

        // Validate batch
        const batchResults = await Promise.all(
          batch.map((listing) => validateLink(listing.id, listing.link!))
        );

        // Refine with soft 404 check
        const refinedBatch = await Promise.all(
          batchResults.map(async (result) => {
            if (result.status === "ok") {
              const isSoft404 = await checkForSoft404(result.link);
              if (isSoft404) {
                return { ...result, status: "broken" as const, error: "Soft 404 detected" };
              }
            }
            return result;
          })
        );

        // Update database immediately for each result (enables live realtime updates)
        for (const result of refinedBatch) {
          let linkStatus: string;
          if (result.status === "ok" || result.status === "redirect") {
            linkStatus = "ok";
            okCount++;
          } else if (result.status === "restricted") {
            linkStatus = "restricted";
            okCount++; // Count as "ok" for summary but track separately
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

          checkedCount++;
        }

        console.log(`[validate-brochure-links] Progress: ${checkedCount}/${listings.length}`);
      }

      console.log(`[validate-brochure-links] Completed: ${okCount} ok, ${brokenCount} broken, ${errorCount} errors`);
    };

    // EdgeRuntime.waitUntil keeps the work alive after we return the response
    try {
      // @ts-ignore - EdgeRuntime is available in the runtime but not typed here
      if (typeof EdgeRuntime !== "undefined" && typeof EdgeRuntime.waitUntil === "function") {
        // @ts-ignore
        EdgeRuntime.waitUntil(runValidation());
      } else {
        // Fallback (may still work, but request could be cut short by platform timeouts)
        runValidation();
      }
    } catch (e) {
      console.error("Failed to schedule background validation:", e);
      runValidation();
    }

    return new Response(
      JSON.stringify({
        message: "Link validation started",
        total: listings.length,
        run_started_at: now,
        force: forceRecheck,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (err) {
    console.error("Error in validate-brochure-links:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
