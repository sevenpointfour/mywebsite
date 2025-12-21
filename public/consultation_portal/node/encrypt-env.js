// given one or more comma separated keys at command line, replace the corresponding value in .env file with encrypted value (if it is not already encrypted)
const fs = require('fs');
const path = require('path');
const { encrypt, getDefaultKey } = require('./decrypt'); // Uses the encrypt function from your decrypt.js

const envFilePath = path.resolve(__dirname, '.env'); // Assumes .env is in the same directory

/**
 * Checks if a value is likely already encrypted by our encrypt function.
 * It looks for a Base64 string that decodes to something starting with "Salted__".
 * @param {string} value The value to check.
 * @returns {boolean} True if the value appears to be encrypted, false otherwise.
 */
function isLikelyEncrypted(value) {
    if (!value || typeof value !== 'string') {
        return false;
    }
    try {
        const bData = Buffer.from(value, 'base64');
        // "Salted__" is 8 bytes. Salt is 8 bytes. Minimum 16 bytes for prefix + salt.
        if (bData.length < 16) return false;
        const prefix = bData.slice(0, 8).toString('utf8');
        return prefix === 'Salted__';
    } catch (e) {
        // Not a valid base64 string or other error
        return false;
    }
}

/**
 * Encrypts specific keys' values in the .env file.
 * @param {string[]} keysToEncrypt An array of keys in the .env file whose values need encryption.
 * @param {string} encryptionMasterKey The master key to use for encryption.
 */
async function encryptEnvVars(keysToEncrypt, encryptionMasterKey) {
    if (!keysToEncrypt || keysToEncrypt.length === 0 || !encryptionMasterKey) {
        console.error("Error: Please provide comma-separated .env variable key(s) to encrypt and the master encryption key.");
        console.log("Usage: node encrypt-env.js <ENV_VAR_KEY1,ENV_VAR_KEY2,...>");
        console.log("Example: node encrypt-env.js EMAIL_PASSWORD,DB_PASSWORD");
        return;
    }

    try {
        if (!fs.existsSync(envFilePath)) {
            console.error(`.env file not found at ${envFilePath}`);
            return;
        }

        let envContent = fs.readFileSync(envFilePath, 'utf8');
        let modified = false;

        keysToEncrypt.forEach(varKeyToEncrypt => {
            const regex = new RegExp(`^(${varKeyToEncrypt}=)(.*)$`, "m");
            envContent = envContent.replace(regex, (match, p1, p2) => {
                const key = p1.slice(0, -1); // Remove trailing '='
                const value = p2.trim();

                if (value === '' || value === null || typeof value === 'undefined') {
                    console.log(`Value for ${key} is empty. Skipping encryption.`);
                    return match;
                }

                if (isLikelyEncrypted(value)) {
                    console.log(`${key} already appears to be encrypted. Value: ${value.substring(0, 20)}...`);
                    return match;
                } else {
                    console.log(`Encrypting value for ${key}...`);
                    const encryptedValue = encrypt(value, encryptionMasterKey);
                    // console.log(`Original value for ${key}: '${value}'`);
                    console.log(`Encrypted value for ${key}: '${encryptedValue}'`);
                    modified = true;
                    return `${key}=${encryptedValue}`;
                }
            });
        });

        if (modified) {
            fs.writeFileSync(envFilePath, envContent, 'utf8');
            console.log(`Successfully updated .env file with encrypted values.`);
        } else {
            console.log(`No changes made to .env file. Values might already be encrypted or keys not found.`);
        }
    } catch (error) {
        console.error(`An error occurred: ${error.message}`, error.stack);
    }
}

// --- Script Execution ---
if (require.main === module) {
    const args = process.argv.slice(2);
    const keysString = "DB_PASSWORD,EMAIL_PASSWORD,JWT_SECRET";
    const masterKeyArg = getDefaultKey();
    if (keysString) {
        const keysToEncryptArr = keysString.split(',').map(key => key.trim()).filter(key => key);
        encryptEnvVars(keysToEncryptArr, masterKeyArg);
    } else {
        encryptEnvVars(null, null); // Will print usage instructions
    }
}

module.exports = { encryptEnvVars, isLikelyEncrypted };