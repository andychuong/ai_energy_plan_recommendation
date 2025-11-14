// Custom Jest transform that replaces import.meta.env with process.env before ts-jest
const { createTransformer } = require('ts-jest').default;

const tsJestTransformer = createTransformer();

module.exports = {
  process(src, path, config, transformOptions) {
    // Only transform files that contain import.meta
    if (!src.includes('import.meta')) {
      return tsJestTransformer.process(src, path, config, transformOptions);
    }

    // Replace import.meta with a safe alternative before TypeScript compilation
    // Order matters: replace longer patterns first
    let transformedSrc = src;
    // Replace import.meta?.env?.PROP patterns (e.g., import.meta?.env?.VITE_USE_MOCK_API)
    transformedSrc = transformedSrc.replace(
      /import\.meta\?\.env\?\.([A-Z_]+)/g,
      'process.env.$1'
    );
    // Replace import.meta?.env patterns
    transformedSrc = transformedSrc.replace(
      /import\.meta\?\.env/g,
      'process.env'
    );
    // Replace import.meta.env.PROP patterns
    transformedSrc = transformedSrc.replace(
      /import\.meta\.env\.([A-Z_]+)/g,
      'process.env.$1'
    );
    // Replace import.meta.env patterns
    transformedSrc = transformedSrc.replace(
      /import\.meta\.env/g,
      'process.env'
    );
    // Replace standalone import.meta (as fallback)
    transformedSrc = transformedSrc.replace(
      /import\.meta/g,
      '{ env: process.env }'
    );

    // Now pass to ts-jest
    return tsJestTransformer.process(
      transformedSrc,
      path,
      config,
      transformOptions
    );
  },
  getCacheKey(fileData, filename, configString, options) {
    return tsJestTransformer.getCacheKey(
      fileData,
      filename,
      configString,
      options
    );
  },
};
