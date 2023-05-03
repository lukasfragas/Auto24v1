**Auto24.ee Web Scraper**

This is a web scraper that extracts data about passenger cars and SUVs listed on Auto24.ee, a popular used car selling platform in Estonia. The script uses Puppeteer to automate the browsing and scraping process, and it can be configured to send an email notification when a new car matching the search criteria is found.


**Prerequisites**

Node.js v12 or later installed on your computer.

A Gmail account to use for sending email notifications.

(Optional) ProtonVPN desktop app to prevent your IP address from being blocked during testing.

(Optional) JetBrains IDE to run the script on low-performance computers.

(Optional) If you want to see the browser window while running the script, set headless: 'false' when launching Puppeteer.




**How to use**

Clone the repository to your local machine "git clone URL".

Install the dependencies by running npm install "dependency name" in the terminal.

Set up environment variables for your Gmail account credentials and the recipient email address:

    EMAIL_USER: your Gmail email address
    EMAIL_PASS: your Gmail password or an app password if you have 2FA enabled
    EMAIL_TO: the recipient email address for notifications

Configure the search parameters in searchParams.js to match your vehicle criteria.

Run the script by running npm start in the terminal

The script will start browsing Auto24.ee and extract the data about newly listed cars that match your searchParams criteria. If a match is found, an email notification will be sent to the recipient email address.

The script will run indefinitely until you stop it. Press "ctrl + C" in the terminal to terminate the script.




**Important points from the code**

The script navigates to https://eng.auto24.ee/kasutatud/nimekiri.php?bn=2&a=101102&ssid=98937306&ae=1&af=50&otsi=search&ak=0 to scrape newly listed passenger cars and SUVs. The &af= parameter can be changed to show a different number of results per page (20, 50, 100), or navigate to the website, change search parameters and replace the link.

The getRandomInterval() function determines a random interval between 60 and 300 seconds to wait before reloading the page to avoid being detected as a bot. Currently it is set to re-launch the script from 30 to 600 seconds (1 to 5 minutes). Change the interval as you please.

The scheduleJob() function schedules the script to run at random intervals and logs the time until the next run.

The headless: 'false' option can be used to show the browser window while running the script. This is useful for debugging and testing.

To prevent your IP address from being blocked during testing, you can use a VPN such as the ProtonVPN desktop app.

If you have a low-performance computer, you can use JetBrains IDE to run the script.

The search results are saved to searchResults.json file in a JSON format.
