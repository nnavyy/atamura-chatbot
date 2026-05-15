require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function main() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  const modelsToTest = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.5-flash'];
  
  for (const modelName of modelsToTest) {
    console.log(`Testing ${modelName}...`);
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Test message");
      console.log(`  Success! Response: ${result.response.text().trim()}`);
    } catch (error) {
      console.log(`  Failed: ${error.message.split('\n')[0]}`);
    }
  }
}

main();
