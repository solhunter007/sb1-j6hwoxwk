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
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    const encodedText = encodeURIComponent(text || title);

    let shareUrl: string;
    let windowFeatures = 'width=550,height=400,resizable=yes,scrollbars=yes';

    switch (platform.toLowerCase()) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;

      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        break;

      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;

      case 'email':
        shareUrl = `mailto:?subject=${encodedTitle}&body=${encodedText}%0A%0A${encodedUrl}`;
        window.location.href = shareUrl;
        return true;

      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    // Center the popup window
    const left = Math.max(0, (window.innerWidth - 550) / 2);
    const top = Math.max(0, (window.innerHeight - 400) / 2);
    windowFeatures += `,left=${left},top=${top}`;

    const popup = window.open(shareUrl, `share_${platform}`, windowFeatures);
    
    // Check if popup was blocked
    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      throw new Error('Popup blocked. Please allow popups and try again.');
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
  allowfullscreen
  title="Sermon Note Embed">
</iframe>`;
  }
}

export const shareContent = ShareService.share;
export const generateEmbedCode = ShareService.generateEmbedCode;