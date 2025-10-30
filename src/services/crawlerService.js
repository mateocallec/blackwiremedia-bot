const axios = require('axios');
const fs = require('fs');
const path = require('path');
const DBController = require('../controllers/dbController');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * @class CVEService
 * @brief Service to fetch, process, and generate content for CVEs.
 */
class CVEService {
    constructor() {
        this.db = new DBController();
        this.geminiAPIKey = process.env.GEMINI_API_KEY;
        this.promptsPath = path.join(__dirname, '../assets/prompts/');
    }

    /**
     * @brief Reads a prompt template from a file and replaces placeholders with CVE data.
     * @param {Object} cve CVE object.
     * @param {string} promptName Name of the prompt file (without extension).
     * @return {Promise<string>} The prompt with placeholders replaced.
     */
    async getPromptFromFile(cve, promptName) {
        try {
            const promptTemplate = await fs.promises.readFile(path.join(this.promptsPath, `${promptName}.txt`), 'utf-8');
            return promptTemplate
                .replace(/\{\{CVE_ID\}\}/g, cve.id || '')
                .replace(/\{\{CVE_DESCRIPTION\}\}/g, cve.descriptions?.[0]?.value || '');
        } catch (error) {
            console.error(`[Prompt] ⚠️ Failed to read prompt file: ${error.message}`);
            return `Explain the vulnerability ${cve.id} in simple terms.`; // fallback
        }
    }

    /**
     * @brief Fetches CVEs published in the last 24 hours from NVD API.
     * @return {Promise<Array>} Array of CVE vulnerabilities.
     */
    async fetchRecentCVE() {
        const startDate = this.getDate24hAgo();
        const endDate = this.getCurrentDate();
        const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?pubStartDate=${encodeURIComponent(startDate)}&pubEndDate=${encodeURIComponent(endDate)}&resultsPerPage=2000`;

        try {
            const response = await axios.get(url, { headers: { apiKey: process.env.NVD_API_KEY } });
            return response.data.vulnerabilities;
        } catch (error) {
            console.error('[CVE Fetch] ❌ Failed to fetch CVEs:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * @brief Generates content using Google Gemini AI for a given CVE.
     * @param {Object} param0 Object containing the CVE.
     * @param {string} promptName Name of the prompt file.
     * @param {number} retries Number of retries if the model is overloaded.
     * @return {Promise<string>} Generated content text.
     */
    async generateContent({ cve }, promptName, retries = 5) {
        const genAI = new GoogleGenerativeAI(this.geminiAPIKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const prompt = await this.getPromptFromFile(cve, promptName);

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const result = await model.generateContent(prompt);
                return result.response.text();
            } catch (error) {
                const isOverloaded = error.message?.includes('503') || error.message?.includes('The model is overloaded');
                if (isOverloaded && attempt < retries) {
                    const waitTime = 60 * 1000; // 1 minute
                    console.warn(`[AI] ⚠️ Model overloaded, retrying in 1 minute (attempt ${attempt}/${retries})...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                } else {
                    console.error(`[AI] ❌ Error generating content for ${cve.id}:`, error.message);
                    return "Description not available."; // fallback
                }
            }
        }
    }

    /**
     * @brief Processes recent CVEs, filters high CVSS scores, generates AI content, and stores them in the DB.
     */
    async processAndStoreCVE() {
        try {
            const cves = await this.fetchRecentCVE();
            if (!cves || cves.length === 0) {
                console.log('[CVE Process] ⚠️ No CVEs found.');
                return;
            }

            // Filter CVEs with CVSS >= 8
            const highCvssCves = cves.filter(v => {
                const metrics = v.cve.metrics;
                if (metrics?.cvssMetricV31?.length) {
                    return metrics.cvssMetricV31[0].cvssData.baseScore >= 8;
                }
                return false;
            });

            // Shuffle and limit to 30
            const selectedCves = highCvssCves.sort(() => 0.5 - Math.random()).slice(0, 30);

            for (const vulnerability of selectedCves) {
                const cve = vulnerability.cve;
                const cvssScore = cve.metrics.cvssMetricV31[0].cvssData.baseScore;
                const exists = await this.db.cveExists(cve.id);
                if (!exists) {
                    const post_title = await this.generateContent({ cve }, 'post_title');
                    const post_content = await this.generateContent({ cve }, 'post_content');
                    const post_description = await this.generateContent({ cve }, 'post_description');

                    await this.db.insertVulnerability({
                        cve_id: cve.id,
                        cvss_score: cvssScore,
                        published_at: cve.published,
                        post_title,
                        post_content,
                        description: post_description,
                        raw_data: cve,
                    });

                    console.log(`[CVE DB] ✅ CVE ${cve.id} added to database.`);
                }
            }
        } catch (error) {
            console.error('[CVE Process] ❌ Error processing CVEs:', error.message);
        }
    }

    /**
     * @brief Returns current UTC date in ISO format without milliseconds.
     * @return {string} Current date string.
     */
    getCurrentDate() {
        return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'); // e.g. "2025-10-28T12:00:00Z"
    }

    /**
     * @brief Returns UTC date string for 24 hours ago.
     * @return {string} Date string 24h ago.
     */
    getDate24hAgo() {
        const date = new Date();
        date.setDate(date.getDate() - 1);
        return date.toISOString(); // e.g. "2025-10-27T12:00:00.000Z"
    }
}

module.exports = CVEService;
