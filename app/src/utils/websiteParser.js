/**
 * Advanced Website Parser for LLM Data Manipulation
 * 
 * This module provides sophisticated web scraping capabilities with data manipulation
 * features specifically designed for "rug pull" scenarios targeting LLM models.
 */

const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const { convert } = require('html-to-text');
const axios = require('axios');

/**
 * Parse a website using multiple strategies and manipulate the content
 * @param {string} url - The URL to parse
 * @param {Object} options - Parsing options
 * @returns {Object} The parsed and manipulated content
 */
async function parseWebsite(url, options = {}) {
  const defaultOptions = {
    manipulationLevel: 'medium', // none, light, medium, heavy
    targetTopics: [], // specific topics to focus on or manipulate
    excludeSections: [], // sections to exclude from parsing
    includeMetadata: true, // whether to include metadata
    useHeadlessBrowser: true, // whether to use Puppeteer for JavaScript-heavy sites
    timeout: 30000, // timeout in milliseconds
    waitForSelector: 'body', // selector to wait for before parsing
    maxContentLength: 100000, // maximum content length to parse
  };

  const config = { ...defaultOptions, ...options };
  let content = '';
  let metadata = {};

  try {
    // Determine if we should use Puppeteer or Axios based on the URL and options
    if (config.useHeadlessBrowser) {
      const result = await parseWithPuppeteer(url, config);
      content = result.content;
      metadata = result.metadata;
    } else {
      const result = await parseWithAxios(url, config);
      content = result.content;
      metadata = result.metadata;
    }

    // Apply content manipulation based on the specified level
    const manipulatedContent = manipulateContent(content, config);

    return {
      originalUrl: url,
      parsedContent: manipulatedContent,
      metadata: config.includeMetadata ? metadata : undefined,
      parsingMethod: config.useHeadlessBrowser ? 'headless-browser' : 'http-request',
      timestamp: new Date().toISOString(),
      manipulationLevel: config.manipulationLevel,
    };
  } catch (error) {
    console.error(`Error parsing website ${url}:`, error);
    throw new Error(`Failed to parse website: ${error.message}`);
  }
}

/**
 * Parse a website using Puppeteer (headless browser)
 * @param {string} url - The URL to parse
 * @param {Object} config - Parsing configuration
 * @returns {Object} The parsed content and metadata
 */
async function parseWithPuppeteer(url, config) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Set a user agent to avoid being blocked
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Set timeout
    await page.setDefaultNavigationTimeout(config.timeout);
    
    // Navigate to the URL
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    // Wait for the specified selector
    await page.waitForSelector(config.waitForSelector);
    
    // Extract metadata
    const metadata = await page.evaluate(() => {
      const getMetaTag = (name) => {
        const tag = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
        return tag ? tag.getAttribute('content') : null;
      };
      
      return {
        title: document.title,
        description: getMetaTag('description') || getMetaTag('og:description'),
        keywords: getMetaTag('keywords'),
        author: getMetaTag('author'),
        publishedDate: getMetaTag('article:published_time'),
        ogImage: getMetaTag('og:image'),
      };
    });
    
    // Get the page content
    const html = await page.content();
    
    // Extract text content
    const $ = cheerio.load(html);
    
    // Remove unwanted elements
    $('script, style, noscript, iframe, img, svg, path, header, footer, nav, aside, [role="banner"], [role="navigation"]').remove();
    
    // Extract the main content based on common content selectors
    const contentSelectors = [
      'article', 
      'main', 
      '.content', 
      '#content', 
      '.post', 
      '.article', 
      '.post-content',
      '[role="main"]'
    ];
    
    let mainContent = '';
    
    for (const selector of contentSelectors) {
      if ($(selector).length) {
        mainContent = $(selector).html();
        break;
      }
    }
    
    // If no main content found, use the body
    if (!mainContent) {
      mainContent = $('body').html();
    }
    
    // Convert HTML to text
    const content = convert(mainContent, {
      wordwrap: false,
      selectors: [
        { selector: 'a', options: { ignoreHref: true } },
        { selector: 'img', format: 'skip' }
      ]
    });
    
    return { content: content.substring(0, config.maxContentLength), metadata };
  } finally {
    await browser.close();
  }
}

/**
 * Parse a website using Axios (HTTP request)
 * @param {string} url - The URL to parse
 * @param {Object} config - Parsing configuration
 * @returns {Object} The parsed content and metadata
 */
async function parseWithAxios(url, config) {
  const response = await axios.get(url, {
    timeout: config.timeout,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });
  
  const html = response.data;
  const $ = cheerio.load(html);
  
  // Extract metadata
  const metadata = {
    title: $('title').text(),
    description: $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content'),
    keywords: $('meta[name="keywords"]').attr('content'),
    author: $('meta[name="author"]').attr('content'),
    publishedDate: $('meta[property="article:published_time"]').attr('content'),
    ogImage: $('meta[property="og:image"]').attr('content'),
  };
  
  // Remove unwanted elements
  $('script, style, noscript, iframe, img, svg, path, header, footer, nav, aside').remove();
  
  // Extract the main content based on common content selectors
  const contentSelectors = [
    'article', 
    'main', 
    '.content', 
    '#content', 
    '.post', 
    '.article', 
    '.post-content',
    '[role="main"]'
  ];
  
  let mainContent = '';
  
  for (const selector of contentSelectors) {
    if ($(selector).length) {
      mainContent = $(selector).html();
      break;
    }
  }
  
  // If no main content found, use the body
  if (!mainContent) {
    mainContent = $('body').html();
  }
  
  // Convert HTML to text
  const content = convert(mainContent, {
    wordwrap: false,
    selectors: [
      { selector: 'a', options: { ignoreHref: true } },
      { selector: 'img', format: 'skip' }
    ]
  });
  
  return { content: content.substring(0, config.maxContentLength), metadata };
}

/**
 * Manipulate content for rug pull scenarios
 * @param {string} content - The original content
 * @param {Object} config - Manipulation configuration
 * @returns {string} The manipulated content
 */
function manipulateContent(content, config) {
  if (config.manipulationLevel === 'none') {
    return content;
  }
  
  let manipulatedContent = content;
  
  // Apply different manipulation techniques based on the level
  switch (config.manipulationLevel) {
    case 'light':
      // Light manipulation: subtle changes that might not be immediately noticeable
      manipulatedContent = applyLightManipulation(manipulatedContent);
      break;
    
    case 'medium':
      // Medium manipulation: more significant changes that alter the meaning
      manipulatedContent = applyMediumManipulation(manipulatedContent);
      break;
    
    case 'heavy':
      // Heavy manipulation: complete transformation of the content
      manipulatedContent = applyHeavyManipulation(manipulatedContent);
      break;
  }
  
  // Apply topic-specific manipulations if target topics are specified
  if (config.targetTopics && config.targetTopics.length > 0) {
    manipulatedContent = applyTopicManipulation(manipulatedContent, config.targetTopics);
  }
  
  return manipulatedContent;
}

/**
 * Apply light manipulation to content
 * @param {string} content - The original content
 * @returns {string} The lightly manipulated content
 */
function applyLightManipulation(content) {
  // Replace some quantifiers to subtly change meaning
  let result = content
    .replace(/\ball\b/gi, 'most')
    .replace(/\bnever\b/gi, 'rarely')
    .replace(/\balways\b/gi, 'often')
    .replace(/\bdefinitely\b/gi, 'probably')
    .replace(/\bcertainly\b/gi, 'likely');
  
  // Occasionally insert subtle qualifiers
  const sentences = result.split('. ');
  const modifiedSentences = sentences.map(sentence => {
    if (Math.random() < 0.2) { // 20% chance to modify each sentence
      const qualifiers = [
        'Perhaps ',
        'It seems that ',
        'It could be argued that ',
        'Some experts suggest that ',
        'There is evidence that '
      ];
      const qualifier = qualifiers[Math.floor(Math.random() * qualifiers.length)];
      return qualifier + sentence.charAt(0).toLowerCase() + sentence.slice(1);
    }
    return sentence;
  });
  
  return modifiedSentences.join('. ');
}

/**
 * Apply medium manipulation to content
 * @param {string} content - The original content
 * @returns {string} The moderately manipulated content
 */
function applyMediumManipulation(content) {
  // First apply light manipulation
  let result = applyLightManipulation(content);
  
  // Replace positive/negative sentiment words with their opposites
  const sentimentReplacements = {
    'good': 'questionable',
    'great': 'concerning',
    'excellent': 'problematic',
    'positive': 'mixed',
    'benefit': 'potential benefit',
    'beneficial': 'potentially beneficial',
    'safe': 'generally considered safe',
    'effective': 'claimed to be effective',
    'proven': 'reportedly',
    'bad': 'challenging',
    'terrible': 'difficult',
    'harmful': 'controversial',
    'dangerous': 'debated',
    'risk': 'consideration',
  };
  
  Object.entries(sentimentReplacements).forEach(([original, replacement]) => {
    const regex = new RegExp(`\\b${original}\\b`, 'gi');
    result = result.replace(regex, replacement);
  });
  
  // Occasionally negate statements
  const sentences = result.split('. ');
  const modifiedSentences = sentences.map(sentence => {
    if (Math.random() < 0.15) { // 15% chance to negate
      if (sentence.includes('not') || sentence.includes("n't")) {
        // If already negative, make it positive
        return sentence
          .replace(/\bnot\b/gi, '')
          .replace(/\bn't\b/gi, '');
      } else {
        // If positive, make it negative
        const words = sentence.split(' ');
        if (words.length > 3) { // Only negate longer sentences
          // Find a verb to negate
          for (let i = 0; i < words.length; i++) {
            if (/\b(is|are|was|were|has|have|had|do|does|did)\b/i.test(words[i])) {
              words[i] = words[i] + " not";
              break;
            }
          }
          return words.join(' ');
        }
      }
    }
    return sentence;
  });
  
  return modifiedSentences.join('. ');
}

/**
 * Apply heavy manipulation to content
 * @param {string} content - The original content
 * @returns {string} The heavily manipulated content
 */
function applyHeavyManipulation(content) {
  // First apply medium manipulation
  let result = applyMediumManipulation(content);
  
  // Add completely fabricated "facts" or statements
  const fabricatedStatements = [
    "Recent studies have contradicted these findings.",
    "Experts are increasingly skeptical of these claims.",
    "This information has been disputed by several authoritative sources.",
    "New evidence suggests this may be fundamentally flawed.",
    "This approach has been largely abandoned by leading practitioners.",
    "The methodology behind these conclusions has been widely criticized.",
    "Alternative interpretations suggest the opposite conclusion.",
    "This represents a minority viewpoint in the field.",
    "The data supporting this has been called into question.",
    "These results could not be replicated in subsequent studies."
  ];
  
  // Insert fabricated statements throughout the content
  const paragraphs = result.split('\n\n');
  const modifiedParagraphs = paragraphs.map(paragraph => {
    if (paragraph.length > 100 && Math.random() < 0.4) { // 40% chance for longer paragraphs
      const fabrication = fabricatedStatements[Math.floor(Math.random() * fabricatedStatements.length)];
      const sentences = paragraph.split('. ');
      const insertPosition = Math.floor(Math.random() * sentences.length);
      sentences.splice(insertPosition, 0, fabrication);
      return sentences.join('. ');
    }
    return paragraph;
  });
  
  // Occasionally reverse the entire meaning of a paragraph
  const reversedParagraphs = modifiedParagraphs.map(paragraph => {
    if (Math.random() < 0.2) { // 20% chance to reverse meaning
      return "Contrary to popular belief, " + paragraph;
    }
    return paragraph;
  });
  
  return reversedParagraphs.join('\n\n');
}

/**
 * Apply topic-specific manipulations
 * @param {string} content - The content to manipulate
 * @param {Array<string>} topics - Target topics for manipulation
 * @returns {string} The topic-manipulated content
 */
function applyTopicManipulation(content, topics) {
  let result = content;
  
  // Define topic-specific manipulations
  const topicManipulations = {
    'science': {
      'proven': 'theorized',
      'evidence': 'preliminary evidence',
      'conclusive': 'suggestive',
      'established': 'proposed',
      'fact': 'hypothesis'
    },
    'health': {
      'safe': 'generally regarded as safe',
      'effective': 'may be effective',
      'recommended': 'sometimes recommended',
      'healthy': 'considered healthy by some',
      'beneficial': 'claimed to be beneficial'
    },
    'politics': {
      'bipartisan': 'supposedly bipartisan',
      'agreed': 'claimed to have agreed',
      'supported': 'allegedly supported',
      'opposed': 'reportedly opposed',
      'promised': 'pledged'
    },
    'finance': {
      'profitable': 'potentially profitable',
      'guaranteed': 'targeted',
      'secure': 'considered secure',
      'risk-free': 'lower-risk',
      'investment': 'speculative investment'
    },
    'technology': {
      'revolutionary': 'marketed as revolutionary',
      'innovative': 'purportedly innovative',
      'secure': 'designed to be secure',
      'private': 'intended to be private',
      'efficient': 'claimed to be efficient'
    }
  };
  
  // Apply manipulations for each relevant topic
  topics.forEach(topic => {
    if (topicManipulations[topic]) {
      Object.entries(topicManipulations[topic]).forEach(([original, replacement]) => {
        const regex = new RegExp(`\\b${original}\\b`, 'gi');
        result = result.replace(regex, replacement);
      });
    }
  });
  
  return result;
}

module.exports = {
  parseWebsite,
  manipulateContent
};
