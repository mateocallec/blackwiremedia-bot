const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage, registerFont } = require('canvas');
const DBController = require('../controllers/dbController');

/**
 * @class SocialService
 * @brief Service for generating social media post images for vulnerabilities.
 */
class SocialService {
    /**
     * @brief Initializes directories, database controller, and registers fonts.
     */
    constructor() {
        this.db = new DBController();

        const dataDir = path.join(__dirname, '../../data');
        this.outputDir = path.join(dataDir, 'output');
        this.illustrationsDir = path.join(__dirname, '../assets/illustrations');
        this.emojisDir = path.join(__dirname, '../assets/emojis');
        this.fontsDir = path.join(__dirname, '../assets/fonts');

        // Ensure directories exist
        [dataDir, this.outputDir].forEach(dir => {
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        });

        this.registerFonts();
    }

    /** @brief Color themes for posts. */
    theme = {
        blue: ['rgba(30,64,175,1)', 'rgba(23,37,84,0.8)', 'rgba(30,64,175,0.6)'],
        orange: ['rgba(175,107,30,1)', 'rgba(116,73,25,0.8)', 'rgba(175,107,30,0.6)'],
        red: ['rgba(175,30,30,1)', 'rgba(116,25,25,0.8)', 'rgba(175,30,30,0.6)'],
    }

    /**
     * @brief Registers Poppins fonts from assets directory.
     */
    registerFonts() {
        const variants = [
            'Black', 'BlackItalic', 'Bold', 'BoldItalic', 'ExtraBold', 'ExtraBoldItalic',
            'ExtraLight', 'ExtraLightItalic', 'Italic', 'Light', 'LightItalic', 'Medium',
            'MediumItalic', 'Regular', 'SemiBold', 'SemiBoldItalic', 'Thin', 'ThinItalic'
        ];

        variants.forEach(v => {
            const filePath = path.join(this.fontsDir, `Poppins-${v}.ttf`);
            if (fs.existsSync(filePath)) {
                registerFont(filePath, { family: `Poppins-${v}` });
                console.log(`[Font] ✅ Registered: Poppins-${v}`);
            } else {
                console.warn(`[Font] ⚠️ Missing: Poppins-${v}.ttf`);
            }
        });
    }

    /**
     * @brief Returns a random illustration image path.
     * @return {string} Full path to random background image.
     * @throws Will throw an error if no images are found.
     */
    getRandomBackgroundPath() {
        const files = fs.readdirSync(this.illustrationsDir).filter(f => /\.(png|jpe?g)$/i.test(f));
        if (!files.length) throw new Error('[Background] ❌ No illustration images found.');
        const randomFile = files[Math.floor(Math.random() * files.length)];
        console.log(`[Background] 🎨 Selected background: ${randomFile}`);
        return path.join(this.illustrationsDir, randomFile);
    }

    /**
     * @brief Applies a repeated darkening pattern to the canvas.
     * @param {CanvasRenderingContext2D} ctx Canvas context.
     * @param {number} width Canvas width.
     * @param {number} height Canvas height.
     * @param {number} darkness Darkness factor (0-1).
     */
    applyPatternDarken(ctx, width, height, darkness = 0) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        const tileSize = 2;
        const pattern = [[1, 1], [1, 0]];

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const px = Math.floor(x / tileSize) % pattern[0].length;
                const py = Math.floor(y / tileSize) % pattern.length;
                if (pattern[py][px] === 1) {
                    const idx = (y * width + x) * 4;
                    data[idx] *= darkness;       // R
                    data[idx + 1] *= darkness;   // G
                    data[idx + 2] *= darkness;   // B
                }
            }
        }

        ctx.putImageData(imageData, 0, 0);
    }

    /**
     * @brief Randomly darkens pixels on the canvas.
     * @param {CanvasRenderingContext2D} ctx Canvas context.
     * @param {number} width Canvas width.
     * @param {number} height Canvas height.
     * @param {number} intensity Percentage of pixels to darken (0-1).
     * @param {number} darkness Darkness factor (0-1).
     */
    applyRandomPixelDarken(ctx, width, height, intensity = 0.2, darkness = 0.1) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const totalPixels = width * height;
        const pixelsToDarken = Math.floor(totalPixels * intensity);

        for (let i = 0; i < pixelsToDarken; i++) {
            const idx = Math.floor(Math.random() * totalPixels) * 4;
            data[idx] *= darkness;
            data[idx + 1] *= darkness;
            data[idx + 2] *= darkness;
        }

        ctx.putImageData(imageData, 0, 0);
    }

    /**
     * @brief Returns path of emoji SVG if exists.
     * @param {string} char Character to get emoji for.
     * @return {string|null} Path to emoji or null.
     */
    getEmojiPath(char) {
        const code = char.codePointAt(0).toString(16);
        const filePath = path.join(this.emojisDir, `${code}.svg`);
        return fs.existsSync(filePath) ? filePath : null;
    }

    /**
     * @brief Loads an SVG and scales it to specified dimensions.
     * @param {string} svgPath Path to SVG.
     * @param {number} width Width in pixels.
     * @param {number} height Height in pixels.
     * @return {Promise<Image>} Loaded image.
     */
    async loadSVGWithSize(svgPath, width, height) {
        let svgContent = fs.readFileSync(svgPath, 'utf-8');
        if (!/width\s*=/.test(svgContent)) {
            svgContent = svgContent.replace(/<svg([^>]*)>/, `<svg$1 width="${width}" height="${height}">`);
        }
        const dataUri = 'data:image/svg+xml;base64,' + Buffer.from(svgContent).toString('base64');
        return await loadImage(dataUri);
    }

    /**
     * @brief Draws multiline text on canvas with emoji support.
     * @param {CanvasRenderingContext2D} ctx Canvas context.
     * @param {string} text Text to draw.
     * @param {number} width Canvas width.
     * @param {number} height Canvas height.
     * @param {number} margin Margin from canvas edges.
     * @return {Object} { top, bottom, center } Y positions of text block.
     */
    async drawText(ctx, text, width, height, margin = 80) {
        const maxWidth = width - margin * 2;
        const fontSize = 40;
        const lineHeight = fontSize * 1.5;
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';

        let lines = this.splitTextIntoLines(ctx, text, maxWidth, fontSize);
        const maxLines = Math.floor((height - 2 * margin) / lineHeight);
        if (lines.length > maxLines) {
            lines = lines.slice(0, maxLines);
            const last = lines[lines.length - 1];
            lines[lines.length - 1] = last.length > 3 ? last.slice(0, -3) + '...' : last;
        }

        const totalTextHeight = lines.length * lineHeight;
        const startY = height - (margin * 1.5) - totalTextHeight;
        let y = startY;

        for (const line of lines) {
            let x = margin;
            const segments = this.parseMarkdown(line);
            for (const seg of segments) {
                const fontVariant = this.getFontFromMarkdown(seg.style);
                ctx.font = `${fontSize}px "${fontVariant}"`;
                ctx.fillStyle = '#ffffff';
                for (const char of seg.text) {
                    const emojiPath = this.getEmojiPath(char);
                    if (emojiPath) {
                        const emojiImg = await this.loadSVGWithSize(emojiPath, fontSize, fontSize);
                        ctx.drawImage(emojiImg, x, y, emojiImg.width, emojiImg.height);
                        x += emojiImg.width;
                    } else {
                        ctx.fillText(char, x, y);
                        x += ctx.measureText(char).width;
                    }
                }
            }
            y += lineHeight;
        }

        return { top: startY, bottom: startY + totalTextHeight, center: startY + totalTextHeight / 2 };
    }

    /**
     * @brief Returns font family based on markdown style.
     * @param {string} style Markdown style: 'bold', 'italic', 'bolditalic'.
     * @return {string} Font family.
     */
    getFontFromMarkdown(style) {
        switch (style) {
            case 'bold': return 'Poppins-SemiBold';
            case 'italic': return 'Poppins-Italic';
            case 'bolditalic': return 'Poppins-SemiBoldItalic';
            default: return 'Poppins-Medium';
        }
    }

    /**
     * @brief Parses a line of text into markdown segments.
     * @param {string} line Line of text.
     * @return {Array<{text:string, style:string}>} Parsed segments.
     */
    parseMarkdown(line) {
        const regex = /(\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*.*?\*|[^\*]+)/g;
        const segments = [];
        let match;
        while ((match = regex.exec(line)) !== null) {
            let txt = match[0], style = 'regular';
            if (/^\*\*\*.*\*\*\*$/.test(txt)) { style = 'bolditalic'; txt = txt.slice(3, -3); }
            else if (/^\*\*.*\*\*$/.test(txt)) { style = 'bold'; txt = txt.slice(2, -2); }
            else if (/^\*.*\*$/.test(txt)) { style = 'italic'; txt = txt.slice(1, -1); }
            segments.push({ text: txt, style });
        }
        return segments;
    }

    /**
     * @brief Draws a background image covering the canvas, preserving aspect ratio.
     * @param {CanvasRenderingContext2D} ctx Canvas context.
     * @param {Image} img Image to draw.
     * @param {number} canvasWidth Canvas width.
     * @param {number} canvasHeight Canvas height.
     */
    drawCoverBackground(ctx, img, canvasWidth, canvasHeight) {
        const imgRatio = img.width / img.height;
        const canvasRatio = canvasWidth / canvasHeight;
        let w, h, x, y;

        if (imgRatio > canvasRatio) {
            h = canvasHeight; w = img.width * (canvasHeight / img.height);
            x = (canvasWidth - w) / 2; y = 0;
        } else {
            w = canvasWidth; h = img.height * (canvasWidth / img.width);
            x = 0; y = (canvasHeight - h) / 2;
        }

        ctx.drawImage(img, x, y, w, h);
        console.log(`[Canvas] 🖼 Background drawn (${w}x${h})`);
    }

    /**
 * @brief Applies a vertical gradient overlay on the canvas.
 * @param {CanvasRenderingContext2D} ctx Canvas context.
 * @param {number} width Canvas width.
 * @param {number} height Canvas height.
 * @param {string} themeColor Theme color key ('blue', 'orange', 'red').
 */
    applyGradientOverlay(ctx, width, height, themeColor) {
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, this.theme[themeColor][1]);
        gradient.addColorStop(0.3, this.theme[themeColor][2]);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    /**
     * @brief Splits a text string into multiple lines based on max width.
     * @param {CanvasRenderingContext2D} ctx Canvas context.
     * @param {string} text Text to split.
     * @param {number} maxWidth Maximum line width.
     * @param {number} fontSize Font size in pixels.
     * @return {Array<string>} Array of text lines.
     */
    splitTextIntoLines(ctx, text, maxWidth, fontSize = 46) {
        const originalFont = ctx.font;
        const words = text.split(' ');
        const lines = [];
        let currentLine = [];
        let currentWidth = 0;

        for (const word of words) {
            const wordWidth = this.measureTextWidth(ctx, word, fontSize, 'regular');
            if (currentWidth + wordWidth > maxWidth && currentLine.length > 0) {
                lines.push(currentLine.join(' '));
                currentLine = [word];
                currentWidth = wordWidth;
            } else {
                currentLine.push(word);
                currentWidth += wordWidth + ctx.measureText(' ').width;
            }
        }
        if (currentLine.length > 0) lines.push(currentLine.join(' '));

        ctx.font = originalFont;
        return lines;
    }

    /**
     * @brief Measures the width of text including emoji adjustments.
     * @param {CanvasRenderingContext2D} ctx Canvas context.
     * @param {string} text Text to measure.
     * @param {number} fontSize Font size in pixels.
     * @param {string} style Font style: 'regular', 'bold', 'italic', etc.
     * @return {number} Calculated width in pixels.
     */
    measureTextWidth(ctx, text, fontSize, style = 'regular') {
        const originalFont = ctx.font;
        const fontVariant = this.getFontFromMarkdown(style);
        ctx.font = `${fontSize}px "${fontVariant}"`;

        let width = 0;
        for (const char of text) {
            const emojiPath = this.getEmojiPath(char);
            width += emojiPath ? fontSize * 1.2 : ctx.measureText(char).width;
        }

        ctx.font = originalFont;
        return width;
    }

    /**
     * @brief Draws multiple forward arrows at the bottom of the canvas.
     * @param {CanvasRenderingContext2D} ctx Canvas context.
     * @param {number} width Canvas width.
     * @param {number} height Canvas height.
     */
    drawForwardArrows(ctx, width, height) {
        const arrowCount = 3;
        const arrowSpacing = 50;
        const arrowSize = 60;
        const totalWidth = (arrowCount - 1) * arrowSpacing;
        const startX = width / 2 - totalWidth / 2;
        const y = height - 100;

        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 10;
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'butt';

        for (let i = 0; i < arrowCount; i++) {
            const x = startX + i * arrowSpacing;
            ctx.beginPath();
            ctx.moveTo(x, y - arrowSize / 2);
            ctx.lineTo(x + arrowSize / 2, y);
            ctx.lineTo(x, y + arrowSize / 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * @brief Generates social media post images for a vulnerability.
     * @param {Object} vuln Vulnerability object with cvss_score, cve_id, post_content, post_title.
     */
    async createPostImages(vuln) {
        let themeColor = vuln.cvss_score <= 9 ? 'blue' : vuln.cvss_score <= 9.5 ? 'orange' : 'red';
        const postDir = path.join(this.outputDir, vuln.cve_id.replace(/:/g, '_'));
        if (!fs.existsSync(postDir)) fs.mkdirSync(postDir, { recursive: true });

        const backgroundPath = this.getRandomBackgroundPath();
        const background = await loadImage(backgroundPath);

        const variants = [
            { name: 'vertical-thumbnail.png', width: 1080, height: 1350 },
            { name: 'vertical-content.png', width: 1080, height: 1350 },
            { name: 'horizontal-thumbnail.png', width: 1920, height: 1080 },
            { name: 'horizontal-content.png', width: 1920, height: 1080 },
        ];

        for (const variant of variants) {
            const { name, width, height } = variant;
            const canvas = createCanvas(width, height);
            const ctx = canvas.getContext('2d');

            this.drawCoverBackground(ctx, background, width, height);
            this.applyPatternDarken(ctx, width, height);
            this.applyGradientOverlay(ctx, width, height, themeColor);

            if (name.includes('thumbnail')) {
                this.drawThumbnail(ctx, vuln.cve_id, vuln.post_title, width, height, themeColor);
            } else {
                const margin = 80;
                this.drawBubbles(ctx, vuln.cve_id, width, height, themeColor);
                const textPos = await this.drawText(ctx, vuln.post_content || 'No content available.', width, height, margin);
                this.drawScoreBubble(ctx, vuln.cvss_score, width, height, margin, textPos.top, themeColor);
            }

            this.drawCreditTag(ctx, width, height);
            this.drawSourceTag(ctx, width, height);

            const outputPath = path.join(postDir, name);
            fs.writeFileSync(outputPath, canvas.toBuffer('image/png'));
            console.log(`[Post] ✅ Generated ${name} for ${vuln.cve_id}`);
        }
    }

    /**
     * @brief Draws thumbnail-specific bubbles, title, and arrows.
     */
    drawThumbnail(ctx, cveId, postTitle, width, height, themeColor) {
        this.drawBubbles(ctx, cveId, width, height, themeColor, true);

        ctx.save();
        const titleFontSize = 70;
        const maxWidth = width - 150;
        const titleYStart = height / 1.5 + 150;
        const lineHeight = titleFontSize * 1.25;
        ctx.font = `${titleFontSize}px "Poppins-Bold"`;
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        const titleLines = this.splitTextIntoLines(ctx, postTitle.toUpperCase(), maxWidth, titleFontSize);
        let y = titleYStart - (titleLines.length * lineHeight) / 2;
        for (const line of titleLines) { ctx.fillText(line, width / 2, y); y += lineHeight; }
        ctx.restore();

        this.drawForwardArrows(ctx, width, height);
    }

    /**
     * @brief Draws decorative bubbles with text for posts.
     * @param {boolean} isThumbnail Use larger bubbles for thumbnails.
     */
    drawBubbles(ctx, cveId, width, height, themeColor, isThumbnail = false) {
        const bubbleHeight = isThumbnail ? 140 : 60;
        const bubbleRadius = isThumbnail ? 40 : 15;
        const rotation = -4 * Math.PI / 180;
        const centerX = width / 2;
        const yOffset = isThumbnail ? height / 2 - 100 : 80;
        const padding = isThumbnail ? 50 : 20;

        const getTextWidth = (text, font) => { ctx.font = font; return ctx.measureText(text).width; };

        // First bubble
        const firstText = "New vulnerability";
        const firstFont = isThumbnail ? '60px "Poppins-BoldItalic"' : '25px "Poppins-SemiBoldItalic"';
        const firstBubbleWidth = getTextWidth(firstText, firstFont) + padding * 2;

        ctx.save();
        ctx.translate(centerX, yOffset);
        ctx.rotate(rotation);
        ctx.fillStyle = this.theme[themeColor][0];
        this.drawRoundedRect(ctx, -firstBubbleWidth / 2, -bubbleHeight / 2, firstBubbleWidth, bubbleHeight, bubbleRadius);
        ctx.fill();
        ctx.font = firstFont; ctx.fillStyle = '#FFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(firstText, 0, 0);
        ctx.restore();

        // Second bubble
        const secondText = cveId;
        const secondFont = isThumbnail ? '50px "Poppins-SemiBoldItalic"' : '20px "Poppins-SemiBoldItalic"';
        const secondBubbleWidth = getTextWidth(secondText, secondFont) + padding * 2;

        ctx.save();
        ctx.translate(centerX, yOffset + bubbleHeight - 4);
        ctx.rotate(rotation);
        ctx.fillStyle = '#FFF';
        this.drawRoundedRect(ctx, -secondBubbleWidth / 2, -bubbleHeight / 2, secondBubbleWidth, bubbleHeight, bubbleRadius);
        ctx.fill();
        ctx.font = secondFont; ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(secondText, 0, 0);
        ctx.restore();
    }

    /**
     * @brief Draws the "BlackWire Media" credit tag.
     */
    drawCreditTag(ctx, width, height) {
        const text = 'BlackWire Media', fontSize = 24, margin = 80;
        ctx.save();
        ctx.font = `${fontSize}px "Poppins-Regular"`;
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
        ctx.fillText(text, margin, height - margin / 2);
        ctx.restore();
    }

    /**
     * @brief Draws the "Source: NIST" tag.
     */
    drawSourceTag(ctx, width, height) {
        const text = 'Source: NIST', fontSize = 24, margin = 80;
        ctx.save();
        ctx.font = `${fontSize}px "Poppins-Regular"`;
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
        ctx.fillText(text, width - margin, height - margin / 2);
        ctx.restore();
    }

    /**
     * @brief Draws a score bubble above text.
     */
    drawScoreBubble(ctx, cvssScore, width, height, margin, textTopY, themeColor) {
        const bubbleHeight = 70, bubbleRadius = 20, padding = 40;
        const text = `Vulnerability score ${cvssScore.toFixed(1)}`;
        const font = '35px "Poppins-BoldItalic"';

        ctx.save();
        ctx.font = font;
        const bubbleWidth = ctx.measureText(text).width + padding * 2;
        const centerX = margin + bubbleWidth / 2;
        const yOffset = textTopY - bubbleHeight - 30;
        const rotation = -3 * Math.PI / 180;

        ctx.translate(centerX, yOffset);
        ctx.rotate(rotation);
        ctx.fillStyle = this.theme[themeColor][0];
        this.drawRoundedRect(ctx, -bubbleWidth / 2, -bubbleHeight / 2, bubbleWidth, bubbleHeight, bubbleRadius);
        ctx.fill();

        ctx.fillStyle = '#FFF';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(text, 0, 0);
        ctx.restore();
    }

    /**
     * @brief Draws a rounded rectangle on the canvas.
     */
    drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    /**
     * @brief Generates post images for multiple vulnerabilities.
     * @param {number} limit Maximum number of vulnerabilities to process.
     */
    async generateAllPosts(limit = 10) {
        const vulns = await this.db.getVulnerabilities(limit);
        if (!vulns.length) {
            console.log('[Post] ⚠️ No vulnerabilities found in database.');
            return;
        }

        for (const vuln of vulns) {
            await this.createPostImages(vuln);
        }
        console.log('🎉 All images generated successfully.');
    }
}

module.exports = SocialService;
