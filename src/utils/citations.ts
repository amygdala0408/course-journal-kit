// Citation generation utilities

export interface CitationMetadata {
  title?: string;
  authors?: string[];
  publishedDate?: string;
  siteName?: string;
  url?: string;
  doi?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  publisher?: string;
  type: 'article' | 'book' | 'website' | 'video' | 'other';
}

/**
 * Generate APA 7th edition citation from metadata
 */
export function generateAPACitation(meta: CitationMetadata): string {
  const { title, authors, publishedDate, siteName, url, doi, journal, volume, issue, pages, type } = meta;
  
  // Format authors
  let authorStr = '';
  if (authors && authors.length > 0) {
    if (authors.length === 1) {
      authorStr = formatAuthorAPA(authors[0]);
    } else if (authors.length === 2) {
      authorStr = `${formatAuthorAPA(authors[0])} & ${formatAuthorAPA(authors[1])}`;
    } else if (authors.length <= 20) {
      const formatted = authors.map(formatAuthorAPA);
      authorStr = formatted.slice(0, -1).join(', ') + ', & ' + formatted[formatted.length - 1];
    } else {
      const formatted = authors.slice(0, 19).map(formatAuthorAPA);
      authorStr = formatted.join(', ') + ', ... ' + formatAuthorAPA(authors[authors.length - 1]);
    }
  } else if (siteName) {
    authorStr = siteName;
  }

  // Format date
  const year = publishedDate ? extractYear(publishedDate) : 'n.d.';
  
  // Format title
  const formattedTitle = title || 'Untitled';
  
  // Build citation based on type
  switch (type) {
    case 'article':
      if (journal) {
        // Journal article
        let citation = `${authorStr} (${year}). ${formattedTitle}. *${journal}*`;
        if (volume) citation += `, *${volume}*`;
        if (issue) citation += `(${issue})`;
        if (pages) citation += `, ${pages}`;
        citation += '.';
        if (doi) citation += ` https://doi.org/${doi}`;
        else if (url) citation += ` ${url}`;
        return citation;
      } else {
        // Online article
        let citation = `${authorStr} (${year}). ${formattedTitle}.`;
        if (siteName) citation += ` *${siteName}*.`;
        if (url) citation += ` ${url}`;
        return citation;
      }
    
    case 'book': {
      let bookCitation = `${authorStr} (${year}). *${formattedTitle}*.`;
      if (meta.publisher) bookCitation += ` ${meta.publisher}.`;
      if (doi) bookCitation += ` https://doi.org/${doi}`;
      else if (url) bookCitation += ` ${url}`;
      return bookCitation;
    }

    case 'video': {
      let videoCitation = `${authorStr} (${year}). *${formattedTitle}* [Video].`;
      if (siteName) videoCitation += ` ${siteName}.`;
      if (url) videoCitation += ` ${url}`;
      return videoCitation;
    }

    case 'website':
    default: {
      let webCitation = `${authorStr} (${year}). ${formattedTitle}.`;
      if (siteName && siteName !== authorStr) webCitation += ` *${siteName}*.`;
      if (url) webCitation += ` ${url}`;
      return webCitation;
    }
  }
}

/**
 * Format a single author name for APA (Last, F. M.)
 */
function formatAuthorAPA(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  
  const lastName = parts[parts.length - 1];
  const initials = parts.slice(0, -1).map(p => p.charAt(0).toUpperCase() + '.').join(' ');
  
  return `${lastName}, ${initials}`;
}

/**
 * Extract year from various date formats
 */
function extractYear(dateStr: string): string {
  // Try to find a 4-digit year
  const yearMatch = dateStr.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) return yearMatch[0];
  
  // Try parsing as date
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.getFullYear().toString();
  }
  
  return 'n.d.';
}

/**
 * Parse author string into array of names
 */
export function parseAuthors(authorStr: string): string[] {
  if (!authorStr) return [];
  
  // Split by common separators
  return authorStr
    .split(/[,;&]|\band\b/i)
    .map(a => a.trim())
    .filter(a => a.length > 0 && !a.match(/^\s*$/));
}

/**
 * Build citation from simple inputs (for manual entry)
 */
export function buildCitationFromInputs(inputs: {
  authors: string;
  year: string;
  title: string;
  source: string;
  url?: string;
  type: CitationMetadata['type'];
}): string {
  const meta: CitationMetadata = {
    authors: parseAuthors(inputs.authors),
    publishedDate: inputs.year,
    title: inputs.title,
    siteName: inputs.source,
    url: inputs.url,
    type: inputs.type,
  };
  
  return generateAPACitation(meta);
}

/**
 * Attempt to extract metadata from a URL by fetching and parsing
 * Note: This requires a proxy/backend in production due to CORS
 * For now, we'll provide a template based on URL patterns
 */
export function suggestCitationTemplate(url: string): Partial<CitationMetadata> {
  const urlObj = new URL(url);
  const hostname = urlObj.hostname.replace('www.', '');
  
  // Common academic sources
  if (hostname.includes('doi.org')) {
    const doi = urlObj.pathname.replace('/', '');
    return { doi, type: 'article' };
  }
  
  if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
    return { siteName: 'YouTube', type: 'video' };
  }
  
  if (hostname.includes('scholar.google')) {
    return { type: 'article' };
  }
  
  if (hostname.includes('jstor.org')) {
    return { siteName: 'JSTOR', type: 'article' };
  }
  
  if (hostname.includes('eric.ed.gov')) {
    return { siteName: 'ERIC', type: 'article' };
  }
  
  if (hostname.includes('edutopia.org')) {
    return { siteName: 'Edutopia', type: 'website' };
  }
  
  if (hostname.includes('edsurge.com')) {
    return { siteName: 'EdSurge', type: 'website' };
  }
  
  // Default
  return { 
    siteName: hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1),
    type: 'website',
    url 
  };
}

/**
 * Format a quick in-text citation
 */
export function formatInTextCitation(authors: string[], year: string): string {
  if (!authors || authors.length === 0) return `(${year})`;
  
  const lastName = (name: string) => {
    const parts = name.trim().split(/\s+/);
    return parts[parts.length - 1];
  };
  
  if (authors.length === 1) {
    return `(${lastName(authors[0])}, ${year})`;
  } else if (authors.length === 2) {
    return `(${lastName(authors[0])} & ${lastName(authors[1])}, ${year})`;
  } else {
    return `(${lastName(authors[0])} et al., ${year})`;
  }
}
