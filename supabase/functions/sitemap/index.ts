import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface SitemapURL {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

const SITE_URL = 'https://www.musicalumina.com';

// Static routes that should always be in the sitemap
const staticRoutes: SitemapURL[] = [
  { loc: '/', priority: '1.0', changefreq: 'daily' },
  { loc: '/about', priority: '0.8', changefreq: 'weekly' },
  { loc: '/contact', priority: '0.7', changefreq: 'monthly' },
  { loc: '/events', priority: '0.9', changefreq: 'daily' },
];

function generateSitemapXML(urls: SitemapURL[]): string {
  const xmlUrls = urls.map(url => `
    <url>
      <loc>${url.loc}</loc>
      ${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ''}
      ${url.changefreq ? `<changefreq>${url.changefreq}</changefreq>` : ''}
      ${url.priority ? `<priority>${url.priority}</priority>` : ''}
    </url>
  `).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${xmlUrls}
</urlset>`;
}

serve(async (_req) => {
  try {
    // Initialize Supabase client with service role key for public access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      // Use service role key to bypass RLS
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { 
        auth: { persistSession: false },
        // No authentication required for public access
        global: { headers: {} }
      }
    );

    // Fetch events and their categories/subcategories
    const { data: events, error: eventsError } = await supabaseClient
      .from('events')
      .select(`
        id,
        updated_at,
        event_categories (
          id,
          event_subcategories (
            id,
            updated_at
          )
        )
      `)
      .order('updated_at', { ascending: false });

    if (eventsError) {
      throw new Error('Failed to fetch events data');
    }

    // Generate dynamic URLs
    const dynamicUrls: SitemapURL[] = [];

    // Add event URLs
    events?.forEach(event => {
      // Main event page
      dynamicUrls.push({
        loc: `${SITE_URL}/events/${event.id}`,
        lastmod: new Date(event.updated_at).toISOString(),
        changefreq: 'daily',
        priority: '0.9'
      });

      // Event registration page
      dynamicUrls.push({
        loc: `${SITE_URL}/events/${event.id}/register`,
        lastmod: new Date(event.updated_at).toISOString(),
        changefreq: 'daily',
        priority: '0.8'
      });

      // Categories and subcategories
      event.event_categories?.forEach(category => {
        category.event_subcategories?.forEach(subcategory => {
          dynamicUrls.push({
            loc: `${SITE_URL}/events/${event.id}/categories/${subcategory.id}`,
            lastmod: new Date(subcategory.updated_at).toISOString(),
            changefreq: 'weekly',
            priority: '0.7'
          });
        });
      });
    });

    // Combine static and dynamic routes
    const allUrls = [...staticRoutes, ...dynamicUrls];
    
    // Generate XML
    const xml = generateSitemapXML(allUrls);

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml',
        // Cache for 1 hour since event data changes frequently
        'Cache-Control': 'public, max-age=3600',
        // Allow CDN caching
        'CDN-Cache-Control': 'public, max-age=3600, stale-while-revalidate=600',
        // Allow CORS for public access
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      }
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return new Response('Error generating sitemap', { status: 500 });
  }
}); 