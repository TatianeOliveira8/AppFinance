const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Adicionando suporte para SVG se necessário e outras extensões
config.resolver.sourceExts.push('mjs');

module.exports = config;
