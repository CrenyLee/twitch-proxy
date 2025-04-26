// server.js
import express from 'express';
import puppeteer from 'puppeteer-core'; // Railway上用chrome-aws-lambda
import chromium from '@sparticuz/chromium-min'; // 專門for serverless環境

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/api', async (req, res) => {
  const channel = req.query.channel;
  if (!channel) {
    return res.status(400).json({ error: '缺少 channel 參數' });
  }

  let browser = null;

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    const url = `https://sullygnome.com/channel/${channel}/30`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // 等待頁面資料載入
    await page.waitForSelector('.col-lg-3.col-md-3.col-sm-6.col-6.text-center', { timeout: 20000 });

    // 抓取資料
    const data = await page.evaluate(() => {
      const stats = document.querySelectorAll('.col-lg-3.col-md-3.col-sm-6.col-6.text-center');
      const followers = stats[0]?.querySelector('div:nth-child(3) div')?.innerText?.replace(/,/g, '') || null;
      const avgViewers = stats[2]?.querySelector('div:nth-child(3) div')?.innerText?.replace(/,/g, '') || null;
      const peakViewers = stats[3]?.querySelector('div:nth-child(3) div')?.innerText?.replace(/,/g, '') || null;

      return {
        followers: followers ? parseInt(followers) : null,
        averageViewers: avgViewers ? parseInt(avgViewers) : null,
        peakViewers: peakViewers ? parseInt(peakViewers) : null,
      };
    });

    res.json(data);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error', message: error.message });
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
});

app.get('/', (req, res) => {
  res.send('Puppeteer Proxy Ready.');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
