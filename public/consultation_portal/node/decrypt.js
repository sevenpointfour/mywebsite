const crypto = require('crypto');
const os = require('os');
const path = require('path');

function decrypt(text, key) {
  const bData = Buffer.from(text, 'base64');
  // Extract salt and IV from OpenSSL-compatible encrypted string
  const salt = bData.slice(8, 16); // after "Salted__"
  const data = bData.slice(16);

  // Key and IV derivation (OpenSSL-style)
  const keyIv = crypto.pbkdf2Sync(key, salt, 10000, 32 + 16, 'sha256');
  const aesKey = keyIv.slice(0, 32);
  const iv = keyIv.slice(32);

  const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, iv);
  let decrypted = decipher.update(data, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function encrypt(text, key) {
    // Generate a random salt
    const salt = crypto.randomBytes(8);

    // Key and IV derivation (OpenSSL-style)
    const keyIv = crypto.pbkdf2Sync(key, salt, 10000, 32 + 16, 'sha256');
    const aesKey = keyIv.slice(0, 32);
    const iv = keyIv.slice(32);

    const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, iv);
    let encrypted = cipher.update(text, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    // Format as OpenSSL-compatible encrypted string ("Salted__<salt><encrypted_data>")
    const result = Buffer.concat([Buffer.from("Salted__"), salt, encrypted]);
    return result.toString('base64');
}

function getDefaultKey() {
    // Only return the home directory name if not in production mode.
    if (process.env.NODE_ENV === 'production') {
        return null; 
    }
    return path.basename(os.homedir());
}

if (require.main === module) {
    const testText = "This is a secret message!";
    const testKey = "mySuperSecretKey123";
    const homeDirKey = getDefaultKey();

    console.log("Original Text:", testText);

    const encryptedText = encrypt(testText, testKey);
    console.log("Encrypted Text:", encryptedText);

    const decryptedText = decrypt(encryptedText, testKey);
    console.log("Decrypted Text:", decryptedText);

    if (testText === decryptedText) {
        console.log("SUCCESS: Encryption and decryption successful. Original and decrypted texts match.");
    } else {
        console.error("FAILURE: Encryption and decryption failed. Texts do not match.");
    }

    console.log("\n--- Testing with default key (home directory name) ---");
    console.log("Using default key:", homeDirKey);

    const encryptedTextDefault = encryptWithDefaultKey(testText);
    console.log("Encrypted Text (default key):", encryptedTextDefault);

    const decryptedTextDefault = decryptWithDefaultKey(encryptedTextDefault);
    console.log("Decrypted Text (default key):", decryptedTextDefault);

    if (testText === decryptedTextDefault) {
        console.log("SUCCESS: Default key encryption and decryption successful.");
    } else {
        console.error("FAILURE: Default key encryption and decryption failed.");
    }
}

module.exports = {
    decrypt,
    encrypt,
    getDefaultKey
};