const base = 'https://cdn.jsdelivr.net/npm/';

export const cdnModules = {
  howler: `${base}howler@2.2.4/+esm`,
  phaser: `${base}phaser@4.2.1/dist/phaser.esm.min.js`,
  react: `${base}react@19.3.0/+esm`,
  'react/jsx-runtime': `${base}react@19.3.0/jsx-runtime/+esm`,
  'react-dom': `${base}react-dom@19.3.0/+esm`,
  'react-dom/client': `${base}react-dom@19.3.0/client/+esm`,
};

// React DOM's CDN build imports this range URL; share the pinned React instance.
export const cdnImports = {
  [`${base}react@%5E19.3.0/+esm`]: cdnModules.react,
};

export const cdnAssets = [
  ...Object.values(cdnModules),
  `${base}scheduler@0.28.0/+esm`,
];
