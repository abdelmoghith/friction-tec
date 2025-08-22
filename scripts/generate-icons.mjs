import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const projectRoot = process.cwd();
  const publicDir = path.join(projectRoot, 'public');
  const svgSource = path.join(publicDir, 'logo.svg');
  const pngSource = path.join(publicDir, 'friction.png');
  const outputIco = path.join(publicDir, 'favicon.ico');

  const useSvg = await fileExists(svgSource);
  const usePng = !useSvg && (await fileExists(pngSource));

  if (!useSvg && !usePng) {
    console.error('No source logo found. Expected one of: public/logo.svg or public/friction.png');
    process.exit(1);
  }

  const inputPath = useSvg ? svgSource : pngSource;
  const inputBuffer = await fs.readFile(inputPath);

  const sizes = [256, 128, 64, 48, 32, 16];
  const pngBuffers = await Promise.all(
    sizes.map(async (size) =>
      sharp(inputBuffer)
        .resize({ width: size, height: size, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer()
    )
  );

  const icoBuffer = await pngToIco(pngBuffers);
  await fs.writeFile(outputIco, icoBuffer);

  console.log(`Generated Windows icon: ${path.relative(projectRoot, outputIco)}`);
}

main().catch((err) => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});


