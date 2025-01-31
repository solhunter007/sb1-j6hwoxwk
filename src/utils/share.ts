import { shareConfig, type SocialMetadata } from './shareConfig';
import { toast } from 'sonner';

interface ShareOptions {
  path: string;
  metadata: Partial<SocialMetadata>;
  platform?: string;
}

class ShareService {
  private static async buildShareData(options: ShareOptions) {
    const { path, metadata } = options;
    const fullMetadata = shareConfig.getSocialMetadata(metadata);
    const shareUrl = shareConfig.getShareUrl(path);

    if (!shareConfig.validateUrl(shareUrl)) {
      throw new Error('Invalid share URL');
    }

    return {
      title: fullMetadata.title,
      text: fullMetadata.description,
      url: shareUrl,
      metadata: fullMetadata,
    };
  }

  static async share(options: ShareOptions): Promise<boolean> {
    try {
      const shareData = await this.buildShareData(options);

      if (options.platform) {
        return await this.platformShare(options.platform, shareData);
      }

      if (navigator.share) {
        await navigator.share(shareData);
        return true;
      }

      // Fallback to clipboard
      await navigator.clipboard.writeText(shareData.url);
      toast.success('Link copied to clipboard!');
      return true;
    } catch (error) {
      console.error('Share error:', error);
      throw error;
    }
  }

  private static async platformShare(
    platform: string,
    shareData: ReturnType<typeof this.buildShareData> extends Promise<infer T> ? T : never
  ): Promise<boolean> {
    const { url, title, text, metadata } = await shareData;

    switch (platform.toLowerCase()) {
      case 'facebook':
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
          'facebook-share',
          'width=580,height=296'
        );
        break;

      case 'twitter':
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(
            `${text || title}\n\n${url}`
          )}`,
          'twitter-share',
          'width=550,height=235'
        );
        break;

      case 'linkedin':
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
          'linkedin-share',
          'width=580,height=296'
        );
        break;

      case 'email':
        window.location.href = `mailto:?subject=${encodeURIComponent(
          title
        )}&body=${encodeURIComponent(`${text || ''}\n\n${url}`)}`;
        break;

      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    return true;
  }

  static generateEmbedCode(path: string, options = { width: '100%', height: '400' }): string {
    const embedUrl = shareConfig.getShareUrl(`${path}/embed`);
    return `<iframe 
  src="${embedUrl}" 
  width="${options.width}" 
  height="${options.height}" 
  frameborder="0" 
  allowfullscreen>
</iframe>`;
  }
}

export const shareContent = ShareService.share;
export const generateEmbedCode = ShareService.generateEmbedCode;