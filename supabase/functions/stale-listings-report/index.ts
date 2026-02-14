import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate 30-day threshold
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thresholdDate = thirtyDaysAgo.toISOString().split("T")[0];

    // Get stale listings: last_verified_date older than 30 days OR null, and status is Active
    const { data: staleListings, error: listingsError } = await supabase
      .from("market_listings")
      .select("id, address, city, submarket, last_verified_date, broker_source, status")
      .eq("status", "Active")
      .or(`last_verified_date.is.null,last_verified_date.lt.${thresholdDate}`)
      .order("last_verified_date", { ascending: true, nullsFirst: true });

    if (listingsError) {
      throw new Error(`Failed to fetch listings: ${listingsError.message}`);
    }

    const staleCount = staleListings?.length || 0;

    if (staleCount === 0) {
      console.log("No stale listings found. Skipping email.");
      return new Response(
        JSON.stringify({ message: "No stale listings", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get admin user emails
    const { data: adminRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (rolesError) {
      throw new Error(`Failed to fetch admin roles: ${rolesError.message}`);
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.log("No admins found. Skipping email.");
      return new Response(
        JSON.stringify({ message: "No admins found", count: staleCount }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminIds = adminRoles.map((r) => r.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("email")
      .in("id", adminIds);

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    const adminEmails = profiles
      ?.map((p) => p.email)
      .filter((e): e is string => !!e);

    if (!adminEmails || adminEmails.length === 0) {
      console.log("No admin emails found. Skipping.");
      return new Response(
        JSON.stringify({ message: "No admin emails", count: staleCount }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build email HTML
    const neverVerified = staleListings!.filter((l) => !l.last_verified_date);
    const outdated = staleListings!.filter((l) => l.last_verified_date);

    let tableRows = "";
    for (const listing of staleListings!.slice(0, 50)) {
      const verifiedDate = listing.last_verified_date || "Never";
      const daysSince = listing.last_verified_date
        ? Math.floor(
            (Date.now() - new Date(listing.last_verified_date).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : "N/A";
      tableRows += `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${listing.address}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${listing.city || "-"}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${listing.submarket || "-"}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${listing.broker_source || "-"}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${verifiedDate}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${daysSince}</td>
        </tr>`;
    }

    const truncatedNote =
      staleCount > 50
        ? `<p style="color:#6b7280;font-size:14px;">Showing first 50 of ${staleCount} stale listings.</p>`
        : "";

    const emailHtml = `
      <div style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;">
        <h2 style="color:#1f2937;">📋 Daily Stale Listings Report</h2>
        <p style="color:#374151;font-size:16px;">
          You have <strong>${staleCount}</strong> active listing${staleCount === 1 ? "" : "s"} 
          that haven't been verified in over 30 days.
        </p>
        <div style="display:flex;gap:16px;margin:16px 0;">
          <div style="background:#fef3c7;padding:12px 20px;border-radius:8px;">
            <strong style="font-size:24px;color:#92400e;">${outdated.length}</strong>
            <div style="font-size:13px;color:#92400e;">Outdated (30+ days)</div>
          </div>
          <div style="background:#fee2e2;padding:12px 20px;border-radius:8px;">
            <strong style="font-size:24px;color:#991b1b;">${neverVerified.length}</strong>
            <div style="font-size:13px;color:#991b1b;">Never Verified</div>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:16px;">
          <thead>
            <tr style="background:#f3f4f6;">
              <th style="padding:8px 12px;text-align:left;">Address</th>
              <th style="padding:8px 12px;text-align:left;">City</th>
              <th style="padding:8px 12px;text-align:left;">Submarket</th>
              <th style="padding:8px 12px;text-align:left;">Broker</th>
              <th style="padding:8px 12px;text-align:left;">Last Verified</th>
              <th style="padding:8px 12px;text-align:left;">Days Stale</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        ${truncatedNote}
        <p style="color:#6b7280;font-size:12px;margin-top:24px;">
          This is an automated daily report from ClearView.
        </p>
      </div>
    `;

    // Send via Resend
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ClearView <onboarding@resend.dev>",
        to: adminEmails,
        subject: `📋 ${staleCount} Stale Listing${staleCount === 1 ? "" : "s"} — Daily Report`,
        html: emailHtml,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      throw new Error(
        `Resend API error [${resendRes.status}]: ${JSON.stringify(resendData)}`
      );
    }

    console.log(`Stale listings report sent to ${adminEmails.length} admin(s). ${staleCount} stale listings.`);

    return new Response(
      JSON.stringify({
        success: true,
        staleCount,
        emailsSent: adminEmails.length,
        resendId: resendData.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in stale-listings-report:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
