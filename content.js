let activeVideo = null;
let activeTitle = "";
let activeDuration = 0;
let sessionStartTime = 0;
let lastSaveTime = 0;

function saveProgress(video, title) {
    if (video.currentTime < 2 || isNaN(video.duration)) return;

    chrome.storage.local.get(['watchHistory'], function(result) {
        let history = result.watchHistory || [];
        
        // THE FIX: Delete older saves by matching BOTH Title and Duration (+/- 2 seconds)
        history = history.filter(item => {
            const sameTitle = item.title === title;
            const sameDuration = Math.abs(item.duration - video.duration) < 3;
            return !(sameTitle && sameDuration);
        });
        
        history.unshift({
            title: title,
            time: Math.floor(video.currentTime),
            duration: Math.floor(video.duration),
            lastWatched: new Date().toLocaleString()
        });

        if (history.length > 10) history.pop();
        chrome.storage.local.set({ watchHistory: history });
    });
}

function scanForVideo() {
    const videoElement = document.querySelector('video.vjs-tech');
    
    // STRICT GATE: Wait until the video is fully loaded and has a valid length
    if (!videoElement || isNaN(videoElement.duration) || videoElement.duration === 0) return;

    let currentTitle = "Classplus Lecture";
    const titleElement = document.querySelector('.courseHome_addContentHeading_2wZvq');
    
    if (titleElement && titleElement.textContent) {
        currentTitle = titleElement.textContent.trim();
    }

    // STATE CHANGE: Detect a new video using the DOM element AND its unique duration
    if (videoElement !== activeVideo || Math.abs(videoElement.duration - activeDuration) > 2) {
        activeVideo = videoElement;
        activeTitle = currentTitle;
        activeDuration = videoElement.duration;
        sessionStartTime = Date.now();
        lastSaveTime = Date.now();

        chrome.storage.local.get(['watchHistory'], function(result) {
            const history = result.watchHistory || [];
            
            // THE FIX: Find the correct timestamp using the Dual Fingerprint
            const savedData = history.find(item => 
                item.title === activeTitle && Math.abs(item.duration - activeVideo.duration) < 3
            );

            if (savedData && savedData.time > 2 && savedData.time < (savedData.duration * 0.95)) {
                let attempts = 0;
                
                const enforceJump = () => {
                    attempts++;
                    if (!activeVideo) return;
                    
                    if (Math.abs(activeVideo.currentTime - savedData.time) < 3) {
                        activeVideo.removeEventListener('timeupdate', enforceJump);
                        return;
                    }
                    
                    if (attempts > 30) {
                        activeVideo.removeEventListener('timeupdate', enforceJump);
                        return;
                    }

                    if (activeVideo.readyState >= 1) {
                        activeVideo.currentTime = savedData.time;
                    }
                };
                
                activeVideo.addEventListener('timeupdate', enforceJump);
            }
        });

        const trackProgress = () => {
            if (activeVideo !== videoElement) {
                videoElement.removeEventListener('timeupdate', trackProgress);
                return;
            }

            const now = Date.now();
            
            if (now - sessionStartTime > 3700) {
                if (now - lastSaveTime > 3700) {
                    saveProgress(activeVideo, activeTitle);
                    lastSaveTime = now;
                }
            }
        };

        activeVideo.addEventListener('timeupdate', trackProgress);
    }
}

setInterval(scanForVideo, 1000);
