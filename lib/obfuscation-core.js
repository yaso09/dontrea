function createObfuscatorConfig(options = {}) {
  const config = {
    compact: true,
    numbersToExpressions: true,
    stringArray: true,
    stringArrayThreshold: 0.8,
    controlFlowFlattening: Boolean(options.controlFlowFlattening),
    controlFlowFlatteningThreshold: Number.parseFloat(options.controlFlowFlatteningThreshold ?? 0.75),
    deadCodeInjection: Boolean(options.deadCodeInjection),
    debugProtection: Boolean(options.debugProtection),
    debugProtectionInterval: Number.parseInt(options.debugProtectionInterval ?? 2000, 10),
    selfDefending: Boolean(options.selfDefending)
  };

  if (Array.isArray(options.domainLock) && options.domainLock.length > 0) {
    config.domainLock = options.domainLock;
  }
  return config;
}

function obfuscateDontreaCode(obfuscator, code, options = {}) {
  if (!obfuscator || typeof obfuscator.obfuscate !== 'function') {
    throw new Error('Dontrea obfuscator is not available.');
  }
  return obfuscator.obfuscate(String(code || ''), createObfuscatorConfig(options)).getObfuscatedCode();
}

const dontreaObfuscationCore = { createObfuscatorConfig, obfuscateDontreaCode };
if (typeof module !== 'undefined' && module.exports) module.exports = dontreaObfuscationCore;
if (typeof globalThis !== 'undefined') globalThis.DontreaObfuscationCore = dontreaObfuscationCore;
