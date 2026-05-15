const https = require('https');

https.get('https://keruen.atamuragroup.kz/', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const urls = data.match(/https:\/\/[^\s"'<>]+\.(png|jpg|jpeg|webp)/g);
    if (urls) {
      const uniqueUrls = [...new Set(urls)];
      console.log(uniqueUrls.filter(u => u.includes('tildacdn') || u.includes('atamuragroup')).join('\n'));
    }
  });
});
