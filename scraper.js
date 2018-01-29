/*****************************************
Treehouse Fullstack Javascript Techdegree,
project #6: "Content Scraper"
by Ole Petter Baugerød Stokke
www.olepetterstokke.no/treehouse/project6
******************************************
Node.js command line application for scraping
shirts4mike.com for prices of 8 shirts, saving
them to a CSV-file, using NPM modules.
*****************************************/

console.log("--- Content Scraper 1.0 ---");

//dependencies (using only two third party NPM packages, as instructed)
const fs = require('fs');				//file system
const http = require('http');			//used for statuscodes only
const Crawler = require("crawler");		//HTTP requests and DOM traversal for scraping
const json2csv = require('json2csv');	//converting to CSV for file saving

//where to start the scrape, and how many items to scrape
const entrypoint = 'http://www.shirts4mike.com/shirt.php';
const shirtsToScrape = 8;

//setting up the crawlers from the crawler module
const urlCrawler = new Crawler ();
const shirtCrawler = new Crawler ();

//start scraping, from entrypoint
getShirtUrls(entrypoint);

/* getShirtUrls (url to scrape)
Crawl the entrypoint for URLs to the shirts we want to scrape.
	1. We'll make a request to the entrypoint, getting all HTML out in Jquery form.
	2. URLs will be found in the href of the first link in the .products classes.
	3. All URLs will be added to the shirtUrls array.
	4. Once the length of this array equals shirtsToScrape, we will start scraping those URLs. */

function getShirtUrls (url) {
	console.log('Getting shirt URLs from ' + url);

	//start the crawler at url
	urlCrawler.direct({ 
		uri: url,
		skipEventRequest: false,
		callback : function (error, response) {
			
			//proceed if no errors
			if (response.statusCode === 200 && !error) {
				var shirtUrls = []; //empty array for storing URLs
				var $ = response.$; //get all HTML in Jquery format
				
				//find the URLs, and loop thru them
				$('.products').find('a').each(function() {
					shirtUrls.push($(this).attr('href')); //store them in the array
					
					//check if we now have all the URLs we need
					if (shirtUrls.length === shirtsToScrape) { //yes, we do
						console.log("All shirt URLs collected!");
						scrapeShirts(shirtUrls); //go to scraping the shirtUrls we've found
					} //if not, loop will continue
				});
			}
			
			//there's been an error
			else {
				handleError(url, response.statusCode, error); //handle it
			}
		}
	});
}

/* scrapeShirts (array of URLs to scrape)
Scrape each shirt for the information we're after.
	1. We'll make a request to each shirtUrl from getShirtUrls, getting all HTML in Jquery form.
	2. A shirt object for each shirtUrl will be pushed to the shirts array.
	3. All shirt info will be gathered from both the DOM and other sources as needed.
	4. When the length of the shirts array equals the length of the shirtUrls array, we'll write them to a file. */

function scrapeShirts (shirtUrls) {
	console.log('Scraping shirts.');

	var rootUrl = entrypoint.replace(/\/[^/]+\/?$/, ""); //the root of the entrypoint, for further use
	var shirts = []; //empty array for storing shirt objects

	//loop thru all shirtUrls
	shirtUrls.forEach (function (shirtUrl) {
		
		//start the crawler for current shirt
		shirtCrawler.direct({
			uri: rootUrl + '/' + shirtUrl,
			skipEventRequest: false,
			callback : function (error, response) {

				//proceed if no errors
				if (response.statusCode === 200 && !error) {
					var $ = response.$; //get all HTML in Jquery format
				
					//push a new shirt object to the shirts array, scraping each shirtUrl for needed info
					shirts.push({
						Title: $('head').children().first().text(),
						Price: $('.price').text(),
						ImageURL: rootUrl + '/' + $('.shirt-picture').children().children().attr('src'),
						URL: response.request.uri.href, //get current URL from response object
						Time: new Date().toUTCString() //get current time from Date object
					});

					//check if we have all the shirt objects we need
					if (shirts.length === shirtUrls.length) { //yes, we do
						console.log('All shirts scraped!');
						writeToFile(shirts); //write them to file
					} //if not, loop will continue
				} 	
				
				//there's been an error
				else {
						handleError(shirtUrl, response.statusCode, error); //handle it
				}
			}
		});
	});
}

/* writeToFile(array of objects to write)
Write all the scraped shirts to a csv file.
	1. We'll check for /data directory for storing the files, and create if needed.
	2. The filename will be named after the current date.
	3. The json2scv module will convert our array of objects to SCV format. 
	4. When this is done, the file will be written. */

function writeToFile (shirts) {
	console.log("Writing shirts to file.");

	//check if the data folder is present
	const dataDir = "./data";
	if (!fs.existsSync(dataDir)){ //no, it's not
		fs.mkdirSync(dataDir); //so create it
		console.log(dataDir + " folder not found, created.");
	} else { //yes, it is
			console.log(dataDir + " folder found.");
		}

	//prep a CSV-filename named after the current date
	const date = new Date (); 
	const filename = date.getFullYear() + '-' + (date.getMonth()+1) + '-' + date.getDate() + '.csv';
	const fullFilename = dataDir + '/' + filename;

	//prep the file, using json2csv to convert array of objects (JSON) to SVC
	const fields = ['Title', 'Price', 'ImageURL', 'URL', 'Time']; //the CSV fields, much match the names in the objects
	const csv = json2csv({ data: shirts, fields: fields }); //the actual conversion

	//write the file
	fs.writeFile(fullFilename, csv, function(err) {
		if (err) {
			console.error('Failed to write ' + fullFilename);
		} else {
			console.log('All shirts written to ' + fullFilename);
		}
	});
}

/* handleError (URL that fails, the statuscode, the error object if any)
Make errors more human readble, and log them to a file. 
	1. Not all errors from the Crawler module have actual error objects. If so, we'll deal with them first.
	2. We'll compose a complete error statement, including statusCodes with explanations, and error.messages if any.
	3. This is sent to the console for user to read.
	4. The same statement, including date, is then appended to a scraper-error.log file. */

function handleError (url, statusCode, error) {

	//is there an actual error object? (can occur when handleError is called because of wrong statusCode only)
	if (error === null) {
		error = "[undefined]";	//no; set error message to undefined
	} else {
		error = error.message;	//yes; set error message to the actual error.message
	}

	//preparing the error outputs for console.log and the scraper-error.log file
	let fullError = 'Error reaching ' + url + '! (' +
					'Statuscode: ' + statusCode + ' (' + http.STATUS_CODES[statusCode] + ') ' +
					'| Errormessage: ' + error + ')';
	let logMessage = new Date().toUTCString() + ': ' + fullError + '\n';

	//output error to console (Crawler will also output an error above this, unfortunately)
	console.error(fullError);

	//append error to the log file (will be created if not present allready)
	fs.appendFile('scraper-error.log', logMessage, function (err) {
		if (err) {
			console.error('(Failed to write error to file: ' + err + ')');
		} else {
			console.log('(Error logged to file.)');
		}
	});
}