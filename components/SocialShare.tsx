import React, { useState } from 'react';
import { Share2, Facebook, Twitter, Instagram, MessageCircle, Link2, Mail } from 'lucide-react';

interface SocialShareProps {
  url: string;
  title: string;
  description: string;
  image?: string;
  hashtags?: string[];
  onShare?: (platform: string) => void;
}

const SocialShare: React.FC<SocialShareProps> = ({
  url,
  title,
  description,
  image,
  hashtags = [],
  onShare,
}) => {
  const [copied, setCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  // Encode URL for sharing
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description);
  const encodedImage = image ? encodeURIComponent(image) : '';
  const encodedHashtags = hashtags.join(',');

  // Share URLs for different platforms
  const shareUrls = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedDescription}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}&hashtags=${encodedHashtags}`,
    instagram: `https://www.instagram.com/`, // Instagram doesn't support direct URL sharing
    whatsapp: `https://wa.me/?text=${encodedTitle} ${encodedDescription} ${encodedUrl}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedDescription} ${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}&title=${encodedTitle}&summary=${encodedDescription}`,
    pinterest: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedDescription}&media=${encodedImage}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
    reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
  };

  // Handle share action
  const handleShare = async (platform: keyof typeof shareUrls | 'generic') => {
    try {
      if (platform === 'instagram') {
        // Instagram doesn't support direct sharing
        alert('Instagram sharing: Copy the link below and paste it in your Instagram story!');
        copyToClipboard();
        return;
      }

      const shareUrl =
        platform === 'generic' ? undefined : shareUrls[platform as keyof typeof shareUrls];

      // Check if Web Share API is available
      if (navigator.share && platform === 'generic') {
        await navigator.share({
          title,
          text: description,
          url,
        });
      } else {
        // Open in new window
        window.open(shareUrl, '_blank', 'width=600,height=400');
      }

      onShare?.(platform);
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  // Copy to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Native sharing for mobile
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url,
        });
        onShare?.('native');
      } catch (error) {
        console.error('Native share failed:', error);
      }
    }
  };

  return (
    <div className="relative">
      {/* Share Button */}
      <button
        onClick={() => setShowShareMenu(!showShareMenu)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
      >
        <Share2 className="w-4 h-4" />
        <span>Share</span>
      </button>

      {/* Share Menu */}
      {showShareMenu && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 min-w-[300px]">
          <div className="flex flex-col gap-3">
            {/* Native Share (Mobile) */}
            {navigator.share && (
              <button
                onClick={handleNativeShare}
                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg w-full text-left"
              >
                <Share2 className="w-5 h-5 text-blue-500" />
                <span>Share via...</span>
              </button>
            )}

            {/* Facebook */}
            <button
              onClick={() => handleShare('facebook')}
              className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg w-full text-left"
            >
              <Facebook className="w-5 h-5 text-blue-600" />
              <span>Facebook</span>
            </button>

            {/* Twitter */}
            <button
              onClick={() => handleShare('twitter')}
              className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg w-full text-left"
            >
              <Twitter className="w-5 h-5 text-blue-400" />
              <span>Twitter</span>
            </button>

            {/* Instagram */}
            <button
              onClick={() => handleShare('instagram')}
              className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg w-full text-left"
            >
              <Instagram className="w-5 h-5 text-pink-500" />
              <span>Instagram</span>
            </button>

            {/* WhatsApp */}
            <button
              onClick={() => handleShare('whatsapp')}
              className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg w-full text-left"
            >
              <MessageCircle className="w-5 h-5 text-green-500" />
              <span>WhatsApp</span>
            </button>

            {/* Email */}
            <button
              onClick={() => handleShare('email')}
              className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg w-full text-left"
            >
              <Mail className="w-5 h-5 text-gray-600" />
              <span>Email</span>
            </button>

            {/* LinkedIn */}
            <button
              onClick={() => handleShare('linkedin')}
              className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg w-full text-left"
            >
              <div className="w-5 h-5 bg-blue-700 rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold">in</span>
              </div>
              <span>LinkedIn</span>
            </button>

            {/* Copy Link */}
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg w-full text-left border-t pt-3"
            >
              <Link2 className="w-5 h-5 text-gray-600" />
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Overlay to close menu */}
      {showShareMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowShareMenu(false)} />
      )}
    </div>
  );
};

export default SocialShare;
