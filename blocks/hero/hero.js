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
  
  if (!splitLayouts.includes(layoutStyle)) {
    return; // No restructuring needed for overlay or background layouts
  }

  // Get the picture element (1st child)
  const pictureDiv = block.querySelector(':scope > div:first-child');
  const picture = pictureDiv?.querySelector('picture');
  
  // Get the text content div (2nd child)
  const textDiv = block.querySelector(':scope > div:nth-child(2)');
  
  if (!picture || !textDiv) {
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
}

/**
 *
 * @param {Element} block
 */
export default function decorate(block) {
  // Get the enable underline setting from the block content (3rd div)
  const enableUnderline = block.querySelector(':scope div:nth-child(3) > div')?.textContent?.trim() || 'true';
  
  // Get the layout Style from the block content (4th div)
  const layoutStyle = block.querySelector(':scope div:nth-child(4) > div')?.textContent?.trim() || 'overlay';

  // Get the CTA style from the block content (5th div)
  const ctaStyle = block.querySelector(':scope div:nth-child(5) > div')?.textContent?.trim() || 'default';

  const backgroundStyle = block.querySelector(':scope div:nth-child(6) > div')?.textContent?.trim() || 'default';

  // Hide configuration divs before restructuring
  const underlineDiv = block.querySelector(':scope div:nth-child(3)');
  if (underlineDiv) {
    underlineDiv.style.display = 'none';
  }
  
  const layoutStyleDiv = block.querySelector(':scope div:nth-child(4)');
  if (layoutStyleDiv) {
    layoutStyleDiv.style.display = 'none';
  }

  const ctaStyleDiv = block.querySelector(':scope div:nth-child(5)');
  if (ctaStyleDiv) {
    ctaStyleDiv.style.display = 'none';
  }

  const backgroundStyleDiv = block.querySelector(':scope div:nth-child(6)');
  if (backgroundStyleDiv) {
    backgroundStyleDiv.style.display = 'none';
  }

  // Restructure DOM for split layouts BEFORE applying classes
  restructureHeroDOM(block, layoutStyle);

  // Apply layout class
  if (layoutStyle) {
    block.classList.add(`${layoutStyle}`);
  }

  // Apply background style class
  if (backgroundStyle && backgroundStyle !== 'default') {
    block.classList.add(`${backgroundStyle}`);
  }

  // Add removeunderline class if underline is disabled
  if (enableUnderline.toLowerCase() === 'false') {
    block.classList.add('removeunderline');
  }
  
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
