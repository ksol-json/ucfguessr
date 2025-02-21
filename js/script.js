// Add this at the start of the file
const isMobile = window.innerWidth <= 768;

// --------------------
// Define Your Photo Lists for Each Difficulty
// --------------------
const easyPhotos = [
    "images/easy/IMG_7534.jpeg",
    "images/easy/IMG_7322.jpeg",
    "images/easy/IMG_2747.jpeg",
    "images/easy/IMG_1117.jpeg"
];

const mediumPhotos = [
    "images/medium/IMG_4257.jpeg",
    "images/medium/IMG_0128.jpeg",
    "images/medium/IMG_7859.jpeg",
    "images/medium/IMG_9438.jpeg",
    "images/medium/IMG_3440.jpeg"
];

const hardPhotos = [
    "images/hard/IMG_0425.jpeg",
    "images/hard/IMG_9488.jpeg", 
    "images/hard/IMG_1770.jpeg"
];

// Dark mode functionality
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    document.querySelector('.theme-button').textContent = theme === 'dark' ? '☀️' : '🌙';
}

function toggleDarkMode() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

// Initialize theme
const savedTheme = localStorage.getItem('theme') || 
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
setTheme(savedTheme);

document.addEventListener('keydown', function(event) {
    if (event.code === 'Space') {
        event.preventDefault();
        
        const nextRoundButton = document.getElementById('next-round');
        if (nextRoundButton.style.display !== 'none') {
            nextRoundButton.click();
            return;
        }
        
        const submitGuessButton = document.getElementById('submit-guess');
        if (!submitGuessButton.disabled) {
            submitGuessButton.click();
        }
    }
});

// --------------------
// Compute Daily Indices Based on Days Since Start
// --------------------
const epoch = new Date("February 20, 2025 00:00:00");  // Starting date (Day 0)
const now = new Date();
const daysSinceEpoch = Math.floor((now - epoch) / (1000 * 60 * 60 * 24));

// Use modulo so that the index cycles through each array
const dailyEasyIndex = daysSinceEpoch % easyPhotos.length;
const dailyMediumIndex = daysSinceEpoch % mediumPhotos.length;
const dailyHardIndex = daysSinceEpoch % hardPhotos.length;

// --------------------
// Build the Rounds Array for Today's Photos
// --------------------
const rounds = [
    { src: easyPhotos[dailyEasyIndex] },
    { src: mediumPhotos[dailyMediumIndex] },
    { src: hardPhotos[dailyHardIndex] }
];

// --------------------
// Game Variables & Setup
// --------------------
let currentRound = 0;
let totalScore = 0;
let roundScores = [];
let actualMarker = null;
let line = null;
let guessSubmitted = false;
let currentZoom = 1;
let isDragging = false;
let startX, startY, translateX = 0, translateY = 0;
let actualCoords;
let perfectRange = 30;
let isFirstLoad = true;

const imageWrapper = document.querySelector('.image-wrapper');

// --------------------
// Image Drag & Zoom Handlers
// --------------------
imageWrapper.addEventListener('mousedown', startDragging);
imageWrapper.addEventListener('touchstart', startDragging);
imageWrapper.addEventListener('mousemove', drag);
imageWrapper.addEventListener('touchmove', drag);
imageWrapper.addEventListener('mouseup', stopDragging);
imageWrapper.addEventListener('mouseleave', stopDragging);
imageWrapper.addEventListener('touchend', stopDragging);

function startDragging(e) {
    if (currentZoom <= 1) return;
    isDragging = true;
    if (e.type === 'mousedown') {
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
    } else if (e.type === 'touchstart') {
        startX = e.touches[0].clientX - translateX;
        startY = e.touches[0].clientY - translateY;
    }
    imageWrapper.style.cursor = 'grabbing';
}

function drag(e) {
    if (!isDragging || currentZoom <= 1) return;
    e.preventDefault();
    let currentX, currentY;
    if (e.type === 'mousemove') {
        currentX = e.clientX;
        currentY = e.clientY;
    } else if (e.type === 'touchmove') {
        currentX = e.touches[0].clientX;
        currentY = e.touches[0].clientY;
    }
    translateX = currentX - startX;
    translateY = currentY - startY;
    updateImageTransform();
}

function stopDragging() {
    isDragging = false;
    imageWrapper.style.cursor = 'grab';
}

function updateImageTransform() {
    const containerRect = imageWrapper.getBoundingClientRect();
    const images = document.querySelectorAll('.challenge-image');

    images.forEach(image => {
        if (isMobile && currentZoom === 1) {
            // At default zoom on mobile, remove translation to allow centering via CSS
            image.style.transform = 'scale(1)';
        } else {
            const scaledWidth = image.offsetWidth * currentZoom;
            const scaledHeight = image.offsetHeight * currentZoom;
            const maxX = Math.max(0, (scaledWidth - containerRect.width) / 2);
            const maxY = Math.max(0, (scaledHeight - containerRect.height) / 2);
            translateX = Math.max(Math.min(translateX, maxX), -maxX);
            translateY = Math.max(Math.min(translateY, maxY), -maxY);
            image.style.transform = `translate(${translateX}px, ${translateY}px) scale(${currentZoom})`;
        }
    });
}

function zoomIn() {
    if (currentZoom < (isMobile ? 4 : 8)) {  // Lower max zoom on mobile
        currentZoom = Math.min(currentZoom * 1.5, isMobile ? 4 : 8);
        updateImageTransform();
    }
}

function zoomOut() {
    if (currentZoom > 1) {
        const newZoom = Math.max(currentZoom / 1.5, 1);
        if (newZoom < 1.5) {
            translateX = 0;
            translateY = 0;
        }
        currentZoom = newZoom;
        updateImageTransform();
    }
}

// --------------------
// Map Setup
// --------------------
const map = L.map('map').setView([28.602053, -81.200421], isMobile ? 14 : 15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let userMarker = null;
map.on('click', function(e) {
    if (guessSubmitted) return;
    if (userMarker) {
        userMarker.setLatLng(e.latlng);
    } else {
        userMarker = L.marker(e.latlng, { draggable: true }).addTo(map);
    }
    userMarker.unbindPopup();
    userMarker.bindPopup("Your Guess", {
        permanent: true,
        offset: [0, -5],
        closeButton: false
    }).openPopup();
    document.getElementById("submit-guess").disabled = false;
});

// Add this after the map setup section
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
              Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000; // Convert to meters
}

// --------------------
// EXIF Coordinate Conversion
// --------------------
function convertDMSToDD(dms, ref) {
    const degrees = dms[0].numerator / dms[0].denominator;
    const minutes = dms[1].numerator / dms[1].denominator;
    const seconds = dms[2].numerator / dms[2].denominator;
    let dd = degrees + minutes / 60 + seconds / 3600;
    if (ref === "S" || ref === "W") {
        dd = dd * -1;
    }
    return dd;
}

// --------------------
// Game Logic
// --------------------
let activeImageIndex = 1;

function loadImage(imageUrl) {
    const currentImage = document.getElementById(`challenge-image-${activeImageIndex}`);
    const nextImage = document.getElementById(`challenge-image-${activeImageIndex === 1 ? 2 : 1}`);
    
    if (isFirstLoad) {
        // On first load, just show the image immediately
        currentImage.src = imageUrl;
        currentImage.classList.add('visible');
        currentImage.classList.remove('hidden');
        isFirstLoad = false;
        return;
    }
    
    // Normal crossfade for subsequent loads
    nextImage.src = imageUrl;
    nextImage.onload = () => {
        currentImage.classList.remove('visible');
        currentImage.classList.add('hidden');
        nextImage.classList.remove('hidden');
        nextImage.classList.add('visible');
        activeImageIndex = activeImageIndex === 1 ? 2 : 1;
    };
}

document.querySelectorAll('.challenge-image').forEach(img => {
    img.draggable = false;
    img.addEventListener('dragstart', function(e) {
        e.preventDefault();
    });
});

function loadRound() {
    const round = rounds[currentRound];
    const challengeImage = document.getElementById("challenge-image");
    
    // Create a temporary image to force a fresh load and EXIF extraction.
    const tempImg = new Image();
    // If your images are hosted on a different domain or require CORS, you might need this:
    tempImg.crossOrigin = "Anonymous"; 
    // Append a timestamp to prevent caching.
    const urlWithTimestamp = round.src + "?t=" + new Date().getTime();
    tempImg.src = urlWithTimestamp;
    
    // When the temporary image loads, extract EXIF data.
    tempImg.onload = function() {
        EXIF.getData(tempImg, function() {
            const lat = EXIF.getTag(tempImg, "GPSLatitude");
            const latRef = EXIF.getTag(tempImg, "GPSLatitudeRef") || "N";
            const lon = EXIF.getTag(tempImg, "GPSLongitude");
            const lonRef = EXIF.getTag(tempImg, "GPSLongitudeRef") || "W";
            if (lat && lon) {
                const latitude = convertDMSToDD(lat, latRef);
                const longitude = convertDMSToDD(lon, lonRef);
                actualCoords = { lat: latitude, lng: longitude };
                console.log("Extracted Coordinates for round " + (currentRound + 1) + ":", actualCoords);
            } else {
                console.error("No GPS data found in image: " + round.src);
            }
        });
        // Now update the displayed challenge image with the fresh URL.
        loadImage(urlWithTimestamp);
    };

    // Reset game state for the new round.
    currentZoom = 1;
    translateX = translateY = 0;

    // Reset transform styles on both challenge images on mobile to force centering at default zoom
    if (isMobile) {
        document.querySelectorAll('.challenge-image').forEach(img => {
            img.style.transform = 'scale(1)';
        });
    }

    updateImageTransform();
    map.setView([28.602053, -81.200421], 15);
    if (userMarker) map.removeLayer(userMarker);
    if (actualMarker) map.removeLayer(actualMarker);
    if (line) map.removeLayer(line);
    userMarker = null;
    actualMarker = null;
    line = null;

    document.getElementById("result").innerHTML = "";
    document.getElementById("next-round").style.display = "none";
    document.getElementById("submit-guess").style.display = "inline-block";
    document.getElementById("submit-guess").disabled = true;
    guessSubmitted = false;

    // Update round indicators.
    document.getElementById("round1-text").style.fontWeight = currentRound === 0 ? "bold" : "normal";
    document.getElementById("round2-text").style.fontWeight = currentRound === 1 ? "bold" : "normal";
    document.getElementById("round3-text").style.fontWeight = currentRound === 2 ? "bold" : "normal";
}

loadRound();

document.getElementById("submit-guess").addEventListener("click", function() {
    if (!userMarker) {
        alert("Please click on the map to place your guess.");
        return;
    }
    
    if (!actualCoords) {
        alert("Error: Location data not loaded. Please try again.");
        return;
    }

    guessSubmitted = true;
    const guessLatLng = userMarker.getLatLng();
    userMarker.dragging.disable();
    userMarker.unbindPopup();
    userMarker.bindPopup("Your Guess", {
        permanent: true,
        offset: [0, -5],
        closeButton: false
    }).openPopup();
    
    const distance = getDistance(guessLatLng.lat, guessLatLng.lng, actualCoords.lat, actualCoords.lng);
    let score = distance <= perfectRange ? 5000 : Math.round(5500 * Math.exp(-3 * (distance / 800)));
    score = distance > 1000 ? 0 : score;
    totalScore += score;
    roundScores.push(score);
    
    actualMarker = L.marker([actualCoords.lat, actualCoords.lng])
        .addTo(map)
        .bindPopup("Correct Location", {
            permanent: true,
            offset: [0, -5],
            closeButton: false
        })
        .openPopup();

    line = L.polyline([[guessLatLng.lat, guessLatLng.lng], [actualCoords.lat, actualCoords.lng]], {
        color: 'black',
        dashArray: '5, 5'
    }).addTo(map);

    // perfectRange m radius circle around the actual location
    /*
    L.circle([actualCoords.lat, actualCoords.lng], {
        radius: perfectRange,
        color: 'red',
        dashArray: '5, 5'
    }).addTo(map);
    */

    document.getElementById("result").innerHTML = `<p>Your guess is <strong>${Math.round(distance)} meters</strong> away${distance <= 50 ? '!' : '.'}<br>Score: <strong>${score}</strong></p>`;
    document.getElementById("submit-guess").style.display = "none";
    
    if (currentRound === rounds.length - 1) {
        document.getElementById("next-round").textContent = "See Results";
    } else {
        document.getElementById("next-round").textContent = "Next Round";
    }
    document.getElementById("next-round").style.display = "inline-block";
});

document.getElementById("next-round").addEventListener("click", function() {
    if (currentRound === rounds.length - 1) {
        showResults();
    } else {
        currentRound++;
        loadRound();
    }
});

// --------------------
// Results Popup Functions
// --------------------
function showResults() {
    document.getElementById("total-score").innerHTML = `Your total score: <strong>${totalScore}</strong> / 15000`;
    
    // Remove any existing progress bars
    const existingProgress = document.querySelector('.score-progress');
    if (existingProgress) {
        existingProgress.remove();
    }
    
    // Add progress bar HTML starting at 0% width
    const progressHTML = `
        <div class="score-progress">
            <div class="score-progress-bar" style="width: 0%"></div>
        </div>
    `;
    // Insert progress bar after total score
    document.getElementById("total-score").insertAdjacentHTML('afterend', progressHTML);
    
    // Get the progress bar element
    const progressBar = document.querySelector('.score-progress-bar');
    
    // Use setTimeout to trigger the animation after a short delay
    setTimeout(() => {
        const progressPercentage = (totalScore / 15000) * 100;
        progressBar.style.width = `${progressPercentage}%`;
    }, 50);
    
    document.getElementById("round-scores").innerHTML = `Easy: ${roundScores[0]}<br>Medium: ${roundScores[1]}<br>Hard: ${roundScores[2]}`;
    
    // Add the new text at the bottom of the results popup
    const newText = document.createElement('p');
    newText.textContent = "Come back tomorrow for a new challenge!";
    document.getElementById("round-scores").appendChild(newText);
    
    document.getElementById("results-popup").style.display = "block";
    document.getElementById("overlay").style.display = "block";
}

function closePopup() {
    document.getElementById("results-popup").style.display = "none";
    document.getElementById("overlay").style.display = "none";
}

function copyResults() {
    function getScoreRepresentation(score) {
        const greenSquares = Math.floor(score / 1000);
        const blackSquares = 5 - greenSquares;
        return '🟩'.repeat(greenSquares) + '⬛'.repeat(blackSquares);
    }

    const gameDay = daysSinceEpoch + 1;
    const shareText = `UCFGuessr ${gameDay} ${totalScore}/15000\n\n${getScoreRepresentation(roundScores[0])}\n${getScoreRepresentation(roundScores[1])}\n${getScoreRepresentation(roundScores[2])}\nucfguessr.xyz`;
    
    navigator.clipboard.writeText(shareText).then(() => {
        const copiedMessage = document.getElementById("copied-message");
        copiedMessage.style.visibility = "visible";
        copiedMessage.style.opacity = "1";
        setTimeout(() => {
            copiedMessage.style.opacity = "0";
            setTimeout(() => copiedMessage.style.visibility = "hidden", 300);
        }, 2000);
    });
}

// --------------------
// Help Popup Functions
// --------------------
function showHelp() {
    document.getElementById("help-popup").style.display = "block";
    document.getElementById("overlay").style.display = "block";
}

function closeHelp() {
    document.getElementById("help-popup").style.display = "none";
    document.getElementById("overlay").style.display = "none";
} 

// --------------------
// Date Functions
// --------------------
function formatDate(date) {
    const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    
    return `${month} ${day}, ${year}`;
}

// Set the current date in the header
document.getElementById('current-date').textContent = formatDate(new Date());

// Add touch event handlers for image panning
if (isMobile) {
    imageWrapper.addEventListener('touchstart', handleTouchStart, false);
    imageWrapper.addEventListener('touchmove', handleTouchMove, false);

    let xDown = null;
    let yDown = null;

    function handleTouchStart(evt) {
        const firstTouch = evt.touches[0];
        xDown = firstTouch.clientX;
        yDown = firstTouch.clientY;
    }

    function handleTouchMove(evt) {
        if (!xDown || !yDown) {
            return;
        }

        const xUp = evt.touches[0].clientX;
        const yUp = evt.touches[0].clientY;
        const xDiff = xDown - xUp;
        const yDiff = yDown - yUp;

        if (Math.abs(xDiff) > Math.abs(yDiff)) {
            if (xDiff > 0) {
                // swipe left
                translateX -= 10;
            } else {
                // swipe right
                translateX += 10;
            }
        } else {
            if (yDiff > 0) {
                // swipe up
                translateY -= 10;
            } else {
                // swipe down
                translateY += 10;
            }
        }

        updateImageTransform();
        xDown = null;
        yDown = null;
    }
}