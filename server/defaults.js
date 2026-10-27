/** Defaults from the source extension config object. */
export const DEFAULT_CONFIG = {
  maxPages: 100,
  maxUrls: 10000,
  depthLimit: 0,
  responseTimeout: 10000,
  maxUrlsToCrawlPerSecond: 30,
  userAgent: "SiteAudit/1.0",
  inclusionRegex: "",
  exclusionRegex: "",
  obeyRobots: false,
  checkExternalLinks: false,
  checkExternalResources: true,
  categories: ["SEO", "speed", "security"],
  minPageTitleLength: 10,
  maxPageTitleLength: 60,
  minH1HeadingLength: 1,
  maxH1HeadingLength: 70,
  minPageDescriptionLength: 100,
  maxPageDescriptionLength: 320,
  minPageWordCount: 300,
  maxReadableUrlLength: 100,
  maxForwardSlashesInReadableUrl: 5,
  maxInlineJsBytesPerPage: 10000,
  maxInlineCssBytesPerPage: 50000,
  hstsPreloadMinAge: 31536000,
  longCacheMinutes: 1440
};

export const CHECK_DEFAULTS = { ...DEFAULT_CONFIG };
