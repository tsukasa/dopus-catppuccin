import fs from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';

/**
 * Helper to check if value is an object
 * @param {*} item - Item to check
 * @returns {boolean} - Whether the item is an object
 */
function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
}

/**
 * Special merge function for @attributes to combine them
 * @param {Object} targetObj - Target object
 * @param {Object} sourceObj - Source object
 * @returns {Object} - Merged object with attributes properly combined
 */
export function mergeAttributes(targetObj, sourceObj) {
    if (!targetObj || !sourceObj) return targetObj || sourceObj;

    // Deep clone to avoid modifying original objects
    const result = JSON.parse(JSON.stringify(targetObj));

    // Handle @attributes specially
    if (sourceObj['@attributes'] && result['@attributes']) {
        result['@attributes'] = { ...result['@attributes'], ...sourceObj['@attributes'] };
    } else if (sourceObj['@attributes']) {
        result['@attributes'] = { ...sourceObj['@attributes'] };
    }

    // Handle all other properties
    Object.keys(sourceObj).forEach(key => {
        if (key === '@attributes') return; // Already handled

        if (isObject(sourceObj[key])) {
            // If both have this key and both are objects, recursively merge
            if (isObject(result[key])) {
                result[key] = mergeAttributes(result[key], sourceObj[key]);
            } else {
                // If target doesn't have this key or it's not an object, just use source
                result[key] = sourceObj[key];
            }
        } else {
            // For non-objects (primitives, arrays), use the source value
            result[key] = sourceObj[key];
        }
    });

    return result;
}

/**
 * Function to find all YAML files in a directory (synchronous)
 * @param {string} dirPath - Directory path to search
 * @param {string[]} excludeFiles - Files to exclude
 * @returns {string[]} - Array of YAML file paths
 */
export function findYamlFiles(dirPath, excludeFiles = []) {
    let yamlFiles = [];

    try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const entryPath = path.join(dirPath, entry.name);

            // Skip excluded files
            if (excludeFiles.some(exclude => path.resolve(dirPath, exclude) === entryPath)) {
                continue;
            }

            if (entry.isDirectory()) {
                // Recursively search subdirectories
                const subDirYamlFiles = findYamlFiles(entryPath, excludeFiles);
                yamlFiles = [...yamlFiles, ...subDirYamlFiles];
            } else if (entry.isFile() && (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))) {
                // Add YAML files to the list
                yamlFiles.push(entryPath);
            }
        }
    } catch (err) {
        console.error(`Error reading directory ${dirPath}: ${err.message}`);
    }

    return yamlFiles;
}

/**
 * Reads and parses a YAML file
 * @param {string} filePath - Path to the YAML file
 * @returns {Object} - Parsed YAML content
 */
export function readYamlFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        // js-yaml 5 throws on empty (or comment-only) input; keep the v4 behavior of returning undefined
        if (content.replace(/^\s*#.*$/gm, '').trim() === '') {
            return undefined;
        }
        return yaml.load(content);
    } catch (error) {
        console.warn(`Warning: Could not read or parse YAML file ${filePath}: ${error.message}`);
        return null;
    }
}
