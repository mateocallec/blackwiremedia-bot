require('dotenv').config();
const GeneratorService = require('./services/generatorService');

/**
 * @brief Main script for generating social media posts.
 *
 * This script initializes the GeneratorService and generates a specified
 * number of posts, including any associated images or content.
 */
async function main() {
    const generator = new GeneratorService();

    /**
     * @brief Generate a batch of posts.
     *
     * @param 10 Number of posts to generate in this run.
     */
    await generator.generateAllPosts(10);

    console.log('All posts and images have been successfully generated.');
}

// Execute the main function
main().catch(console.error);
