import { getMetadata } from '../../scripts/aem.js';
import { isAuthorEnvironment, moveInstrumentation } from '../../scripts/scripts.js';
import { readBlockConfig } from '../../scripts/aem.js';

/**
 * Restructures the hero block DOM for split layouts (image-left, image-right, image-top, image-bottom)
 * @param {Element} block - The hero block element
 * @param {string} layoutStyle - The layout style type
 */
function restructureHeroDOM(block, layoutStyle) {
  // Split layouts that need restructuring
  const splitLayouts = ['image-left', 'image-right', 'image-top', 'image-bottom'];
  
  // eslint-disable-next-line no-console
  console.log('Restructure called with layout:', layoutStyle, 'Needs restructure:', splitLayouts.includes(layoutStyle));
  
  if (!splitLayouts.includes(layoutStyle)) {
    return; // No restructuring needed for overlay or background layouts
  }

  // Get the picture element (1st child)
  const pictureDiv = block.querySelector(':scope > div:first-child');
  const picture = pictureDiv?.querySelector('picture');
  
  // Get the text content div (2nd child)
  const textDiv = block.querySelector(':scope > div:nth-child(2)');
  
  // eslint-disable-next-line no-console
  console.log('Found elements:', {
    pictureDiv: !!pictureDiv,
    picture: !!picture,
    textDiv: !!textDiv,
    blockChildren: block.children.length
  });
  
  if (!picture || !textDiv) {
    // eslint-disable-next-line no-console
    console.warn('Missing required elements for restructuring');
    return; // Missing required elements
  }

  // Clear the block
  block.innerHTML = '';
  
  // Create new structure with two separate divs
  const imageContainer = document.createElement('div');
  imageContainer.className = 'hero-image-container';
  imageContainer.appendChild(picture);
  
  const textContainer = document.createElement('div');
  textContainer.className = 'hero-text-container';
  textContainer.innerHTML = textDiv.innerHTML;
  
  // Append in correct order based on layout
  if (layoutStyle === 'image-left' || layoutStyle === 'image-top') {
    block.appendChild(imageContainer);
    block.appendChild(textContainer);
  } else {
    block.appendChild(textContainer);
    block.appendChild(imageContainer);
  }
  
  // eslint-disable-next-line no-console
  console.log('Restructuring complete. New structure:', block.innerHTML.substring(0, 200));
}

/**
 *
 * @param {Element} block
 */
export default function decorate(block) {
  // Try to get values from data attributes first (Universal Editor)
  let enableUnderline = block.dataset?.enableunderline || null;
  let layoutStyle = block.dataset?.herolayout || null;
  let ctaStyle = block.dataset?.ctastyle || null;
  let backgroundStyle = block.dataset?.backgroundstyle || null;

  // Fallback to reading from block content divs (Document-based authoring)
  if (!enableUnderline) {
    enableUnderline = block.querySelector(':scope div:nth-child(3) > div')?.textContent?.trim() || 'true';
  }
  
  if (!layoutStyle) {
    layoutStyle = block.querySelector(':scope div:nth-child(4) > div')?.textContent?.trim() || 'overlay';
  }

  if (!ctaStyle) {
    ctaStyle = block.querySelector(':scope div:nth-child(5) > div')?.textContent?.trim() || 'default';
  }

  if (!backgroundStyle) {
    backgroundStyle = block.querySelector(':scope div:nth-child(6) > div')?.textContent?.trim() || 'default';
  }

  // Debug logging
  // eslint-disable-next-line no-console
  console.log('Hero Component Config:', {
    enableUnderline,
    layoutStyle,
    ctaStyle,
    backgroundStyle,
    blockDataset: block.dataset
  });

  // Remove configuration divs before restructuring (not just hide them)
  const underlineDiv = block.querySelector(':scope > div:nth-child(3)');
  const layoutStyleDiv = block.querySelector(':scope > div:nth-child(4)');
  const ctaStyleDiv = block.querySelector(':scope > div:nth-child(5)');
  const backgroundStyleDiv = block.querySelector(':scope > div:nth-child(6)');
  
  if (underlineDiv) underlineDiv.remove();
  if (layoutStyleDiv) layoutStyleDiv.remove();
  if (ctaStyleDiv) ctaStyleDiv.remove();
  if (backgroundStyleDiv) backgroundStyleDiv.remove();

  // eslint-disable-next-line no-console
  console.log('After removing config divs, block children:', block.children.length);

  // Restructure DOM for split layouts BEFORE applying classes
  restructureHeroDOM(block, layoutStyle);

  // Apply layout class
  if (layoutStyle) {
    block.classList.add(`${layoutStyle}`);
    // eslint-disable-next-line no-console
    console.log('Added layout class:', layoutStyle, 'Block classes:', block.className);
  }

  // Apply background style class
  if (backgroundStyle && backgroundStyle !== 'default') {
    block.classList.add(`${backgroundStyle}`);
    // eslint-disable-next-line no-console
    console.log('Added background class:', backgroundStyle);
  }

  // Add removeunderline class if underline is disabled
  if (enableUnderline.toLowerCase() === 'false') {
    block.classList.add('removeunderline');
  }
  
  // eslint-disable-next-line no-console
  console.log('Final block classes:', block.className);
  // eslint-disable-next-line no-console
  console.log('Block structure:', block.children.length, 'children');
  
  // Find the button container within the hero block (after restructuring)
  const buttonContainer = block.querySelector('p.button-container');
  
  if (buttonContainer && ctaStyle && ctaStyle !== 'default') {
    // Add the CTA style class to the button container
    buttonContainer.classList.add(`cta-${ctaStyle}`);
  }
  
  // Hide the CTA style configuration paragraph
  const ctaStyleParagraph = block.querySelector('p[data-aue-prop="ctastyle"]');
  if (ctaStyleParagraph) {
    ctaStyleParagraph.style.display = 'none';
  }
}
