const imageModules = import.meta.glob<string>('./assets/images/*.png', {
  eager: true,
  import: 'default',
});
const soundModules = import.meta.glob<string>('./assets/sounds/*.mp3', {
  eager: true,
  import: 'default',
});
export const images = Object.fromEntries(
  Object.entries(imageModules).map(([path, url]) => [
    path.split('/').pop()?.replace('.png', ''),
    url,
  ]),
) as Record<string, string>;
export const sounds = Object.fromEntries(
  Object.entries(soundModules).map(([path, url]) => [
    path.split('/').pop()?.replace('.mp3', ''),
    url,
  ]),
) as Record<string, string>;
