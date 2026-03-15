let activeVideo = null;
let activeTitle = "";
let sessionStartTime = 0;
let lastSaveTime = 0;

function saveProgress(video, title) {
    // HARD SHIELD: Prevents 00:00 overwrites on accidental clicks
    if (video.currentTime < 2 || isNaN(video.duration)) return;

    chrome.storage.local.get(['watchHistory'], function(result) {
        let history = result.watchHistory || [];
        
        // Remove old entry for this exact title
        history = history.filter(item => item.title !== title);
        
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
    if (!videoElement) return;

    // FIX 1: Use textContent to bypass React modal visibility blocking
    let currentTitle = "Classplus Lecture";
    const titleElement = document.querySelector('.courseHome_addContentHeading_2wZvq');
    
    if (titleElement && titleElement.textContent) {
        currentTitle = titleElement.textContent.trim();
    }

    // FIX 2: State Change Detection without paralyzed Strict Gates
    if (videoElement !== activeVideo || (currentTitle !== activeTitle && currentTitle !== "Classplus Lecture")) {
        activeVideo = videoElement;
        activeTitle = currentTitle;
        sessionStartTime = Date.now();
        lastSaveTime = Date.now();

        // 3. Jump Logic (The Enforcer)
        chrome.storage.local.get(['watchHistory'], function(result) {
            const history = result.watchHistory || [];
            const savedData = history.find(item => item.title === activeTitle);

            if (savedData && savedData.time > 2 && savedData.time < (savedData.duration * 0.95)) {
                let attempts = 0;
                
                const enforceJump = () => {
                    attempts++;
                    if (!activeVideo) return;
                    
                    // Check if jump succeeded (within 3 seconds margin)
                    if (Math.abs(activeVideo.currentTime - savedData.time) < 3) {
                        activeVideo.removeEventListener('timeupdate', enforceJump);
                        return;
                    }
                    
                    // Failsafe: Release the video after 30 attempts
                    if (attempts > 30) {
                        activeVideo.removeEventListener('timeupdate', enforceJump);
                        return;
                    }

                    // Force the time jump when the video engine is ready
                    if (activeVideo.readyState >= 1) {
                        activeVideo.currentTime = savedData.time;
                    }
                };
                
                activeVideo.addEventListener('timeupdate', enforceJump);
            }
        });

        // 4. Time Tracking
        const trackProgress = () => {
            // SPA Cleanup: Detach if React loaded a new video element
            if (activeVideo !== videoElement) {
                videoElement.removeEventListener('timeupdate', trackProgress);
                return;
            }

            const now = Date.now();
            
            // Apply the 3.7 second grace period before allowing saves
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

// Check every 1 second
setInterval(scanForVideo, 1000);