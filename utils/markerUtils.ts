/**
 * Utility to create marker icons for map display
 * Uses SVG data URIs to create perfect circular markers with emojis
 */

export const createMarkerIcon = (emoji: string, isPopular: boolean = false): string => {
    const size = isPopular ? 64 : 60;
    const borderWidth = isPopular ? 3 : 2;
    const borderColor = isPopular ? '#FFE500' : '#333333';
    const emojiSize = isPopular ? 26 : 24;

    // Calculate center position for emoji
    const center = size / 2;
    const emojiY = center + (emojiSize * 0.35); // Adjust for emoji baseline

    const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <!-- Shadow circle -->
      <circle 
        cx="${center}" 
        cy="${center + 2}" 
        r="${(size / 2) - borderWidth}" 
        fill="rgba(0,0,0,0.1)" 
      />
      <!-- White background circle -->
      <circle 
        cx="${center}" 
        cy="${center}" 
        r="${(size / 2) - borderWidth}" 
        fill="white" 
      />
      <!-- Border circle -->
      <circle 
        cx="${center}" 
        cy="${center}" 
        r="${(size / 2) - (borderWidth / 2)}" 
        fill="none" 
        stroke="${borderColor}" 
        stroke-width="${borderWidth}" 
      />
      <!-- Emoji text -->
      <text 
        x="${center}" 
        y="${emojiY}" 
        font-size="${emojiSize}" 
        text-anchor="middle" 
        font-family="system-ui, -apple-system, sans-serif"
      >${emoji}</text>
    </svg>
  `.trim().replace(/\s+/g, ' ');

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};
