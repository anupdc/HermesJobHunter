// Capacitor plugin registration for native JobScraper plugin
import { registerPlugin } from '@capacitor/core';

export const JobScraper = registerPlugin('JobScraper', {
  // web fallback — empty, only works on native Android
  web: () => ({
    scrapeLinkedIn: async () => ({ success: false, message: 'Not available on web', jobs: [] }),
    scrapeNaukri: async () => ({ success: false, message: 'Not available on web', jobs: [] }),
  }),
});

export default JobScraper;