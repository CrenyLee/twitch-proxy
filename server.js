const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const PORT = process.env.PORT || 8000;

app.get('/api', async (req, res) => {
  const channel = req.query.channel;
  if (!channel) {
    return res.status(400).json({ error: 'Missing channel' });
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36');
    const url = `https://twitchtracker.com/${channel}`;

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const data = await page.evaluate(() => {
      const getTextAfterIcon = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.innerText.replace(/,/g, '').trim() : null;
      };

      const followers = getTextAfterIcon('.fa-heart + span');
      
      const avgViewersRow = Array.from(document.querySelectorAll('table td')).find(td => td.innerText.includes('Avg. viewers'));
      const peakViewersRow = Array.from(document.querySelectorAll('table td')).find(td => td.innerText.includes('Peak viewers'));
      
      const averageViewers = avgViewersRow ? avgViewersRow.nextElementSibling.innerText.replace(/,/g, '').trim() : null;
      const peakViewers = peakViewersRow ? peakViewersRow.nextElementSibling.innerText.replace(/,/g, '').trim() : null;

      return {
        followers,
        averageViewers,
        peakViewers
      };
    });

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    await browser.close();
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
