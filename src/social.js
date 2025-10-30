require('dotenv').config();
const fs = require('fs');
const path = require('path');
const DBController = require('./controllers/dbController');
const SocialService = require('./services/socialService');

/**
 * @brief Main entry point of the application.
 *
 * This script fetches unused vulnerabilities from the database,
 * optionally publishes them on social media (currently commented out),
 * prepares email notifications with relevant content and images,
 * and sends the emails to the configured recipient.
 */
async function main() {
    const db = new DBController();
    const socialService = new SocialService();

    try {
        const blueskyLimit = 1;

        /**
         * @brief Retrieve a limited number of unused vulnerabilities.
         *
         * @param blueskyLimit Number of vulnerabilities to fetch.
         * @return Array of vulnerability objects containing CVE ID, post content, and description.
         */
        const vulnerabilities = await db.getVulnerabilities(blueskyLimit);

        for (const cve of vulnerabilities) {
            /**
             * @section SocialMediaPublishing
             * Publishing on social media is currently disabled.
             *
             * Example:
             * await socialService.publishOnBluesky(cve);
             * await db.markLineAsUsed(cve.cve_id);
             */

            // Prepare email subject and HTML content
            const subject = `New CVE Alert: ${cve.cve_id}`;
            const htmlContent = `
                <h2>New CVE Detected</h2>
                <p><strong>${cve.cve_id}</strong></p>
                <p>${cve.post_content}</p>
                <hr>
                <p>${cve.description}</p>
            `;

            /**
             * @brief Collect email attachments for the CVE.
             *
             * Attempts to attach both horizontal and vertical images (thumbnail and full content)
             * if they exist on disk.
             */
            const attachments = [];

            // Horizontal images
            const horizontal = socialService._getImagePath(cve.cve_id, 'horizontal');
            if (fs.existsSync(horizontal.thumbnail)) attachments.push({ filename: path.basename(horizontal.thumbnail), path: horizontal.thumbnail });
            if (fs.existsSync(horizontal.content)) attachments.push({ filename: path.basename(horizontal.content), path: horizontal.content });

            // Vertical images
            const vertical = socialService._getImagePath(cve.cve_id, 'vertical');
            if (fs.existsSync(vertical.thumbnail)) attachments.push({ filename: path.basename(vertical.thumbnail), path: vertical.thumbnail });
            if (fs.existsSync(vertical.content)) attachments.push({ filename: path.basename(vertical.content), path: vertical.content });

            /**
             * @brief Send an email notification with the CVE details.
             *
             * @param recipient Recipient email address from environment variable.
             * @param subject Email subject.
             * @param htmlContent HTML body content.
             * @param attachments Array of file attachments.
             */
            await socialService.sendMail(
                process.env.ALERT_EMAIL_RECIPIENT,
                subject,
                htmlContent,
                attachments
            );

            console.log(`Email successfully sent for CVE: ${cve.cve_id}`);
        }

        console.log('All emails processed successfully.');
    } catch (error) {
        console.error('An error occurred during processing:', error);
    } finally {
        db.close();
    }
}

// Execute main function
main().catch(console.error);
