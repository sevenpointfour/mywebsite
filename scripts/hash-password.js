const bcrypt = require('bcrypt');
const readline = require('readline');
require('dotenv').config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter the password to hash: ', (password) => {
  const saltRounds = 10;
  bcrypt.hash(password, saltRounds, function(err, hash) {
    if (err) throw err;
    console.log('\nYour hashed password is:');
    console.log(hash);
    console.log('\nCopy this hash and set it as the value for ADMIN_PASSWORD_HASH in your .env file.');
    rl.close();
  });
});