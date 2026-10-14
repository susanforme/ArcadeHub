import { useSettings } from '../../app/store';
import { translateRenderedText } from '../../i18n/rendered-text';

// English uses the upstream pixel font; Chinese fits the same allocated bounds.
export function drawLocalizedText(
  ctx: CanvasRenderingContext2D,
  source: string,
  x: number,
  y: number,
  size: number,
  color: string,
  advance = (size * 6) / 7,
) {
  const language = useSettings.getState().language;
  if (language === 'en') return false;
  const text = translateRenderedText(String(source), language);
  if (text === String(source)) return false;
  const width = String(source).length * advance;
  ctx.save();
  ctx.font = `bold ${size}px "PingFang SC", "Microsoft YaHei", sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const drawnWidth = Math.min(ctx.measureText(text).width, width);
  ctx.fillText(text, x + (width - drawnWidth) / 2, y, width);
  ctx.restore();
  return true;
}
