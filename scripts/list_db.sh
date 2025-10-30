#!/bin/bash

# Define the database file path
DB_FILE="blackwire.db"

# Check if the database file exists
if [ ! -f "$DB_FILE" ]; then
    echo "Error: Database file '$DB_FILE' not found."
    exit 1
fi

# Check if sqlite3 is installed
if ! command -v sqlite3 &> /dev/null; then
    echo "Error: sqlite3 is not installed. Please install it first."
    exit 1
fi

# Query the database and format the output
echo "Listing all vulnerabilities from the database:"
echo "--------------------------------------------------"
sqlite3 -header -column "$DB_FILE" "
    SELECT
        id AS 'ID',
        cve_id AS 'CVE ID',
        cvss_score AS 'CVSS Score',
        published_at AS 'Published At',
        post_title AS 'Post Title',
        post_content AS 'Post Content',
        description AS 'Description',
        created_at AS 'Created At'
    FROM vulnerabilities;
"
echo "--------------------------------------------------"
echo "Total vulnerabilities listed: $(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM vulnerabilities;")"
