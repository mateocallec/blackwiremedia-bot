require('dotenv').config();
const CrawlerService = require('./services/crawlerService');

/**
 * @brief Main script for crawling and storing CVE data.
 *
 * This script initializes the CrawlerService, processes new CVEs,
 * and stores the results in the database.
 */
async function main() {
    const crawler = new CrawlerService();

    /**
     * @brief Execute the crawling and storage process for CVEs.
     */
    await crawler.processAndStoreCVE();

    console.log('CVE crawling and storage process completed successfully.');
}

// Execute the main function
main().catch(console.error);
