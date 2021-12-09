// Author -> Ayush Mangore
// In this project I have created youtube playlist analyzer with the help of puppeteer module
// of node, for this purpose I have used a random youtube playlist which contains more that 500 
// videos and tried to grab information like title and the duration of each video

// First step is to require the puppeteer module
// Here pdfkit is also imported to make final pdf conataining information about the playlist
// And fs module will be used for file creation and manipulation
const puppeteer = require('puppeteer');
const pdfkit = require('pdfkit');
const fs = require('fs');
// This is the link of youtube playlist which we will scrap
const link = "https://www.youtube.com/playlist?list=PLzkuLC6Yvumv_Rd5apfPRWEcjf9b1JRnq"

let cTab;
// Used async and await
// -> An async function is a function declared with the async keyword, 
// and the await keyword is permitted within them. The async and await 
// keywords enable asynchronous, promise-based behavior to be written in a 
// cleaner style, avoiding the need to explicitly configure promise chains
(async function(){
    // we will encapsulate our code within try catch block to handle error properly
    try {
        // Now we will launch our chromium browser and provide some default attributes in the form of object
        let browserOpen = puppeteer.launch({
            headless : false,
            defaultViewport : null,
            args : ['--start-maximized']
        })

        // we will await for browser opening event by default it will open new tab
        let browserInstance = await browserOpen;
        // we will store all the taps in an array
        // we want to work in default tap therefore we will save instance of first tab in our global variable
        let allTabsArr = await browserInstance.pages();
        cTab = allTabsArr[0];
        // Now we will open that youtube link
        // we have a funtion in puppeteer for doing the same called goto
        // we will provide the link and await for this event to happen
        await cTab.goto(link);
        // once we will reach to our main page, we will grab the tile of the playlist
        // we have the html selector for that we will simply pass our html selector in function
        // called waitForSelector and await for this event to happen
        await cTab.waitForSelector("h1#title");
        // Now we will grab the inner text of our html element, for doing this we have a function called evaluate
        // Puppeteer pages have a handy evaluate() function that lets you execute JavaScript in the 
        // Chrome window. The evaluate() function is the most flexible way to interact with Puppeteer, 
        // because it lets you control Chrome using browser APIs like document
        // This function will take two arguments one is our function and second is our html element tag
        // In first parameter we will pass the function and mention how we will use the second argument
        let name = await cTab.evaluate(function(select){return document.querySelector(select).innerText},"h1#title");
        // Comment below line to see the name of the playlist
        // console.log(name);
        
        // Now our prior task is to find how many videos are there in the playlist, so we have found a html tag for 
        // doing that which contains information about the playlist we will use it again with the same evaluate function
        // we will pass function as first parameter and our html tag in second parameter and will specify in function
        // how we will use our second parameter
        let alldata = await cTab.evaluate(getData,"#stats .style-scope.ytd-playlist-sidebar-primary-info-renderer");
        // no of videos and no of views will be returned and stored in the above variable called alldata
        //below line is to view name and rest information
        console.log(name,alldata.noOfVideos, alldata.noOfViews);
        // Now we need number of total videos for this we will sipmply split our no of videos string 
        // through spaces and our first array element is the no of videos therefore we will store it in a variable
        let totalVideos = alldata.noOfVideos.split(" ")[0];
        // we will print the total number of videos
        console.log(totalVideos);

        // Now here our main task begins, we will find the length of the current view
        let currentVideos = await getCVideosLength();
        console.log(currentVideos);
        // until difference between our total videos is more than zero will iterate and scroll our view
        while(totalVideos-currentVideos > 0){
            // to load the whole we as we use to scroll our you tube similarily we need to scroll our
            // view, we will do this in separate function and await for this event
            await scrollToBottom();
            // we will keep of increasing the count of cuurnet videos by scrolling our view and finally when all the videos are scrolled
            // upto the bottom of the page then our loop will end
            currentVideos = await getCVideosLength();
            // comment below line to view the size of the scrolled view
            // console.log(totalVideos-currentVideos);
        }
        
    
        // This is the function called get stats which will scrap all the information regarding our videos in the playlist
        // we have already solved that fragment problem by scroll all the view upto bottom therefore till now we have reached the bottom of our page
        // So we may now begin to scrap the information
        // finally a complete list will be returned in which at each index we have two fields one os the title of the video and another
        // is the duration 
        let finalList = await getStats();
        // Uncomment below line to view the list
        // console.log(finalList);

        // After collecting all the data it's time to generate our pdf
        // first we make an instance of our pdfkit
        let pdfDoc = new pdfkit;
        // now we have function called pipe in which we will create a write stram with the help of fs module
        // and also we will pass the name that we want to keep of our pdf
        pdfDoc.pipe(fs.createWriteStream('Playlist.pdf'));
        // After we have created our pdf file we will write our text into it, but we have data in the form of an array
        // therefore we need to convert it into text we have a method of JSON called stringify we will use it
        pdfDoc.text(JSON.stringify(finalList));
        // Funaaly we will end this process and our pdf will be generated
        pdfDoc.end();

    } catch (error) {
        console.log(error);
    }
})()


function getData(selector){
    // a selector which is basically a html tag has been passed to this function
    // we have a predefined function to select multiple tags associated within the html element
    // called queryselectorall we will use it by passing our selector as its argument
    // so it will return an array of html element. In the main page there are four html elements so we
    // will get four elements but we have meaningful data in two of them only therefore we will
    // select those two and grab their inner text in variables
    let allElements = document.querySelectorAll(selector);
    let noOfVideos = allElements[0].innerText;
    let noOfViews = allElements[1].innerText;
    // finally we will return an object containing information like no of videos and no of views
    return {noOfVideos,noOfViews};
}


async function scrollToBottom(){
    // we have to scroll for this we can use evaluate function and pass another function as as argument and will await for this event
    await cTab.evaluate(goToBottom);
    function goToBottom(){
        // we have our global window object and it's method called scroll by which takes two arguments one is x-coord and another is y-coord
        // as we want to scroll vertically we will pass only second argument as the height of the complete view
        window.scrollBy(0,window.innerHeight);
    }
}

async function getStats(){
    // we have two html elements one containing the title of each video in the playlist and another the duration of each video
    // we can pass these html elements in our evelauate function and also we will pass our main function in first argument which will
    // make use of these selectors and finally a list will be returned 
    let list = cTab.evaluate(getNameAndDuration,"#video-title","#container>#thumbnail span.style-scope.ytd-thumbnail-overlay-time-status-renderer");
    return list;
}

function getNameAndDuration(videoSelector,durationSelector){
    // there are two selectors one of title and another for duration
    // we will select all the html elements containing title and duration which are currently in our view
    let videoElem = document.querySelectorAll(videoSelector);
    let durationElem = document.querySelectorAll(durationSelector);

    // we have created a list to store the information
    let currentList = []

    for(let i=0; i<durationElem.length; i++){
        // now we will iterate through ecah element
        // and we will select the title inner text and duration and push it to our array
        // we will keep on doing this for the all elements
        let videoTitle = videoElem[i].innerText;
        let duration = durationElem[i].innerText;
        currentList.push({videoTitle,duration});
    }
    // Finally we will return our list
    return currentList;
}

async function getCVideosLength(){
    // below is the html element whcih contains the duration of each video through this element we can find the total length of our view
    let length = await cTab.evaluate(getLength,"#container>#thumbnail span.style-scope.ytd-thumbnail-overlay-time-status-renderer");
    return length;
}

function getLength(durationSelect){
    // we have passed a selector which contains the duration of each video in the playlist
    // actually what happens is puppeteer work will only those views which currently loaded in our main page
    // we have observed this in many sites that not all the content gets loaded at once it comes in the form of 
    // fragments so we are selecting the total length of all that fragment 
    let durationElem = document.querySelectorAll(durationSelect);
    // finally we will return it
    return durationElem.length;
}
