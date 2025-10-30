const fs = require('fs');
const path = require('path');
const axios = require('axios');
const OAuth = require('oauth-1.0a');
const Twitter = require('twitter-lite');
const FormData = require('form-data');
const sharp = require("sharp");
const { BskyAgent } = require('@atproto/api');
const nodemailer = require('nodemailer');

/**
 * @brief Configuration object for social media platforms.
 *
 * Includes image formats and API credentials for Instagram, X (Twitter), and Bluesky.
 */
const socialConfig = {
    instagram: {
        imageFormat: 'vertical',
    },
    x: {
        imageFormat: 'horizontal',
        bearerToken: process.env.X_BEARER_TOKEN,
        consumerKey: process.env.X_API_KEY,
        consumerSecret: process.env.X_API_SECRET,
        accessToken: process.env.X_ACCESS_TOKEN,
        accessTokenSecret: process.env.X_ACCESS_TOKEN_SECRET,
    },
    bluesky: {
        imageFormat: 'horizontal',
        identifier: process.env.BLUESKY_IDENTIFIER,
        password: process.env.BLUESKY_PASSWORD,
    },
};

/**
 * @brief Service class to handle social media publishing and email notifications.
 */
class SocialService {
    /**
     * @brief Initializes clients for X (Twitter), Bluesky, and email transport.
     */
    constructor() {
        this.outputDir = path.resolve(__dirname, '../../data/output');

        this.xClient = new Twitter({
            consumer_key: socialConfig.x.consumerKey,
            consumer_secret: socialConfig.x.consumerSecret,
            access_token_key: socialConfig.x.accessToken,
            access_token_secret: socialConfig.x.accessTokenSecret,
        });

        this.bskyClient = new BskyAgent({
            service: 'https://bsky.social',
        });

        this.mailTransporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for others
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    /**
     * @brief Truncates text to a specified character limit.
     * @param {string} text - Text to truncate
     * @param {number} [limit=300] - Maximum allowed length
     * @return {string} Truncated text
     */
    truncate(text, limit = 300) {
        if (text.length <= limit) return text;
        return text.slice(0, limit - 3) + "...";
    }

    /**
     * @brief Publish a post on Instagram using the Graph API.
     * @param {Object} cve - CVE object containing ID and content
     */
    async publishOnInstagram(cve) {
        // TODO
    }

    /**
     * @brief Publish a post on X (Twitter) using API v2.
     * @param {Object} cve - CVE object containing ID and content
     */
    async publishOnX(cve) {
        // TODO
    }

    /**
     * @brief Publish a post on Bluesky with optional images.
     * @param {Object} cve - CVE object containing ID, post content, and description
     * @return {Promise<Object>} Response from Bluesky API
     * @throws Will throw an error if publishing fails
     */
    async publishOnBluesky(cve) {
        try {
            await this.bskyClient.login({
                identifier: socialConfig.bluesky.identifier,
                password: socialConfig.bluesky.password,
            });

            let postText = `New CVE Alert 🚨\n${cve.cve_id}\n${cve.post_content}`;
            postText = postText.replaceAll("**", "");
            postText = this.truncate(postText, 300);

            const { thumbnail, content } = this._getImagePath(cve.cve_id, 'horizontal');

            const imagesToUpload = [];
            if (fs.existsSync(thumbnail)) imagesToUpload.push(thumbnail);
            if (fs.existsSync(content)) imagesToUpload.push(content);

            const images = [];
            for (const imgPath of imagesToUpload) {
                const imgBuffer = await this.compressImage(imgPath, 950 * 1024);
                const mimeType = 'image/jpeg';

                const uploaded = await this.bskyClient.uploadBlob(imgBuffer, { encoding: mimeType });

                images.push({
                    image: uploaded.data.blob,
                    alt: `CVE visual for ${cve.id}`,
                });
            }

            const postPayload = {
                text: postText,
                embed: images.length > 0 ? {
                    $type: "app.bsky.embed.images",
                    images,
                } : undefined
            };

            const response = await this.bskyClient.post(postPayload);

            console.log('Bluesky post successful:', response);
            return response;

        } catch (error) {
            console.error('Error posting to Bluesky:', error);
            throw error;
        }
    }

    /**
     * @brief Compress an image to a target maximum size.
     * @param {string} filePath - Path to the original image
     * @param {number} maxSize - Maximum file size in bytes
     * @return {Promise<Buffer>} Compressed image buffer
     */
    async compressImage(filePath, maxSize) {
        let buffer = fs.readFileSync(filePath);

        if (buffer.length <= maxSize) return buffer;

        let quality = 90;
        while (buffer.length > maxSize && quality > 40) {
            buffer = await sharp(filePath)
                .jpeg({ quality })
                .toBuffer();
            quality -= 10;
        }

        return buffer;
    }

    /**
     * @brief Get paths for the content and thumbnail images of a CVE.
     * @param {string} cveId - CVE identifier
     * @param {string} format - Image format ('horizontal' or 'vertical')
     * @return {Object} Object with `content` and `thumbnail` file paths
     */
    _getImagePath(cveId, format) {
        const cveDir = path.join(this.outputDir, cveId);
        const baseName = `${format}-content`;
        const thumbnailName = `${format}-thumbnail`;
        return {
            content: path.join(cveDir, `${baseName}.png`),
            thumbnail: path.join(cveDir, `${thumbnailName}.png`),
        };
    }

    /**
     * @brief Send an email with optional attachments.
     * @param {string} to - Recipient email address
     * @param {string} subject - Email subject line
     * @param {string} htmlContent - HTML body of the email
     * @param {Array<{filename: string, path: string}>} [attachments] - Optional attachments
     * @return {Promise<Object>} Nodemailer sendMail response
     * @throws Will throw an error if sending fails
     */
    async sendMail(to, subject, htmlContent, attachments = []) {
        try {
            const mailOptions = {
                from: `"CVE Alerts" <${process.env.SMTP_USER}>`,
                to,
                subject,
                html: htmlContent,
                attachments,
            };

            const info = await this.mailTransporter.sendMail(mailOptions);
            console.log('Email sent successfully:', info.messageId);
            return info;
        } catch (error) {
            console.error('Error sending email:', error);
            throw error;
        }
    }
}

module.exports = SocialService;
