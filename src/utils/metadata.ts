// URL metadata extraction utilities

export interface UrlMetadata {
  title?: string;
  authors?: string;
  description?: string;
  siteName?: string;
  type?: 'article' | 'book' | 'video' | 'podcast' | 'website' | 'document' | 'other';
  publishedDate?: string;
  image?: string;
  url: string;
}

/**
 * Fetch metadata from a URL using a free metadata API
 * Falls back to URL pattern detection if API fails
 */
export async function fetchUrlMetadata(url: string): Promise<UrlMetadata> {
  try {
    // Try using a free metadata extraction API
    // jsonlink.io is a free service for extracting Open Graph data
    const apiUrl = `https://jsonlink.io/api/extract?url=${encodeURIComponent(url)}`;
    
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error('API request failed');
    
    const data = await response.json();
    
    return {
      title: data.title || undefined,
      authors: data.author || undefined,
      description: data.description || undefined,
      siteName: data.publisher || data.domain || undefined,
      type: detectTypeFromUrl(url, data),
      publishedDate: data.date || undefined,
      image: data.images?.[0] || undefined,
      url,
    };
  } catch {
    // Fallback to URL pattern detection if the metadata API fails or is blocked by CORS.
    return extractMetadataFromUrl(url);
  }
}

/**
 * Extract metadata from URL patterns when API is unavailable
 */
function extractMetadataFromUrl(url: string): UrlMetadata {
  const urlObj = new URL(url);
  const hostname = urlObj.hostname.replace('www.', '');
  const pathname = urlObj.pathname;
  
  const metadata: UrlMetadata = {
    url,
    siteName: formatSiteName(hostname),
    type: detectTypeFromUrl(url),
  };
  
  // Try to extract title from URL path
  const pathParts = pathname.split('/').filter(p => p && !p.match(/^\d+$/));
  if (pathParts.length > 0) {
    const lastPart = pathParts[pathParts.length - 1];
    // Convert slug to title
    metadata.title = lastPart
      .replace(/[-_]/g, ' ')
      .replace(/\.(html?|php|aspx?)$/i, '')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  return metadata;
}

/**
 * Detect content type from URL patterns
 */
function detectTypeFromUrl(url: string, apiData?: Record<string, unknown>): UrlMetadata['type'] {
  const urlLower = url.toLowerCase();
  
  // Video platforms
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be') || 
      urlLower.includes('vimeo.com') || urlLower.includes('ted.com')) {
    return 'video';
  }
  
  // Podcast platforms
  if (urlLower.includes('spotify.com/episode') || urlLower.includes('podcasts.apple.com') ||
      urlLower.includes('anchor.fm') || urlLower.includes('soundcloud.com')) {
    return 'podcast';
  }
  
  // Academic/Article sources
  if (urlLower.includes('doi.org') || urlLower.includes('jstor.org') ||
      urlLower.includes('scholar.google') || urlLower.includes('eric.ed.gov') ||
      urlLower.includes('pubmed') || urlLower.includes('arxiv.org') ||
      urlLower.includes('researchgate.net') || urlLower.includes('academia.edu')) {
    return 'article';
  }
  
  // Document types
  if (urlLower.endsWith('.pdf') || urlLower.endsWith('.doc') || urlLower.endsWith('.docx')) {
    return 'document';
  }
  
  // Check API data for type hints
  if (apiData) {
    const ogType = (apiData.type as string)?.toLowerCase();
    if (ogType?.includes('video')) return 'video';
    if (ogType?.includes('article')) return 'article';
    if (ogType?.includes('book')) return 'book';
  }
  
  return 'website';
}

/**
 * Format hostname into readable site name
 */
function formatSiteName(hostname: string): string {
  // Known site mappings
  const siteNames: Record<string, string> = {
    'youtube.com': 'YouTube',
    'youtu.be': 'YouTube',
    'vimeo.com': 'Vimeo',
    'ted.com': 'TED',
    'jstor.org': 'JSTOR',
    'eric.ed.gov': 'ERIC',
    'scholar.google.com': 'Google Scholar',
    'edutopia.org': 'Edutopia',
    'edsurge.com': 'EdSurge',
    'medium.com': 'Medium',
    'substack.com': 'Substack',
    'nytimes.com': 'The New York Times',
    'washingtonpost.com': 'The Washington Post',
    'theguardian.com': 'The Guardian',
    'bbc.com': 'BBC',
    'npr.org': 'NPR',
    'chronicle.com': 'The Chronicle of Higher Education',
    'insidehighered.com': 'Inside Higher Ed',
    'educationweek.org': 'Education Week',
    'kqed.org': 'KQED',
    'pbs.org': 'PBS',
    'harvard.edu': 'Harvard University',
    'mit.edu': 'MIT',
    'stanford.edu': 'Stanford University',
  };
  
  // Check for known sites
  for (const [domain, name] of Object.entries(siteNames)) {
    if (hostname.includes(domain)) return name;
  }
  
  // Format unknown domains
  const parts = hostname.split('.');
  const mainPart = parts.length > 2 ? parts[parts.length - 2] : parts[0];
  return mainPart.charAt(0).toUpperCase() + mainPart.slice(1);
}

/**
 * Extract DOI from URL if present
 */
export function extractDoi(url: string): string | undefined {
  // DOI patterns
  const doiPatterns = [
    /doi\.org\/(.+)$/i,
    /doi[=:](.+?)(?:&|$)/i,
    /(10\.\d{4,}\/[^\s&]+)/i,
  ];
  
  for (const pattern of doiPatterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return undefined;
}
