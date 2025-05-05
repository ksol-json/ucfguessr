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
    if (touchKonamiCode[touchKonamiIndex] === 'theme') {
        touchKonamiIndex++;
    } else {
        touchKonamiIndex = touchKonamiCode[0] === 'theme' ? 1 : 0;
    }
    setTheme(newTheme);
}

// Initialize theme
const savedTheme = localStorage.getItem('theme') || 
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
setTheme(savedTheme);

const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight'];
const touchKonamiCode = ['calendar', 'closeArchive', 'theme', 'theme', 'help', 'closeHelp'];
let konamiIndex = 0;
let touchKonamiIndex = 0;
let konamiCodeActivations = 0;

function handleKonamiSuccess() {
    konamiCodeActivations++;
    document.querySelector('.coverage-button').style.display = 'flex';
    
    if (konamiCodeActivations === 1) {
        showNotification('Coverage mode unlocked!');
    } else if (konamiCodeActivations === 2) {
        showNotification('Full coverage mode unlocked!');
        if (coverageMarkersVisible) {
            toggleCoverageMarkers();
            toggleCoverageMarkers(); // [sic]
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
    }
    konamiIndex = 0;
    touchKonamiIndex = 0;
}

// Key handlers
document.addEventListener('keydown', function(event) {
    if (event.key === konamiCode[konamiIndex]) {
        konamiIndex++;
        if (konamiIndex === konamiCode.length) {
            handleKonamiSuccess();
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

// ---------- persistent per-round info ----------
const roundState = [
    { userMarker: null, actualMarker: null, line: null, scoreHTML: '', completed: false }, // Easy
    { userMarker: null, actualMarker: null, line: null, scoreHTML: '', completed: false }, // Medium
    { userMarker: null, actualMarker: null, line: null, scoreHTML: '', completed: false }  // Hard
];

// Round the player is CURRENTLY looking at in the UI
let viewingRound = 0;

// Always keep track of the "current" round for highlight
function updateRoundIndicators() {
    ['round1-text','round2-text','round3-text'].forEach((id, idx) => {
        const el = document.getElementById(id);
        // Attach click handler only once
        if (!el.dataset.listenerAttached) {
            el.addEventListener('click', () => {
                const gameRound = getGameRound();
                if (idx <= gameRound || gameRound === 3) {
                    showStoredRound(idx);
                }
            });
            el.dataset.listenerAttached = 'true';
        }
        // Bold only the viewing round
        el.style.fontWeight = (idx === viewingRound ? 'bold' : 'normal');
        // Set cursor to pointer if clickable, otherwise default
        const gameRound = getGameRound();
        if (idx <= gameRound || gameRound === 3) {
            el.style.cursor = 'pointer';
        } else {
            el.style.cursor = 'default';
        }
    });
    updateHighlightPosition();
}

/*  Return the first round that hasn't been played yet (0‑based).
    If every round is done it returns 3, which we treat as “game finished”. */
function getGameRound() {
    for (let i = 0; i < 3; i++) if (!roundState[i].completed) return i;
    return 3;
}

function showStoredRound(roundIndex) {
    viewingRound = roundIndex;
    currentRound = roundIndex;

    // Remove any existing markers/lines from map
    if (userMarker) { try { map.removeLayer(userMarker); } catch {} }
    if (actualMarker) { try { map.removeLayer(actualMarker); } catch {} }
    if (line) { try { map.removeLayer(line); } catch {} }
    userMarker = null;
    actualMarker = null;
    line = null;

    // Load the image for this round
    loadImage(rounds[roundIndex].src, true);

    // Restore markers/lines if completed
    if (roundState[roundIndex].completed) {
        // Deep clone markers/lines for this round
        const state = roundState[roundIndex];
        if (state.userMarker) {
            userMarker = L.marker(state.userMarker.getLatLng(), { draggable: false }).addTo(map);
            userMarker.bindPopup("Your Guess", {
                permanent: true,
                offset: [0, -5],
                closeButton: false
            }).openPopup();
        }
        if (state.actualMarker) {
            actualMarker = L.marker(state.actualMarker.getLatLng()).addTo(map);
            actualMarker.bindPopup("Correct Location", {
                permanent: true,
                offset: [0, -5],
                closeButton: false
            }).openPopup();
        }
        if (state.line) {
            line = L.polyline(state.line.getLatLngs(), {
                color: 'var(--primary-color)', 
                dashArray: '5, 5'
            }).addTo(map);
        }
        document.getElementById("result").innerHTML = state.scoreHTML;
        document.getElementById("submit-guess").style.display = "none";
        document.getElementById("next-round").style.display = "inline-block";
    } else {
        // Not completed: reset UI for guessing
        document.getElementById("result").innerHTML = "";
        document.getElementById("submit-guess").style.display = "inline-block";
        document.getElementById("next-round").style.display = "none";
        document.getElementById("submit-guess").disabled = true;
        guessSubmitted = false;
    }

    updateRoundIndicators();
}

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
    e.stopPropagation();
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
function isAprilFoolsDay(dayNumber) {
    return dayNumber === 39; // April 1st, 2025 is day #39
}

const map = L.map('map').setView([28.602053, -81.200421], isMobile ? 14 : 15);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

if (isAprilFoolsDay(daysSinceEpoch + 1)) {
    map.setView([29.64410123796475, -82.34763839012359], 14);
}

let userMarker = null;

// Modify map click handler to prevent new guesses after game completion
map.on('click', function(e) {
    // Prevent placing/moving marker if viewing a completed round (not the current round)
    if (
        (roundState[viewingRound].completed && viewingRound !== getGameRound()) ||
        guessSubmitted ||
        (currentRound === rounds.length - 1 && isGameCompleted())
    ) return;
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

let preloadedImages = new Map();
let loadingPromises = new Map();

function createImagePromise(imageUrl, priority = 'low') {
    if (loadingPromises.has(imageUrl)) {
        return loadingPromises.get(imageUrl);
    }

    const promise = new Promise((resolve, reject) => {
        const img = new Image();
        img.importance = priority;
        img.loading = priority === 'high' ? 'eager' : 'lazy';
        
        const retryLoad = (attempts = 3) => {
            img.onload = () => {
                preloadedImages.set(imageUrl, img);
                loadingPromises.delete(imageUrl);
                resolve(img);
            };
            
            img.onerror = () => {
                if (attempts > 0) {
                    setTimeout(() => retryLoad(attempts - 1), 1000);
                } else {
                    loadingPromises.delete(imageUrl);
                    reject(new Error(`Failed to load image: ${imageUrl}`));
                }
            };
            
            img.src = imageUrl;
        };
        
        retryLoad();
    });
    
    loadingPromises.set(imageUrl, promise);
    return promise;
}

function preloadImage(imageUrl, priority = 'low') {
    if (preloadedImages.has(imageUrl)) {
        return Promise.resolve(preloadedImages.get(imageUrl));
    }
    return createImagePromise(imageUrl, priority);
}

// Replace the existing preloadYesterdayImages function
function preloadGameImages() {
    // Preload today's images with high priority
    [
        easyPhotos[dailyEasyIndex],
        mediumPhotos[dailyMediumIndex],
        hardPhotos[dailyHardIndex]
    ].forEach((url, index) => {
        preloadImage(url, index === 0 ? 'high' : 'medium');
    });
    
    // Preload yesterday's images with low priority
    const yesterdayIndex = (daysSinceEpoch - 1);
    if (yesterdayIndex >= 0) {
        [
            easyPhotos[yesterdayIndex % easyPhotos.length],
            mediumPhotos[yesterdayIndex % mediumPhotos.length],
            hardPhotos[yesterdayIndex % mediumPhotos.length]
        ].forEach(url => preloadImage(url, 'low'));
    }
}

// Modify loadImage function to use the preloaded images
function loadImage(imageUrl, skipExifCheck = false) {
    const currentImage = document.getElementById(`challenge-image-${activeImageIndex}`);
    const nextImage = document.getElementById(`challenge-image-${activeImageIndex === 1 ? 2 : 1}`);
    const spinner = document.querySelector('.loading-spinner');
    const isMobileView = window.innerWidth <= 768;
    
    spinner.style.display = 'none';
    isImageLoaded = false;
    
    if (window.spinnerTimeout) {
        clearTimeout(window.spinnerTimeout);
    }
    
    window.spinnerTimeout = setTimeout(() => {
        if (!isImageLoaded) {
            spinner.style.display = 'block';
        }
    }, 1000);
    
    // Remove old credit if it exists
    const oldCredit = document.querySelector('.photo-credit');
    if (oldCredit) {
        oldCredit.remove();
    }
    
    // Handle photo credit/label
    let credit = null;
    let useSubmittedBy = true;
    
    const tildeMatch = imageUrl.match(/~~([^.]+)\.jpe?g/i);
    if (tildeMatch) {
        credit = tildeMatch[1];
        useSubmittedBy = false;
    } else {
        const creditMatch = imageUrl.match(/(?: - |--)(.*?)(?=\.jpe?g)/i);
        credit = creditMatch ? creditMatch[1].trim() : null;
    }

    if (credit) {
        const creditDiv = document.createElement('div');
        creditDiv.className = 'photo-credit';
        if (useSubmittedBy) {
            creditDiv.innerHTML = `Submitted by <strong>${credit}</strong>`;
        } else {
            creditDiv.innerHTML = `<strong>${credit}</strong>`;
        }
        document.getElementById('image-container').appendChild(creditDiv);
        setTimeout(() => {
            creditDiv.classList.add('visible');
        }, 100);
    }
    
    // Set the image source
    const loadPromise = preloadImage(imageUrl, 'high');
    
    if (isFirstLoad) {
        loadPromise.then(() => {
            clearTimeout(window.spinnerTimeout);
            spinner.style.display = 'none';
            currentImage.src = imageUrl;
            currentImage.style.opacity = '1';
            currentImage.classList.add('visible');
            currentImage.classList.remove('hidden');
            handleImageLoad();
        }).catch(error => {
            console.error('Failed to load image:', error);
            showNotification('Failed to load image. Please refresh the page.');
        });
        isFirstLoad = false;
        return;
    }
    
    // Mobile: Simple swap without transition
    if (isMobileView) {
        nextImage.onload = () => {
            clearTimeout(window.spinnerTimeout);
            spinner.style.display = 'none';
            
            // Don't reset transforms immediately
            currentZoom = 1;
            translateX = 0;
            translateY = 0;
            
            // Instant swap of images
            currentImage.classList.remove('visible');
            currentImage.classList.add('hidden');
            nextImage.classList.remove('hidden');
            nextImage.classList.add('visible');
            
            // Apply transforms after swap
            requestAnimationFrame(() => {
                currentImage.style.transform = '';
                nextImage.style.transform = `translate3d(0px, 0px, 0) scale(1)`;
                updateImageTransform();
            });
            
            activeImageIndex = activeImageIndex === 1 ? 2 : 1;
            handleImageLoad();
        };
        nextImage.src = imageUrl;
        return;
    }
    
    // Desktop: Keep existing crossfade transition logic
    nextImage.style.opacity = '0';
    nextImage.classList.remove('hidden');
    nextImage.classList.add('visible');
    nextImage.src = imageUrl;
    
// Wait for next image to load before starting transition
    nextImage.onload = () => {
        clearTimeout(window.spinnerTimeout);
        spinner.style.display = 'none';
        
        // Reset transforms for both images
        currentImage.style.transform = '';
        nextImage.style.transform = '';
        currentZoom = 1;
        translateX = 0;
        translateY = 0;
        
        // Start crossfade with slight delay for smoother transition
        requestAnimationFrame(() => {
            nextImage.style.opacity = '1';
            currentImage.style.opacity = '0';
            
            setTimeout(() => {
                currentImage.classList.remove('visible');
                currentImage.classList.add('hidden');
                activeImageIndex = activeImageIndex === 1 ? 2 : 1;
                handleImageLoad();
            }, 500); // Match CSS transition duration
        });
    };
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
    
    if (isAprilFoolsDay(currentDay)) {
        map.setView([29.64410123796475, -82.34763839012359], 15);
    } else {
        map.setView([28.602053, -81.200421], 15);
    }
    
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

    updateRoundIndicators();

    // Just preload next round if it exists
    if (currentRound < rounds.length - 1) {
        preloadImage(rounds[currentRound + 1].src, 'high');
    }
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
    let score = distance <= perfectRange ? 5000 : Math.round(5550 * Math.exp(-3 * (distance / 700)));
    score = distance > 1000 ? 0 : score;
    
    if (score === 5000) {
        startConfetti();
    }
    
    totalScore += score;
    roundScores.push(score);
    
    // GA4 event tracking for individual round scores
    if (isArchiveMode) {
        gtag('event', `archive_round_${currentRound + 1}_score`, {
            'event_category': 'gameplay',
            'event_label': `Archive Day ${currentDay}`,
            'value': score
        });
    } else {
        gtag('event', `round_${currentRound + 1}_score`, {
            'event_category': 'gameplay',
            'event_label': `Day ${currentDay}`,
            'value': score
        });
    }

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

    // --- persist this round’s visual state ---
    roundState[currentRound] = {
        userMarker,
        actualMarker,
        line,
        scoreHTML: document.getElementById("result").innerHTML,
        completed: true
    };

    // GA4 event tracking for game completion
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

document.getElementById("next-round").addEventListener("click", () => {
    const gameRound = getGameRound();   // where the player SHOULD be

    if (gameRound === 3) {              // everything finished
        showResults();
        return;
    }

    viewingRound = currentRound = gameRound;   // jump to the live round
    isImageLoaded = false;
    document.getElementById("submit-guess").disabled = true;
    loadRound();

    document.querySelector('.image-wrapper').scrollIntoView({behavior:'smooth', block:'center'});
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
    
    const shareText = `UCFGuessr ${currentDay} ${totalScore}/15000\n\n${getScoreRepresentation(roundScores[0])}\n${getScoreRepresentation(roundScores[1])}\n${getScoreRepresentation(roundScores[2])}\nucfguessr.com`;
    
    navigator.clipboard.writeText(shareText).then(() => {
        // GA4 event tracking for sharing results
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
    if (touchKonamiCode[touchKonamiIndex] === 'help') {
        touchKonamiIndex++;
    } else {
        touchKonamiIndex = touchKonamiCode[0] === 'help' ? 1 : 0;
    }
    document.getElementById("help-popup").style.display = "block";
    document.getElementById("overlay").style.display = "block";
}

function closeHelp() {
    if (touchKonamiCode[touchKonamiIndex] === 'closeHelp') {
        touchKonamiIndex++;
        if (touchKonamiIndex === touchKonamiCode.length) {
            handleKonamiSuccess();
        }
    } else {
        touchKonamiIndex = touchKonamiCode[0] === 'closeHelp' ? 1 : 0;
    }
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
    updateHighlightPosition();
});

// Add these variables at the top with other global variables
let isArchiveMode = false;
let selectedArchiveDate = null;
let currentCalendarDate = new Date();
let currentPlayingDate = new Date();

// Add these functions before the loadRound function
function showArchive() {
    if (touchKonamiCode[touchKonamiIndex] === 'calendar') {
        touchKonamiIndex++;
    } else {
        touchKonamiIndex = touchKonamiCode[0] === 'calendar' ? 1 : 0;
    }
    document.getElementById("archive-popup").style.display = "block";
    document.getElementById("overlay").style.display = "block";
    updateCalendar();
}

function closeArchive() {
    if (touchKonamiCode[touchKonamiIndex] === 'closeArchive') {
        touchKonamiIndex++;
    } else {
        touchKonamiIndex = touchKonamiCode[0] === 'closeArchive' ? 1 : 0;
    }
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
    currentCalendarDate = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 1);
    updateCalendar();
}

function nextMonth() {
    currentCalendarDate = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1);
    updateCalendar();
}

function updateTitleForAprilFoolsDay(dayNumber) {
    const title = document.querySelector('h1');
    if (title) {
        if (isAprilFoolsDay(dayNumber)) {
            title.innerHTML = `<span style="color:rgb(251, 101, 60)">UF</span><span style="color:rgb(27, 60, 192)">Guessr</span>`;
        } else {
            title.innerHTML = `<span class="title-ucf">UCF</span><span class="title-guessr">Guessr</span>`;
        }
    }
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

    // Reset round state memory for all rounds
    for (let i = 0; i < roundState.length; i++) {
        roundState[i] = { userMarker: null, actualMarker: null, line: null, scoreHTML: '', completed: false };
    }
    viewingRound = 0;
    
    // Update daily indices for archive date
    const archiveEasyIndex = daysSinceEpochArchive % easyPhotos.length;
    const archiveMediumIndex = daysSinceEpochArchive % mediumPhotos.length;
    const archiveHardIndex = daysSinceEpochArchive % hardPhotos.length;
    
    // Update rounds array
    rounds[0].src = easyPhotos[archiveEasyIndex];
    rounds[1].src = mediumPhotos[archiveMediumIndex];
    rounds[2].src = hardPhotos[archiveHardIndex];
    
    // Update map center and title based on the day number
    if (isAprilFoolsDay(currentDay)) {
        map.setView([29.64410123796475, -82.34763839012359], 15);
    } else {
        map.setView([28.602053, -81.200421], 15);
    }
    updateTitleForAprilFoolsDay(currentDay);
    
    closeArchive();
    loadRound();
    
    const archiveLabel = date.toDateString() !== etNow.toDateString() ? ' (Archive)' : '';
    document.getElementById('current-date').textContent = formatDate(date) + archiveLabel;
}

// Initialize currentPlayingDate when the game loads
document.addEventListener('DOMContentLoaded', () => {
    currentPlayingDate = new Date();
    hasUpdatedDistribution = false;
    updateTitleForAprilFoolsDay(daysSinceEpoch + 1);
});

let coverageMarkers = [];
let coverageMarkersVisible = false;
let markerHoverTimeout = null;
let previewElement = null;

function createPreviewElement() {
    if (!previewElement) {
        previewElement = document.createElement('div');
        previewElement.className = 'marker-preview';
        previewElement.style.cssText = `
            position: absolute;
            z-index: 1000;
            background: white;
            padding: 2px;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            pointer-events: none;
            display: none;
            transition: opacity 0.2s;
        `;
        document.body.appendChild(previewElement);
    }
    return previewElement;
}

function showPreview(photoUrl, latlng) {
    const preview = createPreviewElement();
    const img = new Image();
    img.onload = () => {
        const maxWidth = 200;
        const maxHeight = 150;
        const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
        const width = img.width * scale;
        const height = img.height * scale;
        
        // Get the marker's pixel position on the map
        const point = map.latLngToContainerPoint(latlng);
        const mapContainer = map.getContainer();
        const mapRect = mapContainer.getBoundingClientRect();
        
        // Calculate initial position
        let left = mapRect.left + point.x - (width / 2);
        let top = mapRect.top + point.y - height - 15; // 15px above marker
        
        // Adjust if preview would appear off-screen
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Keep preview within horizontal bounds
        if (left < 10) left = 10;
        if (left + width > viewportWidth - 10) left = viewportWidth - width - 10;
        
        // If preview would appear above viewport, show it below the marker instead
        if (top < 10) {
            top = mapRect.top + point.y + 25; // 25px below marker
        }
        
        // Position the preview
        preview.style.width = `${width}px`;
        preview.style.height = `${height}px`;
        preview.style.left = `${left}px`;
        preview.style.top = `${top}px`;
        preview.style.display = 'block';
        preview.style.opacity = '1';
    };
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    preview.innerHTML = '';
    preview.appendChild(img);
    img.src = photoUrl;
}

function hidePreview() {
    if (previewElement) {
        previewElement.style.opacity = '0';
        setTimeout(() => {
            previewElement.style.display = 'none';
        }, 200);
    }
    if (markerHoverTimeout) {
        clearTimeout(markerHoverTimeout);
        markerHoverTimeout = null;
    }
}

function toggleCoverageMarkers() {
    if (coverageMarkersVisible) {
        coverageMarkers.forEach(marker => map.removeLayer(marker));
        coverageMarkers = [];
        coverageMarkersVisible = false;
        hidePreview();
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

                            marker.on('mouseover', (e) => {
                                markerHoverTimeout = setTimeout(() => {
                                    showPreview(photoUrl, e.latlng);
                                }, 80);
                            });

                            marker.on('mouseout', () => {
                                hidePreview();
                            });

                            marker.on('remove', () => {
                                hidePreview();
                            });
                            
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

map.on('move', () => {
    if (previewElement && previewElement.style.display === 'block') {
        hidePreview();
    }
});

function updateHighlightPosition() {
    // Always highlight the current round (the one in progress or just completed)
    const currentRoundId = "round" + (currentRound + 1) + "-text";
    const currentElem = document.getElementById(currentRoundId);
    if (!currentElem) return;
    const container = currentElem.parentElement;
    container.style.position = "relative";
    let highlight = document.getElementById("round-highlight");
    if (!highlight) {
        highlight = document.createElement("div");
        highlight.id = "round-highlight";
        highlight.classList.add("round-highlight");
        container.insertBefore(highlight, container.firstChild);
    }
    const containerRect = container.getBoundingClientRect();
    const elemRect = currentElem.getBoundingClientRect();
    const offsetLeft = elemRect.left - containerRect.left;
    const extraWidth = 20;
    highlight.style.left = (offsetLeft - extraWidth / 2) + "px";
    highlight.style.width = (elemRect.width + extraWidth) + "px";
}

preloadGameImages();
updateRoundIndicators();