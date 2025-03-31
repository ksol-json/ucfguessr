const isMobile = window.innerWidth <= 768;

let isImageLoaded = false;

function showNotification(message) {
    let notification = document.querySelector('.notification-popup');
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'notification-popup';
        document.body.appendChild(notification);
    }
    
    notification.textContent = message;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function createConfetti() {
    return {
        x: Math.random() * window.innerWidth,
        y: -150,
        size: Math.random() * 6 + 4,
        speed: Math.random() * 3 + 2,
        color: `hsl(${Math.random() * 360}, 80%, 60%)`,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10
    };
}

let confetti = [];
let confettiActive = false;
const canvas = document.getElementById('confetti-canvas');
const ctx = canvas.getContext('2d');

function startConfetti() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    confetti = Array(300).fill().map(createConfetti);
    confettiActive = true;
    animateConfetti();
}

function animateConfetti() {
    if (!confettiActive) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    let stillActive = false;
    confetti.forEach(particle => {
        particle.y += particle.speed;
        particle.rotation += particle.rotationSpeed;
        
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate((particle.rotation * Math.PI) / 180);
        
        ctx.fillStyle = particle.color;
        ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
        
        ctx.restore();
        
        if (particle.y < canvas.height) {
            stillActive = true;
        }
    });
    
    if (stillActive) {
        requestAnimationFrame(animateConfetti);
    } else {
        confettiActive = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

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

const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight'];
let konamiIndex = 0;
let konamiCodeActivations = 0;

// Key handlers
document.addEventListener('keydown', function(event) {
    if (event.key === konamiCode[konamiIndex]) {
        konamiIndex++;
        if (konamiIndex === konamiCode.length) {
            konamiCodeActivations++;
            document.querySelector('.coverage-button').style.display = 'flex';
            
            if (konamiCodeActivations === 1) {
                showNotification('Coverage mode unlocked!');
            } else if (konamiCodeActivations === 2) {
                showNotification('Full coverage mode unlocked!');
                if (coverageMarkersVisible) {
                    toggleCoverageMarkers();
                    toggleCoverageMarkers();
                }
            }
            if (konamiCodeActivations === 3) {
                showNotification('That was all. No more secrets modes.');
            } if (konamiCodeActivations === 4) {
                showNotification('Nothing else to see here.');
            } if (konamiCodeActivations === 5) {
                showNotification('I\'m serious. You can stop trying now.');
            } if (konamiCodeActivations === 6) {
                showNotification('Ok, going away now. No more secret messages.');
            } else if (konamiCodeActivations > 6) {
                showNotification('This text will keep repeating.');
            konamiIndex = 0;
            }
        }
    } else {
        konamiIndex = 0;
    }

    if (event.key === 'Escape') {
        closePopup();
        closeHelp();
        closeArchive();
    }
    
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
const epoch = new Date(Date.UTC(2025, 1, 22)); // February 22, 2025 00:00:00 UTC

function getETDate() {
    const now = new Date();
    const etOptions = { timeZone: 'America/New_York' };
    return new Date(now.toLocaleString('en-US', etOptions));
}

const etNow = getETDate();
const daysSinceEpoch = Math.floor((Date.UTC(etNow.getFullYear(), etNow.getMonth(), etNow.getDate()) - epoch.getTime()) / (1000 * 60 * 60 * 24));

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
let perfectRange = 25;
let isFirstLoad = true;
let currentDay = daysSinceEpoch + 1;  

const imageWrapper = document.querySelector('.image-wrapper');

// --------------------
// Zoom & Pan Functionality
// --------------------
let maxZoom = 7.5;

function updateImageTransform() {
    const containerRect = imageWrapper.getBoundingClientRect();
    const baseWidth = containerRect.width;
    const baseHeight = containerRect.height;
    const scaledWidth = baseWidth * currentZoom;
    const scaledHeight = baseHeight * currentZoom;
    const maxX = Math.max(0, (scaledWidth - containerRect.width) / 2);
    const maxY = Math.max(0, (scaledHeight - containerRect.height) / 2);
    
    translateX = Math.max(-maxX, Math.min(translateX, maxX));
    translateY = Math.max(-maxY, Math.min(translateY, maxY));
    
    const image = document.querySelector('.challenge-image.visible');
    if (image) {
        image.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${currentZoom})`;
        image.style.willChange = 'transform';
    }
}

function startDragging(e) {
    isDragging = true;
    if (e.type === 'mousedown') {
        startX = e.clientX;
        startY = e.clientY;
    } else if (e.type === 'touchstart') {
        e.preventDefault();
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    }
}

function drag(e) {
    if (!isDragging) return;
    
    let currentX, currentY;
    if (e.type === 'mousemove') {
        e.preventDefault();
        currentX = e.clientX;
        currentY = e.clientY;
    } else if (e.type === 'touchmove') {
        e.preventDefault();
        e.stopPropagation();
        if (e.touches.length !== 1) return;
        currentX = e.touches[0].clientX;
        currentY = e.touches[0].clientY;
    }
    
    // Add smoothing factor for more controlled movement
    const smoothing = 1.25;
    const dx = (currentX - startX) * smoothing;
    const dy = (currentY - startY) * smoothing;
    
    translateX += dx;
    translateY += dy;
    startX = currentX;
    startY = currentY;
    
    // Use requestAnimationFrame for smoother updates
    requestAnimationFrame(() => {
        updateImageTransform();
    });
}

function stopDragging() {
    isDragging = false;
}

function zoomIn() {
    const newZoom = Math.min(currentZoom * 1.5, maxZoom);
    const factor = newZoom / currentZoom;
    translateX *= factor;
    translateY *= factor;
    currentZoom = newZoom;
    updateImageTransform();
}

function zoomOut() {
    const newZoom = Math.max(currentZoom / 2, 1);
    const factor = newZoom / currentZoom;
    translateX *= factor;
    translateY *= factor;
    currentZoom = newZoom;
    updateImageTransform();
}

// Attach mouse and touch event listeners for panning
imageWrapper.addEventListener('mousedown', startDragging);
imageWrapper.addEventListener('touchstart', startDragging);
imageWrapper.addEventListener('mousemove', drag);
imageWrapper.addEventListener('touchmove', drag);
imageWrapper.addEventListener('mouseup', stopDragging);
imageWrapper.addEventListener('mouseleave', stopDragging);
imageWrapper.addEventListener('touchend', stopDragging);

// Add touch-action CSS property to prevent browser handling of all touch actions
imageWrapper.style.touchAction = 'none';

// Prevent pull-to-refresh on mobile when zoomed in
document.body.style.overscrollBehaviorY = 'contain';

// Double click to zoom
imageWrapper.addEventListener('dblclick', function(e) {
    e.preventDefault();
    const containerRect = imageWrapper.getBoundingClientRect();
    // Get click offset from center of container
    const clickX = e.clientX - containerRect.left;
    const clickY = e.clientY - containerRect.top;
    const offsetX = clickX - containerRect.width / 2;
    const offsetY = clickY - containerRect.height / 2;
    
    if (currentZoom >= maxZoom) {
        currentZoom = 1;
        translateX = 0;
        translateY = 0;
    } else {
        const newZoom = Math.min(currentZoom * 2, maxZoom);
        const factor = newZoom / currentZoom;
        translateX = (translateX - offsetX) * factor + offsetX;
        translateY = (translateY - offsetY) * factor + offsetY;
        currentZoom = newZoom;
    }
    updateImageTransform();
});

// Add wheel zoom functionality
imageWrapper.addEventListener('wheel', function(e) {
    e.preventDefault();
    
    const containerRect = imageWrapper.getBoundingClientRect();
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;
    const offsetX = mouseX - containerRect.width / 2;
    const offsetY = mouseY - containerRect.height / 2;
    const isPinch = e.ctrlKey || (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents);
    const zoomSpeed = isPinch ? -0.008 : -0.002;
    const delta = e.deltaY * zoomSpeed;
    const newZoom = Math.min(Math.max(currentZoom * (1 + delta), 1), maxZoom);
    const factor = newZoom / currentZoom;
    
    translateX = (translateX - offsetX) * factor + offsetX;
    translateY = (translateY - offsetY) * factor + offsetY;
    currentZoom = newZoom;
    
    updateImageTransform();
});

let lastTouchDistance = 0;
let lastTapTime = 0;
let lastTouchX = 0;
let lastTouchY = 0;

imageWrapper.addEventListener('touchstart', function(e) {
    if (e.touches.length === 2) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        lastTouchDistance = Math.hypot(
            touch2.clientX - touch1.clientX,
            touch2.clientY - touch1.clientY
        );
    }
});

imageWrapper.addEventListener('touchmove', function(e) {
    if (e.touches.length === 2) {
        e.preventDefault();
        e.stopPropagation();
        
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = Math.hypot(
            touch2.clientX - touch1.clientX,
            touch2.clientY - touch1.clientY
        );
        
        if (lastTouchDistance) {
            const midX = (touch1.clientX + touch2.clientX) / 2;
            const midY = (touch1.clientY + touch2.clientY) / 2;
            const containerRect = imageWrapper.getBoundingClientRect();
            const offsetX = midX - containerRect.left - containerRect.width / 2;
            const offsetY = midY - containerRect.top - containerRect.height / 2;
            const factor = currentDistance / lastTouchDistance;
            const newZoom = Math.min(Math.max(currentZoom * factor, 1), maxZoom);
            const zoomFactor = newZoom / currentZoom;
            
            translateX = (translateX - offsetX) * zoomFactor + offsetX;
            translateY = (translateY - offsetY) * zoomFactor + offsetY;
            currentZoom = newZoom;
            
            updateImageTransform();
        }
        
        lastTouchDistance = currentDistance;
    }
});

imageWrapper.addEventListener('touchend', function(e) {
    lastTouchDistance = 0;
    if (e.touches.length === 0) {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTapTime;
        const touch = e.changedTouches[0];
        const touchX = touch.clientX;
        const touchY = touch.clientY;
        
        // Check if this is a double tap (time between taps < 300ms and touch positions are close)
        if (tapLength < 300 && Math.abs(touchX - lastTouchX) < 30 && Math.abs(touchY - lastTouchY) < 30) {
            e.preventDefault();
            
            const containerRect = imageWrapper.getBoundingClientRect();
            const clickX = touchX - containerRect.left;
            const clickY = touchY - containerRect.top;
            const offsetX = clickX - containerRect.width / 2;
            const offsetY = clickY - containerRect.height / 2;
            
            if (currentZoom >= maxZoom) {
                currentZoom = 1;
                translateX = 0;
                translateY = 0;
            } else {
                const newZoom = Math.min(currentZoom * 2, maxZoom);
                const factor = newZoom / currentZoom;
                translateX = (translateX - offsetX) * factor + offsetX;
                translateY = (translateY - offsetY) * factor + offsetY;
                currentZoom = newZoom;
            }
            updateImageTransform();
        }
        
        // Store the time and position of this tap
        lastTapTime = currentTime;
        lastTouchX = touchX;
        lastTouchY = touchY;
        
        stopDragging();
    }
});

// --------------------
// Map Setup
// --------------------
function isAprilFools2025() {
    const date = new Date();
    const etDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    return etDate.getFullYear() === 2025 && 
           etDate.getMonth() === 3 && 
           etDate.getDate() === 1;
}

const map = L.map('map').setView([28.602053, -81.200421], isMobile ? 14 : 15);
if (isAprilFools2025()) map.setView([29.64410123796475, -82.34763839012359], 14);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let userMarker = null;

// Modify map click handler to prevent new guesses after game completion
map.on('click', function(e) {
    if (guessSubmitted || currentRound === rounds.length - 1 && isGameCompleted()) return;
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
    const submitButton = document.getElementById('submit-guess');
    submitButton.disabled = !isImageLoaded;  // Only enable if image is loaded
});

// Add helper function to check if game is completed
function isGameCompleted() {
    return currentRound === rounds.length - 1 && guessSubmitted;
}

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

function handleImageLoad() {
    isImageLoaded = true;
    const submitButton = document.getElementById('submit-guess');
    if (userMarker) {  // Only enable if there's also a marker placed
        submitButton.disabled = false;
    }
}

function loadImage(imageUrl, skipExifCheck = false) {
    const currentImage = document.getElementById(`challenge-image-${activeImageIndex}`);
    const nextImage = document.getElementById(`challenge-image-${activeImageIndex === 1 ? 2 : 1}`);
    const spinner = document.querySelector('.loading-spinner');
    
    // Always start with spinner hidden
    spinner.style.display = 'none';
    isImageLoaded = false;
    
    // Clear any existing timeout
    if (window.spinnerTimeout) {
        clearTimeout(window.spinnerTimeout);
    }
    
    // Set up the delayed spinner
    window.spinnerTimeout = setTimeout(() => {
        if (!isImageLoaded) {
            spinner.style.display = 'block';
        }
    }, 1500);

    if (isFirstLoad || skipExifCheck) {
        currentImage.onload = () => {
            clearTimeout(window.spinnerTimeout);
            spinner.style.display = 'none';
            currentImage.classList.add('visible');
            currentImage.classList.remove('hidden');
            handleImageLoad();
        };
        currentImage.src = imageUrl;
        isFirstLoad = false;
        return;
    }
    
    // Normal crossfade for subsequent loads
    nextImage.onload = () => {
        clearTimeout(window.spinnerTimeout);
        spinner.style.display = 'none';
        currentImage.classList.remove('visible');
        currentImage.classList.add('hidden');
        nextImage.classList.remove('hidden');
        nextImage.classList.add('visible');
        activeImageIndex = activeImageIndex === 1 ? 2 : 1;
        handleImageLoad();
    };
    nextImage.src = imageUrl;
}

document.querySelectorAll('.challenge-image').forEach(img => {
    img.draggable = false;
    img.addEventListener('dragstart', function(e) {
        e.preventDefault();
    });
});

function loadRound(skipExifCheck = false, completed = false) {
    const round = rounds[currentRound];
    
    // Load and display the image immediately
    loadImage(round.src, true);
    
    if (!skipExifCheck) {
        // Extract EXIF data in the background
        const tempImg = new Image();
        tempImg.crossOrigin = "Anonymous"; 
        const urlWithTimestamp = round.src + "?t=" + new Date().getTime();
        tempImg.src = urlWithTimestamp;
        
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
        };
    }
    
    // Reset game state for new round
    currentZoom = 1;
    translateX = 0;
    translateY = 0;
    updateImageTransform();
    
    map.setView([28.602053, -81.200421], 15);
    if (isAprilFools2025()) map.setView([29.64410123796475, -82.34763839012359], 15);
    if (userMarker) map.removeLayer(userMarker);
    if (actualMarker) map.removeLayer(actualMarker);
    if (line) map.removeLayer(line);
    userMarker = null;
    actualMarker = null;
    line = null;

    document.getElementById("result").innerHTML = "";
    
    // If the game is completed, set up final round UI.
    if (completed) {
        document.getElementById("submit-guess").style.display = "none";
        const nextButton = document.getElementById("next-round");
        nextButton.textContent = "See Results";
        nextButton.style.display = "inline-block";
        guessSubmitted = true;
    } else {
        document.getElementById("next-round").style.display = "none";
        document.getElementById("submit-guess").style.display = "inline-block";
        document.getElementById("submit-guess").disabled = true;
        guessSubmitted = false;
    }

    // Bold round indicators
    document.getElementById("round1-text").style.fontWeight = currentRound === 0 ? "bold" : "normal";
    document.getElementById("round2-text").style.fontWeight = currentRound === 1 ? "bold" : "normal";
    document.getElementById("round3-text").style.fontWeight = currentRound === 2 ? "bold" : "normal";
}

loadRound();

document.getElementById("submit-guess").addEventListener("click", function(e) {
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
    let score = distance <= perfectRange ? 5000 : Math.round(5500 * Math.exp(-3 * (distance / 700)));
    score = distance > 1000 ? 0 : score;
    
    if (score === 5000) {
        startConfetti();
    }
    
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
        color: 'var(--primary-color)', 
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

    document.getElementById("result").innerHTML = `<p>Your guess is <strong>${Math.round(distance)} ${Math.round(distance) === 1 ? 'meter' : 'meters'}</strong> away${distance <= 50 ? '!' : '.'}<br>Score: <strong>${score}</strong></p>`;
    document.getElementById("submit-guess").style.display = "none";
    
    if (currentRound === rounds.length - 1) {
        document.getElementById("next-round").textContent = "See Results";
    } else {
        document.getElementById("next-round").textContent = "Next Round";
    }
    document.getElementById("next-round").style.display = "inline-block";

    // Check if the result element is fully visible
    const resultElement = document.getElementById("result");
    const rect = resultElement.getBoundingClientRect();
    const isFullyVisible = (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= window.innerHeight &&
        rect.right <= window.innerWidth
    );

    // Only scroll if the element isn't fully visible
    if (!isFullyVisible) {
        resultElement.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }

    // Add GA4 event tracking for game completion on round 3
    if (currentRound === rounds.length - 1) {
        if (isArchiveMode) {
            gtag('event', 'archive_game_complete', {
                'event_category': 'gameplay',
                'event_label': `Archive Day ${Math.floor((selectedArchiveDate - epoch) / (1000 * 60 * 60 * 24)) + 1}`,
                'value': totalScore
            });
        } else {
            gtag('event', 'game_complete', {
                'event_category': 'gameplay',
                'event_label': `Day ${daysSinceEpoch + 1}`,
                'value': totalScore
            });
        }
    }
});

document.getElementById("next-round").addEventListener("click", function() {
    if (currentRound === rounds.length - 1) {
        showResults();
    } else {
        currentRound++;
        isImageLoaded = false;  // Reset image loaded state
        document.getElementById("submit-guess").disabled = true;
        loadRound();
        
        // Check if the image wrapper is fully visible
        const imageWrapper = document.querySelector('.image-wrapper');
        const rect = imageWrapper.getBoundingClientRect();
        const isFullyVisible = (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= window.innerHeight &&
            rect.right <= window.innerWidth
        );

        // Only scroll if the element isn't fully visible
        if (!isFullyVisible) {
            imageWrapper.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        }
    }
});

// --------------------
// Results Popup Functions
// --------------------
let hasUpdatedDistribution = false;

function updateScoreDistribution() {
    if (hasUpdatedDistribution) return;
    
    let dist = localStorage.getItem('scoreDistribution');
    if (dist) {
        dist = JSON.parse(dist);
    } else {
        dist = { bucket15000: 0, bucket10000: 0, bucket5000: 0, bucket0: 0 };
    }
    
    if (totalScore === 15000) {
        dist.bucket15000++;
    } else if (totalScore >= 10000) {
        dist.bucket10000++;
    } else if (totalScore >= 5000) {
        dist.bucket5000++;
    } else {
        dist.bucket0++;
    }
    
    localStorage.setItem('scoreDistribution', JSON.stringify(dist));
    hasUpdatedDistribution = true;
}

function showScoreDistribution() {
    let dist = localStorage.getItem('scoreDistribution');
    if (dist) {
        dist = JSON.parse(dist);
    } else {
        dist = { bucket15000: 0, bucket10000: 0, bucket5000: 0, bucket0: 0 };
    }
    
    const values = [dist.bucket15000, dist.bucket10000, dist.bucket5000, dist.bucket0];
    const maxValue = Math.max(...values);
    
    // If all values are 0, set maxValue to 1 to avoid division by zero
    const normalizer = maxValue === 0 ? 1 : maxValue;
    const maxWidth = 50; // Maximum width in percentage
    
    const template = document.getElementById('histogram-template');
    const clone = template.content.cloneNode(true);
    
    // Set the values
    const valueSpans = clone.querySelectorAll('.histogram-value');
    valueSpans[0].textContent = dist.bucket15000;
    valueSpans[1].textContent = dist.bucket10000;
    valueSpans[2].textContent = dist.bucket5000;
    valueSpans[3].textContent = dist.bucket0;
    
    document.getElementById("results-popup").innerHTML = '';
    document.getElementById("results-popup").appendChild(clone);
    
    // Animate the bars after a short delay with proportional widths
    setTimeout(() => {
        const bars = document.querySelectorAll('.histogram-bar');
        bars[0].style.width = `${(dist.bucket15000 / normalizer) * maxWidth}%`;
        bars[1].style.width = `${(dist.bucket10000 / normalizer) * maxWidth}%`;
        bars[2].style.width = `${(dist.bucket5000 / normalizer) * maxWidth}%`;
        bars[3].style.width = `${(dist.bucket0 / normalizer) * maxWidth}%`;
    }, 50);
}

function showResults(fromStats = false) {
    if (!fromStats) {
        updateScoreDistribution();
    }
    
    const template = document.getElementById('results-template');
    const clone = template.content.cloneNode(true);
    
    // Update score and classes
    const scoreElement = clone.querySelector('#total-score strong');
    scoreElement.textContent = totalScore;
    if (totalScore === 15000) {
        scoreElement.classList.add('perfect-score');
    }
    
    // Update round scores
    clone.querySelector('#round-scores').innerHTML = 
        `Easy: ${roundScores[0]}<br>Medium: ${roundScores[1]}<br>Hard: ${roundScores[2]}`;
    
    document.getElementById("results-popup").innerHTML = '';
    document.getElementById("results-popup").appendChild(clone);

    // Add stats button
    const statsButton = document.createElement('button');
    statsButton.className = 'stats-button';
    statsButton.onclick = showScoreDistribution;
    statsButton.innerHTML = '📊';
    document.getElementById('results-popup').appendChild(statsButton);
    
    // Progress bar animation
    setTimeout(() => {
        const progressBar = document.querySelector('.score-progress-bar');
        const progressPercentage = (totalScore / 15000) * 100;
        progressBar.style.width = `${progressPercentage}%`;
    }, 50);
    
    document.getElementById("results-popup").style.display = "block";
    document.getElementById("overlay").style.display = "block";
    
    document.querySelector('.leaflet-control-attribution').classList.add('show');
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
    
    const shareText = `UCFGuessr ${currentDay} ${totalScore}/15000\n\n${getScoreRepresentation(roundScores[0])}\n${getScoreRepresentation(roundScores[1])}\n${getScoreRepresentation(roundScores[2])}\nucfguessr.xyz`;
    
    navigator.clipboard.writeText(shareText).then(() => {
        // Track share event with GA4
        if (isArchiveMode) {
            gtag('event', 'share_archive_results', {
                'event_category': 'engagement',
                'event_label': `Archive Day ${currentDay}`,
                'value': totalScore
            });
        } else {
            gtag('event', 'share_results', {
                'event_category': 'engagement',
                'event_label': `Day ${currentDay}`,
                'value': totalScore
            });
        }

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
    
    const etDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const month = months[etDate.getMonth()];  
    const day = etDate.getDate();
    const year = etDate.getFullYear();
    
    return `${month} ${day}, ${year}`;
}

// Set the current date in the header
document.getElementById('current-date').textContent = formatDate(new Date());

// Add window resize handler
window.addEventListener('resize', () => {
    if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
});

// Add these variables at the top with other global variables
let isArchiveMode = false;
let selectedArchiveDate = null;
let currentCalendarDate = new Date();
let currentPlayingDate = new Date();

// Add these functions before the loadRound function
function showArchive() {
    document.getElementById("archive-popup").style.display = "block";
    document.getElementById("overlay").style.display = "block";
    updateCalendar();
}

function closeArchive() {
    document.getElementById("archive-popup").style.display = "none";
    document.getElementById("overlay").style.display = "none";
}

function updateCalendar() {
    const calendarMonth = document.getElementById("calendar-month");
    const weekdaysDiv = document.querySelector(".calendar-weekdays");
    const daysDiv = document.querySelector(".calendar-days");
    const today = new Date();
    
    // Set month and year
    calendarMonth.textContent = currentCalendarDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    // Set weekdays
    if (!weekdaysDiv.children.length) {
        const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
        weekdays.forEach(day => {
            const dayDiv = document.createElement('div');
            dayDiv.textContent = day;
            weekdaysDiv.appendChild(dayDiv);
        });
    }
    
    // Clear previous days
    daysDiv.innerHTML = '';
    
    // Calculate days
    const firstDay = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 1);
    const lastDay = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 0);
    
    // Add empty spaces for starting position
    for (let i = 0; i < firstDay.getDay(); i++) {
        const emptyDay = document.createElement('div');
        daysDiv.appendChild(emptyDay);
    }
    
    // Add days
    for (let i = 1; i <= lastDay.getDate(); i++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        dayDiv.textContent = i;
        
        const dateToCheck = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), i);
        
        // Mark today's date
        if (dateToCheck.toDateString() === today.toDateString()) {
            dayDiv.classList.add('today');
        }
        
        // Mark currently selected/playing date
        if (dateToCheck.toDateString() === currentPlayingDate.toDateString()) {
            dayDiv.classList.add('selected');
        }
        
        if (dateToCheck > new Date() || dateToCheck < epoch) {
            dayDiv.classList.add('disabled');
        } else {
            dayDiv.onclick = () => selectArchiveDate(dateToCheck);
        }
        
        daysDiv.appendChild(dayDiv);
    }
}

function prevMonth() {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    updateCalendar();
}

function nextMonth() {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    updateCalendar();
}

function selectArchiveDate(date) {
    // Convert the selected date to ET midnight
    const etDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const daysSinceEpochArchive = Math.floor((Date.UTC(etDate.getFullYear(), etDate.getMonth(), etDate.getDate()) - epoch.getTime()) / (1000 * 60 * 60 * 24));
    const etNow = getETDate();
    
    // Update current playing date and day number
    currentPlayingDate = date;
    currentDay = daysSinceEpochArchive + 1;
    
    // Reset game state
    currentRound = 0;
    totalScore = 0;
    roundScores = [];
    isArchiveMode = date.toDateString() !== etNow.toDateString();
    selectedArchiveDate = date;
    hasUpdatedDistribution = false;
    
    // Update daily indices for archive date
    const archiveEasyIndex = daysSinceEpochArchive % easyPhotos.length;
    const archiveMediumIndex = daysSinceEpochArchive % mediumPhotos.length;
    const archiveHardIndex = daysSinceEpochArchive % hardPhotos.length;
    
    // Update rounds array
    rounds[0].src = easyPhotos[archiveEasyIndex];
    rounds[1].src = mediumPhotos[archiveMediumIndex];
    rounds[2].src = hardPhotos[archiveHardIndex];
    
    closeArchive();
    loadRound();
    
    const archiveLabel = date.toDateString() !== etNow.toDateString() ? ' (Archive)' : '';
    document.getElementById('current-date').textContent = formatDate(date) + archiveLabel;
}

// Initialize currentPlayingDate when the game loads
document.addEventListener('DOMContentLoaded', () => {
    currentPlayingDate = new Date();
    hasUpdatedDistribution = false;
});

let coverageMarkers = [];
let coverageMarkersVisible = false;

function toggleCoverageMarkers() {
    if (coverageMarkersVisible) {
        coverageMarkers.forEach(marker => map.removeLayer(marker));
        coverageMarkers = [];
        coverageMarkersVisible = false;
        return;
    }

    const allPhotos = [...easyPhotos, ...mediumPhotos, ...hardPhotos];
    coverageMarkers = [];
    let validMarkerCount = 0;

    const currentETDate = getETDate();
    const currentDaysSinceEpoch = Math.floor((Date.UTC(currentETDate.getFullYear(), currentETDate.getMonth(), currentETDate.getDate()) - epoch.getTime()) / (1000 * 60 * 60 * 24));

    Promise.all(allPhotos.map((photoUrl, index) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = photoUrl;

            img.onload = function() {
                EXIF.getData(this, function() {
                    const lat = EXIF.getTag(this, "GPSLatitude");
                    const latRef = EXIF.getTag(this, "GPSLatitudeRef") || "N";
                    const lon = EXIF.getTag(this, "GPSLongitude");
                    const lonRef = EXIF.getTag(this, "GPSLongitudeRef") || "W";

                    if (lat && lon) {
                        const latitude = convertDMSToDD(lat, latRef);
                        const longitude = convertDMSToDD(lon, lonRef);
                        
                        let photoIndex = index;
                        if (index >= easyPhotos.length) {
                            photoIndex = index - easyPhotos.length;
                            if (index >= easyPhotos.length + mediumPhotos.length) {
                                photoIndex = index - easyPhotos.length - mediumPhotos.length;
                            }
                        }
                        
                        if ((konamiCodeActivations === 1 && photoIndex < currentDaysSinceEpoch) ||
                            konamiCodeActivations === 2) {
                            
                            const marker = L.circleMarker([latitude, longitude], {
                                radius: 5,
                                fillColor: '#ff4444',
                                color: '#000',
                                weight: 1,
                                opacity: 1,
                                fillOpacity: 0.8
                            }).addTo(map);
                            
                            coverageMarkers.push(marker);
                            validMarkerCount++;
                        }
                    }
                    resolve();
                });
            };
            img.onerror = () => resolve();
        });
    })).then(() => {
        coverageMarkersVisible = true;
        showNotification(`Showing ${validMarkerCount} photo locations`);
    });
}

if (isAprilFools2025()) {
    const title = document.querySelector('h1');
    if (title) {
        title.innerHTML = `<span style="color:rgb(251, 101, 60)">UF</span><span style="color:rgb(27, 60, 192)">Guessr</span>`;
    }
}
