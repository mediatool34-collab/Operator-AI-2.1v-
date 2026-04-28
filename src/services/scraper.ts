/**
 * Frontend service to interact with the scraping API
 */
export async function scrapeWebsite(url: string, options: any = {}) {
  const userId = localStorage.getItem('user_id') || 'anonymous';
  
  const response = await fetch('/api/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId
    },
    body: JSON.stringify({ url, options })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to scrape website');
  }

  return response.json();
}

export async function scrapeSocialPage(url: string, platform: 'facebook' | 'instagram' | 'linkedin' | 'tiktok' | 'youtube' | 'x') {
  const userId = localStorage.getItem('user_id') || 'anonymous';
  
  const response = await fetch('/api/scrape/social', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId
    },
    body: JSON.stringify({ url, platform })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Failed to scrape ${platform} page`);
  }

  return response.json();
}
