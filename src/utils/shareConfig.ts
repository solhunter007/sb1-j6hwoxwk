import { z } from 'zod';

// Environment configuration schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  VITE_APP_URL: z.string().url().optional(),
  VITE_SITE_NAME: z.string().default('Sermon Buddy'),
  VITE_SOCIAL_IMAGE: z.string().url().optional(),
});

// Social media metadata schema
const socialMetadataSchema = z.object({
  title: z.string(),
  description: z.string(),
  image: z.string().url().optional(),
  type: z.string().default('article'),
});

export type SocialMetadata = z.infer<typeof socialMetadataSchema>;

class ShareConfig {
  private static instance: ShareConfig;
  private baseUrl: string;
  private environment: string;

  private constructor() {
    const env = envSchema.parse(import.meta.env);
    this.environment = env.NODE_ENV;
    this.baseUrl = this.determineBaseUrl();
  }

  static getInstance(): ShareConfig {
    if (!ShareConfig.instance) {
      ShareConfig.instance = new ShareConfig();
    }
    return ShareConfig.instance;
  }

  private determineBaseUrl(): string {
    // First try to get from environment variable
    if (import.meta.env.VITE_APP_URL) {
      return import.meta.env.VITE_APP_URL;
    }

    // Fallback to window.location
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol;
      const host = window.location.host;
      return `${protocol}//${host}`;
    }

    // Development fallback
    return 'http://localhost:5173';
  }

  public getShareUrl(path: string): string {
    return new URL(path, this.baseUrl).toString();
  }

  public getEnvironment(): string {
    return this.environment;
  }

  public getSocialMetadata(data: Partial<SocialMetadata>): SocialMetadata {
    const defaultMetadata: SocialMetadata = {
      title: import.meta.env.VITE_SITE_NAME || 'Sermon Buddy',
      description: 'Share and discover sermon insights',
      type: 'article',
      image: import.meta.env.VITE_SOCIAL_IMAGE,
    };

    return socialMetadataSchema.parse({
      ...defaultMetadata,
      ...data,
    });
  }

  public validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

export const shareConfig = ShareConfig.getInstance();