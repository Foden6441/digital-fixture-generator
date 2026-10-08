const fs = require('fs');
const path = require('path');

const envContent = `DATABASE_URL="mysql://root:@localhost:3306/fixture_generator"
NEXTAUTH_SECRET="digital-fixture-generator-secret-key-2024-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
`;

const envPath = path.join(__dirname, '.env');

fs.writeFileSync(envPath, envContent);

console.log('.env file created successfully!');
console.log('Note: If your MySQL has a password, please edit the .env file and add your password after "root:"');
