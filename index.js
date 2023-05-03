import puppeteer from 'puppeteer-extra';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';
import cron from 'cron';
import schedule from 'node-schedule';
import fs from 'fs';
import nodemailer from "nodemailer";
puppeteer.use(AdblockerPlugin());

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_TO = process.env.EMAIL_TO;

import searchParams from './ricardui/searchCars.js';

// https://www.youtube.com/watch?v=ud3j4bCUD50&t=305s&ab_channel=bufahad
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    type: "login", // add this line
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
  authMethod: "PLAIN", // add this line
});

async function sendEmail(to, subject, text) {
  try {
    const mailOptions = {
      from: "Gediminas Vilbeta <info.vilbeta@gmail.com>",
      to,
      subject,
      text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`sending email from ${EMAIL_USER} to ${EMAIL_TO}`);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}


const currentTime = new Date();

async function scrapeVehicleData() {

  console.log(`${currentTime.toLocaleString(undefined, {hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false})} Starting script........`);
  
  async function extractVehicleData(vehicle) {
    const data = await vehicle.evaluate((el, searchParams) => {
      // Extract all the required information inside the evaluate() function
      const id = el.getAttribute('data-hsh');

      const titleEl = el.querySelector('.title .main');
      const title = titleEl ? titleEl.textContent.trim() : null;

      const make = title ? title.split(' ')[0] : 'n/a';

      const model = title ? title.split(' ')[1] : 'n/a';

      const engineEl = el.querySelector('.title .engine');
      const engine = engineEl ? engineEl.textContent.trim() : 'n/a';

      const yearEl = el.querySelector('.extra .year');
      const year = yearEl ? yearEl.textContent.trim() : 'n/a';

      const fuelTypeEl = el.querySelector('.extra .fuel, .extra .fuel_short_icon');
      const fuelType = fuelTypeEl ? fuelTypeEl.textContent.trim() : 'n/a';

      const transmissionEl = el.querySelector('.extra .transmission, .extra .transmission_short_icon');
      const transmission = transmissionEl ? transmissionEl.textContent.trim() : 'n/a';

      const linkEl = el.querySelector('a.row-link');
      const link = linkEl ? `https://eng.auto24.ee${linkEl.getAttribute('href')}` : 'n/a';

      // Normalize search parameters and extracted data
      const normalize = (value) => value?.toLowerCase()?.replace(/[^a-z0-9]/g, '') ?? 'n/a';

      const normalizedSearchParams = {
        make: normalize(searchParams.make),
        model: normalize(searchParams.model),
        engine: normalize(searchParams.engine),
        year: normalize(searchParams.year),
        fuelType: normalize(searchParams.fuelType),
      };

      const normalizedData = {
        make: normalize(make),
        model: normalize(model),
        engine: normalize(engine),
        year: normalize(year),
        fuelType: normalize(fuelType),
      };

      // Check if the normalized data matches the normalized search parameters
      let isMatch = true;
      for (const key in normalizedSearchParams) {
        if (normalizedSearchParams[key] !== normalizedData[key]) {
          isMatch = false;
          break;
        }
      }

      return {
        id,
        make,
        model,
        engine,
        year,
        fuelType,
        transmission,
        link,
      };
    }, searchParams);

    return data;
  }


  puppeteer.launch({
    headless: true, // Change headless to true
    args: [
      '--disable-gpu',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process', // Remove '--start-maximized',
      '--disable-extensions',
      '--disable-images',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-web-security',
    ],
    timeout: 0,
  }).then(async (browser) => {
    const currentTime = new Date();
    const startTimeBrowser = new Date();
    
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(0); // Increase the default navigation timeout
    await page.setViewport({ width: 1366, height: 768 });
    console.log(`${currentTime.toLocaleString(undefined, {hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false})} Extracting vehicles........`);
    
    await page.goto('https://eng.auto24.ee/kasutatud/nimekiri.php?bn=2&a=101102&ssid=98937306&ae=1&af=50&otsi=search&ak=0', { waitUntil: 'networkidle0' }); // ANY TRANSPORT TO CHECK IF IT BREAKS!
    
    const endTimeBrowser = new Date();

    // console.log(`${currentTime.toLocaleString(undefined, {hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false})} Waiting for cookies popup...`);
    await page.waitForSelector('#onetrust-accept-btn-handler', { timeout: 20000 });
    
    // console.log(`${currentTime.toLocaleString(undefined, {hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false})} Cookies popup found. Waiting for 1 second...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // console.log(`${currentTime.toLocaleString(undefined, {hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false})} Clicking accept button on cookies popup...`);

    await page.click('#onetrust-accept-btn-handler');

    async function isVehicleListVisible() {
      // console.log(`${currentTime.toLocaleString(undefined, {hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false})} Checking if vehicle list is visible after accepting cookies...`);

      const vehicleList = await page.$(".result-row");
      return vehicleList !== null;
    }

    const isListVisible = await isVehicleListVisible();
    if (isListVisible) {
      // console.log(`${currentTime.toLocaleString(undefined, {hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false})} Vehicle list is visible!!!`);
    } else {
      console.error("Error: Vehicle list is not visible after accepting cookies.");
    }
    
    const vehicleElements = await page.$$('.result-row');
    // console.log(`${currentTime.toLocaleString(undefined, {hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false})} Found ${vehicleElements.length} vehicle elements.`);

    const vehicleDataPromises = vehicleElements.map(element => extractVehicleData(element));
    const vehicles = await Promise.all(vehicleDataPromises);
    
    async function isVehicleIdInJson(vehicleId, filePath) {
      try {
        const fileContents = await fs.promises.readFile(filePath, 'utf8');
        const jsonData = JSON.parse(fileContents);
        return jsonData.some((vehicle) => vehicle.id === vehicleId);
      } catch (error) {
        console.error(`Error reading file '${filePath}':`, error);
        return false;
      }
    }

    
    for (const vehicleData of vehicles) {
      if (!vehicleData || !vehicleData.make || !vehicleData.model || !vehicleData.engine || !vehicleData.year || !vehicleData.fuelType) {
        continue;
      }
    
      for (const searchParam of searchParams) {
        const makeMatch = !searchParam.make || vehicleData.make.includes(searchParam.make);
        const modelMatch = !searchParam.model || vehicleData.model.includes(searchParam.model);
        const yearMatch = !searchParam.years || searchParam.years.includes(vehicleData.year);
    
        if (makeMatch && modelMatch && yearMatch) {
          const engineMatch = !searchParam.engines || searchParam.engines.some(
            (engineData) =>
              (!engineData.engine || vehicleData.engine.includes(engineData.engine)) &&
              (!engineData.fuelType || vehicleData.fuelType.includes(engineData.fuelType))
          );
    
          if (engineMatch) {
            if (await isVehicleIdInJson(vehicleData.id, 'searchResults.json')) {
              console.log(`Vehicle ID already printed: ${vehicleData.id}, ${vehicleData.link}`);
            } else {
              console.log(
                `ITS A MATCH: ${vehicleData.id}, ${vehicleData.make}, ${vehicleData.model}, ${vehicleData.engine.replace(
                  "kW",
                  ""
                ).trim()}, ${vehicleData.year}, ${vehicleData.fuelType}, ${vehicleData.transmission}, ${vehicleData.link}`
              );
    
              // Send Email
              const emailText = `ID: ${vehicleData.id}
              Make: ${vehicleData.make}
              Model: ${vehicleData.model}
              Engine: ${vehicleData.engine}
              Year: ${vehicleData.year}
              Fuel Type: ${vehicleData.fuelType}
              Transmission: ${vehicleData.transmission}
              Link: ${vehicleData.link}`;
    
              await sendEmail(EMAIL_TO, vehicleData.id, emailText);
            }
          }
        }
      }
    }
    
    fs.writeFileSync('searchResults.json', JSON.stringify(vehicles, null, 2));
    await browser.close();
    console.log(`Completed in ${(endTimeBrowser - startTimeBrowser) / 1000}s!, results at "searchResults.json" ✨✨✨`);
  });
}

await scrapeVehicleData();

const intervals = [
  { start: '0 5 * * *', end: '10 10 * * *', min: 3, max: 6  },
  { start: '0 10 * * *', end: '0 12 * * *', min: 3, max: 6 },
  { start: '0 12 * * *', end: '0 14 * * *', min: 1, max: 3 },
  { start: '0 14 * * *', end: '0 17 * * *', min: 3, max: 6 },
  { start: '0 17 * * *', end: '0 19 * * *', min: 1, max: 3 },
  { start: '0 19 * * *', end: '0 23 * * *', min: 3, max: 6 },
  { start: '0 23 * * *', end: '0 5 * * *', min: 3, max: 6 },
];


const now = new Date();

function getRandomInterval(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour12: false });
}

function scheduleJob() {
  const intervalSeconds = getRandomInterval(60, 300);
  const interval = intervalSeconds * 1000; // Convert to milliseconds

  setTimeout(() => {
    const now = new Date();
    const nextRun = new Date(now.getTime() + interval);
    console.log(`${formatTime(now)} `);
    scrapeVehicleData();
    console.log(`Next scheduled run: ${formatTime(nextRun)}`);
    console.log(`Time to the next run: ${intervalSeconds} seconds`);
    scheduleJob(); // Reschedule the job after the current one has run
  }, interval);

  console.log(`Job scheduled to run in ${intervalSeconds} seconds`);
}

scheduleJob();